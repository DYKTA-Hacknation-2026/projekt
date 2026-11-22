import { z } from "zod"

import type { engine } from "@zpr/domain"

import { isoDateSchema, uuidSchema } from "./common"
import { caseProfileSchema, type CaseProfileComparison } from "./case-profile"
import type { AssessmentRequest } from "./engine"

/**
 * Document upload, extraction and confirmation contracts (FR-PRD-06,
 * FR-DEMO-01/02, AD-08). Extraction is deterministic first; every field keeps
 * its provenance and confidence and must be confirmed by the user before it
 * reaches the engine.
 */

export const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024
/** Uploaded files and their extraction records are purged after this time. */
export const DOCUMENT_TTL_HOURS = 24
/** Consent kind required by `POST /documents` (database-design §2.3 `consents.kind`). */
export const DOCUMENT_PROCESSING_CONSENT = "DOCUMENT_PROCESSING" as const

export const documentFormCodeSchema = z.enum([
  "ZAM",
  "Z-3",
  "Z-3a",
  "ZAS-12",
  "ZAS-53",
  "POSWIADCZENIE",
  "ZUR",
  "ZAO",
  "Z-3b",
  "UNKNOWN",
])
export type DocumentFormCode = z.infer<typeof documentFormCodeSchema>

/** Forms withdrawn on 24.10.2026 (LR-05: ZUR + ZAO → ZAM, Z-3b abolished). */
export const LEGACY_FORM_CODES = ["ZUR", "ZAO", "Z-3b"] as const satisfies readonly DocumentFormCode[]

export const extractionMethodSchema = z.enum(["ACROFORM", "TEMPLATE", "OCR", "LLM_ASSISTED", "DEMO"])
export type ExtractionMethod = z.infer<typeof extractionMethodSchema>

export const documentStatusSchema = z.enum([
  "UPLOADED",
  "EXTRACTING",
  "NEEDS_REVIEW",
  "CONFIRMED",
  "FAILED",
  "DELETED",
])
export type DocumentStatus = z.infer<typeof documentStatusSchema>

export const fieldSourceSchema = z.enum(["ACROFORM", "TEMPLATE", "OCR", "LLM", "USER"])
export type FieldSource = z.infer<typeof fieldSourceSchema>

export const documentOriginSchema = z.enum(["USER_UPLOAD", "SAMPLE_CASE"])
export type DocumentOrigin = z.infer<typeof documentOriginSchema>

/**
 * Stable keys that map confirmed fields onto `AssessmentRequest`. Integration
 * never relies on Polish labels.
 */
export const semanticKeySchema = z.enum([
  "firstName",
  "lastName",
  "pesel",
  "birthDate",
  "parentRole",
  "employmentType",
  "sicknessInsurance",
  "insuranceStartDate",
  "insuranceEndDate",
  "payerSize",
  "monthlyBasisGrosze",
  "grossMonthlyGrosze",
  "eventKind",
  "expectedDueDate",
  "eventDate",
  "childrenCount",
  "benefitKind",
  "benefitPeriodStart",
  "benefitPeriodEnd",
  "flatRateApplication",
  "documentDate",
  "attachments",
])
export type SemanticKey = z.infer<typeof semanticKeySchema>

export const basisKindSchema = z.enum(["GROSS", "NET_BASIS"])
export type BasisKind = z.infer<typeof basisKindSchema>

export const fieldTypeSchema = z.enum(["TEXT", "DATE", "MONEY", "INTEGER", "ENUM", "BOOLEAN"])
export type FieldType = z.infer<typeof fieldTypeSchema>

export const bboxSchema = z.object({
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
})

export const extractedFieldSchema = z.object({
  key: z.string().min(1).max(80),
  label: z.string().min(1).max(200),
  /** Normalised value as text: ISO date, grosze as integer string, enum code… Empty = not read. */
  value: z.string().max(500),
  /** Value as read from the document, before normalisation. */
  rawValue: z.string().max(500).optional(),
  type: fieldTypeSchema.default("TEXT"),
  /** Extraction confidence 0–1. Never reset when the user edits the value. */
  confidence: z.number().min(0).max(1),
  source: fieldSourceSchema,
  page: z.number().int().min(1).optional(),
  bbox: bboxSchema.optional(),
  userEdited: z.boolean().default(false),
  confirmed: z.boolean().default(false),
  required: z.boolean().default(false),
  /** Below the review threshold, or proposed by an LLM: the UI highlights it. */
  needsReview: z.boolean().default(false),
  semanticKey: semanticKeySchema.optional(),
  basisKind: basisKindSchema.optional(),
  /** Allowed codes for ENUM fields, with Polish labels. */
  options: z.array(z.object({ value: z.string(), label: z.string() })).optional(),
})
export type ExtractedField = z.infer<typeof extractedFieldSchema>

export const findingSeveritySchema = z.enum(["ERROR", "WARNING", "INFO"])
export type FindingSeverity = z.infer<typeof findingSeveritySchema>

export const validationFindingSchema = z.object({
  severity: findingSeveritySchema,
  code: z.string().min(1).max(60),
  message: z.string().min(1).max(600),
  legalBasis: z.string().max(200).optional(),
  fieldKey: z.string().max(80).optional(),
  ruleId: z.string().max(20).optional(),
})
export type ValidationFinding = z.infer<typeof validationFindingSchema>

export const documentExtractionSchema = z.object({
  documentId: uuidSchema,
  extractionId: uuidSchema.optional(),
  status: documentStatusSchema,
  detectedForm: documentFormCodeSchema,
  formTitle: z.string(),
  /** True for ZUR, ZAO and Z-3b (withdrawn 24.10.2026, LR-05). */
  legacyForm: z.boolean(),
  /** Other forms found on later pages, e.g. a Z-3 attached to ZAM. */
  attachments: z.array(documentFormCodeSchema).default([]),
  /** Detection evidence, e.g. "nagłówek: ZAŚWIADCZENIE PŁATNIKA SKŁADEK Z-3". */
  detectionSignals: z.array(z.string()),
  extractionMethod: extractionMethodSchema,
  /** Overall confidence: the lowest confidence among required fields that were read. */
  confidence: z.number().min(0).max(1),
  fields: z.array(extractedFieldSchema),
  findings: z.array(validationFindingSchema),
  pages: z.number().int().min(0),
  hasTextLayer: z.boolean(),
  origin: documentOriginSchema,
  sampleCaseId: z.string().optional(),
  ruleSetVersion: z.string().optional(),
  detectedAt: z.string(),
  /** Always true: no value reaches a calculation before the user confirms it. */
  requiresConfirmation: z.literal(true),
  /** Extraction ran locally; the file was not sent to an external AI provider. */
  processedLocally: z.boolean(),
})
export type DocumentExtraction = z.infer<typeof documentExtractionSchema>

export const documentMetaSchema = z.object({
  documentId: uuidSchema,
  status: documentStatusSchema,
  origin: documentOriginSchema,
  sampleCaseId: z.string().optional(),
  mime: z.literal("application/pdf"),
  size: z.number().int().min(0),
  sha256: z.string().length(64),
  createdAt: z.string(),
  deleteAfter: z.string(),
  /** Same-origin, session-bound preview path. Never a public URL. */
  previewPath: z.string(),
})
export type DocumentMeta = z.infer<typeof documentMetaSchema>

export const extractRequestSchema = z
  .object({
    /** Lets the LLM fallback propose values (only if enabled on the server and consented here). */
    allowAiAssist: z.boolean().optional(),
  })
  .strict()
export type ExtractRequest = z.infer<typeof extractRequestSchema>

export const fieldUpdateSchema = z
  .object({
    key: z.string().min(1).max(80),
    value: z.string().max(500),
    confirmed: z.boolean(),
  })
  .strict()

export const confirmFieldsRequestSchema = z
  .object({
    fields: z.array(fieldUpdateSchema).min(1).max(80),
    /** Evaluation date override for tests and demos; defaults to today (Europe/Warsaw). */
    asOf: isoDateSchema.optional(),
    /**
     * Profile from `/start`. Fills facts the document does not carry and lets
     * the API compare the document with the user's own case. Never overrides a
     * value read from the document.
     */
    profile: caseProfileSchema.optional(),
  })
  .strict()
export type ConfirmFieldsRequest = z.infer<typeof confirmFieldsRequestSchema>

/**
 * Prefill handed to the calculator through `sessionStorage`
 * (`DOCUMENT_PREFILL_STORAGE_KEY`). A basis from Z-3/Z-3a is never treated as
 * gross pay: it goes to `monthlyBasisGrosze` and is used as-is.
 */
export const DOCUMENT_PREFILL_STORAGE_KEY = "zpr:document-prefill"

export const documentPrefillSchema = z
  .object({
    documentId: uuidSchema,
    source: z.literal("DOCUMENT"),
    formCode: documentFormCodeSchema.optional(),
    monthlyBasisGrosze: z.number().int().positive().optional(),
    grossMonthlyGrosze: z.number().int().positive().optional(),
    eventDate: isoDateSchema.optional(),
    /** Calculator `EmploymentType`. */
    employmentType: z.enum(["EMPLOYEE", "CONTRACTOR", "BUSINESS"]).optional(),
    childrenCount: z.number().int().min(1).max(10).optional(),
    paymentOption: z.enum(["STANDARD_100_70", "FLAT_81_5"]).optional(),
  })
  .refine((value) => !(value.monthlyBasisGrosze && value.grossMonthlyGrosze), {
    message: "Podaj podstawę wymiaru albo wynagrodzenie brutto, nie oba naraz.",
  })
export type DocumentPrefill = z.infer<typeof documentPrefillSchema>

export const checklistItemSchema = z.object({
  id: z.string(),
  templateKey: z.string(),
  title: z.string(),
  parent: z.enum(["MOTHER", "FATHER", "BOTH"]),
  preparedBy: z.string(),
  submitTo: z.string(),
  when: z.string(),
  dueDate: z.string().nullable(),
  legalBasis: z.string(),
  status: z.enum(["TODO", "DONE", "N_A"]),
  note: z.string().optional(),
})
export type ChecklistItem = z.infer<typeof checklistItemSchema>

export interface SampleCaseExpected {
  /** Verdict for the main benefit of the case. */
  benefit: engine.BenefitType
  parent: engine.ParentRole
  status: engine.EligibilityStatus
  monthlyBasisGrosze?: number
  /** Total for the main benefit, gross, when computable (rule set without Q-29 values). */
  amountGrosze?: number | null
  notes: string
}

export interface SampleCaseSummary {
  id: string
  code: string
  label: string
  description: string
  formCode: DocumentFormCode
  origin: "SYNTHETIC" | "PRIVATE"
  /** Shown only in demo mode (S-00 step 7). */
  expected?: SampleCaseExpected
  watermark: string
}

/** Fields mapped to engine facts, with the gaps the user still has to fill. */
export interface DocumentFactsMapping {
  request: AssessmentRequest | null
  prefill: DocumentPrefill | null
  missing: { semanticKey: SemanticKey; label: string }[]
  notes: string[]
}

export interface DocumentAssessment {
  documentId: string
  status: DocumentStatus
  extraction: DocumentExtraction
  mapping: DocumentFactsMapping
  eligibility: engine.EligibilityReport | null
  calculation: Pick<engine.Assessment, "totals" | "basis" | "applicableBenefits" | "status" | "ruleSet" | "inputHash" | "warnings" | "missingEvidence"> | null
  documents: engine.DocumentsReport["documents"] | null
  routing: engine.DocumentsReport["routing"] | null
  timeline: engine.TimelineReport["timeline"] | null
  checklist: ChecklistItem[]
  /** Demo-mode comparison with the sample-case manifest. */
  comparison?: { expected: SampleCaseExpected; matches: boolean; details: string[] }
  /** Comparison with the `/start` case profile, when one was supplied. */
  profileComparison?: CaseProfileComparison
}

/* ------------------------------------------------------------------------ */
/* Legacy `/documents/analyze` contract (kept during the UI migration)        */
/* ------------------------------------------------------------------------ */

/** @deprecated Use `ExtractedField` (provenance + semantic key). */
export interface LegacyExtractedField {
  key: string
  label: string
  value: string
  confidence: number
  source: string
}

/** @deprecated Response of `POST /documents/analyze`; use `DocumentExtraction`. */
export interface DocumentAnalysis {
  id: string
  fileName: string
  formCode: DocumentFormCode
  formTitle: string
  extractionMode: "deterministic-demo" | "deterministic"
  simulated: boolean
  requiresConfirmation: true
  fields: LegacyExtractedField[]
  warnings: string[]
  detectedAt: string
  /** New-shape result of the same analysis. */
  extraction?: DocumentExtraction
}

export const FORM_TITLES: Record<DocumentFormCode, string> = {
  ZAM: "ZAM — wniosek o zasiłek macierzyński",
  "Z-3": "Z-3 — zaświadczenie płatnika składek (pracownik)",
  "Z-3a": "Z-3a — zaświadczenie płatnika składek (inny ubezpieczony niż pracownik)",
  "ZAS-12": "ZAS-12 — wniosek o zasiłek",
  "ZAS-53": "ZAS-53 — wniosek o zasiłek chorobowy (prowadzący działalność)",
  POSWIADCZENIE: "Poświadczenie / zaświadczenie (dokument pomocniczy)",
  ZUR: "ZUR — wniosek o zasiłek (formularz wycofany 24.10.2026)",
  ZAO: "ZAO — wniosek o zasiłek ojcowski (formularz wycofany 24.10.2026)",
  "Z-3b": "Z-3b — zaświadczenie dla prowadzących działalność (zniesione 24.10.2026)",
  UNKNOWN: "Nierozpoznany formularz",
}

/* ------------------------------------------------------------------------ */
/* Pure field helpers shared by the API and the confirmation UI              */
/* ------------------------------------------------------------------------ */

/** Fields below this confidence are highlighted for review. */
export const REVIEW_CONFIDENCE_THRESHOLD = 0.85

function isRealIsoDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return false
  const [, y, m, d] = match
  const date = new Date(Date.UTC(Number(y), Number(m) - 1, Number(d)))
  return date.getUTCFullYear() === Number(y) && date.getUTCMonth() === Number(m) - 1 && date.getUTCDate() === Number(d)
}

/** "10.03.2027", "10-03-2027", "2027-03-10" → "2027-03-10"; null when not a real date. */
export function normalizeDate(raw: string): string | null {
  const text = raw.trim()
  let iso: string | null = null
  const isoMatch = /^(\d{4})[-./](\d{1,2})[-./](\d{1,2})$/.exec(text)
  const plMatch = /^(\d{1,2})[-./](\d{1,2})[-./](\d{4})$/.exec(text)
  if (isoMatch) iso = `${isoMatch[1]}-${isoMatch[2]!.padStart(2, "0")}-${isoMatch[3]!.padStart(2, "0")}`
  else if (plMatch) iso = `${plMatch[3]}-${plMatch[2]!.padStart(2, "0")}-${plMatch[1]!.padStart(2, "0")}`
  return iso && isRealIsoDate(iso) ? iso : null
}

/**
 * "6 000,00 zł", "6000.00", "6.000,00", "6000" → "6000.00" (PLN with two
 * decimals). Null when the text is not an amount. Never uses floats.
 */
export function normalizeMoney(raw: string): string | null {
  let text = raw.replace(/z[łl]|pln/gi, "").replace(/[\s ]/g, "")
  if (!/^\d[\d.,]*$/.test(text)) return null
  const lastComma = text.lastIndexOf(",")
  const lastDot = text.lastIndexOf(".")
  let decimal = ""
  if (lastComma >= 0 && lastDot >= 0) {
    const sep = lastComma > lastDot ? "," : "."
    const [int, frac] = [text.slice(0, text.lastIndexOf(sep)), text.slice(text.lastIndexOf(sep) + 1)]
    text = int.replace(/[.,]/g, "")
    decimal = frac
  } else if (lastComma >= 0 || lastDot >= 0) {
    const sep = lastComma >= 0 ? "," : "."
    const parts = text.split(sep)
    const tail = parts[parts.length - 1]!
    if (parts.length === 2 && tail.length !== 3) {
      text = parts[0]!
      decimal = tail
    } else if (parts.length >= 2 && parts.slice(1).every((part) => part.length === 3)) {
      text = parts.join("")
    } else {
      return null
    }
  }
  if (!/^\d+$/.test(text) || !/^\d{0,2}$/.test(decimal)) return null
  const int = text.replace(/^0+(?=\d)/, "")
  return `${int}.${decimal.padEnd(2, "0")}`
}

/** "6000.00" → 600000 grosze (exact, string arithmetic). */
export function moneyToGrosze(normalized: string): number | null {
  const match = /^(\d+)\.(\d{2})$/.exec(normalized)
  if (!match) return null
  const grosze = Number(match[1]) * 100 + Number(match[2])
  return Number.isSafeInteger(grosze) ? grosze : null
}

/** Normalises a typed or extracted value for its field type; null = invalid. */
export function normalizeFieldValue(
  field: Pick<ExtractedField, "type" | "options">,
  raw: string
): string | null {
  const text = raw.trim()
  if (text === "") return ""
  switch (field.type) {
    case "DATE":
      return normalizeDate(text)
    case "MONEY":
      return normalizeMoney(text)
    case "INTEGER":
      return /^\d{1,4}$/.test(text) ? String(Number(text)) : null
    case "BOOLEAN": {
      const lower = text.toLowerCase()
      if (["true", "tak", "t", "yes", "1", "x"].includes(lower)) return "true"
      if (["false", "nie", "n", "no", "0"].includes(lower)) return "false"
      return null
    }
    case "ENUM": {
      const option = field.options?.find(
        (item) => item.value.toLowerCase() === text.toLowerCase() || item.label.toLowerCase() === text.toLowerCase()
      )
      return option ? option.value : null
    }
    default:
      return text
  }
}

export interface ApplyBlocker {
  key: string
  label: string
  reason: "MISSING" | "INVALID" | "NOT_CONFIRMED"
}

/**
 * Why the confirmed values cannot be applied yet. Required fields must be
 * filled, valid and confirmed; any filled field must be valid. A placeholder
 * such as „Do uzupełnienia” is never a valid value.
 */
export function applyBlockers(fields: readonly ExtractedField[]): ApplyBlocker[] {
  const blockers: ApplyBlocker[] = []
  for (const field of fields) {
    const normalized = normalizeFieldValue(field, field.value)
    if (field.value.trim() !== "" && normalized === null) {
      blockers.push({ key: field.key, label: field.label, reason: "INVALID" })
    } else if (field.required && (normalized === "" || normalized === null)) {
      blockers.push({ key: field.key, label: field.label, reason: "MISSING" })
    } else if (field.required && !field.confirmed) {
      blockers.push({ key: field.key, label: field.label, reason: "NOT_CONFIRMED" })
    }
  }
  return blockers
}
