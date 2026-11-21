import type { GroundingReport } from "@zpr/contracts/assistant"

import type { TurnState } from "../turn"

/**
 * Post-generation checks on the final answer of a turn:
 *
 * 1. Citation guard — every `[S#]` must name a passage retrieved this turn.
 * 2. Numeric grounding — every number (amount, week count, date part,
 *    percentage, article number) must occur in a tool result, a retrieved
 *    passage, the user's own messages, or the turn date.
 * 3. Eligibility language — „przysługuje Ci”, „masz prawo” and similar are
 *    allowed only after `checkBenefitEligibility` ran this turn.
 * 4. Legal claims without any citation while evidence was available.
 *
 * Violations do not silently rewrite the streamed text; they are reported to
 * the UI (which marks invalid citations and shows a warning) and persisted.
 */

const CITATION = /\[S(\d{1,2})\]/g
const NUMBER = /\d(?:[\d   ]*\d)?(?:[.,]\d+)?/g
const TRIVIAL_MAX = 3
const ELIGIBILITY_CLAIM =
  /\b(przys[lł]uguje\s+(ci|pani|panu|tobie)|masz\s+prawo|nie\s+masz\s+prawa|nie\s+przys[lł]uguje\s+(ci|pani|panu|tobie)|otrzymasz\s+zasi[lł]ek|dostaniesz\s+zasi[lł]ek)\b/i

function normalizeNumber(raw: string): number | null {
  const compact = raw.replace(/[   ]/g, "").replace(",", ".")
  const value = Number.parseFloat(compact)
  return Number.isFinite(value) ? value : null
}

export function extractNumbers(text: string): { raw: string; value: number }[] {
  const found: { raw: string; value: number }[] = []
  for (const match of text.replace(CITATION, " ").matchAll(NUMBER)) {
    const value = normalizeNumber(match[0])
    if (value !== null) found.push({ raw: match[0].trim(), value })
  }
  return found
}

function key(value: number): string {
  return value.toFixed(2)
}

function collectNumbers(value: unknown, into: Set<string>): void {
  if (value === null || value === undefined) return
  if (typeof value === "number") {
    into.add(key(value))
    // Grosze shown as złote, rates shown as percentages, weeks shown as days.
    into.add(key(value / 100))
    if (value > 0 && value <= 1) into.add(key(value * 100))
    return
  }
  if (typeof value === "string") {
    for (const number of extractNumbers(value)) into.add(key(number.value))
    return
  }
  if (Array.isArray(value)) {
    for (const item of value) collectNumbers(item, into)
    return
  }
  if (typeof value === "object") {
    for (const item of Object.values(value as Record<string, unknown>)) {
      collectNumbers(item, into)
    }
  }
}

export function checkGrounding(input: {
  answer: string
  turn: TurnState
  userTexts: string[]
  legalIntent: boolean
}): GroundingReport {
  const { answer, turn } = input
  const notes: string[] = []

  const cited = [...answer.matchAll(CITATION)].map((match) => `S${match[1]}`)
  const citedRefs = [...new Set(cited)]
  const invalidRefs = citedRefs.filter((ref) => !turn.hasRef(ref))
  if (invalidRefs.length > 0) {
    notes.push(
      `Odpowiedź wskazuje źródła, których nie pobrano w tej turze: ${invalidRefs.join(", ")}.`
    )
  }

  const allowed = new Set<string>()
  for (const call of turn.toolCalls) {
    collectNumbers(call.output, allowed)
    collectNumbers(call.input, allowed)
  }
  for (const entry of turn.entriesList()) collectNumbers(entry.content, allowed)
  for (const source of turn.sources()) {
    collectNumbers(
      [source.legalReference, source.sectionIdentifier, source.pageNumber, source.validFrom, source.validTo],
      allowed
    )
  }
  for (const text of input.userTexts) collectNumbers(text, allowed)
  collectNumbers(turn.asOf, allowed)

  const unverifiedNumbers = [
    ...new Set(
      extractNumbers(answer)
        .filter(
          (number) =>
            !(Number.isInteger(number.value) && number.value <= TRIVIAL_MAX) &&
            !allowed.has(key(number.value))
        )
        .map((number) => number.raw)
    ),
  ]
  if (unverifiedNumbers.length > 0) {
    notes.push(
      `Nie mogę potwierdzić tych liczb w źródłach ani wynikach narzędzi: ${unverifiedNumbers.join(", ")}.`
    )
  }

  const eligibilityClaimWithoutTool =
    ELIGIBILITY_CLAIM.test(answer) && !turn.called("checkBenefitEligibility")
  if (eligibilityClaimWithoutTool) {
    notes.push(
      "Odpowiedź zawiera stwierdzenie o uprawnieniu bez wstępnej oceny z modułu reguł."
    )
  }

  const validCitations = citedRefs.length - invalidRefs.length
  const uncitedLegalClaims =
    input.legalIntent &&
    turn.sources().length > 0 &&
    validCitations === 0 &&
    answer.trim().length > 160
  if (uncitedLegalClaims) {
    notes.push("Odpowiedź nie wskazuje żadnego z pobranych źródeł.")
  }

  return {
    status: notes.length > 0 ? "WARN" : "OK",
    citedRefs,
    invalidRefs,
    unverifiedNumbers,
    uncitedLegalClaims,
    eligibilityClaimWithoutTool,
    notes,
  }
}
