import {
  REVIEW_CONFIDENCE_THRESHOLD,
  normalizeFieldValue,
  type DocumentFormCode,
  type ExtractedField,
  type FieldSource,
} from "@zpr/contracts/documents"

import type { PdfAcroField, PdfPageText } from "../pdf/reader"
import { foldFieldName, foldText } from "../text"
import { publicOptions, type FieldSpec, type FormTemplate } from "./templates"

/**
 * Field extraction from AcroForm values and label/value lines. Confidence
 * reflects how the value was found:
 *   AcroForm name match + valid value   0.97
 *   label match + valid value           0.90 (OCR: 0.70)
 *   value found but not parseable       0.40
 *   default implied by the form code    form-specific
 */

const CONFIDENCE = { ACROFORM: 0.97, TEMPLATE: 0.9, OCR: 0.7, UNPARSED: 0.4 } as const

function enumFromText(spec: FieldSpec, text: string): string | null {
  const folded = foldText(text)
  return spec.options?.find((option) => option.match.test(folded))?.value ?? null
}

/** Normalises an extracted raw value; ENUM values are recognised from free text. */
export function normalizeExtracted(spec: FieldSpec, raw: string): string | null {
  if (spec.type === "ENUM") {
    return normalizeFieldValue({ type: "ENUM", options: publicOptions(spec) }, raw) ?? enumFromText(spec, raw)
  }
  if (spec.type === "BOOLEAN") {
    const folded = foldText(raw)
    if (/^(?:\[?X\]?|TAK)\b/.test(folded)) return "true"
    if (/^(?:\[ ?\]|NIE)\b/.test(folded)) return "false"
  }
  return normalizeFieldValue({ type: spec.type }, raw)
}

function emptyField(spec: FieldSpec, source: FieldSource): ExtractedField {
  return {
    key: spec.key,
    label: spec.label,
    value: "",
    type: spec.type,
    confidence: 0,
    source,
    userEdited: false,
    confirmed: false,
    required: Boolean(spec.required),
    needsReview: Boolean(spec.required),
    semanticKey: spec.semanticKey,
    basisKind: spec.basisKind,
    options: publicOptions(spec),
  }
}

function filled(spec: FieldSpec, raw: string, source: FieldSource, base: number, page?: number, bbox?: ExtractedField["bbox"]): ExtractedField {
  const normalized = normalizeExtracted(spec, raw)
  const valid = normalized !== null && normalized !== ""
  const confidence = valid ? base : CONFIDENCE.UNPARSED
  return {
    ...emptyField(spec, source),
    value: valid ? normalized : raw.trim().slice(0, 500),
    rawValue: raw.trim().slice(0, 500),
    confidence,
    page,
    bbox,
    needsReview: confidence < REVIEW_CONFIDENCE_THRESHOLD || Boolean(spec.informational),
  }
}

function labelValue(spec: FieldSpec, pages: readonly PdfPageText[]): { raw: string; page: number } | null {
  for (const page of pages) {
    const lines = page.text.split("\n")
    for (const line of lines) {
      const folded = foldText(line)
      const colon = folded.indexOf(":")
      if (colon < 0) continue
      const head = folded.slice(0, colon)
      if (!spec.labels.some((pattern) => pattern.test(head))) continue
      // Read the value from the original line to keep diacritics in names.
      const original = line.slice(line.indexOf(":") + 1).trim()
      if (original.length > 0) return { raw: original, page: page.page }
    }
  }
  return null
}

export interface FieldReadInput {
  template: FormTemplate
  pages: readonly PdfPageText[]
  acroFields: readonly PdfAcroField[]
  textSource: "TEMPLATE" | "OCR"
}

export function readTemplateFields(input: FieldReadInput): ExtractedField[] {
  const acro = new Map<string, PdfAcroField>()
  for (const field of input.acroFields) {
    const name = foldFieldName(field.name)
    if (field.value && !acro.has(name)) acro.set(name, field)
  }

  return input.template.fields.map((spec) => {
    const fromAcro = spec.acroNames.map((name) => acro.get(name)).find(Boolean)
    if (fromAcro) return filled(spec, fromAcro.value, "ACROFORM", CONFIDENCE.ACROFORM, fromAcro.page, fromAcro.bbox)
    const fromText = labelValue(spec, input.pages)
    if (fromText) {
      return filled(spec, fromText.raw, input.textSource, input.textSource === "OCR" ? CONFIDENCE.OCR : CONFIDENCE.TEMPLATE, fromText.page)
    }
    return emptyField(spec, input.textSource)
  })
}

/** Values implied by the form code itself (e.g. Z-3 is issued for employees). */
const FORM_DEFAULTS: Partial<Record<DocumentFormCode, { key: string; value: string; confidence: number; note: string }[]>> = {
  "Z-3": [{ key: "tytulUbezpieczenia", value: "EMPLOYMENT", confidence: 0.9, note: "Z-3 wystawia się dla pracownika" }],
  "Z-3a": [{ key: "tytulUbezpieczenia", value: "MANDATE", confidence: 0.6, note: "Z-3a dotyczy ubezpieczonych innych niż pracownicy — sprawdź tytuł" }],
  "Z-3b": [{ key: "tytulUbezpieczenia", value: "SELF_EMPLOYMENT", confidence: 0.9, note: "Z-3b dotyczył prowadzących działalność" }],
  ZAO: [
    { key: "rodzajZasilku", value: "PATERNITY", confidence: 0.9, note: "ZAO był wnioskiem o zasiłek ojcowski" },
    { key: "wnioskodawca", value: "FATHER", confidence: 0.8, note: "ZAO składał ojciec dziecka" },
  ],
}

export function applyFormDefaults(form: DocumentFormCode, fields: ExtractedField[]): ExtractedField[] {
  const defaults = FORM_DEFAULTS[form] ?? []
  return fields.map((field) => {
    const fallback = defaults.find((item) => item.key === field.key)
    if (!fallback || field.value !== "") return field
    return {
      ...field,
      value: fallback.value,
      rawValue: fallback.note,
      source: "TEMPLATE",
      confidence: fallback.confidence,
      needsReview: fallback.confidence < REVIEW_CONFIDENCE_THRESHOLD,
    }
  })
}

/**
 * Required fields depend on what was read: the event date (actual birth, or
 * the due date for a pre-birth claim) and the basis (the payer's basis, or
 * gross pay when only that is present).
 */
export function markRequired(template: FormTemplate, fields: ExtractedField[]): ExtractedField[] {
  const has = (key: string) => fields.some((field) => field.semanticKey === key && field.value !== "")
  const required = new Set<string>()
  if (template.needsEventDate) required.add(has("expectedDueDate") && !has("eventDate") ? "expectedDueDate" : "eventDate")
  if (template.needsBasis) required.add(has("grossMonthlyGrosze") && !has("monthlyBasisGrosze") ? "grossMonthlyGrosze" : "monthlyBasisGrosze")
  return fields.map((field) => {
    if (!field.semanticKey || !required.has(field.semanticKey)) return field
    return { ...field, required: true, needsReview: field.needsReview || field.value === "" }
  })
}

/** Merges attachment fields (e.g. a Z-3 page behind ZAM) without duplicating keys. */
export function mergeFields(primary: ExtractedField[], extra: ExtractedField[]): ExtractedField[] {
  const result = [...primary]
  for (const field of extra) {
    const index = result.findIndex((item) => item.key === field.key)
    if (index < 0) result.push(field)
    else if (result[index]!.value === "" && field.value !== "") result[index] = { ...field, required: result[index]!.required || field.required }
  }
  return result
}
