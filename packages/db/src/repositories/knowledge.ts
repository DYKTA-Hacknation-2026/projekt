import { and, desc, eq, sql } from "drizzle-orm"

import type { Database } from "../client"
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
} from "./interfaces"

/**
 * Read models for the dashboard and admin views. Hybrid retrieval lives in
 * `@zpr/rag` (RetrievalService); ingestion writes through its pipeline.
 */

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
      .innerJoin(
        knowledgeDocuments,
        eq(knowledgeDocuments.id, knowledgeChunks.documentId)
      )
      .where(
        and(
          eq(knowledgeChunks.isActive, true),
          eq(knowledgeDocuments.status, "INDEXED")
        )
      )
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
        accessLevel: knowledgeSources.accessLevel,
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
        effectiveFrom: knowledgeDocuments.effectiveFrom,
        effectiveTo: knowledgeDocuments.effectiveTo,
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
        and(
          eq(knowledgeChunks.documentId, knowledgeDocuments.id),
          eq(knowledgeChunks.isActive, true)
        )
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

  async listRecentChunks(
    limit = 5
  ): Promise<
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
      .where(eq(knowledgeChunks.isActive, true))
      .orderBy(desc(knowledgeChunks.createdAt))
      .limit(limit)
  }
}
