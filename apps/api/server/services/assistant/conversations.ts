import { AI_DISCLOSURE, type AssistantReply } from "@zpr/contracts"
import type { AssistantTurnResult, AssistantUIMessage } from "@zpr/ai"

import type { Principal } from "@/server/auth/session"
import { getContainer } from "@/server/container"
import { AppError } from "@zpr/contracts/problem"

import { toUIMessages } from "./chat"

export interface ConversationListItem {
  id: string
  title: string
  createdAt: string
  updatedAt: string
  messageCount: number
  simulated: boolean
}

export async function listConversations(principal: Principal): Promise<ConversationListItem[]> {
  const rows = await getContainer().repositories.conversations.listOwnedConversations(principal.sid, 30)
  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    messageCount: row.messageCount,
    simulated: row.isSimulated,
  }))
}

export async function getConversationMessages(
  principal: Principal,
  id: string
): Promise<{ id: string; title: string; messages: AssistantUIMessage[] }> {
  const { repositories } = getContainer()
  const conversation = await repositories.conversations.getOwnedConversation(id, principal.sid)
  if (!conversation) throw new AppError(404, "NOT_FOUND", "Nie znaleziono rozmowy.")
  const rows = await repositories.conversations.listMessages(id)
  return { id, title: conversation.title, messages: toUIMessages(rows) }
}

export async function deleteConversation(principal: Principal, id: string): Promise<void> {
  const deleted = await getContainer().repositories.conversations.deleteOwnedConversation(id, principal.sid)
  if (!deleted) throw new AppError(404, "NOT_FOUND", "Nie znaleziono rozmowy.")
}

export async function deleteAllConversations(principal: Principal): Promise<number> {
  return getContainer().repositories.conversations.deleteAllOwned(principal.sid)
}

/** Flattens a turn into the REST reply shape. */
export function toReply(result: AssistantTurnResult): AssistantReply {
  return {
    conversationId: result.conversationId,
    messageId: result.assistantMessage.id,
    content: result.text,
    citations: result.sources.map((source) => ({
      chunkId: source.chunkId,
      sourceTitle: source.sourceTitle,
      sourceUrl: source.sourceUrl,
      legalReference: source.legalReference,
      sectionIdentifier: source.sectionIdentifier,
      quote: source.quote ?? `${source.documentTitle} — ${source.legalReference ?? source.sectionIdentifier ?? ""}`,
      score: source.relevance,
    })),
    sources: result.sources,
    toolCalls: result.toolCalls.map((call) => ({
      toolName: call.toolName,
      input: call.input,
      output: call.output,
      status: call.status,
    })),
    grounding: result.grounding,
    followUpQuestions: result.followUps,
    mode: result.mode,
    simulated: true,
    aiDisclosure: AI_DISCLOSURE,
  }
}
