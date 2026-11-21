import { principalFrom, respondAs } from "@/server/http/principal"
import { documentId, enforceDocumentRateLimit, type IdContext } from "@/server/http/documents"
import { apiRoute, json } from "@/server/http/route"
import { getDocumentService } from "@/server/container"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

/** Latest extraction (fields, findings), the facts mapping and the saved checklist. */
export const GET = apiRoute<IdContext>(async (request, context) => {
  const principal = principalFrom(request)
  enforceDocumentRateLimit(request, principal.sid)
  return respondAs(json(await getDocumentService().extraction(await documentId(context), principal.sid)), principal)
})
