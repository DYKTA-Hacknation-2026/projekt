/**
 * Pure domain types shared by the calculator, contracts and the UI.
 *
 * Money is always expressed in grosze (integer). Rates are decimal fractions.
 * No I/O, dates from the clock or randomness is allowed in this package.
 */

export type PaymentOption = "STANDARD_100_70" | "FLAT_81_5"

export type BenefitKind = "MATERNITY" | "PARENTAL" | "PATERNITY"

export interface CalculatorInput {
  /** Gross monthly income declared by the user, in grosze. */
  grossMonthlyIncomeGrosze: number
  /** Number of children born in one birth. Values above 5 use the 5+ rule. */
  childrenCount: number
  /** The child holds a "Za życiem" certificate. */
  hasZaZyciem: boolean
  paymentOption: PaymentOption
  /** Maternity leave taken before the due date, 0–6 weeks. */
  maternityWeeksBeforeBirth: number
  /** Weeks of the shared parental pool used by the second parent (0–9). */
  secondParentParentalWeeks: number
  /** Fraction of full-time work during parental leave (0–0.5). */
  parentalWorkFraction: number
  /** Paternity leave in days (0–14). */
  paternityDays: number
}

export interface CalculationTraceStep {
  ruleId: string
  label: string
  detail: string
  legalReference: string
}

export interface CalculationLine {
  kind: BenefitKind | "WORK_COMBINATION_EXTENSION"
  label: string
  weeks: number
  days: number
  rate: number
  amountGrosze: number
  legalReference: string
}

export interface CalculatorResult {
  input: CalculatorInput
  normalizedChildrenCount: number
  maternityWeeks: number
  preBirthWeeks: number
  postBirthWeeks: number
  parentalPoolWeeks: number
  secondParentWeeks: number
  motherParentalWeeks: number
  extensionWeeks: number
  paternityDays: number
  basisGrosze: number
  dailyBasisGrosze: number
  lines: CalculationLine[]
  totalGrosze: number
  verified: boolean
  status: "OK" | "INDETERMINATE"
  warnings: string[]
  trace: CalculationTraceStep[]
}
