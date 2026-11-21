import type { Env } from "@zpr/contracts/env"

import { HashEmbeddingProvider } from "./hash-provider"
import { OpenAICompatibleEmbeddingProvider } from "./openai-compatible"
import type { EmbeddingProvider } from "./provider"

export * from "./provider"
export { HashEmbeddingProvider } from "./hash-provider"
export {
  EmbeddingRequestError,
  OpenAICompatibleEmbeddingProvider,
  type OpenAICompatibleOptions,
} from "./openai-compatible"

const DEFAULT_BASE_URLS: Record<string, string> = {
  openai: "https://api.openai.com/v1",
  ollama: "http://localhost:11434/v1",
}

type EmbeddingEnv = Pick<
  Env,
  | "EMBEDDING_PROVIDER"
  | "EMBEDDING_MODEL"
  | "EMBEDDING_DIMENSIONS"
  | "EMBEDDING_BASE_URL"
  | "EMBEDDING_API_KEY"
  | "EMBEDDING_QUERY_PREFIX"
  | "EMBEDDING_DOCUMENT_PREFIX"
  | "EMBEDDING_BATCH_SIZE"
  | "EMBEDDING_TIMEOUT_MS"
>

/**
 * Builds the single embedding provider used by both ingestion and
 * retrieval, so index-time and query-time configuration cannot drift.
 */
export function createEmbeddingProvider(env: EmbeddingEnv): EmbeddingProvider {
  if (env.EMBEDDING_PROVIDER === "local-demo") {
    return new HashEmbeddingProvider({
      model: env.EMBEDDING_MODEL,
      dimensions: env.EMBEDDING_DIMENSIONS,
      documentPrefix: env.EMBEDDING_DOCUMENT_PREFIX,
      queryPrefix: env.EMBEDDING_QUERY_PREFIX,
    })
  }

  const baseUrl =
    env.EMBEDDING_BASE_URL ?? DEFAULT_BASE_URLS[env.EMBEDDING_PROVIDER]
  if (!baseUrl) {
    throw new Error(
      `EMBEDDING_BASE_URL is required for EMBEDDING_PROVIDER=${env.EMBEDDING_PROVIDER}`
    )
  }
  if (env.EMBEDDING_PROVIDER === "openai" && !env.EMBEDDING_API_KEY) {
    throw new Error(
      "EMBEDDING_API_KEY is required for EMBEDDING_PROVIDER=openai"
    )
  }

  return new OpenAICompatibleEmbeddingProvider({
    provider: env.EMBEDDING_PROVIDER,
    model: env.EMBEDDING_MODEL,
    dimensions: env.EMBEDDING_DIMENSIONS,
    baseUrl,
    apiKey: env.EMBEDDING_API_KEY,
    documentPrefix: env.EMBEDDING_DOCUMENT_PREFIX,
    queryPrefix: env.EMBEDDING_QUERY_PREFIX,
    batchSize: env.EMBEDDING_BATCH_SIZE,
    timeoutMs: env.EMBEDDING_TIMEOUT_MS,
  })
}
