import { createHmac, timingSafeEqual } from "node:crypto"

export const MOBYWATEL_COOKIE = "zpr_mobywatel"
export const MOBYWATEL_SESSION_TTL_MS = 10 * 60 * 1000
export const MOBYWATEL_SESSION_MAX_AGE_SECONDS = MOBYWATEL_SESSION_TTL_MS / 1000

export interface MobywatelTokenPayload {
  personaId: string
  issuedAt: number
  expiresAt: number
}

function sign(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("hex")
}

export function createMobywatelToken(
  personaId: string,
  secret: string,
  ttlMs = MOBYWATEL_SESSION_TTL_MS
): string {
  const issuedAt = Date.now()
  const expiresAt = issuedAt + ttlMs
  const payload = `${personaId}.${issuedAt}.${expiresAt}`
  return `${payload}.${sign(payload, secret)}`
}

export function verifyMobywatelToken(
  token: string | undefined,
  secret: string
): MobywatelTokenPayload | null {
  if (!token) return null

  const parts = token.split(".")
  if (parts.length !== 4) return null

  const [personaId, issuedAtRaw, expiresAtRaw, signature] = parts
  if (!personaId || !issuedAtRaw || !expiresAtRaw || !signature) return null
  if (!/^[a-f0-9]{64}$/i.test(signature)) return null

  const issuedAt = Number(issuedAtRaw)
  const expiresAt = Number(expiresAtRaw)
  if (
    !Number.isFinite(issuedAt) ||
    !Number.isFinite(expiresAt) ||
    expiresAt < Date.now()
  ) {
    return null
  }

  const expected = sign(`${personaId}.${issuedAtRaw}.${expiresAtRaw}`, secret)
  const actualBuffer = Buffer.from(signature, "hex")
  const expectedBuffer = Buffer.from(expected, "hex")
  if (actualBuffer.length !== expectedBuffer.length) return null
  if (!timingSafeEqual(actualBuffer, expectedBuffer)) return null

  return { personaId, issuedAt, expiresAt }
}
