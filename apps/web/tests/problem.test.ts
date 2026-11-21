import { describe, expect, it } from "vitest"
import { z } from "zod"

import { AppError, problemResponse } from "@/server/http/problem"

describe("problem+json", () => {
  it("maps AppError to a stable problem document", async () => {
    const response = problemResponse(
      new AppError(404, "NOT_FOUND", "Brak sprawy"),
      "req-1"
    )

    expect(response.status).toBe(404)
    expect(response.headers.get("content-type")).toContain(
      "application/problem+json"
    )
    expect(response.headers.get("x-request-id")).toBe("req-1")

    const body = (await response.json()) as Record<string, unknown>
    expect(body.code).toBe("NOT_FOUND")
    expect(body.status).toBe(404)
    expect(body.detail).toBe("Brak sprawy")
  })

  it("returns validation issues for Zod errors", async () => {
    const schema = z.object({ email: z.email() })
    const parsed = schema.safeParse({ email: "nie-e-mail" })
    if (parsed.success) throw new Error("Expected a validation error")

    const response = problemResponse(parsed.error, "req-2")
    expect(response.status).toBe(422)

    const body = (await response.json()) as {
      code: string
      issues: Array<{ path: string }>
    }
    expect(body.code).toBe("VALIDATION_ERROR")
    expect(body.issues[0]?.path).toBe("email")
  })
})
