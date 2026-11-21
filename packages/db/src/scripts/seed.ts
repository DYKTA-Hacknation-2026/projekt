import "dotenv/config"

import { sql } from "drizzle-orm"

import { closeDatabase, getDatabaseConnection } from "../client"
import {
  applicationDrafts,
  assistantToolCalls,
  benefitCalculations,
  benefitCases,
  benefitScenarios,
  conversationMessages,
  conversations,
  employmentRecords,
  familyEvents,
  insurancePeriods,
  legalRules,
  legalRuleVersions,
  userProfiles,
  users,
} from "../schema"

function id(sequence: number): string {
  return `01900000-0000-7000-8000-${sequence.toString().padStart(12, "0")}`
}

const LEGAL_RULES = [
  {
    id: id(401),
    code: "LR-123",
    title: "Wymiar urlopu macierzyńskiego",
    description:
      "Wymiar urlopu macierzyńskiego w zależności od liczby dzieci; limit urlopu przed porodem.",
    category: "MATERNITY",
    legalReference: "KP art. 180 § 1–2",
    version: "2026.11-Z1",
    verificationStatus: "VERIFIED" as const,
    parameters: {
      weeksByChildren: { 1: 20, 2: 31, 3: 33, 4: 35, 5: 37 },
      maxPreBirthWeeks: 6,
      motherPersonalWeeks: 14,
    },
  },
  {
    id: id(402),
    code: "LR-127",
    title: "Pula urlopu rodzicielskiego",
    description:
      "Wspólna pula urlopu rodzicielskiego, w tym wariant „Za życiem”; część niezbywalna dla każdego rodzica.",
    category: "PARENTAL",
    legalReference: "KP art. 182¹a; KP art. 182¹c",
    version: "2026.11-Z1",
    verificationStatus: "VERIFIED" as const,
    parameters: {
      pool: {
        single: 41,
        multiple: 43,
        zaZyciemSingle: 65,
        zaZyciemMultiple: 67,
      },
      nonTransferable: 9,
      maxWorkFraction: 0.5,
      maxParts: 5,
      deadlineChildAgeYears: 6,
    },
  },
  {
    id: id(403),
    code: "LR-130",
    title: "Stawki zasiłku macierzyńskiego",
    description:
      "Stawki zasiłku macierzyńskiego i rodzicielskiego oraz wariant ze stałą stawką.",
    category: "AMOUNTS",
    legalReference: "U art. 30a, 31 ust. 1–4",
    version: "2026.11-Z1",
    verificationStatus: "VERIFIED" as const,
    parameters: { maternity: 1, parental: 0.7, flat81_5: 0.815 },
  },
  {
    id: id(404),
    code: "LR-112",
    title: "Podstawa wymiaru zasiłku",
    description:
      "Okres odniesienia, potrącenie składki chorobowej i podstawa dzienna.",
    category: "BASIS",
    legalReference: "U art. 36, 38",
    version: "2026.11-Z1",
    verificationStatus: "VERIFIED" as const,
    parameters: {
      referenceMonths: 12,
      contributionDeduction: 0.1371,
      dailyDivisor: 30,
      roundingVerified: false,
    },
  },
  {
    id: id(405),
    code: "LR-133",
    title: "Urlop ojcowski",
    description: "Wymiar i zasady wykorzystania urlopu ojcowskiego.",
    category: "PATERNITY",
    legalReference: "KP art. 182³",
    version: "2026.11-Z1",
    verificationStatus: "VERIFIED" as const,
    parameters: {
      days: 14,
      maxParts: 2,
      minPartDays: 7,
      deadlineMonths: 12,
    },
  },
  {
    id: id(406),
    code: "LR-100",
    title: "Okres wyczekiwania",
    description: "Okresy wyczekiwania i warunki ubezpieczenia chorobowego.",
    category: "COVERAGE",
    legalReference: "U art. 4 ust. 1–2",
    version: "2026.11-Z1",
    verificationStatus: "VERIFIED" as const,
    parameters: {
      compulsoryDays: 30,
      voluntaryDays: 90,
      gapToleranceDays: 30,
      dayOneGraduateDays: 90,
      employerPaidDays: 33,
      employerPaidDaysAfter50: 14,
      sicknessMaxPeriodDays: 270,
    },
  },
  {
    id: id(407),
    code: "LR-132",
    title: "Minimalna kwota zasiłku macierzyńskiego",
    description:
      "Podwyższenie do wysokości świadczenia rodzicielskiego. Wartość oczekuje na Q-29.",
    category: "AMOUNTS",
    legalReference: "U art. 31 ust. 3a–3c",
    version: "2026.11-Z1",
    verificationStatus: "UNVERIFIED" as const,
    parameters: { parentalBenefitAmountGrosze: null, blocking: true },
  },
  {
    id: id(408),
    code: "LR-134",
    title: "Terminy wniosków i wypłaty",
    description:
      "Terminy składania wniosków urlopowych, wniosek o 81,5%, przekazanie dokumentów do ZUS i wypłata zasiłku.",
    category: "DEADLINES",
    legalReference:
      "KP art. 180 § 2, 182¹d–e, 182³; U art. 30a, 31 ust. 4; P s. 26",
    version: "2026.11-Z1",
    verificationStatus: "VERIFIED" as const,
    parameters: {
      maternityPreBirthRequestDays: 14,
      maternityResignationNoticeDays: 7,
      flatRateApplicationDays: 21,
      parentalRequestNoticeDays: 21,
      workCombinationNoticeDays: 21,
      paternityRequestNoticeDays: 7,
      adoptionRequestDays: 7,
      adoptionStartMaxDays: 21,
      employerForwardingDays: 7,
      zusPaymentDays: 30,
      limitationMonths: 6,
    },
  },
  {
    id: id(409),
    code: "LR-101",
    title: "Zaległości składkowe",
    description:
      "Zadłużenie powyżej progu wstrzymuje wypłatę; brak spłaty w terminie wygasza prawo.",
    category: "COVERAGE",
    legalReference: "U art. 2a ust. 1–2",
    version: "2026.11-Z1",
    verificationStatus: "VERIFIED" as const,
    parameters: {
      thresholdShareOfMinWage: 0.01,
      expiryMonths: 6,
      payAfterRepaymentDays: 60,
    },
  },
  {
    id: id(410),
    code: "LR-102",
    title: "Płatnik wypłacający zasiłek",
    description:
      "Próg liczby ubezpieczonych decyduje o tym, czy zasiłek wypłaca płatnik, czy ZUS.",
    category: "COVERAGE",
    legalReference: "U art. 61 ust. 1",
    version: "2026.11-Z1",
    verificationStatus: "VERIFIED" as const,
    parameters: { selfPayThreshold: 20 },
  },
]

const DEMO_USERS = [
  {
    id: id(501),
    email: "anna.kowalska@example.test",
    displayName: "Anna Kowalska",
    role: "USER" as const,
  },
  {
    id: id(502),
    email: "tomasz.kowalski@example.test",
    displayName: "Tomasz Kowalski",
    role: "USER" as const,
  },
  {
    id: id(503),
    email: "kasia.nowak@example.test",
    displayName: "Kasia Nowak",
    role: "USER" as const,
  },
  {
    id: id(504),
    email: "admin@zpr.local",
    displayName: "Administrator demo",
    role: "ADMIN" as const,
  },
]

async function seed(): Promise<void> {
  const { db } = getDatabaseConnection()

  await db.transaction(async (tx) => {
    await tx
      .insert(users)
      .values(
        DEMO_USERS.map((user) => ({
          ...user,
          isDemo: true,
          lastSeenAt: new Date(),
        }))
      )
      .onConflictDoUpdate({
        target: users.id,
        set: {
          displayName: sql`excluded.display_name`,
          role: sql`excluded.role`,
          isDemo: true,
          lastSeenAt: new Date(),
          updatedAt: new Date(),
        },
      })

    await tx
      .insert(userProfiles)
      .values([
        {
          id: id(601),
          userId: id(501),
          firstName: "Anna",
          lastName: "Kowalska",
          birthDate: "1994-05-14",
          city: "Warszawa",
          healthDataConsent: true,
          aiAssistantConsent: true,
          documentProcessingConsent: true,
        },
        {
          id: id(602),
          userId: id(502),
          firstName: "Tomasz",
          lastName: "Kowalski",
          birthDate: "1991-09-02",
          city: "Warszawa",
          healthDataConsent: true,
          aiAssistantConsent: true,
          documentProcessingConsent: false,
        },
        {
          id: id(603),
          userId: id(503),
          firstName: "Kasia",
          lastName: "Nowak",
          birthDate: "1997-02-20",
          city: "Kraków",
          healthDataConsent: true,
          aiAssistantConsent: false,
          documentProcessingConsent: false,
        },
      ])
      .onConflictDoNothing()

    await tx
      .insert(employmentRecords)
      .values([
        {
          id: id(701),
          userId: id(501),
          employerName: "Przykładowy Pracodawca S.A. (150 ubezpieczonych)",
          contractType: "EMPLOYMENT" as const,
          startDate: "2024-01-01",
          grossMonthlyAmountGrosze: 800_000,
          workingTimeFraction: "1.000",
          isCurrent: true,
        },
        {
          id: id(702),
          userId: id(502),
          employerName: "Przykładowy Pracodawca S.A. (150 ubezpieczonych)",
          contractType: "EMPLOYMENT" as const,
          startDate: "2023-03-01",
          grossMonthlyAmountGrosze: 600_000,
          workingTimeFraction: "1.000",
          isCurrent: true,
        },
        {
          id: id(703),
          userId: id(503),
          employerName: "Zleceniodawca Demo Sp. z o.o.",
          contractType: "MANDATE" as const,
          startDate: "2026-08-01",
          endDate: "2026-10-15",
          grossMonthlyAmountGrosze: 450_000,
          workingTimeFraction: "1.000",
          isCurrent: false,
        },
      ])
      .onConflictDoNothing()

    await tx
      .insert(insurancePeriods)
      .values([
        {
          id: id(801),
          userId: id(501),
          employmentRecordId: id(701),
          coverageMode: "COMPULSORY" as const,
          startDate: "2024-01-01",
          monthlyBasisGrosze: 800_000,
          isActive: true,
        },
        {
          id: id(802),
          userId: id(502),
          employmentRecordId: id(702),
          coverageMode: "COMPULSORY" as const,
          startDate: "2023-03-01",
          monthlyBasisGrosze: 600_000,
          isActive: true,
        },
        {
          id: id(803),
          userId: id(503),
          employmentRecordId: id(703),
          coverageMode: "VOLUNTARY" as const,
          startDate: "2026-08-01",
          endDate: "2026-10-15",
          monthlyBasisGrosze: 450_000,
          isActive: false,
        },
      ])
      .onConflictDoNothing()

    await tx
      .insert(familyEvents)
      .values([
        {
          id: id(901),
          userId: id(501),
          eventType: "PREGNANCY" as const,
          expectedDueDate: "2027-03-10",
          childCount: 1,
          hasZaZyciem: false,
          isPremature: false,
          notes: "Scenariusz S-01/S-10: poród w terminie, jedno dziecko.",
        },
        {
          id: id(902),
          userId: id(502),
          eventType: "PREGNANCY" as const,
          expectedDueDate: "2027-03-10",
          childCount: 1,
          hasZaZyciem: false,
          isPremature: false,
          notes: "Drugi rodzic w scenariuszu S-10.",
        },
        {
          id: id(903),
          userId: id(503),
          eventType: "BIRTH" as const,
          eventDate: "2026-11-02",
          childCount: 1,
          hasZaZyciem: false,
          isPremature: false,
          notes: "Scenariusz S-18: brak ubezpieczenia w dniu porodu.",
        },
      ])
      .onConflictDoNothing()

    await tx
      .insert(benefitCases)
      .values([
        {
          id: id(1001),
          userId: id(501),
          familyEventId: id(901),
          caseNumber: "ZPR-DEMO-001",
          title: "Anna — macierzyński i rodzicielski, jedno dziecko",
          status: "READY" as const,
          dueDate: "2027-03-10",
          summary:
            "Poród planowany na 10 marca 2027. Wariant 100/70 i porównanie 81,5%.",
          metadata: { scenario: "S-10", persona: "Anna" },
        },
        {
          id: id(1002),
          userId: id(503),
          familyEventId: id(903),
          caseNumber: "ZPR-DEMO-002",
          title: "Kasia — zlecenie zakończone przed porodem",
          status: "IN_REVIEW" as const,
          dueDate: "2026-11-02",
          summary:
            "Brak ubezpieczenia chorobowego w dniu porodu. Ryzyko LR-72.",
          metadata: { scenario: "S-18", persona: "Kasia" },
        },
      ])
      .onConflictDoNothing()

    await tx
      .insert(benefitScenarios)
      .values([
        {
          id: id(1101),
          caseId: id(1001),
          name: "Wariant 100% + 70%",
          paymentOption: "STANDARD_100_70" as const,
          leaveSplit: {
            mother: { maternity: 20, parental: 32 },
            father: { parental: 9, paternityDays: 14 },
          },
          assumptions: { basisGrosze: 690_320, childrenCount: 1 },
        },
        {
          id: id(1102),
          caseId: id(1001),
          name: "Wariant 81,5%",
          paymentOption: "FLAT_81_5" as const,
          leaveSplit: {
            mother: { maternity: 20, parental: 32 },
            father: { parental: 9, paternityDays: 14 },
          },
          assumptions: { applicationWithinDaysAfterBirth: 10 },
        },
      ])
      .onConflictDoNothing()

    await tx
      .insert(benefitCalculations)
      .values([
        {
          id: id(1201),
          caseId: id(1001),
          scenarioId: id(1101),
          input: {
            grossMonthlyIncomeGrosze: 800_000,
            childrenCount: 1,
            paymentOption: "STANDARD_100_70",
            paternityDays: 14,
          },
          result: {
            status: "INDETERMINATE",
            totalGrosze: 15_540_000,
            note: "Wartość demonstracyjna; Q-29 i Q-15 wymagają zatwierdzenia.",
          },
          totalAmountGrosze: 15_540_000,
          status: "INDETERMINATE" as const,
          engineVersion: "0.1.0-scaffold",
        },
        {
          id: id(1202),
          caseId: id(1001),
          scenarioId: id(1102),
          input: {
            grossMonthlyIncomeGrosze: 800_000,
            childrenCount: 1,
            paymentOption: "FLAT_81_5",
            paternityDays: 14,
          },
          result: {
            status: "INDETERMINATE",
            totalGrosze: 15_180_000,
            note: "Wariant 81,5% — porównanie w kalkulatorze.",
          },
          totalAmountGrosze: 15_180_000,
          status: "INDETERMINATE" as const,
          engineVersion: "0.1.0-scaffold",
        },
      ])
      .onConflictDoNothing()

    await tx
      .insert(applicationDrafts)
      .values([
        {
          id: id(1301),
          caseId: id(1001),
          applicationType: "LEAVE_MATERNITY",
          recipient: "EMPLOYER" as const,
          formCode: "R322 § 2",
          payload: {
            employeeName: "Anna Kowalska",
            expectedDueDate: "2027-03-10",
            requestedStart: "2027-02-24",
          },
          status: "DRAFT" as const,
        },
        {
          id: id(1302),
          caseId: id(1001),
          applicationType: "LEAVE_PARENTAL",
          recipient: "EMPLOYER" as const,
          formCode: "R322 § 15",
          payload: { parts: 2, requestedWeeks: 32 },
          status: "DRAFT" as const,
        },
      ])
      .onConflictDoNothing()

    await tx
      .insert(legalRules)
      .values(
        LEGAL_RULES.map((rule) => ({
          id: rule.id,
          code: rule.code,
          title: rule.title,
          description: rule.description,
          category: rule.category,
          legalReference: rule.legalReference,
          isActive: true,
        }))
      )
      .onConflictDoUpdate({
        target: legalRules.id,
        set: {
          title: sql`excluded.title`,
          description: sql`excluded.description`,
          category: sql`excluded.category`,
          legalReference: sql`excluded.legal_reference`,
          isActive: true,
          updatedAt: new Date(),
        },
      })

    await tx
      .insert(legalRuleVersions)
      .values(
        LEGAL_RULES.map((rule, index) => ({
          id: id(1401 + index),
          ruleId: rule.id,
          version: rule.version,
          effectiveFrom: "2026-11-01",
          parameters: rule.parameters,
          verificationStatus: rule.verificationStatus,
          sourceUrl: "https://www.zus.pl/",
          notes:
            rule.verificationStatus === "UNVERIFIED"
              ? "Oczekuje na wartość zewnętrzną Q-29; parametr blokujący."
              : null,
        }))
      )
      .onConflictDoUpdate({
        target: legalRuleVersions.id,
        set: {
          version: sql`excluded.version`,
          effectiveFrom: sql`excluded.effective_from`,
          parameters: sql`excluded.parameters`,
          verificationStatus: sql`excluded.verification_status`,
          sourceUrl: sql`excluded.source_url`,
          notes: sql`excluded.notes`,
        },
      })

    // A seeded conversation demonstrates the assistant trail. Knowledge
    // sources, chunks and embeddings are produced by the real ingestion
    // pipeline: run `pnpm --filter @zpr/rag kb:seed` after this script.
    await tx
      .insert(conversations)
      .values({
        id: id(1601),
        userId: id(501),
        title: "Ile trwa urlop macierzyński?",
        isSimulated: true,
      })
      .onConflictDoNothing()

    await tx
      .insert(conversationMessages)
      .values([
        {
          id: id(1602),
          conversationId: id(1601),
          role: "USER" as const,
          content: "Ile trwa urlop macierzyński przy jednym dziecku?",
        },
        {
          id: id(1603),
          conversationId: id(1601),
          role: "ASSISTANT" as const,
          content:
            "Przy jednym dziecku urlop macierzyński wynosi 20 tygodni [S1]. Do 6 tygodni można wykorzystać przed porodem.",
          model: "demo-retrieval",
        },
      ])
      .onConflictDoNothing()

    await tx
      .insert(assistantToolCalls)
      .values({
        id: id(1605),
        messageId: id(1603),
        toolName: "searchKnowledge",
        arguments: { query: "wymiar urlopu macierzyńskiego" },
        result: { citations: 1, model: "local-demo" },
        latencyMs: 42,
      })
      .onConflictDoNothing()
  })

  console.info(
    "[db:seed] Dane demonstracyjne zostały zapisane (idempotentnie)."
  )
  console.info(
    "[db:seed] Baza wiedzy: uruchom `pnpm --filter @zpr/rag kb:seed`, aby zaindeksować źródła."
  )
}

seed()
  .then(async () => {
    await closeDatabase()
    process.exit(0)
  })
  .catch(async (error: unknown) => {
    console.error("[db:seed] Seed failed:", error)
    await closeDatabase()
    process.exit(1)
  })
