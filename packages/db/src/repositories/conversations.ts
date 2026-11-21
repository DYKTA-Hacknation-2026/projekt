import { and, asc, desc, eq, sql } from "drizzle-orm"

import type { Database } from "../client"
import {
  assistantToolCalls,
  conversationMessages,
  conversations,
  retrievedEvidence,
} from "../schema"
import type {
  ConversationMessageRecord,
  ConversationRecord,
  ConversationRepository,
  ConversationSummary,
  SaveTurnInput,
} from "./interfaces"

/**
 * Conversation persistence. Every method that reads or deletes user content
 * takes the owner key and filters by it in SQL, so ownership cannot be
 * bypassed by guessing an id.
 */
export class DrizzleConversationRepository implements ConversationRepository {
  constructor(private readonly db: Database) {}

  async countConversations(): Promise<number> {
    const [row] = await this.db
      .select({ value: sql<number>`count(*)::int` })
      .from(conversations)
    return row?.value ?? 0
  }

  async createConversation(input: {
    id?: string
    ownerKey: string
    userId?: string | null
    title: string
    isSimulated?: boolean
  }): Promise<ConversationRecord> {
    const [row] = await this.db
      .insert(conversations)
      .values({
        ...(input.id ? { id: input.id } : {}),
        ownerKey: input.ownerKey,
        userId: input.userId ?? null,
        title: input.title.slice(0, 160),
        isSimulated: input.isSimulated ?? true,
      })
      .returning()
    if (!row) throw new Error("Nie udało się utworzyć rozmowy")
    return row
  }

  /** Any conversation by id — used only to detect id collisions. */
  async getConversation(id: string): Promise<ConversationRecord | null> {
    const [row] = await this.db
      .select()
      .from(conversations)
      .where(eq(conversations.id, id))
      .limit(1)
    return row ?? null
  }

  async getOwnedConversation(
    id: string,
    ownerKey: string
  ): Promise<ConversationRecord | null> {
    const [row] = await this.db
      .select()
      .from(conversations)
      .where(and(eq(conversations.id, id), eq(conversations.ownerKey, ownerKey)))
      .limit(1)
    return row ?? null
  }

  async listOwnedConversations(
    ownerKey: string,
    limit = 30
  ): Promise<ConversationSummary[]> {
    return this.db
      .select({
        id: conversations.id,
        title: conversations.title,
        createdAt: conversations.createdAt,
        updatedAt: conversations.updatedAt,
        isSimulated: conversations.isSimulated,
        messageCount: sql<number>`(select count(*)::int from chat.conversation_messages m where m.conversation_id = "chat"."conversations"."id")`,
      })
      .from(conversations)
      .where(eq(conversations.ownerKey, ownerKey))
      .orderBy(desc(conversations.updatedAt))
      .limit(limit)
  }

  async listMessages(
    conversationId: string
  ): Promise<ConversationMessageRecord[]> {
    return this.db
      .select()
      .from(conversationMessages)
      .where(eq(conversationMessages.conversationId, conversationId))
      .orderBy(asc(conversationMessages.createdAt), asc(conversationMessages.id))
  }

  async appendMessage(input: {
    conversationId: string
    role: "USER" | "ASSISTANT" | "SYSTEM" | "TOOL"
    content: string
    model?: string
    metadata?: Record<string, unknown>
  }): Promise<ConversationMessageRecord> {
    const [row] = await this.db
      .insert(conversationMessages)
      .values({
        conversationId: input.conversationId,
        role: input.role,
        content: input.content,
        model: input.model,
        metadata: input.metadata ?? {},
      })
      .returning()
    if (!row) throw new Error("Nie udało się zapisać wiadomości")
    await this.db
      .update(conversations)
      .set({ updatedAt: new Date() })
      .where(eq(conversations.id, input.conversationId))
    return row
  }

  /**
   * Stores one turn atomically: the user message (unless it is a retry of an
   * already stored one), the assistant message, its tool calls and evidence.
   */
  async saveTurn(input: SaveTurnInput): Promise<{ assistantMessageId: string }> {
    return this.db.transaction(async (tx) => {
      if (input.user) {
        await tx.insert(conversationMessages).values({
          conversationId: input.conversationId,
          role: "USER",
          content: input.user.content,
          metadata: input.user.metadata,
          createdAt: input.user.createdAt,
        })
      }
      const [assistant] = await tx
        .insert(conversationMessages)
        .values({
          conversationId: input.conversationId,
          role: "ASSISTANT",
          content: input.assistant.content,
          model: input.assistant.model,
          tokensIn: input.assistant.tokensIn,
          tokensOut: input.assistant.tokensOut,
          metadata: input.assistant.metadata,
        })
        .returning({ id: conversationMessages.id })
      if (!assistant) throw new Error("Nie udało się zapisać odpowiedzi")

      if (input.toolCalls.length > 0) {
        await tx.insert(assistantToolCalls).values(
          input.toolCalls.map((call) => ({
            messageId: assistant.id,
            toolName: call.toolName,
            arguments: call.arguments,
            result: call.result,
            status: call.status,
            latencyMs: Math.round(call.latencyMs),
          }))
        )
      }
      if (input.evidence.length > 0) {
        await tx.insert(retrievedEvidence).values(
          input.evidence.map((item) => ({
            messageId: assistant.id,
            chunkId: item.chunkId,
            rank: item.rank,
            score: item.score.toFixed(5),
            quote: item.quote.slice(0, 1200),
          }))
        )
      }
      await tx
        .update(conversations)
        .set({ updatedAt: new Date() })
        .where(eq(conversations.id, input.conversationId))
      return { assistantMessageId: assistant.id }
    })
  }

  /** Removes the trailing assistant message (regenerate). */
  async deleteLastAssistantMessage(conversationId: string): Promise<boolean> {
    const [last] = await this.db
      .select({ id: conversationMessages.id, role: conversationMessages.role })
      .from(conversationMessages)
      .where(eq(conversationMessages.conversationId, conversationId))
      .orderBy(desc(conversationMessages.createdAt), desc(conversationMessages.id))
      .limit(1)
    if (!last || last.role !== "ASSISTANT") return false
    await this.db
      .delete(conversationMessages)
      .where(eq(conversationMessages.id, last.id))
    return true
  }

  /** Deletes a conversation with all messages, tool calls and evidence (FK cascade). */
  async deleteOwnedConversation(id: string, ownerKey: string): Promise<boolean> {
    const deleted = await this.db
      .delete(conversations)
      .where(and(eq(conversations.id, id), eq(conversations.ownerKey, ownerKey)))
      .returning({ id: conversations.id })
    return deleted.length > 0
  }

  async deleteAllOwned(ownerKey: string): Promise<number> {
    const deleted = await this.db
      .delete(conversations)
      .where(eq(conversations.ownerKey, ownerKey))
      .returning({ id: conversations.id })
    return deleted.length
  }
}
