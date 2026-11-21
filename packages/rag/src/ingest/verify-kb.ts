import { readFile } from "node:fs/promises"

import { sql } from "drizzle-orm"

import type { Database } from "@zpr/db/client"

import type { EmbeddingProvider } from "../embeddings/provider"
import type {
  RetrievalRequest,
  RetrievalService,
  RetrievedChunk,
} from "../retrieval/service"
import { KnowledgeStore } from "../store/knowledge-store"

export interface EvalCase {
  id: string
  query: string
  asOf?: string
  k?: number
  filters?: Pick<RetrievalRequest, "sources" | "sourceTypes" | "benefitTags">
  expect:
    | { noEvidence: true }
    | {
        /** Pass when any of the top-k chunks matches any matcher. */
        anyOf: Array<{
          legalReferencePrefix?: string
          sourceSlug?: string
          contentIncludes?: string
          notContentIncludes?: string
        }>
      }
}

export interface VerificationReport {
  ok: boolean
  integrity: Array<{ check: string; ok: boolean; detail: string }>
  evals: {
    total: number
    passed: number
    recall: number
    failures: Array<{ id: string; detail: string }>
  }
}

export async function loadEvalCases(filePath: string): Promise<EvalCase[]> {
  const text = await readFile(filePath, "utf8")
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("//"))
    .map((line) => JSON.parse(line) as EvalCase)
}

function matches(
  chunk: RetrievedChunk,
  matcher: Extract<EvalCase["expect"], { anyOf: unknown }>["anyOf"][number]
): boolean {
  if (
    matcher.legalReferencePrefix &&
    !(chunk.legalReference ?? "").startsWith(matcher.legalReferencePrefix)
  )
    return false
  if (matcher.sourceSlug && chunk.sourceSlug !== matcher.sourceSlug)
    return false
  if (
    matcher.contentIncludes &&
    !chunk.content.toLowerCase().includes(matcher.contentIncludes.toLowerCase())
  )
    return false
  if (
    matcher.notContentIncludes &&
    chunk.content
      .toLowerCase()
      .includes(matcher.notContentIncludes.toLowerCase())
  )
    return false
  return true
}

/**
 * Stage 9 at knowledge-base level: integrity invariants plus a small
 * retrieval eval set (recall@k and correct no-evidence answers).
 */
export async function verifyKnowledgeBase(input: {
  db: Database
  embeddings: EmbeddingProvider
  retrieval: RetrievalService
  evalCases: EvalCase[]
  minRecall: number
}): Promise<VerificationReport> {
  const store = new KnowledgeStore(input.db)
  const integrity: VerificationReport["integrity"] = []
  const model = await store.findEmbeddingModel(input.embeddings.config)
  integrity.push({
    check: "embedding-model",
    ok: Boolean(model),
    detail: model
      ? model.name
      : "Brak modelu dla bieżącej konfiguracji EMBEDDING_* — uruchom kb:seed lub kb:reembed",
  })

  const restricted = await input.db.execute(sql`
    SELECT count(*)::int AS n FROM kb.knowledge_chunks c
    JOIN kb.knowledge_documents d ON d.id = c.document_id
    JOIN kb.knowledge_sources s ON s.id = d.source_id
    WHERE c.is_active AND (s.access_level = 'RESTRICTED' OR d.access_level = 'RESTRICTED' OR s.redistribution = 'PROHIBITED')`)
  const restrictedCount = Number(
    (restricted.rows[0] as { n: number } | undefined)?.n ?? 0
  )
  integrity.push({
    check: "no-restricted-content",
    ok: restrictedCount === 0,
    detail: `${restrictedCount} fragmentów z zastrzeżonych źródeł`,
  })

  if (model) {
    const coverage = await input.db.execute(sql`
      SELECT d.title, count(c.id)::int AS chunks, count(e.chunk_id)::int AS embedded,
             count(*) FILTER (WHERE e.chunk_id IS NOT NULL AND e.content_hash <> c.content_hash)::int AS stale
      FROM kb.knowledge_documents d
      JOIN kb.knowledge_chunks c ON c.document_id = d.id AND c.is_active
      LEFT JOIN kb.chunk_embeddings e ON e.chunk_id = c.id AND e.embedding_model_id = ${model.id}
      WHERE d.status = 'INDEXED'
      GROUP BY d.id, d.title`)
    const rows = coverage.rows as Array<{
      title: string
      chunks: number
      embedded: number
      stale: number
    }>
    const incomplete = rows.filter(
      (row) => row.embedded !== row.chunks || row.stale > 0
    )
    integrity.push({
      check: "embeddings-complete",
      ok: rows.length > 0 && incomplete.length === 0,
      detail:
        rows.length === 0
          ? "Brak zaindeksowanych dokumentów"
          : incomplete.length === 0
            ? `${rows.length} dokumentów kompletnych`
            : `Niekompletne: ${incomplete.map((row) => row.title).join(", ")}`,
    })
    const index = await input.db.execute(sql`
      SELECT 1 FROM pg_indexes WHERE schemaname = 'kb' AND indexname = ${`chunk_embeddings_hnsw_${model.id.replace(/-/g, "")}`}`)
    integrity.push({
      check: "vector-index",
      ok: index.rows.length > 0 || model.dimensions > 4000,
      detail: index.rows.length > 0 ? "HNSW gotowy" : "Brak indeksu HNSW",
    })
  }

  const failures: VerificationReport["evals"]["failures"] = []
  let passed = 0
  for (const testCase of input.evalCases) {
    const result = await input.retrieval.search({
      query: testCase.query,
      asOf: testCase.asOf,
      limit: testCase.k ?? 6,
      ...testCase.filters,
    })
    if ("noEvidence" in testCase.expect) {
      if (result.status === "NO_EVIDENCE") passed += 1
      else
        failures.push({
          id: testCase.id,
          detail: `oczekiwano braku dowodów, zwrócono ${result.chunks.length} (top: ${result.chunks[0]?.legalReference ?? result.chunks[0]?.sectionIdentifier ?? "?"}, rel ${result.chunks[0]?.relevance.relevance})`,
        })
      continue
    }
    const expectation = testCase.expect
    const hit = result.chunks.some((chunk) =>
      expectation.anyOf.some((matcher) => matches(chunk, matcher))
    )
    if (hit) passed += 1
    else
      failures.push({
        id: testCase.id,
        detail: `${result.status}; top: ${result.chunks
          .slice(0, 3)
          .map((chunk) => chunk.legalReference ?? chunk.sectionIdentifier)
          .join(" | ")}`,
      })
  }
  const total = input.evalCases.length
  const recall = total === 0 ? 1 : passed / total
  return {
    ok: integrity.every((check) => check.ok) && recall >= input.minRecall,
    integrity,
    evals: { total, passed, recall, failures },
  }
}
