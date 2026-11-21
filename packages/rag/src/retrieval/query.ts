import {
  buildOrTsQuery,
  buildPhraseTsQuery,
  queryStems,
} from "../text/search-text"
import {
  detectBenefitTags,
  detectDomainTerms,
  expandSynonyms,
  type BenefitTag,
  type DomainTerm,
} from "../text/vocabulary"

export interface Redaction {
  kind: "PESEL" | "NIP" | "ACCOUNT" | "EMAIL" | "PHONE" | "ID_CARD"
  count: number
}

const PII_PATTERNS: Array<{
  kind: Redaction["kind"]
  pattern: RegExp
  token: string
}> = [
  { kind: "EMAIL", pattern: /[\w.+-]+@[\w-]+\.[\w.-]+/g, token: "[email]" },
  {
    kind: "ACCOUNT",
    pattern: /\b(?:PL)?\d{2}(?:[ -]?\d{4}){6}\b/gi,
    token: "[rachunek]",
  },
  { kind: "PESEL", pattern: /\b\d{11}\b/g, token: "[PESEL]" },
  { kind: "NIP", pattern: /\b\d{3}-?\d{3}-?\d{2}-?\d{2}\b/g, token: "[NIP]" },
  {
    kind: "PHONE",
    pattern: /(?:\+48[ -]?)?\b\d{3}[ -]?\d{3}[ -]?\d{3}\b/g,
    token: "[telefon]",
  },
  { kind: "ID_CARD", pattern: /\b[A-Z]{3}\s?\d{6}\b/g, token: "[dowód]" },
]

/**
 * Removes personal identifiers before the query reaches the embedding
 * provider or the database. Retrieval accepts only free text and non-PII
 * filters — never a user profile record.
 */
export function sanitizeQuery(
  raw: string,
  maxLength = 500
): { text: string; redactions: Redaction[] } {
  let text = raw
    .normalize("NFC")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength)
  const redactions: Redaction[] = []
  for (const { kind, pattern, token } of PII_PATTERNS) {
    let count = 0
    text = text.replace(pattern, () => {
      count += 1
      return token
    })
    if (count > 0) redactions.push({ kind, count })
  }
  return { text, redactions }
}

export interface AnalyzedQuery {
  original: string
  text: string
  redactions: Redaction[]
  /** Text given to the embedding model (query + synonym expansions). */
  embeddingText: string
  stems: string[]
  lexicalQuery: string | null
  exactTerms: Array<DomainTerm & { tsquery: string }>
  benefitTags: BenefitTag[]
  expansions: string[]
}

export function analyzeQuery(raw: string): AnalyzedQuery {
  const { text, redactions } = sanitizeQuery(raw)
  // Placeholders of redacted identifiers carry no meaning for search.
  const searchable = text
    .replace(/\[(email|rachunek|PESEL|NIP|telefon|dowód)\]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
  const expansions = expandSynonyms(searchable)
  const expanded = [searchable, ...expansions].join(" ")
  const stems = queryStems(expanded)
  const exactTerms = detectDomainTerms(expanded)
    .map((term) => ({ ...term, tsquery: buildPhraseTsQuery(term.term) }))
    .filter(
      (term): term is DomainTerm & { tsquery: string } => term.tsquery !== null
    )

  return {
    original: raw,
    text,
    redactions,
    embeddingText:
      expansions.length > 0
        ? `${searchable} (${expansions.join("; ")})`
        : searchable,
    stems,
    lexicalQuery: buildOrTsQuery(stems),
    exactTerms,
    benefitTags: detectBenefitTags(expanded),
    expansions,
  }
}

/**
 * Share of the query's information found in the chunk (0–1). Each stem is
 * weighted by its inverse document frequency, so matching only common words
 * ("2026", "przepis", "rok") does not count as evidence. Stems absent from
 * the knowledge base get the highest weight.
 */
export function stemCoverage(
  queryStemsList: string[],
  chunkStemText: string,
  idf?: (stem: string) => number
): number {
  if (queryStemsList.length === 0) return 0
  const tokens = new Set(chunkStemText.split(" "))
  const weight = idf ?? (() => 1)
  let total = 0
  let hits = 0
  for (const stem of queryStemsList) {
    const w = weight(stem)
    total += w
    if (tokens.has(stem)) hits += w
  }
  return total === 0 ? 0 : hits / total
}

export interface TermStatistics {
  documents: number
  /** Average number of stem tokens per chunk (BM25 length normalisation). */
  averageLength: number
  frequencies: Map<string, number>
}

/** Does `stemText` contain the stems of `phrase` as a contiguous sequence? */
export function containsPhrase(
  stemText: string,
  phraseStems: string[]
): boolean {
  if (phraseStems.length === 0) return false
  return ` ${stemText} `.includes(` ${phraseStems.join(" ")} `)
}

/**
 * Okapi BM25 over the chunk's stem tokens. Postgres finds candidates with
 * the GIN index; this ranks them with corpus statistics, which ts_rank_cd
 * does not use (it favours chunks repeating one common word).
 */
export function bm25(
  queryStemsList: string[],
  stemText: string,
  stats: TermStatistics,
  k1 = 1.2,
  b = 0.75
): number {
  const tokens = stemText.split(" ").filter(Boolean)
  const counts = new Map<string, number>()
  for (const token of tokens) counts.set(token, (counts.get(token) ?? 0) + 1)
  const lengthNorm =
    1 - b + b * (tokens.length / Math.max(1, stats.averageLength))
  let score = 0
  for (const stem of new Set(queryStemsList)) {
    const tf = counts.get(stem) ?? 0
    if (tf === 0) continue
    const df = stats.frequencies.get(stem) ?? 0
    const idf = Math.log(1 + (stats.documents - df + 0.5) / (df + 0.5))
    score += idf * ((tf * (k1 + 1)) / (tf + k1 * lengthNorm))
  }
  return score
}

export function idfFrom(stats: TermStatistics): (stem: string) => number {
  return (stem) =>
    Math.log(1 + stats.documents / (1 + (stats.frequencies.get(stem) ?? 0)))
}
