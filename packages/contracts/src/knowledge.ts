import { z } from "zod"

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Data w formacie RRRR-MM-DD")

/** Comma-separated query-string lists (`?source=a,b`) or repeated arrays. */
const list = <T extends string>(item: z.ZodType<T>) =>
  z.preprocess(
    (value) =>
      value === undefined || value === ""
        ? undefined
        : (Array.isArray(value) ? value : String(value).split(","))
            .map((part) => String(part).trim())
            .filter(Boolean),
    z.array(item).max(20).optional()
  )

export const knowledgeSourceTypes = [
  "LEGAL_ACT",
  "GUIDE",
  "TASK_DOCUMENT",
  "WEB_PAGE",
  "FORM_TEMPLATE",
  "INTERNAL",
  "OFFICIAL_GUIDANCE",
  "BENEFIT_TABLE",
  "FORM_INSTRUCTION",
  "GOVERNMENT_PAGE",
  "CHARITY_RESOURCE",
] as const

export const benefitTags = [
  "SICKNESS",
  "MATERNITY",
  "PARENTAL",
  "PATERNITY",
  "SUPPLEMENTARY",
  "CARE",
  "CHILDCARE_LEAVE",
  "ADOPTION",
  "FOSTER",
  "LOSS",
  "ZA_ZYCIEM",
  "PREGNANCY",
  "FORMS",
  "SUPPORT",
  "CONTRIBUTIONS",
] as const

/**
 * Retrieval request. Only free text and non-personal filters are accepted —
 * never a user profile record. Personal identifiers in `q` are redacted
 * before embedding and search.
 */
export const knowledgeSearchSchema = z.object({
  q: z
    .string()
    .trim()
    .min(2, "Zapytanie musi mieć co najmniej 2 znaki")
    .max(500),
  limit: z.coerce.number().int().min(1).max(20).default(6),
  /** Date the answer must be valid on (e.g. the expected birth date). */
  asOf: isoDate.optional(),
  /** Source slugs, e.g. `kodeks-pracy,ustawa-zasilkowa`. */
  source: list(z.string().regex(/^[a-z0-9-]+$/)),
  sourceType: list(z.enum(knowledgeSourceTypes)),
  tag: list(z.enum(benefitTags)),
  /** Minimum calibrated relevance 0–1. */
  minRelevance: z.coerce.number().min(0).max(1).optional(),
})

export const knowledgeRelevanceSchema = z.object({
  score: z.number(),
  relevance: z.number(),
  vectorSimilarity: z.number().nullable(),
  lexicalScore: z.number().nullable(),
  coverage: z.number(),
  exactTerms: z.array(z.string()),
  ranks: z.object({
    vector: z.number().optional(),
    lexical: z.number().optional(),
    exact: z.number().optional(),
    phrase: z.number().optional(),
  }),
  rerankScore: z.number().optional(),
})

export const knowledgeChunkResultSchema = z.object({
  id: z.uuid(),
  documentId: z.uuid(),
  content: z.string(),
  sourceId: z.uuid(),
  sourceSlug: z.string(),
  sourceTitle: z.string(),
  sourceType: z.string(),
  sourceUrl: z.string().nullable(),
  documentTitle: z.string(),
  documentVersion: z.string(),
  externalId: z.string().nullable(),
  headingPath: z.string().nullable(),
  pageNumber: z.number().nullable(),
  pageEnd: z.number().nullable(),
  sectionIdentifier: z.string().nullable(),
  legalReference: z.string().nullable(),
  /** Effective window of the chunk (document ∩ provision). */
  validFrom: z.string().nullable(),
  validTo: z.string().nullable(),
  accessLevel: z.enum(["PUBLIC", "INTERNAL"]),
  /** ALLOWED/ATTRIBUTION: may be quoted; CITATION_ONLY: cite, do not quote. */
  redistribution: z.enum(["ALLOWED", "ATTRIBUTION", "CITATION_ONLY"]),
  authorityRank: z.number(),
  benefitTags: z.array(z.string()),
  score: z.number(),
  relevance: knowledgeRelevanceSchema,
})

export const knowledgeSearchResultSchema = z.object({
  status: z.enum(["OK", "NO_EVIDENCE"]),
  query: z.string(),
  asOf: z.string(),
  exactTerms: z.array(z.string()),
  redactions: z.array(z.object({ kind: z.string(), count: z.number() })),
  noEvidence: z
    .object({
      reason: z.enum(["EMPTY_QUERY", "NO_MATCH", "BELOW_THRESHOLD"]),
      message: z.string(),
    })
    .nullable(),
  embeddingModel: z
    .object({ name: z.string(), provider: z.string(), dimensions: z.number() })
    .nullable(),
  results: z.array(knowledgeChunkResultSchema),
})

export type KnowledgeSearchInput = z.infer<typeof knowledgeSearchSchema>
export type KnowledgeChunkResult = z.infer<typeof knowledgeChunkResultSchema>
export type KnowledgeSearchResult = z.infer<typeof knowledgeSearchResultSchema>
