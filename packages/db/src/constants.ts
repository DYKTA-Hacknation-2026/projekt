/**
 * Default embedding contract of the offline demo model. The runtime value
 * comes from EMBEDDING_* env variables (see `@zpr/contracts/env`); each
 * configuration gets its own `kb.embedding_models` row and partial HNSW
 * index, so incompatible vectors are never mixed in one retrieval index.
 */
export const EMBEDDING_MODEL = "zpr-hash-1024"
export const EMBEDDING_PROVIDER = "local-demo"
export const EMBEDDING_DIMENSIONS = 1024
export const EMBEDDING_DISTANCE_METRIC = "COSINE" as const
