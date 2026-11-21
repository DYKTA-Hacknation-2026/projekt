import { getEnv } from "@zpr/contracts/env"

import { ADMIN_COOKIE } from "@/server/auth/admin-token"
import { apiRoute, json } from "@/server/http/route"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export const POST = apiRoute(async () => {
  const env = getEnv()
  const response = json({ authenticated: false })

  response.headers.append(
    "set-cookie",
    `${ADMIN_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${
      env.NODE_ENV === "production" ? "; Secure" : ""
    }`
  )

  return response
})
