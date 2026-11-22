import { uuidSchema } from "@zpr/contracts/common"
import { previewImportRequestSchema } from "@zpr/contracts/data-import"

import { AppError } from "@zpr/contracts/problem"
import { principalFrom, respondAs } from "@/server/http/principal"
import { apiRoute, json, readJson } from "@/server/http/route"
import { previewImport } from "@/server/services/data-import"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

type Context = { params: Promise<{ sessionId: string }> }

export const POST = apiRoute<Context>(async (request, context) => {
  const parsed = uuidSchema.safeParse((await context.params).sessionId)
  if (!parsed.success) {
    throw new AppError(
      404,
      "NOT_FOUND",
      "Nie znaleziono sesji pobierania danych."
    )
  }
  const input = await readJson(request, previewImportRequestSchema)
  const principal = principalFrom(request)
  const preview = await previewImport({
    sessionId: parsed.data,
    ownerKey: principal.sid,
    data: input.data,
  })

  return respondAs(json(preview), principal)
})
