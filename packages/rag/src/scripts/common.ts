import "dotenv/config"

import path from "node:path"
import { fileURLToPath } from "node:url"

import { getEnv } from "@zpr/contracts/env"
import { closeDatabase, getDatabaseConnection } from "@zpr/db/client"

import { createRagRuntime, type RagRuntime } from "../index"
import type { IngestRequest, IngestResult } from "../ingest/pipeline"
import { findSource } from "../sources/manifest"
import type { DocumentDefinition } from "../sources/types"

const here = path.dirname(fileURLToPath(import.meta.url))
export const PACKAGE_ROOT = path.resolve(here, "../..")
export const KNOWLEDGE_ROOT = path.join(PACKAGE_ROOT, "knowledge")
export const REPO_ROOT = path.resolve(PACKAGE_ROOT, "../..")
/** Default for KB_LOCAL_SOURCES_DIR; git-ignored (fixtures/private/). */
export const DEFAULT_LOCAL_DIR = path.join(
  REPO_ROOT,
  "fixtures/private/sources"
)

export function openRuntime(): RagRuntime & {
  db: ReturnType<typeof getDatabaseConnection>["db"]
} {
  const env = getEnv()
  const { db } = getDatabaseConnection()
  // Scripts operate on the whole KB, so they may read INTERNAL documents.
  const runtime = createRagRuntime({
    db,
    env,
    accessLevels: ["PUBLIC", "INTERNAL"],
    log: (message) => console.info(message),
  })
  return { ...runtime, db }
}

export function localSourcesDir(override?: string): string {
  return path.resolve(
    override ?? getEnv().KB_LOCAL_SOURCES_DIR ?? DEFAULT_LOCAL_DIR
  )
}

export function curatedRequest(
  definition: DocumentDefinition,
  force = false
): IngestRequest {
  if (definition.origin.kind !== "curated")
    throw new Error(`${definition.documentKey} is not curated`)
  const source = findSource(definition.sourceSlug)
  if (!source) throw new Error(`Unknown source ${definition.sourceSlug}`)
  return {
    source,
    document: definition,
    content: { filePath: path.join(KNOWLEDGE_ROOT, definition.origin.path) },
    force,
  }
}

export function printResults(results: IngestResult[]): void {
  console.info(
    "\nStatus               Dokument                                              Fragmenty"
  )
  for (const result of results) {
    console.info(
      `${result.status.padEnd(20)} ${`${result.source}/${result.documentKey}@${result.version}`.padEnd(54)} ${String(result.chunks).padStart(4)}${result.error ? `  ✗ ${result.error}` : ""}`
    )
  }
}

export async function run(
  name: string,
  main: () => Promise<number | void>
): Promise<void> {
  try {
    const code = (await main()) ?? 0
    await closeDatabase()
    process.exit(code)
  } catch (error) {
    // Never print query parameters (vectors, document text) in full.
    const cause =
      error instanceof Error && error.cause instanceof Error
        ? ` — ${error.cause.message}`
        : ""
    const message =
      error instanceof Error
        ? error.message.split("\nparams:")[0]?.slice(0, 600)
        : String(error)
    console.error(`[${name}] FAILED: ${message}${cause}`)
    await closeDatabase()
    process.exit(1)
  }
}
