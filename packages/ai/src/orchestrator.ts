import {
  convertToModelMessages,
  createUIMessageStream,
  isStepCount,
  readUIMessageStream,
  streamText,
  toUIMessageStream,
  type UIMessageChunk,
} from "ai"

import type { GroundingReport } from "@zpr/contracts/assistant"

import { suggestFollowUps } from "./followups"
import { checkGrounding } from "./guards/grounding"
import { detectInjection } from "./guards/injection"
import { scrubPii, type Redaction } from "./guards/pii"
import { classifyIntent, type IntentClassification } from "./intent"
import { decideStep } from "./policy"
import { buildInstructions } from "./prompt"
import type { ResolvedChatModel } from "./provider"
import { createRulesModel, RULES_MODEL_ID } from "./rules/model"
import { createAssistantTools } from "./tools"
import { TurnState } from "./turn"
import type {
  AssistantMessageMetadata,
  AssistantServices,
  AssistantToolName,
  AssistantUIMessage,
  ToolCallRecord,
} from "./types"

export interface AssistantSettings {
  temperature: number
  maxOutputTokens: number
  maxSteps: number
  historyMessages: number
  timeoutMs: number
}

export const DEFAULT_SETTINGS: AssistantSettings = {
  temperature: 0.2,
  maxOutputTokens: 1500,
  maxSteps: 8,
  historyMessages: 12,
  timeoutMs: 60_000,
}

export interface AssistantTurnInput {
  conversationId: string
  services: AssistantServices
  /** `null` runs the offline rules model through the same pipeline. */
  chatModel: ResolvedChatModel | null
  /** Persisted messages of this conversation, oldest first. */
  history: AssistantUIMessage[]
  userMessage: { id: string; text: string }
  asOf?: string
  profileEnabled: boolean
  settings?: Partial<AssistantSettings>
  abortSignal?: AbortSignal
  generateMessageId: () => string
  /** Structured, content-free diagnostics. Never receives message text. */
  log?: (event: string, data: Record<string, unknown>) => void
}

export interface AssistantTurnResult {
  conversationId: string
  status: "completed" | "aborted" | "failed"
  mode: "llm" | "rules"
  modelId: string
  /** The user message as stored and sent to the model (identifiers removed). */
  userMessage: AssistantUIMessage
  assistantMessage: AssistantUIMessage
  text: string
  toolCalls: ToolCallRecord[]
  sources: ReturnType<TurnState["sources"]>
  grounding: GroundingReport | null
  followUps: string[]
  intent: IntentClassification
  injectionSuspected: boolean
  redactions: Redaction[]
  usage: { inputTokens: number | null; outputTokens: number | null }
  latencyMs: number
}

const CITATION = /\s?\[S\d{1,2}\]/g

function textOf(message: AssistantUIMessage): string {
  return message.parts
    .map((part) => (part.type === "text" ? part.text : ""))
    .join("")
    .trim()
}

/**
 * Earlier turns are passed to the model as plain text only: old tool calls,
 * evidence and citation labels are dropped so the model can only cite what it
 * retrieves in the current turn.
 */
export function toModelHistory(
  history: AssistantUIMessage[],
  limit: number
): AssistantUIMessage[] {
  return history
    .filter((message) => message.role === "user" || message.role === "assistant")
    .map((message) => {
      const text = textOf(message)
      return {
        id: message.id,
        role: message.role,
        parts: [
          {
            type: "text" as const,
            text: message.role === "assistant" ? text.replace(CITATION, "") : text,
          },
        ],
      }
    })
    .filter((message) => message.parts[0]!.text.length > 0)
    .slice(-limit)
}

export const STREAM_ERROR_MESSAGE =
  "Asystent nie mógł dokończyć odpowiedzi. Spróbuj ponownie za chwilę — twoje pytanie zostało zapisane."

/**
 * One conversational turn: intent → policy → tools (retrieval + services) →
 * grounded, streamed answer → guards → persisted result.
 */
export function streamAssistantTurn(input: AssistantTurnInput): {
  stream: ReadableStream<UIMessageChunk>
  done: Promise<AssistantTurnResult>
} {
  const settings = { ...DEFAULT_SETTINGS, ...input.settings }
  const startedAt = Date.now()
  const asOf = input.asOf ?? input.services.today()
  const turn = new TurnState(asOf)

  const scrubbed = scrubPii(input.userMessage.text)
  const injection = detectInjection(scrubbed.text)
  const intent = classifyIntent(scrubbed.text)
  const mode: "llm" | "rules" = input.chatModel ? "llm" : "rules"
  const modelId = input.chatModel ? `${input.chatModel.provider}:${input.chatModel.modelId}` : `zpr:${RULES_MODEL_ID}`
  const responseId = input.generateMessageId()

  const userMessage: AssistantUIMessage = {
    id: input.userMessage.id,
    role: "user",
    parts: [{ type: "text", text: scrubbed.text }],
    metadata: {
      conversationId: input.conversationId,
      createdAt: new Date(startedAt).toISOString(),
      ...(scrubbed.redactions.length ? { redactions: scrubbed.redactions } : {}),
    },
  }

  const priorUserTexts = input.history
    .filter((message) => message.role === "user")
    .map(textOf)
  const userTexts = [...priorUserTexts, scrubbed.text]

  const metadata: AssistantMessageMetadata = {
    conversationId: input.conversationId,
    createdAt: new Date(startedAt).toISOString(),
    mode,
    model: modelId,
    profileUsed: false,
    simulated: true,
    ...(scrubbed.redactions.length ? { redactions: scrubbed.redactions } : {}),
  }

  let resolveDone!: (result: AssistantTurnResult) => void
  let rejectDone!: (error: unknown) => void
  const done = new Promise<AssistantTurnResult>((resolve, reject) => {
    resolveDone = resolve
    rejectDone = reject
  })

  input.log?.("assistant.turn.start", {
    conversationId: input.conversationId,
    mode,
    intents: intent.intents,
    requiredTools: intent.requiredTools,
    injectionSuspected: injection.flagged,
    redactions: scrubbed.redactions,
    historyMessages: input.history.length,
  })

  const stream = createUIMessageStream<AssistantUIMessage>({
    execute: async ({ writer }) => {
      const chunks: UIMessageChunk[] = []
      const emit = (chunk: UIMessageChunk) => {
        chunks.push(chunk)
        try {
          writer.write(chunk as Parameters<typeof writer.write>[0])
        } catch {
          // The client went away; keep consuming so the turn is still persisted.
        }
      }

      let status: AssistantTurnResult["status"] = "completed"
      let usage: AssistantTurnResult["usage"] = { inputTokens: null, outputTokens: null }
      let text = ""

      emit({ type: "start", messageId: responseId, messageMetadata: metadata })

      try {
        const tools = createAssistantTools(input.services, turn)
        const instructions = buildInstructions({
          today: input.services.today(),
          asOf,
          profileStatus: input.profileEnabled ? "UNKNOWN" : "NOT_ENABLED",
          intent,
          injectionSuspected: injection.flagged,
        })
        const model = input.chatModel?.model ?? createRulesModel({
          turn,
          intent,
          userTexts,
          injectionSuspected: injection.flagged,
        })
        const messages = await convertToModelMessages([
          ...toModelHistory(input.history, settings.historyMessages),
          userMessage,
        ])
        const attempts = new Map<AssistantToolName, number>()
        const signals = [AbortSignal.timeout(settings.timeoutMs)]
        if (input.abortSignal) signals.push(input.abortSignal)

        const result = streamText({
          model,
          instructions,
          messages,
          tools,
          stopWhen: isStepCount(settings.maxSteps),
          maxRetries: 1,
          abortSignal: AbortSignal.any(signals),
          ...(mode === "llm"
            ? { temperature: settings.temperature, maxOutputTokens: settings.maxOutputTokens }
            : {}),
          // Replaces the SDK's default console.error: provider errors carry the
          // request body (user messages), so only the error class is logged.
          onError: ({ error }) => {
            input.log?.("assistant.model.error", {
              conversationId: input.conversationId,
              error: error instanceof Error ? error.name : "Error",
            })
          },
          prepareStep: ({ stepNumber }) => {
            const decision = decideStep({
              stepNumber,
              maxSteps: settings.maxSteps,
              required: intent.requiredTools,
              turn,
              attempts,
            })
            if (decision.kind === "force") {
              return { toolChoice: { type: "tool", toolName: decision.toolName } }
            }
            if (decision.kind === "answer") return { toolChoice: "none" }
            return {}
          },
        })

        const ui = toUIMessageStream({
          stream: result.stream,
          sendStart: false,
          sendFinish: false,
          // Called for stream errors and for invalid or failed tool calls; only
          // an `error` chunk (below) marks the whole turn as failed.
          onError: (error) => {
            input.log?.("assistant.turn.stream_error", {
              conversationId: input.conversationId,
              error: error instanceof Error ? error.name : "Error",
            })
            return STREAM_ERROR_MESSAGE
          },
        })
        for await (const chunk of ui as unknown as AsyncIterable<UIMessageChunk>) {
          if (chunk.type === "abort") status = "aborted"
          if (chunk.type === "error") status = "failed"
          emit(chunk)
        }

        if (status === "completed") {
          text = await result.text
          const total = await result.usage
          usage = {
            inputTokens: total.inputTokens ?? null,
            outputTokens: total.outputTokens ?? null,
          }
        }
      } catch (error) {
        status = input.abortSignal?.aborted ? "aborted" : "failed"
        input.log?.("assistant.turn.error", {
          conversationId: input.conversationId,
          error: error instanceof Error ? error.name : "Error",
        })
        if (status === "failed") emit({ type: "error", errorText: STREAM_ERROR_MESSAGE })
      }

      const sources = turn.sources()
      let grounding: GroundingReport | null = null
      let followUps: string[] = []

      if (status === "completed") {
        grounding = checkGrounding({
          answer: text,
          turn,
          userTexts,
          legalIntent: intent.legal,
        })
        followUps = suggestFollowUps(intent, turn)
        if (sources.length > 0) {
          emit({ type: "data-evidence", id: "evidence", data: { sources } })
        }
        emit({ type: "data-grounding", id: "grounding", data: grounding })
        if (followUps.length > 0) {
          emit({ type: "data-followups", id: "followups", data: { questions: followUps } })
        }
      }

      const profileUsed = turn.profileStatus === "AVAILABLE"
      const finalMetadata: AssistantMessageMetadata = {
        ...metadata,
        profileUsed,
        ...(status === "aborted" ? { aborted: true } : {}),
      }
      emit({ type: "finish", messageMetadata: finalMetadata })

      // Assemble the persisted assistant message from exactly what was streamed.
      let assistantMessage: AssistantUIMessage = {
        id: responseId,
        role: "assistant",
        parts: [],
        metadata: finalMetadata,
      }
      try {
        const replay = new ReadableStream<UIMessageChunk>({
          start(controller) {
            for (const chunk of chunks) controller.enqueue(chunk)
            controller.close()
          },
        })
        for await (const snapshot of readUIMessageStream<AssistantUIMessage>({ stream: replay })) {
          assistantMessage = snapshot
        }
      } catch {
        // Keep the minimal message; persistence still records tool calls.
      }
      assistantMessage = { ...assistantMessage, id: responseId, metadata: finalMetadata }
      if (!text) text = textOf(assistantMessage)

      const outcome: AssistantTurnResult = {
        conversationId: input.conversationId,
        status,
        mode,
        modelId,
        userMessage,
        assistantMessage,
        text,
        toolCalls: turn.toolCalls,
        sources,
        grounding,
        followUps,
        intent,
        injectionSuspected: injection.flagged,
        redactions: scrubbed.redactions,
        usage,
        latencyMs: Date.now() - startedAt,
      }
      input.log?.("assistant.turn.end", {
        conversationId: input.conversationId,
        status,
        mode,
        tools: turn.toolCalls.map((call) => `${call.toolName}:${call.status}`),
        sources: sources.length,
        grounding: grounding?.status ?? null,
        latencyMs: outcome.latencyMs,
      })
      resolveDone(outcome)
    },
    onError: (error) => {
      rejectDone(error)
      return STREAM_ERROR_MESSAGE
    },
  })

  return { stream, done }
}

/** Runs a turn to completion (REST endpoint, tests). */
export async function runAssistantTurn(
  input: AssistantTurnInput
): Promise<AssistantTurnResult> {
  const { stream, done } = streamAssistantTurn(input)
  const reader = stream.getReader()
  while (!(await reader.read()).done) {
    // drain
  }
  return done
}
