import { describe, expect, it } from "vitest"

import { parseEnv } from "./env"

const strongSecret = "unit-test-session-secret-that-is-long-enough"

describe("parseEnv", () => {
  it("supplies development defaults for an empty environment", () => {
    const env = parseEnv({})

    expect(env.NODE_ENV).toBe("development")
    expect(env.DATABASE_URL).toContain(":5435/zpr")
    expect(env.EMBEDDING_MODEL).toBe("zpr-hash-1024")
    expect(env.EMBEDDING_DIMENSIONS).toBe(1024)
    expect(env.ADMIN_GATE_ENABLED).toBe(false)
    expect(env.DATABASE_SSL).toBe(false)
  })

  it("parses boolean-like environment strings", () => {
    expect(parseEnv({ DATABASE_SSL: "true" }).DATABASE_SSL).toBe(true)
    expect(parseEnv({ DATABASE_SSL: "1" }).DATABASE_SSL).toBe(true)
    expect(parseEnv({ ADMIN_GATE_ENABLED: "yes" }).ADMIN_GATE_ENABLED).toBe(true)
    expect(parseEnv({ ADMIN_GATE_ENABLED: "off" }).ADMIN_GATE_ENABLED).toBe(false)
  })

  it("rejects the development session secret in production", () => {
    expect(() =>
      parseEnv({ NODE_ENV: "production" })
    ).toThrow(/SESSION_SECRET/)
  })

  it("accepts a strong production secret", () => {
    const env = parseEnv({
      NODE_ENV: "production",
      SESSION_SECRET: strongSecret,
      APP_URL: "https://example.org",
    })

    expect(env.NODE_ENV).toBe("production")
    expect(env.SESSION_SECRET).toBe(strongSecret)
  })

  it("rejects invalid numeric configuration with a readable message", () => {
    expect(() => parseEnv({ DATABASE_POOL_MAX: "0" })).toThrow(
      /Nieprawidłowa konfiguracja środowiska/
    )
    expect(() => parseEnv({ EMBEDDING_DIMENSIONS: "12" })).toThrow(
      /EMBEDDING_DIMENSIONS/
    )
  })
})
