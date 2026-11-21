import { z } from "zod"

import { DEFAULT_CHUNKING } from "./chunking/chunker"

const number = (fallback: number) => z.coerce.number().default(fallback)

/**
 * RAG tuning knobs. Embedding provider settings live in the shared env
 * schema (`@zpr/contracts/env`) because ingestion and retrieval must share
 * them; these only change chunking and ranking.
 */
export const ragConfigSchema = z.object({
  KB_CHUNK_MAX_TOKENS: number(DEFAULT_CHUNKING.maxTokens).pipe(
    z.number().int().min(64).max(4000)
  ),
  KB_CHUNK_MIN_TOKENS: number(DEFAULT_CHUNKING.minTokens).pipe(
    z.number().int().min(0)
  ),
  KB_CHUNK_OVERLAP_TOKENS: number(DEFAULT_CHUNKING.overlapTokens).pipe(
    z.number().int().min(0)
  ),
  KB_LEGAL_ARTICLE_MAX_TOKENS: number(
    DEFAULT_CHUNKING.legalArticleMaxTokens
  ).pipe(z.number().int().min(64)),

  RETRIEVAL_FUSION: z.enum(["rrf", "weighted"]).default("rrf"),
  RETRIEVAL_RRF_K: number(60).pipe(z.number().min(1)),
  RETRIEVAL_WEIGHT_VECTOR: number(1),
  RETRIEVAL_WEIGHT_LEXICAL: number(1),
  RETRIEVAL_WEIGHT_EXACT: number(1.5),
  /** Chunks containing a multi-word domain phrase ("urlop rodzicielski"). */
  RETRIEVAL_WEIGHT_PHRASE: number(0.75),
  RETRIEVAL_CANDIDATES: number(30).pipe(z.number().int().min(5).max(200)),
  /** Minimum calibrated relevance (0–1) for a chunk to count as evidence. */
  RETRIEVAL_MIN_RELEVANCE: number(0.3).pipe(z.number().min(0).max(1)),
  /** Cosine similarity that maps to relevance 0 / 1 for the active model. */
  RETRIEVAL_VECTOR_FLOOR: number(0.1),
  RETRIEVAL_VECTOR_CEILING: number(0.6),
  RETRIEVAL_RERANKER: z.enum(["none", "lexical"]).default("none"),
  /**
   * Source-authority prior: rank score × (1 + w · authorityRank / 100), so a
   * statute outranks a guide paraphrasing it when both match equally.
   */
  RETRIEVAL_AUTHORITY_WEIGHT: number(0.25).pipe(z.number().min(0).max(2)),
  RETRIEVAL_MAX_PER_SECTION: number(2).pipe(z.number().int().min(1)),
})

export type RagConfig = z.infer<typeof ragConfigSchema>

export function parseRagConfig(
  source: NodeJS.ProcessEnv = process.env
): RagConfig {
  return ragConfigSchema.parse(source)
}

export function chunkingFromConfig(config: RagConfig) {
  return {
    maxTokens: config.KB_CHUNK_MAX_TOKENS,
    minTokens: config.KB_CHUNK_MIN_TOKENS,
    overlapTokens: config.KB_CHUNK_OVERLAP_TOKENS,
    legalArticleMaxTokens: config.KB_LEGAL_ARTICLE_MAX_TOKENS,
  }
}
