/**
 * Reproducible local knowledge base.
 *
 *   pnpm --filter @zpr/rag kb:seed                 # curated, committed sources
 *   pnpm --filter @zpr/rag kb:seed --with-local    # + competition PDFs from
 *                                                  #   KB_LOCAL_SOURCES_DIR
 *   pnpm --filter @zpr/rag kb:seed --local-dir <dir> --force
 *
 * Idempotent: unchanged documents are skipped (status UNCHANGED).
 */
import { existsSync } from "node:fs"
import path from "node:path"
import { parseArgs } from "node:util"

import { cliArgs } from "./args"

import { and, eq, sql } from "drizzle-orm"

import { knowledgeDocuments } from "@zpr/db/schema"

import type { IngestRequest } from "../ingest/pipeline"
import { DOCUMENTS, SOURCES, findSource } from "../sources/manifest"
import { resolveLocalDocuments } from "../sources/local"
import {
  curatedRequest,
  localSourcesDir,
  openRuntime,
  printResults,
  run,
} from "./common"
import { verifyKnowledgeBase } from "./verify"

const { values } = parseArgs({
  args: cliArgs(),
  options: {
    "with-local": { type: "boolean", default: false },
    "local-dir": { type: "string" },
    force: { type: "boolean", default: false },
    "skip-verify": { type: "boolean", default: false },
  },
})

run("kb:seed", async () => {
  const runtime = openRuntime()
  const { ingestion, embeddings, db } = runtime
  console.info(
    `[kb:seed] Embedding: ${embeddings.config.provider}/${embeddings.config.model} (${embeddings.config.dimensions} wymiarów)`
  )

  // Stage 1 for every source, including RESTRICTED ones, so the registry
  // (and the refusal policy) is visible in the admin panel.
  for (const source of SOURCES) await ingestion.store.upsertSource(source)
  const model = await ingestion.store.ensureEmbeddingModel(
    embeddings.config,
    true
  )
  console.info(`[kb:seed] Aktywny model: ${model.name}`)

  // Older versions first, so temporal chaining sees them in order.
  const curated = DOCUMENTS.filter((doc) => doc.origin.kind === "curated").sort(
    (a, b) => (a.effectiveFrom ?? "").localeCompare(b.effectiveFrom ?? "")
  )
  const requests: IngestRequest[] = curated.map((doc) =>
    curatedRequest(doc, values.force)
  )

  const localDir = localSourcesDir(values["local-dir"])
  if (values["with-local"] || values["local-dir"]) {
    if (!existsSync(localDir)) {
      console.warn(
        `[kb:seed] Katalog ${localDir} nie istnieje — pomijam źródła lokalne.`
      )
    } else {
      const local = await resolveLocalDocuments(localDir, DOCUMENTS)
      for (const entry of local.resolved) {
        const source = findSource(entry.definition.sourceSlug)
        if (!source) continue
        console.info(
          `[kb:seed] Lokalnie: ${path.basename(entry.filePath)} → ${entry.definition.sourceSlug}/${entry.definition.documentKey} (${entry.matchedBy})`
        )
        requests.push({
          source,
          document: entry.definition,
          content: { filePath: entry.filePath },
          force: values.force,
        })
      }
      for (const file of local.unmatchedFiles) {
        console.info(
          `[kb:seed] Pomijam nierozpoznany plik (nie jest w manifeście): ${path.basename(file)}`
        )
      }
      for (const missing of local.missing) {
        console.info(
          `[kb:seed] Brak lokalnego pliku dla ${missing.sourceSlug}/${missing.documentKey}`
        )
      }
    }
  }

  const results = await ingestion.ingestBatch(requests)
  printResults(results)

  // Documents written by the pre-pipeline demo seed are archived, not deleted.
  const archived = await db
    .update(knowledgeDocuments)
    .set({ status: "ARCHIVED", updatedAt: new Date() })
    .where(
      and(
        sql`${knowledgeDocuments.metadata} ->> 'seeded' = 'true'`,
        eq(knowledgeDocuments.status, "INDEXED")
      )
    )
    .returning({ id: knowledgeDocuments.id })
  if (archived.length > 0)
    console.info(
      `[kb:seed] Zarchiwizowano ${archived.length} dokument(y) ze starego seeda.`
    )

  const failed = results.filter(
    (result) => result.status === "FAILED" || result.status === "REFUSED"
  )
  if (!values["skip-verify"]) {
    const report = await verifyKnowledgeBase(runtime, {
      minRecall: 0.8,
      quiet: false,
    })
    if (!report.ok) return 1
  }
  return failed.length > 0 ? 1 : 0
})
