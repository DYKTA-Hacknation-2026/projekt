import { principalFrom, respondAs } from "@/server/http/principal"
import { enforceDocumentRateLimit, readMultipart } from "@/server/http/documents"
import { apiRoute, json } from "@/server/http/route"
import { getDocumentService } from "@/server/container"
import { MAX_DOCUMENT_BYTES } from "@zpr/contracts/documents"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

/**
 * @deprecated Backwards-compatible alias kept during the UI migration. Use
 * `GET /sample-cases`, `POST /sample-cases/{id}/load`, `POST /documents` and
 * `POST /documents/{id}/extract`. The response keeps the old shape and adds
 * the new one under `extraction`.
 */
export const GET = apiRoute(async (request) => {
  const principal = principalFrom(request)
  enforceDocumentRateLimit(request, principal.sid)
  const sampleCases = await getDocumentService().listSampleCases()
  return respondAs(json({ sampleCases, maxFileBytes: MAX_DOCUMENT_BYTES, deprecated: true }, { headers: { deprecation: "true" } }), principal)
})

export const POST = apiRoute(async (request) => {
  const principal = principalFrom(request)
  enforceDocumentRateLimit(request, principal.sid)
  const form = await readMultipart(request)
  const sampleCase = form.get("sampleCase")
  const analysis = await getDocumentService().legacyAnalyze({
    ownerKey: principal.sid,
    sampleCase: typeof sampleCase === "string" && sampleCase.length > 0 ? sampleCase : undefined,
    file: form.get("file"),
    consent: form.get("consent"),
  })
  return respondAs(json(analysis, { headers: { deprecation: "true" } }), principal)
})
