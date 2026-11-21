import { getEnv } from "@zpr/contracts/env"
import {
  MOBYWATEL_SCOPE_KEYS,
  mobywatelAuthorizeSchema,
} from "@zpr/contracts/mobywatel"

import {
  MOBYWATEL_COOKIE,
  MOBYWATEL_SESSION_MAX_AGE_SECONDS,
  createMobywatelToken,
} from "@/server/auth/mobywatel-token"
import { AppError } from "@/server/http/problem"
import { clientKey, enforceRateLimit } from "@/server/http/rate-limit"
import { apiRoute, json, readJson } from "@/server/http/route"
import {
  MOBYWATEL_DISCLAIMER,
  findMobywatelPersona,
} from "@/server/sim/mobywatel"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export const POST = apiRoute(async (request) => {
  const env = getEnv()
  enforceRateLimit(clientKey(request, "mobywatel-authorize"), 20)

  const input = await readJson(request, mobywatelAuthorizeSchema)
  const persona = findMobywatelPersona(input.personaId)
  if (!persona) {
    throw new AppError(
      404,
      "NOT_FOUND",
      "Nie znaleziono wybranego profilu testowego."
    )
  }

  const token = createMobywatelToken(persona.id, env.SESSION_SECRET)
  const response = json({
    simulated: true,
    provider: "mObywatel",
    disclaimer: MOBYWATEL_DISCLAIMER,
    scope: MOBYWATEL_SCOPE_KEYS,
    persona,
    redirect: "/start",
  })

  response.headers.append(
    "set-cookie",
    `${MOBYWATEL_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${MOBYWATEL_SESSION_MAX_AGE_SECONDS}${
      env.NODE_ENV === "production" ? "; Secure" : ""
    }`
  )

  return response
})
