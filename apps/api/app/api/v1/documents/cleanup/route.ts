import { requireWebService } from "@/server/http/internal"
import { apiRoute, json } from "@/server/http/route"
import { getDocumentService } from "@/server/container"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

/** TTL purge for a cron job (service token). Uploads also trigger it. */
export const POST = apiRoute(async (request) => {
  requireWebService(request)
  return json({ deleted: await getDocumentService().cleanupExpired() })
})
