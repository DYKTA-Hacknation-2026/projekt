import { and, desc, eq, inArray, lte } from "drizzle-orm"

import type { ChecklistItem, DocumentExtraction, DocumentStatus } from "@zpr/contracts/documents"

import type { Database } from "../client"
import { checklistItems, documentExtractions, documentUploads, documentValidationFindings } from "../schema"

export type DocumentUploadRecord = typeof documentUploads.$inferSelect
export type DocumentExtractionRecord = typeof documentExtractions.$inferSelect

export interface CreateUploadInput {
  id: string
  ownerKey: string
  storageKey: string
  sha256: string
  mime: string
  size: number
  origin: "USER_UPLOAD" | "SAMPLE_CASE"
  sampleCaseId?: string
  fileNameHint?: string
  consentGrantedAt?: Date
  deleteAfter: Date
}

export interface SaveChecklistInput {
  ownerKey: string
  sourceDocumentId: string
  ruleSetVersion: string
  inputHash: string
  items: Omit<ChecklistItem, "id" | "status">[]
}

/**
 * Persistence of uploads, extractions, findings and checklists. The service
 * depends on this interface; `DrizzleDocumentRepository` is the PostgreSQL
 * adapter and tests may use an in-memory one.
 */
export interface DocumentRepository {
  createUpload(input: CreateUploadInput): Promise<DocumentUploadRecord>
  getOwnedUpload(id: string, ownerKey: string): Promise<DocumentUploadRecord | null>
  setUploadStatus(id: string, status: DocumentStatus): Promise<void>
  saveExtraction(uploadId: string, extraction: DocumentExtraction): Promise<DocumentExtractionRecord>
  latestExtraction(uploadId: string): Promise<DocumentExtractionRecord | null>
  updateExtraction(extractionId: string, extraction: DocumentExtraction, confirmed: boolean): Promise<void>
  replaceChecklist(input: SaveChecklistInput): Promise<ChecklistItem[]>
  listChecklist(ownerKey: string, sourceDocumentId: string): Promise<ChecklistItem[]>
  deleteUpload(id: string): Promise<void>
  /** Uploads whose `delete_after` passed; the caller removes files, then rows. */
  listExpired(now: Date, limit?: number): Promise<Pick<DocumentUploadRecord, "id" | "storageKey">[]>
}

function toChecklist(row: typeof checklistItems.$inferSelect): ChecklistItem {
  return {
    id: row.id,
    templateKey: row.templateKey,
    title: row.title,
    parent: row.parent as ChecklistItem["parent"],
    preparedBy: row.preparedBy,
    submitTo: row.submitTo,
    when: row.whenText,
    dueDate: row.dueDate,
    legalBasis: row.legalBasis,
    status: row.status,
  }
}

export class DrizzleDocumentRepository implements DocumentRepository {
  constructor(private readonly db: Database) {}

  async createUpload(input: CreateUploadInput): Promise<DocumentUploadRecord> {
    const [row] = await this.db.insert(documentUploads).values(input).returning()
    if (!row) throw new Error("Nie udało się zapisać dokumentu")
    return row
  }

  async getOwnedUpload(id: string, ownerKey: string): Promise<DocumentUploadRecord | null> {
    const [row] = await this.db
      .select()
      .from(documentUploads)
      .where(and(eq(documentUploads.id, id), eq(documentUploads.ownerKey, ownerKey)))
      .limit(1)
    return row ?? null
  }

  async setUploadStatus(id: string, status: DocumentStatus): Promise<void> {
    await this.db.update(documentUploads).set({ status }).where(eq(documentUploads.id, id))
  }

  async saveExtraction(uploadId: string, extraction: DocumentExtraction): Promise<DocumentExtractionRecord> {
    return this.db.transaction(async (tx) => {
      const [row] = await tx
        .insert(documentExtractions)
        .values({
          id: extraction.extractionId,
          uploadId,
          detectedForm: extraction.detectedForm,
          method: extraction.extractionMethod,
          confidence: extraction.confidence.toFixed(3),
          status: extraction.status,
          result: extraction,
        })
        .returning()
      if (!row) throw new Error("Nie udało się zapisać wyniku ekstrakcji")
      if (extraction.findings.length > 0) {
        await tx.insert(documentValidationFindings).values(
          extraction.findings.map((finding) => ({
            extractionId: row.id,
            severity: finding.severity,
            code: finding.code,
            fieldKey: finding.fieldKey,
            message: finding.message,
            legalBasis: finding.legalBasis,
          }))
        )
      }
      await tx.update(documentUploads).set({ status: extraction.status }).where(eq(documentUploads.id, uploadId))
      return row
    })
  }

  async latestExtraction(uploadId: string): Promise<DocumentExtractionRecord | null> {
    const [row] = await this.db
      .select()
      .from(documentExtractions)
      .where(eq(documentExtractions.uploadId, uploadId))
      .orderBy(desc(documentExtractions.createdAt))
      .limit(1)
    return row ?? null
  }

  async updateExtraction(extractionId: string, extraction: DocumentExtraction, confirmed: boolean): Promise<void> {
    await this.db.transaction(async (tx) => {
      const [row] = await tx
        .update(documentExtractions)
        .set({ result: extraction, status: extraction.status, confirmedAt: confirmed ? new Date() : null, updatedAt: new Date() })
        .where(eq(documentExtractions.id, extractionId))
        .returning({ uploadId: documentExtractions.uploadId })
      await tx.delete(documentValidationFindings).where(eq(documentValidationFindings.extractionId, extractionId))
      if (extraction.findings.length > 0) {
        await tx.insert(documentValidationFindings).values(
          extraction.findings.map((finding) => ({
            extractionId,
            severity: finding.severity,
            code: finding.code,
            fieldKey: finding.fieldKey,
            message: finding.message,
            legalBasis: finding.legalBasis,
          }))
        )
      }
      if (row) await tx.update(documentUploads).set({ status: extraction.status }).where(eq(documentUploads.id, row.uploadId))
    })
  }

  async replaceChecklist(input: SaveChecklistInput): Promise<ChecklistItem[]> {
    return this.db.transaction(async (tx) => {
      await tx
        .delete(checklistItems)
        .where(and(eq(checklistItems.ownerKey, input.ownerKey), eq(checklistItems.sourceDocumentId, input.sourceDocumentId)))
      if (input.items.length === 0) return []
      const rows = await tx
        .insert(checklistItems)
        .values(
          input.items.map((item) => ({
            ownerKey: input.ownerKey,
            sourceDocumentId: input.sourceDocumentId,
            templateKey: item.templateKey,
            title: item.title,
            parent: item.parent,
            preparedBy: item.preparedBy,
            submitTo: item.submitTo,
            whenText: item.when,
            dueDate: item.dueDate,
            legalBasis: item.legalBasis,
            ruleSetVersion: input.ruleSetVersion,
            inputHash: input.inputHash,
          }))
        )
        .returning()
      return rows.map(toChecklist)
    })
  }

  async listChecklist(ownerKey: string, sourceDocumentId: string): Promise<ChecklistItem[]> {
    const rows = await this.db
      .select()
      .from(checklistItems)
      .where(and(eq(checklistItems.ownerKey, ownerKey), eq(checklistItems.sourceDocumentId, sourceDocumentId)))
      .orderBy(checklistItems.createdAt)
    return rows.map(toChecklist)
  }

  async deleteUpload(id: string): Promise<void> {
    await this.db.delete(documentUploads).where(eq(documentUploads.id, id))
  }

  async listExpired(now: Date, limit = 100): Promise<Pick<DocumentUploadRecord, "id" | "storageKey">[]> {
    return this.db
      .select({ id: documentUploads.id, storageKey: documentUploads.storageKey })
      .from(documentUploads)
      .where(lte(documentUploads.deleteAfter, now))
      .limit(limit)
  }

  /** Test helper: removes uploads by id (used by integration tests' cleanup). */
  async deleteMany(ids: string[]): Promise<void> {
    if (ids.length > 0) await this.db.delete(documentUploads).where(inArray(documentUploads.id, ids))
  }
}
