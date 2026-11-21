import { and, eq, inArray, ne, sql } from "drizzle-orm"

import type { Database } from "@zpr/db/client"
import {
  chunkEmbeddings,
  embeddingModels,
  ingestionJobs,
  knowledgeChunks,
  knowledgeDocuments,
  knowledgeSources,
} from "@zpr/db/schema"

import {
  assertCompatible,
  configFingerprint,
  modelKey,
  type EmbeddingModelConfig,
} from "../embeddings/provider"
import type { DocumentDefinition, SourceDefinition } from "../sources/types"

export type Tx = Parameters<Parameters<Database["transaction"]>[0]>[0]
type Executor = Database | Tx

export interface StoredDocument {
  id: string
  status: "PENDING" | "INDEXED" | "FAILED" | "SUPERSEDED" | "ARCHIVED"
  contentHash: string | null
}

export interface ChunkRow {
  /** Existing chunk id to keep (same content), or undefined to insert. */
  id?: string
  chunkIndex: number
  content: string
  sourceTitle: string
  sourceUrl: string | null
  sourceType: string
  pageNumber: number | null
  pageEnd: number | null
  sectionIdentifier: string | null
  headingPath: string | null
  legalReference: string | null
  validFrom: string | null
  validTo: string | null
  contentHash: string
  searchText: string
  stemText: string
  tokenCount: number
  metadata: Record<string, unknown>
}

export interface EmbeddingModelRecord {
  id: string
  name: string
  provider: string
  dimensions: number
  distanceMetric: "COSINE" | "L2" | "INNER_PRODUCT"
}

/** Name of a model row: provider, model, dimensions and config fingerprint. */
export function embeddingModelName(config: EmbeddingModelConfig): string {
  return `${modelKey(config)}#${configFingerprint(config).slice(0, 12)}`
}

export class KnowledgeStore {
  constructor(readonly db: Database) {}

  /** Stage 1: register (or refresh) a knowledge source by slug. */
  async upsertSource(definition: SourceDefinition): Promise<{ id: string }> {
    const values = {
      slug: definition.slug,
      title: definition.title,
      publisher: definition.publisher,
      sourceType: definition.sourceType,
      url: definition.url ?? null,
      description: definition.description ?? null,
      isConfidential: definition.accessLevel !== "PUBLIC",
      accessLevel: definition.accessLevel,
      redistribution: definition.redistribution,
      authorityRank: definition.authorityRank,
      metadata: definition.metadata ?? {},
      updatedAt: new Date(),
    }
    const [row] = await this.db
      .insert(knowledgeSources)
      .values(values)
      .onConflictDoUpdate({ target: knowledgeSources.slug, set: values })
      .returning({ id: knowledgeSources.id })
    if (!row) throw new Error(`Could not register source ${definition.slug}`)
    return row
  }

  /**
   * Registers the runtime embedding configuration. A different fingerprint
   * gets a different row, so vectors from incompatible configurations are
   * never compared with each other.
   */
  async ensureEmbeddingModel(
    config: EmbeddingModelConfig,
    activate = false
  ): Promise<EmbeddingModelRecord> {
    const name = embeddingModelName(config)
    const fingerprint = configFingerprint(config)
    await this.db
      .insert(embeddingModels)
      .values({
        name,
        provider: config.provider,
        dimensions: config.dimensions,
        distanceMetric: config.distanceMetric,
        configFingerprint: fingerprint,
        settings: {
          model: config.model,
          documentPrefix: config.documentPrefix,
          queryPrefix: config.queryPrefix,
          normalize: config.normalize,
          revision: config.revision,
        },
        description: `${config.provider} ${config.model} (${config.dimensions} wymiarów)`,
      })
      .onConflictDoNothing({ target: embeddingModels.name })

    const [row] = await this.db
      .select({
        id: embeddingModels.id,
        name: embeddingModels.name,
        provider: embeddingModels.provider,
        dimensions: embeddingModels.dimensions,
        distanceMetric: embeddingModels.distanceMetric,
        configFingerprint: embeddingModels.configFingerprint,
      })
      .from(embeddingModels)
      .where(eq(embeddingModels.name, name))
      .limit(1)
    if (!row) throw new Error(`Embedding model ${name} was not registered`)
    assertCompatible(row, config)

    if (activate) {
      await this.db.transaction(async (tx) => {
        await tx
          .update(embeddingModels)
          .set({ isActive: false })
          .where(ne(embeddingModels.id, row.id))
        await tx
          .update(embeddingModels)
          .set({ isActive: true })
          .where(eq(embeddingModels.id, row.id))
      })
    }
    return row
  }

  async findEmbeddingModel(
    config: EmbeddingModelConfig
  ): Promise<EmbeddingModelRecord | null> {
    const [row] = await this.db
      .select({
        id: embeddingModels.id,
        name: embeddingModels.name,
        provider: embeddingModels.provider,
        dimensions: embeddingModels.dimensions,
        distanceMetric: embeddingModels.distanceMetric,
        configFingerprint: embeddingModels.configFingerprint,
      })
      .from(embeddingModels)
      .where(eq(embeddingModels.name, embeddingModelName(config)))
      .limit(1)
    if (!row) return null
    assertCompatible(row, config)
    return row
  }

  /** Stage 8: per-model partial HNSW index (no-op when it exists). */
  async ensureVectorIndex(modelId: string): Promise<string | null> {
    const result = await this.db.execute(
      sql`SELECT kb.ensure_embedding_index(${modelId}::uuid) AS name`
    )
    const row = result.rows[0] as { name: string | null } | undefined
    return row?.name ?? null
  }

  async findDocument(
    sourceId: string,
    documentKey: string,
    version: string
  ): Promise<StoredDocument | null> {
    const [row] = await this.db
      .select({
        id: knowledgeDocuments.id,
        status: knowledgeDocuments.status,
        contentHash: knowledgeDocuments.contentHash,
      })
      .from(knowledgeDocuments)
      .where(
        and(
          eq(knowledgeDocuments.sourceId, sourceId),
          eq(knowledgeDocuments.documentKey, documentKey),
          eq(knowledgeDocuments.version, version)
        )
      )
      .limit(1)
    return row ?? null
  }

  /** Another indexed document of the same source with identical text. */
  async findDuplicate(
    sourceId: string,
    contentHash: string,
    excludeId: string
  ): Promise<{ id: string; title: string } | null> {
    const [row] = await this.db
      .select({ id: knowledgeDocuments.id, title: knowledgeDocuments.title })
      .from(knowledgeDocuments)
      .where(
        and(
          eq(knowledgeDocuments.sourceId, sourceId),
          eq(knowledgeDocuments.contentHash, contentHash),
          eq(knowledgeDocuments.status, "INDEXED"),
          ne(knowledgeDocuments.id, excludeId)
        )
      )
      .limit(1)
    return row ?? null
  }

  async createPendingDocument(
    sourceId: string,
    definition: DocumentDefinition
  ): Promise<StoredDocument> {
    const [row] = await this.db
      .insert(knowledgeDocuments)
      .values({
        sourceId,
        documentKey: definition.documentKey,
        title: definition.title,
        version: definition.version,
        documentType: definition.documentType,
        status: "PENDING",
      })
      .onConflictDoNothing()
      .returning({
        id: knowledgeDocuments.id,
        status: knowledgeDocuments.status,
        contentHash: knowledgeDocuments.contentHash,
      })
    if (row) return row
    const existing = await this.findDocument(
      sourceId,
      definition.documentKey,
      definition.version
    )
    if (!existing)
      throw new Error(
        `Could not create document ${definition.documentKey}@${definition.version}`
      )
    return existing
  }

  async startJob(
    documentId: string,
    attempt: number,
    modelId?: string
  ): Promise<string> {
    const [row] = await this.db
      .insert(ingestionJobs)
      .values({
        documentId,
        status: "RUNNING",
        stage: "register",
        attempts: attempt,
        embeddingModelId: modelId,
        startedAt: new Date(),
      })
      .returning({ id: ingestionJobs.id })
    if (!row) throw new Error("Could not create ingestion job")
    return row.id
  }

  async updateJob(
    jobId: string,
    values: Partial<typeof ingestionJobs.$inferInsert>
  ): Promise<void> {
    await this.db
      .update(ingestionJobs)
      .set(values)
      .where(eq(ingestionJobs.id, jobId))
  }

  async markDocumentFailed(documentId: string, error: string): Promise<void> {
    // A failed re-ingestion of an indexed document keeps the old content live.
    await this.db
      .update(knowledgeDocuments)
      .set({
        status: "FAILED",
        updatedAt: new Date(),
        metadata: sql`${knowledgeDocuments.metadata} || ${JSON.stringify({ lastError: error })}::jsonb`,
      })
      .where(
        and(
          eq(knowledgeDocuments.id, documentId),
          inArray(knowledgeDocuments.status, ["PENDING", "FAILED"])
        )
      )
  }

  async activeChunks(
    executor: Executor,
    documentId: string
  ): Promise<Array<{ id: string; contentHash: string }>> {
    return executor
      .select({
        id: knowledgeChunks.id,
        contentHash: knowledgeChunks.contentHash,
      })
      .from(knowledgeChunks)
      .where(
        and(
          eq(knowledgeChunks.documentId, documentId),
          eq(knowledgeChunks.isActive, true)
        )
      )
  }

  /** Chunk ids of `documentId` that already have a current vector for the model. */
  async embeddedChunks(
    documentId: string,
    modelId: string
  ): Promise<Map<string, string>> {
    const rows = await this.db
      .select({
        chunkId: chunkEmbeddings.chunkId,
        contentHash: chunkEmbeddings.contentHash,
      })
      .from(chunkEmbeddings)
      .innerJoin(
        knowledgeChunks,
        eq(knowledgeChunks.id, chunkEmbeddings.chunkId)
      )
      .where(
        and(
          eq(knowledgeChunks.documentId, documentId),
          eq(chunkEmbeddings.embeddingModelId, modelId)
        )
      )
    return new Map(rows.map((row) => [row.chunkId, row.contentHash]))
  }

  /**
   * Stage 7: store chunks and embeddings atomically. Chunks whose content is
   * unchanged keep their id (and their chat evidence); removed chunks are
   * deactivated; new chunks are inserted.
   */
  async replaceChunks(input: {
    documentId: string
    lockKey: string
    rows: ChunkRow[]
    embeddings: Map<number, number[]>
    model: EmbeddingModelRecord
    document: Partial<typeof knowledgeDocuments.$inferInsert>
    /** Runs before commit; throwing rolls back to the previous live version. */
    verify?: (tx: Tx) => Promise<void>
  }): Promise<{
    inserted: number
    kept: number
    deactivated: number
    embedded: number
  }> {
    return this.db.transaction(async (tx) => {
      await tx.execute(
        sql`SELECT pg_advisory_xact_lock(hashtext(${input.lockKey}))`
      )

      const existing = await this.activeChunks(tx, input.documentId)
      const keepIds = new Set(
        input.rows
          .map((row) => row.id)
          .filter((id): id is string => Boolean(id))
      )
      const toDeactivate = existing
        .filter((chunk) => !keepIds.has(chunk.id))
        .map((chunk) => chunk.id)

      if (toDeactivate.length > 0) {
        await tx
          .update(knowledgeChunks)
          .set({ isActive: false })
          .where(inArray(knowledgeChunks.id, toDeactivate))
      }
      // Move kept chunks out of the way of the partial unique index.
      await tx.execute(sql`
        UPDATE kb.knowledge_chunks SET chunk_index = -chunk_index - 1
        WHERE document_id = ${input.documentId} AND is_active`)

      let inserted = 0
      let kept = 0
      const idByIndex = new Map<number, string>()
      for (const row of input.rows) {
        const values = {
          chunkIndex: row.chunkIndex,
          content: row.content,
          sourceTitle: row.sourceTitle,
          sourceUrl: row.sourceUrl,
          sourceType: row.sourceType,
          pageNumber: row.pageNumber,
          pageEnd: row.pageEnd,
          sectionIdentifier: row.sectionIdentifier,
          headingPath: row.headingPath,
          legalReference: row.legalReference,
          validFrom: row.validFrom,
          validTo: row.validTo,
          contentHash: row.contentHash,
          searchText: row.searchText,
          stemText: row.stemText,
          tokenCount: row.tokenCount,
          metadata: row.metadata,
          isActive: true,
        }
        if (row.id) {
          await tx
            .update(knowledgeChunks)
            .set(values)
            .where(eq(knowledgeChunks.id, row.id))
          idByIndex.set(row.chunkIndex, row.id)
          kept += 1
        } else {
          const [created] = await tx
            .insert(knowledgeChunks)
            .values({ ...values, documentId: input.documentId })
            .returning({ id: knowledgeChunks.id })
          if (!created) throw new Error("Chunk insert returned no id")
          idByIndex.set(row.chunkIndex, created.id)
          inserted += 1
        }
      }

      let embedded = 0
      for (const [chunkIndex, vector] of input.embeddings) {
        const chunkId = idByIndex.get(chunkIndex)
        const row = input.rows.find(
          (candidate) => candidate.chunkIndex === chunkIndex
        )
        if (!chunkId || !row) continue
        await tx
          .insert(chunkEmbeddings)
          .values({
            chunkId,
            embeddingModelId: input.model.id,
            dimensions: input.model.dimensions,
            embedding: vector,
            contentHash: row.contentHash,
          })
          .onConflictDoUpdate({
            target: [chunkEmbeddings.chunkId, chunkEmbeddings.embeddingModelId],
            set: {
              embedding: vector,
              contentHash: row.contentHash,
              dimensions: input.model.dimensions,
              createdAt: new Date(),
            },
          })
        embedded += 1
      }

      await tx
        .update(knowledgeDocuments)
        .set({
          ...input.document,
          updatedAt: new Date(),
          lastIngestedAt: new Date(),
        })
        .where(eq(knowledgeDocuments.id, input.documentId))

      await input.verify?.(tx)
      return { inserted, kept, deactivated: toDeactivate.length, embedded }
    })
  }

  /**
   * Versioning after a successful ingestion of `documentId`:
   * - supersede: older versions of the key stop being retrievable;
   * - temporal (default): an open-ended older version ends where the new
   *   one starts, so both stay queryable for their own dates.
   */
  async applyVersioning(input: {
    sourceId: string
    documentKey: string
    documentId: string
    effectiveFrom: string | null
    supersede: boolean
  }): Promise<{ superseded: number; closed: number }> {
    return this.db.transaction(async (tx) => {
      const siblings = await tx
        .select({
          id: knowledgeDocuments.id,
          effectiveFrom: knowledgeDocuments.effectiveFrom,
          effectiveTo: knowledgeDocuments.effectiveTo,
        })
        .from(knowledgeDocuments)
        .where(
          and(
            eq(knowledgeDocuments.sourceId, input.sourceId),
            eq(knowledgeDocuments.documentKey, input.documentKey),
            eq(knowledgeDocuments.status, "INDEXED"),
            ne(knowledgeDocuments.id, input.documentId)
          )
        )

      let superseded = 0
      let closed = 0
      for (const sibling of siblings) {
        if (input.supersede) {
          await tx
            .update(knowledgeDocuments)
            .set({
              status: "SUPERSEDED",
              supersededById: input.documentId,
              updatedAt: new Date(),
            })
            .where(eq(knowledgeDocuments.id, sibling.id))
          superseded += 1
        } else if (
          input.effectiveFrom &&
          sibling.effectiveTo === null &&
          (sibling.effectiveFrom === null ||
            sibling.effectiveFrom < input.effectiveFrom)
        ) {
          await tx
            .update(knowledgeDocuments)
            .set({
              effectiveTo: input.effectiveFrom,
              supersededById: input.documentId,
              updatedAt: new Date(),
            })
            .where(eq(knowledgeDocuments.id, sibling.id))
          await tx.execute(sql`
            UPDATE kb.knowledge_chunks SET valid_to = ${input.effectiveFrom}::date
            WHERE document_id = ${sibling.id} AND (valid_to IS NULL OR valid_to > ${input.effectiveFrom}::date)`)
          closed += 1
        }
      }
      return { superseded, closed }
    })
  }

  /** Stage 9 helpers. */
  async countActive(
    documentId: string,
    modelId: string,
    executor: Executor = this.db
  ): Promise<{ chunks: number; embedded: number; stale: number }> {
    const result = await executor.execute(sql`
      SELECT
        count(*)::int AS chunks,
        count(e.chunk_id)::int AS embedded,
        count(*) FILTER (WHERE e.chunk_id IS NOT NULL AND e.content_hash <> c.content_hash)::int AS stale
      FROM kb.knowledge_chunks c
      LEFT JOIN kb.chunk_embeddings e ON e.chunk_id = c.id AND e.embedding_model_id = ${modelId}
      WHERE c.document_id = ${documentId} AND c.is_active`)
    const row = result.rows[0] as
      { chunks: number; embedded: number; stale: number } | undefined
    return row ?? { chunks: 0, embedded: 0, stale: 0 }
  }

  async markIndexed(documentId: string): Promise<void> {
    await this.db
      .update(knowledgeDocuments)
      .set({ status: "INDEXED", updatedAt: new Date() })
      .where(eq(knowledgeDocuments.id, documentId))
  }
}
