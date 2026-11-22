/**
 * Situational questionnaire for `/start`.
 *
 * The questionnaire is deliberately data, not UI code: every question declares
 * when it is visible, whether it is required, why it matters and which fact of
 * the deterministic engine it feeds. React only renders it. Legal branching
 * therefore stays testable and out of presentational components.
 */

export const SITUATION_SCENARIOS = [
  "PLANNING",
  "PREGNANCY",
  "BIRTH",
  "ON_LEAVE",
  "CARE",
  "CHECK_DOCUMENT",
] as const
export type SituationScenario = (typeof SITUATION_SCENARIOS)[number]

export const EMPLOYMENT_FORMS = [
  "EMPLOYMENT",
  "MANDATE",
  "SELF_EMPLOYMENT",
  "OTHER",
  "NONE",
] as const
export type EmploymentForm = (typeof EMPLOYMENT_FORMS)[number]

export const SICKNESS_FORMS = ["COMPULSORY", "VOLUNTARY", "NONE"] as const
export type SicknessForm = (typeof SICKNESS_FORMS)[number]

export const CARE_KINDS = ["ADOPTION", "FOSTER_CARE"] as const
export type CareKind = (typeof CARE_KINDS)[number]

export const LEAVE_KINDS = ["MATERNITY", "PARENTAL", "PATERNITY"] as const
export type LeaveKind = (typeof LEAVE_KINDS)[number]

export const PAYMENT_OPTIONS = ["STANDARD_100_70", "FLAT_81_5"] as const
export type PaymentOptionAnswer = (typeof PAYMENT_OPTIONS)[number]

export const PREGNANCY_END_REASONS = [
  "FIXED_TERM_CONTRACT_END",
  "TERMINATION_BY_EMPLOYER",
  "RESIGNATION_OR_AGREEMENT",
  "EMPLOYER_BANKRUPTCY",
  "EMPLOYER_LIQUIDATION",
  "EMPLOYER_DEATH",
  "MANDATE_CONTRACT_END",
  "BUSINESS_CLOSED",
  "OTHER",
] as const
export type PregnancyEndReason = (typeof PREGNANCY_END_REASONS)[number]

/** Every answer is a string so the whole state is trivially serialisable. */
export const ANSWER_KEYS = [
  "scenario",
  "userRole",
  "leaveKind",
  "leaveStartDate",
  "parentalWeeksUsed",
  "dueDate",
  "birthDate",
  "childrenCount",
  "careKind",
  "careTakingDate",
  "childBirthDate",
  "courtApplicationDate",
  "adoptionFinalDate",
  "stillbirth",
  "hasZaZyciem",
  "premature",
  "gestationalWeeks",
  "birthWeightGrams",
  "fatherIncluded",
  "motherEmployment",
  "motherEmployerName",
  "motherSickness",
  "motherInsuranceStartDate",
  "motherInsuranceEndsBeforeEvent",
  "motherInsuranceEndDate",
  "motherEndReason",
  "motherIncome",
  "motherBasisMode",
  "motherWorkingTimeFraction",
  "motherPayerSize",
  "motherContributionDebt",
  "fatherEmployment",
  "fatherSickness",
  "fatherInsuranceStartDate",
  "fatherIncome",
  "fatherBasisMode",
  "fatherContributionDebt",
  "paymentOption",
  "maternityWeeksBeforeBirth",
  "fatherLeaveWeeks",
  "fatherPaternity",
  "motherNewTitleDuringPregnancy",
  "motherBasisRaisedDuringPregnancy",
] as const
export type AnswerKey = (typeof ANSWER_KEYS)[number]
export type SituationAnswers = Record<AnswerKey, string>

export function emptySituationAnswers(): SituationAnswers {
  return {
    scenario: "",
    userRole: "MOTHER",
    leaveKind: "",
    leaveStartDate: "",
    parentalWeeksUsed: "",
    dueDate: "",
    birthDate: "",
    childrenCount: "1",
    careKind: "",
    careTakingDate: "",
    childBirthDate: "",
    courtApplicationDate: "",
    adoptionFinalDate: "",
    stillbirth: "NO",
    hasZaZyciem: "NO",
    premature: "NO",
    gestationalWeeks: "",
    birthWeightGrams: "",
    fatherIncluded: "NO",
    motherEmployment: "",
    motherEmployerName: "",
    motherSickness: "",
    motherInsuranceStartDate: "",
    motherInsuranceEndsBeforeEvent: "",
    motherInsuranceEndDate: "",
    motherEndReason: "",
    motherIncome: "",
    motherBasisMode: "GROSS",
    motherWorkingTimeFraction: "1",
    motherPayerSize: "",
    motherContributionDebt: "",
    fatherEmployment: "",
    fatherSickness: "",
    fatherInsuranceStartDate: "",
    fatherIncome: "",
    fatherBasisMode: "GROSS",
    fatherContributionDebt: "",
    paymentOption: "",
    maternityWeeksBeforeBirth: "0",
    fatherLeaveWeeks: "",
    fatherPaternity: "",
    motherNewTitleDuringPregnancy: "NO",
    motherBasisRaisedDuringPregnancy: "NO",
  }
}

/** Contact details are only needed when the user decides to save the case. */
export interface ContactDetails {
  firstName: string
  lastName: string
  email: string
}

export const EMPTY_CONTACT: ContactDetails = {
  firstName: "",
  lastName: "",
  email: "",
}

export interface ContactDetailsPrefill extends Partial<ContactDetails> {
  /** Only used for safe prefill; never required for the analysis. */
  birthDate?: string
  city?: string
}

export const WIZARD_STEPS = [
  "situation",
  "family",
  "work",
  "additional",
  "summary",
] as const
export type WizardStepId = (typeof WIZARD_STEPS)[number]

export interface QuestionOption {
  value: string
  label: string
  description?: string
}

export interface QuestionDefinition {
  id: AnswerKey
  step: WizardStepId
  label: string
  help?: string
  /** Why the engine needs this fact. Shown next to the field. */
  why: string
  /** Fact consumed by the deterministic engine, e.g. `event.expectedDueDate`. */
  engineField: string
  kind: "choice" | "select" | "date" | "number" | "text"
  options?: readonly QuestionOption[]
  placeholder?: string
  suffix?: string
  min?: number
  max?: number
  /** Visible only when the predicate is true (default: always). */
  visible?: (answers: SituationAnswers) => boolean
  /** Required to run the analysis (default: false). */
  required?: (answers: SituationAnswers) => boolean
  /** Extra validation; returns a Polish error message. */
  validate?: (value: string, answers: SituationAnswers) => string | null
  /** Shown in the missing-information list of the summary. */
  missingHint?: string
}

export const EMPLOYMENT_OPTIONS: readonly QuestionOption[] = [
  {
    value: "EMPLOYMENT",
    label: "Umowa o pracę",
    description: "Ubezpieczenie chorobowe jest obowiązkowe.",
  },
  {
    value: "MANDATE",
    label: "Umowa zlecenia",
    description: "Ubezpieczenie chorobowe jest dobrowolne.",
  },
  {
    value: "SELF_EMPLOYMENT",
    label: "Działalność gospodarcza / B2B",
    description: "Ubezpieczenie chorobowe jest dobrowolne.",
  },
  {
    value: "OTHER",
    label: "Inna forma lub kilka tytułów",
    description: "Silnik ocenia jeden tytuł — resztę wskażemy do weryfikacji.",
  },
  {
    value: "NONE",
    label: "Brak zatrudnienia i ubezpieczenia",
    description: "Sprawdzimy, czy przysługują świadczenia bez ubezpieczenia.",
  },
]

export const YES_NO_OPTIONS: readonly QuestionOption[] = [
  { value: "YES", label: "Tak" },
  { value: "NO", label: "Nie" },
]

export const UNKNOWN_OPTIONS: readonly QuestionOption[] = [
  { value: "NO", label: "Nie" },
  { value: "YES", label: "Tak" },
  { value: "UNKNOWN", label: "Nie wiem" },
]
