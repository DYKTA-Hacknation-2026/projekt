import type { EmployerSourceData } from "@zpr/contracts/data-import"

import type { DataImportScenario } from "../types"
import { contributionBasis } from "./shared"

const payer = {
  id: "payer-kasia-001",
  name: "Agencja Marketingu Demo Sp. z o.o.",
  type: "MANDATE_PRINCIPAL" as const,
  taxId: "6772819640",
  city: "Kraków",
  isCurrent: false,
}

const insurancePeriodId = "ins-kasia-001"

const contributionBases = [
  contributionBasis({
    id: "cb-kasia-2025-10",
    insurancePeriodId,
    period: "2025-10",
    basisGrosze: 350_000,
  }),
  contributionBasis({
    id: "cb-kasia-2025-11",
    insurancePeriodId,
    period: "2025-11",
    basisGrosze: 350_000,
  }),
  contributionBasis({
    id: "cb-kasia-2025-12",
    insurancePeriodId,
    period: "2025-12",
    basisGrosze: 350_000,
  }),
  contributionBasis({
    id: "cb-kasia-2026-01",
    insurancePeriodId,
    period: "2026-01",
    basisGrosze: 350_000,
  }),
  contributionBasis({
    id: "cb-kasia-2026-02",
    insurancePeriodId,
    period: "2026-02",
    basisGrosze: 350_000,
  }),
  contributionBasis({
    id: "cb-kasia-2026-03",
    insurancePeriodId,
    period: "2026-03",
    basisGrosze: 350_000,
  }),
  contributionBasis({
    id: "cb-kasia-2026-04",
    insurancePeriodId,
    period: "2026-04",
    basisGrosze: 350_000,
  }),
  contributionBasis({
    id: "cb-kasia-2026-05",
    insurancePeriodId,
    period: "2026-05",
    basisGrosze: 350_000,
  }),
  contributionBasis({
    id: "cb-kasia-2026-06",
    insurancePeriodId,
    period: "2026-06",
    basisGrosze: 350_000,
  }),
  contributionBasis({
    id: "cb-kasia-2026-07",
    insurancePeriodId,
    period: "2026-07",
    basisGrosze: 350_000,
  }),
  contributionBasis({
    id: "cb-kasia-2026-08",
    insurancePeriodId,
    period: "2026-08",
    basisGrosze: 350_000,
  }),
  contributionBasis({
    id: "cb-kasia-2026-09",
    insurancePeriodId,
    period: "2026-09",
    basisGrosze: 350_000,
  }),
]

const employer: EmployerSourceData = {
  source: "EMPLOYER",
  payers: [payer],
  employments: [
    {
      id: "emp-kasia-001",
      payerId: payer.id,
      payerName: payer.name,
      contractType: "MANDATE",
      title: "Kopiarka treści (umowa zlecenia)",
      startDate: "2025-03-01",
      endDate: "2026-09-30",
      workingTimeFraction: 0.5,
      grossMonthlyAmountGrosze: 350_000,
      components: [
        {
          id: "comp-kasia-base",
          name: "Stawka godzinowa — rozliczenie miesięczne",
          kind: "BASE",
          amountGrosze: 350_000,
          validFrom: "2025-03-01",
          validTo: "2026-09-30",
        },
      ],
      changes: [
        {
          effectiveFrom: "2026-01-01",
          previousGrosze: 320_000,
          newGrosze: 350_000,
          reason: "Podwyżka stawek",
        },
      ],
      absences: [],
    },
  ],
}

export const kasiaIncompleteScenario: DataImportScenario = {
  id: "kasia-incomplete",
  label: "Niepełna historia — Kasia Nowak",
  description:
    "Umowa zlecenia zakończona przed porodem, przerwa w ubezpieczeniu, brak danych USC i niedostępne e-ZLA. Wymaga ręcznego uzupełnienia.",
  personaIds: ["kasia-nowak"],
  parentRole: "MOTHER",
  family: {
    eventType: "PREGNANCY",
    expectedDueDate: "2027-01-20",
  },
  sources: {
    ZUS: {
      source: "ZUS",
      insurancePeriods: [
        {
          id: insurancePeriodId,
          title: "MANDATE_CONTRACT",
          payerId: payer.id,
          payerName: payer.name,
          coverageMode: "VOLUNTARY",
          sicknessInsurance: "VOLUNTARY",
          startDate: "2025-03-01",
          endDate: "2026-09-30",
          isActive: false,
          notes:
            "Dobrowolne ubezpieczenie chorobowe ustało razem z umową zlecenia. Brak tytułu po 30 września 2026 r.",
        },
      ],
      contributionBases,
      arrears: {
        status: "NONE",
        amountGrosze: 0,
        asOf: "2026-11-20",
      },
      benefitBasis: null,
    },
    EMPLOYER: employer,
    EZLA: {
      source: "EZLA",
      sickLeaves: [],
    },
    USC: {
      source: "USC",
      children: [],
      familyEvents: [],
    },
    PUE: {
      source: "PUE",
      cases: [],
      documents: [],
    },
  },
  availability: {
    ZUS: "PARTIAL",
    EMPLOYER: "SUCCESS",
    EZLA: "ERROR",
    USC: "EMPTY",
    PUE: "EMPTY",
  },
  sourceIssues: {
    ZUS: [
      {
        code: "INSURANCE_ENDED",
        message:
          "Ostatni okres ubezpieczenia zakończył się 30 września 2026 r. i nie został wznowiony.",
        severity: "WARNING",
      },
      {
        code: "NO_CURRENT_PERIOD",
        message:
          "Brak aktywnego tytułu ubezpieczenia i podstawy wymiaru zasiłku na dzień dzisiejszy.",
        severity: "WARNING",
      },
    ],
    EZLA: [
      {
        code: "SOURCE_UNAVAILABLE",
        message:
          "Symulowane e-ZLA nie odpowiedziało. Historia zwolnień jest niedostępna — możesz podać ją ręcznie.",
        severity: "ERROR",
      },
    ],
    USC: [
      {
        code: "NO_BIRTH_RECORD",
        message:
          "USC nie ma wpisu o urodzeniu. Dane dziecka i zdarzenia rodzinnego trzeba uzupełnić ręcznie.",
        severity: "WARNING",
      },
    ],
    PUE: [
      {
        code: "NO_CASES",
        message: "Brak spraw i wniosków w symulowanym PUE/eZUS.",
        severity: "INFO",
      },
    ],
  },
  notes: [
    "Scenariusz celowo zawiera niedostępne i puste źródła.",
    "Przerwa w ubezpieczeniu przed porodem jest widoczna w module uprawnień.",
  ],
}
