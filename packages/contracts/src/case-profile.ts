import { z } from "zod"

import { assessmentInputSchema } from "./engine"

/**
 * Profile of the situation analysed in `/start`. It is stored in the browser
 * (session storage) and sent to the document analysis only when the user
 * confirms fields, so a document is compared with the facts they already gave.
 * It is not an official ZUS record and never replaces the engine output.
 */

export const CASE_PROFILE_STORAGE_KEY = "zpr:case-profile"
export const SITUATION_ANSWERS_STORAGE_KEY = "zpr:situation-answers"

export const caseProfileScenarioSchema = z.enum([
  "PLANNING",
  "PREGNANCY",
  "BIRTH",
  "ON_LEAVE",
  "CARE",
  "CHECK_DOCUMENT",
])
export type CaseProfileScenario = z.infer<typeof caseProfileScenarioSchema>

export const caseProfileSchema = z.object({
  version: z.literal(1),
  scenario: caseProfileScenarioSchema,
  /** Human-readable scenario name shown next to the document analysis. */
  label: z.string().trim().min(1).max(160),
  /** Engine request used for the analysis (without personal data). */
  request: assessmentInputSchema,
  /** Present when the user saved the case in the demo database. */
  savedCaseNumber: z.string().trim().min(1).max(80).optional(),
  analyzedAt: z.string().trim().min(10).max(40),
})
export type CaseProfile = z.infer<typeof caseProfileSchema>

export interface ProfileComparisonRow {
  label: string
  profile: string
  document: string
}

/**
 * Report shown after confirming a document. It never claims that an
 * application is correct: it only separates facts that agree with the profile
 * from gaps, differences and items a human must verify.
 */
export interface CaseProfileComparison {
  status: "MATCH" | "DIFFERENCES"
  matches: ProfileComparisonRow[]
  missingInDocument: ProfileComparisonRow[]
  mismatches: ProfileComparisonRow[]
  manualReview: string[]
  suggestions: string[]
  disclaimer: string
}

export const COMPARISON_DISCLAIMER =
  "Porównanie dotyczy tylko danych podanych w sprawie i odczytanych z dokumentu. To nie jest potwierdzenie kompletności ani decyzja ZUS."
