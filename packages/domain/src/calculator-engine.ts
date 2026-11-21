import { calculatorRules } from "./calculator-rules"
import type { RuleSet } from "./rule-set"
import type { RuleSet as EngineRuleSet } from "./engine/rulesets"
import {
  MINIMUM_WAGE_GROSZE,
  PARENTAL_BENEFIT_FLOOR_GROSZE,
  PARENTAL_TOTAL_CAP_WEEKS,
} from "./constants"
import { dailyBasis } from "./money"
import { evaluate } from "./engine/evaluate"
import { latestRuleSet } from "./engine/rulesets"
import { precedingMonths } from "./engine/calendar"
import type {
  Assessment,
  AssessmentInput,
  BenefitType,
  FamilyEventInput,
  LeavePlanInput,
  ParentInput,
} from "./engine/types"

import type {
  CalculationLine,
  CalculationTraceStep,
  CalculatorInput,
  CalculatorMode,
  CalculatorResult,
  EmploymentType,
  SicknessCoverage,
} from "./types"

/**
 * Calculator adapter over the authoritative deterministic engine.
 *
 * The UI/API calculator is a what-if tool: it pins the latest rule set and
 * supplies the configured Q-29 values (minimum wage and parental-benefit floor)
 * so that its amounts and durations come from the same rules as the full API.
 * Missing facts are passed through; the engine reports them as missing evidence
 * instead of inventing a value.
 */

const EXTERNAL_NOTE =
  "Parametry aplikacji: minimalne wynagrodzenie 2026 i świadczenie rodzicielskie 1000 zł (Q-29 — do potwierdzenia oficjalnym źródłem)."

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function finite(value: number | undefined, fallback = 0): number {
  return value !== undefined && Number.isFinite(value) ? value : fallback
}

function unique<T>(values: T[]): T[] {
  return [...new Set(values)]
}

function normalize(
  input: CalculatorInput,
  rules: EngineRuleSet
): CalculatorInput {
  const motherEmploymentType =
    input.motherEmploymentType ?? input.employmentType ?? "EMPLOYEE"
  const fatherEmploymentType =
    input.fatherEmploymentType ?? input.employmentType ?? "EMPLOYEE"
  const coverage = (type: EmploymentType): SicknessCoverage =>
    type === "EMPLOYEE" ? "COMPULSORY" : "VOLUNTARY"
  return {
    ...input,
    mode: input.mode ?? "BIRTH",
    specialCase: input.specialCase ?? "STANDARD",
    incomeMode: input.incomeMode ?? "SIMPLE",
    grossMonthlyIncomeGrosze: Math.max(
      0,
      Math.round(finite(input.grossMonthlyIncomeGrosze))
    ),
    secondParentMonthlyIncomeGrosze:
      input.secondParentMonthlyIncomeGrosze === undefined
        ? undefined
        : Math.max(
            0,
            Math.round(finite(input.secondParentMonthlyIncomeGrosze))
          ),
    knownBasisGrosze:
      input.knownBasisGrosze === undefined
        ? undefined
        : Math.max(0, Math.round(finite(input.knownBasisGrosze))),
    secondParentKnownBasisGrosze:
      input.secondParentKnownBasisGrosze === undefined
        ? undefined
        : Math.max(0, Math.round(finite(input.secondParentKnownBasisGrosze))),
    childrenCount: clamp(
      Math.round(finite(input.childrenCount, 1)),
      1,
      Math.max(
        ...Object.keys(rules.parameters.maternity.weeksByChildren).map(Number)
      )
    ),
    maternityWeeksBeforeBirth: clamp(
      Math.round(finite(input.maternityWeeksBeforeBirth)),
      0,
      rules.parameters.maternity.maxPreBirthWeeks
    ),
    secondParentParentalWeeks: Math.max(
      0,
      Math.round(finite(input.secondParentParentalWeeks))
    ),
    parentalWorkFraction: clamp(
      finite(input.parentalWorkFraction),
      0,
      Number(rules.parameters.parental.maxWorkFraction)
    ),
    paternityDays: clamp(
      Math.round(finite(input.paternityDays)),
      0,
      rules.parameters.paternity.maxDays
    ),
    fatherMaternityTakeoverWeeks: Math.max(
      0,
      Math.round(finite(input.fatherMaternityTakeoverWeeks))
    ),
    employmentFraction: clamp(finite(input.employmentFraction, 1), 0.1, 1),
    motherEnabled: input.motherEnabled ?? true,
    fatherEnabled: input.fatherEnabled ?? true,
    motherEmploymentType,
    fatherEmploymentType,
    motherSicknessInsurance:
      input.motherSicknessInsurance ?? coverage(motherEmploymentType),
    fatherSicknessInsurance:
      input.fatherSicknessInsurance ?? coverage(fatherEmploymentType),
  }
}

function insuranceTitle(
  employmentType: EmploymentType
): "EMPLOYMENT" | "MANDATE" | "SELF_EMPLOYMENT" {
  if (employmentType === "EMPLOYEE") return "EMPLOYMENT"
  if (employmentType === "CONTRACTOR") return "MANDATE"
  return "SELF_EMPLOYMENT"
}

function monthlyHistory(
  input: CalculatorInput,
  rightDate: string
): NonNullable<ParentInput["basis"]> | undefined {
  const entries = input.monthlyIncomes ?? []
  if (entries.length === 0) return undefined
  const months = precedingMonths(rightDate, 12)
  return {
    method: "MONTHLY_HISTORY",
    months: entries.slice(0, 12).map((entry, index) => ({
      month:
        entry.month && /^\d{4}-(0[1-9]|1[0-2])$/.test(entry.month)
          ? entry.month
          : (months[index] ?? months[0]!),
      grossGrosze: Math.max(0, Math.round(entry.grossGrosze)),
      ...(entry.absenceOver50Percent ? { workedAtLeastHalf: false } : {}),
      ...(entry.supplementedGrosze !== undefined
        ? {
            supplementedGrossGrosze: Math.max(
              0,
              Math.round(entry.supplementedGrosze)
            ),
          }
        : {}),
    })),
  }
}

function parentBasis(
  input: CalculatorInput,
  role: "MOTHER" | "FATHER",
  rightDate: string
): ParentInput["basis"] | undefined {
  if (role === "MOTHER" && input.monthlyBasisOverrideGrosze !== undefined) {
    return {
      method: "KNOWN_BASIS",
      monthlyBasisGrosze: Math.max(
        0,
        Math.round(input.monthlyBasisOverrideGrosze)
      ),
      origin: "USER",
    }
  }
  const known =
    role === "MOTHER"
      ? input.knownBasisGrosze
      : input.secondParentKnownBasisGrosze
  if (input.incomeMode === "KNOWN_BASIS" && known !== undefined && known > 0) {
    return {
      method: "KNOWN_BASIS",
      monthlyBasisGrosze: Math.round(known),
      origin: "USER",
    }
  }
  if (role === "MOTHER" && input.incomeMode === "DETAILED") {
    return monthlyHistory(input, rightDate)
  }
  const gross =
    role === "MOTHER"
      ? input.grossMonthlyIncomeGrosze
      : (input.secondParentMonthlyIncomeGrosze ??
        input.grossMonthlyIncomeGrosze)
  if (gross <= 0) return undefined
  return { method: "GROSS_MONTHLY", grossMonthlyGrosze: Math.round(gross) }
}

function mapParents(input: CalculatorInput, rightDate: string): ParentInput[] {
  const parents: ParentInput[] = []
  if (input.motherEnabled !== false) {
    const coverage = input.motherSicknessInsurance ?? "COMPULSORY"
    const title =
      coverage === "NONE"
        ? "NONE"
        : insuranceTitle(input.motherEmploymentType ?? "EMPLOYEE")
    parents.push({
      role: "MOTHER",
      insurance: {
        title,
        sicknessInsurance: coverage,
        ...(input.motherInsuranceStartDate
          ? { startDate: input.motherInsuranceStartDate }
          : {}),
        ...(input.motherInsuranceEndDate
          ? { endDate: input.motherInsuranceEndDate }
          : {}),
        ...(input.motherPayerSize ? { payerSize: input.motherPayerSize } : {}),
        workingTimeFraction: String(input.employmentFraction ?? 1),
        ...(input.motherContributionDebt !== undefined
          ? { contributionDebt: { exists: input.motherContributionDebt } }
          : {}),
      },
      basis: parentBasis(input, "MOTHER", rightDate),
    })
  }
  if (input.fatherEnabled !== false) {
    const coverage = input.fatherSicknessInsurance ?? "COMPULSORY"
    const title =
      coverage === "NONE"
        ? "NONE"
        : insuranceTitle(input.fatherEmploymentType ?? "EMPLOYEE")
    parents.push({
      role: "FATHER",
      insurance: {
        title,
        sicknessInsurance: coverage,
        ...(input.fatherInsuranceStartDate
          ? { startDate: input.fatherInsuranceStartDate }
          : {}),
        ...(input.fatherInsuranceEndDate
          ? { endDate: input.fatherInsuranceEndDate }
          : {}),
        ...(input.fatherPayerSize ? { payerSize: input.fatherPayerSize } : {}),
        workingTimeFraction: String(input.employmentFraction ?? 1),
        ...(input.fatherContributionDebt !== undefined
          ? { contributionDebt: { exists: input.fatherContributionDebt } }
          : {}),
      },
      basis: parentBasis(input, "FATHER", rightDate),
    })
  }
  return parents
}

function addDays(date: string, days: number): string {
  const time = Date.parse(`${date}T00:00:00Z`)
  if (!Number.isFinite(time)) return date
  return new Date(time + days * 86_400_000).toISOString().slice(0, 10)
}

function daysBetweenDates(start: string, end: string): number {
  const from = Date.parse(`${start}T00:00:00Z`)
  const to = Date.parse(`${end}T00:00:00Z`)
  if (!Number.isFinite(from) || !Number.isFinite(to)) return 0
  return Math.max(0, Math.round((to - from) / 86_400_000))
}

function mapEvent(input: CalculatorInput, rightDate: string): FamilyEventInput {
  const mode: CalculatorMode = input.mode ?? "BIRTH"
  const common = {
    childrenCount: Math.max(1, Math.round(finite(input.childrenCount, 1))),
    zaZyciem: Boolean(input.hasZaZyciem),
  }
  if (mode === "ADOPTION" || mode === "FOSTER_CARE") {
    const careDate = input.placementDate ?? rightDate
    const childBirthDate =
      input.childBirthDate ??
      (input.childAgeYears !== undefined
        ? addDays(careDate, -Math.round(input.childAgeYears * 365.2425))
        : undefined)
    return {
      kind: mode,
      ...common,
      ...(input.placementDate
        ? { careTakingDate: input.placementDate }
        : input.childAgeYears !== undefined
          ? { careTakingDate: rightDate }
          : {}),
      ...(childBirthDate ? { childBirthDate } : {}),
      ...(mode === "ADOPTION" && input.courtApplicationDate
        ? { courtApplicationDate: input.courtApplicationDate }
        : {}),
      ...(mode === "ADOPTION" && input.adoptionFinalDate
        ? { adoptionFinalDate: input.adoptionFinalDate }
        : {}),
      ...(mode === "FOSTER_CARE" && input.isProfessionalFosterFamily
        ? { professionalFosterFamily: true }
        : {}),
      ...(mode === "FOSTER_CARE" && input.isDeferredSchooling
        ? { schoolDeferred: true }
        : {}),
      ...(input.previouslyUsedMaternityTermsWeeks !== undefined
        ? {
            previouslyUsedMaternityTermsWeeks: Math.max(
              0,
              Math.round(input.previouslyUsedMaternityTermsWeeks)
            ),
          }
        : {}),
      ...(input.previouslyUsedParentalWeeks !== undefined
        ? {
            previouslyUsedParentalWeeks: Math.max(
              0,
              Math.round(input.previouslyUsedParentalWeeks)
            ),
          }
        : {}),
    }
  }

  const birthDate = input.birthDate ?? rightDate
  const deathDay =
    input.childDeathDay ??
    (input.specialCase === "CHILD_DEATH_AFTER_8W" ? 57 : 1)
  const childDeaths =
    input.specialCase === "CHILD_DEATH_BEFORE_8W" ||
    input.specialCase === "CHILD_DEATH_AFTER_8W"
      ? [
          {
            date: addDays(birthDate, Math.max(0, Math.round(deathDay)) - 1),
          },
        ]
      : []
  const hospitalStays: NonNullable<FamilyEventInput["childHospitalStays"]> = []
  const pretermCategory =
    (input.birthWeekOfPregnancy !== undefined &&
      input.birthWeekOfPregnancy < 37) ||
    (input.birthWeightGrams !== undefined && input.birthWeightGrams <= 1000)
  if (pretermCategory && (input.childHospitalWeeks ?? 0) > 0) {
    hospitalStays.push({
      start: birthDate,
      end: addDays(
        birthDate,
        Math.round((input.childHospitalWeeks ?? 0) * 7) - 1
      ),
    })
  } else if ((input.childHospitalDaysDay5To28 ?? 0) > 0) {
    hospitalStays.push({
      start: addDays(birthDate, 4),
      end: addDays(
        birthDate,
        4 + Math.round(input.childHospitalDaysDay5To28 ?? 0) - 1
      ),
    })
  } else if ((input.childHospitalWeeks ?? 0) > 0) {
    hospitalStays.push({
      start: birthDate,
      end: addDays(
        birthDate,
        Math.round((input.childHospitalWeeks ?? 0) * 7) - 1
      ),
    })
  }

  return {
    kind: "BIRTH",
    ...common,
    birthDate,
    ...(input.specialCase === "STILLBIRTH" ? { stillbirth: true } : {}),
    ...(childDeaths.length > 0 ? { childDeaths } : {}),
    ...(input.birthWeekOfPregnancy !== undefined
      ? { gestationalWeeksCompleted: input.birthWeekOfPregnancy }
      : {}),
    ...(input.birthWeightGrams !== undefined
      ? { lowestBirthWeightGrams: input.birthWeightGrams }
      : {}),
    ...(hospitalStays.length > 0 ? { childHospitalStays: hospitalStays } : {}),
  }
}

function mapPlan(
  input: CalculatorInput,
  rules: EngineRuleSet
): LeavePlanInput | undefined {
  const plan: LeavePlanInput = {
    paymentOption: input.paymentOption,
    maternityWeeksBeforeBirth: input.maternityWeeksBeforeBirth,
    ...(input.flatRateApplicationDate
      ? { flatRateApplicationDate: input.flatRateApplicationDate }
      : {}),
  }
  if (
    input.motherEnabled !== false &&
    input.fatherEnabled !== false &&
    (input.fatherMaternityTakeoverWeeks ?? 0) > 0
  ) {
    plan.maternityTakeover = {
      reason:
        input.fatherMaternityTakeoverReason ?? "MOTHER_RESIGNS_AFTER_14_WEEKS",
      motherWeeksAfterBirth:
        input.fatherMaternityTakeoverReason ===
          "MOTHER_RESIGNS_AFTER_14_WEEKS" ||
        input.fatherMaternityTakeoverReason === undefined
          ? 14
          : 0,
    }
  }
  const poolWeeks = input.hasZaZyciem
    ? (input.childrenCount ?? 1) > 1
      ? rules.parameters.parental.poolWeeks.zaZyciemMultiple
      : rules.parameters.parental.poolWeeks.zaZyciemSingle
    : (input.childrenCount ?? 1) > 1
      ? rules.parameters.parental.poolWeeks.multiple
      : rules.parameters.parental.poolWeeks.single
  const femaleWeeks = Math.max(
    0,
    Math.round(
      finite(
        input.motherParentalWeeks,
        Math.max(0, poolWeeks - rules.parameters.parental.nonTransferableWeeks)
      )
    )
  )
  const fraction = input.parentalWorkFraction
  const combinedWeeks =
    fraction > 0
      ? clamp(
          Math.round(finite(input.workCombinedWeeks, femaleWeeks)),
          0,
          femaleWeeks
        )
      : 0
  const segments: NonNullable<LeavePlanInput["parentalSegments"]> = []
  const fullWeeks = femaleWeeks - combinedWeeks
  if (input.motherEnabled !== false && fullWeeks > 0) {
    segments.push({ parent: "MOTHER", weeks: fullWeeks })
  }
  if (input.motherEnabled !== false && combinedWeeks > 0) {
    segments.push({
      parent: "MOTHER",
      weeks: combinedWeeks,
      workFraction: String(fraction),
      ...(input.combineWorkInExtension
        ? { extensionWorkFraction: String(fraction) }
        : {}),
    })
  }
  if (
    input.fatherEnabled !== false &&
    (input.secondParentParentalWeeks ?? 0) > 0
  ) {
    segments.push({
      parent: "FATHER",
      weeks: Math.round(input.secondParentParentalWeeks ?? 0),
    })
  }
  if (segments.length > 0) plan.parentalSegments = segments
  plan.paternity =
    input.fatherEnabled !== false && (input.paternityDays ?? 0) > 0
      ? [{ days: Math.round(input.paternityDays ?? 0) }]
      : []
  return plan
}

const KIND_ORDER: CalculationLine["kind"][] = [
  "MATERNITY",
  "MATERNITY_SUPPLEMENTARY",
  "MATERNITY_TAKEOVER",
  "PARENTAL",
  "WORK_COMBINATION_EXTENSION",
  "PATERNITY",
  "LOSS_OF_CHILD",
]

function lineKind(
  line: Assessment["breakdown"][number]
): CalculationLine["kind"] | null {
  if (line.benefit === "PARENTAL") {
    return line.id.endsWith("extension")
      ? "WORK_COMBINATION_EXTENSION"
      : "PARENTAL"
  }
  if (line.benefit === "PATERNITY") return "PATERNITY"
  if (line.benefit === "SUPPLEMENTARY_MATERNITY")
    return "MATERNITY_SUPPLEMENTARY"
  if (line.benefit === "STILLBIRTH_FUNERAL_ALLOWANCE") return "LOSS_OF_CHILD"
  if (
    line.benefit === "MATERNITY" ||
    line.benefit === "MATERNITY_TERMS" ||
    line.benefit === "MATERNITY_EQUIVALENT"
  ) {
    return line.parent === "FATHER" ? "MATERNITY_TAKEOVER" : "MATERNITY"
  }
  return null
}

function leaveTypeFor(
  kind: CalculationLine["kind"],
  line: Assessment["breakdown"][number],
  mode: CalculatorMode
): string {
  if (line.label.includes("Podwyższenie")) {
    return "Podwyższenie do kwoty świadczenia rodzicielskiego"
  }
  if (kind === "MATERNITY") {
    return mode === "BIRTH"
      ? "Urlop macierzyński"
      : "Urlop na warunkach macierzyńskiego"
  }
  if (kind === "MATERNITY_SUPPLEMENTARY") {
    return "Uzupełniający urlop macierzyński"
  }
  if (kind === "MATERNITY_TAKEOVER") return "Przejęty urlop macierzyński"
  if (kind === "PARENTAL") {
    return Number(line.paidFraction) !== 1
      ? "Urlop rodzicielski (praca łączona)"
      : "Urlop rodzicielski"
  }
  if (kind === "WORK_COMBINATION_EXTENSION") {
    return "Przedłużenie urlopu rodzicielskiego"
  }
  if (kind === "PATERNITY") return "Urlop ojcowski"
  return line.benefit === "STILLBIRTH_FUNERAL_ALLOWANCE"
    ? "Zasiłek pogrzebowy"
    : "Zasiłek po zgonie dziecka"
}

function mapLines(
  assessment: Assessment,
  mode: CalculatorMode
): CalculationLine[] {
  const mapped: {
    line: CalculationLine
    topup: boolean
  }[] = []
  for (const entry of assessment.breakdown) {
    const kind = lineKind(entry)
    if (!kind || entry.amountGrosze === null) continue
    const rate = Number(entry.rate)
    const paid = Number(entry.paidFraction)
    const topup = entry.label.includes("Podwyższenie")
    mapped.push({
      topup,
      line: {
        kind,
        beneficiary: entry.parent === "FATHER" ? "SECOND_PARENT" : "MOTHER",
        leaveType: leaveTypeFor(kind, entry, mode),
        label: entry.label,
        weeks: Math.floor(entry.days / 7),
        days: entry.days,
        rate: Number.isFinite(rate) && Number.isFinite(paid) ? rate * paid : 1,
        amountGrosze: entry.amountGrosze,
        minimumApplied: topup,
        legalReference: unique(entry.ruleIds).join(", "),
      },
    })
  }
  const result: CalculationLine[] = []
  for (const entry of mapped) {
    if (entry.topup) {
      const base = result.find(
        (line) =>
          line.beneficiary === entry.line.beneficiary &&
          line.kind === entry.line.kind &&
          line.days === entry.line.days
      )
      if (base) {
        base.amountGrosze += entry.line.amountGrosze
        base.minimumApplied = true
        base.legalReference = unique([
          base.legalReference,
          entry.line.legalReference,
        ])
          .filter(Boolean)
          .join(", ")
        continue
      }
    }
    result.push(entry.line)
  }
  return result.sort(
    (a, b) => KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind)
  )
}

function extensionCap(input: CalculatorInput): number {
  const multiple = (input.childrenCount ?? 1) > 1
  if (input.hasZaZyciem) {
    return multiple
      ? PARENTAL_TOTAL_CAP_WEEKS.zaZyciemMultiple
      : PARENTAL_TOTAL_CAP_WEEKS.zaZyciemSingle
  }
  return multiple
    ? PARENTAL_TOTAL_CAP_WEEKS.multiple
    : PARENTAL_TOTAL_CAP_WEEKS.single
}

function eligibleFor(
  assessment: Assessment,
  parent: "MOTHER" | "FATHER",
  benefits: BenefitType[]
): boolean {
  return assessment.eligibility.determinations.some(
    (entry) =>
      entry.parent === parent &&
      benefits.includes(entry.benefit) &&
      (entry.status === "ELIGIBLE" || entry.status === "CONDITIONAL")
  )
}

function emptyResult(input: CalculatorInput): CalculatorResult {
  const zeroBasis = 0
  return {
    input,
    mode: input.mode ?? "BIRTH",
    eligible: false,
    normalizedChildrenCount: input.childrenCount,
    maternityWeeks: 0,
    motherMaternityWeeks: 0,
    fatherMaternityTakeoverWeeks: 0,
    supplementaryWeeks: 0,
    preBirthWeeks: 0,
    postBirthWeeks: 0,
    parentalPoolWeeks: 0,
    secondParentWeeks: 0,
    motherParentalWeeks: 0,
    extensionWeeks: 0,
    extensionCapWeeks: 0,
    paternityDays: 0,
    ageAtPlacementYears: null,
    guaranteeApplied: false,
    basisGrosze: zeroBasis,
    dailyBasisGrosze: 0,
    secondParentBasisGrosze: 0,
    secondParentDailyBasisGrosze: 0,
    motherEligible: false,
    fatherEligible: false,
    lines: [],
    totalGrosze: 0,
    totalsByBeneficiary: [
      { beneficiary: "MOTHER", totalGrosze: 0 },
      { beneficiary: "SECOND_PARENT", totalGrosze: 0 },
    ],
    verified: false,
    status: "NOT_ELIGIBLE",
    ruleSetVersion: latestRuleSet().version,
    ruleSetEffectiveFrom: latestRuleSet().effectiveFrom,
    ruleSetVerified: false,
    warnings: ["Uwzględnij co najmniej jednego rodzica."],
    trace: [],
  }
}

export function calculateBenefits(
  rawInput: CalculatorInput,
  ruleSet?: RuleSet
): CalculatorResult {
  const rules = calculatorRules(ruleSet)
  const input = normalize(rawInput, rules)
  const parents = mapParents(
    input,
    input.birthDate ?? input.placementDate ?? latestRuleSet().effectiveFrom
  )
  if (parents.length === 0)
    return {
      ...emptyResult(input),
      ruleSetVersion: rules.version,
      ruleSetEffectiveFrom: rules.effectiveFrom,
      ruleSetVerified: ruleSet?.verified ?? false,
    }
  const event = mapEvent(input, latestRuleSet().effectiveFrom)
  const rightDate =
    event.kind === "ADOPTION" || event.kind === "FOSTER_CARE"
      ? (event.careTakingDate ?? latestRuleSet().effectiveFrom)
      : (event.birthDate ?? latestRuleSet().effectiveFrom)
  const asOf = input.asOf ?? rightDate
  const request: AssessmentInput = {
    asOf,
    ruleSetVersion: latestRuleSet().version,
    event,
    parents,
    plan: mapPlan(input, rules),
    externalParameters: {
      minimumWageGrosze: MINIMUM_WAGE_GROSZE,
      ...(ruleSet
        ? {}
        : { parentalBenefitAmountGrosze: PARENTAL_BENEFIT_FLOOR_GROSZE }),
      sourceNote: EXTERNAL_NOTE,
    },
  }
  const { assessment, schedule } = evaluate(request, rules)
  const lines = mapLines(assessment, input.mode ?? "BIRTH")
  const motherBasis = assessment.basis.find(
    (basis) => basis.parent === "MOTHER"
  )
  const fatherBasis = assessment.basis.find(
    (basis) => basis.parent === "FATHER"
  )
  const basisGrosze = motherBasis?.monthlyBasisGrosze ?? 0
  const secondParentBasisGrosze = fatherBasis?.monthlyBasisGrosze ?? 0
  const maternityWeeks = (schedule?.maternityDimensionDays ?? 0) / 7
  const periods = schedule?.periods ?? []
  const motherMaternityWeeks =
    periods
      .filter(
        (period) =>
          period.parent === "MOTHER" &&
          (period.benefit === "MATERNITY" ||
            period.benefit === "MATERNITY_TERMS" ||
            period.benefit === "MATERNITY_EQUIVALENT")
      )
      .reduce((sum, period) => sum + period.days, 0) / 7
  const fatherMaternityTakeoverWeeks =
    periods
      .filter(
        (period) => period.parent === "FATHER" && period.benefit === "MATERNITY"
      )
      .reduce((sum, period) => sum + period.days, 0) / 7
  const preBirthWeeks =
    periods
      .filter((period) => period.rateKey === "PRE_BIRTH")
      .reduce((sum, period) => sum + period.days, 0) / 7
  const extensionWeeks =
    periods
      .filter((period) => period.extension)
      .reduce((sum, period) => sum + period.days, 0) / 7
  const paternityDays = periods
    .filter((period) => period.benefit === "PATERNITY")
    .reduce((sum, period) => sum + period.days, 0)
  const motherParentalWeeks = (schedule?.parentalUsedDays.MOTHER ?? 0) / 7
  const secondParentWeeks = (schedule?.parentalUsedDays.FATHER ?? 0) / 7
  const totalsByBeneficiary = [
    {
      beneficiary: "MOTHER" as const,
      totalGrosze: lines
        .filter((line) => line.beneficiary === "MOTHER")
        .reduce((sum, line) => sum + line.amountGrosze, 0),
    },
    {
      beneficiary: "SECOND_PARENT" as const,
      totalGrosze: lines
        .filter((line) => line.beneficiary === "SECOND_PARENT")
        .reduce((sum, line) => sum + line.amountGrosze, 0),
    },
  ]
  const motherEligible = eligibleFor(assessment, "MOTHER", [
    "MATERNITY",
    "MATERNITY_TERMS",
    "MATERNITY_EQUIVALENT",
    "PARENTAL",
    "SUPPLEMENTARY_MATERNITY",
    "STILLBIRTH_FUNERAL_ALLOWANCE",
  ])
  const fatherEligible = eligibleFor(assessment, "FATHER", [
    "PARENTAL",
    "PATERNITY",
    "MATERNITY",
    "MATERNITY_TERMS",
  ])
  const eligible =
    assessment.eligibility.status !== "NOT_ELIGIBLE" &&
    (motherEligible || fatherEligible)
  const warnings = [
    ...assessment.planAdjustments,
    ...assessment.warnings.map((warning) => warning.text),
    ...assessment.missingEvidence.map(
      (missing) => `Brakuje: ${missing.question}`
    ),
    "Parametry Q-29 (minimalne wynagrodzenie i kwota świadczenia rodzicielskiego) przyjęto jako stałe aplikacji — wynik nadal wymaga potwierdzenia.",
  ]
  if (ruleSet?.verified) {
    for (let i = warnings.length - 1; i >= 0; i--) {
      if (/Q-29|Q-15/.test(warnings[i]!)) warnings.splice(i, 1)
    }
  }
  if (input.monthlyBasisOverrideGrosze !== undefined) {
    warnings.push(
      "Podstawa wymiaru pochodzi z danych pobranych z symulowanego ZUS. Sprawdź, czy jest aktualna."
    )
  }
  if (input.isProfessionalFosterFamily) {
    warnings.push(
      "Zawodowe rodziny zastępcze są wyłączone z urlopu na warunkach macierzyńskiego i rodzicielskiego (KP art. 183 § 1)."
    )
  }
  if (
    input.paymentOption === "FLAT_81_5" &&
    (input.specialCase ?? "STANDARD") !== "STANDARD"
  ) {
    warnings.push(
      "Po utracie dziecka nie ma urlopu rodzicielskiego, więc wariant 81,5% nie ma zastosowania — zasiłek liczono jako 100% podstawy."
    )
  }
  if (
    input.motherEnabled !== false &&
    motherParentalWeeks > 0 &&
    motherParentalWeeks < 9
  ) {
    warnings.push(
      `Mama rezygnuje z ${9 - motherParentalWeeks} niezbywalnych tygodni urlopu rodzicielskiego — nie przechodzą one na drugiego rodzica.`
    )
  }
  if (
    (input.fatherMaternityTakeoverWeeks ?? 0) > fatherMaternityTakeoverWeeks
  ) {
    warnings.push(
      `Ojciec może przejąć najwyżej ${fatherMaternityTakeoverWeeks} tyg. urlopu macierzyńskiego (matka musi wykorzystać co najmniej 14 tyg.).`
    )
  }
  if (basisGrosze <= 0 && lines.length === 0) {
    warnings.push(
      "Brak podstawy wymiaru — nie wyliczono kwot. Uzupełnij dochód, historię 12 miesięcy albo podstawę z Z-3/Z-3a."
    )
  }
  if (
    assessment.totals.amountStatus === "CALCULATED_LOWER_BOUND" ||
    assessment.totals.amountStatus === "CALCULATED_UPPER_BOUND"
  ) {
    warnings.push(
      "Kwota jest dolną/górną granicą — część parametrów zewnętrznych nie jest potwierdzona."
    )
  }
  const trace: CalculationTraceStep[] = assessment.appliedRules.map((rule) => ({
    ruleId: rule.ruleId,
    label: rule.title,
    detail:
      rule.ruleId === "LR-112" && input.monthlyBasisOverrideGrosze !== undefined
        ? "Podstawa miesięczna pochodzi z symulowanego ZUS."
        : rule.openQuestion
          ? `Wersja ${rule.ruleSetVersion}; kwestia otwarta ${rule.openQuestion}.`
          : `Wersja ${rule.ruleSetVersion}.`,
    legalReference: rule.sources.join("; "),
  }))
  if (trace.length === 0) {
    trace.push({
      ruleId: "LR-123",
      label: `Wersja reguł ${assessment.ruleSet.version}`,
      detail: assessment.ruleSet.selectedBy,
      legalReference: "KP art. 180–183; U art. 29–31",
    })
  }

  return {
    input,
    mode: input.mode ?? "BIRTH",
    eligible,
    normalizedChildrenCount: event.childrenCount ?? 1,
    maternityWeeks,
    motherMaternityWeeks,
    fatherMaternityTakeoverWeeks,
    supplementaryWeeks: schedule?.supplementary.weeks ?? 0,
    preBirthWeeks,
    postBirthWeeks: Math.max(0, maternityWeeks - preBirthWeeks),
    parentalPoolWeeks: schedule?.poolWeeks ?? 0,
    secondParentWeeks,
    motherParentalWeeks,
    extensionWeeks,
    extensionCapWeeks: extensionCap(input),
    paternityDays,
    ageAtPlacementYears:
      input.childAgeYears !== undefined
        ? input.childAgeYears
        : input.childBirthDate && input.placementDate
          ? daysBetweenDates(input.childBirthDate, input.placementDate) /
            365.2425
          : (schedule?.terms?.ageAtCareTaking ?? null),
    guaranteeApplied: schedule?.terms?.guaranteeCase ?? false,
    basisGrosze,
    dailyBasisGrosze: dailyBasis(
      basisGrosze,
      rules.parameters.basis.dailyDivisor
    ),
    secondParentBasisGrosze,
    secondParentDailyBasisGrosze: dailyBasis(
      secondParentBasisGrosze,
      rules.parameters.basis.dailyDivisor
    ),
    motherEligible,
    fatherEligible,
    lines,
    totalGrosze: assessment.totals.totalGrosze ?? 0,
    totalsByBeneficiary,
    ruleSetVersion: rules.version,
    ruleSetEffectiveFrom: rules.effectiveFrom,
    ruleSetVerified: ruleSet?.verified ?? false,
    verified: ruleSet?.verified ?? false,
    status: eligible
      ? ruleSet?.verified
        ? "OK"
        : "INDETERMINATE"
      : "NOT_ELIGIBLE",
    warnings,
    trace,
  }
}
