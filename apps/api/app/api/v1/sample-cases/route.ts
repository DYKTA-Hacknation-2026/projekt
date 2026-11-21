import { getEnv } from "@zpr/contracts/env"

import { principalFrom, respondAs } from "@/server/http/principal"
import { enforceDocumentRateLimit } from "@/server/http/documents"
import { apiRoute, json } from "@/server/http/route"
import { getDocumentService } from "@/server/container"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

/** Synthetic sample cases, plus private ZUS cases when the git-ignored manifest exists. */
export const GET = apiRoute(async (request) => {
  const principal = principalFrom(request)
  enforceDocumentRateLimit(request, principal.sid)
  const env = getEnv()
  const features = { aiAssist: env.DOCUMENT_LLM_FALLBACK && env.AI_PROVIDER !== "none", demoMode: env.DOCUMENT_DEMO_MODE }
  return respondAs(json({ sampleCases: await getDocumentService().listSampleCases(), features }), principal)
})
