import { evaluate } from "./evaluate"
import type { Assessment, AssessmentInput, CalculationLine, FamilyEventInput, ParentInput } from "./types"

/** Test builders. Expected values in the tests are computed independently (exact fractions), not by the engine. */

export const BIRTH = "2027-03-10"
/** A date after the birth, so that rights are assessed as facts, not forecasts. */
export const AFTER_BIRTH = "2027-04-01"

export const employee = (overrides: Partial<ParentInput> = {}): ParentInput => ({
  role: "MOTHER",
  insurance: { title: "EMPLOYMENT", startDate: "2024-01-01", payerSize: "OVER_20", workingTimeFraction: "1" },
  basis: { method: "GROSS_MONTHLY", grossMonthlyGrosze: 800_000 },
  ...overrides,
})

export const father = (overrides: Partial<ParentInput> = {}): ParentInput => ({
  role: "FATHER",
  insurance: { title: "EMPLOYMENT", startDate: "2023-01-01", payerSize: "UP_TO_20" },
  basis: { method: "KNOWN_BASIS", monthlyBasisGrosze: 450_000 },
  ...overrides,
})

export const born = (overrides: Partial<FamilyEventInput> = {}): FamilyEventInput => ({
  kind: "BIRTH",
  birthDate: BIRTH,
  childrenCount: 1,
  ...overrides,
})

export function assess(overrides: Partial<AssessmentInput> = {}): Assessment {
  return evaluate({
    asOf: AFTER_BIRTH,
    event: born(),
    parents: [employee()],
    ...overrides,
  }).assessment
}

export function run(overrides: Partial<AssessmentInput> = {}) {
  return evaluate({
    asOf: AFTER_BIRTH,
    event: born(),
    parents: [employee()],
    ...overrides,
  })
}

export function line(assessment: Assessment, id: string): CalculationLine {
  const found = assessment.breakdown.find((item) => item.id === id)
  if (!found) {
    throw new Error(`Brak pozycji ${id}; są: ${assessment.breakdown.map((item) => item.id).join(", ")}`)
  }
  return found
}

export function determination(assessment: Assessment, benefit: string, parent: "MOTHER" | "FATHER" = "MOTHER") {
  const found = assessment.eligibility.determinations.find((item) => item.benefit === benefit && item.parent === parent)
  if (!found) {
    throw new Error(
      `Brak ustalenia ${parent}/${benefit}; są: ${assessment.eligibility.determinations.map((item) => `${item.parent}/${item.benefit}`).join(", ")}`
    )
  }
  return found
}

export function period(assessment: Assessment, id: string) {
  const found = assessment.periods.find((item) => item.id === id)
  if (!found) throw new Error(`Brak okresu ${id}; są: ${assessment.periods.map((item) => item.id).join(", ")}`)
  return found
}

export const hasWarning = (assessment: Assessment, code: string) => assessment.warnings.some((warning) => warning.code === code)
export const missingKeys = (assessment: Assessment) => assessment.missingEvidence.map((item) => item.key)
