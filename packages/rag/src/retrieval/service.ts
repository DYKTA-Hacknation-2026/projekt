import { sql, type SQL } from "drizzle-orm"

import type { Database } from "@zpr/db/client"

import type { RagConfig } from "../config"
import type { EmbeddingProvider } from "../embeddings/provider"
import { toVectorLiteral } from "../embeddings/provider"
import type {
  AccessLevel,
  RedistributionPolicy,
  SourceType,
} from "../sources/types"
import {
  KnowledgeStore,
  type EmbeddingModelRecord,
} from "../store/knowledge-store"
import { polishStem, searchTokens } from "../text/search-text"
import type { BenefitTag } from "../text/vocabulary"
import { fuse, type RankedCandidate } from "./fusion"
import {
  analyzeQuery,
  bm25,
  containsPhrase,
  idfFrom,
  stemCoverage,
  type AnalyzedQuery,
  type TermStatistics,
} from "./query"
import type { Reranker } from "./rerank"

export interface RetrievalRequest {
  /** Free-text question. Never a user profile record. */
  query: string
  /** Restrict to source slugs (e.g. ["kodeks-pracy"]). */
  sources?: string[]
  sourceTypes?: SourceType[]
  documentTypes?: string[]
  benefitTags?: BenefitTag[]
  /** Date the answer must be valid on (YYYY-MM-DD). Defaults to today. */
  asOf?: string
  limit?: number
  /** Minimum calibrated relevance 0–1; defaults to RETRIEVAL_MIN_RELEVANCE. */
  minRelevance?: number
}

export interface RetrievedChunk {
  id: string
  documentId: string
  content: string
  sourceId: string
  sourceSlug: string
  sourceTitle: string
  sourceType: SourceType
  sourceUrl: string | null
  documentTitle: string
  documentVersion: string
  documentType: string
  externalId: string | null
  headingPath: string | null
  pageNumber: number | null
  pageEnd: number | null
  sectionIdentifier: string | null
  legalReference: string | null
  /** Effective window of this chunk (document window ∩ provision window). */
  effectiveFrom: string | null
  effectiveTo: string | null
  accessLevel: AccessLevel
  redistribution: RedistributionPolicy
  authorityRank: number
  benefitTags: string[]
  relevance: {
    /** Fused rank score (RRF or weighted, × authority prior); only comparable within a query. */
    score: number
    /** Calibrated 0–1 evidence strength used for the threshold. */
    relevance: number
    vectorSimilarity: number | null
    lexicalScore: number | null
    coverage: number
    exactTerms: string[]
    ranks: {
      vector?: number
      lexical?: number
      exact?: number
      phrase?: number
    }
    rerankScore?: number
  }
}

export type NoEvidenceReason = "EMPTY_QUERY" | "NO_MATCH" | "BELOW_THRESHOLD"

export interface RetrievalResult {
  status: "OK" | "NO_EVIDENCE"
  query: {
    text: string
    redactions: AnalyzedQuery["redactions"]
    exactTerms: string[]
    benefitTags: BenefitTag[]
    expansions: string[]
    asOf: string
  }
  chunks: RetrievedChunk[]
  noEvidence?: { reason: NoEvidenceReason; message: string }
  diagnostics: {
    embeddingModel: { name: string; dimensions: number } | null
    vectorSearch: "OK" | "UNAVAILABLE"
    candidates: {
      vector: number
      lexical: number
      exact: number
      phrase: number
      fused: number
    }
    fusion: RagConfig["RETRIEVAL_FUSION"]
    reranker: string
    minRelevance: number
    latencyMs: number
  }
}

export interface RetrievalServiceOptions {
  /** Access levels this caller may read. RESTRICTED is always removed. */
  accessLevels: AccessLevel[]
  reranker?: Reranker
  today?: () => string
}

const NO_EVIDENCE_MESSAGES: Record<NoEvidenceReason, string> = {
  EMPTY_QUERY:
    "Pytanie jest zbyt ogólne, aby wyszukać przepisy. Doprecyzuj, o jaki zasiłek, urlop lub formularz chodzi.",
  NO_MATCH:
    "W bazie wiedzy nie ma fragmentu, który dotyczy tego pytania. Sprawdź informacje na zus.pl lub zapytaj w ZUS.",
  BELOW_THRESHOLD:
    "Znalezione fragmenty są zbyt słabo powiązane z pytaniem, aby na nich polegać. Doprecyzuj pytanie lub sprawdź informacje na zus.pl.",
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/
/** Max share of chunks containing a term for it to count as "exact". */
const EXACT_TERM_MAX_DF = 0.15
/** Kinds matched by the dedicated exact list; phrases are boosted in BM25. */
const EXACT_KINDS = new Set(["FORM", "DOCUMENT", "SYSTEM", "PROGRAM"])
const LEXICAL_POOL = 300

function warsawToday(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Warsaw" }).format(
    new Date()
  )
}

/**
 * Postgres array literal for one bound parameter. Drizzle would otherwise
 * expand a JS array into a tuple `($1, $2)`.
 */
export function pgArray(values: readonly string[]): string {
  return `{${values.map((value) => `"${value.replace(/["\\]/g, (char) => `\\${char}`)}"`).join(",")}}`
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value))
}

function dateString(value: unknown): string | null {
  if (value === null || value === undefined) return null
  if (value instanceof Date) return value.toISOString().slice(0, 10)
  return String(value).slice(0, 10)
}

/**
 * Typed hybrid retrieval over the knowledge base:
 * pgvector similarity + PostgreSQL full-text + exact domain-term phrases,
 * filtered by access level, source metadata and effective dates, fused with
 * RRF (or weighted scores), optionally reranked, thresholded on calibrated
 * relevance and diversified per section.
 */
export class RetrievalService {
  private readonly store: KnowledgeStore
  private model: EmbeddingModelRecord | null | undefined
  private readonly accessLevels: AccessLevel[]
  private termStats: { loadedAt: number; stats: TermStatistics } | null = null

  constructor(
    private readonly db: Database,
    private readonly embeddings: EmbeddingProvider,
    private readonly config: RagConfig,
    private readonly options: RetrievalServiceOptions
  ) {
    this.store = new KnowledgeStore(db)
    this.accessLevels = options.accessLevels.filter(
      (level) => level !== "RESTRICTED"
    )
    if (this.accessLevels.length === 0) this.accessLevels = ["PUBLIC"]
  }

  /** The model row matching the runtime provider configuration, if indexed. */
  async embeddingModel(): Promise<EmbeddingModelRecord | null> {
    if (this.model === undefined) {
      this.model = await this.store.findEmbeddingModel(this.embeddings.config)
    }
    return this.model
  }

  /** Document frequencies of stems over active chunks (cached 5 min). */
  async termStatistics(): Promise<TermStatistics> {
    if (this.termStats && Date.now() - this.termStats.loadedAt < 300_000)
      return this.termStats.stats
    const result = await this.db.execute(sql`
      SELECT word, ndoc FROM ts_stat($$
        SELECT c.stem_tsv FROM kb.knowledge_chunks c
        JOIN kb.knowledge_documents d ON d.id = c.document_id
        WHERE c.is_active AND d.status = 'INDEXED'
      $$)`)
    const countResult = await this.db.execute(sql`
      SELECT count(*)::int AS n,
             COALESCE(avg(array_length(string_to_array(c.stem_text, ' '), 1)), 0)::float8 AS avg_len
      FROM kb.knowledge_chunks c
      JOIN kb.knowledge_documents d ON d.id = c.document_id
      WHERE c.is_active AND d.status = 'INDEXED'`)
    const counts = countResult.rows[0] as
      { n: number; avg_len: number } | undefined
    const stats: TermStatistics = {
      documents: Number(counts?.n ?? 0),
      averageLength: Number(counts?.avg_len ?? 0),
      frequencies: new Map(
        (result.rows as Array<{ word: string; ndoc: number }>).map((row) => [
          row.word,
          Number(row.ndoc),
        ])
      ),
    }
    this.termStats = { loadedAt: Date.now(), stats }
    return stats
  }

  /** Drop caches after re-ingestion (tests, admin re-index). */
  invalidateCaches(): void {
    this.termStats = null
    this.model = undefined
  }

  private filters(request: RetrievalRequest, asOf: string): SQL {
    const parts: SQL[] = [
      sql`c.is_active`,
      sql`d.status = 'INDEXED'`,
      sql`GREATEST(s.access_level, COALESCE(d.access_level, s.access_level)) = ANY(${pgArray(this.accessLevels)}::kb.access_level[])`,
      sql`GREATEST(s.redistribution, COALESCE(d.redistribution, s.redistribution)) <> 'PROHIBITED'`,
      sql`(d.effective_from IS NULL OR d.effective_from <= ${asOf}::date)`,
      sql`(d.effective_to IS NULL OR d.effective_to > ${asOf}::date)`,
      sql`(c.valid_from IS NULL OR c.valid_from <= ${asOf}::date)`,
      sql`(c.valid_to IS NULL OR c.valid_to > ${asOf}::date)`,
    ]
    if (request.sources?.length)
      parts.push(sql`s.slug = ANY(${pgArray(request.sources)}::text[])`)
    if (request.sourceTypes?.length)
      parts.push(
        sql`s.source_type::text = ANY(${pgArray(request.sourceTypes)}::text[])`
      )
    if (request.documentTypes?.length)
      parts.push(
        sql`d.document_type = ANY(${pgArray(request.documentTypes)}::text[])`
      )
    if (request.benefitTags?.length)
      parts.push(
        sql`(c.metadata -> 'benefitTags') ?| ${pgArray(request.benefitTags)}::text[]`
      )
    return sql.join(parts, sql` AND `)
  }

  private async vectorCandidates(
    model: EmbeddingModelRecord,
    vector: number[],
    where: SQL,
    k: number
  ): Promise<RankedCandidate[]> {
    const dims = Math.trunc(model.dimensions)
    const type = dims <= 2000 ? "vector" : dims <= 4000 ? "halfvec" : "vector"
    const cast = sql.raw(`::${type}(${dims})`)
    const operator = sql.raw(
      model.distanceMetric === "L2"
        ? "<->"
        : model.distanceMetric === "INNER_PRODUCT"
          ? "<#>"
          : "<=>"
    )
    const literal = toVectorLiteral(vector)
    const score =
      model.distanceMetric === "L2"
        ? sql`1 / (1 + (e.embedding${cast} ${operator} ${literal}${cast}))`
        : model.distanceMetric === "INNER_PRODUCT"
          ? sql`-(e.embedding${cast} ${operator} ${literal}${cast})`
          : sql`1 - (e.embedding${cast} ${operator} ${literal}${cast})`

    return this.db.transaction(async (tx) => {
      // pgvector ≥ 0.8: keep scanning the HNSW graph until enough rows pass
      // the metadata/date filters.
      await tx.execute(sql`SET LOCAL hnsw.iterative_scan = relaxed_order`)
      await tx.execute(
        sql.raw(`SET LOCAL hnsw.ef_search = ${Math.max(40, k * 2)}`)
      )
      const result = await tx.execute(sql`
        SELECT c.id, (${score})::float8 AS score
        FROM kb.chunk_embeddings e
        JOIN kb.knowledge_chunks c ON c.id = e.chunk_id
        JOIN kb.knowledge_documents d ON d.id = c.document_id
        JOIN kb.knowledge_sources s ON s.id = d.source_id
        WHERE e.embedding_model_id = ${model.id} AND ${where}
        ORDER BY e.embedding${cast} ${operator} ${literal}${cast}
        LIMIT ${k}`)
      return (result.rows as Array<{ id: string; score: number }>).map(
        (row, index) => ({
          chunkId: row.id,
          rank: index + 1,
          score: Number(row.score),
        })
      )
    })
  }

  /**
   * Keyword candidates: the GIN index finds chunks sharing any query stem;
   * BM25 (with a bonus for exact multi-word phrases such as "urlop
   * rodzicielski") ranks them.
   */
  private async lexicalCandidates(
    query: AnalyzedQuery,
    stats: TermStatistics,
    where: SQL,
    k: number
  ): Promise<{
    ranked: RankedCandidate[]
    phrase: RankedCandidate[]
    phraseMatches: Map<string, string[]>
  }> {
    if (!query.lexicalQuery)
      return { ranked: [], phrase: [], phraseMatches: new Map() }
    const result = await this.db.execute(sql`
      SELECT c.id, c.stem_text
      FROM kb.knowledge_chunks c
      JOIN kb.knowledge_documents d ON d.id = c.document_id
      JOIN kb.knowledge_sources s ON s.id = d.source_id
      CROSS JOIN (SELECT to_tsquery('simple', ${query.lexicalQuery}) AS query) q
      WHERE c.stem_tsv @@ q.query AND ${where}
      ORDER BY ts_rank_cd(c.stem_tsv, q.query) DESC, c.id
      LIMIT ${LEXICAL_POOL}`)
    const phrases = query.exactTerms
      .filter((term) => !EXACT_KINDS.has(term.kind))
      .map((term) => ({
        term: term.term,
        stems: searchTokens(term.term).map(polishStem),
      }))
    const phraseMatches = new Map<string, string[]>()
    const scored = (
      result.rows as Array<{ id: string; stem_text: string }>
    ).map((row) => {
      let score = bm25(query.stems, row.stem_text, stats)
      const matched = phrases.filter((phrase) =>
        containsPhrase(row.stem_text, phrase.stems)
      )
      if (matched.length > 0) {
        phraseMatches.set(
          row.id,
          matched.map((phrase) => phrase.term)
        )
        score *= 1 + 0.25 * matched.length
      }
      return { chunkId: row.id, score }
    })
    scored.sort(
      (a, b) => b.score - a.score || a.chunkId.localeCompare(b.chunkId)
    )
    return {
      ranked: scored
        .slice(0, k)
        .map((entry, index) => ({ ...entry, rank: index + 1 })),
      phrase: scored
        .filter((entry) => phraseMatches.has(entry.chunkId))
        .slice(0, k)
        .map((entry, index) => ({ ...entry, rank: index + 1 })),
      phraseMatches,
    }
  }

  private async exactCandidates(
    terms: AnalyzedQuery["exactTerms"],
    lexicalQuery: string | null,
    where: SQL,
    k: number
  ): Promise<{ ranked: RankedCandidate[]; matches: Map<string, string[]> }> {
    if (terms.length === 0) return { ranked: [], matches: new Map() }
    const names = terms.map((term) => term.term)
    const queries = terms.map((term) => term.tsquery)
    // Ties between chunks containing the same terms are broken by how well
    // the rest of the question matches, not by id.
    const tieBreak = lexicalQuery
      ? sql`max(ts_rank_cd(c.stem_tsv, to_tsquery('simple', ${lexicalQuery}), 32))`
      : sql`0`
    const result = await this.db.execute(sql`
      SELECT c.id, array_agg(t.name ORDER BY t.name) AS terms, count(*)::int AS hits, ${tieBreak} AS tie
      FROM kb.knowledge_chunks c
      JOIN kb.knowledge_documents d ON d.id = c.document_id
      JOIN kb.knowledge_sources s ON s.id = d.source_id
      CROSS JOIN unnest(${pgArray(names)}::text[], ${pgArray(queries)}::text[]) AS t(name, q)
      WHERE c.stem_tsv @@ to_tsquery('simple', t.q) AND ${where}
      GROUP BY c.id
      ORDER BY hits DESC, tie DESC, c.id
      LIMIT ${k}`)
    const rows = result.rows as Array<{
      id: string
      terms: string[]
      hits: number
    }>
    return {
      ranked: rows.map((row, index) => ({
        chunkId: row.id,
        rank: index + 1,
        score: row.hits,
      })),
      matches: new Map(rows.map((row) => [row.id, row.terms])),
    }
  }

  private async details(
    ids: string[]
  ): Promise<Map<string, Record<string, unknown>>> {
    if (ids.length === 0) return new Map()
    const result = await this.db.execute(sql`
      SELECT
        c.id, c.document_id, c.content, c.stem_text, c.heading_path, c.page_number, c.page_end,
        c.section_identifier, c.legal_reference, c.source_url AS chunk_url, c.metadata,
        GREATEST(COALESCE(c.valid_from, d.effective_from), d.effective_from) AS effective_from,
        LEAST(COALESCE(c.valid_to, d.effective_to), d.effective_to) AS effective_to,
        d.title AS document_title, d.version, d.document_type, d.external_id, d.source_url AS document_url,
        s.id AS source_id, s.slug, s.title AS source_title, s.source_type, s.url AS source_url, s.authority_rank,
        GREATEST(s.access_level, COALESCE(d.access_level, s.access_level))::text AS access_level,
        GREATEST(s.redistribution, COALESCE(d.redistribution, s.redistribution))::text AS redistribution
      FROM kb.knowledge_chunks c
      JOIN kb.knowledge_documents d ON d.id = c.document_id
      JOIN kb.knowledge_sources s ON s.id = d.source_id
      WHERE c.id = ANY(${pgArray(ids)}::uuid[])`)
    return new Map(
      (result.rows as Array<Record<string, unknown>>).map((row) => [
        String(row.id),
        row,
      ])
    )
  }

  async search(request: RetrievalRequest): Promise<RetrievalResult> {
    const started = performance.now()
    const asOf =
      request.asOf && ISO_DATE.test(request.asOf)
        ? request.asOf
        : (this.options.today ?? warsawToday)()
    const limit = Math.max(1, Math.min(20, Math.trunc(request.limit ?? 6)))
    const minRelevance =
      request.minRelevance ?? this.config.RETRIEVAL_MIN_RELEVANCE
    const query = analyzeQuery(request.query)
    const k = this.config.RETRIEVAL_CANDIDATES
    const model = await this.embeddingModel()

    const base: Omit<RetrievalResult, "status" | "chunks" | "diagnostics"> & {
      diagnostics: Omit<
        RetrievalResult["diagnostics"],
        "latencyMs" | "candidates"
      >
    } = {
      query: {
        text: query.text,
        redactions: query.redactions,
        exactTerms: query.exactTerms.map((term) => term.term),
        benefitTags: query.benefitTags,
        expansions: query.expansions,
        asOf,
      },
      diagnostics: {
        embeddingModel: model
          ? { name: model.name, dimensions: model.dimensions }
          : null,
        vectorSearch: model ? "OK" : "UNAVAILABLE",
        fusion: this.config.RETRIEVAL_FUSION,
        reranker: this.options.reranker?.name ?? "none",
        minRelevance,
      },
    }
    const finish = (
      status: RetrievalResult["status"],
      chunks: RetrievedChunk[],
      candidates: RetrievalResult["diagnostics"]["candidates"],
      reason?: NoEvidenceReason
    ): RetrievalResult => ({
      ...base,
      status,
      chunks,
      noEvidence: reason
        ? { reason, message: NO_EVIDENCE_MESSAGES[reason] }
        : undefined,
      diagnostics: {
        ...base.diagnostics,
        candidates,
        latencyMs: Math.round(performance.now() - started),
      },
    })

    if (query.stems.length === 0 && query.exactTerms.length === 0) {
      return finish(
        "NO_EVIDENCE",
        [],
        { vector: 0, lexical: 0, exact: 0, phrase: 0, fused: 0 },
        "EMPTY_QUERY"
      )
    }

    const where = this.filters(request, asOf)
    const stats = await this.termStatistics()
    const idf = idfFrom(stats)
    // Exact matching boosts discriminative terms (codes such as ZAM or
    // Z-3a). A phrase present in a large share of the corpus ("zasiłek
    // macierzyński") is left to ranked keyword search.
    const discriminative = query.exactTerms
      .filter((term) => EXACT_KINDS.has(term.kind))
      .filter((term) => {
        const frequencies = searchTokens(term.term).map(
          (token) => stats.frequencies.get(polishStem(token)) ?? 0
        )
        const df = frequencies.length > 0 ? Math.min(...frequencies) : 0
        return (
          stats.documents === 0 || df / stats.documents <= EXACT_TERM_MAX_DF
        )
      })
    const [vector, lexical, exact] = await Promise.all([
      model
        ? this.embeddings
            .embedQuery(query.embeddingText)
            .then((embedding) =>
              this.vectorCandidates(model, embedding, where, k)
            )
        : Promise.resolve([] as RankedCandidate[]),
      this.lexicalCandidates(query, stats, where, k),
      this.exactCandidates(discriminative, query.lexicalQuery, where, k),
    ])

    const fused = fuse(
      {
        vector,
        lexical: lexical.ranked,
        exact: exact.ranked,
        phrase: lexical.phrase,
      },
      {
        strategy: this.config.RETRIEVAL_FUSION,
        k: this.config.RETRIEVAL_RRF_K,
        weights: {
          vector: this.config.RETRIEVAL_WEIGHT_VECTOR,
          lexical: this.config.RETRIEVAL_WEIGHT_LEXICAL,
          exact: this.config.RETRIEVAL_WEIGHT_EXACT,
          phrase: this.config.RETRIEVAL_WEIGHT_PHRASE,
        },
      }
    )
    const candidates = {
      vector: vector.length,
      lexical: lexical.ranked.length,
      exact: exact.ranked.length,
      phrase: lexical.phrase.length,
      fused: fused.length,
    }
    if (fused.length === 0)
      return finish("NO_EVIDENCE", [], candidates, "NO_MATCH")

    const pool = fused.slice(0, Math.max(limit * 4, 20))
    const rows = await this.details(pool.map((candidate) => candidate.chunkId))
    const floor = this.config.RETRIEVAL_VECTOR_FLOOR
    const ceiling = this.config.RETRIEVAL_VECTOR_CEILING

    let scored = pool.flatMap((candidate) => {
      const row = rows.get(candidate.chunkId)
      if (!row) return []
      const vectorSimilarity = candidate.scores.vector ?? null
      const coverage = stemCoverage(
        query.stems,
        String(row.stem_text ?? ""),
        idf
      )
      const exactTerms = exact.matches.get(candidate.chunkId) ?? []
      const phraseTerms = lexical.phraseMatches.get(candidate.chunkId) ?? []
      const vectorRelevance =
        vectorSimilarity === null
          ? 0
          : clamp01((vectorSimilarity - floor) / (ceiling - floor))
      let relevance = model ? 0.5 * coverage + 0.5 * vectorRelevance : coverage
      if (exactTerms.length > 0) relevance = Math.max(relevance + 0.3, 0.5)
      const authority = Number(row.authority_rank ?? 0) / 100
      const rankScore =
        candidate.fusedScore *
        (1 + this.config.RETRIEVAL_AUTHORITY_WEIGHT * authority)
      return [
        {
          candidate,
          row,
          vectorSimilarity,
          coverage,
          exactTerms: [...exactTerms, ...phraseTerms],
          relevance: clamp01(relevance),
          rankScore,
        },
      ]
    })
    scored.sort(
      (a, b) =>
        b.rankScore - a.rankScore ||
        a.candidate.chunkId.localeCompare(b.candidate.chunkId)
    )

    if (this.options.reranker) {
      const rerankScores = await this.options.reranker.rerank(
        query.embeddingText,
        scored.map(({ row }) => ({
          id: String(row.id),
          content: String(row.content),
          headingPath: row.heading_path ? String(row.heading_path) : null,
          stemText: String(row.stem_text ?? ""),
        }))
      )
      scored = scored
        .map((entry, index) => ({
          ...entry,
          rerankScore: rerankScores[index] ?? 0,
        }))
        .sort(
          (a, b) =>
            (b.rerankScore ?? 0) - (a.rerankScore ?? 0) ||
            b.rankScore - a.rankScore
        )
    }

    const passing = scored.filter((entry) => entry.relevance >= minRelevance)
    if (passing.length === 0)
      return finish("NO_EVIDENCE", [], candidates, "BELOW_THRESHOLD")

    // Diversity: at most N chunks from one article / section of a document.
    const perSection = new Map<string, number>()
    const selected: typeof passing = []
    for (const entry of passing) {
      const metadata = (entry.row.metadata ?? {}) as { article?: string }
      const key = `${entry.row.document_id}:${metadata.article ?? entry.row.section_identifier ?? entry.row.heading_path ?? ""}`
      const count = perSection.get(key) ?? 0
      if (count >= this.config.RETRIEVAL_MAX_PER_SECTION) continue
      perSection.set(key, count + 1)
      selected.push(entry)
      if (selected.length >= limit) break
    }

    const chunks: RetrievedChunk[] = selected.map(
      ({
        candidate,
        row,
        vectorSimilarity,
        coverage,
        exactTerms,
        relevance,
        rankScore,
        ...rest
      }) => {
        const metadata = (row.metadata ?? {}) as { benefitTags?: string[] }
        return {
          id: String(row.id),
          documentId: String(row.document_id),
          content: String(row.content),
          sourceId: String(row.source_id),
          sourceSlug: String(row.slug),
          sourceTitle: String(row.source_title),
          sourceType: String(row.source_type) as SourceType,
          sourceUrl: (row.chunk_url ??
            row.document_url ??
            row.source_url ??
            null) as string | null,
          documentTitle: String(row.document_title),
          documentVersion: String(row.version),
          documentType: String(row.document_type),
          externalId: (row.external_id ?? null) as string | null,
          headingPath: (row.heading_path ?? null) as string | null,
          pageNumber:
            row.page_number === null || row.page_number === undefined
              ? null
              : Number(row.page_number),
          pageEnd:
            row.page_end === null || row.page_end === undefined
              ? null
              : Number(row.page_end),
          sectionIdentifier: (row.section_identifier ?? null) as string | null,
          legalReference: (row.legal_reference ?? null) as string | null,
          effectiveFrom: dateString(row.effective_from),
          effectiveTo: dateString(row.effective_to),
          accessLevel: String(row.access_level) as AccessLevel,
          redistribution: String(row.redistribution) as RedistributionPolicy,
          authorityRank: Number(row.authority_rank ?? 0),
          benefitTags: metadata.benefitTags ?? [],
          relevance: {
            score: Number(rankScore.toFixed(6)),
            relevance: Number(relevance.toFixed(4)),
            vectorSimilarity:
              vectorSimilarity === null
                ? null
                : Number(vectorSimilarity.toFixed(4)),
            lexicalScore: candidate.scores.lexical ?? null,
            coverage: Number(coverage.toFixed(4)),
            exactTerms,
            ranks: candidate.ranks,
            rerankScore:
              "rerankScore" in rest
                ? Number((rest.rerankScore as number).toFixed(4))
                : undefined,
          },
        }
      }
    )

    return finish("OK", chunks, candidates)
  }
}
