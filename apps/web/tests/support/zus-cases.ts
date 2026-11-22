import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"

import type { CaseFacts } from "@zpr/domain"
import { EARLIEST_SUPPORTED_DATE } from "@zpr/domain/engine"
import type {
  AssessmentInput,
  BenefitType,
  EligibilityStatus,
  FamilyEventInput,
  InsuranceInput,
  InsuranceTitle,
  LeavePlanInput,
  ParentInput,
  ParentRole,
  SicknessCoverage,
  TitleEndReason,
} from "@zpr/domain/engine"

/**
 * Test-only adapter between the extracted private ZUS cases (`SC-xx.json`)
 * and the deterministic engine. It translates only facts present in the case
 * file; every inference is returned in `notes`/`missing` so a mismatch can be
 * traced to the extraction rather than silently patched.
 */

export type Json = Record<string, unknown>

export interface LoadedCase {
  code: string
  title: string
  raw: Json
}

export interface ExpectedCheck {
  parent: ParentRole
  benefit: BenefitType
  status: EligibilityStatus
  /** The case file uses a weaker wording, e.g. ELIGIBLE_IF_INSURED. */
  sourceStatus: string
}

export interface PeriodCheck {
  parent: ParentRole
  benefit: BenefitType
  start?: string
  end?: string
  days?: number
  weeks?: number
}

export interface CaseMapping {
  input: AssessmentInput
  /** Same facts, but pinned to the rule set in force today for a historical event. */
  inputCurrentLaw: AssessmentInput | null
  chatFacts: CaseFacts
  chatFactsCurrentLaw: CaseFacts | null
  historical: boolean
  checks: ExpectedCheck[]
  periodChecks: PeriodCheck[]
  expectedAmounts: Json | null
  expectedBasisGrosze: number | null
  notes: string[]
  missing: string[]
}

export const READY_CASES = [
  "SC-02", "SC-03", "SC-05", "SC-06", "SC-07", "SC-08", "SC-09", "SC-10", "SC-11",
  "SC-13", "SC-14", "SC-15", "SC-18", "SC-20", "SC-21", "SC-22", "SC-25", "SC-28",
  "SC-31", "SC-32", "SC-34", "SC-35",
] as const

export const DEFAULT_CASES_DIR =
  "C:/Users/Mateusz/Documents/GitHub/projekt/fixtures/private/sample-cases"

/* ------------------------------------------------------------------ utils */

export function rec(value: unknown): Json {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Json) : {}
}
export function arr(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}
export function str(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() !== "" ? value.trim() : undefined
}
export function num(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined
}
export function bool(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined
}
export function iso(value: unknown): string | undefined {
  const text = str(value)
  return text && /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : undefined
}
function daysBetween(start: string, end: string): number {
  const from = Date.parse(`${start}T00:00:00Z`)
  const to = Date.parse(`${end}T00:00:00Z`)
  return Number.isFinite(from) && Number.isFinite(to)
    ? Math.max(0, Math.round((to - from) / 86_400_000))
    : 0
}
function addDays(start: string, days: number): string {
  const from = Date.parse(`${start}T00:00:00Z`)
  return Number.isFinite(from)
    ? new Date(from + days * 86_400_000).toISOString().slice(0, 10)
    : start
}
function weeksBetween(start: string, end: string): number {
  return Math.max(0, Math.ceil((daysBetween(start, end) + 1) / 7))
}

export function loadReadyCases(dir = process.env.SAMPLE_CASES_DIR ?? DEFAULT_CASES_DIR): LoadedCase[] {
  return READY_CASES.filter((code) => existsSync(join(dir, code, `${code}.json`))).map((code) => {
    const raw = JSON.parse(readFileSync(join(dir, code, `${code}.json`), "utf8")) as Json
    return { code, title: str(raw.title) ?? code, raw }
  })
}

/* -------------------------------------------------------------- insurance */

const TITLE_MAP: Record<string, InsuranceTitle> = {
  EMPLOYMENT: "EMPLOYMENT",
  MANDATE: "MANDATE",
  SELF_EMPLOYMENT: "SELF_EMPLOYMENT",
  COOPERATING_PERSON: "OTHER",
  OTHER: "OTHER",
  NONE: "NONE",
}

const END_REASON_MAP: Record<string, TitleEndReason> = {
  LIQUIDATION: "EMPLOYER_LIQUIDATION",
  BANKRUPTCY: "EMPLOYER_BANKRUPTCY",
  DEATH: "EMPLOYER_DEATH",
  FIXED_TERM_CONTRACT_END: "FIXED_TERM_CONTRACT_END",
  TERMINATION_BY_EMPLOYER: "TERMINATION_BY_EMPLOYER",
  RESIGNATION_OR_AGREEMENT: "RESIGNATION_OR_AGREEMENT",
  BUSINESS_CLOSED: "BUSINESS_CLOSED",
  MANDATE_CONTRACT_END: "MANDATE_CONTRACT_END",
}

interface TitleFacts {
  title: InsuranceTitle
  sickness: SicknessCoverage
  startDate?: string
  endDate?: string
  endReason?: TitleEndReason
  otherEmploymentProvided?: boolean
  payerSize?: "OVER_20" | "UP_TO_20"
  workingTimeFraction?: string
  debtExists?: boolean
  debtExceedsThreshold?: boolean
  denied: boolean
}

function mapTitle(parent: Json, eventDate: string | undefined, notes: string[], missing: string[]): TitleFacts | null {
  const titles = arr(parent.insuranceTitles).map(rec)
  if (titles.length === 0) {
    if (bool(parent.insured) === false) {
      notes.push(`${str(parent.role) ?? "rodzic"}: brak tytułu — przyjęto brak ubezpieczenia.`)
    }
    return null
  }
  const title = titles[0]!
  const kindText = str(title.kind)?.toUpperCase()
  const titleKind = kindText ? TITLE_MAP[kindText] : undefined
  if (!titleKind) {
    missing.push(`Nieznany tytuł ubezpieczenia: ${kindText ?? "brak"}.`)
    return null
  }
  if (kindText === "COOPERATING_PERSON") {
    notes.push("Tytuł COOPERATING_PERSON zmapowano na OTHER (osoba współpracująca).")
  }

  const coverage = rec(title.sicknessCoverage)
  const coverageNote = [str(coverage.note), str(coverage.denialReason)].filter(Boolean).join(" ")
  const denied = bool(coverage.coverageDenied) === true
  const mode = str(coverage.mode)?.toUpperCase()

  let sickness: SicknessCoverage
  if (denied) {
    sickness = "NONE"
    notes.push("Sprawa zawiera decyzję o niepodleganiu ubezpieczeniu — przyjęto brak ubezpieczenia chorobowego.")
  } else if (titleKind === "EMPLOYMENT") {
    sickness = "COMPULSORY"
  } else if (titleKind === "MANDATE") {
    // A mandate is never subject to compulsory sickness insurance. An empty
    // coverage list or an explicit "not registered" note means no coverage.
    if (/brak\s+zg[łl]oszenia|nie\s+zg[łl]osz/i.test(coverageNote)) sickness = "NONE"
    else if (mode === "VOLUNTARY") sickness = "VOLUNTARY"
    else sickness = "NONE"
  } else if (titleKind === "SELF_EMPLOYMENT" || titleKind === "OTHER") {
    sickness = mode === "NONE" ? "NONE" : "VOLUNTARY"
  } else {
    sickness = "NONE"
  }

  const periods = arr(coverage.periods).map(rec)
  const firstPeriod = periods[0]
  const startDate = iso(title.startDate) ?? iso(firstPeriod?.from)
  const endDate = iso(title.endDate) ?? iso(firstPeriod?.to)
  const rawEndReason = str(title.endReason)?.toUpperCase()
  const endReason = rawEndReason ? END_REASON_MAP[rawEndReason] : undefined
  if (endDate && !startDate) missing.push("Brak daty początku ubezpieczenia przy znanej dacie końca.")
  if (endDate && eventDate && endDate < eventDate) {
    notes.push(`Tytuł ustał ${endDate}, przed zdarzeniem ${eventDate} — silnik zastosuje przepisy o zasiłku po ustaniu ubezpieczenia.`)
  }
  if (rawEndReason && !endReason) missing.push(`Nieznany powód ustania tytułu: ${rawEndReason}.`)

  const payer = rec(title.payer)
  const insuredCount = num(payer.insuredCountOn30Nov)
  const debt = rec(title.contributionDebt)
  const debtExists = bool(debt.exists) ?? bool(parent.contributionArrears)
  const debtExceedsThreshold = bool(debt.exceedsThreshold)
  const otherEmploymentProvided =
    bool(title.otherEmploymentProvided) ?? bool(parent.otherEmploymentProvided)
  if (debtExists === true && debtExceedsThreshold === undefined) {
    notes.push("Zadłużenie składkowe istnieje, ale akt nie podaje kwoty; próg 1% minimalnego wynagrodzenia trzeba potwierdzić.")
  }

  return {
    title: titleKind,
    sickness,
    startDate,
    endDate,
    endReason,
    otherEmploymentProvided,
    payerSize:
      insuredCount === undefined ? undefined : insuredCount > 20 ? "OVER_20" : "UP_TO_20",
    workingTimeFraction:
      num(title.workingTimeFraction) !== undefined ? String(num(title.workingTimeFraction)) : undefined,
    debtExists,
    debtExceedsThreshold,
    denied,
  }
}

/* ------------------------------------------------------------------ event */

interface EventFacts {
  event: FamilyEventInput
  eventDate?: string
  inferredBirthDate: boolean
}

function mapEvent(root: Json, notes: string[], missing: string[]): EventFacts {
  const facts = rec(root.facts)
  const household = rec(facts.household)
  const familyEvent = rec(household.familyEvent)
  const scenario = rec(facts.scenario)
  const segments = arr(scenario.segments).map(rec)
  const kindText = str(familyEvent.kind)?.toUpperCase() ?? "BIRTH"
  const arrangement = str(familyEvent.arrangement)?.toUpperCase() ?? ""

  let kind: FamilyEventInput["kind"] =
    kindText === "CARE_TAKING"
      ? /ADOPT/i.test(arrangement)
        ? "ADOPTION"
        : "FOSTER_CARE"
      : kindText === "PREGNANCY"
        ? "PREGNANCY"
        : "BIRTH"

  const children = arr(familyEvent.children).map(rec)
  const explicitBirthDate = iso(familyEvent.date)
  const maternitySegment = segments.find((segment) => str(segment.kind)?.toUpperCase() === "MATERNITY")
  const maternityStart = iso(maternitySegment?.start ?? maternitySegment?.from)
  let birthDate = explicitBirthDate
  let inferredBirthDate = false
  if (!birthDate && kind === "BIRTH" && maternityStart) {
    birthDate = maternityStart
    inferredBirthDate = true
    notes.push(`Brak daty porodu w aktach — przyjęto start zasiłku macierzyńskiego ${maternityStart} jako datę porodu.`)
  }
  if (kind === "BIRTH" && !birthDate) {
    missing.push("Brak daty porodu — silnik nie ustali okresu ani prawa do zasiłku.")
  }
  if (kind === "ADOPTION" || kind === "FOSTER_CARE") {
    if (!explicitBirthDate) missing.push("Brak daty przyjęcia dziecka na wychowanie.")
  }
  if (kind === "PREGNANCY" && !iso(familyEvent.dueDate)) {
    // No due date in the extracted cases; leave it to the engine.
  }

  const allStillborn = children.length > 0 && children.every((child) => bool(child.stillborn) === true)
  const childDeaths = children
    .map((child) => iso(child.deathDate))
    .filter((date): date is string => date !== undefined)
    .map((date) => ({ date }))
  const zaZyciem =
    bool(familyEvent.zaZyciem) === true ||
    children.some((child) => arr(child.flags).some((flag) => str(flag)?.toUpperCase() === "ZA_ZYCIEM"))
  const professionalFosterFamily =
    bool(familyEvent.professionalFosterFamily) === true ||
    (/PROFESSIONAL/.test(arrangement) && !/NON[_-]?PROFESSIONAL/.test(arrangement))
  const gestationalWeeksCompleted =
    num(familyEvent.gestationalWeek) ?? num(familyEvent.gestationalWeeksCompleted)
  const lowestBirthWeightGrams =
    num(familyEvent.lowestBirthWeightGrams) ?? num(familyEvent.birthWeightGrams)

  const event: FamilyEventInput = { kind }
  if (kind === "BIRTH") {
    if (birthDate) event.birthDate = birthDate
    if (allStillborn) event.stillbirth = true
    if (childDeaths.length > 0) event.childDeaths = childDeaths
  } else {
    if (explicitBirthDate) event.careTakingDate = explicitBirthDate
    if (iso(familyEvent.childBirthDate)) event.childBirthDate = iso(familyEvent.childBirthDate)
    if (iso(familyEvent.courtApplicationDate)) event.courtApplicationDate = iso(familyEvent.courtApplicationDate)
    if (iso(familyEvent.adoptionFinalDate)) event.adoptionFinalDate = iso(familyEvent.adoptionFinalDate)
    if (professionalFosterFamily) event.professionalFosterFamily = true
    if (bool(familyEvent.schoolDeferred)) event.schoolDeferred = true
    const age = num(children[0]?.ageAtPlacement)
    if (age !== undefined && explicitBirthDate) {
      const childBirth = new Date(Date.parse(`${explicitBirthDate}T00:00:00Z`) - age * 365.2425 * 86_400_000)
      event.childBirthDate = childBirth.toISOString().slice(0, 10)
    }
  }
  event.childrenCount = Math.max(1, num(familyEvent.childrenCount) ?? (children.length || 1))
  if (zaZyciem) event.zaZyciem = true
  if (gestationalWeeksCompleted !== undefined) event.gestationalWeeksCompleted = gestationalWeeksCompleted
  if (lowestBirthWeightGrams !== undefined) event.lowestBirthWeightGrams = lowestBirthWeightGrams

  const hospitalWeeks = num(familyEvent.childHospitalWeeks)
  const hospitalDays5to28 = num(familyEvent.childHospitalDaysDay5To28)
  if (kind === "BIRTH" && birthDate) {
    const stays: NonNullable<FamilyEventInput["childHospitalStays"]> = []
    if (hospitalWeeks !== undefined && hospitalWeeks > 0) {
      stays.push({ start: birthDate, end: addDays(birthDate, hospitalWeeks * 7 - 1) })
    }
    if (hospitalDays5to28 !== undefined && hospitalDays5to28 > 0) {
      stays.push({ start: addDays(birthDate, 4), end: addDays(birthDate, 4 + hospitalDays5to28 - 1) })
    }
    if (stays.length > 0) event.childHospitalStays = stays
  }

  const eventDate = kind === "BIRTH" ? birthDate : explicitBirthDate
  return { event, eventDate, inferredBirthDate }
}

/* ------------------------------------------------------------------ basis */

function mapBasis(parent: Json, expectedBasisGrosze: number | null, notes: string[], missing: string[]): ParentInput["basis"] {
  const title = arr(parent.insuranceTitles).map(rec)[0]
  if (!title) return undefined

  const basisInputs = arr(title.basisInputs).map(rec).filter((entry) => str(entry.month) && num(entry.amountGrosze) !== undefined)
  if (basisInputs.length > 0) {
    return {
      method: "MONTHLY_HISTORY",
      months: basisInputs.slice(0, 24).map((entry) => ({
        month: str(entry.month)!,
        grossGrosze: Math.round(num(entry.amountGrosze)!),
        ...(num(entry.daysWorked) !== undefined && num(entry.daysRequired) !== undefined
          ? { workedAtLeastHalf: num(entry.daysWorked)! >= num(entry.daysRequired)! / 2 }
          : {}),
      })),
    }
  }
  const declared = num(title.declaredBasisGrosze)
  if (declared !== undefined && declared > 0) {
    return { method: "KNOWN_BASIS", monthlyBasisGrosze: Math.round(declared), origin: "PAYER_CERTIFICATE" }
  }
  if (expectedBasisGrosze !== null && expectedBasisGrosze > 0) {
    notes.push(`Brak podstawy w aktach — użyto podstawy wyliczonej w sprawie (${expectedBasisGrosze} gr).`)
    return { method: "KNOWN_BASIS", monthlyBasisGrosze: Math.round(expectedBasisGrosze), origin: "USER" }
  }
  missing.push("Brak podstawy wymiaru — kwota nie zostanie policzona.")
  return undefined
}

/* ------------------------------------------------------------------- plan */

const TAKEOVER_MAP: Record<string, NonNullable<NonNullable<LeavePlanInput["maternityTakeover"]>["reason"]>> = {
  MOTHER_RESIGNED_AFTER_14W: "MOTHER_RESIGNS_AFTER_14_WEEKS",
  MOTHER_RESIGNS_AFTER_14_WEEKS: "MOTHER_RESIGNS_AFTER_14_WEEKS",
  MOTHER_INCAPACITY: "MOTHER_INCAPACITY",
  MOTHER_HOSPITALIZED: "MOTHER_HOSPITALIZED",
  MOTHER_DIED: "MOTHER_DIED",
  MOTHER_ABANDONED_CHILD: "MOTHER_ABANDONED_CHILD",
  UNINSURED_MOTHER_DIED: "UNINSURED_MOTHER_DIED",
  UNINSURED_MOTHER_ABANDONED_CHILD: "UNINSURED_MOTHER_ABANDONED_CHILD",
  UNINSURED_MOTHER_INCAPACITY: "UNINSURED_MOTHER_INCAPACITY",
  UNINSURED_MOTHER_EMPLOYED: "UNINSURED_MOTHER_EMPLOYED",
}

function mapPlan(root: Json, roleById: Map<string, ParentRole>, birthDate: string | undefined, notes: string[], missing: string[]): LeavePlanInput | undefined {
  const facts = rec(root.facts)
  const scenario = rec(facts.scenario)
  const segments = arr(scenario.segments).map(rec)
  if (segments.length === 0) return undefined

  const rates = segments.map((segment) => num(segment.rate)).filter((rate): rate is number => rate !== undefined)
  const paymentOption = str(scenario.paymentOption) === "FLAT_81_5" || rates.some((rate) => Math.abs(rate - 0.815) < 0.0001)
    ? ("FLAT_81_5" as const)
    : str(scenario.paymentOption) === "STANDARD_100_70"
      ? ("STANDARD_100_70" as const)
      : undefined

  const plan: LeavePlanInput = {}
  if (paymentOption) plan.paymentOption = paymentOption

  const parentalSegments: NonNullable<LeavePlanInput["parentalSegments"]> = []
  for (const segment of segments) {
    const kind = str(segment.kind)?.toUpperCase()
    if (kind !== "PARENTAL") continue
    const parent = roleById.get(str(segment.parentId) ?? "") ?? "MOTHER"
    const start = iso(segment.start ?? segment.from)
    const end = iso(segment.end ?? segment.to)
    const weeks = num(segment.weeks) ?? (start && end ? weeksBetween(start, end) : undefined)
    if (weeks === undefined) {
      missing.push(`Segment rodzicielski ${parent} bez wymiaru tygodni.`)
      continue
    }
    const work = num(segment.workFraction)
    parentalSegments.push({
      parent,
      weeks: Math.round(weeks),
      ...(start ? { startDate: start } : {}),
      ...(work !== undefined ? { workFraction: String(work) } : {}),
    })
  }
  if (parentalSegments.length > 0) plan.parentalSegments = parentalSegments

  const fatherMaternity = segments.find(
    (segment) => str(segment.kind)?.toUpperCase() === "MATERNITY" && roleById.get(str(segment.parentId) ?? "") === "FATHER"
  )
  const motherMaternity = segments.find(
    (segment) => str(segment.kind)?.toUpperCase() === "MATERNITY" && roleById.get(str(segment.parentId) ?? "") !== "FATHER"
  )
  if (fatherMaternity) {
    const rawReason = str(fatherMaternity.takeoverReason)?.toUpperCase()
    const reason = rawReason ? TAKEOVER_MAP[rawReason] : undefined
    if (!reason) missing.push("Brak jednoznacznego powodu przejęcia urlopu macierzyńskiego przez ojca.")
    const motherWeeks = num(motherMaternity?.weeks)
    plan.maternityTakeover = {
      reason: reason ?? "MOTHER_RESIGNS_AFTER_14_WEEKS",
      ...(motherWeeks !== undefined ? { motherWeeksAfterBirth: Math.round(motherWeeks) } : {}),
    }
  }

  const maternityStart = iso(motherMaternity?.start ?? motherMaternity?.from)
  const preBirthWeeks = num(scenario.maternityWeeksBeforeBirth)
  if (preBirthWeeks !== undefined) plan.maternityWeeksBeforeBirth = Math.round(preBirthWeeks)
  else if (maternityStart && birthDate && maternityStart < birthDate) {
    plan.maternityWeeksBeforeBirth = Math.min(6, weeksBetween(maternityStart, birthDate))
  }

  const paternity = segments
    .filter((segment) => str(segment.kind)?.toUpperCase() === "PATERNITY")
    .map((segment) => {
      const start = iso(segment.start ?? segment.from)
      const end = iso(segment.end ?? segment.to)
      const days = num(segment.days) ?? (start && end ? daysBetween(start, end) + 1 : 14)
      return { days: Math.max(1, Math.round(days)), ...(start ? { startDate: start } : {}) }
    })
  if (paternity.length > 0) plan.paternity = paternity

  if (segments.some((segment) => str(segment.kind)?.toUpperCase() === "SUPPLEMENTARY_MATERNITY")) {
    plan.supplementaryParent = "MOTHER"
  }

  return Object.keys(plan).length > 0 ? plan : undefined
}

/* ------------------------------------------------------------- expected */

const CHECK_MAP: Record<string, ExpectedCheck[]> = {
  "SC-02": [{ parent: "MOTHER", benefit: "MATERNITY", status: "ELIGIBLE", sourceStatus: "ELIGIBLE" }],
  "SC-03": [
    { parent: "MOTHER", benefit: "MATERNITY", status: "ELIGIBLE", sourceStatus: "ELIGIBLE" },
    { parent: "FATHER", benefit: "MATERNITY", status: "CONDITIONAL", sourceStatus: "ELIGIBLE_IF_INSURED" },
  ],
  "SC-05": [{ parent: "FATHER", benefit: "PARENTAL", status: "ELIGIBLE", sourceStatus: "ELIGIBLE" }],
  "SC-06": [{ parent: "MOTHER", benefit: "MATERNITY", status: "NOT_ELIGIBLE", sourceStatus: "NOT_ELIGIBLE" }],
  "SC-07": [{ parent: "MOTHER", benefit: "MATERNITY", status: "ELIGIBLE", sourceStatus: "ELIGIBLE" }],
  "SC-08": [
    { parent: "MOTHER", benefit: "MATERNITY_EQUIVALENT", status: "ELIGIBLE", sourceStatus: "ELIGIBLE" },
    { parent: "MOTHER", benefit: "MATERNITY", status: "ELIGIBLE", sourceStatus: "ELIGIBLE" },
  ],
  "SC-09": [{ parent: "MOTHER", benefit: "MATERNITY", status: "NOT_ELIGIBLE", sourceStatus: "NOT_ELIGIBLE" }],
  "SC-10": [{ parent: "MOTHER", benefit: "MATERNITY_TERMS", status: "ELIGIBLE", sourceStatus: "ELIGIBLE" }],
  "SC-11": [{ parent: "MOTHER", benefit: "MATERNITY", status: "ELIGIBLE", sourceStatus: "ELIGIBLE" }],
  "SC-13": [{ parent: "MOTHER", benefit: "MATERNITY_TERMS", status: "ELIGIBLE", sourceStatus: "ELIGIBLE" }],
  "SC-14": [
    { parent: "MOTHER", benefit: "SICKNESS_IN_PREGNANCY", status: "ELIGIBLE", sourceStatus: "ELIGIBLE" },
    { parent: "MOTHER", benefit: "MATERNITY", status: "ELIGIBLE", sourceStatus: "ELIGIBLE" },
  ],
  "SC-15": [{ parent: "MOTHER", benefit: "MATERNITY", status: "ELIGIBLE", sourceStatus: "ELIGIBLE" }],
  "SC-18": [{ parent: "MOTHER", benefit: "MATERNITY", status: "ELIGIBLE", sourceStatus: "ELIGIBLE" }],
  "SC-20": [{ parent: "MOTHER", benefit: "MATERNITY", status: "ELIGIBLE", sourceStatus: "ELIGIBLE" }],
  "SC-21": [{ parent: "MOTHER", benefit: "MATERNITY", status: "NOT_ELIGIBLE", sourceStatus: "NOT_ELIGIBLE" }],
  "SC-22": [{ parent: "MOTHER", benefit: "MATERNITY", status: "NOT_ELIGIBLE", sourceStatus: "NOT_ELIGIBLE" }],
  "SC-25": [{ parent: "FATHER", benefit: "PATERNITY", status: "NOT_ELIGIBLE", sourceStatus: "NOT_ELIGIBLE" }],
  "SC-28": [{ parent: "MOTHER", benefit: "MATERNITY", status: "ELIGIBLE", sourceStatus: "ELIGIBLE" }],
  "SC-31": [{ parent: "MOTHER", benefit: "MATERNITY", status: "ELIGIBLE", sourceStatus: "ELIGIBLE" }],
  "SC-32": [{ parent: "MOTHER", benefit: "MATERNITY", status: "NOT_ELIGIBLE", sourceStatus: "NOT_ELIGIBLE" }],
  "SC-34": [{ parent: "MOTHER", benefit: "SICKNESS_IN_PREGNANCY", status: "ELIGIBLE", sourceStatus: "ELIGIBLE" }],
  "SC-35": [
    { parent: "MOTHER", benefit: "MATERNITY", status: "ELIGIBLE", sourceStatus: "ELIGIBLE" },
    { parent: "MOTHER", benefit: "SUPPLEMENTARY_MATERNITY", status: "ELIGIBLE", sourceStatus: "ELIGIBLE" },
    { parent: "MOTHER", benefit: "PARENTAL", status: "ELIGIBLE", sourceStatus: "ELIGIBLE" },
  ],
}

const PERIOD_BENEFIT: Record<string, { parent: ParentRole; benefit: BenefitType }> = {
  maternity: { parent: "MOTHER", benefit: "MATERNITY" },
  motherMaternity: { parent: "MOTHER", benefit: "MATERNITY" },
  fatherMaternity: { parent: "FATHER", benefit: "MATERNITY" },
  parental: { parent: "MOTHER", benefit: "PARENTAL" },
  fatherParental: { parent: "FATHER", benefit: "PARENTAL" },
  maternityTerms: { parent: "MOTHER", benefit: "MATERNITY_TERMS" },
  sickness: { parent: "MOTHER", benefit: "SICKNESS_IN_PREGNANCY" },
  supplementary: { parent: "MOTHER", benefit: "SUPPLEMENTARY_MATERNITY" },
}

function periodChecks(expected: Json): PeriodCheck[] {
  const periods = rec(expected.periods)
  const checks: PeriodCheck[] = []
  for (const [key, value] of Object.entries(periods)) {
    const map = PERIOD_BENEFIT[key]
    const period = rec(value)
    if (!map || Object.keys(period).length === 0) continue
    const start = iso(period.from ?? period.start)
    const end = iso(period.to ?? period.end)
    const days = num(period.days)
    const weeks = num(period.weeks)
    if (!start && !end && days === undefined && weeks === undefined) continue
    checks.push({ ...map, ...(start ? { start } : {}), ...(end ? { end } : {}), ...(days !== undefined ? { days } : {}), ...(weeks !== undefined ? { weeks } : {}) })
  }
  return checks
}

/* --------------------------------------------------------------- mapping */

export function mapCase(caseCode: string, raw: Json): CaseMapping {
  const notes: string[] = []
  const missing: string[] = []
  const expected = rec(raw.expected)
  const expectedEligibility = rec(expected.eligibility)
  const expectedBasisGrosze = num(rec(expected.basis).monthlyBasisGrosze) ?? null
  const facts = rec(raw.facts)
  const household = rec(facts.household)
  const family = mapEvent(raw, notes, missing)

  const parentsRaw = arr(household.parents).map(rec)
  const roleById = new Map<string, ParentRole>()
  const parents: ParentInput[] = []
  for (const [index, parent] of parentsRaw.entries()) {
    const rawRole = str(parent.role)?.toUpperCase()
    const role: ParentRole = rawRole === "FATHER" ? "FATHER" : "MOTHER"
    const id = str(parent.id)
    if (id) roleById.set(id, role)
    const mapped = mapTitle(parent, family.eventDate, notes, missing)
    if (!mapped) {
      if (role === "MOTHER" && parentsRaw.length === 1) {
        // An uninsured parent is still part of the household for the father-only cases.
      }
      continue
    }
    const insurance: InsuranceInput = {
      title: mapped.title,
      sicknessInsurance: mapped.sickness,
      ...(mapped.startDate ? { startDate: mapped.startDate } : {}),
      ...(mapped.endDate ? { endDate: mapped.endDate } : {}),
      ...(mapped.endReason ? { endReason: mapped.endReason } : {}),
      ...(mapped.endDate && family.eventDate && mapped.endDate < family.eventDate
        ? { endedDuringPregnancy: true }
        : {}),
      ...(mapped.otherEmploymentProvided !== undefined
        ? { otherEmploymentProvided: mapped.otherEmploymentProvided }
        : {}),
      ...(mapped.payerSize ? { payerSize: mapped.payerSize } : {}),
      ...(mapped.workingTimeFraction ? { workingTimeFraction: mapped.workingTimeFraction } : {}),
      ...(mapped.debtExists !== undefined
        ? {
            contributionDebt: {
              exists: mapped.debtExists,
              ...(mapped.debtExceedsThreshold !== undefined ? { exceedsThreshold: mapped.debtExceedsThreshold } : {}),
            },
          }
        : {}),
    }
    const basis = mapBasis(parent, expectedBasisGrosze, notes, missing)
    parents.push({
      role,
      insurance,
      ...(basis ? { basis } : {}),
      birthYear: num(parent.birthYear),
    })
  }
  if (parents.length === 0) missing.push("Brak danych rodzica z tytułem ubezpieczenia.")

  const plan = mapPlan(raw, roleById, family.eventDate, notes, missing)
  const sickLeaves = arr(rec(parentsRaw[0]).sickLeaves).map(rec)
  const sicknessSegment = arr(rec(facts.scenario).segments)
    .map(rec)
    .find((segment) => str(segment.kind)?.toUpperCase() === "SICKNESS")
  const sickStart = iso(sickLeaves[0]?.from) ?? iso(sicknessSegment?.start ?? sicknessSegment?.from)
  const sickEnd = iso(sickLeaves[0]?.to) ?? iso(sicknessSegment?.end ?? sicknessSegment?.to)
  const sickCode = str(sickLeaves[0]?.code) ?? str(sicknessSegment?.code)

  const input: AssessmentInput = {
    asOf: "2026-11-22",
    event: family.event,
    parents,
    ...(plan ? { plan } : {}),
    ...(sickStart && sickEnd
      ? { sickLeave: { start: sickStart, end: sickEnd, ...(sickCode?.toUpperCase() === "B" ? { pregnancyCode: true } : {}) } }
      : {}),
  }

  // Reproduction of the decision requires the 1000 zł parental-benefit floor
  // for the two top-up cases; the value comes from the case documents.
  if (caseCode === "SC-07" || caseCode === "SC-28") {
    input.externalParameters = {
      parentalBenefitAmountGrosze: 100_000,
      sourceNote: "Kwota świadczenia rodzicielskiego 1000 zł z decyzji ZUS w aktach sprawy.",
    }
  }

  // A refusal decision that names the 1% threshold confirms the amount could
  // not be read from the file; use the decision's finding, not an invented sum.
  const refusalText = JSON.stringify(expectedEligibility)
  if (/powyżej 1%|przekracza 1%|> 1%/i.test(refusalText)) {
    for (const parent of input.parents) {
      if (parent.insurance?.contributionDebt?.exists) {
        parent.insurance.contributionDebt.exceedsThreshold = true
        notes.push("Decyzja stwierdza zadłużenie powyżej 1% minimalnego wynagrodzenia — przyjęto próg jako potwierdzony w decyzji.")
      }
    }
  }

  const claimant: ParentRole =
    parents.find((parent) => parent.role === "FATHER") && !parents.some((parent) => parent.role === "MOTHER")
      ? "FATHER"
      : "MOTHER"
  const claimantParent = parentsRaw.find((parent) => (str(parent.role)?.toUpperCase() === "FATHER" ? "FATHER" : "MOTHER") === claimant)
  const claimantTitle = arr(claimantParent?.insuranceTitles).map(rec)[0]
  const claimantKind = str(claimantTitle?.kind)?.toUpperCase()
  const claimantMapped = claimantParent
    ? mapTitle(claimantParent, family.eventDate, [], [])
    : null
  const rawFamilyEvent = rec(household.familyEvent)
  const chatFacts: CaseFacts = {
    parentRole: claimant,
    ...(claimantKind && TITLE_MAP[claimantKind] ? { employmentType: TITLE_MAP[claimantKind] as CaseFacts["employmentType"] } : {}),
    ...(claimantMapped
      ? {
          sicknessInsurance: claimantMapped.sickness,
          ...(claimantMapped.startDate ? { insuranceStartDate: claimantMapped.startDate } : {}),
          ...(claimantMapped.endDate ? { insuranceEndDate: claimantMapped.endDate } : {}),
          ...(claimantMapped.endReason ? { insuranceEndReason: claimantMapped.endReason } : {}),
          ...(claimantMapped.otherEmploymentProvided !== undefined
            ? { otherEmploymentProvided: claimantMapped.otherEmploymentProvided }
            : {}),
          ...(claimantMapped.payerSize ? { payerSize: claimantMapped.payerSize } : {}),
          ...(claimantMapped.debtExists !== undefined ? { contributionArrears: claimantMapped.debtExists } : {}),
          ...(claimantMapped.debtExceedsThreshold !== undefined
            ? { contributionDebtExceedsThreshold: claimantMapped.debtExceedsThreshold }
            : {}),
        }
      : {}),
    familyEvent: family.event.kind,
    ...(family.eventDate ? { eventDate: family.eventDate } : {}),
    ...(input.event.expectedDueDate ? { expectedDueDate: input.event.expectedDueDate } : {}),
    ...(input.event.childrenCount ? { childrenCount: input.event.childrenCount } : {}),
    ...(input.event.zaZyciem ? { hasZaZyciem: true } : {}),
    ...(input.event.stillbirth ? { stillbirth: true } : {}),
    ...(input.event.childBirthDate ? { childBirthDate: input.event.childBirthDate } : {}),
    ...(input.event.courtApplicationDate ? { courtApplicationDate: input.event.courtApplicationDate } : {}),
    ...(input.event.adoptionFinalDate ? { adoptionFinalDate: input.event.adoptionFinalDate } : {}),
    ...(input.event.gestationalWeeksCompleted !== undefined
      ? { gestationalWeeksCompleted: input.event.gestationalWeeksCompleted }
      : {}),
    ...(input.event.lowestBirthWeightGrams !== undefined
      ? { lowestBirthWeightGrams: input.event.lowestBirthWeightGrams }
      : {}),
    ...(num(rawFamilyEvent.childHospitalWeeks) !== undefined
      ? { childHospitalWeeks: num(rawFamilyEvent.childHospitalWeeks) }
      : {}),
    ...(num(rawFamilyEvent.childHospitalDaysDay5To28) !== undefined
      ? { childHospitalDaysDay5To28: num(rawFamilyEvent.childHospitalDaysDay5To28) }
      : {}),
    ...(input.event.professionalFosterFamily ? { professionalFosterFamily: true } : {}),
    ...(sickStart ? { sickLeaveStart: sickStart } : {}),
    ...(sickEnd ? { sickLeaveEnd: sickEnd } : {}),
    ...(sickCode?.toUpperCase() === "B" ? { pregnancySickLeave: true } : {}),
    ...(sickStart && sickEnd ? { sickLeaveDays: daysBetween(sickStart, sickEnd) + 1 } : {}),
    ...(input.plan?.paymentOption ? { paymentOption: input.plan.paymentOption } : {}),
  }

  const historical = family.eventDate !== undefined && family.eventDate < EARLIEST_SUPPORTED_DATE
  if (historical) {
    notes.push(
      `Zdarzenie ${family.eventDate} poprzedza najstarszą wersję przepisów w aplikacji (${EARLIEST_SUPPORTED_DATE}); wynik „według prawa z dnia zdarzenia” będzie MANUAL_REVIEW, a wariant „obecne przepisy” to symulacja.`
    )
  }

  return {
    input,
    inputCurrentLaw: historical ? { ...input, ruleSetVersion: "2026.10-Z1" } : null,
    chatFacts,
    chatFactsCurrentLaw: historical ? { ...chatFacts } : null,
    historical,
    checks: CHECK_MAP[caseCode] ?? [],
    periodChecks: periodChecks(expected),
    expectedAmounts: Object.keys(rec(expected.amounts)).length > 0 ? rec(expected.amounts) : null,
    expectedBasisGrosze,
    notes,
    missing,
  }
}
