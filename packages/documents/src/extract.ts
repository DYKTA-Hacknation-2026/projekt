import {
  FORM_TITLES,
  REVIEW_CONFIDENCE_THRESHOLD,
  type DocumentExtraction,
  type DocumentOrigin,
  type ExtractedField,
  type ExtractionMethod,
} from "@zpr/contracts/documents"
import { ruleSetFor } from "@zpr/domain/engine"

import { detectForm } from "./detect"
import { applyFormDefaults, markRequired, mergeFields, normalizeExtracted, readTemplateFields } from "./forms/fields"
import { templateFor } from "./forms/templates"
import { readPdf, type PdfContent } from "./pdf/reader"
import { scrubDocumentText, type FieldSuggester, type OcrEngine } from "./ports"
import { validateExtraction } from "./validate"

/**
 * Extraction pipeline (AD-08, P6-03):
 *
 *   PDF → text layer + AcroForm (pdf.js)
 *       → [no text layer and OCR enabled] → OCR
 *       → form detection (fields → headings → text → file name)
 *       → AcroForm values → label/value template → form defaults
 *       → [still missing, LLM enabled and consented] → LLM proposals
 *       → validators
 *
 * Pure apart from the optional ports; no logging, no network by default.
 */

export interface ExtractOptions {
  documentId: string
  asOf: string
  origin: DocumentOrigin
  sampleCaseId?: string
  /** Hint only: used for detection when the content carries no form code. */
  fileName?: string
  timeoutMs?: number
  ocr?: OcrEngine | null
  /** Set only when the server enables the LLM fallback and the user consented. */
  suggester?: FieldSuggester | null
  now?: () => Date
}

const MAX_OCR_PAGES = 5

export async function extractFromPdf(bytes: Uint8Array, options: ExtractOptions): Promise<DocumentExtraction> {
  const timeoutMs = options.timeoutMs ?? 10_000
  const content: PdfContent = await readPdf(bytes, { timeoutMs })

  let pages = content.pages
  let ocrAttempted = false
  if (!content.hasTextLayer && options.ocr) {
    ocrAttempted = true
    try {
      pages = await options.ocr.recognize(bytes, { timeoutMs, maxPages: MAX_OCR_PAGES })
    } catch {
      pages = content.pages
    }
  }
  const textSource = ocrAttempted ? "OCR" : "TEMPLATE"

  const detection = detectForm({ pages, fields: content.fields, fileName: options.fileName })
  const template = templateFor(detection.form)

  let fields = readTemplateFields({ template, pages, acroFields: content.fields, textSource })
  for (const attachment of detection.attachments) {
    const extra = readTemplateFields({ template: templateFor(attachment), pages, acroFields: content.fields, textSource })
    fields = mergeFields(fields, extra.filter((field) => field.value !== ""))
  }
  fields = applyFormDefaults(detection.form, fields)
  fields = markRequired(template, fields)

  let usedLlm = false
  const missing = fields.filter((field) => field.value === "" && field.semanticKey && field.semanticKey !== "pesel")
  if (options.suggester && missing.length > 0) {
    const names = fields.filter((field) => field.semanticKey === "firstName" || field.semanticKey === "lastName").map((field) => field.value)
    try {
      const suggestions = await options.suggester.suggest({
        form: detection.form,
        text: scrubDocumentText(pages.map((page) => page.text).join("\n"), names).slice(0, 12_000),
        fields: missing.map(({ key, label, type }) => ({ key, label, type })),
      })
      fields = fields.map((field) => {
        const suggestion = suggestions.find((item) => item.key === field.key)
        if (!suggestion || field.value !== "") return field
        const spec = template.fields.find((item) => item.key === field.key)
        const normalized = spec ? normalizeExtracted(spec, suggestion.value) : null
        if (!normalized) return field
        usedLlm = true
        // LLM proposals are capped below the review threshold: always reviewed.
        return { ...field, value: normalized, rawValue: suggestion.value.slice(0, 500), source: "LLM" as const, confidence: 0.5, needsReview: true }
      })
    } catch {
      // The fallback is best-effort; deterministic results stand.
    }
  }

  const findings = validateExtraction({
    form: detection.form,
    attachments: detection.attachments,
    fields,
    asOf: options.asOf,
    hasTextLayer: content.hasTextLayer,
    ocrAttempted,
    detectionFromFileNameOnly: detection.fromFileNameOnly,
  })

  const method: ExtractionMethod = usedLlm
    ? "LLM_ASSISTED"
    : ocrAttempted
      ? "OCR"
      : fields.some((field) => field.source === "ACROFORM" && field.value !== "")
        ? "ACROFORM"
        : "TEMPLATE"

  const readRequired = fields.filter((field) => field.required && field.value !== "")
  const confidence = Math.min(
    detection.confidence,
    ...readRequired.map((field) => field.confidence),
    ...(fields.some((field) => field.required && field.value === "") ? [0] : [])
  )

  return {
    documentId: options.documentId,
    status: "NEEDS_REVIEW",
    detectedForm: detection.form,
    formTitle: FORM_TITLES[detection.form],
    legacyForm: detection.legacy,
    attachments: detection.attachments,
    detectionSignals: detection.signals,
    extractionMethod: method,
    confidence: Number.isFinite(confidence) ? confidence : 0,
    fields: fields.map((field) => ({ ...field, needsReview: field.needsReview || field.confidence < REVIEW_CONFIDENCE_THRESHOLD })),
    findings,
    pages: content.pageCount,
    hasTextLayer: content.hasTextLayer,
    origin: options.origin,
    sampleCaseId: options.sampleCaseId,
    ruleSetVersion: ruleSetFor(options.asOf)?.version,
    detectedAt: (options.now?.() ?? new Date()).toISOString(),
    requiresConfirmation: true,
    processedLocally: !usedLlm,
  }
}

export interface FieldUpdate {
  key: string
  value: string
  confirmed: boolean
}

/**
 * Applies the user's corrections. A changed value becomes `source: USER`,
 * `userEdited: true`; the original extraction confidence is kept so the UI
 * can still show how reliable the machine reading was. Validators re-run.
 */
export function applyFieldUpdates(
  extraction: DocumentExtraction,
  updates: readonly FieldUpdate[],
  context: { asOf: string }
): DocumentExtraction {
  const template = templateFor(extraction.detectedForm)
  const byKey = new Map(updates.map((update) => [update.key, update]))
  const fields: ExtractedField[] = extraction.fields.map((field) => {
    const update = byKey.get(field.key)
    if (!update) return field
    const spec = template.fields.find((item) => item.key === field.key)
    const typed = update.value.trim()
    const normalized = typed === "" ? "" : spec ? normalizeExtracted(spec, typed) : typed
    const nextValue = normalized === null ? typed : normalized
    const changed = nextValue !== field.value
    return {
      ...field,
      value: nextValue,
      source: changed ? "USER" : field.source,
      userEdited: field.userEdited || changed,
      confirmed: update.confirmed,
    }
  })
  const findings = validateExtraction({
    form: extraction.detectedForm,
    attachments: extraction.attachments,
    fields,
    asOf: context.asOf,
    hasTextLayer: extraction.hasTextLayer,
    ocrAttempted: extraction.extractionMethod === "OCR",
    detectionFromFileNameOnly: extraction.findings.some((finding) => finding.code === "FORM_FROM_FILENAME"),
  })
  const allConfirmed = fields.filter((field) => field.required).every((field) => field.confirmed && field.value !== "")
  const blocking = findings.some((finding) => finding.severity === "ERROR")
  return { ...extraction, fields, findings, status: allConfirmed && !blocking ? "CONFIRMED" : "NEEDS_REVIEW" }
}
