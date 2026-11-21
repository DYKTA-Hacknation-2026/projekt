import type { Env } from "@zpr/contracts/env"
import type { Database } from "@zpr/db/client"

import { chunkingFromConfig, parseRagConfig, type RagConfig } from "./config"
import { createEmbeddingProvider } from "./embeddings"
import type { EmbeddingProvider } from "./embeddings/provider"
import { IngestionPipeline } from "./ingest/pipeline"
import { LexicalReranker } from "./retrieval/rerank"
import { RetrievalService } from "./retrieval/service"
import type { AccessLevel } from "./sources/types"

export * from "./config"
export * from "./chunking/chunker"
export * from "./extract/extract"
export * from "./extract/normalize"
export * from "./extract/types"
export * from "./structure/legal"
export * from "./structure/guide"
export * from "./structure/types"
export * from "./text/search-text"
export * from "./text/vocabulary"
export * from "./embeddings"
export * from "./ingest"
export * from "./retrieval"
export * from "./sources"
export { withRetry, NonRetryableError } from "./util/retry"

export interface RagRuntime {
  config: RagConfig
  embeddings: EmbeddingProvider
  retrieval: RetrievalService
  ingestion: IngestionPipeline
}

/**
 * Wires one embedding provider into both ingestion and retrieval, so the
 * index and the queries always use the same model configuration.
 */
export function createRagRuntime(input: {
  db: Database
  env: Env
  accessLevels?: AccessLevel[]
  config?: RagConfig
  embeddings?: EmbeddingProvider
  log?: (message: string) => void
}): RagRuntime {
  const config = input.config ?? parseRagConfig()
  const embeddings = input.embeddings ?? createEmbeddingProvider(input.env)
  return {
    config,
    embeddings,
    retrieval: new RetrievalService(input.db, embeddings, config, {
      accessLevels: input.accessLevels ?? input.env.KB_RETRIEVAL_ACCESS_LEVELS,
      reranker:
        config.RETRIEVAL_RERANKER === "lexical"
          ? new LexicalReranker()
          : undefined,
    }),
    ingestion: new IngestionPipeline(input.db, embeddings, {
      chunking: chunkingFromConfig(config),
      log: input.log,
    }),
  }
}
