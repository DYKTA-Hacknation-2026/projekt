import { createHash } from "node:crypto"

export type DistanceMetric = "COSINE" | "L2" | "INNER_PRODUCT"

/**
 * Everything that determines the vector space. Two configurations are
 * compatible only when their fingerprints are equal.
 */
export interface EmbeddingModelConfig {
  provider: string
  model: string
  dimensions: number
  distanceMetric: DistanceMetric
  /** Prepended to texts at index time (e.g. "passage: " for e5 models). */
  documentPrefix: string
  /** Prepended to the query at search time (e.g. "query: "). */
  queryPrefix: string
  /** Whether vectors are L2-normalised before storage and search. */
  normalize: boolean
  /** Bumped when a provider's algorithm changes (local models). */
  revision: number
}

export interface EmbeddingProvider {
  readonly config: EmbeddingModelConfig
  /** Embeds texts for indexing; one vector per input, same order. */
  embedDocument(texts: string[]): Promise<number[][]>
  /** Embeds a search query. Must be used with the same config as indexing. */
  embedQuery(text: string): Promise<number[]>
}

export function configFingerprint(config: EmbeddingModelConfig): string {
  const canonical = JSON.stringify({
    provider: config.provider,
    model: config.model,
    dimensions: config.dimensions,
    distanceMetric: config.distanceMetric,
    documentPrefix: config.documentPrefix,
    queryPrefix: config.queryPrefix,
    normalize: config.normalize,
    revision: config.revision,
  })
  return createHash("sha256").update(canonical).digest("hex")
}

/** Stable name used in `kb.embedding_models.name`. */
export function modelKey(config: EmbeddingModelConfig): string {
  return `${config.provider}:${config.model}:${config.dimensions}`
}

export class EmbeddingCompatibilityError extends Error {
  override readonly name = "EmbeddingCompatibilityError"
}

/**
 * Throws when a stored model record and the runtime provider would produce
 * vectors from different spaces (different model, dimensions or prefixes).
 */
export function assertCompatible(
  stored: {
    name: string
    dimensions: number
    configFingerprint: string | null
  },
  runtime: EmbeddingModelConfig
): void {
  if (stored.dimensions !== runtime.dimensions) {
    throw new EmbeddingCompatibilityError(
      `Embedding dimensions mismatch for ${stored.name}: index has ${stored.dimensions}, provider produces ${runtime.dimensions}. Re-embed the knowledge base (pnpm kb:reembed).`
    )
  }
  const fingerprint = configFingerprint(runtime)
  if (stored.configFingerprint && stored.configFingerprint !== fingerprint) {
    throw new EmbeddingCompatibilityError(
      `Embedding configuration for ${stored.name} changed (prefixes, normalisation or revision). Index and query must use the same configuration — re-embed the knowledge base.`
    )
  }
}

export function assertVector(vector: number[], dimensions: number): number[] {
  if (vector.length !== dimensions) {
    throw new EmbeddingCompatibilityError(
      `Embedding has ${vector.length} dimensions, expected ${dimensions}`
    )
  }
  for (const value of vector) {
    if (!Number.isFinite(value)) {
      throw new EmbeddingCompatibilityError(
        "Embedding contains a non-finite value"
      )
    }
  }
  return vector
}

export function l2Normalize(vector: number[]): number[] {
  const magnitude = Math.sqrt(
    vector.reduce((sum, value) => sum + value * value, 0)
  )
  if (magnitude === 0) return vector
  return vector.map((value) => value / magnitude)
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length)
    throw new EmbeddingCompatibilityError("Embedding dimensions do not match")
  let dot = 0
  let normA = 0
  let normB = 0
  for (let index = 0; index < a.length; index += 1) {
    const av = a[index] ?? 0
    const bv = b[index] ?? 0
    dot += av * bv
    normA += av * av
    normB += bv * bv
  }
  if (normA === 0 || normB === 0) return 0
  return dot / (Math.sqrt(normA) * Math.sqrt(normB))
}

export function toVectorLiteral(vector: number[]): string {
  return `[${vector.map((value) => Number(value).toFixed(8)).join(",")}]`
}
