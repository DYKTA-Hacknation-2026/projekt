import { principalFrom, respondAs } from "@/server/http/principal"
import { documentId, enforceDocumentRateLimit, type IdContext } from "@/server/http/documents"
import { apiRoute, json } from "@/server/http/route"
import { getDocumentService } from "@/server/container"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

/** Document metadata and status (never the content). */
export const GET = apiRoute<IdContext>(async (request, context) => {
  const principal = principalFrom(request)
  enforceDocumentRateLimit(request, principal.sid)
  return respondAs(json(await getDocumentService().get(await documentId(context), principal.sid)), principal)
})

/** Immediate deletion of the file, the extraction and its findings. */
export const DELETE = apiRoute<IdContext>(async (request, context) => {
  const principal = principalFrom(request)
  enforceDocumentRateLimit(request, principal.sid)
  await getDocumentService().remove(await documentId(context), principal.sid)
  return respondAs(new Response(null, { status: 204, headers: { "cache-control": "no-store" } }), principal)
})
