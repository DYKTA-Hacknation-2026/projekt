import { FACT_QUESTIONS, type CaseFacts, type MissingFact } from "./case-facts"
import { addDays, addMonths, isIsoDate } from "./dates"

/**
 * Deadlines relevant to a parent, from the legal register (Q-25 notice
 * periods, Q-28 limitation and payment, KP art. 180 § 2, 182³). A deadline
 * gets a concrete date only when its anchor date is known; otherwise the rule
 * is returned in relative form. Dates are never guessed.
 */

export type DeadlineTopic =
  | "MATERNITY"
  | "PARENTAL"
  | "PATERNITY"
  | "PAYMENT"
  | "ADOPTION"
  | "WORK_COMBINATION"

export interface Deadline {
  id: string
  topic: DeadlineTopic
  title: string
  rule: string
  /** Computed calendar date (YYYY-MM-DD) when the anchor is known. */
  date: string | null
  anchor: "BIRTH" | "DUE_DATE" | "LEAVE_START" | "PERIOD_END" | "CARE_TAKING" | "RETURN_TO_WORK" | "LAST_FACT"
  legalBasis: string
  owner: "MAMA" | "TATA" | "OBOJE" | "PŁATNIK/ZUS"
}

export interface DeadlineReport {
  anchorDate: string | null
  anchorKind: "BIRTH" | "DUE_DATE" | "CARE_TAKING" | null
  deadlines: Deadline[]
  missingFacts: MissingFact[]
  caveats: string[]
}

export function relevantDeadlines(
  facts: CaseFacts,
  options: { topics?: readonly DeadlineTopic[] } = {}
): DeadlineReport {
  const adoption =
    facts.familyEvent === "ADOPTION" || facts.familyEvent === "FOSTER_CARE"
  const birth = isIsoDate(facts.eventDate) ? facts.eventDate : null
  const due = isIsoDate(facts.expectedDueDate) ? facts.expectedDueDate : null
  const anchorDate = birth ?? due
  const anchorKind = birth ? (adoption ? "CARE_TAKING" : "BIRTH") : due ? "DUE_DATE" : null
  // Until the birth happens, deadlines counted from the birth use the due date
  // as an estimate and are labelled as such.
  const estimated = !birth && Boolean(due)
  const fromBirth = (days: number) => (anchorDate ? addDays(anchorDate, days) : null)
  const est = estimated ? " (szacunkowo, od przewidywanego terminu porodu)" : ""

  const all: Deadline[] = []

  if (!adoption) {
    all.push(
      {
        id: "maternity-pre-birth",
        topic: "MATERNITY",
        title: "Najwcześniejszy start urlopu macierzyńskiego przed porodem",
        rule: "Przed przewidywaną datą porodu można wykorzystać nie więcej niż 6 tygodni urlopu macierzyńskiego.",
        date: due ? addDays(due, -42) : null,
        anchor: "DUE_DATE",
        legalBasis: "KP art. 180 § 2",
        owner: "MAMA",
      },
      {
        id: "maternity-pre-birth-request",
        topic: "MATERNITY",
        title: "Wniosek o urlop macierzyński przed porodem",
        rule: "Co najmniej 14 dni przed planowanym rozpoczęciem urlopu przed porodem.",
        date: null,
        anchor: "LEAVE_START",
        legalBasis: "P (Q-25)",
        owner: "MAMA",
      },
      {
        id: "maternity-resignation",
        topic: "MATERNITY",
        title: "Rezygnacja mamy z części urlopu macierzyńskiego na rzecz taty",
        rule: "Możliwa po wykorzystaniu 14 tygodni po porodzie; wniosek najpóźniej 7 dni przed powrotem do pracy.",
        date: null,
        anchor: "RETURN_TO_WORK",
        legalBasis: "KP art. 180 § 4; P s. 31",
        owner: "MAMA",
      }
    )
  } else {
    all.push({
      id: "adoption-request",
      topic: "ADOPTION",
      title: "Wniosek o urlop na warunkach urlopu macierzyńskiego",
      rule: "W ciągu 7 dni od przyjęcia dziecka na wychowanie; urlop zaczyna się najpóźniej 21 dni po przyjęciu.",
      date: birth ? addDays(birth, 7) : null,
      anchor: "CARE_TAKING",
      legalBasis: "KP art. 183 § 6",
      owner: "OBOJE",
    })
  }

  all.push(
    {
      id: "flat-81-5",
      topic: "PARENTAL",
      title: "Wniosek o zasiłek 81,5% za cały okres",
      rule: `W ciągu 21 dni od ${adoption ? "przyjęcia dziecka" : "porodu"}.${est}`,
      date: fromBirth(21),
      anchor: adoption ? "CARE_TAKING" : "BIRTH",
      legalBasis: "U art. 30a; U art. 31 ust. 4",
      owner: "MAMA",
    },
    {
      id: "parental-request",
      topic: "PARENTAL",
      title: "Wniosek o urlop rodzicielski (każda część)",
      rule: "Najpóźniej 21 dni przed rozpoczęciem urlopu rodzicielskiego lub jego części.",
      date: null,
      anchor: "LEAVE_START",
      legalBasis: "KP art. 182¹d",
      owner: "OBOJE",
    },
    {
      id: "work-combination",
      topic: "WORK_COMBINATION",
      title: "Wniosek o łączenie urlopu rodzicielskiego z pracą",
      rule: "Najpóźniej 21 dni przed podjęciem pracy; pracodawca może odmówić ze względów organizacyjnych.",
      date: null,
      anchor: "LEAVE_START",
      legalBasis: "KP art. 182¹e § 2",
      owner: "OBOJE",
    },
    {
      id: "paternity-request",
      topic: "PATERNITY",
      title: "Wniosek o urlop ojcowski",
      rule: "Co najmniej 7 dni przed rozpoczęciem urlopu.",
      date: null,
      anchor: "LEAVE_START",
      legalBasis: "KP art. 182³ § 2",
      owner: "TATA",
    },
    {
      id: "paternity-deadline",
      topic: "PATERNITY",
      title: "Ostatni dzień na wykorzystanie urlopu ojcowskiego",
      rule: `Do ukończenia przez dziecko 12 miesięcy życia.${est}`,
      date: anchorDate && !adoption ? addDays(addMonths(anchorDate, 12), -1) : null,
      anchor: "BIRTH",
      legalBasis: "KP art. 182³ § 1",
      owner: "TATA",
    },
    {
      id: "payer-forwarding",
      topic: "PAYMENT",
      title: "Przekazanie dokumentów do ZUS przez płatnika",
      rule: "Płatnik, który nie wypłaca zasiłku sam (do 20 ubezpieczonych), przekazuje dokumenty do ZUS w ciągu 7 dni.",
      date: null,
      anchor: "LAST_FACT",
      legalBasis: "P s. 26 (Q-28)",
      owner: "PŁATNIK/ZUS",
    },
    {
      id: "zus-payment",
      topic: "PAYMENT",
      title: "Wypłata zasiłku przez ZUS",
      rule: "Nie później niż w ciągu 30 dni od dnia wyjaśnienia ostatniej okoliczności potrzebnej do ustalenia prawa.",
      date: null,
      anchor: "LAST_FACT",
      legalBasis: "U art. 64 (Q-28)",
      owner: "PŁATNIK/ZUS",
    },
    {
      id: "limitation",
      topic: "PAYMENT",
      title: "Przedawnienie roszczenia o zasiłek",
      rule: "6 miesięcy od ostatniego dnia okresu, za który zasiłek przysługuje (bieg wstrzymuje przeszkoda niezależna od wnioskodawcy).",
      date: null,
      anchor: "PERIOD_END",
      legalBasis: "U art. 67; P s. 36",
      owner: "OBOJE",
    }
  )

  const topics = options.topics?.length ? new Set(options.topics) : null
  const deadlines = all
    .filter((deadline) => !topics || topics.has(deadline.topic))
    .sort((a, b) => {
      if (a.date && b.date) return a.date.localeCompare(b.date)
      if (a.date) return -1
      if (b.date) return 1
      return 0
    })

  const missingFacts: MissingFact[] = []
  if (!anchorDate) {
    missingFacts.push(
      facts.familyEvent === "PREGNANCY" || !facts.familyEvent
        ? FACT_QUESTIONS.expectedDueDate
        : FACT_QUESTIONS.eventDate
    )
  }

  return {
    anchorDate,
    anchorKind,
    deadlines,
    missingFacts,
    caveats: estimated
      ? ["Daty liczone od przewidywanego terminu porodu przesuną się, jeśli poród nastąpi w innym dniu."]
      : [],
  }
}
