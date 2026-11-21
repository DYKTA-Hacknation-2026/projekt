import { LEGACY_FORM_CODES, type DocumentFormCode } from "@zpr/contracts/documents"

import { foldFieldName, foldText } from "./text"

/**
 * Form detection (P6-02). Evidence, strongest first:
 *   1. an AcroForm field that carries the form code,
 *   2. the code in the heading of the first page (attachments: of later pages),
 *   3. the code or title phrase anywhere in the text,
 *   4. the file name — a last-resort hint only.
 *
 * Codes are matched as whole tokens on folded text, and the more specific
 * codes first: "Z-3b" and "Z-3a" never count as "Z-3", and "ZAM" never
 * matches inside a word such as "ZAMOWIENIE".
 */

type Code = Exclude<DocumentFormCode, "UNKNOWN">

const T = "(?<![A-Z0-9])"
const E = "(?![A-Z0-9])"

/** Ordered: specific before general. */
const CODE_PATTERNS: { code: Code; pattern: RegExp }[] = [
  { code: "Z-3b", pattern: new RegExp(`${T}Z ?-? ?3 ?B${E}`) },
  { code: "Z-3a", pattern: new RegExp(`${T}Z ?-? ?3 ?A${E}`) },
  { code: "Z-3", pattern: new RegExp(`${T}Z ?-? ?3${E}`) },
  { code: "ZAS-53", pattern: new RegExp(`${T}ZAS ?-? ?53${E}`) },
  { code: "ZAS-12", pattern: new RegExp(`${T}ZAS ?-? ?12${E}`) },
  { code: "ZAM", pattern: new RegExp(`${T}ZAM${E}`) },
  { code: "ZUR", pattern: new RegExp(`${T}ZUR${E}`) },
  { code: "ZAO", pattern: new RegExp(`${T}ZAO${E}`) },
  { code: "POSWIADCZENIE", pattern: new RegExp(`${T}POSWIADCZENIE${E}`) },
]

/** Title phrases: weaker than a code, used when the code is missing. */
const PHRASES: { code: Code; pattern: RegExp }[] = [
  { code: "Z-3", pattern: /ZASWIADCZENIE PLATNIKA SKLADEK/ },
  { code: "ZAM", pattern: /WNIOSEK O (?:WYPLATE )?ZASIL(?:EK|KU) MACIERZYNSK/ },
  { code: "ZAS-53", pattern: /WNIOSEK O (?:WYPLATE )?ZASIL(?:EK|KU) CHOROBOW/ },
  { code: "POSWIADCZENIE", pattern: /ZASWIADCZENIE LEKARSKIE|O PRZEWIDYWANEJ DACIE PORODU/ },
]

const FORM_CODE_FIELDS = new Set(["KODFORMULARZA", "FORMULARZ", "FORMCODE", "KODDRUKU", "SYMBOLFORMULARZA", "FORMULARZKOD"])

export interface DetectionInput {
  pages: { page: number; text: string }[]
  fields: { name: string; value: string }[]
  fileName?: string
}

export interface DetectionResult {
  form: DocumentFormCode
  legacy: boolean
  confidence: number
  signals: string[]
  /** Other forms whose heading opens a later page (e.g. a Z-3 attached to ZAM). */
  attachments: DocumentFormCode[]
  /** Only the file name pointed at the form. */
  fromFileNameOnly: boolean
}

/** First matching code in `text`, specific codes first. */
export function matchFormCode(text: string): Code | null {
  const folded = foldText(text)
  for (const { code, pattern } of CODE_PATTERNS) if (pattern.test(folded)) return code
  return null
}

function codesIn(text: string): Code[] {
  const found: Code[] = []
  let rest = text
  for (const { code, pattern } of CODE_PATTERNS) {
    if (pattern.test(rest)) {
      found.push(code)
      // Remove matches so "Z-3A" is not also counted as "Z-3".
      rest = rest.replace(new RegExp(pattern.source, "g"), " ")
    }
  }
  return found
}

function phrasesIn(text: string): Code[] {
  return PHRASES.filter(({ pattern }) => pattern.test(text)).map(({ code }) => code)
}

const HEADING_LINES = 4

export function detectForm(input: DetectionInput): DetectionResult {
  const scores = new Map<Code, number>()
  const signals: string[] = []
  const attachments = new Set<Code>()
  const bump = (code: Code, weight: number, signal: string) => {
    scores.set(code, (scores.get(code) ?? 0) + weight)
    if (!signals.includes(signal)) signals.push(signal)
  }

  for (const field of input.fields) {
    if (!FORM_CODE_FIELDS.has(foldFieldName(field.name))) continue
    const code = matchFormCode(field.value)
    if (code) bump(code, 8, `pole formularza „${field.name}”: ${code}`)
  }

  let firstPageHeading: Code[] = []
  for (const page of input.pages) {
    const folded = foldText(page.text)
    const lines = folded.split("\n")
    const heading = lines.slice(0, HEADING_LINES).join("\n")
    const body = lines.slice(HEADING_LINES).join("\n")
    // The earliest heading line with a code decides (later lines are often
    // instructions such as "dołącz Z-3"). A title phrase only counts when the
    // heading carries no explicit code.
    const explicit = lines.slice(0, HEADING_LINES).map(codesIn).find((codes) => codes.length > 0) ?? []
    const headingCodes = explicit.length > 0 ? explicit : phrasesIn(heading)
    if (page.page === 1) firstPageHeading = headingCodes
    for (const code of headingCodes) {
      if (page.page === 1) bump(code, 5, `nagłówek strony 1: ${code}`)
      else {
        bump(code, 2, `nagłówek strony ${page.page}: ${code}`)
        attachments.add(code)
      }
    }
    const bodyCodes = codesIn(body)
    for (const code of bodyCodes) bump(code, 0.5, `kod w treści (strona ${page.page}): ${code}`)
    if (bodyCodes.length === 0 && headingCodes.length === 0) {
      for (const code of phrasesIn(body)) bump(code, 0.5, `tytuł w treści (strona ${page.page}): ${code}`)
    }
  }

  let fromFileNameOnly = false
  if (scores.size === 0 && input.fileName) {
    const name = input.fileName.replace(/\.pdf$/i, "").replace(/[_.]+/g, " ")
    const code = codesIn(foldText(name))[0]
    if (code) {
      bump(code, 0.3, `nazwa pliku (tylko podpowiedź): ${code}`)
      fromFileNameOnly = true
    }
  }

  const ranked = [...scores.entries()].sort((a, b) => b[1] - a[1])
  const fromHeading = ranked.find(([code]) => firstPageHeading.includes(code))
  const best = fromHeading ?? ranked[0]
  if (!best) {
    return { form: "UNKNOWN", legacy: false, confidence: 0, signals: ["brak kodu formularza w treści i polach"], attachments: [], fromFileNameOnly: false }
  }

  const [form, score] = best
  attachments.delete(form)
  const confidence = score >= 8 ? 0.98 : score >= 5 ? 0.95 : score >= 2 ? 0.8 : score >= 0.5 ? 0.6 : 0.3
  return {
    form,
    legacy: (LEGACY_FORM_CODES as readonly string[]).includes(form),
    confidence,
    signals,
    attachments: [...attachments],
    fromFileNameOnly,
  }
}
