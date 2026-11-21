import { createHmac, timingSafeEqual } from "node:crypto"

export const ADMIN_COOKIE = "zpr_admin"
const TOKEN_TTL_MS = 8 * 60 * 60 * 1000

function sign(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("hex")
}

export function createAdminToken(secret: string): string {
  const expires = Date.now() + TOKEN_TTL_MS
  return `${expires}.${sign(String(expires), secret)}`
}

export function verifyAdminToken(
  token: string | undefined,
  secret: string
): boolean {
  if (!token) return false
  const [expires, signature] = token.split(".")
  if (!expires || !signature) return false

  const expiresNumber = Number(expires)
  if (!Number.isFinite(expiresNumber) || expiresNumber < Date.now()) {
    return false
  }

  const expected = sign(expires, secret)
  const actualBuffer = Buffer.from(signature, "hex")
  const expectedBuffer = Buffer.from(expected, "hex")

  if (actualBuffer.length !== expectedBuffer.length) return false
  return timingSafeEqual(actualBuffer, expectedBuffer)
}
