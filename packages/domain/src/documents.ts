import { FACT_QUESTIONS, type CaseFacts, type MissingFact } from "./case-facts"
import type { BenefitCode } from "./eligibility"

/**
 * Required documents and routing ("gdzie złożyć"), per benefit and insurance
 * title. Sources: legal register A-04 (routing), A-14 (forms after
 * 2026-10-24), Q-25 (notice periods), Q-33 (Z-3b / ZAS-53 conflict), P s. 36.
 */

export type SubmissionChannel = "EMPLOYER" | "ZUS" | "EMPLOYER_OR_ZUS"

export interface RequiredDocument {
  code: string
  name: string
  /** Who fills in or issues the document. */
  preparedBy: "YOU" | "EMPLOYER" | "PAYER" | "DOCTOR" | "CIVIL_REGISTRY"
  submitTo: SubmissionChannel
  when: string
  legalBasis: string
  caveat?: string
}

export interface PaymentRouting {
  payer: "EMPLOYER" | "ZUS" | "UNKNOWN"
  explanation: string
  channels: string[]
  legalBasis: string
}

export interface DocumentChecklist {
  benefit: BenefitCode
  routing: PaymentRouting
  documents: RequiredDocument[]
  missingFacts: MissingFact[]
  caveats: string[]
}

const EZUS = "portal eZUS (PUE ZUS) — najwygodniej elektronicznie"
const ZUS_OFFICE = "dowolna placówka ZUS (osobiście lub pocztą)"

export function paymentRouting(facts: CaseFacts): PaymentRouting {
  if (facts.employmentType === "SELF_EMPLOYMENT") {
    return {
      payer: "ZUS",
      explanation:
        "Osobom prowadzącym działalność zasiłek zawsze wypłaca ZUS. Dokumenty składasz bezpośrednio do ZUS.",
      channels: [EZUS, ZUS_OFFICE],
      legalBasis: "U art. 61; P s. 23",
    }
  }
  if (facts.payerSize === "OVER_20") {
    return {
      payer: "EMPLOYER",
      explanation:
        "Płatnik, który zgłosił do ubezpieczenia chorobowego więcej niż 20 osób (stan na 30 listopada poprzedniego roku), sam wypłaca zasiłek. Dokumenty składasz u niego.",
      channels: ["dział kadr lub płac pracodawcy (zleceniodawcy)"],
      legalBasis: "U art. 61 ust. 1; P s. 23",
    }
  }
  if (facts.payerSize === "UP_TO_20") {
    return {
      payer: "ZUS",
      explanation:
        "Przy płatniku zgłaszającym do 20 osób zasiłek wypłaca ZUS. Wnioski składasz u pracodawcy, a on przekazuje dokumenty do ZUS w ciągu 7 dni.",
      channels: ["pracodawca (zleceniodawca), który przekazuje dokumenty do ZUS"],
      legalBasis: "U art. 61 ust. 1; P s. 23, 26",
    }
  }
  return {
    payer: "UNKNOWN",
    explanation:
      "Zasiłek wypłaca pracodawca, jeśli zgłasza do ubezpieczenia chorobowego więcej niż 20 osób; w przeciwnym razie ZUS. W obu przypadkach wnioski o urlop składasz u pracodawcy.",
    channels: ["pracodawca (zleceniodawca)", EZUS],
    legalBasis: "U art. 61 ust. 1; P s. 23",
  }
}

const BIRTH_CERTIFICATE: RequiredDocument = {
  code: "ODPIS-AU",
  name: "Skrócony odpis aktu urodzenia dziecka (albo wniosek, aby ZUS sam uzyskał odpis z USC)",
  preparedBy: "CIVIL_REGISTRY",
  submitTo: "EMPLOYER_OR_ZUS",
  when: "Po rejestracji urodzenia w urzędzie stanu cywilnego.",
  legalBasis: "P s. 36; R1316",
}

const Z3B_CAVEAT =
  "Poradnik ZUS (stan na 1.04.2026) wymienia druk Z-3b, który według treści zadania został zniesiony 24.10.2026. Sprawdź aktualny wzór na zus.pl (kwestia otwarta Q-33)."

function maternityDocuments(facts: CaseFacts): RequiredDocument[] {
  switch (facts.employmentType) {
    case "EMPLOYMENT":
      return [
        {
          code: "WNIOSEK-URLOP",
          name: "Wniosek o urlop macierzyński i rodzicielski (lub o część urlopu)",
          preparedBy: "YOU",
          submitTo: "EMPLOYER",
          when: "Urlop macierzyński zaczyna się z dniem porodu; wniosek o urlop rodzicielski najpóźniej 21 dni przed jego rozpoczęciem.",
          legalBasis: "KP art. 182¹d; R322",
        },
        { ...BIRTH_CERTIFICATE, submitTo: "EMPLOYER" },
        {
          code: "Z-3",
          name: "Zaświadczenie płatnika składek Z-3",
          preparedBy: "EMPLOYER",
          submitTo: "ZUS",
          when: "Wystawia pracodawca, gdy zasiłek wypłaca ZUS.",
          legalBasis: "R1316",
        },
      ]
    case "MANDATE":
      return [
        {
          code: "ZAM",
          name: "Wniosek o zasiłek macierzyński ZAM",
          preparedBy: "YOU",
          submitTo: "EMPLOYER_OR_ZUS",
          when: "Po porodzie; składasz u zleceniodawcy (płatnika).",
          legalBasis: "R1316; A-14",
        },
        BIRTH_CERTIFICATE,
        {
          code: "Z-3a",
          name: "Zaświadczenie płatnika składek Z-3a",
          preparedBy: "PAYER",
          submitTo: "ZUS",
          when: "Wystawia zleceniodawca, gdy zasiłek wypłaca ZUS.",
          legalBasis: "R1316",
        },
      ]
    case "SELF_EMPLOYMENT":
      return [
        {
          code: "ZAM",
          name: "Wniosek o zasiłek macierzyński ZAM",
          preparedBy: "YOU",
          submitTo: "ZUS",
          when: "Po porodzie, najlepiej przez eZUS.",
          legalBasis: "P s. 36; A-14",
        },
        { ...BIRTH_CERTIFICATE, submitTo: "ZUS" },
        {
          code: "Z-3b",
          name: "Zaświadczenie płatnika składek Z-3b (jeśli nadal wymagane)",
          preparedBy: "YOU",
          submitTo: "ZUS",
          when: "Razem z wnioskiem ZAM.",
          legalBasis: "P s. 36",
          caveat: Z3B_CAVEAT,
        },
      ]
    default:
      return [BIRTH_CERTIFICATE]
  }
}

function paternityDocuments(facts: CaseFacts): RequiredDocument[] {
  if (facts.employmentType === "EMPLOYMENT") {
    return [
      {
        code: "WNIOSEK-OJCOWSKI",
        name: "Wniosek o urlop ojcowski",
        preparedBy: "YOU",
        submitTo: "EMPLOYER",
        when: "Co najmniej 7 dni przed rozpoczęciem urlopu.",
        legalBasis: "KP art. 182³ § 2",
      },
      { ...BIRTH_CERTIFICATE, submitTo: "EMPLOYER" },
    ]
  }
  return [
    {
      code: "ZAM",
      name: "Wniosek o zasiłek macierzyński za okres urlopu ojcowskiego (ZAM, dawniej ZAO)",
      preparedBy: "YOU",
      submitTo: facts.employmentType === "SELF_EMPLOYMENT" ? "ZUS" : "EMPLOYER_OR_ZUS",
      when: "Przed rozpoczęciem okresu, za który ma być wypłacany zasiłek.",
      legalBasis: "R1316 § 33 ust. 1 pkt 3; A-14",
    },
    BIRTH_CERTIFICATE,
  ]
}

function parentalDocuments(facts: CaseFacts): RequiredDocument[] {
  const documents: RequiredDocument[] = [
    {
      code: facts.employmentType === "EMPLOYMENT" ? "WNIOSEK-RODZICIELSKI" : "ZAM",
      name:
        facts.employmentType === "EMPLOYMENT"
          ? "Wniosek o urlop rodzicielski (lub jego część)"
          : "Wniosek o zasiłek macierzyński za okres urlopu rodzicielskiego (ZAM, dawniej ZUR)",
      preparedBy: "YOU",
      submitTo:
        facts.employmentType === "EMPLOYMENT"
          ? "EMPLOYER"
          : facts.employmentType === "SELF_EMPLOYMENT"
            ? "ZUS"
            : "EMPLOYER_OR_ZUS",
      when: "Najpóźniej 21 dni przed rozpoczęciem urlopu rodzicielskiego.",
      legalBasis: "KP art. 182¹d; A-14",
    },
    {
      code: "WNIOSEK-81,5",
      name: "Pisemny wniosek o zasiłek w wysokości 81,5% za cały okres (opcjonalnie)",
      preparedBy: "YOU",
      submitTo:
        facts.employmentType === "SELF_EMPLOYMENT" ? "ZUS" : "EMPLOYER_OR_ZUS",
      when: "W ciągu 21 dni od porodu (lub przyjęcia dziecka).",
      legalBasis: "U art. 30a; U art. 31 ust. 3–4",
      caveat:
        "Poradnik dopuszcza także „deklarację”; ustawa mówi o pisemnym wniosku (kwestia otwarta Q-34).",
    },
  ]
  return documents
}

function sicknessDocuments(facts: CaseFacts): RequiredDocument[] {
  const documents: RequiredDocument[] = [
    {
      code: "e-ZLA",
      name: "Elektroniczne zwolnienie lekarskie e-ZLA (kod B — choroba w okresie ciąży)",
      preparedBy: "DOCTOR",
      submitTo: "EMPLOYER_OR_ZUS",
      when: "Lekarz przesyła je elektronicznie do ZUS i płatnika — nie trzeba go dostarczać.",
      legalBasis: "Informacja ZUS o e-ZLA",
    },
  ]
  if (facts.employmentType === "MANDATE") {
    documents.push({
      code: "Z-3a",
      name: "Zaświadczenie płatnika składek Z-3a",
      preparedBy: "PAYER",
      submitTo: "ZUS",
      when: "Wystawia zleceniodawca, gdy zasiłek wypłaca ZUS.",
      legalBasis: "R1316",
    })
  }
  if (facts.employmentType === "SELF_EMPLOYMENT") {
    documents.push({
      code: "ZAS-53",
      name: "Wniosek o zasiłek chorobowy ZAS-53",
      preparedBy: "YOU",
      submitTo: "ZUS",
      when: "Po otrzymaniu zwolnienia lekarskiego.",
      legalBasis: "A-14",
      caveat:
        "Poradnik ZUS wskazuje Z-3b, treść zadania — ZAS-53 (kwestia otwarta Q-33). Sprawdź aktualny wzór na zus.pl.",
    })
  }
  return documents
}

export function requiredDocuments(
  benefit: BenefitCode,
  facts: CaseFacts
): DocumentChecklist {
  const missingFacts: MissingFact[] = []
  if (!facts.employmentType) missingFacts.push(FACT_QUESTIONS.employmentType)
  if (
    (facts.employmentType === "EMPLOYMENT" || facts.employmentType === "MANDATE") &&
    !facts.payerSize
  ) {
    missingFacts.push(FACT_QUESTIONS.payerSize)
  }

  const documents =
    benefit === "MATERNITY_ALLOWANCE"
      ? maternityDocuments(facts)
      : benefit === "PATERNITY_BENEFIT"
        ? paternityDocuments(facts)
        : benefit === "PARENTAL_LEAVE_BENEFIT"
          ? parentalDocuments(facts)
          : sicknessDocuments(facts)

  return {
    benefit,
    routing: paymentRouting(facts),
    documents,
    missingFacts,
    caveats: [
      "Wzory formularzy publikuje ZUS na www.zus.pl („Wzory formularzy” → „Zasiłki”). Przed złożeniem sprawdź aktualną wersję druku.",
    ],
  }
}
