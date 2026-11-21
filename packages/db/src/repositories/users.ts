import { and, desc, eq, sql } from "drizzle-orm"

import type { OnboardingInput } from "@zpr/contracts/onboarding"

import type { Database } from "../client"
import { uuidv7 } from "../ids"
import {
  benefitCases,
  contributionBases,
  familyEvents,
  insurancePeriods,
  employmentRecords,
  sickLeavePeriods,
  userProfiles,
  users,
} from "../schema"
import type {
  AssistantProfileRecord,
  HouseholdRepository,
  UserRecord,
  UserRepository,
  UserSummary,
} from "./interfaces"

export class DrizzleUserRepository implements UserRepository {
  constructor(private readonly db: Database) {}

  async countUsers(): Promise<number> {
    const [row] = await this.db
      .select({ value: sql<number>`count(*)::int` })
      .from(users)
    return row?.value ?? 0
  }

  async listDemoUsers(limit = 10): Promise<UserSummary[]> {
    return this.db
      .select({
        id: users.id,
        displayName: users.displayName,
        email: users.email,
        role: users.role,
        isDemo: users.isDemo,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.isDemo, true))
      .orderBy(desc(users.createdAt))
      .limit(limit)
  }

  async findUserByEmail(email: string): Promise<UserRecord | null> {
    const [row] = await this.db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1)
    return row ?? null
  }

  /**
   * Read-only, minimised view of one user's confirmed facts for the
   * assistant. Selects no names, e-mail, city, birth date or health fields.
   * The caller must already have authorised `userId` (session principal).
   */
  async getAssistantProfile(
    userId: string
  ): Promise<AssistantProfileRecord | null> {
    const [profile] = await this.db
      .select({
        userId: userProfiles.userId,
        aiAssistantConsent: userProfiles.aiAssistantConsent,
        updatedAt: userProfiles.updatedAt,
      })
      .from(userProfiles)
      .where(eq(userProfiles.userId, userId))
      .limit(1)
    if (!profile) return null

    const [employment] = await this.db
      .select({
        contractType: employmentRecords.contractType,
        grossMonthlyAmountGrosze: employmentRecords.grossMonthlyAmountGrosze,
      })
      .from(employmentRecords)
      .where(and(eq(employmentRecords.userId, userId), eq(employmentRecords.isCurrent, true)))
      .orderBy(desc(employmentRecords.createdAt))
      .limit(1)

    const insuranceRows = await this.db
      .select({
        coverageMode: insurancePeriods.coverageMode,
        startDate: insurancePeriods.startDate,
        endDate: insurancePeriods.endDate,
        isActive: insurancePeriods.isActive,
      })
      .from(insurancePeriods)
      .where(eq(insurancePeriods.userId, userId))
      .orderBy(desc(insurancePeriods.startDate))

    const insurance =
      insuranceRows.find((row) => row.isActive) ?? insuranceRows[0]

    const [unpaidContribution] = await this.db
      .select({ id: contributionBases.id })
      .from(contributionBases)
      .where(
        and(
          eq(contributionBases.userId, userId),
          eq(contributionBases.paid, false)
        )
      )
      .limit(1)

    const sickLeaves = await this.db
      .select({
        pregnancyRelated: sickLeavePeriods.pregnancyRelated,
        days: sickLeavePeriods.days,
      })
      .from(sickLeavePeriods)
      .where(eq(sickLeavePeriods.userId, userId))

    const [event] = await this.db
      .select({
        eventType: familyEvents.eventType,
        eventDate: familyEvents.eventDate,
        expectedDueDate: familyEvents.expectedDueDate,
        childCount: familyEvents.childCount,
        hasZaZyciem: familyEvents.hasZaZyciem,
      })
      .from(familyEvents)
      .where(eq(familyEvents.userId, userId))
      .orderBy(desc(familyEvents.createdAt))
      .limit(1)

    const [benefitCase] = await this.db
      .select({ caseNumber: benefitCases.caseNumber })
      .from(benefitCases)
      .where(eq(benefitCases.userId, userId))
      .orderBy(desc(benefitCases.createdAt))
      .limit(1)

    return {
      userId: profile.userId,
      aiAssistantConsent: profile.aiAssistantConsent,
      employmentType: employment?.contractType ?? null,
      coverageMode: insurance?.coverageMode ?? null,
      insuranceStartDate: insurance?.startDate ?? null,
      insuranceEndDate: insurance?.endDate ?? null,
      contributionArrears:
        unpaidContribution === undefined ? null : Boolean(unpaidContribution),
      pregnancySickLeave:
        sickLeaves.length === 0
          ? null
          : sickLeaves.some((leave) => leave.pregnancyRelated),
      sickLeaveDays:
        sickLeaves.length === 0
          ? null
          : sickLeaves.reduce((sum, leave) => sum + leave.days, 0),
      grossMonthlyAmountGrosze: employment?.grossMonthlyAmountGrosze ?? null,
      familyEvent: event?.eventType ?? null,
      eventDate: event?.eventDate ?? null,
      expectedDueDate: event?.expectedDueDate ?? null,
      childCount: event?.childCount ?? null,
      hasZaZyciem: event?.hasZaZyciem ?? null,
      caseNumber: benefitCase?.caseNumber ?? null,
      updatedAt: profile.updatedAt,
    }
  }
}

export class DrizzleHouseholdRepository implements HouseholdRepository {
  constructor(private readonly db: Database) {}

  async createFromOnboarding(
    input: OnboardingInput
  ): Promise<{ userId: string; caseId: string; caseNumber: string }> {
    return this.db.transaction(async (tx) => {
      const now = new Date()
      const [user] = await tx
        .insert(users)
        .values({
          email: input.email,
          displayName: `${input.firstName} ${input.lastName}`,
          role: "USER",
          isDemo: false,
          lastSeenAt: now,
        })
        .onConflictDoUpdate({
          target: users.email,
          set: {
            displayName: `${input.firstName} ${input.lastName}`,
            lastSeenAt: now,
            updatedAt: now,
          },
        })
        .returning({ id: users.id })

      if (!user) throw new Error("Nie udało się utworzyć użytkownika")

      await tx
        .insert(userProfiles)
        .values({
          userId: user.id,
          firstName: input.firstName,
          lastName: input.lastName,
          birthDate: input.birthDate,
          city: input.city,
          healthDataConsent: input.consents.healthData,
          aiAssistantConsent: input.consents.aiAssistant,
          documentProcessingConsent: input.consents.documentProcessing,
        })
        .onConflictDoUpdate({
          target: userProfiles.userId,
          set: {
            firstName: input.firstName,
            lastName: input.lastName,
            birthDate: input.birthDate,
            city: input.city,
            healthDataConsent: input.consents.healthData,
            aiAssistantConsent: input.consents.aiAssistant,
            documentProcessingConsent: input.consents.documentProcessing,
            updatedAt: now,
          },
        })

      const [record] = await tx
        .insert(employmentRecords)
        .values({
          userId: user.id,
          employerName: input.employerName ?? "Pracodawca (dane demonstracyjne)",
          contractType: input.employmentType,
          startDate: input.insuranceStartDate ?? input.eventDate ?? "2026-01-01",
          grossMonthlyAmountGrosze: Math.round(
            input.grossMonthlyIncomePln * 100
          ),
          isCurrent: true,
        })
        .returning({ id: employmentRecords.id })

      if (record) {
        await tx.insert(insurancePeriods).values({
          userId: user.id,
          employmentRecordId: record.id,
          coverageMode: input.coverageMode,
          startDate: input.insuranceStartDate ?? input.eventDate ?? "2026-01-01",
          monthlyBasisGrosze: Math.round(input.grossMonthlyIncomePln * 100),
          isActive: true,
        })
      }

      const [event] = await tx
        .insert(familyEvents)
        .values({
          userId: user.id,
          eventType: input.eventType,
          eventDate: input.eventDate,
          expectedDueDate: input.expectedDueDate,
          childCount: input.childrenCount,
          hasZaZyciem: input.hasZaZyciem,
          isPremature: input.isPremature,
        })
        .returning({ id: familyEvents.id })

      const caseNumber = `ZPR-${Date.now().toString(36).toUpperCase()}-${uuidv7()
        .slice(-4)
        .toUpperCase()}`
      const [benefitCase] = await tx
        .insert(benefitCases)
        .values({
          userId: user.id,
          familyEventId: event?.id,
          caseNumber,
          title: `Sprawa: ${input.eventType.toLowerCase()} / ${input.childrenCount} dzieci`,
          status: "IN_REVIEW",
          dueDate: input.expectedDueDate ?? input.eventDate,
          summary:
            "Sprawa utworzona przez kreator startowy. Dane można uzupełnić w panelu.",
        })
        .returning({ id: benefitCases.id })

      if (!benefitCase) throw new Error("Nie udało się utworzyć sprawy")

      return { userId: user.id, caseId: benefitCase.id, caseNumber }
    })
  }
}
