import { knowledgeSearchSchema } from "@zpr/contracts/knowledge"

import { apiRoute, json, parseSearchParams } from "@/server/http/route"
import { searchKnowledge } from "@/server/services/knowledge"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export const GET = apiRoute(async (request) => {
  const input = parseSearchParams(request, knowledgeSearchSchema)
  const data = await searchKnowledge({
    query: input.q,
    limit: input.limit,
    asOf: input.asOf,
    sources: input.source,
    sourceTypes: input.sourceType,
    benefitTags: input.tag,
    minRelevance: input.minRelevance,
  })

  return json({
    ...data,
    simulated: true,
    count: data.results.length,
  })
})
