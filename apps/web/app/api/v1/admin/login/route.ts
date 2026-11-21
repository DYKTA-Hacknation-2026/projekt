import { getEnv } from "@zpr/contracts/env"
import { z } from "zod"

import {
  ADMIN_COOKIE,
  createAdminToken,
} from "@/server/auth/admin-token"
import { AppError } from "@/server/http/problem"
import { clientKey, enforceRateLimit } from "@/server/http/rate-limit"
import { apiRoute, json, readJson } from "@/server/http/route"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const loginSchema = z.object({
  email: z.email("Podaj poprawny adres e-mail"),
  password: z.string().min(1, "Podaj hasło"),
})

export const POST = apiRoute(async (request) => {
  const env = getEnv()
  enforceRateLimit(clientKey(request, "admin-login"), 10)

  const input = await readJson(request, loginSchema)
  const validEmail =
    input.email.trim().toLowerCase() === env.ADMIN_EMAIL.toLowerCase()
  const validPassword = input.password === env.ADMIN_DEMO_PASSWORD

  if (!validEmail || !validPassword) {
    throw new AppError(
      401,
      "UNAUTHORIZED",
      "Nieprawidłowy e-mail lub hasło administratora."
    )
  }

  const response = json({
    authenticated: true,
    gateEnabled: env.ADMIN_GATE_ENABLED,
    redirect: "/admin",
  })

  const token = createAdminToken(env.SESSION_SECRET)
  const maxAge = 8 * 60 * 60
  response.headers.append(
    "set-cookie",
    `${ADMIN_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${
      env.NODE_ENV === "production" ? "; Secure" : ""
    }`
  )

  return response
})
