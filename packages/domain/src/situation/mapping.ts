import { latestRuleSet, ruleSetFor } from "../engine/rulesets"
import type {
  AssessmentInput,
  BasisInput,
  FamilyEventKind,
  FamilyEventInput,
  InsuranceInput,
  InsuranceTitle,
  LeavePlanInput,
  ParentInput,
  ParentRole,
  SicknessCoverage,
  TitleEndReason,
} from "../engine/types"
import type { SituationAnswers } from "./types"

/**
 * Answers → deterministic engine input. This is the only place where the
 * questionnaire touches engine facts, so the mapping is testable and the
 * calculation rules stay in `@zpr/domain/engine`.
 */

export type SituationAssessmentRequest = Omit<AssessmentInput, "asOf">

export interface MappingOptions {
  /** Year of birth from the mObywatel prefill, used only for the sick-pay age rule. */
  primaryBirthYear?: number
  secondaryBirthYear?: number
}

function text(answers: SituationAnswers, key: keyof SituationAnswers): string {
  return answers[key].trim()
}

function optional(value: string): string | undefined {
  return value.trim() === "" ? undefined : value.trim()
}

function toGrosze(value: string): number | undefined {
  const parsed = Number(value.replace(",", "."))
  if (!Number.isFinite(parsed) || parsed <= 0) return undefined
  return Math.round(parsed * 100)
}

function wholeNumber(
  value: string,
  min: number,
  max: number
): number | undefined {
  if (value.trim() === "") return undefined
  const parsed = Number(value.replace(",", "."))
  if (!Number.isFinite(parsed)) return undefined
  return Math.min(max, Math.max(min, Math.round(parsed)))
}

function optionalWholeNumber(
  value: string,
  min: number,
  max: number
): number | undefined {
  return value.trim() === "" ? undefined : wholeNumber(value, min, max)
}

function eventKind(answers: SituationAnswers): FamilyEventKind {
  if (answers.scenario === "CARE") {
    return answers.careKind === "FOSTER_CARE" ? "FOSTER_CARE" : "ADOPTION"
  }
  if (answers.scenario === "BIRTH") return "BIRTH"
  if (answers.scenario === "ON_LEAVE") {
    return text(answers, "birthDate") ? "BIRTH" : "PREGNANCY"
  }
  if (answers.scenario === "CHECK_DOCUMENT") {
    return text(answers, "birthDate") ? "BIRTH" : "PREGNANCY"
  }
  return "PREGNANCY"
}

function buildEvent(answers: SituationAnswers): FamilyEventInput {
  const kind = eventKind(answers)
  const event: FamilyEventInput = { kind }

  const dueDate = optional(text(answers, "dueDate"))
  const birthDate = optional(text(answers, "birthDate"))
  // A value left over from another scenario must not change the event kind.
  if (kind === "PREGNANCY") {
    if (dueDate) event.expectedDueDate = dueDate
  } else if (kind === "BIRTH") {
    if (birthDate) event.birthDate = birthDate
    // On an ongoing maternity leave the due date is still relevant for the
    // weeks used before the birth; in a plain birth scenario it is stale.
    if (answers.scenario === "ON_LEAVE" && dueDate) {
      event.expectedDueDate = dueDate
    }
  }
  if (kind === "ADOPTION" || kind === "FOSTER_CARE") {
    const careTakingDate = optional(text(answers, "careTakingDate"))
    const childBirthDate = optional(text(answers, "childBirthDate"))
    const courtApplicationDate = optional(text(answers, "courtApplicationDate"))
    const adoptionFinalDate = optional(text(answers, "adoptionFinalDate"))
    if (careTakingDate) event.careTakingDate = careTakingDate
    if (childBirthDate) event.childBirthDate = childBirthDate
    if (courtApplicationDate) event.courtApplicationDate = courtApplicationDate
    if (adoptionFinalDate) event.adoptionFinalDate = adoptionFinalDate
  }

  const children = wholeNumber(text(answers, "childrenCount"), 1, 5)
  if (children !== undefined) event.childrenCount = children
  if (
    answers.hasZaZyciem === "YES" &&
    (kind === "PREGNANCY" || kind === "BIRTH")
  ) {
    event.zaZyciem = true
  }
  if (kind === "BIRTH") {
    if (answers.stillbirth === "YES") event.stillbirth = true
    if (answers.premature === "YES") {
      const weeks = optionalWholeNumber(
        text(answers, "gestationalWeeks"),
        0,
        45
      )
      const weight = optionalWholeNumber(
        text(answers, "birthWeightGrams"),
        1,
        10_000
      )
      if (weeks !== undefined) event.gestationalWeeksCompleted = weeks
      if (weight !== undefined) event.lowestBirthWeightGrams = weight
    }
  }

  return event
}

type ParentPrefix = "mother" | "father"

interface ParentFieldSet {
  employment: keyof SituationAnswers
  sickness: keyof SituationAnswers
  startDate: keyof SituationAnswers
  income: keyof SituationAnswers
  basisMode: keyof SituationAnswers
  contributionDebt: keyof SituationAnswers
}

const PARENT_FIELDS: Record<ParentPrefix, ParentFieldSet> = {
  mother: {
    employment: "motherEmployment",
    sickness: "motherSickness",
    startDate: "motherInsuranceStartDate",
    income: "motherIncome",
    basisMode: "motherBasisMode",
    contributionDebt: "motherContributionDebt",
  },
  father: {
    employment: "fatherEmployment",
    sickness: "fatherSickness",
    startDate: "fatherInsuranceStartDate",
    income: "fatherIncome",
    basisMode: "fatherBasisMode",
    contributionDebt: "fatherContributionDebt",
  },
}

function buildInsurance(
  prefix: ParentPrefix,
  answers: SituationAnswers
): InsuranceInput | undefined {
  const fields = PARENT_FIELDS[prefix]
  const employment = text(answers, fields.employment)
  if (employment === "") return undefined

  if (employment === "NONE") {
    return { title: "NONE", sicknessInsurance: "NONE" }
  }

  const insurance: InsuranceInput = {
    title: employment as InsuranceTitle,
  }

  if (employment === "EMPLOYMENT") {
    insurance.sicknessInsurance = "COMPULSORY"
  } else {
    const sickness = text(answers, fields.sickness)
    if (sickness) insurance.sicknessInsurance = sickness as SicknessCoverage
  }

  const startDate = optional(text(answers, fields.startDate))
  if (startDate) insurance.startDate = startDate

  if (prefix === "mother") {
    if (answers.motherInsuranceEndsBeforeEvent === "YES") {
      const endDate = optional(text(answers, "motherInsuranceEndDate"))
      const endReason = optional(text(answers, "motherEndReason"))
      if (endDate) insurance.endDate = endDate
      if (endReason) insurance.endReason = endReason as TitleEndReason
      insurance.endedDuringPregnancy = true
    }
    const payer = text(answers, "motherPayerSize")
    if (
      employment === "EMPLOYMENT" &&
      (payer === "OVER_20" || payer === "UP_TO_20")
    ) {
      insurance.payerSize = payer
    }
  } else if (answers.fatherEmployment === "EMPLOYMENT") {
    insurance.sicknessInsurance = "COMPULSORY"
  }

  const debt = text(answers, fields.contributionDebt)
  if (
    (employment === "MANDATE" || employment === "SELF_EMPLOYMENT") &&
    (debt === "YES" || debt === "NO")
  ) {
    insurance.contributionDebt = { exists: debt === "YES" }
  }

  if (prefix === "mother" && employment === "EMPLOYMENT") {
    const fraction = text(answers, "motherWorkingTimeFraction")
    if (fraction) insurance.workingTimeFraction = fraction
  }

  return insurance
}

function buildBasis(
  prefix: ParentPrefix,
  answers: SituationAnswers
): BasisInput | undefined {
  const fields = PARENT_FIELDS[prefix]
  const employment = text(answers, fields.employment)
  if (employment === "" || employment === "NONE") return undefined

  const amount = toGrosze(text(answers, fields.income))
  if (amount === undefined) return undefined

  if (text(answers, fields.basisMode) === "KNOWN") {
    return {
      method: "KNOWN_BASIS",
      monthlyBasisGrosze: amount,
      origin: "USER",
    }
  }
  return { method: "GROSS_MONTHLY", grossMonthlyGrosze: amount }
}

function buildParent(
  prefix: ParentPrefix,
  role: ParentInput["role"],
  answers: SituationAnswers,
  options: MappingOptions
): ParentInput {
  const parent: ParentInput = { role }
  const insurance = buildInsurance(prefix, answers)
  if (insurance) parent.insurance = insurance
  const basis = buildBasis(prefix, answers)
  if (basis) parent.basis = basis

  const birthYear =
    prefix === "mother" ? options.primaryBirthYear : options.secondaryBirthYear
  if (birthYear && birthYear >= 1900 && birthYear <= 2100) {
    parent.birthYear = birthYear
  }

  if (
    prefix === "mother" &&
    answers.motherBasisRaisedDuringPregnancy === "YES"
  ) {
    parent.contributionBasisRaisedDuringPregnancy = true
  }
  if (prefix === "mother" && answers.motherNewTitleDuringPregnancy === "YES") {
    parent.titleStartedDuringPregnancy = true
  }

  return parent
}

/** Shared parental pool for the rule set in force on the event date. */
export function plannedPoolWeeks(
  answers: SituationAnswers,
  anchorDate?: string
): number {
  const children = wholeNumber(text(answers, "childrenCount"), 1, 5) ?? 1
  const zaZyciem = answers.hasZaZyciem === "YES"
  const pool = ((anchorDate ? ruleSetFor(anchorDate) : null) ?? latestRuleSet())
    .parameters.parental.poolWeeks
  if (children > 1) return zaZyciem ? pool.zaZyciemMultiple : pool.multiple
  return zaZyciem ? pool.zaZyciemSingle : pool.single
}

/** Role of the person filling in the questionnaire. */
export function primaryParentRole(answers: SituationAnswers): ParentRole {
  return answers.userRole === "FATHER" ? "FATHER" : "MOTHER"
}

/** The other parent, when included. */
export function secondaryParentRole(answers: SituationAnswers): ParentRole {
  return primaryParentRole(answers) === "MOTHER" ? "FATHER" : "MOTHER"
}

function buildPlan(answers: SituationAnswers): LeavePlanInput | undefined {
  const plan: LeavePlanInput = {}
  const scenario = answers.scenario
  const primary = primaryParentRole(answers)
  const secondary = secondaryParentRole(answers)
  const anchorDate =
    optional(text(answers, "birthDate")) ??
    optional(text(answers, "dueDate")) ??
    optional(text(answers, "careTakingDate"))
  const ruleSet =
    (anchorDate ? ruleSetFor(anchorDate) : null) ?? latestRuleSet()

  if (scenario !== "CHECK_DOCUMENT") {
    plan.paymentOption =
      answers.paymentOption === "FLAT_81_5" ? "FLAT_81_5" : "STANDARD_100_70"
  }

  const preBirth = optionalWholeNumber(
    text(answers, "maternityWeeksBeforeBirth"),
    0,
    6
  )
  if (
    preBirth !== undefined &&
    (scenario === "PREGNANCY" ||
      scenario === "PLANNING" ||
      (scenario === "ON_LEAVE" && answers.leaveKind === "MATERNITY"))
  ) {
    plan.maternityWeeksBeforeBirth = preBirth
  }

  const leaveStart = optional(text(answers, "leaveStartDate"))
  if (
    scenario === "ON_LEAVE" &&
    leaveStart &&
    answers.leaveKind === "MATERNITY"
  ) {
    plan.maternityStartDate = leaveStart
  }

  const pool = plannedPoolWeeks(answers, anchorDate)
  const reserved = ruleSet.parameters.parental.nonTransferableWeeks
  const fatherIncluded = answers.fatherIncluded === "YES"
  const fatherWeeks =
    optionalWholeNumber(text(answers, "fatherLeaveWeeks"), 0, reserved) ?? 0

  if (scenario === "ON_LEAVE" && answers.leaveKind === "PARENTAL") {
    const used =
      optionalWholeNumber(text(answers, "parentalWeeksUsed"), 0, 67) ?? 0
    const remaining = Math.max(0, pool - reserved - used)
    if (remaining > 0) {
      plan.parentalSegments = [
        {
          parent: primary,
          weeks: remaining,
          ...(leaveStart ? { startDate: leaveStart } : {}),
        },
        ...(fatherIncluded && fatherWeeks > 0
          ? [{ parent: secondary, weeks: fatherWeeks }]
          : []),
      ]
    }
  } else if (
    fatherIncluded &&
    fatherWeeks > 0 &&
    scenario !== "CARE" &&
    scenario !== "CHECK_DOCUMENT"
  ) {
    plan.parentalSegments = [
      { parent: primary, weeks: Math.max(0, pool - reserved) },
      { parent: secondary, weeks: fatherWeeks },
    ]
  }

  const fatherPresent = primary === "FATHER" || fatherIncluded
  if (scenario !== "CHECK_DOCUMENT" && fatherPresent) {
    if (answers.fatherPaternity === "YES" || answers.fatherPaternity === "") {
      plan.paternity = [{ days: ruleSet.parameters.paternity.maxDays }]
    } else if (answers.fatherPaternity === "NO") {
      plan.paternity = []
    }
  }
  if (
    scenario === "ON_LEAVE" &&
    answers.leaveKind === "PATERNITY" &&
    leaveStart
  ) {
    plan.paternity = [
      {
        days: ruleSet.parameters.paternity.maxDays,
        startDate: leaveStart,
      },
    ]
  }

  return Object.keys(plan).length > 0 ? plan : undefined
}

/** Builds the request consumed by `/api/v1/eligibility/evaluate` and friends. */
export function toSituationAssessmentRequest(
  answers: SituationAnswers,
  options: MappingOptions = {}
): SituationAssessmentRequest {
  const primary = primaryParentRole(answers)
  const secondary = secondaryParentRole(answers)
  const parents: ParentInput[] = [
    buildParent("mother", primary, answers, options),
  ]
  if (answers.fatherIncluded === "YES") {
    parents.push(buildParent("father", secondary, answers, options))
  }

  const request: SituationAssessmentRequest = {
    event: buildEvent(answers),
    parents,
  }
  const plan = buildPlan(answers)
  if (plan) request.plan = plan
  return request
}
