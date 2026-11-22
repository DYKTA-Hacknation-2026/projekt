import type {
  CareKind,
  EmploymentForm,
  LeaveKind,
  PaymentOptionAnswer,
  SituationAnswers,
  SituationScenario,
} from "./types"

export const SCENARIO_LABELS: Record<SituationScenario, string> = {
  PLANNING: "Planowanie rodzicielstwa",
  PREGNANCY: "Oczekiwanie narodzin dziecka",
  BIRTH: "Dziecko już się urodziło",
  ON_LEAVE: "Trwający urlop lub świadczenie",
  CARE: "Adopcja lub rodzina zastępcza",
  CHECK_DOCUMENT: "Sprawdzenie konkretnego wniosku",
}

export const EMPLOYMENT_LABELS: Record<EmploymentForm, string> = {
  EMPLOYMENT: "Umowa o pracę",
  MANDATE: "Umowa zlecenia",
  SELF_EMPLOYMENT: "Działalność gospodarcza / B2B",
  OTHER: "Inna forma lub kilka tytułów",
  NONE: "Brak zatrudnienia i ubezpieczenia",
}

export const CARE_LABELS: Record<CareKind, string> = {
  ADOPTION: "Adopcja",
  FOSTER_CARE: "Rodzina zastępcza",
}

export const LEAVE_LABELS: Record<LeaveKind, string> = {
  MATERNITY: "Urlop macierzyński",
  PARENTAL: "Urlop rodzicielski",
  PATERNITY: "Urlop ojcowski",
}

export const PAYMENT_LABELS: Record<PaymentOptionAnswer, string> = {
  STANDARD_100_70: "100% macierzyński / 70% rodzicielski",
  FLAT_81_5: "81,5% za cały urlop",
}

export interface SummaryRow {
  label: string
  value: string
}

function date(value: string): string | undefined {
  return value.trim() === "" ? undefined : value
}

export function scenarioLabel(answers: SituationAnswers): string {
  if (answers.scenario === "") return "Nie wybrano"
  if (answers.scenario === "CARE" && answers.careKind) {
    return CARE_LABELS[answers.careKind as CareKind]
  }
  return SCENARIO_LABELS[answers.scenario as SituationScenario]
}

/** Human-readable facts used on the summary screen and in saved metadata. */
export function situationSummary(answers: SituationAnswers): SummaryRow[] {
  const rows: SummaryRow[] = []
  const add = (label: string, value: string | undefined) => {
    if (value !== undefined && value.trim() !== "") rows.push({ label, value })
  }

  add("Sytuacja", scenarioLabel(answers))
  add(
    "Analiza dotyczy",
    answers.userRole === "FATHER"
      ? "Ojca / drugiego rodzica"
      : "Matki / rodzica przyjmującego"
  )
  if (answers.scenario === "ON_LEAVE" && answers.leaveKind) {
    add("Obecny urlop", LEAVE_LABELS[answers.leaveKind as LeaveKind])
  }
  add("Termin porodu", date(answers.dueDate))
  add("Data urodzenia dziecka", date(answers.birthDate))
  add("Liczba dzieci", answers.childrenCount)
  add("Data przyjęcia dziecka", date(answers.careTakingDate))
  add("Data urodzenia dziecka (adopcja)", date(answers.childBirthDate))
  add("Data rozpoczęcia urlopu", date(answers.leaveStartDate))
  add(
    "Wykorzystany urlop rodzicielski",
    answers.parentalWeeksUsed ? `${answers.parentalWeeksUsed} tyg.` : undefined
  )
  add("Za życiem", answers.hasZaZyciem === "YES" ? "Tak" : undefined)
  add(
    "Wcześniactwo",
    answers.premature === "YES"
      ? [answers.gestationalWeeks, answers.birthWeightGrams]
          .filter(Boolean)
          .join(" / ")
      : undefined
  )

  if (answers.motherEmployment) {
    add(
      "Forma zatrudnienia",
      EMPLOYMENT_LABELS[answers.motherEmployment as EmploymentForm]
    )
  }
  if (answers.motherSickness) {
    add(
      "Ubezpieczenie chorobowe",
      answers.motherSickness === "NONE"
        ? "Brak"
        : answers.motherSickness === "COMPULSORY"
          ? "Obowiązkowe"
          : "Dobrowolne"
    )
  }
  add(
    "Dochód brutto",
    answers.motherBasisMode !== "KNOWN" && answers.motherIncome
      ? `${answers.motherIncome} zł / mies.`
      : undefined
  )
  add(
    "Podstawa wymiaru",
    answers.motherBasisMode === "KNOWN" && answers.motherIncome
      ? `${answers.motherIncome} zł (z zaświadczenia)`
      : undefined
  )
  if (answers.fatherIncluded === "YES") {
    add("Drugi rodzic", "Uwzględniony")
    if (answers.fatherEmployment) {
      add(
        "Zatrudnienie drugiego rodzica",
        EMPLOYMENT_LABELS[answers.fatherEmployment as EmploymentForm]
      )
    }
    if (answers.fatherLeaveWeeks) {
      add(
        "Urlop rodzicielski drugiego rodzica",
        `${answers.fatherLeaveWeeks} tyg.`
      )
    }
  } else {
    add("Drugi rodzic", "Nieuwzględniony")
  }
  if (answers.scenario !== "CHECK_DOCUMENT") {
    add(
      "Wariant wypłaty",
      PAYMENT_LABELS[answers.paymentOption as PaymentOptionAnswer]
    )
  }

  return rows
}
