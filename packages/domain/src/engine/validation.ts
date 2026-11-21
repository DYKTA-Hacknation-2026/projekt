import { isIsoDate } from "./calendar"
import type { EvaluationContext } from "./context"
import type { AssessmentInput, ParentInput } from "./types"

/** Structural errors that make the input unusable (reported as HTTP 422 by the API). */
export class AssessmentInputError extends Error {
  readonly issues: string[]
  constructor(issues: string[]) {
    super(issues.join(" "))
    this.name = "AssessmentInputError"
    this.issues = issues
  }
}

/** Keys that carry a calendar date anywhere in the input tree. */
const DATE_KEY = /(Date|On)$|^(start|end|date|repaidOn)$/

function collectDateIssues(value: unknown, path: string, issues: string[]): void {
  if (Array.isArray(value)) {
    value.forEach((item, index) => collectDateIssues(item, `${path}[${index}]`, issues))
    return
  }
  if (value === null || typeof value !== "object") return
  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    const next = path ? `${path}.${key}` : key
    if (typeof item === "string" && DATE_KEY.test(key)) {
      if (!isIsoDate(item)) issues.push(`${next} musi być istniejącą datą RRRR-MM-DD.`)
    } else {
      collectDateIssues(item, next, issues)
    }
  }
}

export function assertStructurallyValid(input: AssessmentInput): void {
  const issues: string[] = []
  collectDateIssues({ event: input.event, parents: input.parents, plan: input.plan, sickLeave: input.sickLeave }, "", issues)
  if (!isIsoDate(input.asOf)) issues.push("asOf musi być datą RRRR-MM-DD.")
  if (!input.event) issues.push("Brak opisu zdarzenia (event).")
  if (!Array.isArray(input.parents) || input.parents.length === 0 || input.parents.length > 2) {
    issues.push("Podaj jednego albo dwoje rodziców.")
  } else {
    const roles = input.parents.map((parent) => parent.role)
    if (new Set(roles).size !== roles.length) issues.push("Każda rola rodzica (MOTHER, FATHER) może wystąpić tylko raz.")
  }
  if (input.plan?.paternity?.length && !input.parents?.some((parent) => parent.role === "FATHER")) {
    issues.push("Urlop ojcowski w planie wymaga podania ojca (rola FATHER).")
  }
  if (issues.length) throw new AssessmentInputError(issues)
}

/**
 * Logical consistency of the facts. An inconsistency never stops the
 * assessment; it routes it to manual review and lists what to clarify.
 */
export function checkConsistency(ctx: EvaluationContext): void {
  const { event, plan } = ctx.input
  const flag = (key: string, text: string, question: string) => {
    ctx.review(text)
    ctx.need({ key, question, why: text, affects: ["MATERNITY", "PARENTAL"] })
  }

  if (event.kind === "BIRTH" && event.birthDate && event.birthDate > ctx.asOf) {
    flag("event.birthDate", `Data porodu ${event.birthDate} jest późniejsza niż data oceny ${ctx.asOf}.`, "Czy dziecko już się urodziło? Jeśli nie — podaj przewidywaną datę porodu.")
  }
  if (event.kind === "PREGNANCY" && event.birthDate) {
    flag("event.kind", "Podano datę porodu, ale zdarzenie oznaczono jako ciążę.", "Czy dziecko już się urodziło?")
  }
  if (event.kind === "PREGNANCY" && event.expectedDueDate && event.expectedDueDate < ctx.asOf) {
    ctx.warn({ code: "DUE_DATE_PASSED", severity: "WARNING", text: `Przewidywana data porodu (${event.expectedDueDate}) już minęła — podaj faktyczną datę porodu, aby urealnić terminy.` })
    ctx.need({ key: "event.birthDate", question: "Kiedy urodziło się dziecko?", why: "Terminy i okresy liczą się od faktycznej daty porodu.", affects: ["MATERNITY", "PARENTAL", "PATERNITY"] })
  }
  if ((event.kind === "ADOPTION" || event.kind === "FOSTER_CARE") && event.childBirthDate && event.careTakingDate && event.careTakingDate < event.childBirthDate) {
    flag("event.careTakingDate", "Data przyjęcia dziecka jest wcześniejsza niż data jego urodzenia.", "Sprawdź datę urodzenia dziecka i datę przyjęcia na wychowanie.")
  }
  const births = Math.max(1, Math.round(event.childrenCount ?? 1))
  const deaths = event.childDeaths?.length ?? 0
  if (deaths > births) {
    flag("event.childDeaths", `Podano ${deaths} zgonów przy ${births} dzieciach urodzonych przy jednym porodzie.`, "Ile dzieci urodziło się przy porodzie i ile z nich zmarło?")
  }
  if (event.stillbirth && deaths > 0) {
    flag("event.stillbirth", "Zaznaczono martwe urodzenie i jednocześnie zgon dziecka po urodzeniu.", "Czy dziecko urodziło się martwe, czy zmarło po porodzie?")
  }
  const birth = event.birthDate ?? event.expectedDueDate
  for (const death of event.childDeaths ?? []) {
    if (!isIsoDate(death.date) || (birth && death.date < birth)) {
      flag("event.childDeaths", "Data zgonu dziecka jest nieprawidłowa lub wcześniejsza niż data porodu.", "Podaj datę zgonu dziecka.")
    }
  }
  for (const stay of event.childHospitalStays ?? []) {
    if (!isIsoDate(stay.start) || !isIsoDate(stay.end) || stay.end < stay.start) {
      flag("event.childHospitalStays", "Okres pobytu dziecka w szpitalu jest nieprawidłowy (koniec przed początkiem).", "Podaj daty przyjęcia i wypisu dziecka ze szpitala.")
    } else if (birth && stay.start < birth) {
      flag("event.childHospitalStays", "Pobyt dziecka w szpitalu zaczyna się przed porodem.", "Sprawdź daty pobytu dziecka w szpitalu.")
    }
  }
  if (event.gestationalWeeksCompleted !== undefined && event.gestationalWeeksCompleted < 0) {
    flag("event.gestationalWeeksCompleted", "Tydzień ciąży nie może być ujemny.", "W którym tygodniu ciąży urodziło się dziecko?")
  }
  if (event.lowestBirthWeightGrams !== undefined && event.lowestBirthWeightGrams <= 0) {
    flag("event.lowestBirthWeightGrams", "Masa urodzeniowa musi być dodatnia.", "Jaka była masa urodzeniowa dziecka?")
  }
  if (event.zaZyciem) {
    ctx.warn({ code: "ZA_ZYCIEM_NOT_VERIFIED", severity: "INFO", text: "Silnik nie weryfikuje zaświadczenia „Za życiem” — do wniosku dołącza się oświadczenie, że dziecko je posiada (U art. 61b)." })
  }
  if (plan?.flatRateApplicationDate && birth && plan.flatRateApplicationDate < birth && event.kind !== "ADOPTION" && event.kind !== "FOSTER_CARE") {
    ctx.warn({ code: "FLAT_APPLICATION_BEFORE_BIRTH", severity: "INFO", parent: "MOTHER", text: "Wniosek o 81,5% składa się po porodzie (do 21 dni) — data wniosku jest wcześniejsza niż poród." })
  }

  for (const parent of ctx.input.parents) checkParent(ctx, parent, birth)
}

function checkParent(ctx: EvaluationContext, parent: ParentInput, birth: string | undefined): void {
  const insurance = parent.insurance
  const who = parent.role === "MOTHER" ? "matki" : "ojca"
  const flag = (key: string, text: string, question: string) => {
    ctx.review(text)
    ctx.need({ key, parent: parent.role, question, why: text, affects: ["MATERNITY", "PARENTAL", "PATERNITY", "SICKNESS_IN_PREGNANCY"] })
  }
  if (!insurance) return
  if (insurance.title === "EMPLOYMENT" && insurance.sicknessInsurance && insurance.sicknessInsurance !== "COMPULSORY") {
    flag("insurance.sicknessInsurance", `Umowa o pracę ${who} oznacza obowiązkowe ubezpieczenie chorobowe, a podano „${insurance.sicknessInsurance}”.`, "Czy na pewno pracujesz na umowę o pracę?")
  }
  if ((insurance.title === "SELF_EMPLOYMENT" || insurance.title === "MANDATE") && insurance.sicknessInsurance === "COMPULSORY") {
    ctx.warn({ code: "COVERAGE_COMPULSORY_UNUSUAL", severity: "WARNING", parent: parent.role, text: "Przy działalności i zleceniu ubezpieczenie chorobowe jest co do zasady dobrowolne (T s. 3). Sprawdź swój status w ZUS." })
  }
  if (insurance.title === "NONE" && insurance.sicknessInsurance && insurance.sicknessInsurance !== "NONE") {
    flag("insurance.title", `Podano brak tytułu ubezpieczenia ${who}, ale też ubezpieczenie chorobowe.`, "Na jakiej podstawie podlegasz ubezpieczeniu?")
  }
  for (const field of ["startDate", "endDate", "previousInsuranceStartDate", "previousInsuranceEndDate"] as const) {
    const value = insurance[field]
    if (value !== undefined && !isIsoDate(value)) flag(`insurance.${field}`, `Nieprawidłowa data ${field}.`, "Podaj datę w formacie RRRR-MM-DD.")
  }
  if (insurance.startDate && insurance.endDate && insurance.endDate < insurance.startDate) {
    flag("insurance.endDate", `Koniec ubezpieczenia ${who} jest wcześniejszy niż jego początek.`, "Sprawdź daty rozpoczęcia i zakończenia ubezpieczenia.")
  }
  if (insurance.endReason && !insurance.endDate) {
    ctx.need({ key: "insurance.endDate", parent: parent.role, question: "Kiedy ustało (ustanie) zatrudnienie lub ubezpieczenie?", why: "Przyczyna ustania ma znaczenie tylko w połączeniu z datą.", affects: ["MATERNITY", "PARENTAL"] })
  }
  if (parent.deathDate && birth && parent.deathDate < birth && parent.role === "MOTHER") {
    flag("mother.deathDate", "Data zgonu matki jest wcześniejsza niż data porodu.", "Sprawdź datę zgonu.")
  }
  if (parent.titleStartedDuringPregnancy) {
    ctx.warn({
      code: "TITLE_STARTED_IN_PREGNANCY",
      severity: "RISK",
      parent: parent.role,
      text: "Umowa lub działalność rozpoczęta w ciąży może zostać zbadana przez ZUS. Jeśli ZUS uzna, że zawarto ją dla pozoru, wyda decyzję o niepodleganiu ubezpieczeniu — bez prawa do zasiłków.",
      ruleId: "LR-70",
    })
  }
}
