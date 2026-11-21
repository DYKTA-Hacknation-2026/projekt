/**
 * Ingest (or re-ingest) documents registered in the manifest.
 *
 *   pnpm --filter @zpr/rag kb:ingest --document kodeks-pracy/dzial-osmy@2026
 *   pnpm --filter @zpr/rag kb:ingest --document ustawa-zasilkowa/wyciag-zus-2026@2026-854 --file ./ustawa.pdf
 *   pnpm --filter @zpr/rag kb:ingest --source zus-formularze [--force]
 *   pnpm --filter @zpr/rag kb:ingest --all [--force]
 *
 * New sources and versions are added to src/sources/manifest.ts first, so the
 * access policy and effective dates are reviewed in code.
 */
import path from "node:path"
import { parseArgs } from "node:util"

import { cliArgs } from "./args"

import type { IngestRequest } from "../ingest/pipeline"
import { DOCUMENTS, findSource } from "../sources/manifest"
import { resolveLocalDocuments } from "../sources/local"
import {
  curatedRequest,
  localSourcesDir,
  openRuntime,
  printResults,
  run,
} from "./common"

const { values } = parseArgs({
  args: cliArgs(),
  options: {
    document: { type: "string" },
    source: { type: "string" },
    all: { type: "boolean", default: false },
    file: { type: "string" },
    force: { type: "boolean", default: false },
    "local-dir": { type: "string" },
  },
})

run("kb:ingest", async () => {
  const selected = DOCUMENTS.filter((doc) => {
    if (values.all) return true
    if (values.document)
      return (
        `${doc.sourceSlug}/${doc.documentKey}@${doc.version}` ===
        values.document
      )
    if (values.source) return doc.sourceSlug === values.source
    return false
  })
  if (selected.length === 0) {
    console.error(
      "Nie wybrano dokumentu. Użyj --document <źródło>/<klucz>@<wersja>, --source <slug> albo --all."
    )
    console.error("Dostępne dokumenty:")
    for (const doc of DOCUMENTS)
      console.error(
        `  ${doc.sourceSlug}/${doc.documentKey}@${doc.version} (${doc.origin.kind})`
      )
    return 1
  }
  if (values.file && selected.length !== 1)
    throw new Error("--file wymaga dokładnie jednego --document")

  const runtime = openRuntime()
  await runtime.ingestion.store.ensureEmbeddingModel(
    runtime.embeddings.config,
    true
  )
  const requests: IngestRequest[] = []
  const needLocal =
    selected.some((doc) => doc.origin.kind === "local") && !values.file
  const local = needLocal
    ? await resolveLocalDocuments(
        localSourcesDir(values["local-dir"]),
        selected
      )
    : null

  for (const doc of selected) {
    const source = findSource(doc.sourceSlug)
    if (!source) throw new Error(`Nieznane źródło ${doc.sourceSlug}`)
    if (values.file) {
      requests.push({
        source,
        document: doc,
        content: { filePath: path.resolve(values.file) },
        force: values.force,
      })
    } else if (doc.origin.kind === "curated") {
      requests.push(curatedRequest(doc, values.force))
    } else {
      const entry = local?.resolved.find(
        (candidate) => candidate.definition === doc
      )
      if (!entry) {
        console.warn(
          `[kb:ingest] Brak pliku dla ${doc.sourceSlug}/${doc.documentKey} w ${localSourcesDir(values["local-dir"])}`
        )
        continue
      }
      requests.push({
        source,
        document: doc,
        content: { filePath: entry.filePath },
        force: values.force,
      })
    }
  }

  const results = await runtime.ingestion.ingestBatch(requests)
  printResults(results)
  return results.some(
    (result) => result.status === "FAILED" || result.status === "REFUSED"
  )
    ? 1
    : 0
})
