import { and, desc, eq } from "drizzle-orm"

import {
  importedCaseDataSchema,
  sourceDataSchema,
  type SourceData,
} from "@zpr/contracts/data-import"

import type { Database } from "../client"
import {
  benefitApplications,
  contributionBases,
  contributionPayers,
  dataImportSessions,
  dataImportSnapshots,
  employmentRecords,
  familyEvents,
  importedChildren,
  insurancePeriods,
  payrollAbsences,
  payrollComponents,
  sickLeavePeriods,
} from "../schema"
import type {
  AcceptImportSessionInput,
  CreateImportSessionInput,
  ImportRepository,
  ImportSessionRecord,
  ImportSnapshotRecord,
  SaveImportSnapshotInput,
} from "./interfaces"

function toJson(value: unknown): Record<string, unknown> {
  return JSON.parse(JSON.stringify(value)) as Record<string, unknown>
}

function monthRange(period: string): { startDate: string; endDate: string } {
  const [yearRaw, monthRaw] = period.split("-")
  const year = Number(yearRaw)
  const month = Number(monthRaw)
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate()
  return {
    startDate: `${period}-01`,
    endDate: `${period}-${String(lastDay).padStart(2, "0")}`,
  }
}

function snapshotData(
  snapshots: readonly ImportSnapshotRecord[]
): Map<SourceData["source"], SourceData> {
  const map = new Map<SourceData["source"], SourceData>()
  for (const snapshot of snapshots) {
    const parsed = sourceDataSchema.safeParse(snapshot.payload)
    if (parsed.success) map.set(parsed.data.source, parsed.data)
  }
  return map
}

export class DrizzleImportRepository implements ImportRepository {
  constructor(private readonly db: Database) {}

  async createSession(
    input: CreateImportSessionInput
  ): Promise<ImportSessionRecord> {
    const [row] = await this.db
      .insert(dataImportSessions)
      .values({
        ownerKey: input.ownerKey,
        personaId: input.personaId,
        scenarioId: input.scenarioId,
        scopes: input.scopes,
        status: "CONSENTED",
        engineVersion: input.engineVersion ?? "1.0.0-sim",
      })
      .returning()

    if (!row) throw new Error("Nie udało się utworzyć sesji pobierania danych")
    return row
  }

  async getOwnedSession(
    sessionId: string,
    ownerKey: string
  ): Promise<ImportSessionRecord | null> {
    const [row] = await this.db
      .select()
      .from(dataImportSessions)
      .where(
        and(
          eq(dataImportSessions.id, sessionId),
          eq(dataImportSessions.ownerKey, ownerKey)
        )
      )
      .limit(1)
    return row ?? null
  }

  async listSnapshots(sessionId: string): Promise<ImportSnapshotRecord[]> {
    return this.db
      .select()
      .from(dataImportSnapshots)
      .where(eq(dataImportSnapshots.sessionId, sessionId))
      .orderBy(dataImportSnapshots.createdAt)
  }

  async saveSnapshot(
    input: SaveImportSnapshotInput
  ): Promise<ImportSnapshotRecord> {
    const [row] = await this.db
      .insert(dataImportSnapshots)
      .values({
        sessionId: input.sessionId,
        sourceId: input.result.source,
        status: input.result.status,
        payload: toJson(input.result.data ?? {}),
        issues: input.issues as unknown[],
        fetchedAt: new Date(input.result.provenance.fetchedAt),
      })
      .onConflictDoUpdate({
        target: [
          dataImportSnapshots.sessionId,
          dataImportSnapshots.sourceId,
        ],
        set: {
          status: input.result.status,
          payload: toJson(input.result.data ?? {}),
          issues: input.issues as unknown[],
          fetchedAt: new Date(input.result.provenance.fetchedAt),
        },
      })
      .returning()

    if (!row) throw new Error("Nie udało się zapisać wyniku źródła danych")
    return row
  }

  async markRunning(sessionId: string): Promise<void> {
    await this.db
      .update(dataImportSessions)
      .set({ status: "RUNNING", updatedAt: new Date() })
      .where(eq(dataImportSessions.id, sessionId))
  }

  async markCompleted(sessionId: string): Promise<void> {
    await this.db
      .update(dataImportSessions)
      .set({ status: "COMPLETED", updatedAt: new Date() })
      .where(eq(dataImportSessions.id, sessionId))
  }

  async markSkipped(sessionId: string, ownerKey: string): Promise<boolean> {
    const rows = await this.db
      .update(dataImportSessions)
      .set({ status: "SKIPPED", updatedAt: new Date() })
      .where(
        and(
          eq(dataImportSessions.id, sessionId),
          eq(dataImportSessions.ownerKey, ownerKey)
        )
      )
      .returning({ id: dataImportSessions.id })
    return rows.length > 0
  }

  async acceptSession(
    input: AcceptImportSessionInput
  ): Promise<ImportSessionRecord> {
    const [row] = await this.db
      .update(dataImportSessions)
      .set({
        status: "ACCEPTED",
        acceptedData: toJson(input.data),
        fieldSources: toJson(input.fieldSources),
        summary: toJson(input.summary),
        acceptedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(dataImportSessions.id, input.sessionId),
          eq(dataImportSessions.ownerKey, input.ownerKey)
        )
      )
      .returning()

    if (!row) throw new Error("Nie znaleziono sesji pobierania danych")
    return row
  }

  async findLatestAcceptedForUser(
    userId: string
  ): Promise<ImportSessionRecord | null> {
    const [row] = await this.db
      .select()
      .from(dataImportSessions)
      .where(
        and(
          eq(dataImportSessions.userId, userId),
          eq(dataImportSessions.status, "ACCEPTED")
        )
      )
      .orderBy(desc(dataImportSessions.acceptedAt))
      .limit(1)
    return row ?? null
  }

  /**
   * Projects an accepted snapshot into the normalised application tables and
   * binds the session to the user created by onboarding. Every write is
   * idempotent for one user: imported history is replaced, while manually
   * created rows that do not match the snapshot are left alone.
   */
  async applyToUser(input: { sessionId: string; userId: string }): Promise<void> {
    await this.db.transaction(async (tx) => {
      const [session] = await tx
        .select()
        .from(dataImportSessions)
        .where(eq(dataImportSessions.id, input.sessionId))
        .limit(1)
      if (!session) throw new Error("Nie znaleziono zaakceptowanej sesji danych")

      const data = importedCaseDataSchema.parse(session.acceptedData)
      const snapshots = await tx
        .select()
        .from(dataImportSnapshots)
        .where(eq(dataImportSnapshots.sessionId, input.sessionId))
        .orderBy(dataImportSnapshots.createdAt)
      const bySource = snapshotData(snapshots)

      const zus = bySource.get("ZUS")
      const employer = bySource.get("EMPLOYER")
      const ezla = bySource.get("EZLA")
      const usc = bySource.get("USC")
      const pue = bySource.get("PUE")

      await tx
        .update(dataImportSessions)
        .set({ userId: input.userId, updatedAt: new Date() })
        .where(eq(dataImportSessions.id, input.sessionId))

      await tx
        .delete(contributionPayers)
        .where(eq(contributionPayers.userId, input.userId))

      if (employer?.source === "EMPLOYER" && employer.payers.length > 0) {
        await tx.insert(contributionPayers).values(
          employer.payers.map((payer) => ({
            userId: input.userId,
            name: payer.name,
            payerType: payer.type,
            taxId: payer.taxId,
            city: payer.city,
            isCurrent: payer.isCurrent,
            source: "SIMULATED",
          }))
        )
      }

      const existingEmployment = await tx
        .select()
        .from(employmentRecords)
        .where(eq(employmentRecords.userId, input.userId))
      const employmentIdBySource = new Map<string, string>()

      if (employer?.source === "EMPLOYER") {
        for (const employment of employer.employments) {
          const existing = existingEmployment.find(
            (row) =>
              row.employerName === employment.payerName &&
              row.startDate === employment.startDate
          )
          let recordId: string
          if (existing) {
            await tx
              .update(employmentRecords)
              .set({
                contractType: employment.contractType,
                endDate: employment.endDate,
                grossMonthlyAmountGrosze: employment.grossMonthlyAmountGrosze,
                workingTimeFraction: employment.workingTimeFraction.toFixed(3),
                isCurrent: employment.endDate === null,
                updatedAt: new Date(),
              })
              .where(eq(employmentRecords.id, existing.id))
            recordId = existing.id
          } else {
            const [created] = await tx
              .insert(employmentRecords)
              .values({
                userId: input.userId,
                employerName: employment.payerName,
                contractType: employment.contractType,
                startDate: employment.startDate,
                endDate: employment.endDate,
                grossMonthlyAmountGrosze: employment.grossMonthlyAmountGrosze,
                workingTimeFraction: employment.workingTimeFraction.toFixed(3),
                isCurrent: employment.endDate === null,
              })
              .returning({ id: employmentRecords.id })
            if (!created) continue
            recordId = created.id
          }
          employmentIdBySource.set(employment.id, recordId)

          await tx
            .delete(payrollComponents)
            .where(eq(payrollComponents.employmentRecordId, recordId))
          if (employment.components.length > 0) {
            await tx.insert(payrollComponents).values(
              employment.components.map((component) => ({
                employmentRecordId: recordId,
                name: component.name,
                kind: component.kind,
                amountGrosze: component.amountGrosze,
                validFrom: component.validFrom,
                validTo: component.validTo ?? null,
              }))
            )
          }

          await tx
            .delete(payrollAbsences)
            .where(eq(payrollAbsences.employmentRecordId, recordId))
          if (employment.absences.length > 0) {
            await tx.insert(payrollAbsences).values(
              employment.absences.map((absence) => ({
                employmentRecordId: recordId,
                kind: absence.kind,
                startDate: absence.startDate,
                endDate: absence.endDate,
                note: absence.note,
              }))
            )
          }
        }
      }

      const existingInsurance = await tx
        .select()
        .from(insurancePeriods)
        .where(eq(insurancePeriods.userId, input.userId))
      const insuranceIdBySource = new Map<string, string>()

      if (zus?.source === "ZUS") {
        for (const period of zus.insurancePeriods) {
          const employmentRecordId =
            employer?.source === "EMPLOYER"
              ? employer.employments
                  .filter((item) => item.payerId === period.payerId)
                  .map((item) => employmentIdBySource.get(item.id))
                  .find((value) => value !== undefined)
              : undefined
          const existing = existingInsurance.find(
            (row) => row.startDate === period.startDate
          )
          let recordId: string
          if (existing) {
            await tx
              .update(insurancePeriods)
              .set({
                coverageMode: period.coverageMode,
                endDate: period.endDate,
                isActive: period.isActive,
                monthlyBasisGrosze:
                  data.monthlyBasisGrosze ?? existing.monthlyBasisGrosze,
                notes: period.notes,
                updatedAt: new Date(),
              })
              .where(eq(insurancePeriods.id, existing.id))
            recordId = existing.id
          } else {
            const [created] = await tx
              .insert(insurancePeriods)
              .values({
                userId: input.userId,
                employmentRecordId,
                insuranceType: period.title,
                coverageMode: period.coverageMode,
                startDate: period.startDate,
                endDate: period.endDate,
                monthlyBasisGrosze: data.monthlyBasisGrosze ?? 0,
                isActive: period.isActive,
                notes: period.notes,
              })
              .returning({ id: insurancePeriods.id })
            if (!created) continue
            recordId = created.id
          }
          insuranceIdBySource.set(period.id, recordId)
        }
      }

      await tx
        .delete(contributionBases)
        .where(eq(contributionBases.userId, input.userId))
      if (zus?.source === "ZUS" && zus.contributionBases.length > 0) {
        await tx.insert(contributionBases).values(
          zus.contributionBases.map((basis) => {
            const range = monthRange(basis.period)
            return {
              userId: input.userId,
              insurancePeriodId:
                insuranceIdBySource.get(basis.insurancePeriodId) ?? null,
              periodStart: range.startDate,
              periodEnd: range.endDate,
              basisGrosze: basis.basisGrosze,
              sicknessContributionGrosze: basis.sicknessContributionGrosze,
              paid: basis.paid,
              paidAt: basis.paidAt,
              source: "SIMULATED_ZUS",
            }
          })
        )
      }

      await tx
        .delete(sickLeavePeriods)
        .where(eq(sickLeavePeriods.userId, input.userId))
      if (ezla?.source === "EZLA" && ezla.sickLeaves.length > 0) {
        await tx.insert(sickLeavePeriods).values(
          ezla.sickLeaves.map((leave) => ({
            userId: input.userId,
            startDate: leave.startDate,
            endDate: leave.endDate,
            days: leave.days,
            kind: leave.kind,
            pregnancyRelated: leave.pregnancyRelated,
            certificateRef: leave.certificateRef,
            payerName: leave.payerName,
            status: leave.status,
            source: "SIMULATED_EZLA",
          }))
        )
      }

      await tx
        .delete(importedChildren)
        .where(eq(importedChildren.userId, input.userId))
      if (usc?.source === "USC" && usc.children.length > 0) {
        const [event] = await tx
          .select({ id: familyEvents.id })
          .from(familyEvents)
          .where(eq(familyEvents.userId, input.userId))
          .orderBy(desc(familyEvents.createdAt))
          .limit(1)
        await tx.insert(importedChildren).values(
          usc.children.map((child) => ({
            userId: input.userId,
            familyEventId: event?.id,
            firstName: child.firstName,
            birthDate: child.birthDate,
            childrenInBirth: child.childrenInBirth,
            isAdopted: child.isAdopted,
            adoptionDate: child.adoptionDate,
            birthPlace: child.birthPlace,
            source: "SIMULATED_USC",
          }))
        )
      }

      await tx
        .delete(benefitApplications)
        .where(eq(benefitApplications.userId, input.userId))
      if (pue?.source === "PUE" && pue.cases.length > 0) {
        await tx.insert(benefitApplications).values(
          pue.cases.map((item) => ({
            userId: input.userId,
            caseNumber: item.caseNumber,
            applicationType: item.applicationType,
            benefitKind: item.benefitKind,
            status: item.status,
            submittedAt: item.submittedAt,
            decisionNumber: item.decisionNumber,
            decisionDate: item.decisionDate,
            periodFrom: item.periodFrom,
            periodTo: item.periodTo,
            amountGrosze: item.amountGrosze,
            documents: pue.documents.filter(
              (document) =>
                document.reference === item.decisionNumber ||
                document.kind === "APPLICATION_CONFIRMATION"
            ) as unknown as Record<string, unknown>[],
            source: "SIMULATED_PUE",
          }))
        )
      }
    })
  }
}
