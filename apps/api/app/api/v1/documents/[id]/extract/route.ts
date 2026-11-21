import { extractRequestSchema } from "@zpr/contracts/documents"

import { principalFrom, respondAs } from "@/server/http/principal"
import { documentId, enforceDocumentRateLimit, type IdContext } from "@/server/http/documents"
import { apiRoute, json } from "@/server/http/route"
import { getDocumentService } from "@/server/container"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

/**
 * Runs the extraction pipeline synchronously with a timeout (demo). The
 * service call is the seam for a background worker later.
 */
export const POST = apiRoute<IdContext>(async (request, context) => {
  const principal = principalFrom(request)
  enforceDocumentRateLimit(request, principal.sid)
  const text = await request.text()
  const body = extractRequestSchema.parse(text.trim() ? JSON.parse(text) : {})
  const extraction = await getDocumentService().extract(await documentId(context), principal.sid, body)
  return respondAs(json(extraction), principal)
})
