/**
 * The demo embedding model is deterministic and runs locally, so the whole
 * scaffold works without an API key. A production deployment swaps the
 * provider through the `EmbeddingProvider` port and re-embeds the KB.
 *
 * Changing either value requires a re-embedding run and a new HNSW index.
 * `kb.chunk_embeddings`-style versioning is represented by
 * `kb.knowledge_chunks.embedding_model_id`, so incompatible vectors are never
 * mixed in the same retrieval index.
 */
export const EMBEDDING_MODEL = "zpr-hash-1024"
export const EMBEDDING_PROVIDER = "local-demo"
export const EMBEDDING_DIMENSIONS = 1024
export const EMBEDDING_DISTANCE_METRIC = "COSINE" as const
