import { describe, expect, it } from "vitest"

import { mobywatelAuthorizeSchema } from "@zpr/contracts/mobywatel"

import {
  createMobywatelToken,
  verifyMobywatelToken,
} from "@/server/auth/mobywatel-token"
import {
  findMobywatelPersona,
  listMobywatelPersonas,
} from "@/server/sim/mobywatel"

const secret = "test-secret-with-at-least-32-characters"

describe("mObywatel simulation", () => {
  it("exposes synthetic personas without PESEL", () => {
    const personas = listMobywatelPersonas()
    expect(personas.length).toBeGreaterThanOrEqual(3)
    expect(findMobywatelPersona("anna-kowalska")?.firstName).toBe("Anna")
    expect(findMobywatelPersona("missing")).toBeNull()
    expect(JSON.stringify(personas)).not.toContain("PESEL")
  })

  it("round-trips a signed short-lived token", () => {
    const token = createMobywatelToken("anna-kowalska", secret, 60_000)
    const payload = verifyMobywatelToken(token, secret)

    expect(payload?.personaId).toBe("anna-kowalska")
    expect(payload?.expiresAt).toBeGreaterThan(Date.now())
  })

  it("rejects expired, tampered and wrongly signed tokens", () => {
    const expired = createMobywatelToken("anna-kowalska", secret, -1)
    expect(verifyMobywatelToken(expired, secret)).toBeNull()

    const token = createMobywatelToken("anna-kowalska", secret, 60_000)
    expect(verifyMobywatelToken(`${token}x`, secret)).toBeNull()
    expect(verifyMobywatelToken(token, "another-secret-with-32-characters!!")).toBeNull()
    expect(verifyMobywatelToken(undefined, secret)).toBeNull()
  })

  it("requires consent and a PIN when the PIN method is selected", () => {
    const base = {
      personaId: "anna-kowalska",
      method: "PIN" as const,
      consent: true as const,
    }

    expect(mobywatelAuthorizeSchema.safeParse(base).success).toBe(false)
    expect(
      mobywatelAuthorizeSchema.safeParse({ ...base, pin: "1234" }).success
    ).toBe(true)
    expect(
      mobywatelAuthorizeSchema.safeParse({
        ...base,
        pin: "12",
      }).success
    ).toBe(false)
    expect(
      mobywatelAuthorizeSchema.safeParse({
        ...base,
        consent: false,
        pin: "1234",
      }).success
    ).toBe(false)
    expect(
      mobywatelAuthorizeSchema.safeParse({
        personaId: "anna-kowalska",
        method: "BIOMETRY",
        consent: true,
      }).success
    ).toBe(true)
  })
})
