import { cookies } from "next/headers"

import { ADMIN_COOKIE, verifyAdminToken } from "@zpr/contracts/admin-token"
import { getEnv } from "@zpr/contracts/env"
import { AppError } from "@zpr/contracts/problem"

import { requireWebService } from "@/server/http/internal"
import { apiRoute, json } from "@/server/http/route"
import { getAdminData } from "@/server/services/admin"

export const GET = apiRoute(async (request) => {
  requireWebService(request)
  const env = getEnv()
  const token = (await cookies()).get(ADMIN_COOKIE)?.value
  if (env.ADMIN_GATE_ENABLED && !verifyAdminToken(token, env.SESSION_SECRET)) {
    throw new AppError(401, "UNAUTHORIZED", "Wymagana sesja administratora.")
  }
  return json(await getAdminData())
})
