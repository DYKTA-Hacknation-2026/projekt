import {
  createChatModel,
  scrubPii,
  streamAssistantTurn,
  type AssistantTurnResult,
  type AssistantUIMessage,
  type ResolvedChatModel,
} from "@zpr/ai"
import type { AssistantOptions } from "@zpr/contracts/assistant"
import type { Env } from "@zpr/contracts/env"
import type { ConversationMessageRecord } from "@zpr/db/repositories"
import type { RuleSet } from "@zpr/domain"

import type { Principal } from "@/server/auth/session"
import { getContainer } from "@/server/container"
import { AppError } from "@zpr/contracts/problem"

import { createAssistantServices } from "./services"

type GlobalWithModel = typeof globalThis & {
  __zprChatModel?: { key: string; model: ResolvedChatModel | null }
}

/** One model instance per configuration, reused across requests. */
export function getChatModel(env: Env): ResolvedChatModel | null {
  const global = globalThis as GlobalWithModel
  const key = `${env.AI_PROVIDER}|${env.AI_MODEL ?? ""}|${env.AI_BASE_URL ?? ""}`
  if (global.__zprChatModel?.key !== key) {
    global.__zprChatModel = {
      key,
      model: createChatModel({
        provider: env.AI_PROVIDER,
        model: env.AI_MODEL,
        apiKey: env.AI_API_KEY,
        baseUrl: env.AI_BASE_URL,
      }),
    }
  }
  return global.__zprChatModel.model
}

const LOG_LEVELS = ["trace", "debug", "info", "warn", "error", "fatal"] as const

/** Structured, content-free logging: ids, counts and statuses only. */
export function assistantLogger(env: Env) {
  const enabled =
    LOG_LEVELS.indexOf(env.LOG_LEVEL) <= LOG_LEVELS.indexOf("info")
  return (event: string, data: Record<string, unknown>) => {
    if (!enabled && !event.endsWith("error")) return
    const line = JSON.stringify({
      level: event.endsWith("error") ? "warn" : "info",
      event,
      ...data,
    })
    if (event.endsWith("error")) console.warn(line)
    else console.info(line)
  }
}

/** Rebuilds UI messages from storage. Only our own server writes `uiMessage`. */
export function toUIMessages(
  rows: ConversationMessageRecord[]
): AssistantUIMessage[] {
  return rows
    .filter((row) => row.role === "USER" || row.role === "ASSISTANT")
    .map((row) => {
      const stored = (row.metadata as { uiMessage?: AssistantUIMessage })
        .uiMessage
      if (stored && Array.isArray(stored.parts)) return stored
      return {
        id: row.id,
        role: row.role === "USER" ? ("user" as const) : ("assistant" as const),
        parts: [{ type: "text" as const, text: row.content }],
      }
    })
}

function clientIdOf(row: ConversationMessageRecord | undefined): string | null {
  return (
    (row?.metadata as { uiMessage?: { id?: string } } | undefined)?.uiMessage
      ?.id ?? null
  )
}

export interface PreparedTurn {
  conversationId: string
  history: AssistantUIMessage[]
  /** The user message is already stored (retry/regenerate). */
  userAlreadyStored: boolean
}

/**
 * Loads (or creates) the caller's conversation. A conversation id owned by
 * someone else is reported as not found — never revealed or reused.
 */
export async function prepareTurn(input: {
  principal: Principal
  conversationId: string
  message: { id: string; text: string }
  regenerate: boolean
}): Promise<PreparedTurn> {
  const { repositories } = getContainer()
  const owned = await repositories.conversations.getOwnedConversation(
    input.conversationId,
    input.principal.sid
  )

  if (!owned) {
    const existing = await repositories.conversations.getConversation(
      input.conversationId
    )
    if (existing) {
      throw new AppError(404, "NOT_FOUND", "Nie znaleziono rozmowy.")
    }
    await repositories.conversations.createConversation({
      id: input.conversationId,
      ownerKey: input.principal.sid,
      userId: input.principal.userId,
      // Titles are listed in history: never store identifiers in them.
      title: scrubPii(input.message.text)
        .text.replace(/\s+/g, " ")
        .slice(0, 90),
    })
    return {
      conversationId: input.conversationId,
      history: [],
      userAlreadyStored: false,
    }
  }

  if (input.regenerate) {
    await repositories.conversations.deleteLastAssistantMessage(owned.id)
  }
  const rows = await repositories.conversations.listMessages(owned.id)
  const last = rows.at(-1)
  // A retry after a failed turn (or a regenerate) re-sends the stored question.
  const userAlreadyStored =
    last?.role === "USER" && clientIdOf(last) === input.message.id
  const history = toUIMessages(userAlreadyStored ? rows.slice(0, -1) : rows)
  return { conversationId: owned.id, history, userAlreadyStored }
}

function compact(value: unknown): Record<string, unknown> {
  const json = JSON.parse(JSON.stringify(value ?? {})) as unknown
  return json && typeof json === "object" && !Array.isArray(json)
    ? (json as Record<string, unknown>)
    : { value: json }
}

export async function persistTurn(
  result: AssistantTurnResult,
  userAlreadyStored: boolean
): Promise<void> {
  const { repositories } = getContainer()
  const userRecord = userAlreadyStored
    ? null
    : {
        content: result.userMessage.parts
          .map((part) => (part.type === "text" ? part.text : ""))
          .join(""),
        metadata: {
          uiMessage: result.userMessage,
          redactions: result.redactions,
          injectionSuspected: result.injectionSuspected,
        },
        createdAt: new Date(Date.now() - result.latencyMs),
      }

  if (result.status === "failed") {
    // Keep the question so the user can retry; no partial answer is stored.
    if (userRecord) {
      await repositories.conversations.appendMessage({
        conversationId: result.conversationId,
        role: "USER",
        content: userRecord.content,
        metadata: userRecord.metadata,
      })
    }
    return
  }

  await repositories.conversations.saveTurn({
    conversationId: result.conversationId,
    user: userRecord,
    assistant: {
      content: result.text,
      model: result.modelId,
      tokensIn: result.usage.inputTokens,
      tokensOut: result.usage.outputTokens,
      metadata: {
        uiMessage: result.assistantMessage,
        status: result.status,
        mode: result.mode,
        intents: result.intent.intents,
        grounding: result.grounding,
        followUps: result.followUps,
        latencyMs: result.latencyMs,
      },
    },
    toolCalls: result.toolCalls.map((call) => ({
      toolName: call.toolName,
      arguments: compact(call.input),
      result: compact(call.output),
      status: call.status,
      latencyMs: call.latencyMs,
    })),
    evidence: result.sources.map((source, index) => ({
      chunkId: source.chunkId,
      rank: index + 1,
      score: source.relevance,
      quote:
        source.quote ??
        `${source.documentTitle} — ${source.legalReference ?? source.sectionIdentifier ?? ""}`,
    })),
  })
}

export function startTurn(input: {
  env: Env
  principal: Principal
  prepared: PreparedTurn
  message: { id: string; text: string }
  options: AssistantOptions
  ruleSet: RuleSet
  abortSignal?: AbortSignal
}) {
  const log = assistantLogger(input.env)
  const turn = streamAssistantTurn({
    conversationId: input.prepared.conversationId,
    services: createAssistantServices({
      principal: input.principal,
      profileEnabled: input.options.useProfile,
      ruleSet: input.ruleSet,
    }),
    chatModel: getChatModel(input.env),
    history: input.prepared.history,
    userMessage: input.message,
    asOf: input.options.asOf,
    profileEnabled: input.options.useProfile,
    abortSignal: input.abortSignal,
    generateMessageId: () => crypto.randomUUID(),
    settings: {
      temperature: input.env.AI_TEMPERATURE,
      maxOutputTokens: input.env.AI_MAX_OUTPUT_TOKENS,
      maxSteps: input.env.AI_MAX_STEPS,
      historyMessages: input.env.AI_HISTORY_MESSAGES,
      timeoutMs: input.env.AI_TIMEOUT_MS,
    },
    log,
  })

  // Persist independently of the client connection.
  const persisted = turn.done
    .then(async (result) => {
      await persistTurn(result, input.prepared.userAlreadyStored)
      return result
    })
    .catch((error: unknown) => {
      log("assistant.persist.error", {
        conversationId: input.prepared.conversationId,
        error: error instanceof Error ? error.name : "Error",
      })
      throw error
    })

  return { stream: turn.stream, persisted }
}
