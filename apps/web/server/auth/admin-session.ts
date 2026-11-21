import { cookies } from "next/headers"

import { getEnv } from "@zpr/contracts/env"

import { ADMIN_COOKIE, verifyAdminToken } from "@zpr/contracts/admin-token"

export interface AdminSession {
  authenticated: boolean
  gateEnabled: boolean
  mode: "demo" | "authenticated" | "anonymous"
}

export async function getAdminSession(): Promise<AdminSession> {
  const env = getEnv()

  if (!env.ADMIN_GATE_ENABLED) {
    return { authenticated: true, gateEnabled: false, mode: "demo" }
  }

  const cookieStore = await cookies()
  const token = cookieStore.get(ADMIN_COOKIE)?.value
  const authenticated = verifyAdminToken(token, env.SESSION_SECRET)

  return {
    authenticated,
    gateEnabled: true,
    mode: authenticated ? "authenticated" : "anonymous",
  }
}
