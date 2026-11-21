import { desc, eq, sql } from "drizzle-orm"

import type { KnowledgeChunkResult } from "@zpr/contracts/knowledge"

import type { Database } from "../client"
import { toVectorLiteral } from "../embeddings"
import {
  ingestionJobs,
  knowledgeChunks,
  knowledgeDocuments,
  knowledgeSources,
  embeddingModels,
} from "../schema"
import type {
  EmbeddingModelSummary,
  IngestionJobSummary,
  KnowledgeChunkRecord,
  KnowledgeDocumentSummary,
  KnowledgeRepository,
  KnowledgeSourceSummary,
  SearchChunksOptions,
} from "./interfaces"

export class DrizzleKnowledgeRepository implements KnowledgeRepository {
  constructor(private readonly db: Database) {}

  async getActiveEmbeddingModel(): Promise<EmbeddingModelSummary | null> {
    const [row] = await this.db
      .select({
        id: embeddingModels.id,
        name: embeddingModels.name,
        provider: embeddingModels.provider,
        dimensions: embeddingModels.dimensions,
        isActive: embeddingModels.isActive,
      })
      .from(embeddingModels)
      .where(eq(embeddingModels.isActive, true))
      .orderBy(desc(embeddingModels.createdAt))
      .limit(1)
    return row ?? null
  }

  async countChunks(): Promise<number> {
    const [row] = await this.db
      .select({ value: sql<number>`count(*)::int` })
      .from(knowledgeChunks)
    return row?.value ?? 0
  }

  async listSources(limit = 10): Promise<KnowledgeSourceSummary[]> {
    return this.db
      .select({
        id: knowledgeSources.id,
        slug: knowledgeSources.slug,
        title: knowledgeSources.title,
        publisher: knowledgeSources.publisher,
        sourceType: knowledgeSources.sourceType,
        isConfidential: knowledgeSources.isConfidential,
        documentCount: sql<number>`count(${knowledgeDocuments.id})::int`,
      })
      .from(knowledgeSources)
      .leftJoin(
        knowledgeDocuments,
        eq(knowledgeDocuments.sourceId, knowledgeSources.id)
      )
      .groupBy(knowledgeSources.id)
      .orderBy(desc(knowledgeSources.createdAt))
      .limit(limit)
  }

  async listDocuments(limit = 10): Promise<KnowledgeDocumentSummary[]> {
    return this.db
      .select({
        id: knowledgeDocuments.id,
        title: knowledgeDocuments.title,
        version: knowledgeDocuments.version,
        status: knowledgeDocuments.status,
        sourceTitle: knowledgeSources.title,
        chunkCount: sql<number>`count(${knowledgeChunks.id})::int`,
      })
      .from(knowledgeDocuments)
      .innerJoin(
        knowledgeSources,
        eq(knowledgeSources.id, knowledgeDocuments.sourceId)
      )
      .leftJoin(
        knowledgeChunks,
        eq(knowledgeChunks.documentId, knowledgeDocuments.id)
      )
      .groupBy(knowledgeDocuments.id, knowledgeSources.title)
      .orderBy(desc(knowledgeDocuments.createdAt))
      .limit(limit)
  }

  async listIngestionJobs(limit = 10): Promise<IngestionJobSummary[]> {
    return this.db
      .select({
        id: ingestionJobs.id,
        status: ingestionJobs.status,
        chunksCreated: ingestionJobs.chunksCreated,
        documentTitle: knowledgeDocuments.title,
        createdAt: ingestionJobs.createdAt,
      })
      .from(ingestionJobs)
      .innerJoin(
        knowledgeDocuments,
        eq(knowledgeDocuments.id, ingestionJobs.documentId)
      )
      .orderBy(desc(ingestionJobs.createdAt))
      .limit(limit)
  }

  async listRecentChunks(limit = 5): Promise<
    Array<
      Pick<
        KnowledgeChunkRecord,
        | "id"
        | "content"
        | "sourceTitle"
        | "legalReference"
        | "createdAt"
        | "contentHash"
      >
    >
  > {
    return this.db
      .select({
        id: knowledgeChunks.id,
        content: knowledgeChunks.content,
        sourceTitle: knowledgeChunks.sourceTitle,
        legalReference: knowledgeChunks.legalReference,
        createdAt: knowledgeChunks.createdAt,
        contentHash: knowledgeChunks.contentHash,
      })
      .from(knowledgeChunks)
      .orderBy(desc(knowledgeChunks.createdAt))
      .limit(limit)
  }

  async searchChunks(
    embedding: number[],
    options: SearchChunksOptions
  ): Promise<KnowledgeChunkResult[]> {
    const model = await this.getActiveEmbeddingModel()
    if (!model) return []

    const vector = toVectorLiteral(embedding)
    const candidateLimit = Math.max(20, options.limit * 4)
    const asOf = options.asOf ?? null

    const result = await this.db.execute(sql`
      WITH vector_search AS (
        SELECT
          id,
          row_number() OVER (ORDER BY embedding <=> ${vector}::vector) AS rank,
          1 - (embedding <=> ${vector}::vector) AS vector_score
        FROM kb.knowledge_chunks
        WHERE embedding_model_id = ${model.id}
        ORDER BY embedding <=> ${vector}::vector
        LIMIT ${candidateLimit}
      ),
      lexical_search AS (
        SELECT
          id,
          row_number() OVER (
            ORDER BY ts_rank_cd(
              to_tsvector('simple', content),
              plainto_tsquery('simple', ${options.query})
            ) DESC
          ) AS rank
        FROM kb.knowledge_chunks
        WHERE to_tsvector('simple', content)
              @@ plainto_tsquery('simple', ${options.query})
        ORDER BY ts_rank_cd(
          to_tsvector('simple', content),
          plainto_tsquery('simple', ${options.query})
        ) DESC
        LIMIT ${candidateLimit}
      )
      SELECT
        c.id,
        c.document_id,
        c.content,
        c.source_title,
        c.source_url,
        c.source_type,
        c.page_number,
        c.section_identifier,
        c.legal_reference,
        c.valid_from,
        c.valid_to,
        (
          COALESCE(1.0 / (60 + v.rank), 0) +
          COALESCE(1.0 / (60 + l.rank), 0)
        )::float8 AS score,
        COALESCE(1.0 / (60 + l.rank), 0)::float8 AS lexical_score,
        COALESCE(v.vector_score, 0)::float8 AS vector_score
      FROM kb.knowledge_chunks c
      INNER JOIN kb.knowledge_documents d
        ON d.id = c.document_id AND d.status = 'INDEXED'
      LEFT JOIN vector_search v ON v.id = c.id
      LEFT JOIN lexical_search l ON l.id = c.id
      WHERE c.embedding_model_id = ${model.id}
        AND (v.id IS NOT NULL OR l.id IS NOT NULL)
        AND (
          ${asOf}::date IS NULL
          OR (
            (c.valid_from IS NULL OR c.valid_from <= ${asOf}::date)
            AND (c.valid_to IS NULL OR c.valid_to > ${asOf}::date)
          )
        )
      ORDER BY score DESC
      LIMIT ${options.limit}
    `)

    return (result.rows as Array<Record<string, unknown>>).map((row) => ({
      id: String(row.id),
      documentId: String(row.document_id),
      content: String(row.content),
      sourceTitle: String(row.source_title),
      sourceUrl: row.source_url ? String(row.source_url) : null,
      sourceType: String(row.source_type),
      pageNumber: row.page_number === null ? null : Number(row.page_number),
      sectionIdentifier: row.section_identifier
        ? String(row.section_identifier)
        : null,
      legalReference: row.legal_reference
        ? String(row.legal_reference)
        : null,
      validFrom: row.valid_from ? String(row.valid_from) : null,
      validTo: row.valid_to ? String(row.valid_to) : null,
      score: Number(row.score ?? 0),
      lexicalScore: Number(row.lexical_score ?? 0),
      vectorScore: Number(row.vector_score ?? 0),
    }))
  }
}
