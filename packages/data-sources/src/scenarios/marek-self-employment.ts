import type { EmployerSourceData } from "@zpr/contracts/data-import"

import type { DataImportScenario } from "../types"
import { averageBenefitBasis, contributionBasis } from "./shared"

const payer = {
  id: "payer-marek-001",
  name: "Marek Wiśniewski — Studio Kowal (działalność gospodarcza)",
  type: "SELF_EMPLOYED" as const,
  taxId: "8992817463",
  city: "Wrocław",
  isCurrent: true,
}

const insurancePeriodId = "ins-marek-001"

const contributionBases = [
  contributionBasis({
    id: "cb-marek-2025-08",
    insurancePeriodId,
    period: "2025-08",
    basisGrosze: 600_000,
  }),
  contributionBasis({
    id: "cb-marek-2025-09",
    insurancePeriodId,
    period: "2025-09",
    basisGrosze: 600_000,
  }),
  contributionBasis({
    id: "cb-marek-2025-10",
    insurancePeriodId,
    period: "2025-10",
    basisGrosze: 600_000,
  }),
  contributionBasis({
    id: "cb-marek-2025-11",
    insurancePeriodId,
    period: "2025-11",
    basisGrosze: 600_000,
  }),
  contributionBasis({
    id: "cb-marek-2025-12",
    insurancePeriodId,
    period: "2025-12",
    basisGrosze: 600_000,
  }),
  contributionBasis({
    id: "cb-marek-2026-01",
    insurancePeriodId,
    period: "2026-01",
    basisGrosze: 600_000,
  }),
  contributionBasis({
    id: "cb-marek-2026-02",
    insurancePeriodId,
    period: "2026-02",
    basisGrosze: 600_000,
  }),
  contributionBasis({
    id: "cb-marek-2026-03",
    insurancePeriodId,
    period: "2026-03",
    basisGrosze: 600_000,
  }),
  contributionBasis({
    id: "cb-marek-2026-04",
    insurancePeriodId,
    period: "2026-04",
    basisGrosze: 600_000,
  }),
  contributionBasis({
    id: "cb-marek-2026-05",
    insurancePeriodId,
    period: "2026-05",
    basisGrosze: 600_000,
  }),
  contributionBasis({
    id: "cb-marek-2026-06",
    insurancePeriodId,
    period: "2026-06",
    basisGrosze: 600_000,
    paid: false,
    paidAt: null,
  }),
  contributionBasis({
    id: "cb-marek-2026-07",
    insurancePeriodId,
    period: "2026-07",
    basisGrosze: 600_000,
    paid: false,
    paidAt: null,
  }),
]

const employer: EmployerSourceData = {
  source: "EMPLOYER",
  payers: [payer],
  employments: [],
}

export const marekSelfEmploymentScenario: DataImportScenario = {
  id: "marek-self-employment",
  label: "Działalność gospodarcza — Marek Wiśniewski",
  description:
    "Własna działalność, dobrowolne ubezpieczenie chorobowe, otwarte zaległości w składkach, urodzone dziecko i wniosek w PUE.",
  personaIds: ["marek-wisniewski"],
  parentRole: "FATHER",
  family: {
    eventType: "BIRTH",
    eventDate: "2026-08-12",
    expectedDueDate: "2026-08-12",
    childrenCount: 1,
    hasZaZyciem: false,
    isPremature: false,
  },
  sources: {
    ZUS: {
      source: "ZUS",
      insurancePeriods: [
        {
          id: insurancePeriodId,
          title: "SELF_EMPLOYMENT",
          payerId: payer.id,
          payerName: payer.name,
          coverageMode: "VOLUNTARY",
          sicknessInsurance: "VOLUNTARY",
          startDate: "2025-02-01",
          endDate: null,
          isActive: true,
          notes: "Dobrowolne ubezpieczenie chorobowe opłacane od 1 lutego 2025 r.",
        },
      ],
      contributionBases,
      arrears: {
        status: "OPEN",
        amountGrosze: 124_000,
        asOf: "2026-08-12",
        note: "Zaległość za czerwiec i lipiec 2026 r. Powyżej 1% minimalnego wynagrodzenia.",
      },
      benefitBasis: {
        insurancePeriodId,
        averageMonthlyBasisGrosze: averageBenefitBasis(contributionBases),
        basisFrom: "2025-08-01",
        basisTo: "2026-07-31",
        monthsCount: contributionBases.length,
        note: "Podstawa zadeklarowana przez przedsiębiorcę; średnia z 12 miesięcy.",
      },
    },
    EMPLOYER: employer,
    EZLA: {
      source: "EZLA",
      sickLeaves: [
        {
          id: "zla-marek-001",
          startDate: "2026-07-01",
          endDate: "2026-07-10",
          days: 10,
          kind: "SICKNESS",
          pregnancyRelated: false,
          certificateRef: "e-ZLA/DEMO/2026/0761",
          payerName: "ZUS (płatnik: Marek Wiśniewski)",
          status: "FINISHED",
        },
      ],
    },
    USC: {
      source: "USC",
      children: [
        {
          id: "child-marek-001",
          firstName: "Jaś",
          birthDate: "2026-08-12",
          childrenInBirth: 1,
          isAdopted: false,
          adoptionDate: null,
          birthPlace: "Wrocław",
        },
      ],
      familyEvents: [
        {
          id: "event-marek-001",
          type: "BIRTH",
          eventDate: "2026-08-12",
          expectedDueDate: "2026-08-12",
          childIds: ["child-marek-001"],
          isPremature: false,
          hasZaZyciem: false,
        },
      ],
    },
    PUE: {
      source: "PUE",
      cases: [
        {
          id: "pue-marek-001",
          caseNumber: "ZUS-DEMO-2026-002193",
          applicationType: "Zasiłek macierzyński za urlop ojcowski",
          benefitKind: "PATERNITY",
          status: "IN_PROGRESS",
          submittedAt: "2026-08-24",
          decisionNumber: null,
          decisionDate: null,
          periodFrom: null,
          periodTo: null,
          amountGrosze: null,
        },
        {
          id: "pue-marek-002",
          caseNumber: "ZUS-DEMO-2026-001904",
          applicationType: "Zasiłek chorobowy",
          benefitKind: "SICKNESS",
          status: "PAID",
          submittedAt: "2026-07-11",
          decisionNumber: "DEC/DEMO/2026/4471",
          decisionDate: "2026-07-17",
          periodFrom: "2026-07-01",
          periodTo: "2026-07-10",
          amountGrosze: 138_064,
        },
      ],
      documents: [
        {
          id: "doc-marek-001",
          title: "Potwierdzenie złożenia wniosku o zasiłek ojcowski",
          kind: "APPLICATION_CONFIRMATION",
          issuedAt: "2026-08-24",
          reference: "PUE/DEMO/2026/2193",
          available: true,
        },
        {
          id: "doc-marek-002",
          title: "Decyzja o zasiłku chorobowym",
          kind: "DECISION",
          issuedAt: "2026-07-17",
          reference: "DEC/DEMO/2026/4471",
          available: true,
        },
      ],
    },
  },
  availability: {
    ZUS: "SUCCESS",
    EMPLOYER: "PARTIAL",
    EZLA: "SUCCESS",
    USC: "SUCCESS",
    PUE: "SUCCESS",
  },
  sourceIssues: {
    EMPLOYER: [
      {
        code: "NO_EMPLOYMENT_CONTRACT",
        message:
          "Płatnik składek jest osobą prowadzącą działalność — brak umowy o pracę i historii wynagrodzenia pracowniczego.",
        severity: "INFO",
      },
    ],
    ZUS: [
      {
        code: "CONTRIBUTION_ARREARS_OPEN",
        message:
          "Wykryto otwartą zaległość składkową. Może ona wstrzymać wypłatę zasiłku do czasu spłaty.",
        severity: "WARNING",
      },
    ],
  },
  notes: [
    "Płatnik w module pracodawcy to ta sama osoba, której dotyczy tytuł ubezpieczenia w ZUS.",
    "Zaległości składkowe powodują wynik warunkowy w module uprawnień.",
    "Dane dziecka pochodzą z USC i są zgodne z datą zdarzenia w PUE.",
  ],
}
