/**
 * Debug retrieval from the terminal.
 *
 *   pnpm --filter @zpr/rag kb:search "urlop rodzicielski Za życiem" [--as-of 2027-02-01]
 *     [--source kodeks-pracy] [--limit 6] [--min 0.3] [--public] [--json]
 */
import { parseArgs } from "node:util"

import { cliArgs } from "./args"

import { getEnv } from "@zpr/contracts/env"
import { getDatabaseConnection } from "@zpr/db/client"

import { createRagRuntime } from "../index"
import { run } from "./common"

const { values, positionals } = parseArgs({
  args: cliArgs(),
  allowPositionals: true,
  options: {
    "as-of": { type: "string" },
    source: { type: "string", multiple: true },
    limit: { type: "string", default: "6" },
    min: { type: "string" },
    public: { type: "boolean", default: false },
    json: { type: "boolean", default: false },
  },
})

run("kb:search", async () => {
  const query = positionals.join(" ")
  if (!query) throw new Error('Usage: kb:search "<pytanie>"')
  const { db } = getDatabaseConnection()
  const { retrieval } = createRagRuntime({
    db,
    env: getEnv(),
    accessLevels: values.public ? ["PUBLIC"] : ["PUBLIC", "INTERNAL"],
  })
  const result = await retrieval.search({
    query,
    asOf: values["as-of"],
    sources: values.source,
    limit: Number(values.limit),
    minRelevance: values.min === undefined ? undefined : Number(values.min),
  })
  if (values.json) {
    console.info(JSON.stringify(result, null, 2))
    return
  }
  console.info(
    `status=${result.status} asOf=${result.query.asOf} exact=[${result.query.exactTerms.join(", ")}] tags=[${result.query.benefitTags.join(", ")}]`
  )
  console.info(
    `candidates=${JSON.stringify(result.diagnostics.candidates)} ${result.diagnostics.latencyMs} ms`
  )
  if (result.noEvidence)
    console.info(
      `NO_EVIDENCE ${result.noEvidence.reason}: ${result.noEvidence.message}`
    )
  for (const [index, chunk] of result.chunks.entries()) {
    const r = chunk.relevance
    console.info(
      `\n[S${index + 1}] rel=${r.relevance} score=${r.score} vec=${r.vectorSimilarity} cov=${r.coverage} ranks=${JSON.stringify(r.ranks)} exact=[${r.exactTerms.join(",")}]`
    )
    console.info(
      `     ${chunk.sourceSlug} · ${chunk.documentTitle} · ${chunk.legalReference ?? chunk.sectionIdentifier ?? ""} · s. ${chunk.pageNumber ?? "-"} · ${chunk.accessLevel}/${chunk.redistribution} · od ${chunk.effectiveFrom ?? "-"} do ${chunk.effectiveTo ?? "-"}`
    )
    console.info(`     ${chunk.content.slice(0, 200).replace(/\n/g, " ⏎ ")}…`)
  }
})
