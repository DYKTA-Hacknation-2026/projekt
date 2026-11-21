import "dotenv/config"

import { eq } from "drizzle-orm"

import { closeDatabase, getDatabaseConnection } from "../client"
import { EMBEDDING_DIMENSIONS, EMBEDDING_MODEL, EMBEDDING_PROVIDER } from "../constants"
import { contentHash, embedText } from "../embeddings"
import { createRepositories } from "../repositories"
import {
  embeddingModels,
  knowledgeChunks,
  knowledgeDocuments,
  knowledgeSources,
} from "../schema"

const MODEL_ID = "01900000-0000-7000-8000-000000009001"
const SOURCE_ID = "01900000-0000-7000-8000-000000009002"
const DOCUMENT_ID = "01900000-0000-7000-8000-000000009003"
const CHUNK_ID = "01900000-0000-7000-8000-000000009004"
const CONTENT =
  "Test pgvector: wyszukiwanie semantyczne dokumentów o urlopie macierzyńskim i zasiłku chorobowym w ciąży. Kontrola wdrożenia bazy wektorowej."

async function main(): Promise<void> {
  const connection = getDatabaseConnection()
  const { db } = connection

  await db
    .insert(embeddingModels)
    .values({
      id: MODEL_ID,
      name: EMBEDDING_MODEL,
      provider: EMBEDDING_PROVIDER,
      dimensions: EMBEDDING_DIMENSIONS,
      isActive: true,
      description: "Smoke-test embedding model (same contract as the seed).",
    })
    .onConflictDoNothing({ target: embeddingModels.name })

  const [model] = await db
    .select({ id: embeddingModels.id })
    .from(embeddingModels)
    .where(eq(embeddingModels.name, EMBEDDING_MODEL))
    .limit(1)

  if (!model) throw new Error("Embedding model was not created.")

  await db
    .insert(knowledgeSources)
    .values({
      id: SOURCE_ID,
      slug: "smoke-test",
      title: "Smoke test vector store",
      publisher: "ZPR",
      sourceType: "INTERNAL",
      description: "Tymczasowy dokument weryfikujący pgvector.",
    })
    .onConflictDoNothing()

  await db
    .insert(knowledgeDocuments)
    .values({
      id: DOCUMENT_ID,
      sourceId: SOURCE_ID,
      title: "Weryfikacja pgvector",
      version: "smoke",
      documentType: "INTERNAL_NOTE",
      effectiveFrom: "2026-11-01",
      status: "INDEXED",
      contentHash: contentHash(CONTENT),
    })
    .onConflictDoNothing()

  await db
    .insert(knowledgeChunks)
    .values({
      id: CHUNK_ID,
      documentId: DOCUMENT_ID,
      embeddingModelId: model.id,
      content: CONTENT,
      embedding: embedText(CONTENT),
      sourceTitle: "Weryfikacja pgvector",
      sourceType: "INTERNAL",
      sectionIdentifier: "smoke",
      legalReference: null,
      validFrom: "2026-11-01",
      contentHash: contentHash(CONTENT),
      metadata: { smokeTest: true },
      tokenCount: 24,
    })
    .onConflictDoNothing()

  const repositories = createRepositories(db)
  const started = performance.now()
  const results = await repositories.knowledge.searchChunks(
    embedText("kontrola wdrożenia pgvector bazy wektorowej"),
    { query: "kontrola wdrożenia pgvector bazy wektorowej", limit: 5 }
  )
  const elapsed = Math.round(performance.now() - started)

  console.info(
    `[db:smoke] Zapytanie wektorowe + FTS wykonane w ${elapsed} ms. Wyniki:`
  )
  for (const result of results) {
    console.info(
      `  ${result.score.toFixed(5)}  ${result.legalReference ?? result.sourceTitle}  ${result.content.slice(0, 70)}…`
    )
  }

  if (!results.some((result) => result.id === CHUNK_ID)) {
    throw new Error(
      "Smoke test failed: the inserted chunk was not returned by similarity search."
    )
  }

  if (process.env.KEEP_SMOKE_DATA !== "1") {
    await db.delete(knowledgeSources).where(eq(knowledgeSources.id, SOURCE_ID))
    console.info("[db:smoke] Tymczasowe dane testowe usunięte.")
  }

  console.info(
    "[db:smoke] OK — insert wektorowy i wyszukiwanie podobieństwa działają."
  )
}

main()
  .then(async () => {
    await closeDatabase()
    process.exit(0)
  })
  .catch(async (error: unknown) => {
    console.error("[db:smoke] FAILED:", error)
    await closeDatabase()
    process.exit(1)
  })
