import { RULES, type RuleId, type SourceRef, src } from "./sources"

/**
 * Versioned rule sets. Rule *logic* is code; every rate, duration, limit and
 * deadline is data here (architecture AD-01). A published rule set is
 * immutable; a change in the law is a new version with its own effective
 * date (AD-02). The set that applies is the one in force on the day the right
 * arises — birth, taking the child in, or the start of incapacity (A-12).
 *
 * Values that the official sources do not contain (minimum wage, the
 * świadczenie rodzicielskie amount, average wage, the rehabilitation index)
 * are `null` and marked UNVERIFIED (Q-29). The engine never substitutes a
 * number for them: rules that need them are reported as not applied.
 */

/** Decimal values are strings so they are parsed exactly by `Ratio`. */
export type DecimalString = string

export interface RuleSetParameters {
  sickness: {
    waitingDaysCompulsory: number
    waitingDaysVoluntary: number
    priorPeriodGapToleranceDays: number
    employerPaidDays: number
    employerPaidDaysAfter50: number
    maxPeriodDays: number
    maxPeriodDaysPregnancy: number
    afterTitleOnsetDays: number
    afterTitleMinIncapacityDays: number
    afterTitleMaxDays: number
    rateGeneral: DecimalString
    ratePregnancy: DecimalString
    aggregationGapDays: number
    singlePeriodAcrossTitles: boolean
  }
  rehabilitation: {
    maxMonths: number
    rateFirstMonths: DecimalString
    firstMonths: number
    rateLater: DecimalString
    ratePregnancy: DecimalString
  }
  basis: {
    referenceMonths: number
    contributionDeduction: DecimalString
    dailyDivisor: number
    noRecalculationGapMonths: number
  }
  maternity: {
    weeksByChildren: Record<1 | 2 | 3 | 4 | 5, number>
    maxPreBirthWeeks: number
    motherPersonalWeeks: number
    specialTakeoverMinWeeks: number
    lossWeeksAfterBirth: number
    lossMinDaysAfterDeath: number
    lossChildAgeLimitWeeks: number
    abandonmentMinWeeks: number
  }
  supplementary: {
    veryEarlyBeforeCompletedWeek: number
    veryLowWeightMaxGrams: number
    veryEarlyWindowWeeks: number
    pretermBeforeCompletedWeek: number
    pretermWindowWeeks: number
    termWindowWeeks: number
    termFirstDayFrom: number
    termFirstDayTo: number
    termMinConsecutiveDays: number
  }
  parental: {
    poolWeeks: { single: number; multiple: number; zaZyciemSingle: number; zaZyciemMultiple: number }
    guaranteeCasePoolWeeks: { standard: number; zaZyciem: number }
    nonTransferableWeeks: number
    maxParts: number
    lastYearChildAge: number
    maxWorkFraction: DecimalString
    workExtensionCapWeeks: { single: number; multiple: number; zaZyciemSingle: number; zaZyciemMultiple: number }
  }
  paternity: {
    maxDays: number
    maxParts: number
    minPartDays: number
    deadlineChildAgeMonths: number
    adoptionDeadlineMonths: number
    adoptionMaxChildAgeYears: number
  }
  maternityTerms: {
    weeksByChildren: Record<1 | 2 | 3 | 4 | 5, number>
    fosterMaxChildAgeYears: number
    fosterDeferredSchoolMaxChildAgeYears: number
    adoptionMaxChildAgeYears: number
    guaranteedWeeks: number
  }
  rates: {
    maternity: DecimalString
    maternityTerms: DecimalString
    supplementary: DecimalString
    paternity: DecimalString
    preBirth: DecimalString
    parental: DecimalString
    flat: DecimalString
    otherParentReserved: DecimalString
    maternityEquivalent: DecimalString
    flatApplicationDays: number
  }
  debt: {
    thresholdShareOfMinimumWage: DecimalString
    expiryMonths: number
    paymentAfterRepaymentDays: number
  }
  payer: { selfPayingAboveInsured: number }
  deadlines: {
    claimExpiryMonths: number
    claimExpiryOnErrorYears: number
    smallPayerForwardDays: number
    zusPaymentDays: number
    parentalNoticeDays: number
    workCombinationNoticeDays: number
    employerAnswerDays: number
    supplementaryNoticeDays: number
    takeoverNoticeDays: number
    resignationNoticeDays: number
    paternityNoticeDays: number
    maternityTermsRequestDays: number
    maternityTermsStartMaxDays: number
    preBirthRequestDays: number
    funeralClaimMonths: number
  }
  forms: {
    /** ZUR and ZAO merged into ZAM; Z-3b abolished (T fn. 3–5). */
    zamMerged: boolean
    selfEmployedSicknessForm: "ZAS-53" | "Z-3b"
  }
  amounts: {
    stillbirthFuneralGrosze: number
  }
  /** Values not contained in the sources. `null` until an administrator enters a sourced value. */
  external: {
    minimumWageGrosze: number | null
    parentalBenefitAmountGrosze: number | null
    averageWageGrosze: number | null
    rehabilitationIndex: DecimalString | null
  }
  money: {
    rounding: "HALF_UP"
    /** Rounding happens once per calculation line, never on intermediate values. */
    stage: "PER_LINE"
    basisRounding: "HALF_UP"
  }
}

export type ParameterVerification =
  | "VERIFIED_ZUS"
  | "VERIFIED_T"
  | "ASSUMPTION"
  | "UNVERIFIED"
  /** Entered by an administrator with a cited source, outside the published set. */
  | "ADMIN_ENTERED"

export interface ParameterMeta {
  path: string
  verification: ParameterVerification
  sources: SourceRef[]
  openQuestion?: string
  note?: string
}

export interface RuleSet {
  version: string
  label: string
  status: "PUBLISHED"
  effectiveFrom: string
  /** Inclusive last day, or null while in force. */
  effectiveTo: string | null
  changes: string[]
  rules: RuleId[]
  parameters: RuleSetParameters
  parameterMeta: ParameterMeta[]
}

const MATERNITY_WEEKS = { 1: 20, 2: 31, 3: 33, 4: 35, 5: 37 } as const

const BASE_PARAMETERS: RuleSetParameters = {
  sickness: {
    waitingDaysCompulsory: 30,
    waitingDaysVoluntary: 90,
    priorPeriodGapToleranceDays: 30,
    employerPaidDays: 33,
    employerPaidDaysAfter50: 14,
    maxPeriodDays: 182,
    maxPeriodDaysPregnancy: 270,
    afterTitleOnsetDays: 14,
    afterTitleMinIncapacityDays: 30,
    afterTitleMaxDays: 91,
    rateGeneral: "0.8",
    ratePregnancy: "1",
    aggregationGapDays: 60,
    singlePeriodAcrossTitles: false,
  },
  rehabilitation: {
    maxMonths: 12,
    rateFirstMonths: "0.9",
    firstMonths: 3,
    rateLater: "0.75",
    ratePregnancy: "1",
  },
  basis: {
    referenceMonths: 12,
    contributionDeduction: "0.1371",
    dailyDivisor: 30,
    noRecalculationGapMonths: 1,
  },
  maternity: {
    weeksByChildren: MATERNITY_WEEKS,
    maxPreBirthWeeks: 6,
    motherPersonalWeeks: 14,
    specialTakeoverMinWeeks: 8,
    lossWeeksAfterBirth: 8,
    lossMinDaysAfterDeath: 7,
    lossChildAgeLimitWeeks: 8,
    abandonmentMinWeeks: 8,
  },
  supplementary: {
    veryEarlyBeforeCompletedWeek: 28,
    veryLowWeightMaxGrams: 1000,
    veryEarlyWindowWeeks: 15,
    pretermBeforeCompletedWeek: 37,
    pretermWindowWeeks: 8,
    termWindowWeeks: 8,
    termFirstDayFrom: 5,
    termFirstDayTo: 28,
    termMinConsecutiveDays: 2,
  },
  parental: {
    poolWeeks: { single: 41, multiple: 43, zaZyciemSingle: 65, zaZyciemMultiple: 67 },
    guaranteeCasePoolWeeks: { standard: 38, zaZyciem: 62 },
    nonTransferableWeeks: 9,
    maxParts: 5,
    lastYearChildAge: 6,
    maxWorkFraction: "0.5",
    workExtensionCapWeeks: { single: 82, multiple: 86, zaZyciemSingle: 130, zaZyciemMultiple: 134 },
  },
  paternity: {
    maxDays: 14,
    maxParts: 2,
    minPartDays: 7,
    deadlineChildAgeMonths: 12,
    adoptionDeadlineMonths: 12,
    adoptionMaxChildAgeYears: 14,
  },
  maternityTerms: {
    weeksByChildren: MATERNITY_WEEKS,
    fosterMaxChildAgeYears: 7,
    fosterDeferredSchoolMaxChildAgeYears: 10,
    adoptionMaxChildAgeYears: 14,
    guaranteedWeeks: 9,
  },
  rates: {
    maternity: "1",
    maternityTerms: "1",
    supplementary: "1",
    paternity: "1",
    preBirth: "1",
    parental: "0.7",
    flat: "0.815",
    otherParentReserved: "0.7",
    maternityEquivalent: "1",
    flatApplicationDays: 21,
  },
  debt: {
    thresholdShareOfMinimumWage: "0.01",
    expiryMonths: 6,
    paymentAfterRepaymentDays: 60,
  },
  payer: { selfPayingAboveInsured: 20 },
  deadlines: {
    claimExpiryMonths: 6,
    claimExpiryOnErrorYears: 3,
    smallPayerForwardDays: 7,
    zusPaymentDays: 30,
    parentalNoticeDays: 21,
    workCombinationNoticeDays: 21,
    employerAnswerDays: 7,
    supplementaryNoticeDays: 21,
    takeoverNoticeDays: 14,
    resignationNoticeDays: 7,
    paternityNoticeDays: 7,
    maternityTermsRequestDays: 7,
    maternityTermsStartMaxDays: 21,
    preBirthRequestDays: 14,
    funeralClaimMonths: 12,
  },
  forms: { zamMerged: true, selfEmployedSicknessForm: "ZAS-53" },
  amounts: { stillbirthFuneralGrosze: 700_000 },
  external: {
    minimumWageGrosze: null,
    parentalBenefitAmountGrosze: null,
    averageWageGrosze: null,
    rehabilitationIndex: null,
  },
  money: { rounding: "HALF_UP", stage: "PER_LINE", basisRounding: "HALF_UP" },
}

const PARAMETER_META: ParameterMeta[] = [
  { path: "sickness", verification: "VERIFIED_ZUS", sources: [src("U", "art. 4, 7–9, 11"), src("KP", "art. 92")] },
  { path: "rehabilitation", verification: "VERIFIED_ZUS", sources: [src("U", "art. 18–19")] },
  { path: "basis", verification: "VERIFIED_ZUS", sources: [src("U", "art. 3, 36, 38, 43, 48"), src("P", "s. 24–25")] },
  { path: "maternity", verification: "VERIFIED_ZUS", sources: [src("KP", "art. 180, 180¹, 182")] },
  { path: "supplementary", verification: "VERIFIED_ZUS", sources: [src("KP", "art. 180²")] },
  { path: "parental", verification: "VERIFIED_ZUS", sources: [src("KP", "art. 182¹a, 182¹c, 182¹e, 182¹f"), src("KP", "art. 183 § 4–4⁵")] },
  { path: "paternity", verification: "VERIFIED_ZUS", sources: [src("KP", "art. 182³")] },
  { path: "maternityTerms", verification: "VERIFIED_ZUS", sources: [src("KP", "art. 183 § 1–3")] },
  { path: "maternityTerms.guaranteedWeeks", verification: "ASSUMPTION", sources: [src("KP", "art. 183 § 3")], openQuestion: "Q-30" },
  { path: "rates", verification: "VERIFIED_ZUS", sources: [src("U", "art. 30 ust. 3, art. 30a, art. 31"), src("P", "s. 33–34")] },
  { path: "debt", verification: "VERIFIED_ZUS", sources: [src("U", "art. 2a, art. 64 ust. 3")] },
  { path: "payer", verification: "VERIFIED_ZUS", sources: [src("U", "art. 61")] },
  { path: "deadlines", verification: "VERIFIED_ZUS", sources: [src("KP", "art. 180, 180², 182¹d, 182¹e, 182³, 183"), src("U", "art. 64, 67"), src("P", "s. 26–27, 35")] },
  { path: "forms", verification: "VERIFIED_T", sources: [src("T", "s. 12 przyp. 3–5")], openQuestion: "Q-33" },
  { path: "amounts.stillbirthFuneralGrosze", verification: "VERIFIED_ZUS", sources: [src("P", "s. 35")] },
  { path: "external", verification: "UNVERIFIED", sources: [], openQuestion: "Q-29" },
  { path: "money", verification: "ASSUMPTION", sources: [], openQuestion: "Q-15" },
]

const COMMON_RULES: RuleId[] = (Object.keys(RULES) as RuleId[]).filter(
  (id) => id !== "LR-103A" && id !== "LR-05"
)

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object") {
    for (const key of Object.keys(value)) deepFreeze((value as Record<string, unknown>)[key])
    Object.freeze(value)
  }
  return value
}

function withParameters(
  patch: (parameters: RuleSetParameters) => void
): RuleSetParameters {
  const parameters = structuredClone(BASE_PARAMETERS)
  patch(parameters)
  return parameters
}

export const RULE_SETS: readonly RuleSet[] = deepFreeze([
  {
    version: "2026.07-Z1",
    label: "Stan prawny od 1.07.2026 r. (przed połączeniem formularzy w ZAM)",
    status: "PUBLISHED",
    effectiveFrom: "2026-07-01",
    effectiveTo: "2026-10-23",
    changes: [
      "Ustawa zasiłkowa w brzmieniu Dz.U. 2026 poz. 854, w tym art. 61b od 1.07.2026 r.",
      "Formularze sprzed 24.10.2026 r.: wnioski ZUR/ZAO, zaświadczenie Z-3b (Poradnik ZUS, stan na 1.04.2026 r.).",
      "Wykaz dokumentów z rozporządzenia Dz.U. 2026 poz. 1316 stosowany pomocniczo (rozporządzenie weszło w życie później).",
    ],
    rules: COMMON_RULES,
    parameters: withParameters((parameters) => {
      parameters.forms = { zamMerged: false, selfEmployedSicknessForm: "Z-3b" }
    }),
    parameterMeta: PARAMETER_META,
  },
  {
    version: "2026.10-Z1",
    label: "Stan prawny od 24.10.2026 r. (formularz ZAM, zniesienie Z-3b)",
    status: "PUBLISHED",
    effectiveFrom: "2026-10-24",
    effectiveTo: "2026-12-31",
    changes: [
      "ZUR i ZAO połączone w ZAM; zaświadczenie Z-3b zniesione (treść zadania, przyp. 3–5).",
      "Wykaz dokumentów według rozporządzenia Dz.U. 2026 poz. 1316.",
    ],
    rules: [...COMMON_RULES, "LR-05"],
    parameters: withParameters(() => {}),
    parameterMeta: PARAMETER_META,
  },
  {
    version: "2027.01-Z1",
    label: "Stan prawny od 1.01.2027 r. (jeden okres zasiłkowy dla wszystkich tytułów)",
    status: "PUBLISHED",
    effectiveFrom: "2027-01-01",
    effectiveTo: null,
    changes: [
      "Art. 9 ust. 4 ustawy zasiłkowej: jeden okres zasiłkowy niezależnie od liczby tytułów ubezpieczenia.",
      "Art. 17 ust. 1d–1e: możliwość niewystawienia zwolnienia z tytułu, w którym praca może być wykonywana.",
    ],
    rules: [...COMMON_RULES, "LR-05", "LR-103A"],
    parameters: withParameters((parameters) => {
      parameters.sickness.singlePeriodAcrossTitles = true
    }),
    parameterMeta: PARAMETER_META,
  },
])

export const EARLIEST_SUPPORTED_DATE = RULE_SETS[0]!.effectiveFrom

export function ruleSetByVersion(version: string): RuleSet | null {
  return RULE_SETS.find((set) => set.version === version) ?? null
}

/** The rule set in force on `date`, or null when the date precedes every supported version. */
export function ruleSetFor(date: string): RuleSet | null {
  return (
    RULE_SETS.find(
      (set) => set.effectiveFrom <= date && (set.effectiveTo === null || date <= set.effectiveTo)
    ) ?? null
  )
}

export function latestRuleSet(): RuleSet {
  return RULE_SETS[RULE_SETS.length - 1]!
}

/**
 * Applies administrator-entered external values (Q-29) on top of a published
 * rule set. Each value must cite its official source; the result is a derived,
 * unpublished view used for one assessment and reported as such.
 */
export interface ExternalParameterOverride {
  minimumWageGrosze?: number
  parentalBenefitAmountGrosze?: number
  averageWageGrosze?: number
  /** Where the values come from, e.g. "Rozporządzenie RM z … (Dz.U. … poz. …)". */
  sourceNote: string
}

export function withExternalParameters(
  ruleSet: RuleSet,
  override: ExternalParameterOverride | undefined
): RuleSet {
  if (!override) return ruleSet
  const parameters = structuredClone(ruleSet.parameters)
  if (override.minimumWageGrosze !== undefined) parameters.external.minimumWageGrosze = override.minimumWageGrosze
  if (override.parentalBenefitAmountGrosze !== undefined)
    parameters.external.parentalBenefitAmountGrosze = override.parentalBenefitAmountGrosze
  if (override.averageWageGrosze !== undefined) parameters.external.averageWageGrosze = override.averageWageGrosze
  return {
    ...ruleSet,
    version: `${ruleSet.version}+ext`,
    changes: [...ruleSet.changes, `Parametry zewnętrzne wprowadzone ręcznie: ${override.sourceNote}`],
    parameters,
    parameterMeta: [
      ...ruleSet.parameterMeta.filter((meta) => meta.path !== "external"),
      { path: "external", verification: "ADMIN_ENTERED", sources: [], note: override.sourceNote },
    ],
  }
}
