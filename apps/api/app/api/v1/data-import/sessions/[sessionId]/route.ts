import { uuidSchema } from "@zpr/contracts/common"

import { AppError } from "@zpr/contracts/problem"
import { principalFrom, respondAs } from "@/server/http/principal"
import { apiRoute, json } from "@/server/http/route"
import { getImportSessionView } from "@/server/services/data-import"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

type Context = { params: Promise<{ sessionId: string }> }

async function sessionId(context: Context): Promise<string> {
  const parsed = uuidSchema.safeParse((await context.params).sessionId)
  if (!parsed.success) {
    throw new AppError(
      404,
      "NOT_FOUND",
      "Nie znaleziono sesji pobierania danych."
    )
  }
  return parsed.data
}

export const GET = apiRoute<Context>(async (request, context) => {
  const principal = principalFrom(request)
  const view = await getImportSessionView({
    sessionId: await sessionId(context),
    ownerKey: principal.sid,
  })
  return respondAs(json(view), principal)
})
