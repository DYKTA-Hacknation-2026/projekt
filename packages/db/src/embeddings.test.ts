import { describe, expect, it } from "vitest"

import {
  cosineSimilarity,
  contentHash,
  embedText,
  embedTexts,
  toVectorLiteral,
} from "./embeddings"
import { EMBEDDING_DIMENSIONS } from "./constants"

describe("offline demo embeddings", () => {
  it("produces deterministic vectors of the configured dimension", () => {
    const first = embedText("urlop macierzyński i zasiłek chorobowy")
    const second = embedText("urlop macierzyński i zasiłek chorobowy")

    expect(first).toHaveLength(EMBEDDING_DIMENSIONS)
    expect(second).toEqual(first)
    expect(Math.sqrt(first.reduce((sum, v) => sum + v * v, 0))).toBeCloseTo(1)
  })

  it("scores related legal phrases higher than unrelated ones", () => {
    const query = embedText("zasiłek macierzyński podstawa")
    const related = embedText("zasiłek macierzyński wynosi 100% podstawy")
    const unrelated = embedText("rejestracja działalności gospodarczej w gminie")

    expect(cosineSimilarity(query, related)).toBeGreaterThan(
      cosineSimilarity(query, unrelated)
    )
    expect(cosineSimilarity(query, query)).toBeCloseTo(1)
  })

  it("returns a unit vector for empty or stopword-only text", () => {
    const vector = embedText("i w z do na")

    expect(vector).toHaveLength(EMBEDDING_DIMENSIONS)
    expect(vector[0]).toBe(1)
  })

  it("rejects mismatched lengths when comparing vectors", () => {
    expect(() => cosineSimilarity([1, 2], [1, 2, 3])).toThrow(
      /dimensions do not match/i
    )
  })

  it("serialises pgvector literals with the configured dimension", () => {
    const literal = toVectorLiteral(embedText("zasiłek rodzinny"))

    expect(literal.startsWith("[")).toBe(true)
    expect(literal.endsWith("]")).toBe(true)
    expect(literal.split(",")).toHaveLength(EMBEDDING_DIMENSIONS)
    expect(() => toVectorLiteral([1, 2, 3])).toThrow(/expected 1024/)
  })

  it("embeds batches in order and hashes content stably", () => {
    const texts = ["pierwszy dokument", "drugi dokument"]
    const vectors = embedTexts(texts)

    expect(vectors).toHaveLength(2)
    expect(vectors[0]).toEqual(embedText(texts[0] ?? ""))
    expect(contentHash("treść")).toBe(contentHash("treść"))
    expect(contentHash("treść")).not.toBe(contentHash("treść "))
  })
})
