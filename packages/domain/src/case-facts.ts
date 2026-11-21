/**
 * Facts about one parent's situation that the guidance services reason on.
 *
 * Every field is optional: a missing fact never defaults to a favourable
 * value. Services return `NEEDS_INPUT` and a follow-up question instead.
 * The record deliberately holds no names, identifiers or medical details.
 */

export type EmploymentKind =
  | "EMPLOYMENT"
  | "MANDATE"
  | "SELF_EMPLOYMENT"
  | "OTHER"
  | "NONE"

export type SicknessInsuranceMode = "COMPULSORY" | "VOLUNTARY" | "NONE"

export type FamilyEventKind = "PREGNANCY" | "BIRTH" | "ADOPTION" | "FOSTER_CARE"

export type ParentRole = "MOTHER" | "FATHER"

/** Payer size on 30 November of the previous year (U art. 61 ust. 1). */
export type PayerSize = "OVER_20" | "UP_TO_20"

export interface CaseFacts {
  parentRole?: ParentRole
  employmentType?: EmploymentKind
  /** Sickness insurance. Employees are always covered compulsorily. */
  sicknessInsurance?: SicknessInsuranceMode
  /** First day of the current, uninterrupted sickness insurance. */
  insuranceStartDate?: string
  familyEvent?: FamilyEventKind
  /** Birth or care-taking date, if it already happened. */
  eventDate?: string
  expectedDueDate?: string
  childrenCount?: number
  hasZaZyciem?: boolean
  /** Professional foster family (rodzina zastępcza zawodowa). */
  professionalFosterFamily?: boolean
  /** Contribution arrears (self-employed and similar, U art. 2a). */
  contributionArrears?: boolean
  payerSize?: PayerSize
}

export type FactKey = keyof CaseFacts

export interface MissingFact {
  key: FactKey
  /** One short Polish follow-up question. */
  question: string
  /** Why the answer changes the outcome. */
  reason: string
}

export const FACT_QUESTIONS: Record<
  Exclude<FactKey, "childrenCount" | "hasZaZyciem" | "professionalFosterFamily">,
  MissingFact
> = {
  parentRole: {
    key: "parentRole",
    question: "Czy pytasz jako mama, czy jako tata dziecka?",
    reason: "Część uprawnień przysługuje tylko jednemu z rodziców.",
  },
  employmentType: {
    key: "employmentType",
    question:
      "Na jakiej podstawie pracujesz: umowa o pracę, umowa zlecenia czy własna działalność (B2B)?",
    reason: "Tytuł ubezpieczenia decyduje o ubezpieczeniu chorobowym i o tym, kto wypłaca zasiłek.",
  },
  sicknessInsurance: {
    key: "sicknessInsurance",
    question: "Czy opłacasz dobrowolne ubezpieczenie chorobowe w ZUS?",
    reason: "Przy zleceniu i działalności ubezpieczenie chorobowe jest dobrowolne, a bez niego zasiłek nie przysługuje.",
  },
  insuranceStartDate: {
    key: "insuranceStartDate",
    question: "Od kiedy (mniej więcej) nieprzerwanie podlegasz ubezpieczeniu chorobowemu?",
    reason: "Od tego zależy okres wyczekiwania na zasiłek chorobowy.",
  },
  familyEvent: {
    key: "familyEvent",
    question: "Czy jesteś w ciąży, dziecko już się urodziło, czy chodzi o adopcję lub rodzinę zastępczą?",
    reason: "Wymiar urlopu i terminy zależą od rodzaju zdarzenia.",
  },
  eventDate: {
    key: "eventDate",
    question: "Kiedy urodziło się dziecko (lub kiedy przyjęto je na wychowanie)?",
    reason: "Większość terminów liczy się od tej daty.",
  },
  expectedDueDate: {
    key: "expectedDueDate",
    question: "Jaki jest przewidywany termin porodu?",
    reason: "Terminy wniosków i plan urlopów liczę od tej daty.",
  },
  contributionArrears: {
    key: "contributionArrears",
    question: "Czy masz zaległości w składkach ZUS?",
    reason: "Zadłużenie przedsiębiorcy może wstrzymać wypłatę zasiłku (U art. 2a).",
  },
  payerSize: {
    key: "payerSize",
    question: "Czy twój pracodawca zgłasza do ubezpieczeń więcej niż 20 osób?",
    reason: "Od tego zależy, czy zasiłek wypłaca pracodawca, czy ZUS (U art. 61).",
  },
}

/** Sickness insurance implied by the title, when the law fixes it. */
export function effectiveSicknessInsurance(
  facts: CaseFacts
): SicknessInsuranceMode | undefined {
  if (facts.employmentType === "EMPLOYMENT") return "COMPULSORY"
  if (facts.employmentType === "NONE") return "NONE"
  return facts.sicknessInsurance
}
