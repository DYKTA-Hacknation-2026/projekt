import { assessmentInputSchema } from "@zpr/contracts/engine"

import { apiRoute, json, readJson } from "@/server/http/route"
import { clientKey, enforceRateLimit } from "@/server/http/rate-limit"
import { engineService } from "@/server/services/engine"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

/** Benefit periods and dated deadlines for both parents. */
export const POST = apiRoute(async (request) => {
  enforceRateLimit(clientKey(request, "engine"), 60)
  const input = await readJson(request, assessmentInputSchema)
  return json(engineService.timeline(input))
})
