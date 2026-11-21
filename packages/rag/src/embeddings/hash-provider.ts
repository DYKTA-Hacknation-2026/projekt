import { isStopword, polishStem, searchTokens } from "../text/search-text"
import type { EmbeddingModelConfig, EmbeddingProvider } from "./provider"

function fnv1a(text: string): number {
  let hash = 0x811c9dc5
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193)
  }
  return hash >>> 0
}

/**
 * Deterministic, offline feature-hashing embedding (`local-demo`).
 *
 * Stemmed unigrams and bigrams are hashed into a signed vector and
 * L2-normalised. It is not a semantic model — it only makes the pgvector
 * path, tests and the demo reproducible without an API key. Production uses
 * an OpenAI-compatible multilingual model through the same port.
 */
export class HashEmbeddingProvider implements EmbeddingProvider {
  readonly config: EmbeddingModelConfig

  constructor(
    options: {
      model?: string
      dimensions?: number
      documentPrefix?: string
      queryPrefix?: string
    } = {}
  ) {
    const dimensions = options.dimensions ?? 1024
    this.config = {
      provider: "local-demo",
      model: options.model ?? `zpr-hash-${dimensions}`,
      dimensions,
      distanceMetric: "COSINE",
      documentPrefix: options.documentPrefix ?? "",
      queryPrefix: options.queryPrefix ?? "",
      normalize: true,
      revision: 2,
    }
  }

  embed(text: string): number[] {
    const { dimensions } = this.config
    const vector = new Array<number>(dimensions).fill(0)
    const tokens = searchTokens(text)
      .filter((token) => !isStopword(token))
      .map(polishStem)

    const add = (feature: string, weight: number) => {
      const hash = fnv1a(feature)
      const index = hash % dimensions
      const sign = hash >>> 31 === 1 ? -1 : 1
      vector[index] = (vector[index] ?? 0) + sign * weight
    }

    for (let index = 0; index < tokens.length; index += 1) {
      const token = tokens[index] ?? ""
      add(token, 1)
      const next = tokens[index + 1]
      if (next) add(`${token}_${next}`, 0.5)
    }

    const magnitude = Math.sqrt(
      vector.reduce((sum, value) => sum + value * value, 0)
    )
    if (magnitude === 0) {
      vector[0] = 1
      return vector
    }
    return vector.map((value) => value / magnitude)
  }

  async embedDocument(texts: string[]): Promise<number[][]> {
    return texts.map((text) =>
      this.embed(`${this.config.documentPrefix}${text}`)
    )
  }

  async embedQuery(text: string): Promise<number[]> {
    return this.embed(`${this.config.queryPrefix}${text}`)
  }
}
