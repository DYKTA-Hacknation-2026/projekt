import type { KnowledgeChunkResult } from "@zpr/contracts/knowledge"
import { embedText } from "@zpr/db/embeddings"

import { getContainer } from "@/server/container"

export interface KnowledgeSearchResult {
  query: string
  asOf: string | null
  embeddingModel: {
    name: string
    provider: string
    dimensions: number
  } | null
  results: KnowledgeChunkResult[]
}

export async function searchKnowledge(input: {
  query: string
  limit: number
  asOf?: string
}): Promise<KnowledgeSearchResult> {
  const { repositories } = getContainer()
  const embedding = embedText(input.query)
  const [model, results] = await Promise.all([
    repositories.knowledge.getActiveEmbeddingModel(),
    repositories.knowledge.searchChunks(embedding, {
      query: input.query,
      limit: input.limit,
      asOf: input.asOf,
    }),
  ])

  return {
    query: input.query,
    asOf: input.asOf ?? null,
    embeddingModel: model
      ? {
          name: model.name,
          provider: model.provider,
          dimensions: model.dimensions,
        }
      : null,
    results,
  }
}
