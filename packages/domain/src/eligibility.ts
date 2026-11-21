import {
  FACT_QUESTIONS,
  effectiveSicknessInsurance,
  type CaseFacts,
  type MissingFact,
} from "./case-facts"
import { daysBetween, isIsoDate } from "./dates"
import { formatRatePercent } from "./money"
import type { RuleSet } from "./rule-set"

/**
 * Preliminary eligibility guidance.
 *
 * Every rule below is taken from the legal register (docs/legal-assumptions.md)
 * and names its source. The outcome is deliberately four-valued: when a fact
 * is missing the service asks for it (`NEEDS_INPUT`); when the law depends on
 * something the service cannot check it says so (`INDETERMINATE`). It is
 * guidance, never a ZUS decision.
 */

export type BenefitCode =
  | "MATERNITY_ALLOWANCE"
  | "PARENTAL_LEAVE_BENEFIT"
  | "PATERNITY_BENEFIT"
  | "SICKNESS_IN_PREGNANCY"

export const BENEFIT_CODES: readonly BenefitCode[] = [
  "MATERNITY_ALLOWANCE",
  "PARENTAL_LEAVE_BENEFIT",
  "PATERNITY_BENEFIT",
  "SICKNESS_IN_PREGNANCY",
]

export const BENEFIT_LABELS: Record<BenefitCode, string> = {
  MATERNITY_ALLOWANCE: "Zasiłek macierzyński (urlop macierzyński)",
  PARENTAL_LEAVE_BENEFIT: "Zasiłek macierzyński za urlop rodzicielski",
  PATERNITY_BENEFIT: "Zasiłek macierzyński za urlop ojcowski",
  SICKNESS_IN_PREGNANCY: "Zasiłek chorobowy w ciąży (L4)",
}

export type DeterminationStatus =
  "ELIGIBLE" | "NOT_ELIGIBLE" | "INDETERMINATE" | "NEEDS_INPUT"

export interface DeterminationReason {
  ruleId: string
  text: string
  legalBasis: string
}

export interface Determination {
  benefit: BenefitCode
  label: string
  status: DeterminationStatus
  reasons: DeterminationReason[]
  missingFacts: MissingFact[]
  caveats: string[]
  legalBasis: string[]
}

export interface EligibilityAssessment {
  kind: "PRELIMINARY_GUIDANCE"
  asOf: string
  determinations: Determination[]
  /** The single most useful question to ask next, if any. */
  nextQuestion: MissingFact | null
  disclaimer: string
}

export const ELIGIBILITY_DISCLAIMER =
  "Wstępna ocena na podstawie podanych informacji i reguł z wersjonowanego rejestru przepisów. To nie jest decyzja ZUS ani płatnika składek."

function determination(
  benefit: BenefitCode,
  status: DeterminationStatus,
  parts: Partial<Omit<Determination, "benefit" | "label" | "status">> = {}
): Determination {
  const reasons = parts.reasons ?? []
  return {
    benefit,
    label: BENEFIT_LABELS[benefit],
    status,
    reasons,
    missingFacts: parts.missingFacts ?? [],
    caveats: parts.caveats ?? [],
    legalBasis:
      parts.legalBasis ??
      Array.from(new Set(reasons.map((reason) => reason.legalBasis))),
  }
}

/** Shared condition of all maternity-type benefits: sickness insurance. */
function insuranceGate(
  benefit: BenefitCode,
  facts: CaseFacts,
  asOf: string
): Determination | null {
  if (facts.professionalFosterFamily) {
    return determination(benefit, "NOT_ELIGIBLE", {
      reasons: [
        {
          ruleId: "A-16",
          text: "Zawodowa rodzina zastępcza nie ma prawa do urlopów i zasiłku macierzyńskiego z tytułu przyjęcia dziecka.",
          legalBasis: "KP art. 183 § 1; U art. 29 ust. 1 pkt 3",
        },
      ],
    })
  }

  if (!facts.employmentType) {
    return determination(benefit, "NEEDS_INPUT", {
      missingFacts: [FACT_QUESTIONS.employmentType],
      reasons: [
        {
          ruleId: "LR-MAT-01",
          text: "Zasiłek przysługuje osobie objętej ubezpieczeniem chorobowym w dniu powstania prawa (urodzenia lub przyjęcia dziecka).",
          legalBasis: "U art. 29 ust. 1; P s. 30",
        },
      ],
    })
  }

  const insurance = effectiveSicknessInsurance(facts)

  const referenceDate = facts.eventDate ?? facts.expectedDueDate ?? asOf
  if (facts.insuranceEndDate && facts.insuranceEndDate < referenceDate) {
    return determination(benefit, "NOT_ELIGIBLE", {
      reasons: [
        {
          ruleId: "LR-100",
          text: `Ubezpieczenie chorobowe ustało ${facts.insuranceEndDate}, a zdarzenie uprawniające przypada na ${referenceDate}. Bez aktywnego tytułu ubezpieczenia zasiłek nie przysługuje.`,
          legalBasis: "U art. 4 ust. 1; U art. 13",
        },
      ],
      caveats: [
        "Niektóre sytuacje (np. rozwiązanie umowy z naruszeniem przepisów) mogą zachować prawo do zasiłku — potwierdź w ZUS.",
      ],
    })
  }

  if (facts.employmentType === "OTHER") {
    return determination(benefit, "INDETERMINATE", {
      reasons: [
        {
          ruleId: "LR-MAT-01",
          text: "Dla tego tytułu ubezpieczenia nie mam zweryfikowanej reguły. Prawo zależy od tego, czy w dniu porodu podlegasz ubezpieczeniu chorobowemu.",
          legalBasis: "U art. 29 ust. 1",
        },
      ],
      caveats: [
        "Potwierdź swój tytuł ubezpieczenia w ZUS lub u płatnika składek.",
      ],
    })
  }

  if (insurance === "NONE") {
    return determination(benefit, "NOT_ELIGIBLE", {
      reasons: [
        {
          ruleId: "LR-MAT-01",
          text: "Bez ubezpieczenia chorobowego w dniu powstania prawa zasiłek macierzyński z ZUS nie przysługuje.",
          legalBasis: "U art. 29 ust. 1; P s. 30",
        },
      ],
      caveats: [
        "Jeśli ubezpieczenie ustało, w niektórych sytuacjach prawo do zasiłku zachowuje się (np. rozwiązanie umowy z naruszeniem przepisów). Zapytaj w ZUS.",
      ],
    })
  }

  if (insurance === undefined) {
    return determination(benefit, "NEEDS_INPUT", {
      missingFacts: [FACT_QUESTIONS.sicknessInsurance],
      reasons: [
        {
          ruleId: "LR-MAT-02",
          text: "Przy umowie zlecenia i własnej działalności ubezpieczenie chorobowe jest dobrowolne. Bez niego zasiłek nie przysługuje.",
          legalBasis: "U art. 29 ust. 1; P s. 30",
        },
      ],
    })
  }

  return null
}

function arrearsCheck(
  facts: CaseFacts,
  ruleSet: RuleSet
): {
  status: DeterminationStatus | null
  reason?: DeterminationReason
  missing?: MissingFact
  caveat?: string
} {
  if (facts.employmentType !== "SELF_EMPLOYMENT") return { status: null }
  if (facts.contributionArrears === true) {
    return {
      status: "INDETERMINATE",
      reason: {
        ruleId: "A-09",
        text: `Zadłużenie w składkach powyżej ${formatRatePercent(ruleSet.debt.thresholdShareOfMinWage)} minimalnego wynagrodzenia w dniu powstania prawa wstrzymuje wypłatę do czasu spłaty. Brak spłaty w ciągu ${ruleSet.debt.expiryMonths} miesięcy powoduje wygaśnięcie prawa.`,
        legalBasis: "U art. 2a ust. 1–2",
      },
    }
  }
  if (facts.contributionArrears === undefined) {
    return {
      status: null,
      missing: FACT_QUESTIONS.contributionArrears,
      caveat: `Przedsiębiorca z zaległościami w składkach (powyżej ${formatRatePercent(ruleSet.debt.thresholdShareOfMinWage)} minimalnego wynagrodzenia) nie otrzyma wypłaty do czasu ich spłaty (U art. 2a).`,
    }
  }
  return { status: null }
}

function assessMaternity(
  facts: CaseFacts,
  asOf: string,
  ruleSet: RuleSet
): Determination {
  const benefit: BenefitCode = "MATERNITY_ALLOWANCE"
  const gate = insuranceGate(benefit, facts, asOf)
  if (gate) return gate

  const reasons: DeterminationReason[] = [
    {
      ruleId: "LR-MAT-01",
      text:
        facts.employmentType === "EMPLOYMENT"
          ? "Pracownik podlega obowiązkowo ubezpieczeniu chorobowemu, więc spełnia podstawowy warunek zasiłku macierzyńskiego."
          : "Opłacasz dobrowolne ubezpieczenie chorobowe, więc spełniasz podstawowy warunek zasiłku macierzyńskiego.",
      legalBasis: "U art. 29 ust. 1; P s. 30",
    },
  ]
  const caveats = [
    "Warunek musi być spełniony w dniu porodu lub przyjęcia dziecka na wychowanie.",
  ]
  const missingFacts: MissingFact[] = []

  if (facts.parentRole === "FATHER") {
    reasons.push({
      ruleId: "Q-11",
      text: `Tata może przejąć część urlopu i zasiłku macierzyńskiego tylko w ustawowych sytuacjach, np. gdy mama po ${ruleSet.maternity.motherPersonalWeeks} tygodniach zrezygnuje z pozostałej części albo w razie jej hospitalizacji lub śmierci.`,
      legalBasis: "KP art. 180 § 4–17; U art. 29 ust. 3–10",
    })
    return determination(benefit, "INDETERMINATE", {
      reasons,
      caveats: [
        `Pierwsze ${ruleSet.maternity.motherPersonalWeeks} tygodni po porodzie przysługuje wyłącznie mamie (P s. 31).`,
      ],
    })
  }

  const arrears = arrearsCheck(facts, ruleSet)
  if (arrears.reason) reasons.push(arrears.reason)
  if (arrears.missing) missingFacts.push(arrears.missing)
  if (arrears.caveat) caveats.push(arrears.caveat)

  if (facts.employmentType === "SELF_EMPLOYMENT") {
    reasons.push({
      ruleId: "A-04",
      text: "Osobom prowadzącym działalność zasiłek zawsze wypłaca ZUS.",
      legalBasis: "U art. 61; P s. 23, 30",
    })
  }

  return determination(benefit, arrears.status ?? "ELIGIBLE", {
    reasons,
    caveats,
    missingFacts,
  })
}

function assessParental(
  facts: CaseFacts,
  asOf: string,
  ruleSet: RuleSet
): Determination {
  const benefit: BenefitCode = "PARENTAL_LEAVE_BENEFIT"
  const gate = insuranceGate(benefit, facts, asOf)
  if (gate) return gate

  const reasons: DeterminationReason[] = [
    {
      ruleId: "LR-127",
      text: `Urlop rodzicielski to wspólna pula ${ruleSet.parental.poolWeeks.single} tygodni (${ruleSet.parental.poolWeeks.multiple} przy więcej niż jednym dziecku). Każdy z rodziców ma wyłączne prawo do ${ruleSet.parental.nonTransferableWeeks} tygodni, których nie można przenieść.`,
      legalBasis: "KP art. 182¹a § 1, § 4; U art. 31 ust. 3f",
    },
  ]
  const arrears = arrearsCheck(facts, ruleSet)
  if (arrears.reason) reasons.push(arrears.reason)

  return determination(benefit, arrears.status ?? "ELIGIBLE", {
    reasons,
    missingFacts: arrears.missing ? [arrears.missing] : [],
    caveats: [
      ...(arrears.caveat ? [arrears.caveat] : []),
      `Prawo do ${ruleSet.parental.nonTransferableWeeks} tygodni dotyczy rodzica objętego ubezpieczeniem chorobowym (U art. 30a, art. 31 ust. 3f).`,
    ],
  })
}

function assessPaternity(
  facts: CaseFacts,
  asOf: string,
  ruleSet: RuleSet
): Determination {
  const benefit: BenefitCode = "PATERNITY_BENEFIT"
  if (facts.parentRole === "MOTHER") {
    return determination(benefit, "NOT_ELIGIBLE", {
      reasons: [
        {
          ruleId: "LR-133",
          text: "Urlop ojcowski przysługuje ojcu dziecka.",
          legalBasis: "KP art. 182³ § 1",
        },
      ],
    })
  }
  const gate = insuranceGate(benefit, facts, asOf)
  if (gate) return gate

  const reasons: DeterminationReason[] = [
    {
      ruleId: "LR-133",
      text: `Ojciec ma prawo do ${ruleSet.paternity.days} dni urlopu ojcowskiego, do ukończenia przez dziecko ${ruleSet.paternity.deadlineMonths} miesięcy, jednorazowo albo w ${ruleSet.paternity.maxParts} częściach po co najmniej ${ruleSet.paternity.minPartDays} dni.`,
      legalBasis: "KP art. 182³ § 1, § 1¹",
    },
  ]
  if (facts.employmentType !== "EMPLOYMENT") {
    reasons.push({
      ruleId: "A-07",
      text: "Ubezpieczony ojciec, który nie jest pracownikiem, także otrzymuje zasiłek za okres odpowiadający urlopowi ojcowskiemu; wniosek składa przed jego rozpoczęciem.",
      legalBasis: "R1316 § 33 ust. 1 pkt 3; U art. 29a ust. 1",
    })
  }

  const missingFacts: MissingFact[] = []
  if (!facts.parentRole) missingFacts.push(FACT_QUESTIONS.parentRole)

  return determination(benefit, "ELIGIBLE", { reasons, missingFacts })
}

function assessSickness(
  facts: CaseFacts,
  asOf: string,
  ruleSet: RuleSet
): Determination {
  const benefit: BenefitCode = "SICKNESS_IN_PREGNANCY"
  if (!facts.employmentType) {
    return determination(benefit, "NEEDS_INPUT", {
      missingFacts: [FACT_QUESTIONS.employmentType],
    })
  }
  const insurance = effectiveSicknessInsurance(facts)
  if (insurance === "NONE") {
    return determination(benefit, "NOT_ELIGIBLE", {
      reasons: [
        {
          ruleId: "LR-100",
          text: "Zasiłek chorobowy przysługuje osobie objętej ubezpieczeniem chorobowym.",
          legalBasis: "U art. 4 ust. 1",
        },
      ],
    })
  }
  if (facts.insuranceEndDate && facts.insuranceEndDate < asOf) {
    return determination(benefit, "NOT_ELIGIBLE", {
      reasons: [
        {
          ruleId: "LR-100",
          text: `Ubezpieczenie chorobowe ustało ${facts.insuranceEndDate}. Na dzień ${asOf} nie ma aktywnego tytułu ubezpieczenia.`,
          legalBasis: "U art. 4 ust. 1; U art. 13",
        },
      ],
    })
  }
  if (insurance === undefined) {
    return determination(benefit, "NEEDS_INPUT", {
      missingFacts: [FACT_QUESTIONS.sicknessInsurance],
      reasons: [
        {
          ruleId: "LR-100",
          text: `Przy umowie zlecenia i własnej działalności zasiłek chorobowy przysługuje tylko z dobrowolnym ubezpieczeniem chorobowym, po ${ruleSet.coverage.voluntaryDays} dniach jego opłacania.`,
          legalBasis: "U art. 4 ust. 1",
        },
      ],
    })
  }
  if (facts.employmentType === "OTHER") {
    return determination(benefit, "INDETERMINATE", {
      caveats: ["Dla tego tytułu ubezpieczenia nie mam zweryfikowanej reguły."],
    })
  }

  const waitingDays =
    insurance === "COMPULSORY"
      ? ruleSet.coverage.compulsoryDays
      : ruleSet.coverage.voluntaryDays
  const reasons: DeterminationReason[] = [
    {
      ruleId: "LR-100",
      text: `Okres wyczekiwania: ${waitingDays} dni nieprzerwanego ubezpieczenia ${insurance === "COMPULSORY" ? "obowiązkowego" : "dobrowolnego"}.`,
      legalBasis: "U art. 4 ust. 1",
    },
  ]
  const caveats = [
    `Okres zasiłkowy w ciąży wynosi do ${ruleSet.sickness.maxPeriodDays} dni (U art. 7–9; P s. 24).`,
    `Wcześniejsze okresy ubezpieczenia wliczają się, jeśli przerwa nie przekroczyła ${ruleSet.coverage.gapToleranceDays} dni; niektóre osoby (np. absolwenci zgłoszeni w ciągu ${ruleSet.coverage.dayOneGraduateDays} dni) mają prawo od pierwszego dnia (U art. 4 ust. 2–3).`,
  ]
  if (facts.pregnancySickLeave) {
    reasons.push({
      ruleId: "A-15",
      text: "Historia e-ZLA zawiera zwolnienie związane z ciążą — świadczenie za ten okres wynosi 100% podstawy.",
      legalBasis: "KP art. 92 § 1 pkt 2; U art. 11 ust. 1",
    })
    caveats.push(
      "Dane z e-ZLA zawierają tylko daty i informację o związku z ciążą, bez diagnozy."
    )
  }
  if (facts.sickLeaveDays !== undefined && facts.sickLeaveDays > 0) {
    caveats.push(
      `Historia zwolnień obejmuje ${facts.sickLeaveDays} dni. Limit 270 dni dotyczy jednego okresu zasiłkowego.`
    )
  }
  if (facts.employmentType === "EMPLOYMENT") {
    reasons.push({
      ruleId: "A-15",
      text: `Przez pierwsze ${ruleSet.coverage.employerPaidDays} dni niezdolności w roku (${ruleSet.coverage.employerPaidDaysAfter50} dni po 50. roku życia) pracodawca wypłaca wynagrodzenie chorobowe; w ciąży wynosi ono 100%.`,
      legalBasis: "KP art. 92 § 1 pkt 2",
    })
  } else {
    reasons.push({
      ruleId: "A-15",
      text: "Przy ubezpieczeniu dobrowolnym nie ma wynagrodzenia chorobowego — od początku wypłacany jest zasiłek chorobowy.",
      legalBasis: "P s. 23",
    })
  }

  const arrears = arrearsCheck(facts, ruleSet)
  if (arrears.reason) reasons.push(arrears.reason)
  if (arrears.caveat) caveats.push(arrears.caveat)

  if (!facts.insuranceStartDate || !isIsoDate(facts.insuranceStartDate)) {
    return determination(benefit, "NEEDS_INPUT", {
      reasons,
      caveats,
      missingFacts: [FACT_QUESTIONS.insuranceStartDate],
    })
  }

  const insuredDays = daysBetween(facts.insuranceStartDate, asOf)
  if (insuredDays < waitingDays) {
    reasons.push({
      ruleId: "LR-100",
      text: `Na dzień ${asOf} ubezpieczenie trwa ${Math.max(insuredDays, 0)} dni — okres wyczekiwania jeszcze nie minął.`,
      legalBasis: "U art. 4 ust. 1",
    })
    return determination(benefit, "NOT_ELIGIBLE", { reasons, caveats })
  }

  reasons.push({
    ruleId: "LR-100",
    text: `Na dzień ${asOf} ubezpieczenie trwa ${insuredDays} dni — okres wyczekiwania minął.`,
    legalBasis: "U art. 4 ust. 1",
  })
  return determination(benefit, arrears.status ?? "ELIGIBLE", {
    reasons,
    caveats,
    missingFacts: arrears.missing ? [arrears.missing] : [],
  })
}

export function assessEligibility(
  facts: CaseFacts,
  options: {
    asOf: string
    ruleSet: RuleSet
    benefits?: readonly BenefitCode[]
  }
): EligibilityAssessment {
  if (!isIsoDate(options.asOf)) {
    throw new RangeError("asOf musi być datą RRRR-MM-DD")
  }
  const benefits = options.benefits?.length ? options.benefits : BENEFIT_CODES
  const determinations = benefits.map((benefit) => {
    switch (benefit) {
      case "MATERNITY_ALLOWANCE":
        return assessMaternity(facts, options.asOf, options.ruleSet)
      case "PARENTAL_LEAVE_BENEFIT":
        return assessParental(facts, options.asOf, options.ruleSet)
      case "PATERNITY_BENEFIT":
        return assessPaternity(facts, options.asOf, options.ruleSet)
      case "SICKNESS_IN_PREGNANCY":
        return assessSickness(facts, options.asOf, options.ruleSet)
    }
  })

  const nextQuestion =
    determinations.find((item) => item.status === "NEEDS_INPUT")
      ?.missingFacts[0] ??
    determinations.flatMap((item) => item.missingFacts)[0] ??
    null

  return {
    kind: "PRELIMINARY_GUIDANCE",
    asOf: options.asOf,
    determinations,
    nextQuestion,
    disclaimer: ELIGIBILITY_DISCLAIMER,
  }
}
