import type { EmployerSourceData } from "@zpr/contracts/data-import"

import type { DataImportScenario } from "../types"
import { averageBenefitBasis, contributionBasis } from "./shared"

const payer = {
  id: "payer-anna-001",
  name: "Przykładowy Pracodawca S.A.",
  type: "EMPLOYER" as const,
  taxId: "5252445767",
  city: "Warszawa",
  isCurrent: true,
}

const insurancePeriodId = "ins-anna-001"

const contributionBases = [
  contributionBasis({
    id: "cb-anna-2025-11",
    insurancePeriodId,
    period: "2025-11",
    basisGrosze: 750_000,
  }),
  contributionBasis({
    id: "cb-anna-2025-12",
    insurancePeriodId,
    period: "2025-12",
    basisGrosze: 750_000,
  }),
  contributionBasis({
    id: "cb-anna-2026-01",
    insurancePeriodId,
    period: "2026-01",
    basisGrosze: 800_000,
  }),
  contributionBasis({
    id: "cb-anna-2026-02",
    insurancePeriodId,
    period: "2026-02",
    basisGrosze: 800_000,
  }),
  contributionBasis({
    id: "cb-anna-2026-03",
    insurancePeriodId,
    period: "2026-03",
    basisGrosze: 800_000,
  }),
  contributionBasis({
    id: "cb-anna-2026-04",
    insurancePeriodId,
    period: "2026-04",
    basisGrosze: 800_000,
  }),
  contributionBasis({
    id: "cb-anna-2026-05",
    insurancePeriodId,
    period: "2026-05",
    basisGrosze: 800_000,
  }),
  contributionBasis({
    id: "cb-anna-2026-06",
    insurancePeriodId,
    period: "2026-06",
    basisGrosze: 800_000,
  }),
  contributionBasis({
    id: "cb-anna-2026-07",
    insurancePeriodId,
    period: "2026-07",
    basisGrosze: 800_000,
  }),
  contributionBasis({
    id: "cb-anna-2026-08",
    insurancePeriodId,
    period: "2026-08",
    basisGrosze: 800_000,
  }),
  contributionBasis({
    id: "cb-anna-2026-09",
    insurancePeriodId,
    period: "2026-09",
    basisGrosze: 800_000,
  }),
  contributionBasis({
    id: "cb-anna-2026-10",
    insurancePeriodId,
    period: "2026-10",
    basisGrosze: 800_000,
  }),
]

const employer: EmployerSourceData = {
  source: "EMPLOYER",
  payers: [payer],
  employments: [
    {
      id: "emp-anna-001",
      payerId: payer.id,
      payerName: payer.name,
      contractType: "EMPLOYMENT",
      title: "Specjalistka ds. obsługi klienta",
      startDate: "2024-01-01",
      endDate: null,
      workingTimeFraction: 1,
      grossMonthlyAmountGrosze: 800_000,
      components: [
        {
          id: "comp-anna-base",
          name: "Wynagrodzenie zasadnicze",
          kind: "BASE",
          amountGrosze: 720_000,
          validFrom: "2024-01-01",
          validTo: null,
        },
        {
          id: "comp-anna-bonus",
          name: "Dodatek zadaniowy",
          kind: "BONUS",
          amountGrosze: 80_000,
          validFrom: "2024-01-01",
          validTo: null,
        },
      ],
      changes: [
        {
          effectiveFrom: "2025-01-01",
          previousGrosze: 700_000,
          newGrosze: 750_000,
          reason: "Podwyżka roczna",
        },
        {
          effectiveFrom: "2026-01-01",
          previousGrosze: 750_000,
          newGrosze: 800_000,
          reason: "Awans i podwyżka roczna",
        },
      ],
      absences: [],
    },
  ],
}

export const annaEmploymentScenario: DataImportScenario = {
  id: "anna-employment",
  label: "Umowa o pracę — Anna Kowalska",
  description:
    "Stabilna historia zatrudnienia i ubezpieczenia, ciąża, zwolnienie lekarskie związane z ciążą, brak wpisu USC o urodzeniu.",
  personaIds: ["anna-kowalska", "tomasz-kowalski"],
  parentRole: "MOTHER",
  family: {
    eventType: "PREGNANCY",
    expectedDueDate: "2027-03-10",
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
          title: "EMPLOYMENT_CONTRACT",
          payerId: payer.id,
          payerName: payer.name,
          coverageMode: "COMPULSORY",
          sicknessInsurance: "COMPULSORY",
          startDate: "2024-01-01",
          endDate: null,
          isActive: true,
          notes: "Nieprzerwane ubezpieczenie od pierwszego dnia zatrudnienia.",
        },
      ],
      contributionBases,
      arrears: {
        status: "NONE",
        amountGrosze: 0,
        asOf: "2026-11-20",
      },
      benefitBasis: {
        insurancePeriodId,
        averageMonthlyBasisGrosze: averageBenefitBasis(contributionBases),
        basisFrom: "2025-11-01",
        basisTo: "2026-10-31",
        monthsCount: contributionBases.length,
        note: "Średnia z 12 miesięcy po potrąceniu 13,71%.",
      },
    },
    EMPLOYER: employer,
    EZLA: {
      source: "EZLA",
      sickLeaves: [
        {
          id: "zla-anna-001",
          startDate: "2026-10-05",
          endDate: "2026-10-18",
          days: 14,
          kind: "PREGNANCY",
          pregnancyRelated: true,
          certificateRef: "e-ZLA/DEMO/2026/1042",
          payerName: payer.name,
          status: "FINISHED",
        },
        {
          id: "zla-anna-002",
          startDate: "2026-11-16",
          endDate: "2026-11-20",
          days: 5,
          kind: "PREGNANCY",
          pregnancyRelated: true,
          certificateRef: "e-ZLA/DEMO/2026/1188",
          payerName: payer.name,
          status: "FINISHED",
        },
      ],
    },
    USC: {
      source: "USC",
      children: [],
      familyEvents: [],
    },
    PUE: {
      source: "PUE",
      cases: [
        {
          id: "pue-anna-001",
          caseNumber: "ZUS-DEMO-2026-001842",
          applicationType: "Zasiłek chorobowy",
          benefitKind: "SICKNESS",
          status: "PAID",
          submittedAt: "2026-10-19",
          decisionNumber: "DEC/DEMO/2026/5512",
          decisionDate: "2026-10-26",
          periodFrom: "2026-10-05",
          periodTo: "2026-10-18",
          amountGrosze: 322_140,
        },
      ],
      documents: [
        {
          id: "doc-anna-001",
          title: "Decyzja o przyznaniu zasiłku chorobowego",
          kind: "DECISION",
          issuedAt: "2026-10-26",
          reference: "DEC/DEMO/2026/5512",
          available: true,
        },
        {
          id: "doc-anna-002",
          title: "Zaświadczenie o ubezpieczeniu",
          kind: "CERTIFICATE",
          issuedAt: "2026-11-02",
          reference: "ZAS/DEMO/2026/0911",
          available: true,
        },
      ],
    },
  },
  availability: {
    ZUS: "SUCCESS",
    EMPLOYER: "SUCCESS",
    EZLA: "SUCCESS",
    USC: "EMPTY",
    PUE: "SUCCESS",
  },
  sourceIssues: {
    USC: [
      {
        code: "NO_BIRTH_RECORD",
        message:
          "USC nie ma jeszcze wpisu o urodzeniu. W scenariuszu ciąża nadal trwa — datę porodu uzupełnisz ręcznie.",
        severity: "INFO",
      },
    ],
  },
  notes: [
    "Dane pracodawcy, ZUS i PUE opisują tę samą umowę o pracę.",
    "USC nie zwraca danych, bo dziecko jeszcze się nie urodziło.",
  ],
}
