import type {
  KnowledgeChunkResult,
  KnowledgeSearchInput,
  KnowledgeSearchResult,
} from "@zpr/contracts/knowledge"
import type { RetrievedChunk } from "@zpr/rag/retrieval"

import { getContainer } from "@/server/container"

function toContract(chunk: RetrievedChunk): KnowledgeChunkResult {
  return {
    id: chunk.id,
    documentId: chunk.documentId,
    content: chunk.content,
    sourceId: chunk.sourceId,
    sourceSlug: chunk.sourceSlug,
    sourceTitle: chunk.sourceTitle,
    sourceType: chunk.sourceType,
    sourceUrl: chunk.sourceUrl,
    documentTitle: chunk.documentTitle,
    documentVersion: chunk.documentVersion,
    externalId: chunk.externalId,
    headingPath: chunk.headingPath,
    pageNumber: chunk.pageNumber,
    pageEnd: chunk.pageEnd,
    sectionIdentifier: chunk.sectionIdentifier,
    legalReference: chunk.legalReference,
    validFrom: chunk.effectiveFrom,
    validTo: chunk.effectiveTo,
    // RESTRICTED / PROHIBITED rows are filtered out in SQL.
    accessLevel: chunk.accessLevel === "INTERNAL" ? "INTERNAL" : "PUBLIC",
    redistribution:
      chunk.redistribution === "PROHIBITED"
        ? "CITATION_ONLY"
        : chunk.redistribution,
    authorityRank: chunk.authorityRank,
    benefitTags: chunk.benefitTags,
    score: chunk.relevance.score,
    relevance: chunk.relevance,
  }
}

/**
 * Typed retrieval: query text + optional source/tag filters + relevant date
 * + limit + threshold. The caller passes only the question — never profile
 * records; identifiers in the question are redacted by the service.
 */
export async function searchKnowledge(input: {
  query: string
  limit: number
  asOf?: string
  sources?: string[]
  sourceTypes?: KnowledgeSearchInput["sourceType"]
  benefitTags?: KnowledgeSearchInput["tag"]
  minRelevance?: number
}): Promise<KnowledgeSearchResult> {
  const { retrieval } = getContainer()
  const [result, model] = await Promise.all([
    retrieval.search({
      query: input.query,
      limit: input.limit,
      asOf: input.asOf,
      sources: input.sources,
      sourceTypes: input.sourceTypes,
      benefitTags: input.benefitTags,
      minRelevance: input.minRelevance,
    }),
    retrieval.embeddingModel(),
  ])

  return {
    status: result.status,
    query: result.query.text,
    asOf: result.query.asOf,
    exactTerms: result.query.exactTerms,
    redactions: result.query.redactions,
    noEvidence: result.noEvidence ?? null,
    embeddingModel: model
      ? {
          name: model.name,
          provider: model.provider,
          dimensions: model.dimensions,
        }
      : null,
    results: result.chunks.map(toContract),
  }
}
