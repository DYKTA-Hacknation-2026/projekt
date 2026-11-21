import { principalFrom, respondAs } from "@/server/http/principal"
import { documentId, enforceDocumentRateLimit, type IdContext } from "@/server/http/documents"
import { apiRoute } from "@/server/http/route"
import { getDocumentService } from "@/server/container"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

/**
 * The owner's own PDF for the side-by-side preview. Session-bound, never
 * cached, nosniff, frameable only by our own origin (a CSP `sandbox` would
 * stop browsers' built-in PDF viewers), never a public URL.
 */
export const GET = apiRoute<IdContext>(async (request, context) => {
  const principal = principalFrom(request)
  enforceDocumentRateLimit(request, principal.sid)
  const bytes = await getDocumentService().file(await documentId(context), principal.sid)
  const body = new Uint8Array(bytes).buffer as ArrayBuffer
  return respondAs(
    new Response(body, {
      status: 200,
      headers: {
        "content-type": "application/pdf",
        "content-length": String(bytes.length),
        "content-disposition": 'inline; filename="dokument.pdf"',
        "cache-control": "private, no-store",
        "x-content-type-options": "nosniff",
        "content-security-policy": "frame-ancestors 'self'",
        "cross-origin-resource-policy": "same-origin",
      },
    }),
    principal
  )
})
