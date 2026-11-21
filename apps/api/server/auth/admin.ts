import { cookies } from "next/headers"

import { ADMIN_COOKIE, verifyAdminToken } from "@zpr/contracts/admin-token"
import { getEnv } from "@zpr/contracts/env"
import { AppError } from "@zpr/contracts/problem"

/** The same admin gate as `/internal/admin`; disabled only in demo mode. */
export async function requireAdmin(): Promise<void> {
  const env = getEnv()
  if (!env.ADMIN_GATE_ENABLED) return

  const token = (await cookies()).get(ADMIN_COOKIE)?.value
  if (!verifyAdminToken(token, env.SESSION_SECRET)) {
    throw new AppError(401, "UNAUTHORIZED", "Wymagana sesja administratora.")
  }
}
