import { uuidSchema } from "@zpr/contracts/common"
import { dataSourceIdSchema } from "@zpr/contracts/data-import"

import { AppError } from "@zpr/contracts/problem"
import { principalFrom, respondAs } from "@/server/http/principal"
import { clientKey, enforceRateLimit } from "@/server/http/rate-limit"
import { apiRoute, json } from "@/server/http/route"
import { fetchImportSource } from "@/server/services/data-import"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

type Context = {
  params: Promise<{ sessionId: string; sourceId: string }>
}

export const POST = apiRoute<Context>(async (request, context) => {
  enforceRateLimit(clientKey(request, "data-import-source"), 40)
  const params = await context.params
  const sessionId = uuidSchema.safeParse(params.sessionId)
  const sourceId = dataSourceIdSchema.safeParse(params.sourceId)
  if (!sessionId.success || !sourceId.success) {
    throw new AppError(404, "NOT_FOUND", "Nie znaleziono źródła danych.")
  }

  const principal = principalFrom(request)
  const response = await fetchImportSource({
    sessionId: sessionId.data,
    ownerKey: principal.sid,
    sourceId: sourceId.data,
  })

  return respondAs(json(response), principal)
})
