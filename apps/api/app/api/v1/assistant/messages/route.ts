import { assistantChatSchema } from "@zpr/contracts/assistant"
import { getEnv } from "@zpr/contracts/env"

import { principalFrom, respondAs } from "@/server/http/principal"
import { enforceAssistantRateLimit } from "@/server/http/rate-limit"
import { apiRoute, json, readJson } from "@/server/http/route"
import { prepareTurn, startTurn, toReply } from "@/server/services/assistant"
import { AppError } from "@zpr/contracts/problem"
import { getActiveRuleSet } from "@/server/services/rule-set"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"
export const maxDuration = 120

/**
 * REST (non-streaming) integration endpoint. Runs the same orchestration as
 * the streaming chat and returns the final answer with sources, tool results
 * and the grounding report.
 */
export const POST = apiRoute(async (request) => {
  const env = getEnv()
  const principal = principalFrom(request)
  enforceAssistantRateLimit(request, principal.sid, env)

  const body = await readJson(request, assistantChatSchema)
  const message = { id: crypto.randomUUID(), text: body.message }
  const prepared = await prepareTurn({
    principal,
    conversationId: body.conversationId ?? crypto.randomUUID(),
    message,
    regenerate: false,
  })
  const ruleSet = await getActiveRuleSet(body.asOf)

  const { stream, persisted } = startTurn({
    env,
    principal,
    prepared,
    message,
    options: { useProfile: body.useProfile, asOf: body.asOf },
    ruleSet,
    abortSignal: request.signal,
  })
  const reader = stream.getReader()
  while (!(await reader.read()).done) {
    // Drain: the REST client gets the final result only.
  }
  const result = await persisted
  if (result.status === "failed") {
    throw new AppError(
      503,
      "UPSTREAM_ERROR",
      "Asystent nie mógł teraz odpowiedzieć. Spróbuj ponownie.",
      {
        conversationId: result.conversationId,
      }
    )
  }
  return respondAs(json(toReply(result)), principal)
})
