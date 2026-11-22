import { principalFrom, respondAs } from "@/server/http/principal"
import { enforceDocumentRateLimit, readMultipart } from "@/server/http/documents"
import { apiRoute, json } from "@/server/http/route"
import { getDocumentService } from "@/server/container"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

/**
 * Upload a PDF (FR-DEMO-02). Requires `consent=DOCUMENT_PROCESSING`. The file
 * is validated (size, MIME, `%PDF-` signature), stored privately and purged
 * after DOCUMENT_TTL_HOURS. Returns the document id and status.
 */
export const POST = apiRoute(async (request) => {
  const principal = principalFrom(request)
  enforceDocumentRateLimit(request, principal.sid)
  const form = await readMultipart(request)
  const document = await getDocumentService().upload({ ownerKey: principal.sid, file: form.get("file"), consent: form.get("consent") })
  return respondAs(json(document, { status: 201 }), principal)
})
