/**
 *   pnpm --filter @zpr/rag kb:verify [--min-recall 0.8] [--evals evals/retrieval.jsonl]
 *
 * Integrity checks (model, embeddings, HNSW index, no restricted content)
 * and the retrieval eval set. Exits 1 when a check fails or recall is low.
 */
import path from "node:path"
import { fileURLToPath } from "node:url"
import { parseArgs } from "node:util"

import { cliArgs } from "./args"

import {
  loadEvalCases,
  verifyKnowledgeBase as verify,
} from "../ingest/verify-kb"
import { PACKAGE_ROOT, openRuntime, run } from "./common"

export async function verifyKnowledgeBase(
  runtime: ReturnType<typeof openRuntime>,
  options: { minRecall: number; quiet: boolean; evalsPath?: string }
) {
  const evalCases = await loadEvalCases(
    options.evalsPath ?? path.join(PACKAGE_ROOT, "evals/retrieval.jsonl")
  )
  runtime.retrieval.invalidateCaches()
  const report = await verify({
    ...runtime,
    evalCases,
    minRecall: options.minRecall,
  })
  console.info("\n[kb:verify] Integralność:")
  for (const check of report.integrity)
    console.info(
      `  ${check.ok ? "✓" : "✗"} ${check.check.padEnd(24)} ${check.detail}`
    )
  console.info(
    `[kb:verify] Ewaluacja wyszukiwania: ${report.evals.passed}/${report.evals.total} (recall ${(report.evals.recall * 100).toFixed(0)}%, próg ${(options.minRecall * 100).toFixed(0)}%)`
  )
  for (const failure of report.evals.failures)
    console.info(`  ✗ ${failure.id}: ${failure.detail}`)
  console.info(report.ok ? "[kb:verify] OK" : "[kb:verify] NIEPOWODZENIE")
  return report
}

const isMain =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isMain) {
  const { values } = parseArgs({
    args: cliArgs(),
    options: {
      "min-recall": { type: "string", default: "0.8" },
      evals: { type: "string" },
    },
  })
  run("kb:verify", async () => {
    const runtime = openRuntime()
    const report = await verifyKnowledgeBase(runtime, {
      minRecall: Number(values["min-recall"]),
      quiet: false,
      evalsPath: values.evals ? path.resolve(values.evals) : undefined,
    })
    return report.ok ? 0 : 1
  })
}
