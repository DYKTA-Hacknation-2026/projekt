import { createUIMessageStreamResponse } from "ai"

import { assistantStreamRequestSchema } from "@zpr/contracts/assistant"
import { getEnv } from "@zpr/contracts/env"

import { principalFrom, respondAs } from "@/server/http/principal"
import { enforceAssistantRateLimit } from "@/server/http/rate-limit"
import { apiRoute, readJson } from "@/server/http/route"
import { prepareTurn, startTurn } from "@/server/services/assistant"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"
export const maxDuration = 120

/**
 * Streaming chat (AI SDK UI message stream over SSE). The body carries only
 * the newest user message; history comes from the database.
 */
export const POST = apiRoute(async (request) => {
  const env = getEnv()
  const principal = principalFrom(request)
  enforceAssistantRateLimit(request, principal.sid, env)

  const body = await readJson(request, assistantStreamRequestSchema)
  const message = { id: body.message.id, text: body.message.parts[0]!.text }
  const prepared = await prepareTurn({
    principal,
    conversationId: body.id,
    message,
    regenerate: body.trigger === "regenerate-message",
  })

  const { stream, persisted } = startTurn({
    env,
    principal,
    prepared,
    message,
    options: body.options ?? { useProfile: false },
    abortSignal: request.signal,
  })
  // Errors are logged inside; the stream already told the client.
  persisted.catch(() => undefined)

  return respondAs(
    createUIMessageStreamResponse({
      stream,
      headers: { "cache-control": "no-store", "x-conversation-id": prepared.conversationId },
    }),
    principal
  )
})
