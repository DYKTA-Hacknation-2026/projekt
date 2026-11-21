import type { DocumentFormCode, FieldType } from "@zpr/contracts/documents"

import type { PdfPageText } from "./pdf/reader"

/**
 * Optional extraction stages behind ports. Neither is needed for the demo:
 * OCR runs only for scans and only when enabled; the LLM only proposes values
 * for fields the deterministic stages could not read, after PII scrubbing,
 * with the user's explicit consent, and every proposal must be confirmed.
 */

export interface OcrEngine {
  readonly name: string
  recognize(bytes: Uint8Array, options: { timeoutMs: number; maxPages: number }): Promise<PdfPageText[]>
}

export interface FieldSuggestionRequest {
  form: DocumentFormCode
  /** Document text after `scrubDocumentText`. */
  text: string
  fields: { key: string; label: string; type: FieldType }[]
}

export interface FieldSuggestion {
  key: string
  value: string
}

export interface FieldSuggester {
  readonly name: string
  suggest(request: FieldSuggestionRequest): Promise<FieldSuggestion[]>
}

const RULES: { pattern: RegExp; replacement: string }[] = [
  { pattern: /\b(?:PL\s?)?\d{2}(?:[ -]?\d{4}){6}\b/gi, replacement: "[numer konta]" },
  { pattern: /\b\d{11}\b/g, replacement: "[PESEL]" },
  { pattern: /\b[A-Z]{3}\s?\d{6}\b|\b[A-Z]{2}\s?\d{7}\b/g, replacement: "[numer dokumentu]" },
  { pattern: /\b[\w.+-]+@[\w-]+(?:\.[\w-]+)+\b/g, replacement: "[e-mail]" },
  { pattern: /(?:\+48[ -]?)?\b\d{3}[ -]\d{3}[ -]\d{3}\b/g, replacement: "[telefon]" },
  { pattern: /\b\d{2}-\d{3}\b/g, replacement: "[kod pocztowy]" },
  { pattern: /\b(?:ul\.|ulica|al\.|aleja|os\.|pl\.)\s+[^\n,]+/gi, replacement: "[adres]" },
  { pattern: /\b(?:NIP|REGON)\s*:?\s*[\d -]{9,13}/gi, replacement: "[identyfikator płatnika]" },
]

/**
 * Removes identifiers before any text leaves the server: PESEL, bank account,
 * ID numbers, e-mail, phone, postal code, street address, NIP/REGON and the
 * names already read from the document.
 */
export function scrubDocumentText(text: string, knownNames: readonly string[] = []): string {
  let output = text
  for (const rule of RULES) output = output.replace(rule.pattern, rule.replacement)
  for (const name of knownNames) {
    const trimmed = name.trim()
    if (trimmed.length < 2) continue
    output = output.replace(new RegExp(trimmed.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"), "[dane osobowe]")
  }
  return output
}
