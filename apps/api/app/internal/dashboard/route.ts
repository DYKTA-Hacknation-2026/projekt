import { requireWebService } from "@/server/http/internal"
import { apiRoute, json } from "@/server/http/route"
import { getDashboardData } from "@/server/services/dashboard"

export const GET = apiRoute(async (request) => {
  requireWebService(request)
  return json(await getDashboardData())
})
