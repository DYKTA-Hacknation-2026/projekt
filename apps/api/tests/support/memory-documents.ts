import type { ChecklistItem, DocumentExtraction } from "@zpr/contracts/documents"
import type {
  CreateUploadInput,
  DocumentExtractionRecord,
  DocumentRepository,
  DocumentUploadRecord,
  SaveChecklistInput,
} from "@zpr/db/repositories"

/** In-memory `DocumentRepository` with the same cascade semantics as the SQL schema. */
export class MemoryDocumentRepository implements DocumentRepository {
  uploads = new Map<string, DocumentUploadRecord>()
  extractions = new Map<string, DocumentExtractionRecord>()
  findings = new Map<string, DocumentExtraction["findings"]>()
  checklists = new Map<string, ChecklistItem[] & { ownerKey?: string }>()
  private sequence = 0

  async createUpload(input: CreateUploadInput): Promise<DocumentUploadRecord> {
    const row: DocumentUploadRecord = {
      id: input.id,
      ownerKey: input.ownerKey,
      ownerUserId: null,
      storageKey: input.storageKey,
      sha256: input.sha256,
      mime: input.mime,
      size: input.size,
      origin: input.origin,
      sampleCaseId: input.sampleCaseId ?? null,
      fileNameHint: input.fileNameHint ?? null,
      status: "UPLOADED",
      consentGrantedAt: input.consentGrantedAt ?? null,
      deleteAfter: input.deleteAfter,
      createdAt: new Date(),
    }
    this.uploads.set(row.id, row)
    return row
  }

  async getOwnedUpload(id: string, ownerKey: string) {
    const row = this.uploads.get(id)
    return row && row.ownerKey === ownerKey ? row : null
  }

  async setUploadStatus(id: string, status: DocumentUploadRecord["status"]) {
    const row = this.uploads.get(id)
    if (row) row.status = status
  }

  async saveExtraction(uploadId: string, extraction: DocumentExtraction): Promise<DocumentExtractionRecord> {
    this.sequence += 1
    const row: DocumentExtractionRecord = {
      id: extraction.extractionId!,
      uploadId,
      detectedForm: extraction.detectedForm,
      method: extraction.extractionMethod,
      confidence: extraction.confidence.toFixed(3),
      status: extraction.status,
      result: structuredClone(extraction),
      confirmedAt: null,
      createdAt: new Date(Date.now() + this.sequence),
      updatedAt: new Date(),
    }
    this.extractions.set(row.id, row)
    this.findings.set(row.id, extraction.findings)
    await this.setUploadStatus(uploadId, extraction.status)
    return row
  }

  async latestExtraction(uploadId: string) {
    return [...this.extractions.values()].filter((row) => row.uploadId === uploadId).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0] ?? null
  }

  async updateExtraction(extractionId: string, extraction: DocumentExtraction, confirmed: boolean) {
    const row = this.extractions.get(extractionId)
    if (!row) return
    row.result = structuredClone(extraction)
    row.status = extraction.status
    row.confirmedAt = confirmed ? new Date() : null
    this.findings.set(extractionId, extraction.findings)
    await this.setUploadStatus(row.uploadId, extraction.status)
  }

  async replaceChecklist(input: SaveChecklistInput): Promise<ChecklistItem[]> {
    const items = input.items.map((item, index) => ({ ...item, id: `${input.sourceDocumentId}-${index}`, status: "TODO" as const }))
    this.checklists.set(`${input.ownerKey}:${input.sourceDocumentId}`, items)
    return items
  }

  async listChecklist(ownerKey: string, sourceDocumentId: string) {
    return this.checklists.get(`${ownerKey}:${sourceDocumentId}`) ?? []
  }

  async deleteUpload(id: string) {
    this.uploads.delete(id)
    for (const [key, row] of this.extractions) {
      if (row.uploadId === id) {
        this.extractions.delete(key)
        this.findings.delete(key)
      }
    }
  }

  async listExpired(now: Date) {
    return [...this.uploads.values()].filter((row) => row.deleteAfter.getTime() <= now.getTime()).map(({ id, storageKey }) => ({ id, storageKey }))
  }
}
