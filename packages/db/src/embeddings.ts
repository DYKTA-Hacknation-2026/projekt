import { createHash } from "node:crypto"

import {
  EMBEDDING_DIMENSIONS,
  EMBEDDING_MODEL,
  EMBEDDING_PROVIDER,
} from "./constants"

const POLISH_STOPWORDS = new Set([
  "a",
  "aby",
  "albo",
  "ale",
  "bo",
  "by",
  "być",
  "co",
  "czy",
  "dla",
  "do",
  "i",
  "ich",
  "jak",
  "jest",
  "już",
  "lub",
  "ma",
  "mi",
  "na",
  "nie",
  "o",
  "od",
  "oraz",
  "po",
  "pod",
  "przez",
  "się",
  "tak",
  "to",
  "u",
  "w",
  "we",
  "z",
  "za",
  "że",
])

function normalizeText(text: string): string {
  return text
    .toLocaleLowerCase("pl-PL")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9ąćęłńóśźż]+/giu, " ")
    .trim()
}

function tokenize(text: string): string[] {
  return normalizeText(text)
    .split(/\s+/)
    .filter((token) => token.length > 1 && !POLISH_STOPWORDS.has(token))
}

function fnv1a(text: string): number {
  let hash = 0x811c9dc5
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193)
  }
  return hash >>> 0
}

/**
 * Deterministic feature-hashing embedding used by the scaffold.
 *
 * It is a bag-of-words/bigram model with L2 normalisation: similar Polish
 * legal phrases get a high cosine similarity, which makes the pgvector path
 * testable without external providers. It is intentionally not a semantic
 * model and is labelled `local-demo` in `kb.embedding_models`.
 */
export function embedText(text: string): number[] {
  const vector = new Array<number>(EMBEDDING_DIMENSIONS).fill(0)
  const tokens = tokenize(text)

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index] ?? ""
    const unitIndex = fnv1a(token) % EMBEDDING_DIMENSIONS
    vector[unitIndex] = (vector[unitIndex] ?? 0) + 1

    const next = tokens[index + 1]
    if (next) {
      const bigramIndex = fnv1a(`${token}_${next}`) % EMBEDDING_DIMENSIONS
      vector[bigramIndex] = (vector[bigramIndex] ?? 0) + 0.35
    }
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

export function embedTexts(texts: string[]): number[][] {
  return texts.map(embedText)
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error("Embedding dimensions do not match")
  }
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
  if (vector.length !== EMBEDDING_DIMENSIONS) {
    throw new Error(
      `Embedding has ${vector.length} dimensions, expected ${EMBEDDING_DIMENSIONS}`
    )
  }
  return `[${vector.map((value) => Number(value).toFixed(8)).join(",")}]`
}

export function contentHash(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex")
}

export const demoEmbedding = {
  model: EMBEDDING_MODEL,
  provider: EMBEDDING_PROVIDER,
  dimensions: EMBEDDING_DIMENSIONS,
} as const
