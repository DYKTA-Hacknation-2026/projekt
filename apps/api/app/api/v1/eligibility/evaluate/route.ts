import { assessmentInputSchema } from "@zpr/contracts/engine"

import { apiRoute, json, readJson } from "@/server/http/route"
import { clientKey, enforceRateLimit } from "@/server/http/rate-limit"
import { engineService } from "@/server/services/engine"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

/** Eligibility evaluation: determinations per parent and benefit, missing evidence, risks. */
export const POST = apiRoute(async (request) => {
  enforceRateLimit(clientKey(request, "engine"), 60)
  const input = await readJson(request, assessmentInputSchema)
  return json(engineService.eligibility(input))
})
