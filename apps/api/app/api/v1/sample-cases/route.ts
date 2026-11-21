import { getEnv } from "@zpr/contracts/env"

import { enforceDocumentRateLimit } from "@/server/http/documents"
import { apiRoute, json } from "@/server/http/route"
import { getDocumentService } from "@/server/container"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

/**
 * Synthetic sample cases, plus private ZUS cases when the git-ignored manifest
 * exists. Session-free on purpose: issuing a session cookie here could race
 * with the first upload of a new visitor and orphan that document.
 */
export const GET = apiRoute(async (request) => {
  enforceDocumentRateLimit(request)
  const env = getEnv()
  const features = { aiAssist: env.DOCUMENT_LLM_FALLBACK && env.AI_PROVIDER !== "none", demoMode: env.DOCUMENT_DEMO_MODE }
  return json({ sampleCases: await getDocumentService().listSampleCases(), features })
})
