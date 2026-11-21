import type { ChunkingOptions } from "../chunking/chunker"
import type { DocumentFormat } from "../extract/types"
import type { BenefitTag } from "../text/vocabulary"

export type SourceType =
  | "LEGAL_ACT"
  | "GUIDE"
  | "TASK_DOCUMENT"
  | "WEB_PAGE"
  | "FORM_TEMPLATE"
  | "INTERNAL"
  | "OFFICIAL_GUIDANCE"
  | "BENEFIT_TABLE"
  | "FORM_INSTRUCTION"
  | "GOVERNMENT_PAGE"
  | "CHARITY_RESOURCE"

export type AccessLevel = "PUBLIC" | "INTERNAL" | "RESTRICTED"
export type RedistributionPolicy =
  "ALLOWED" | "ATTRIBUTION" | "CITATION_ONLY" | "PROHIBITED"

export const ACCESS_ORDER: AccessLevel[] = ["PUBLIC", "INTERNAL", "RESTRICTED"]
export const REDISTRIBUTION_ORDER: RedistributionPolicy[] = [
  "ALLOWED",
  "ATTRIBUTION",
  "CITATION_ONLY",
  "PROHIBITED",
]

export function mostRestrictiveAccess(
  ...levels: Array<AccessLevel | null | undefined>
): AccessLevel {
  return levels.reduce<AccessLevel>(
    (acc, level) =>
      level && ACCESS_ORDER.indexOf(level) > ACCESS_ORDER.indexOf(acc)
        ? level
        : acc,
    "PUBLIC"
  )
}

export function mostRestrictiveRedistribution(
  ...policies: Array<RedistributionPolicy | null | undefined>
): RedistributionPolicy {
  return policies.reduce<RedistributionPolicy>(
    (acc, policy) =>
      policy &&
      REDISTRIBUTION_ORDER.indexOf(policy) > REDISTRIBUTION_ORDER.indexOf(acc)
        ? policy
        : acc,
    "ALLOWED"
  )
}

export interface SourceDefinition {
  slug: string
  title: string
  publisher: string
  sourceType: SourceType
  url?: string
  description?: string
  /** PUBLIC: anyone; INTERNAL: project/demo only; RESTRICTED: never indexed. */
  accessLevel: AccessLevel
  redistribution: RedistributionPolicy
  /** Precedence when sources disagree: statute 100 > regulation 90 > ZUS 70 … */
  authorityRank: number
  metadata?: Record<string, unknown>
}

export type DocumentOrigin =
  /** Committed, redistributable text under `packages/rag/knowledge/`. */
  | { kind: "curated"; path: string }
  /**
   * A file provided locally (e.g. competition PDFs) and never committed.
   * Resolved in KB_LOCAL_SOURCES_DIR by file name or by `detect` phrases
   * found on the first pages.
   */
  | { kind: "local"; fileName: string; detect: string[] }

export interface DocumentDefinition {
  sourceSlug: string
  /** Stable key of the logical document inside the source. */
  documentKey: string
  title: string
  /** Version label; a new label creates a new document version. */
  version: string
  documentType: string
  externalId?: string
  sourceUrl?: string
  publishedAt?: string
  /** First day the content applies (ISO date). */
  effectiveFrom?: string
  /** First day the content no longer applies (exclusive, ISO date). */
  effectiveTo?: string
  parser: "legal" | "guide"
  legal?: {
    citationPrefix: string
    superscripts?: boolean
    footnotes?: boolean
  }
  format?: DocumentFormat
  origin: DocumentOrigin
  /** More restrictive overrides of the source policy. */
  accessLevel?: AccessLevel
  redistribution?: RedistributionPolicy
  /**
   * `true`: older versions of this document key stop being retrievable.
   * Default: versions are temporal and coexist; an open-ended older version
   * is closed at the new version's `effectiveFrom`.
   */
  supersedesPrevious?: boolean
  tags?: BenefitTag[]
  chunking?: Partial<ChunkingOptions>
  metadata?: Record<string, unknown>
}
