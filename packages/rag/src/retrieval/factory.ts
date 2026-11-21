import type { Env } from "@zpr/contracts/env"
import type { Database } from "@zpr/db/client"

import { parseRagConfig, type RagConfig } from "../config"
import { createEmbeddingProvider } from "../embeddings"
import type { EmbeddingProvider } from "../embeddings/provider"
import type { AccessLevel } from "../sources/types"
import { LexicalReranker } from "./rerank"
import { RetrievalService } from "./service"

/**
 * Retrieval-only wiring for the web app (no PDF/ingestion dependencies).
 * Uses the same EMBEDDING_* configuration as the ingestion pipeline.
 */
export function createRetrievalService(input: {
  db: Database
  env: Env
  accessLevels?: AccessLevel[]
  config?: RagConfig
  embeddings?: EmbeddingProvider
}): RetrievalService {
  const config = input.config ?? parseRagConfig()
  return new RetrievalService(
    input.db,
    input.embeddings ?? createEmbeddingProvider(input.env),
    config,
    {
      accessLevels: input.accessLevels ?? input.env.KB_RETRIEVAL_ACCESS_LEVELS,
      reranker:
        config.RETRIEVAL_RERANKER === "lexical"
          ? new LexicalReranker()
          : undefined,
    }
  )
}
