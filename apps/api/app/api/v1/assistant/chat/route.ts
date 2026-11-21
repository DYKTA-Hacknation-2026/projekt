import { assistantChatSchema } from "@zpr/contracts/assistant"
import { getEnv } from "@zpr/contracts/env"

import { AppError } from "@zpr/contracts/problem"
import { clientKey, enforceRateLimit } from "@/server/http/rate-limit"
import { apiRoute, json, readJson } from "@/server/http/route"
import { chatWithAssistant } from "@/server/services/assistant"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export const POST = apiRoute(async (request) => {
  const env = getEnv()
  enforceRateLimit(
    clientKey(request, "assistant"),
    Math.min(env.RATE_LIMIT_REQUESTS_PER_MINUTE, 30)
  )

  const input = await readJson(request, assistantChatSchema)

  try {
    const reply = await chatWithAssistant(input)
    return json(reply)
  } catch (error) {
    if (error instanceof AppError) throw error
    throw new AppError(
      503,
      "UPSTREAM_ERROR",
      "Asystent chwilowo nie może połączyć się z bazą wiedzy."
    )
  }
})
