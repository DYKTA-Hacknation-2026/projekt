import { createHash } from "node:crypto"
import { readFile } from "node:fs/promises"
import path from "node:path"

import { warsawToday } from "@zpr/ai"
import {
  DOCUMENT_PROCESSING_CONSENT,
  FORM_TITLES,
  MAX_DOCUMENT_BYTES,
  documentExtractionSchema,
  type ChecklistItem,
  type ConfirmFieldsRequest,
  type DocumentAnalysis,
  type DocumentAssessment,
  type DocumentExtraction,
  type DocumentMeta,
  type SampleCaseExpected,
  type SampleCaseSummary,
} from "@zpr/contracts/documents"
import type { Env } from "@zpr/contracts/env"
import { AppError } from "@zpr/contracts/problem"
import { uuidv7 } from "@zpr/db"
import type { DocumentRepository, DocumentUploadRecord } from "@zpr/db/repositories"
import {
  PdfReadError,
  applyFieldUpdates,
  createTesseractOcr,
  extractFromPdf,
  hasPdfSignature,
  mapDocumentFacts,
  matchFormCode,
  type FieldSuggester,
  type OcrEngine,
} from "@zpr/documents"
import { SYNTHETIC_SAMPLE_CASES, buildSyntheticSamplePdf, findSyntheticSample, sampleSummary } from "@zpr/documents/samples"
import { LocalFileStorage, loadPrivateSampleCases, type DocumentStorage, type PrivateSampleCase } from "@zpr/documents/storage"

import { engineService } from "@/server/services/engine"

/**
 * Document use cases (FR-PRD-06, FR-DEMO-01/02, AD-08):
 * upload → extract → confirm → engine → checklist, plus TTL cleanup and
 * sample cases. Nothing here logs file names, content or field values.
 */

export interface DocumentServiceDeps {
  repo: DocumentRepository
  storage: DocumentStorage
  env: Pick<
    Env,
    | "DOCUMENT_TTL_HOURS"
    | "DOCUMENT_EXTRACTION_TIMEOUT_MS"
    | "DOCUMENT_OCR_ENABLED"
    | "DOCUMENT_LLM_FALLBACK"
    | "DOCUMENT_DEMO_MODE"
    | "SAMPLE_CASES_DIR"
  >
  now?: () => Date
  today?: () => string
  /** Built lazily only when the fallback is enabled and the user consented. */
  suggester?: () => FieldSuggester | null
  ocr?: OcrEngine | null
}

const SAMPLE_PREFIX = "sample:"

function sha256(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex")
}

/** Validates an uploaded file; never trusts the declared type or name. */
export async function readUploadedPdf(file: FormDataEntryValue | null): Promise<{ bytes: Uint8Array; fileNameHint: string | undefined }> {
  if (!(file instanceof File)) {
    throw new AppError(400, "BAD_REQUEST", "Brak pliku. Dołącz plik PDF w polu „file”.")
  }
  if (file.size === 0) throw new AppError(400, "BAD_REQUEST", "Plik jest pusty.")
  if (file.size > MAX_DOCUMENT_BYTES) throw new AppError(413, "PAYLOAD_TOO_LARGE", "Maksymalny rozmiar pliku to 10 MB.")
  const declared = file.type.toLowerCase()
  if (declared !== "" && declared !== "application/pdf" && declared !== "application/x-pdf" && declared !== "application/octet-stream") {
    throw new AppError(415, "UNSUPPORTED_MEDIA_TYPE", "Obsługiwane są wyłącznie pliki PDF.")
  }
  const bytes = new Uint8Array(await file.arrayBuffer())
  if (!hasPdfSignature(bytes)) {
    throw new AppError(415, "UNSUPPORTED_MEDIA_TYPE", "Plik nie ma poprawnej sygnatury PDF (%PDF-).")
  }
  const code = matchFormCode(file.name.replace(/\.pdf$/i, "").replace(/[_.]+/g, " "))
  return { bytes, fileNameHint: code ?? undefined }
}

export function hasDocumentConsent(value: FormDataEntryValue | null): boolean {
  return typeof value === "string" && (value === DOCUMENT_PROCESSING_CONSENT || value === "true")
}

export function createDocumentService(deps: DocumentServiceDeps) {
  const now = deps.now ?? (() => new Date())
  const today = deps.today ?? (() => warsawToday(now()))
  let privateCases: Promise<PrivateSampleCase[]> | null = null
  const loadPrivate = () => (privateCases ??= loadPrivateSampleCases(deps.env.SAMPLE_CASES_DIR))

  const deleteAfter = () => new Date(now().getTime() + deps.env.DOCUMENT_TTL_HOURS * 3_600_000)

  function toMeta(row: DocumentUploadRecord): DocumentMeta {
    return {
      documentId: row.id,
      status: row.status,
      origin: row.origin,
      sampleCaseId: row.sampleCaseId ?? undefined,
      mime: "application/pdf",
      size: row.size,
      sha256: row.sha256,
      createdAt: row.createdAt.toISOString(),
      deleteAfter: row.deleteAfter.toISOString(),
      previewPath: `/api/v1/documents/${row.id}/file`,
    }
  }

  async function requireUpload(id: string, ownerKey: string): Promise<DocumentUploadRecord> {
    const row = await deps.repo.getOwnedUpload(id, ownerKey)
    // An expired upload is treated as gone even before the purge job runs.
    if (!row || row.deleteAfter.getTime() <= now().getTime()) {
      throw new AppError(404, "NOT_FOUND", "Nie znaleziono dokumentu albo upłynął czas jego przechowywania.")
    }
    return row
  }

  async function sampleBytes(sampleId: string): Promise<Uint8Array | null> {
    const synthetic = buildSyntheticSamplePdf(sampleId)
    if (synthetic) return synthetic
    const entry = (await loadPrivate()).find((item) => item.id === sampleId)
    return entry ? new Uint8Array(await readFile(entry.filePath)) : null
  }

  async function fileBytes(row: DocumentUploadRecord): Promise<Uint8Array> {
    const bytes = row.storageKey.startsWith(SAMPLE_PREFIX)
      ? await sampleBytes(row.storageKey.slice(SAMPLE_PREFIX.length))
      : await deps.storage.get(row.storageKey)
    if (!bytes) throw new AppError(404, "NOT_FOUND", "Plik dokumentu nie jest już dostępny.")
    return bytes
  }

  async function expectedFor(sampleId: string | null): Promise<SampleCaseExpected | undefined> {
    if (!sampleId || !deps.env.DOCUMENT_DEMO_MODE) return undefined
    return findSyntheticSample(sampleId)?.expected ?? (await loadPrivate()).find((item) => item.id === sampleId)?.expected
  }

  async function cleanupExpired(): Promise<number> {
    const expired = await deps.repo.listExpired(now())
    for (const row of expired) {
      if (!row.storageKey.startsWith(SAMPLE_PREFIX)) await deps.storage.delete(row.storageKey)
      await deps.repo.deleteUpload(row.id)
    }
    return expired.length
  }

  async function runExtraction(row: DocumentUploadRecord, allowAiAssist: boolean): Promise<DocumentExtraction> {
    await deps.repo.setUploadStatus(row.id, "EXTRACTING")
    const bytes = await fileBytes(row)
    const suggester = allowAiAssist && deps.env.DOCUMENT_LLM_FALLBACK && row.origin === "USER_UPLOAD" ? (deps.suggester?.() ?? null) : null
    let extraction: DocumentExtraction
    try {
      extraction = await extractFromPdf(bytes, {
        documentId: row.id,
        asOf: today(),
        origin: row.origin,
        sampleCaseId: row.sampleCaseId ?? undefined,
        fileName: row.fileNameHint ? `${row.fileNameHint}.pdf` : undefined,
        timeoutMs: deps.env.DOCUMENT_EXTRACTION_TIMEOUT_MS,
        ocr: deps.env.DOCUMENT_OCR_ENABLED ? (deps.ocr ?? createTesseractOcr()) : null,
        suggester,
        now,
      })
    } catch (error) {
      await deps.repo.setUploadStatus(row.id, "FAILED")
      if (error instanceof PdfReadError) {
        throw new AppError(error.code === "PDF_TIMEOUT" ? 504 : 422, error.code === "PDF_TIMEOUT" ? "TIMEOUT" : "DOCUMENT_UNREADABLE", error.message)
      }
      throw error
    }
    const withId = { ...extraction, extractionId: uuidv7() }
    await deps.repo.saveExtraction(row.id, withId)
    return withId
  }

  async function currentExtraction(row: DocumentUploadRecord): Promise<{ id: string; extraction: DocumentExtraction; confirmedAt: Date | null } | null> {
    const record = await deps.repo.latestExtraction(row.id)
    if (!record) return null
    return { id: record.id, extraction: documentExtractionSchema.parse(record.result), confirmedAt: record.confirmedAt }
  }

  function checklistFrom(report: ReturnType<typeof engineService.documents>): Omit<ChecklistItem, "id" | "status">[] {
    return report.documents.map((doc) => ({
      templateKey: doc.code,
      title: doc.name,
      parent: doc.parent,
      preparedBy: doc.preparedBy,
      submitTo: doc.submitTo,
      when: doc.when,
      dueDate: doc.dueDate ?? null,
      legalBasis: doc.legalBasis,
      note: doc.note,
    }))
  }

  function compare(expected: SampleCaseExpected, assessment: DocumentAssessment): NonNullable<DocumentAssessment["comparison"]> {
    const details: string[] = []
    const determination = assessment.eligibility?.eligibility.determinations.find((item) => item.benefit === expected.benefit && item.parent === expected.parent)
    const statusOk = determination?.status === expected.status
    details.push(`Werdykt: oczekiwany ${expected.status}, wynik ${determination?.status ?? "brak"}`)
    let basisOk = true
    if (expected.monthlyBasisGrosze !== undefined) {
      const basis = assessment.calculation?.basis.find((item) => item.parent === expected.parent)?.monthlyBasisGrosze ?? null
      basisOk = basis === expected.monthlyBasisGrosze
      details.push(`Podstawa: oczekiwana ${expected.monthlyBasisGrosze} gr, wynik ${basis ?? "brak"} gr`)
    }
    let amountOk = true
    if (expected.amountGrosze !== undefined) {
      const amount = assessment.calculation?.totals.byBenefit.find((item) => item.benefit === expected.benefit && item.parent === expected.parent)?.totalGrosze ?? null
      amountOk = amount === expected.amountGrosze
      details.push(`Kwota: oczekiwana ${expected.amountGrosze ?? "brak"} gr, wynik ${amount ?? "brak"} gr`)
    }
    return { expected, matches: statusOk && basisOk && amountOk, details }
  }

  async function assess(row: DocumentUploadRecord, extraction: DocumentExtraction, ownerKey: string): Promise<DocumentAssessment> {
    const mapping = mapDocumentFacts(extraction)
    const base: DocumentAssessment = {
      documentId: row.id,
      status: extraction.status,
      extraction,
      mapping,
      eligibility: null,
      calculation: null,
      documents: null,
      routing: null,
      timeline: null,
      checklist: [],
    }
    if (extraction.status !== "CONFIRMED" || !mapping.request) return base

    const request = { ...mapping.request, asOf: today() }
    const eligibility = engineService.eligibility(request)
    const calculation = engineService.calculate(request)
    const documents = engineService.documents(request)
    const timeline = engineService.timeline(request)
    const checklist = await deps.repo.replaceChecklist({
      ownerKey,
      sourceDocumentId: row.id,
      ruleSetVersion: calculation.ruleSet.version,
      inputHash: calculation.inputHash,
      items: checklistFrom(documents),
    })
    const result: DocumentAssessment = {
      ...base,
      eligibility,
      calculation: {
        totals: calculation.totals,
        basis: calculation.basis,
        applicableBenefits: calculation.applicableBenefits,
        status: calculation.status,
        ruleSet: calculation.ruleSet,
        inputHash: calculation.inputHash,
        warnings: calculation.warnings,
        missingEvidence: calculation.missingEvidence,
      },
      documents: documents.documents,
      routing: documents.routing,
      timeline: timeline.timeline,
      checklist,
    }
    const expected = await expectedFor(row.sampleCaseId)
    if (expected) result.comparison = compare(expected, result)
    return result
  }

  return {
    cleanupExpired,

    async upload(input: { ownerKey: string; file: FormDataEntryValue | null; consent: FormDataEntryValue | null }): Promise<DocumentMeta> {
      if (!hasDocumentConsent(input.consent)) {
        throw new AppError(403, "CONSENT_REQUIRED", "Analiza dokumentu wymaga zgody na przetwarzanie dokumentu (DOCUMENT_PROCESSING).")
      }
      const { bytes, fileNameHint } = await readUploadedPdf(input.file)
      await cleanupExpired()
      const id = uuidv7()
      const storageKey = `uploads/${id}`
      await deps.storage.put(storageKey, bytes)
      try {
        const row = await deps.repo.createUpload({
          id,
          ownerKey: input.ownerKey,
          storageKey,
          sha256: sha256(bytes),
          mime: "application/pdf",
          size: bytes.length,
          origin: "USER_UPLOAD",
          fileNameHint,
          consentGrantedAt: now(),
          deleteAfter: deleteAfter(),
        })
        return toMeta(row)
      } catch (error) {
        await deps.storage.delete(storageKey)
        throw error
      }
    },

    async get(id: string, ownerKey: string): Promise<DocumentMeta> {
      return toMeta(await requireUpload(id, ownerKey))
    },

    async file(id: string, ownerKey: string): Promise<Uint8Array> {
      return fileBytes(await requireUpload(id, ownerKey))
    },

    async extract(id: string, ownerKey: string, options: { allowAiAssist?: boolean } = {}): Promise<DocumentExtraction> {
      return runExtraction(await requireUpload(id, ownerKey), Boolean(options.allowAiAssist))
    },

    async extraction(id: string, ownerKey: string): Promise<DocumentAssessment> {
      const row = await requireUpload(id, ownerKey)
      const current = await currentExtraction(row)
      if (!current) throw new AppError(404, "NOT_FOUND", "Dokument nie został jeszcze przeanalizowany.")
      const checklist = await deps.repo.listChecklist(ownerKey, row.id)
      const mapping = mapDocumentFacts(current.extraction)
      return { documentId: row.id, status: current.extraction.status, extraction: current.extraction, mapping, eligibility: null, calculation: null, documents: null, routing: null, timeline: null, checklist }
    },

    async confirm(id: string, ownerKey: string, request: ConfirmFieldsRequest): Promise<DocumentAssessment> {
      const row = await requireUpload(id, ownerKey)
      const current = await currentExtraction(row)
      if (!current) throw new AppError(409, "CONFLICT", "Najpierw uruchom analizę dokumentu.")
      const known = new Set(current.extraction.fields.map((field) => field.key))
      const unknown = request.fields.find((field) => !known.has(field.key))
      if (unknown) throw new AppError(422, "VALIDATION_ERROR", "Nieznane pole dokumentu.", { issues: [{ path: "fields", message: `Nieznany klucz: ${unknown.key}` }] })
      const updated = applyFieldUpdates(current.extraction, request.fields, { asOf: request.asOf ?? today() })
      await deps.repo.updateExtraction(current.id, updated, updated.status === "CONFIRMED")
      return assess(row, updated, ownerKey)
    },

    async remove(id: string, ownerKey: string): Promise<void> {
      const row = await deps.repo.getOwnedUpload(id, ownerKey)
      if (!row) throw new AppError(404, "NOT_FOUND", "Nie znaleziono dokumentu.")
      if (!row.storageKey.startsWith(SAMPLE_PREFIX)) await deps.storage.delete(row.storageKey)
      await deps.repo.deleteUpload(row.id)
    },

    async listSampleCases(): Promise<SampleCaseSummary[]> {
      const all: SampleCaseSummary[] = [...SYNTHETIC_SAMPLE_CASES.map(sampleSummary), ...(await loadPrivate()).map(sampleSummary)]
      return all.map((item) => (deps.env.DOCUMENT_DEMO_MODE ? item : { ...item, expected: undefined }))
    },

    async loadSampleCase(sampleId: string, ownerKey: string): Promise<{ document: DocumentMeta; extraction: DocumentExtraction }> {
      const bytes = await sampleBytes(sampleId)
      if (!bytes) throw new AppError(404, "NOT_FOUND", "Nie znaleziono wybranego przykładu.")
      await cleanupExpired()
      const row = await deps.repo.createUpload({
        id: uuidv7(),
        ownerKey,
        storageKey: `${SAMPLE_PREFIX}${sampleId}`,
        sha256: sha256(bytes),
        mime: "application/pdf",
        size: bytes.length,
        origin: "SAMPLE_CASE",
        sampleCaseId: sampleId,
        deleteAfter: deleteAfter(),
      })
      const extraction = await runExtraction(row, false)
      return { document: toMeta({ ...row, status: extraction.status }), extraction }
    },

    /** @deprecated Backs `POST /documents/analyze` until every client uses the new endpoints. */
    async legacyAnalyze(input: { ownerKey: string; sampleCase?: string; file?: FormDataEntryValue | null; consent: FormDataEntryValue | null }): Promise<DocumentAnalysis> {
      const result = input.sampleCase
        ? await this.loadSampleCase(input.sampleCase, input.ownerKey)
        : await (async () => {
            const document = await this.upload({ ownerKey: input.ownerKey, file: input.file ?? null, consent: input.consent })
            return { document, extraction: await this.extract(document.documentId, input.ownerKey) }
          })()
      const { extraction } = result
      return {
        id: extraction.documentId,
        fileName: input.sampleCase ? (findSyntheticSample(input.sampleCase)?.fileName ?? "przyklad.pdf") : "dokument.pdf",
        formCode: extraction.detectedForm,
        formTitle: FORM_TITLES[extraction.detectedForm],
        extractionMode: "deterministic",
        simulated: extraction.origin === "SAMPLE_CASE",
        requiresConfirmation: true,
        fields: extraction.fields.map((field) => ({ key: field.key, label: field.label, value: field.value, confidence: field.confidence, source: field.source })),
        warnings: extraction.findings.map((finding) => finding.message),
        detectedAt: extraction.detectedAt,
        extraction,
      }
    },
  }
}

export type DocumentService = ReturnType<typeof createDocumentService>

export function defaultStorageDir(env: { DOCUMENT_STORAGE_DIR?: string }): string {
  return path.resolve(env.DOCUMENT_STORAGE_DIR ?? path.join(process.cwd(), "var", "uploads"))
}

export function createLocalStorage(env: { DOCUMENT_STORAGE_DIR?: string }): DocumentStorage {
  return new LocalFileStorage(defaultStorageDir(env))
}
