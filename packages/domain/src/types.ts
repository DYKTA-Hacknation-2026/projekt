/**
 * Pure domain types shared by the calculator, contracts and the UI.
 *
 * Money is always expressed in grosze (integer). Rates are decimal fractions.
 * No I/O, dates from the clock or randomness is allowed in this package.
 */

import type {
  AmountStatus,
  AssessmentStatus,
  BenefitType,
  Determination,
  EligibilityStatus,
  MissingEvidence,
  UnsupportedScenario,
  Warning,
} from "./engine/types"

export type PaymentOption = "STANDARD_100_70" | "FLAT_81_5"

export type CalculatorMode = "BIRTH" | "ADOPTION" | "FOSTER_CARE"

export type SpecialCase =
  "STANDARD" | "STILLBIRTH" | "CHILD_DEATH_BEFORE_8W" | "CHILD_DEATH_AFTER_8W"

export type EmploymentType = "EMPLOYEE" | "CONTRACTOR" | "BUSINESS"

/**
 * `UNKNOWN` is a deliberate answer, not a missing value: the engine then asks
 * for the insurance title instead of assuming voluntary coverage. Employees
 * are always covered compulsorily, so `UNKNOWN` is equivalent to `COMPULSORY`
 * for them.
 */
export type SicknessCoverage = "COMPULSORY" | "VOLUNTARY" | "NONE" | "UNKNOWN"

export type IncomeMode = "SIMPLE" | "DETAILED" | "KNOWN_BASIS"

/** Why the insurance title ended; mirrors the engine's `TitleEndReason`. */
export type CalculatorEndReason =
  | "EMPLOYER_DEATH"
  | "EMPLOYER_BANKRUPTCY"
  | "EMPLOYER_LIQUIDATION"
  | "UNLAWFUL_TERMINATION_FINAL_JUDGMENT"
  | "FIXED_TERM_CONTRACT_END"
  | "TERMINATION_BY_EMPLOYER"
  | "RESIGNATION_OR_AGREEMENT"
  | "MANDATE_CONTRACT_END"
  | "BUSINESS_CLOSED"
  | "VOLUNTARY_INSURANCE_WITHDRAWN"
  | "OTHER"

export type TakeoverReason =
  | "MOTHER_RESIGNS_AFTER_14_WEEKS"
  | "MOTHER_INCAPACITY"
  | "MOTHER_HOSPITALIZED"
  | "MOTHER_DIED"
  | "MOTHER_ABANDONED_CHILD"
  | "UNINSURED_MOTHER_DIED"
  | "UNINSURED_MOTHER_ABANDONED_CHILD"
  | "UNINSURED_MOTHER_INCAPACITY"
  | "UNINSURED_MOTHER_EMPLOYED"

export type Beneficiary = "MOTHER" | "SECOND_PARENT"

export type BenefitKind =
  | "MATERNITY"
  | "MATERNITY_SUPPLEMENTARY"
  | "MATERNITY_TAKEOVER"
  | "PARENTAL"
  | "PATERNITY"
  | "LOSS_OF_CHILD"

/** One of the (up to) 12 months used to compute the individual basis. */
export interface MonthlyIncomeEntry {
  /** Month in YYYY-MM. Optional for the simple UI; the adapter fills it. */
  month?: string
  /** Gross pay actually received in the month, in grosze. */
  grossGrosze: number
  /** Absence above 50% of working time — the month is excluded (U art. 36). */
  absenceOver50Percent?: boolean
  /**
   * Remuneration supplemented to the level the person would have earned
   * (dopełnienie, U art. 38). Used instead of excluding the month.
   */
  supplementedGrosze?: number
}

export interface CalculatorInput {
  /** Gross monthly income of the mother (or main applicant), in grosze. */
  grossMonthlyIncomeGrosze: number
  /**
   * Monthly benefit basis retrieved from ZUS contribution bases. When set,
   * it is used instead of deriving the basis from gross income.
   */
  monthlyBasisOverrideGrosze?: number
  /** Number of children born in one birth. Values above the highest configured rule use the 5+ rule. */
  childrenCount: number
  /** The child holds a "Za życiem" certificate. */
  hasZaZyciem: boolean
  paymentOption: PaymentOption
  /** Actual birth date for BIRTH mode; used for calendar periods and deadlines. */
  birthDate?: string
  /** Date of the 81.5% application, if known. */
  flatRateApplicationDate?: string
  /** Reason for the father's takeover of maternity leave. */
  fatherMaternityTakeoverReason?: TakeoverReason
  /** Adoption: application to the guardianship court and final adoption order. */
  courtApplicationDate?: string
  adoptionFinalDate?: string
  /** Adoption/foster care: leave already used before the current placement. */
  previouslyUsedMaternityTermsWeeks?: number
  previouslyUsedParentalWeeks?: number
  /** Optional evaluation date; defaults to the latest rule set start. */
  asOf?: string
  /** Maternity leave taken before the due date, 0–6 weeks. */
  maternityWeeksBeforeBirth: number
  /** Weeks of the shared parental pool used by the second parent; capped by the rule set. */
  secondParentParentalWeeks: number
  /** Fraction of full-time work during parental leave; capped by the rule set. */
  parentalWorkFraction: number
  /** Paternity leave in days; capped by the active rule set. */
  paternityDays: number

  // --- Mode: birth / adoption / foster care (FR-CALC-04) ---
  mode?: CalculatorMode
  /** Child's age at placement in years (may be fractional, e.g. 13.5). */
  childAgeYears?: number
  /** ISO date (YYYY-MM-DD). With `placementDate` it overrides `childAgeYears`. */
  childBirthDate?: string
  /** ISO date the child was taken in for upbringing. */
  placementDate?: string
  /** School duty has been deferred (foster-care limit 10 instead of 7). */
  isDeferredSchooling?: boolean
  /** Professional foster families are excluded from this benefit. */
  isProfessionalFosterFamily?: boolean

  // --- Independent incomes and flexible split (FR-CALC-03) ---
  secondParentMonthlyIncomeGrosze?: number
  /** Weeks of the shared parental pool the mother takes herself. */
  motherParentalWeeks?: number
  /** Maternity weeks taken over by the father (0..maternityWeeks − 14). */
  fatherMaternityTakeoverWeeks?: number

  // --- Supplementary maternity leave and special cases (FR-CALC-01) ---
  childHospitalWeeks?: number
  /** Hospital days between day 5 and 28 of the child's life (term births). */
  childHospitalDaysDay5To28?: number
  birthWeekOfPregnancy?: number
  birthWeightGrams?: number
  specialCase?: SpecialCase
  /** Child's age in days at death (for loss cases). */
  childDeathDay?: number

  // --- Working during parental leave (FR-CALC-02) ---
  /** Weeks of the mother's parental leave combined with work (default: all). */
  workCombinedWeeks?: number
  /** Work is also combined during the extension (KP art. 182¹f). */
  combineWorkInExtension?: boolean

  // --- Individual basis (FR-CALC-05) ---
  incomeMode?: IncomeMode
  /** Up to 12 months, used when `incomeMode` is `DETAILED`. */
  monthlyIncomes?: MonthlyIncomeEntry[]
  employmentType?: EmploymentType
  /** A basis already established by the payer/ZUS (e.g. Z-3/Z-3a or an earlier benefit). */
  knownBasisGrosze?: number
  /** Known basis of the second parent, if the case gives one. */
  secondParentKnownBasisGrosze?: number
  /** Employment fraction used to scale the minimum basis (0.1–1). */
  employmentFraction?: number

  // --- Insurance / eligible parents (FR-CALC-01, FR-CALC-03) ---
  /** Both default to true; set false for a father-only or mother-only case. */
  motherEnabled?: boolean
  fatherEnabled?: boolean
  motherEmploymentType?: EmploymentType
  fatherEmploymentType?: EmploymentType
  motherSicknessInsurance?: SicknessCoverage
  fatherSicknessInsurance?: SicknessCoverage
  motherInsuranceStartDate?: string
  fatherInsuranceStartDate?: string
  motherInsuranceEndDate?: string
  fatherInsuranceEndDate?: string
  motherEndReason?: CalculatorEndReason
  fatherEndReason?: CalculatorEndReason
  motherPayerSize?: "OVER_20" | "UP_TO_20"
  fatherPayerSize?: "OVER_20" | "UP_TO_20"
  motherContributionDebt?: boolean
  fatherContributionDebt?: boolean
}

export interface CalculationTraceStep {
  ruleId: string
  label: string
  detail: string
  legalReference: string
}

export interface CalculationLine {
  kind: BenefitKind | "WORK_COMBINATION_EXTENSION"
  beneficiary: Beneficiary
  /** Human readable leave type, e.g. "Uzupełniający urlop macierzyński". */
  leaveType: string
  label: string
  weeks: number
  days: number
  rate: number
  amountGrosze: number
  /** The amount was raised to the PLN 1 000/month floor (U art. 31 ust. 3a). */
  minimumApplied: boolean
  legalReference: string
}

/**
 * Analysis metadata of the authoritative engine, kept even where the
 * calculator adapter returns the simplified result shape.
 *
 * The UI must show these values instead of deriving an "everything is fine"
 * message from `status` alone.
 */
export interface CalculatorAnalysis {
  /** Engine verdict: COMPLETE, PARTIAL or MANUAL_REVIEW. */
  status: AssessmentStatus
  eligibilityStatus: EligibilityStatus
  amountStatus: AmountStatus
  /** Total from the engine; `null` when no reliable amount exists. */
  totalGrosze: number | null
  missingEvidence: MissingEvidence[]
  /** Things the engine explicitly did not decide (U-xx). */
  unsupported: UnsupportedScenario[]
  manualReviewReasons: string[]
  /** Assumptions that actually affected this result (A-xx). */
  assumptions: string[]
  determinations: Determination[]
  warnings: Warning[]
}

export interface CalculatorResult {
  input: CalculatorInput
  mode: CalculatorMode
  eligible: boolean
  normalizedChildrenCount: number
  maternityWeeks: number
  motherMaternityWeeks: number
  fatherMaternityTakeoverWeeks: number
  supplementaryWeeks: number
  preBirthWeeks: number
  postBirthWeeks: number
  parentalPoolWeeks: number
  secondParentWeeks: number
  motherParentalWeeks: number
  extensionWeeks: number
  extensionCapWeeks: number
  paternityDays: number
  /** Child's age at placement in years, if known. */
  ageAtPlacementYears: number | null
  guaranteeApplied: boolean
  basisGrosze: number
  dailyBasisGrosze: number
  secondParentBasisGrosze: number
  secondParentDailyBasisGrosze: number
  motherEligible: boolean
  fatherEligible: boolean
  lines: CalculationLine[]
  totalGrosze: number
  totalsByBeneficiary: { beneficiary: Beneficiary; totalGrosze: number }[]
  verified: boolean
  status: "OK" | "INDETERMINATE" | "NOT_ELIGIBLE"
  /** Version label of the rule set that produced this result. */
  ruleSetVersion: string
  /** First day on which the rule set applies. */
  ruleSetEffectiveFrom: string
  /** True when every legal parameter was verified at calculation time. */
  ruleSetVerified: boolean
  /** Rule codes that still need an official value (e.g. LR-115/Q-29). */
  ruleSetUnverified: string[]
  /**
   * True when the birth/placement date precedes the earliest rule set the
   * application has. The result is then a simulation under the rule set named
   * in `historicalRuleSetVersion`, not an assessment under the law in force at
   * the event. Never present it as the user's outcome.
   */
  historicalSimulation: boolean
  /** Rule set used for the simulation when `historicalSimulation` is true. */
  historicalRuleSetVersion: string | null
  /** First date covered by the available rule sets. */
  earliestSupportedDate: string
  /** Engine analysis, including statuses COMPLETE/PARTIAL/MANUAL_REVIEW. */
  analysis: CalculatorAnalysis
  warnings: string[]
  trace: CalculationTraceStep[]
}
