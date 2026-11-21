import { getEnv } from "@zpr/contracts/env"

import { MOBYWATEL_COOKIE } from "@/server/auth/mobywatel-token"
import { apiRoute, json } from "@/server/http/route"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export const POST = apiRoute(async () => {
  const response = json({ simulated: true, loggedOut: true })
  const secure = getEnv().NODE_ENV === "production" ? "; Secure" : ""
  response.headers.append(
    "set-cookie",
    `${MOBYWATEL_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`
  )
  return response
})
