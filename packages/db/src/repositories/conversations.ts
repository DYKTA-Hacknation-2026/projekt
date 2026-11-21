import { desc, eq, sql } from "drizzle-orm"

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
} from "./interfaces"

export class DrizzleConversationRepository implements ConversationRepository {
  constructor(private readonly db: Database) {}

  async countConversations(): Promise<number> {
    const [row] = await this.db
      .select({ value: sql<number>`count(*)::int` })
      .from(conversations)
    return row?.value ?? 0
  }

  async createConversation(input: {
    userId?: string
    title: string
    isSimulated?: boolean
  }): Promise<ConversationRecord> {
    const [row] = await this.db
      .insert(conversations)
      .values({
        userId: input.userId,
        title: input.title.slice(0, 160),
        isSimulated: input.isSimulated ?? true,
      })
      .returning()
    if (!row) throw new Error("Nie udało się utworzyć rozmowy")
    return row
  }

  async getConversation(id: string): Promise<ConversationRecord | null> {
    const [row] = await this.db
      .select()
      .from(conversations)
      .where(eq(conversations.id, id))
      .limit(1)
    return row ?? null
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

  async addEvidence(input: {
    messageId: string
    chunkId: string
    rank: number
    score: number
    quote: string
  }): Promise<void> {
    await this.db.insert(retrievedEvidence).values({
      messageId: input.messageId,
      chunkId: input.chunkId,
      rank: input.rank,
      score: input.score.toFixed(5),
      quote: input.quote.slice(0, 1200),
    })
  }

  async addToolCall(input: {
    messageId: string
    toolName: string
    arguments: Record<string, unknown>
    result: Record<string, unknown>
    latencyMs: number
  }): Promise<void> {
    await this.db.insert(assistantToolCalls).values({
      messageId: input.messageId,
      toolName: input.toolName,
      arguments: input.arguments,
      result: input.result,
      latencyMs: Math.round(input.latencyMs),
    })
  }

  async listMessages(
    conversationId: string
  ): Promise<ConversationMessageRecord[]> {
    return this.db
      .select()
      .from(conversationMessages)
      .where(eq(conversationMessages.conversationId, conversationId))
      .orderBy(desc(conversationMessages.createdAt))
  }
}
