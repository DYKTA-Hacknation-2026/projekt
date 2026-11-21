import { AppError } from "@zpr/contracts/problem"

import { principalFrom, respondAs } from "@/server/http/principal"
import { enforceDocumentRateLimit } from "@/server/http/documents"
import { apiRoute, json } from "@/server/http/route"
import { getDocumentService } from "@/server/container"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

type Context = { params: Promise<{ id: string }> }

/** Loads a sample case as a document of this session and runs the extraction. */
export const POST = apiRoute<Context>(async (request, context) => {
  const principal = principalFrom(request)
  enforceDocumentRateLimit(request, principal.sid)
  const { id } = await context.params
  if (!/^[a-z0-9-]{1,80}$/.test(id)) throw new AppError(404, "NOT_FOUND", "Nie znaleziono wybranego przykładu.")
  return respondAs(json(await getDocumentService().loadSampleCase(id, principal.sid), { status: 201 }), principal)
})
