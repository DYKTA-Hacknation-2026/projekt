import { getEnv } from "@zpr/contracts/env"

import {
  resolvePrincipal,
  withSession,
  type Principal,
} from "@/server/auth/session"

function secureCookies(): boolean {
  const env = getEnv()
  return env.NODE_ENV === "production" && env.APP_URL.startsWith("https://")
}

export function principalFrom(request: Request): Principal {
  return resolvePrincipal(request, getEnv().SESSION_SECRET)
}

/** Issues the session cookie when the principal is new. */
export function respondAs(response: Response, principal: Principal): Response {
  return withSession(response, principal, getEnv().SESSION_SECRET, secureCookies())
}
