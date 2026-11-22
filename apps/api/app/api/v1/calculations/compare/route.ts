import { comparisonRequestSchema } from "@zpr/contracts/calculator"

import { apiRoute, json, readJson } from "@/server/http/route"
import { runComparison } from "@/server/services/calculations"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

/** Parental-leave variants for the same household facts, computed by the calculator adapter. */
export const POST = apiRoute(async (request) => {
  const input = await readJson(request, comparisonRequestSchema)
  return json(await runComparison(input))
})
