import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { and, eq, sql } from "drizzle-orm"

import {
  chunkEmbeddings,
  embeddingModels,
  ingestionJobs,
  knowledgeChunks,
  knowledgeDocuments,
} from "@zpr/db/schema"

import { HashEmbeddingProvider } from "../src/embeddings"
import { IngestionPipeline } from "../src/ingest/pipeline"
import { NonRetryableError } from "../src/util/retry"
import {
  createTestDatabase,
  TEST_DATABASE_URL,
  document,
  FlakyProvider,
  source,
  textRequest,
  type TestDatabase,
} from "./helpers"

const STATUTE = `<!-- page: 6 -->
ROZDZIAŁ 4. ZASIŁEK MACIERZYŃSKI
Art. 29
1. Zasiłek macierzyński przysługuje ubezpieczonej, która urodziła dziecko.
2. Przepisy ust. 1 stosuje się odpowiednio do ubezpieczonego.
<!-- page: 9 -->
Art. 31
1. Miesięczny zasiłek macierzyński za okres urlopu macierzyńskiego wynosi 100% podstawy wymiaru zasiłku.
2. Miesięczny zasiłek macierzyński za okres urlopu rodzicielskiego wynosi 70% podstawy wymiaru zasiłku.`

describe.skipIf(!TEST_DATABASE_URL)("ingestion pipeline", () => {
  let test: TestDatabase
  const provider = new HashEmbeddingProvider({ dimensions: 256 })
  let pipeline: IngestionPipeline

  beforeAll(async () => {
    test = await createTestDatabase()
    pipeline = new IngestionPipeline(test.db, provider, {
      retries: 3,
      retryBaseDelayMs: 1,
    })
  })
  afterAll(async () => test?.close())

  it("runs all stages and stores content, metadata and embeddings", async () => {
    const result = await pipeline.ingest(
      textRequest(source(), document({ effectiveFrom: "2026-07-01" }), STATUTE)
    )
    expect(result.status).toBe("INGESTED")
    expect(result.stages.map((stage) => stage.stage)).toEqual(
      expect.arrayContaining([
        "register",
        "extract",
        "normalize",
        "boundaries",
        "chunk",
        "embed",
        "store",
        "index",
        "verify",
      ])
    )

    const chunks = await test.db
      .select()
      .from(knowledgeChunks)
      .where(eq(knowledgeChunks.documentId, result.documentId!))
      .orderBy(knowledgeChunks.chunkIndex)
    expect(
      chunks.map((chunk) => [
        chunk.legalReference,
        chunk.pageNumber,
        chunk.validFrom,
      ])
    ).toEqual([
      ["T art. 29 ust. 1–2", 6, "2026-07-01"],
      ["T art. 31 ust. 1–2", 9, "2026-07-01"],
    ])
    expect(chunks[0]?.headingPath).toBe(
      "ROZDZIAŁ 4. ZASIŁEK MACIERZYŃSKI › Art. 29"
    )
    expect(chunks[0]?.metadata).toMatchObject({
      benefitTags: expect.arrayContaining(["MATERNITY"]),
      article: "29",
    })

    const vectors = await test.db.select().from(chunkEmbeddings)
    expect(vectors).toHaveLength(2)
    expect(
      vectors.every(
        (row) => row.dimensions === 256 && row.embedding.length === 256
      )
    ).toBe(true)

    const [doc] = await test.db
      .select()
      .from(knowledgeDocuments)
      .where(eq(knowledgeDocuments.id, result.documentId!))
    expect(doc).toMatchObject({
      status: "INDEXED",
      effectiveFrom: "2026-07-01",
      pageCount: 2,
    })
    expect(doc?.contentHash).toHaveLength(64)

    const [job] = await test.db
      .select()
      .from(ingestionJobs)
      .where(eq(ingestionJobs.id, result.jobId!))
    expect(job).toMatchObject({
      status: "SUCCEEDED",
      stage: "verify",
      chunksCreated: 2,
    })

    // Stage 8: a partial HNSW index exists for this model's dimension.
    const index = await test.db.execute(
      sql`SELECT indexdef FROM pg_indexes WHERE indexname LIKE 'chunk_embeddings_hnsw_%'`
    )
    expect(String((index.rows[0] as { indexdef: string }).indexdef)).toContain(
      "vector(256)"
    )
  })

  it("is idempotent: re-ingesting unchanged content does nothing", async () => {
    const before = await test.db
      .select({ id: knowledgeChunks.id })
      .from(knowledgeChunks)
    const result = await pipeline.ingest(
      textRequest(source(), document({ effectiveFrom: "2026-07-01" }), STATUTE)
    )
    expect(result.status).toBe("UNCHANGED")
    const after = await test.db
      .select({ id: knowledgeChunks.id })
      .from(knowledgeChunks)
    expect(after).toEqual(before)
  })

  it("updates an outdated document, keeping ids of unchanged chunks", async () => {
    const [art29] = await test.db
      .select({ id: knowledgeChunks.id })
      .from(knowledgeChunks)
      .where(eq(knowledgeChunks.legalReference, "T art. 29 ust. 1–2"))
    const changed = STATUTE.replace("70% podstawy", "75% podstawy")
    const result = await pipeline.ingest(
      textRequest(source(), document({ effectiveFrom: "2026-07-01" }), changed)
    )
    expect(result.status).toBe("UPDATED")
    expect(result.stats).toMatchObject({ kept: 1, inserted: 1, deactivated: 1 })

    const active = await test.db
      .select({ id: knowledgeChunks.id, content: knowledgeChunks.content })
      .from(knowledgeChunks)
      .where(eq(knowledgeChunks.isActive, true))
    expect(active.map((chunk) => chunk.id)).toContain(art29!.id)
    expect(active.some((chunk) => chunk.content.includes("75%"))).toBe(true)
    // Old text is deactivated, not deleted (chat evidence keeps its quote).
    const inactive = await test.db
      .select()
      .from(knowledgeChunks)
      .where(eq(knowledgeChunks.isActive, false))
    expect(inactive.map((chunk) => chunk.content).join()).toContain("70%")
  })

  it("deduplicates identical content registered under another key", async () => {
    const result = await pipeline.ingest(
      textRequest(
        source(),
        document({ documentKey: "copy", effectiveFrom: "2026-07-01" }),
        STATUTE.replace("70% podstawy", "75% podstawy")
      )
    )
    expect(result.status).toBe("DUPLICATE")
    const [doc] = await test.db
      .select()
      .from(knowledgeDocuments)
      .where(eq(knowledgeDocuments.documentKey, "copy"))
    expect(doc?.status).toBe("FAILED")
  })

  it("refuses restricted sources before reading any content", async () => {
    const restricted = source({
      slug: "sample-cases",
      accessLevel: "RESTRICTED",
      redistribution: "PROHIBITED",
    })
    const result = await pipeline.ingest({
      source: restricted,
      document: document({ sourceSlug: "sample-cases" }),
      content: { filePath: "/nonexistent/should-never-be-read.pdf" },
    })
    expect(result.status).toBe("REFUSED")
    expect(result.error).toMatch(/never indexed/)
    const docs = await test.db.execute(
      sql`SELECT count(*)::int AS n FROM kb.knowledge_documents d JOIN kb.knowledge_sources s ON s.id = d.source_id WHERE s.slug = 'sample-cases'`
    )
    expect((docs.rows[0] as { n: number }).n).toBe(0)
  })

  it("retries transient embedding failures", async () => {
    const flaky = new FlakyProvider(provider, 2)
    const retrying = new IngestionPipeline(test.db, flaky, {
      retries: 3,
      retryBaseDelayMs: 1,
    })
    const result = await retrying.ingest(
      textRequest(
        source({ slug: "flaky" }),
        document({ sourceSlug: "flaky" }),
        STATUTE
      )
    )
    expect(result.status).toBe("INGESTED")
    expect(result.attempts).toBe(3)
    const jobs = await test.db.execute(sql`
      SELECT j.status, j.error FROM kb.ingestion_jobs j JOIN kb.knowledge_documents d ON d.id = j.document_id
      JOIN kb.knowledge_sources s ON s.id = d.source_id WHERE s.slug = 'flaky' ORDER BY j.created_at`)
    expect(
      (jobs.rows as Array<{ status: string }>).map((job) => job.status)
    ).toEqual(["FAILED", "FAILED", "SUCCEEDED"])
  })

  it("marks a new document FAILED after permanent errors", async () => {
    const broken = new FlakyProvider(
      provider,
      99,
      () => new NonRetryableError("invalid API key")
    )
    const failing = new IngestionPipeline(test.db, broken, {
      retries: 3,
      retryBaseDelayMs: 1,
    })
    const result = await failing.ingest(
      textRequest(
        source({ slug: "broken" }),
        document({ sourceSlug: "broken" }),
        STATUTE
      )
    )
    expect(result).toMatchObject({
      status: "FAILED",
      attempts: 1,
      error: "invalid API key",
    })
    const rows = await test.db.execute(sql`
      SELECT d.status FROM kb.knowledge_documents d JOIN kb.knowledge_sources s ON s.id = d.source_id WHERE s.slug = 'broken'`)
    expect((rows.rows[0] as { status: string }).status).toBe("FAILED")
  })

  it("keeps the previous version live when a re-ingestion fails verification", async () => {
    const liveBefore = await test.db
      .select({ content: knowledgeChunks.content })
      .from(knowledgeChunks)
      .innerJoin(
        knowledgeDocuments,
        eq(knowledgeDocuments.id, knowledgeChunks.documentId)
      )
      .where(
        and(
          eq(knowledgeDocuments.documentKey, "main"),
          eq(knowledgeChunks.isActive, true)
        )
      )
    // A provider whose query side disagrees with the document side.
    const inconsistent = {
      config: provider.config,
      embedDocument: (texts: string[]) => provider.embedDocument(texts),
      embedQuery: async () => {
        const vector = new Array(256).fill(0)
        vector[1] = 1
        return vector
      },
    }
    const bad = new IngestionPipeline(test.db, inconsistent, { retries: 1 })
    const result = await bad.ingest(
      textRequest(
        source(),
        document({ effectiveFrom: "2026-07-01" }),
        STATUTE.replace("100%", "90%")
      )
    )
    expect(result.status).toBe("FAILED")
    expect(result.error).toMatch(/disagree/)
    const liveAfter = await test.db
      .select({ content: knowledgeChunks.content })
      .from(knowledgeChunks)
      .innerJoin(
        knowledgeDocuments,
        eq(knowledgeDocuments.id, knowledgeChunks.documentId)
      )
      .where(
        and(
          eq(knowledgeDocuments.documentKey, "main"),
          eq(knowledgeChunks.isActive, true)
        )
      )
    expect(liveAfter).toEqual(liveBefore)
    const [doc] = await test.db
      .select()
      .from(knowledgeDocuments)
      .where(eq(knowledgeDocuments.documentKey, "main"))
    expect(doc?.status).toBe("INDEXED")
  })

  it("registers a separate model per embedding configuration", async () => {
    const other = new HashEmbeddingProvider({
      dimensions: 256,
      queryPrefix: "query: ",
    })
    await new IngestionPipeline(test.db, other).store.ensureEmbeddingModel(
      other.config
    )
    const models = await test.db
      .select({ name: embeddingModels.name, dims: embeddingModels.dimensions })
      .from(embeddingModels)
    expect(models).toHaveLength(2)
    expect(new Set(models.map((model) => model.name)).size).toBe(2)
  })
})
