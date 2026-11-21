import { readFile } from "node:fs/promises"

import type { Database } from "@zpr/db/client"

import {
  chunkUnits,
  type ChunkDraft,
  type ChunkingOptions,
} from "../chunking/chunker"
import { extractDocument, formatFromPath, sha256 } from "../extract/extract"
import { normalizeDocument } from "../extract/normalize"
import type { DocumentFormat, NormalizedDocument } from "../extract/types"
import type { EmbeddingProvider } from "../embeddings/provider"
import { cosineSimilarity } from "../embeddings/provider"
import {
  mostRestrictiveAccess,
  mostRestrictiveRedistribution,
  type DocumentDefinition,
  type SourceDefinition,
} from "../sources/types"
import { parseGuideDocument } from "../structure/guide"
import { parseLegalDocument } from "../structure/legal"
import { toSearchText, toStemText } from "../text/search-text"
import { detectBenefitTags, detectCodes } from "../text/vocabulary"
import {
  KnowledgeStore,
  type ChunkRow,
  type Tx,
} from "../store/knowledge-store"
import { errorMessage, NonRetryableError, withRetry } from "../util/retry"

export type IngestionStage =
  | "register"
  | "extract"
  | "boundaries"
  | "normalize"
  | "chunk"
  | "embed"
  | "store"
  | "index"
  | "verify"

/**
 * Bump when extraction, normalisation, chunking or search-text rules change:
 * it is part of the document hash, so `kb:seed` reprocesses every document
 * (vectors of unchanged chunk text are reused).
 */
export const PIPELINE_VERSION = "2026.11.6"

export class RestrictedSourceError extends NonRetryableError {}
export class IngestionVerificationError extends NonRetryableError {}

export interface IngestRequest {
  source: SourceDefinition
  document: DocumentDefinition
  /** Raw content; or `filePath` to read it from disk. */
  content:
    | { bytes: Uint8Array; format: DocumentFormat }
    | { filePath: string; format?: DocumentFormat }
  /** Re-process even when the content hash is unchanged. */
  force?: boolean
}

export type IngestStatus =
  | "INGESTED"
  | "UPDATED"
  | "UNCHANGED"
  | "EMBEDDINGS_REFRESHED"
  | "DUPLICATE"
  | "REFUSED"
  | "FAILED"

export interface IngestResult {
  status: IngestStatus
  source: string
  documentKey: string
  version: string
  documentId?: string
  jobId?: string
  attempts: number
  chunks: number
  stats: Record<string, unknown>
  stages: Array<{ stage: IngestionStage; ms: number }>
  error?: string
}

export interface PipelineOptions {
  chunking?: Partial<ChunkingOptions>
  /** Attempts per document for transient failures (DB, embedding API). */
  retries?: number
  retryBaseDelayMs?: number
  log?: (message: string) => void
}

/** Exactly what is embedded: a context header (title › headings) + text. */
export function embeddingInput(
  documentTitle: string,
  draft: Pick<ChunkDraft, "headingPath" | "content">
): string {
  const header = [documentTitle, ...draft.headingPath].join(" › ")
  return `${header}\n\n${draft.content}`
}

function laterDate(
  a: string | null | undefined,
  b: string | null | undefined
): string | null {
  if (!a) return b ?? null
  if (!b) return a
  return a > b ? a : b
}

function earlierDate(
  a: string | null | undefined,
  b: string | null | undefined
): string | null {
  if (!a) return b ?? null
  if (!b) return a
  return a < b ? a : b
}

export function structureDocument(
  normalized: NormalizedDocument,
  definition: DocumentDefinition
) {
  return definition.parser === "legal"
    ? parseLegalDocument(normalized, {
        superscripts: definition.legal?.superscripts,
      })
    : parseGuideDocument(normalized)
}

/**
 * Turns one source document into chunk rows (stages 2–5). Pure apart from
 * reading the file, so it is unit-tested without a database.
 */
export async function prepareDocument(
  request: IngestRequest,
  chunking?: Partial<ChunkingOptions>
): Promise<{
  normalizedHash: string
  rawHash: string
  pageCount: number
  rows: Omit<ChunkRow, "id">[]
  stats: Record<string, unknown>
  timings: Array<{ stage: IngestionStage; ms: number }>
}> {
  const timings: Array<{ stage: IngestionStage; ms: number }> = []
  const time = async <T>(
    stage: IngestionStage,
    fn: () => Promise<T> | T
  ): Promise<T> => {
    const started = performance.now()
    const value = await fn()
    timings.push({ stage, ms: Math.round(performance.now() - started) })
    return value
  }
  const { document: definition, source } = request

  const extracted = await time("extract", async () => {
    if ("bytes" in request.content) {
      return extractDocument({
        format: request.content.format,
        bytes: request.content.bytes,
      })
    }
    const format =
      request.content.format ??
      definition.format ??
      formatFromPath(request.content.filePath)
    const bytes = new Uint8Array(await readFile(request.content.filePath))
    return extractDocument({ format, bytes })
  })
  if (extracted.pages.every((page) => page.text.trim().length === 0)) {
    throw new NonRetryableError(
      "No text could be extracted (scanned PDF without OCR?)"
    )
  }

  const normalized = await time("normalize", () =>
    normalizeDocument(extracted, {
      footnotes: definition.legal?.footnotes ?? false,
    })
  )
  const structured = await time("boundaries", () =>
    structureDocument(normalized, definition)
  )
  const drafts = await time("chunk", () =>
    chunkUnits(
      structured.units,
      { citationPrefix: definition.legal?.citationPrefix },
      { ...chunking, ...definition.chunking }
    )
  )

  const seen = new Set<string>()
  const rows: Omit<ChunkRow, "id">[] = []
  let duplicatesDropped = 0
  let outsideValidity = 0
  for (const draft of drafts) {
    const text = embeddingInput(definition.title, draft)
    const contentHash = sha256(text)
    if (seen.has(contentHash)) {
      duplicatesDropped += 1
      continue
    }
    seen.add(contentHash)
    const validFrom = laterDate(definition.effectiveFrom, draft.validFrom)
    const validTo = earlierDate(definition.effectiveTo, draft.validTo)
    if (validFrom && validTo && validFrom >= validTo) {
      outsideValidity += 1
      continue
    }
    const indexed = [
      draft.headingPath.join(" "),
      draft.sectionIdentifier,
      draft.legalReference,
      draft.content,
    ]
      .filter(Boolean)
      .join(" ")
    const tags = [
      ...new Set([
        ...(definition.tags ?? []),
        ...detectBenefitTags(`${draft.headingPath.join(" ")} ${draft.content}`),
      ]),
    ]
    rows.push({
      chunkIndex: rows.length,
      content: draft.content,
      sourceTitle: definition.title,
      sourceUrl: definition.sourceUrl ?? source.url ?? null,
      sourceType: source.sourceType,
      pageNumber: draft.pageStart,
      pageEnd: draft.pageEnd,
      sectionIdentifier: draft.sectionIdentifier,
      headingPath:
        draft.headingPath.length > 0 ? draft.headingPath.join(" › ") : null,
      legalReference: draft.legalReference,
      validFrom,
      validTo,
      contentHash,
      searchText: toSearchText(indexed),
      stemText: toStemText(indexed),
      tokenCount: draft.tokenCount,
      metadata: {
        kind: draft.kind,
        benefitTags: tags,
        codes: detectCodes(draft.content),
        ...draft.metadata,
      },
    })
  }

  return {
    normalizedHash: sha256(
      `${PIPELINE_VERSION}\n${JSON.stringify(chunking ?? {})}\n${normalized.lines.map((line) => line.text).join("\n")}`
    ),
    rawHash: extracted.rawHash,
    pageCount: normalized.pageCount,
    rows,
    stats: {
      pages: normalized.pageCount,
      units: structured.units.length,
      repealedSkipped: structured.stats.repealedSkipped,
      headings: structured.stats.headings,
      chunks: rows.length,
      duplicatesDropped,
      outsideValidity,
      ...normalized.stats,
      amendmentNotes: normalized.footnotes.size,
    },
    timings,
  }
}

export class IngestionPipeline {
  readonly store: KnowledgeStore

  constructor(
    db: Database,
    private readonly embeddings: EmbeddingProvider,
    private readonly options: PipelineOptions = {}
  ) {
    this.store = new KnowledgeStore(db)
  }

  private log(message: string) {
    this.options.log?.(message)
  }

  /** Ingests one document with retries; never throws. */
  async ingest(request: IngestRequest): Promise<IngestResult> {
    const base = {
      source: request.source.slug,
      documentKey: request.document.documentKey,
      version: request.document.version,
    }
    let attempts = 0
    try {
      return await withRetry(
        async (attempt) => {
          attempts = attempt
          return await this.ingestOnce(request, attempt)
        },
        {
          attempts: this.options.retries ?? 3,
          baseDelayMs: this.options.retryBaseDelayMs ?? 500,
          onRetry: (error, attempt, delay) =>
            this.log(
              `[kb] ${base.source}/${base.documentKey}@${base.version}: attempt ${attempt} failed (${errorMessage(error)}), retrying in ${delay} ms`
            ),
        }
      )
    } catch (error) {
      const refused = error instanceof RestrictedSourceError
      return {
        ...base,
        status: refused ? "REFUSED" : "FAILED",
        attempts,
        chunks: 0,
        stats: {},
        stages: [],
        error: errorMessage(error),
      }
    }
  }

  /** Ingests a batch sequentially; one failure does not stop the batch. */
  async ingestBatch(requests: IngestRequest[]): Promise<IngestResult[]> {
    const results: IngestResult[] = []
    for (const request of requests) {
      const result = await this.ingest(request)
      this.log(
        `[kb] ${result.status.padEnd(20)} ${result.source}/${result.documentKey}@${result.version} — ${result.chunks} chunks${result.error ? ` — ${result.error}` : ""}`
      )
      results.push(result)
    }
    return results
  }

  private async ingestOnce(
    request: IngestRequest,
    attempt: number
  ): Promise<IngestResult> {
    const { source, document: definition } = request
    const stages: Array<{ stage: IngestionStage; ms: number }> = []
    const base = {
      source: source.slug,
      documentKey: definition.documentKey,
      version: definition.version,
      attempts: attempt,
    }

    // 1. Register — and refuse restricted material before reading a byte.
    const access = mostRestrictiveAccess(
      source.accessLevel,
      definition.accessLevel
    )
    const redistribution = mostRestrictiveRedistribution(
      source.redistribution,
      definition.redistribution
    )
    if (access === "RESTRICTED" || redistribution === "PROHIBITED") {
      throw new RestrictedSourceError(
        `Source ${source.slug} is ${access}/${redistribution}; restricted material (e.g. ZUS sample cases) is never indexed.`
      )
    }
    if (definition.sourceSlug !== source.slug) {
      throw new NonRetryableError(
        `Document ${definition.documentKey} belongs to ${definition.sourceSlug}, not ${source.slug}`
      )
    }
    const started = performance.now()
    const { id: sourceId } = await this.store.upsertSource(source)
    const model = await this.store.ensureEmbeddingModel(
      this.embeddings.config,
      false
    )
    const stored = await this.store.createPendingDocument(sourceId, definition)
    stages.push({
      stage: "register",
      ms: Math.round(performance.now() - started),
    })
    const jobId = await this.store.startJob(stored.id, attempt, model.id)

    try {
      // 2–5. Extract, keep boundaries, normalise, chunk.
      await this.store.updateJob(jobId, { stage: "extract" })
      const prepared = await prepareDocument(request, this.options.chunking)
      stages.push(...prepared.timings)
      if (prepared.rows.length === 0)
        throw new NonRetryableError("Document produced no chunks")

      // Deduplication by source identifiers + content hash.
      const embedded = await this.store.embeddedChunks(stored.id, model.id)
      const existing = await this.store.activeChunks(this.store.db, stored.id)
      const unchanged =
        stored.status === "INDEXED" &&
        stored.contentHash === prepared.normalizedHash
      const newHashes = prepared.rows.map((row) => row.contentHash).sort()
      const oldHashes = existing.map((chunk) => chunk.contentHash).sort()
      const sameChunks =
        newHashes.length === oldHashes.length &&
        newHashes.every((hash, index) => hash === oldHashes[index])
      const allEmbedded =
        sameChunks &&
        existing.every((chunk) => embedded.get(chunk.id) === chunk.contentHash)
      if (unchanged && allEmbedded && !request.force) {
        await this.store.updateJob(jobId, {
          status: "SUCCEEDED",
          stage: "verify",
          finishedAt: new Date(),
          stats: { unchanged: true },
        })
        return {
          ...base,
          status: "UNCHANGED",
          documentId: stored.id,
          jobId,
          chunks: existing.length,
          stats: prepared.stats,
          stages,
        }
      }
      const duplicate = await this.store.findDuplicate(
        sourceId,
        prepared.normalizedHash,
        stored.id
      )
      if (duplicate && !request.force) {
        await this.store.updateJob(jobId, {
          status: "SUCCEEDED",
          stage: "chunk",
          finishedAt: new Date(),
          stats: { duplicateOf: duplicate.id },
        })
        await this.store.markDocumentFailed(
          stored.id,
          `Duplicate of ${duplicate.title}`
        )
        return {
          ...base,
          status: "DUPLICATE",
          documentId: stored.id,
          jobId,
          chunks: 0,
          stats: { duplicateOf: duplicate.id },
          stages,
        }
      }

      // Reuse chunk ids (and vectors) whose content did not change.
      const pool = new Map<string, string[]>()
      for (const chunk of existing)
        pool.set(chunk.contentHash, [
          ...(pool.get(chunk.contentHash) ?? []),
          chunk.id,
        ])
      const rows: ChunkRow[] = prepared.rows.map((row) => {
        const ids = pool.get(row.contentHash)
        const id = ids?.shift()
        return { ...row, id }
      })

      // 6. Embed only what has no current vector for this model.
      await this.store.updateJob(jobId, { stage: "embed" })
      const toEmbed = rows.filter(
        (row) => !(row.id && embedded.get(row.id) === row.contentHash)
      )
      let timer = performance.now()
      const vectors =
        toEmbed.length > 0
          ? await this.embeddings.embedDocument(
              toEmbed.map((row) =>
                embeddingInput(definition.title, {
                  headingPath: row.headingPath
                    ? row.headingPath.split(" › ")
                    : [],
                  content: row.content,
                })
              )
            )
          : []
      if (vectors.length !== toEmbed.length)
        throw new Error("Embedding count mismatch")
      const embeddingsByIndex = new Map<number, number[]>()
      toEmbed.forEach((row, index) => {
        const vector = vectors[index]
        if (vector) embeddingsByIndex.set(row.chunkIndex, vector)
      })
      stages.push({ stage: "embed", ms: Math.round(performance.now() - timer) })

      // 7. Store content, metadata and embeddings in one transaction; stage 9
      // (verify) runs before commit so a bad result never becomes live.
      await this.store.updateJob(jobId, { stage: "store" })
      timer = performance.now()
      const counts = await this.store.replaceChunks({
        // Probe with a chunk embedded in this run (reused chunks keep theirs).
        verify: (tx) =>
          this.verify(
            tx,
            stored.id,
            model.id,
            rows.length,
            toEmbed[0],
            vectors[0],
            definition.title
          ),
        documentId: stored.id,
        lockKey: `${source.slug}/${definition.documentKey}@${definition.version}`,
        rows,
        embeddings: embeddingsByIndex,
        model,
        document: {
          title: definition.title,
          documentType: definition.documentType,
          externalId: definition.externalId ?? null,
          sourceUrl: definition.sourceUrl ?? source.url ?? null,
          publishedAt: definition.publishedAt ?? null,
          effectiveFrom: definition.effectiveFrom ?? null,
          effectiveTo: definition.effectiveTo ?? null,
          contentHash: prepared.normalizedHash,
          rawHash: prepared.rawHash,
          pageCount: prepared.pageCount,
          storageKey:
            definition.origin.kind === "curated"
              ? `rag/knowledge/${definition.origin.path}`
              : `local:${definition.origin.fileName}`,
          accessLevel: definition.accessLevel ?? null,
          redistribution: definition.redistribution ?? null,
          metadata: {
            ...(definition.metadata ?? {}),
            tags: definition.tags ?? [],
            parser: definition.parser,
          },
        },
      })
      stages.push({ stage: "store", ms: Math.round(performance.now() - timer) })

      // 8. Build searchable indexes (FTS columns are generated; ANN per model).
      await this.store.updateJob(jobId, { stage: "index" })
      timer = performance.now()
      const indexName = await this.store.ensureVectorIndex(model.id)
      stages.push({ stage: "index", ms: Math.round(performance.now() - timer) })

      // 9. Activate the verified version and apply versioning rules.
      await this.store.updateJob(jobId, { stage: "verify" })
      timer = performance.now()
      await this.store.markIndexed(stored.id)
      const versioning = await this.store.applyVersioning({
        sourceId,
        documentKey: definition.documentKey,
        documentId: stored.id,
        effectiveFrom: definition.effectiveFrom ?? null,
        supersede: definition.supersedesPrevious ?? false,
      })
      stages.push({
        stage: "verify",
        ms: Math.round(performance.now() - timer),
      })

      const status: IngestStatus =
        stored.status !== "INDEXED"
          ? "INGESTED"
          : unchanged && counts.inserted === 0
            ? "EMBEDDINGS_REFRESHED"
            : "UPDATED"
      const stats = {
        ...prepared.stats,
        ...counts,
        indexName,
        versioning,
        model: model.name,
      }
      await this.store.updateJob(jobId, {
        status: "SUCCEEDED",
        chunksCreated: counts.inserted,
        finishedAt: new Date(),
        stats,
      })
      return {
        ...base,
        status,
        documentId: stored.id,
        jobId,
        chunks: rows.length,
        stats,
        stages,
      }
    } catch (error) {
      await this.store.updateJob(jobId, {
        status: "FAILED",
        error: errorMessage(error),
        finishedAt: new Date(),
      })
      await this.store.markDocumentFailed(stored.id, errorMessage(error))
      throw error
    }
  }

  private async verify(
    tx: Tx,
    documentId: string,
    modelId: string,
    expected: number,
    probe: ChunkRow | undefined,
    probeVector: number[] | undefined,
    title: string
  ): Promise<void> {
    const counts = await this.store.countActive(documentId, modelId, tx)
    if (counts.chunks !== expected) {
      throw new IngestionVerificationError(
        `Expected ${expected} active chunks, found ${counts.chunks}`
      )
    }
    if (counts.embedded !== expected || counts.stale > 0) {
      throw new IngestionVerificationError(
        `Embeddings incomplete: ${counts.embedded}/${expected} (stale ${counts.stale})`
      )
    }
    // Index/query compatibility: the query-side embedding of the stored text
    // must land next to the document-side vector.
    if (probe && probeVector) {
      const queryVector = await this.embeddings.embedQuery(
        embeddingInput(title, {
          headingPath: probe.headingPath ? probe.headingPath.split(" › ") : [],
          content: probe.content,
        })
      )
      const similarity = cosineSimilarity(queryVector, probeVector)
      if (similarity < 0.5) {
        throw new IngestionVerificationError(
          `Query/document embeddings disagree (cosine ${similarity.toFixed(3)})`
        )
      }
    }
  }
}
