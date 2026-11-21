import { createHash } from "node:crypto"

/**
 * Low-level vector helpers. Embedding providers (the offline hashing model
 * and OpenAI-compatible APIs) live in `@zpr/rag/embeddings`, which is the
 * single place that decides how text becomes a vector.
 */

export function toVectorLiteral(vector: number[]): string {
  for (const value of vector) {
    if (!Number.isFinite(value))
      throw new Error("Embedding contains a non-finite value")
  }
  return `[${vector.map((value) => Number(value).toFixed(8)).join(",")}]`
}

export function contentHash(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex")
}
