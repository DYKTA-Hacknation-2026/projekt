import { cookies } from "next/headers"

import { getEnv } from "@zpr/contracts/env"

import { decodeSession, SESSION_COOKIE } from "./session"

/**
 * Reads the signed browser session on the server so pages can show data bound
 * by onboarding. Returns null for guests; never trusts a user id from a query.
 */
export async function getCurrentUserId(): Promise<string | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE)?.value
  const session = decodeSession(token, getEnv().SESSION_SECRET)
  return session?.userId ?? null
}
