import { startImportSchema } from "@zpr/contracts/data-import"

import { getMobywatelSession } from "@/server/auth/mobywatel-session"
import { AppError } from "@/server/http/problem"
import { principalFrom, respondAs } from "@/server/http/principal"
import { clientKey, enforceRateLimit } from "@/server/http/rate-limit"
import { apiRoute, json, readJson } from "@/server/http/route"
import { startImport } from "@/server/services/data-import"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export const POST = apiRoute(async (request) => {
  const mobywatel = await getMobywatelSession()
  if (!mobywatel) {
    throw new AppError(
      401,
      "UNAUTHORIZED",
      "Zaloguj się najpierw przez symulację mObywatel."
    )
  }

  enforceRateLimit(clientKey(request, "data-import-start"), 20)
  const input = await readJson(request, startImportSchema)
  const principal = principalFrom(request)
  const view = await startImport({
    personaId: mobywatel.personaId,
    scopes: input.scopes,
    ownerKey: principal.sid,
  })

  return respondAs(json(view, { status: 201 }), principal)
})
