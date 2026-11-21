import {
  AI_DISCLOSURE,
  type AssistantChatInput,
  type AssistantCitation,
  type AssistantReply,
} from "@zpr/contracts"
import type { KnowledgeChunkResult } from "@zpr/contracts/knowledge"

import { getContainer } from "@/server/container"
import { AppError } from "@/server/http/problem"

import { searchKnowledge } from "./knowledge"

const AMOUNT_INTENT =
  /(ile|kwot|zarab|wynagrod|dostan|pieni|wypłat|wyplat|zasiłek wynosi|zasilek wynosi)/i

function excerpt(text: string, maxLength: number): string {
  const normalized = text.replace(/\s+/g, " ").trim()
  if (normalized.length <= maxLength) return normalized
  return `${normalized.slice(0, maxLength - 1).trimEnd()}…`
}

export interface GroundedAnswer {
  content: string
  citations: AssistantCitation[]
}

/**
 * Deterministic answer composer. It only quotes retrieved chunks: the
 * assistant never invents an amount, a date or a legal conclusion. The
 * numeric guard is intentionally blunt — amounts belong to the calculator.
 */
/** Citation-only sources (e.g. competition copies) are cited, never quoted. */
function quotable(chunk: KnowledgeChunkResult): boolean {
  return (
    chunk.redistribution === "ALLOWED" || chunk.redistribution === "ATTRIBUTION"
  )
}

function reference(chunk: KnowledgeChunkResult): string {
  const location =
    chunk.legalReference ?? chunk.sectionIdentifier ?? chunk.documentTitle
  const page = chunk.pageNumber ? `, s. ${chunk.pageNumber}` : ""
  return `${chunk.documentTitle} — ${location}${page}`
}

export function buildGroundedAnswer(
  query: string,
  chunks: KnowledgeChunkResult[],
  noEvidenceMessage?: string
): GroundedAnswer {
  if (chunks.length === 0) {
    if (noEvidenceMessage) {
      return {
        content: `${noEvidenceMessage} Nie chcę zgadywać.`,
        citations: [],
      }
    }
    return {
      content:
        "Nie znalazłem w bazie wiedzy wystarczająco pewnego fragmentu, który odpowiada na to pytanie. Nie chcę zgadywać. Spróbuj doprecyzować pytanie (np. „wymiar urlopu macierzyńskiego przy jednym dziecku”) albo skorzystaj z kalkulatora i listy dokumentów.",
      citations: [],
    }
  }

  const selected = chunks.slice(0, 3)
  const citations: AssistantCitation[] = selected.map((chunk) => ({
    chunkId: chunk.id,
    sourceTitle: chunk.sourceTitle,
    sourceUrl: chunk.sourceUrl,
    legalReference: chunk.legalReference,
    sectionIdentifier: chunk.sectionIdentifier,
    quote: quotable(chunk) ? excerpt(chunk.content, 240) : reference(chunk),
    score: chunk.score,
  }))

  const passages = selected
    .map((chunk, index) =>
      quotable(chunk)
        ? `„${excerpt(chunk.content, 380)}” [S${index + 1}]${
            chunk.legalReference ? ` — ${chunk.legalReference}` : ""
          }`
        : `Zob. ${reference(chunk)} [S${index + 1}] (materiał wewnętrzny — tylko odesłanie, bez cytatu).`
    )
    .join("\n\n")

  const amountNote = AMOUNT_INTENT.test(query)
    ? "\n\nNie wyliczam kwot samodzielnie. Kwoty zależą od indywidualnej podstawy wymiaru — otwórz kalkulator, aby zobaczyć wyliczenie z pełnym śladem."
    : ""

  return {
    content: `Na podstawie bazy wiedzy:\n\n${passages}${amountNote}\n\nTo informacja ogólna, nie decyzja ZUS. Sprawdź swoje dane w kalkulatorze i potwierdź dokumenty przed złożeniem wniosku.`,
    citations,
  }
}

export async function chatWithAssistant(
  input: AssistantChatInput
): Promise<AssistantReply> {
  const { repositories } = getContainer()

  let conversation = input.conversationId
    ? await repositories.conversations.getConversation(input.conversationId)
    : null

  if (input.conversationId && !conversation) {
    throw new AppError(404, "NOT_FOUND", "Nie znaleziono rozmowy.")
  }

  conversation ??= await repositories.conversations.createConversation({
    title: input.message.slice(0, 90),
    isSimulated: true,
  })

  await repositories.conversations.appendMessage({
    conversationId: conversation.id,
    role: "USER",
    content: input.message,
  })

  const startedAt = Date.now()
  const search = await searchKnowledge({
    query: input.message,
    limit: 5,
    asOf: input.asOf,
  })
  const latencyMs = Date.now() - startedAt
  const answer = buildGroundedAnswer(
    input.message,
    search.results,
    search.noEvidence?.message
  )

  const assistantMessage = await repositories.conversations.appendMessage({
    conversationId: conversation.id,
    role: "ASSISTANT",
    content: answer.content,
    model: "demo-retrieval",
    metadata: {
      retrieval: {
        status: search.status,
        chunks: search.results.length,
        embeddingModel: search.embeddingModel?.name ?? null,
        asOf: search.asOf,
        redactions: search.redactions,
      },
    },
  })

  await Promise.all(
    answer.citations.map((citation, index) =>
      repositories.conversations.addEvidence({
        messageId: assistantMessage.id,
        chunkId: citation.chunkId,
        rank: index + 1,
        score: citation.score,
        quote: citation.quote,
      })
    )
  )

  await repositories.conversations.addToolCall({
    messageId: assistantMessage.id,
    toolName: "searchKnowledge",
    arguments: { query: input.message, limit: 5, asOf: input.asOf ?? null },
    result: {
      status: search.status,
      chunks: search.results.length,
      embeddingModel: search.embeddingModel?.name ?? null,
      noEvidence: search.noEvidence?.reason ?? null,
    },
    latencyMs,
  })

  return {
    conversationId: conversation.id,
    messageId: assistantMessage.id,
    content: answer.content,
    citations: answer.citations,
    simulated: true,
    aiDisclosure: AI_DISCLOSURE,
  }
}
