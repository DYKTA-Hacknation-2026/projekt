import { uuidSchema } from "@zpr/contracts/common"

import { AppError } from "@/server/http/problem"
import { principalFrom, respondAs } from "@/server/http/principal"
import { apiRoute, json } from "@/server/http/route"
import { getImportSessionView } from "@/server/services/data-import"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

type Context = { params: Promise<{ sessionId: string }> }

export const GET = apiRoute<Context>(async (request, context) => {
  const parsed = uuidSchema.safeParse((await context.params).sessionId)
  if (!parsed.success) {
    throw new AppError(404, "NOT_FOUND", "Nie znaleziono sesji pobierania danych.")
  }
  const principal = principalFrom(request)
  const view = await getImportSessionView({
    sessionId: parsed.data,
    ownerKey: principal.sid,
  })

  return respondAs(
    json({
      simulated: true,
      summary: view.session.summary,
      sources: view.session.sources,
      status: view.session.status,
    }),
    principal
  )
})
