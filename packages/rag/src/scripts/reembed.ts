/**
 * Re-embed the knowledge base with the current EMBEDDING_* configuration
 * (new provider, model, dimensions or prefixes) without re-reading sources.
 *
 *   EMBEDDING_PROVIDER=openai EMBEDDING_MODEL=text-embedding-3-small \
 *   EMBEDDING_DIMENSIONS=1536 EMBEDDING_API_KEY=… pnpm --filter @zpr/rag kb:reembed
 *
 * Vectors of the previous model stay in place until you delete them, so the
 * switch is atomic: the new model is activated only after every chunk has a
 * vector and its HNSW index exists. Idempotent and resumable.
 */
import { sql } from "drizzle-orm"

import { chunkEmbeddings } from "@zpr/db/schema"

import { embeddingInput } from "../ingest/pipeline"
import { withRetry } from "../util/retry"
import { openRuntime, run } from "./common"

run("kb:reembed", async () => {
  const { db, embeddings, ingestion } = openRuntime()
  const model = await ingestion.store.ensureEmbeddingModel(
    embeddings.config,
    false
  )
  console.info(`[kb:reembed] Model docelowy: ${model.name}`)

  const pending = await db.execute(sql`
    SELECT c.id, c.content, c.heading_path, c.content_hash, d.title
    FROM kb.knowledge_chunks c
    JOIN kb.knowledge_documents d ON d.id = c.document_id
    LEFT JOIN kb.chunk_embeddings e ON e.chunk_id = c.id AND e.embedding_model_id = ${model.id}
    WHERE c.is_active AND d.status = 'INDEXED'
      AND (e.chunk_id IS NULL OR e.content_hash <> c.content_hash)
    ORDER BY d.id, c.chunk_index`)
  const rows = pending.rows as Array<{
    id: string
    content: string
    heading_path: string | null
    content_hash: string
    title: string
  }>
  console.info(`[kb:reembed] Fragmenty do osadzenia: ${rows.length}`)

  const batchSize = 64
  for (let start = 0; start < rows.length; start += batchSize) {
    const batch = rows.slice(start, start + batchSize)
    const vectors = await withRetry(
      () =>
        embeddings.embedDocument(
          batch.map((row) =>
            embeddingInput(row.title, {
              headingPath: row.heading_path
                ? row.heading_path.split(" › ")
                : [],
              content: row.content,
            })
          )
        ),
      { attempts: 4, baseDelayMs: 1000 }
    )
    await db.transaction(async (tx) => {
      for (const [index, row] of batch.entries()) {
        const vector = vectors[index]
        if (!vector) continue
        await tx
          .insert(chunkEmbeddings)
          .values({
            chunkId: row.id,
            embeddingModelId: model.id,
            dimensions: model.dimensions,
            embedding: vector,
            contentHash: row.content_hash,
          })
          .onConflictDoUpdate({
            target: [chunkEmbeddings.chunkId, chunkEmbeddings.embeddingModelId],
            set: {
              embedding: vector,
              contentHash: row.content_hash,
              createdAt: new Date(),
            },
          })
      }
    })
    console.info(
      `[kb:reembed] ${Math.min(start + batchSize, rows.length)}/${rows.length}`
    )
  }

  const index = await ingestion.store.ensureVectorIndex(model.id)
  console.info(
    `[kb:reembed] Indeks: ${index ?? "brak (wymiar > 4000, wyszukiwanie dokładne)"}`
  )
  await ingestion.store.ensureEmbeddingModel(embeddings.config, true)
  console.info(
    "[kb:reembed] Model aktywowany. Uruchom kb:verify, aby sprawdzić jakość wyszukiwania."
  )
})
