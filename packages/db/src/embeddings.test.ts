import { describe, expect, it } from "vitest"

import { contentHash, toVectorLiteral } from "./embeddings"

describe("vector helpers", () => {
  it("serialises pgvector literals", () => {
    expect(toVectorLiteral([0.5, -1, 0])).toBe(
      "[0.50000000,-1.00000000,0.00000000]"
    )
    expect(() => toVectorLiteral([Number.NaN])).toThrow(/non-finite/)
  })

  it("hashes content stably", () => {
    expect(contentHash("treść")).toBe(contentHash("treść"))
    expect(contentHash("treść")).not.toBe(contentHash("treść "))
    expect(contentHash("treść")).toHaveLength(64)
  })
})
