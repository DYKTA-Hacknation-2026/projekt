import { requireWebService } from "@/server/http/internal"
import { principalFrom } from "@/server/http/principal"
import { apiRoute, json } from "@/server/http/route"
import { getLatestImportForUser } from "@/server/services/data-import"

export const GET = apiRoute(async (request) => {
  requireWebService(request)
  const { userId } = principalFrom(request)
  return json(userId ? await getLatestImportForUser(userId) : null)
})
