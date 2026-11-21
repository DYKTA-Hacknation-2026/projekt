import { principalFrom, respondAs } from "@/server/http/principal"
import { apiRoute, json } from "@/server/http/route"
import { getChatModel, loadProfileFor } from "@/server/services/assistant"
import { getEnv } from "@zpr/contracts/env"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

/**
 * What the chat page may offer: whether a confirmed profile can be used
 * (signed-in, consenting user) and which mode answers. Returns no profile data.
 */
export const GET = apiRoute(async (request) => {
  const principal = principalFrom(request)
  const access = await loadProfileFor(principal, true)
  const model = getChatModel(getEnv())
  return respondAs(
    json({
      profile: { status: access.status, available: access.status === "AVAILABLE" },
      mode: model ? "llm" : "rules",
      model: model ? `${model.provider}:${model.modelId}` : "zpr-rules-1",
      simulated: true,
    }),
    principal
  )
})
