import { createHmac, randomUUID, timingSafeEqual } from "node:crypto"

/**
 * Signed session cookie for guests and onboarded users.
 *
 * `sid` is a random id that owns conversations. `userId` is bound only by the
 * server (onboarding), never taken from a request body, so a client cannot
 * claim another user's profile. The value is HMAC-signed with SESSION_SECRET.
 */

export const SESSION_COOKIE = "zpr_sid"
const TTL_MS = 30 * 24 * 60 * 60 * 1000
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export interface Principal {
  sid: string
  userId: string | null
  /** The cookie must be (re)issued on the response. */
  issue: boolean
}

function sign(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url")
}

export function encodeSession(
  value: { sid: string; userId: string | null },
  secret: string,
  now = Date.now()
): string {
  const payload = `${value.sid}.${value.userId ?? "-"}.${now + TTL_MS}`
  return `${payload}.${sign(payload, secret)}`
}

export function decodeSession(
  token: string | undefined,
  secret: string,
  now = Date.now()
): { sid: string; userId: string | null } | null {
  if (!token) return null
  const parts = token.split(".")
  if (parts.length !== 4) return null
  const [sid, userId, expires, signature] = parts as [string, string, string, string]
  if (!UUID.test(sid) || (userId !== "-" && !UUID.test(userId))) return null
  const expiresAt = Number(expires)
  if (!Number.isFinite(expiresAt) || expiresAt < now) return null

  const expected = Buffer.from(sign(`${sid}.${userId}.${expires}`, secret))
  const actual = Buffer.from(signature)
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
    return null
  }
  return { sid, userId: userId === "-" ? null : userId }
}

function readCookie(request: Request, name: string): string | undefined {
  const header = request.headers.get("cookie")
  if (!header) return undefined
  for (const part of header.split(";")) {
    const [key, ...rest] = part.trim().split("=")
    if (key === name) return decodeURIComponent(rest.join("="))
  }
  return undefined
}

export function resolvePrincipal(request: Request, secret: string): Principal {
  const session = decodeSession(readCookie(request, SESSION_COOKIE), secret)
  if (session) return { ...session, issue: false }
  return { sid: randomUUID(), userId: null, issue: true }
}

export function sessionCookieHeader(
  value: { sid: string; userId: string | null },
  secret: string,
  secure: boolean
): string {
  return [
    `${SESSION_COOKIE}=${encodeURIComponent(encodeSession(value, secret))}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${Math.floor(TTL_MS / 1000)}`,
    ...(secure ? ["Secure"] : []),
  ].join("; ")
}

export function withSession(
  response: Response,
  principal: Principal,
  secret: string,
  secure: boolean
): Response {
  if (principal.issue) {
    response.headers.append(
      "set-cookie",
      sessionCookieHeader(principal, secret, secure)
    )
  }
  return response
}
