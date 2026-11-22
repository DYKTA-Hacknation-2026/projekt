import type { Period } from "./calendar"
import type { ExternalParameterOverride } from "./rulesets"
import type { RuleId, SourceRef } from "./sources"

/* ------------------------------------------------------------------------ */
/* Input                                                                    */
/* ------------------------------------------------------------------------ */

export type ParentRole = "MOTHER" | "FATHER"

export type InsuranceTitle = "EMPLOYMENT" | "MANDATE" | "SELF_EMPLOYMENT" | "OTHER" | "NONE"

export type SicknessCoverage = "COMPULSORY" | "VOLUNTARY" | "NONE"

export type TitleEndReason =
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

export type DayOneException =
  | "GRADUATE_WITHIN_90_DAYS"
  | "COMMUTING_ACCIDENT"
  | "TEN_YEARS_COMPULSORY"
  | "MP_OR_SENATOR"
  | "CUSTOMS_OFFICER"

export type PriorGapReason = "UNPAID_LEAVE" | "CHILDCARE_LEAVE" | "MILITARY_SERVICE"

export interface InsuranceInput {
  title?: InsuranceTitle
  /** Employees are always COMPULSORY; mandate and self-employment need an explicit answer. */
  sicknessInsurance?: SicknessCoverage
  /** First day of the current, uninterrupted sickness insurance. */
  startDate?: string
  /** An earlier sickness insurance period (counted when the gap is ≤ 30 days, U art. 4 ust. 2). */
  previousInsuranceStartDate?: string
  previousInsuranceEndDate?: string
  previousGapReason?: PriorGapReason
  dayOneException?: DayOneException
  /** Planned or actual last day of the insurance title. */
  endDate?: string
  endReason?: TitleEndReason
  /** The title ended while the insured person was pregnant (U art. 30 ust. 1, 3). */
  endedDuringPregnancy?: boolean
  /** Employer provided other employment after bankruptcy, liquidation or death (U art. 30 ust. 3). */
  otherEmploymentProvided?: boolean
  /** KP art. 177 § 3 facts for a fixed-term or probation contract. */
  fixedTermContract?: {
    longerThanOneMonth?: boolean
    wouldEndAfterThirdMonthOfPregnancy?: boolean
    replacementContract?: boolean
  }
  /** On urlop wychowawczy on the day the right arises (counts as insurance, U art. 29 ust. 1). */
  onChildcareLeave?: boolean
  payerSize?: "OVER_20" | "UP_TO_20"
  /** Employment fraction, "1" = full time. Needed for the minimum basis (U art. 45). */
  workingTimeFraction?: string
  contributionDebt?: {
    exists: boolean
    amountGrosze?: number
    /** Debt above 1% of the minimum wage on the day the right arises, if known (U art. 2a). */
    exceedsThreshold?: boolean
    repaidOn?: string
  }
}

export type BasisInput =
  /** A basis already established (e.g. from Z-3/Z-3a or an earlier benefit, U art. 43). */
  | { method: "KNOWN_BASIS"; monthlyBasisGrosze: number; origin?: "PAYER_CERTIFICATE" | "PREVIOUS_BENEFIT" | "USER" }
  /** One representative monthly gross pay (employee) or contribution basis (non-employee). */
  | { method: "GROSS_MONTHLY"; grossMonthlyGrosze: number }
  /** Month-by-month amounts of the reference period (U art. 36–38, 48, 50). */
  | {
      method: "MONTHLY_HISTORY"
      months: {
        /** YYYY-MM */
        month: string
        /** Gross pay (employee) or sickness contribution basis (non-employee). */
        grossGrosze: number
        /** Worked (or ran the business) at least half of the required time (U art. 38 ust. 2, art. 50). */
        workedAtLeastHalf?: boolean
        /** Amount after supplementing a reduced month per U art. 37 ust. 2 (employee). */
        supplementedGrossGrosze?: number
      }[]
    }
  /** Declared contribution basis, insured shorter than the reference period (U art. 48a). */
  | {
      method: "DECLARED_SHORT_INSURANCE"
      months: { month: string; declaredBasisGrosze: number; lowestBasisGrosze: number }[]
    }

export interface ParentInput {
  role: ParentRole
  insurance?: InsuranceInput
  basis?: BasisInput
  /** Year of birth, for the 14-day employer sick pay after 50 (KP art. 92 § 1, § 5). */
  birthYear?: number
  /** Ruling of incapacity for independent existence (orzeczenie o niezdolności do samodzielnej egzystencji). */
  incapacityForIndependentExistence?: boolean
  /** Inpatient stay that prevents personal care of the child (KP art. 180 § 10). */
  hospitalization?: { start: string; end?: string }
  deathDate?: string
  abandonedChildOn?: string
  /** Uninsured mother took up employment of at least ½ time (KP art. 180 § 17; U art. 29 ust. 10). */
  tookEmploymentAtLeastHalfTimeOn?: string
  /** Risk signals (LR-70, LR-71). */
  contributionBasisRaisedDuringPregnancy?: boolean
  titleStartedDuringPregnancy?: boolean
}

export type FamilyEventKind = "PREGNANCY" | "BIRTH" | "ADOPTION" | "FOSTER_CARE"

export interface HospitalStayInput {
  /** Index of the child (0-based) for multiple births. */
  child?: number
  start: string
  end: string
}

export interface FamilyEventInput {
  kind: FamilyEventKind
  expectedDueDate?: string
  birthDate?: string
  /** Adoption or foster care: date the child was taken in. */
  careTakingDate?: string
  /** Adoption: date of the application to the guardianship court. */
  courtApplicationDate?: string
  /** Adoption: date the adoption order became final (paternity deadline, KP art. 182³ § 1 pkt 2). */
  adoptionFinalDate?: string
  /** Adoption or foster care: child's date of birth (age caps). */
  childBirthDate?: string
  /** Children born in one birth or taken in at the same time. */
  childrenCount?: number
  zaZyciem?: boolean
  /** Foster care: decision deferring compulsory schooling (10-year cap). */
  schoolDeferred?: boolean
  professionalFosterFamily?: boolean
  /** Adoption following foster care: weeks of leave already used (KP art. 183 § 7–8). */
  previouslyUsedMaternityTermsWeeks?: number
  previouslyUsedParentalWeeks?: number
  /** All children were stillborn. */
  stillbirth?: boolean
  /** Death dates of live-born children (one entry per child). */
  childDeaths?: { date: string }[]
  /** Completed weeks of pregnancy at birth (e.g. 27 = before completing week 28). */
  gestationalWeeksCompleted?: number
  /** Lowest birth weight among the children, grams. */
  lowestBirthWeightGrams?: number
  childHospitalStays?: HospitalStayInput[]
  /** Child placed in foster care or an institution by court order (KP art. 182). */
  childPlacedInCareOn?: string
}

export type PaymentOption = "STANDARD_100_70" | "FLAT_81_5"

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

export interface ParentalSegmentInput {
  parent: ParentRole
  /** Weeks of parental leave (whole weeks; use `days` for a remainder). */
  weeks: number
  days?: number
  startDate?: string
  /** Fraction of full time worked during this segment, "0"–"0.5" (KP art. 182¹e). */
  workFraction?: string
  /** Fraction worked during the extension created by this segment (KP art. 182¹f § 7). */
  extensionWorkFraction?: string
}

export interface PaternityPartInput {
  startDate?: string
  days: number
}

export interface LeavePlanInput {
  paymentOption?: PaymentOption
  /** Date the mother filed (or will file) the written 81.5% application (U art. 30a). */
  flatRateApplicationDate?: string
  /** Weeks of maternity leave before the due date, 0–6 (KP art. 180 § 2). */
  maternityWeeksBeforeBirth?: number
  /** First day of maternity leave, when already known. */
  maternityStartDate?: string
  /** Father takes over part of maternity leave. */
  maternityTakeover?: {
    reason: TakeoverReason
    /** Weeks after the birth the mother uses before the takeover. */
    motherWeeksAfterBirth?: number
    /** Day the circumstance arose (e.g. incapacity ruling of an uninsured mother); the father's part starts the next day. */
    fromDate?: string
  }
  supplementaryParent?: ParentRole
  parentalSegments?: ParentalSegmentInput[]
  paternity?: PaternityPartInput[]
}

export interface SickLeaveInput {
  start: string
  end: string
  /** e-ZLA carries code "B" (pregnancy). */
  pregnancyCode?: boolean
  /** Days of employer sick pay already used this calendar year. */
  employerPaidDaysUsedThisYear?: number
  /** Incapacity days already counted in the current okres zasiłkowy (U art. 9). */
  priorDaysInBenefitPeriod?: number
}

export interface AssessmentInput {
  /** Evaluation date (today, Europe/Warsaw). Used for deadline status only. */
  asOf: string
  /** Pin a rule set; otherwise chosen by the date the right arises. */
  ruleSetVersion?: string
  event: FamilyEventInput
  parents: ParentInput[]
  plan?: LeavePlanInput
  /** Mother's sick leave in pregnancy. */
  sickLeave?: SickLeaveInput
  externalParameters?: ExternalParameterOverride
  /** Codes of documents the user already has (see the document catalogue). */
  providedDocuments?: string[]
}

/* ------------------------------------------------------------------------ */
/* Output                                                                   */
/* ------------------------------------------------------------------------ */

export type BenefitType =
  | "SICKNESS_IN_PREGNANCY"
  | "EMPLOYER_SICK_PAY"
  | "REHABILITATION"
  | "MATERNITY_EQUIVALENT"
  | "MATERNITY"
  | "MATERNITY_TERMS"
  | "SUPPLEMENTARY_MATERNITY"
  | "PARENTAL"
  | "PATERNITY"
  | "STILLBIRTH_FUNERAL_ALLOWANCE"

export type EligibilityStatus =
  | "ELIGIBLE"
  /** Due if a stated condition is met (e.g. debt repaid, insurance kept until the birth). */
  | "CONDITIONAL"
  | "NOT_ELIGIBLE"
  | "NEEDS_INPUT"
  | "MANUAL_REVIEW"

export type AmountStatus =
  | "CALCULATED"
  /** Calculated, but a rule that could only raise the amount was not applied (missing external value). */
  | "CALCULATED_LOWER_BOUND"
  /** Calculated, but a cap that could only lower the amount was not applied (missing external value). */
  | "CALCULATED_UPPER_BOUND"
  | "BASIS_UNKNOWN"
  | "NOT_CALCULATED"
  | "NOT_APPLICABLE"

export interface Reason {
  code: string
  text: string
  ruleId: RuleId
}

export interface MissingEvidence {
  key: string
  parent?: ParentRole
  question: string
  why: string
  affects: BenefitType[]
}

export interface Warning {
  code: string
  severity: "INFO" | "WARNING" | "RISK"
  parent?: ParentRole
  text: string
  ruleId?: RuleId
}

export interface Determination {
  benefit: BenefitType
  parent: ParentRole
  label: string
  status: EligibilityStatus
  reasons: Reason[]
  conditions: string[]
  missingEvidence: string[]
  payer: "EMPLOYER" | "ZUS" | "UNKNOWN" | "NONE"
}

export interface CalculationLine {
  id: string
  parent: ParentRole
  benefit: BenefitType
  label: string
  period: Period | null
  days: number
  /** Rate as a decimal string, e.g. "0.815". */
  rate: string
  ratePercent: string
  /** Share of the benefit still paid when combining work, "1" otherwise. */
  paidFraction: string
  monthlyBasisGrosze: number | null
  /** Exact amount before rounding, as a fraction string. */
  exactAmount: string | null
  amountGrosze: number | null
  formula: string
  ruleIds: RuleId[]
  note?: string
}

export interface BasisResult {
  parent: ParentRole
  status: "PROVIDED" | "CALCULATED" | "UNKNOWN" | "INCONSISTENT"
  method: BasisInput["method"] | null
  monthlyBasisGrosze: number | null
  dailyBasis: string | null
  steps: string[]
  minimumBasisApplied: "APPLIED" | "NOT_NEEDED" | "NOT_CHECKED" | "NOT_APPLICABLE"
  ruleIds: RuleId[]
}

export interface BenefitPeriod {
  id: string
  parent: ParentRole
  benefit: BenefitType
  label: string
  start: string
  end: string
  days: number
  weeks: string
  estimated: boolean
  workFraction?: string
  part?: number
}

export interface ParentAllocation {
  parent: ParentRole
  eligibleForMaternityBenefits: EligibilityStatus
  maternityDays: number
  maternityTakeoverDays: number
  supplementaryDays: number
  parentalDays: number
  parentalExtensionDays: number
  /** Weeks of the shared pool reserved for this parent (non-transferable). */
  reservedParentalWeeks: number
  reservedParentalDaysUsed: number
  /** Reserved days that lapse if this parent does not use them. */
  reservedParentalDaysUnused: number
  maxOwnParentalWeeks: number
  paternityDays: number
  totalBenefitDays: number
  totalGrosze: number | null
  amountStatus: AmountStatus
}

export interface ApplicableBenefit {
  benefit: BenefitType
  parent: ParentRole
  label: string
  status: EligibilityStatus
  days: number
  rates: string[]
  amountGrosze: number | null
  amountStatus: AmountStatus
}

export interface TimelineEntry {
  id: string
  date: string
  endDate?: string
  kind: "PERIOD" | "DEADLINE" | "EVENT"
  parent?: ParentRole | "BOTH"
  title: string
  detail: string
  estimated: boolean
  status?: "UPCOMING" | "TODAY" | "PASSED"
  ruleId?: RuleId
}

export interface NextStep {
  id: string
  parent?: ParentRole | "BOTH"
  text: string
  dueDate?: string
  ruleId?: RuleId
}

export interface AppliedRule {
  ruleId: RuleId
  title: string
  ruleSetVersion: string
  sources: string[]
  verification: string
  openQuestion?: string
}

export interface UnsupportedScenario {
  code: string
  text: string
}

export type AssessmentStatus = "COMPLETE" | "PARTIAL" | "MANUAL_REVIEW"

export interface Totals {
  currency: "PLN"
  gross: true
  totalGrosze: number | null
  amountStatus: AmountStatus
  byParent: { parent: ParentRole; totalGrosze: number | null; amountStatus: AmountStatus }[]
  byBenefit: { benefit: BenefitType; parent: ParentRole; totalGrosze: number | null }[]
}

export interface Assessment {
  kind: "ESTIMATE"
  disclaimer: string
  engineVersion: string
  inputHash: string
  asOf: string
  ruleSet: { version: string; label: string; effectiveFrom: string; effectiveTo: string | null; selectedBy: string }
  anchor: { kind: "BIRTH" | "DUE_DATE" | "CARE_TAKING" | "NONE"; date: string | null; estimated: boolean }
  status: AssessmentStatus
  eligibility: { status: EligibilityStatus; determinations: Determination[] }
  applicableBenefits: ApplicableBenefit[]
  basis: BasisResult[]
  breakdown: CalculationLine[]
  totals: Totals
  periods: BenefitPeriod[]
  allocation: ParentAllocation[]
  timeline: TimelineEntry[]
  appliedRules: AppliedRule[]
  sources: string[]
  assumptions: string[]
  missingEvidence: MissingEvidence[]
  warnings: Warning[]
  nextSteps: NextStep[]
  unsupported: UnsupportedScenario[]
  manualReviewReasons: string[]
  planAdjustments: string[]
}

export type { Period, SourceRef }
