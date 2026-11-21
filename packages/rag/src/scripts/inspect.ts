/**
 * Dry run of stages 2–5 (extract → boundaries → normalise → chunk) without a
 * database. Use it before adding a source to check how a file is split.
 *
 *   pnpm --filter @zpr/rag kb:inspect <file> [--parser legal|guide]
 *     [--prefix U] [--superscripts] [--footnotes] [--full] [--json]
 */
import path from "node:path"
import { parseArgs } from "node:util"

import { cliArgs } from "./args"

import { chunkingFromConfig, parseRagConfig } from "../config"
import { prepareDocument } from "../ingest/pipeline"
import { DOCUMENTS, findSource } from "../sources/manifest"
import type { DocumentDefinition, SourceDefinition } from "../sources/types"

const { values, positionals } = parseArgs({
  args: cliArgs(),
  allowPositionals: true,
  options: {
    parser: { type: "string" },
    prefix: { type: "string" },
    superscripts: { type: "boolean", default: false },
    footnotes: { type: "boolean", default: false },
    document: { type: "string" },
    full: { type: "boolean", default: false },
    json: { type: "boolean", default: false },
  },
})

async function main(): Promise<void> {
  const file = positionals[0]
  if (!file)
    throw new Error(
      "Usage: kb:inspect <file> [--parser legal|guide] [--document <source>/<key>@<version>]"
    )

  let definition: DocumentDefinition | undefined
  if (values.document) {
    definition = DOCUMENTS.find(
      (doc) =>
        `${doc.sourceSlug}/${doc.documentKey}@${doc.version}` ===
        values.document
    )
    if (!definition)
      throw new Error(`Unknown manifest document ${values.document}`)
  }
  definition ??= {
    sourceSlug: "inspect",
    documentKey: path.basename(file),
    title: path.basename(file),
    version: "inspect",
    documentType: "INSPECT",
    parser: values.parser === "legal" ? "legal" : "guide",
    legal:
      values.parser === "legal"
        ? {
            citationPrefix: values.prefix ?? "",
            superscripts: values.superscripts,
            footnotes: values.footnotes,
          }
        : undefined,
    origin: { kind: "local", fileName: path.basename(file), detect: [] },
  }
  const source: SourceDefinition = findSource(definition.sourceSlug) ?? {
    slug: "inspect",
    title: "inspect",
    publisher: "-",
    sourceType: "INTERNAL",
    accessLevel: "INTERNAL",
    redistribution: "CITATION_ONLY",
    authorityRank: 0,
  }

  const prepared = await prepareDocument(
    { source, document: definition, content: { filePath: file } },
    chunkingFromConfig(parseRagConfig())
  )

  if (values.json) {
    console.info(JSON.stringify(prepared, null, 2))
    return
  }
  console.info(`# ${file}`)
  console.info(prepared.stats)
  for (const row of prepared.rows) {
    const pages =
      row.pageNumber === row.pageEnd
        ? `p.${row.pageNumber}`
        : `p.${row.pageNumber}–${row.pageEnd}`
    const validity =
      row.validFrom || row.validTo
        ? ` [${row.validFrom ?? "…"} → ${row.validTo ?? "…"})`
        : ""
    console.info(
      `\n--- #${row.chunkIndex} ${pages} ${row.tokenCount} tok  ${row.legalReference ?? row.sectionIdentifier ?? ""}${validity}`
    )
    if (row.headingPath) console.info(`    ${row.headingPath}`)
    const text = values.full
      ? row.content
      : row.content.slice(0, 240).replace(/\n/g, " ⏎ ")
    console.info(
      `    ${text}${!values.full && row.content.length > 240 ? "…" : ""}`
    )
  }
}

main().catch((error: unknown) => {
  console.error("[kb:inspect]", error instanceof Error ? error.message : error)
  process.exit(1)
})
