import { confirmFieldsRequestSchema } from "@zpr/contracts/documents"

import { principalFrom, respondAs } from "@/server/http/principal"
import { documentId, enforceDocumentRateLimit, type IdContext } from "@/server/http/documents"
import { apiRoute, json, readJson } from "@/server/http/route"
import { getDocumentService } from "@/server/container"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

/**
 * The user confirms or corrects fields (AD-08). When every required field is
 * confirmed and valid, the facts go to the engine (eligibility, amounts,
 * documents, timeline) and the checklist is stored.
 */
export const PUT = apiRoute<IdContext>(async (request, context) => {
  const principal = principalFrom(request)
  enforceDocumentRateLimit(request, principal.sid)
  const body = await readJson(request, confirmFieldsRequestSchema)
  return respondAs(json(await getDocumentService().confirm(await documentId(context), principal.sid, body)), principal)
})
