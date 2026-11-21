import { requireWebService } from "@/server/http/internal"
import { apiRoute, json } from "@/server/http/route"
import { getActiveRuleSet } from "@/server/services/rule-set"

export const GET = apiRoute(async (request) => {
  requireWebService(request)
  return json(await getActiveRuleSet())
})
