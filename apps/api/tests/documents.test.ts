import { beforeEach, describe, expect, it, vi } from "vitest"

import { MAX_DOCUMENT_BYTES, type DocumentAssessment, type DocumentExtraction } from "@zpr/contracts/documents"
import { formPage, writePdf } from "@zpr/documents/pdf"
import { MemoryStorage } from "@zpr/documents/storage"

import { createDocumentService, type DocumentService } from "@/server/services/documents"

import { MemoryDocumentRepository } from "./support/memory-documents"

/**
 * REST tests of `/documents/*` and `/sample-cases/*` over the real service
 * and extraction pipeline, with an in-memory repository and storage. The
 * PostgreSQL adapter is covered by `documents-db.test.ts`.
 */

const state = vi.hoisted(() => ({ service: null as unknown, now: new Date("2026-11-21T10:00:00Z") }))

vi.mock("@/server/container", () => ({ getDocumentService: () => state.service }))

const { POST: upload } = await import("@/app/api/v1/documents/route")
const documentRoute = await import("@/app/api/v1/documents/[id]/route")
const { GET: getFile } = await import("@/app/api/v1/documents/[id]/file/route")
const { POST: extract } = await import("@/app/api/v1/documents/[id]/extract/route")
const { GET: getExtraction } = await import("@/app/api/v1/documents/[id]/extraction/route")
const { PUT: putFields } = await import("@/app/api/v1/documents/[id]/fields/route")
const { GET: listSamples } = await import("@/app/api/v1/sample-cases/route")
const { POST: loadSample } = await import("@/app/api/v1/sample-cases/[id]/load/route")
const legacy = await import("@/app/api/v1/documents/analyze/route")

let repo: MemoryDocumentRepository
let storage: MemoryStorage
let client = 0
let cookie = ""

beforeEach(() => {
  repo = new MemoryDocumentRepository()
  storage = new MemoryStorage()
  state.now = new Date("2026-11-21T10:00:00Z")
  state.service = createDocumentService({
    repo,
    storage,
    env: { DOCUMENT_TTL_HOURS: 24, DOCUMENT_EXTRACTION_TIMEOUT_MS: 10_000, DOCUMENT_OCR_ENABLED: false, DOCUMENT_LLM_FALLBACK: false, DOCUMENT_DEMO_MODE: true, SAMPLE_CASES_DIR: undefined },
    now: () => state.now,
    today: () => "2026-11-21",
  }) satisfies DocumentService
  client += 1
  cookie = ""
})

type Handler = (request: Request, context: { params: Promise<{ id: string }> }) => Promise<Response>

async function call(handler: Handler, init: { method?: string; body?: BodyInit; json?: unknown; id?: string; headers?: Record<string, string> } = {}) {
  const headers = new Headers({ "x-forwarded-for": `10.9.${client % 200}.1`, ...init.headers })
  if (cookie) headers.set("cookie", cookie)
  if (init.json !== undefined) headers.set("content-type", "application/json")
  const request = new Request("http://localhost/api/v1/documents", {
    method: init.method ?? "POST",
    headers,
    body: init.json !== undefined ? JSON.stringify(init.json) : init.body,
  })
  const response = await handler(request, { params: Promise.resolve({ id: init.id ?? "" }) })
  const setCookie = response.headers.get("set-cookie")
  if (setCookie) cookie = setCookie.split(";")[0]!
  return response
}

function pdfForm(bytes: Uint8Array | string, options: { consent?: string | null; name?: string; type?: string } = {}) {
  const form = new FormData()
  const content = typeof bytes === "string" ? new TextEncoder().encode(bytes) : bytes
  form.set("file", new File([new Uint8Array(content)], options.name ?? "dokument.pdf", { type: options.type ?? "application/pdf" }))
  if (options.consent !== null) form.set("consent", options.consent ?? "DOCUMENT_PROCESSING")
  return form
}

const z3Pdf = writePdf({
  pages: [
    formPage(["ZAŚWIADCZENIE PŁATNIKA SKŁADEK Z-3", "DOKUMENT TESTOWY"], [
      ["Imię", "Jan"],
      ["Nazwisko", "Testowy"],
      ["Wnioskodawca", "ojciec dziecka"],
      ["Rodzaj zasiłku", "zasiłek za urlop ojcowski"],
      ["Początek ubezpieczenia chorobowego", "01.03.2023"],
      ["Podstawa wymiaru zasiłku", "6 000,00 zł"],
      ["Data porodu", "10.11.2026"],
    ]),
  ],
})

const confirmAll = (extraction: DocumentExtraction) => ({
  fields: extraction.fields.map((field) => ({ key: field.key, value: field.value, confirmed: true })),
})

describe("POST /documents — upload validation", () => {
  it("stores a valid PDF privately with a 24 h TTL and returns its id", async () => {
    const response = await call(upload, { body: pdfForm(z3Pdf) })
    expect(response.status).toBe(201)
    const body = await response.json()
    expect(body).toMatchObject({ status: "UPLOADED", origin: "USER_UPLOAD", mime: "application/pdf", size: z3Pdf.length, deleteAfter: "2026-11-22T10:00:00.000Z" })
    expect(body.previewPath).toBe(`/api/v1/documents/${body.documentId}/file`)
    expect(body).not.toHaveProperty("url")
    expect(storage.files.has(`uploads/${body.documentId}`)).toBe(true)
    const row = repo.uploads.get(body.documentId)!
    expect(row.consentGrantedAt).toBeInstanceOf(Date)
    expect(JSON.stringify(row)).not.toContain("dokument.pdf")
  })

  it("403 without the DOCUMENT_PROCESSING consent — nothing is stored", async () => {
    const response = await call(upload, { body: pdfForm(z3Pdf, { consent: null }) })
    expect(response.status).toBe(403)
    expect(response.headers.get("content-type")).toContain("application/problem+json")
    expect(await response.json()).toMatchObject({ code: "CONSENT_REQUIRED" })
    expect(storage.files.size).toBe(0)
    expect(repo.uploads.size).toBe(0)
  })

  it("400 for an empty file or a missing file", async () => {
    expect((await call(upload, { body: pdfForm("") })).status).toBe(400)
    const form = new FormData()
    form.set("consent", "DOCUMENT_PROCESSING")
    expect((await call(upload, { body: form })).status).toBe(400)
  })

  it("413 above 10 MB", async () => {
    const big = new Uint8Array(MAX_DOCUMENT_BYTES + 1)
    big.set(new TextEncoder().encode("%PDF-"))
    const response = await call(upload, { body: pdfForm(big) })
    expect(response.status).toBe(413)
    expect(await response.json()).toMatchObject({ code: "PAYLOAD_TOO_LARGE" })
  })

  it("415 for a file without the %PDF- signature, even when named .pdf with a PDF type", async () => {
    const response = await call(upload, { body: pdfForm("MZ\x90\x00 executable", { name: "Z-3.pdf", type: "application/pdf" }) })
    expect(response.status).toBe(415)
    expect(await response.json()).toMatchObject({ code: "UNSUPPORTED_MEDIA_TYPE" })
  })

  it("415 for a declared non-PDF type and for a non-multipart body", async () => {
    expect((await call(upload, { body: pdfForm(z3Pdf, { type: "text/html" }) })).status).toBe(415)
    expect((await call(upload, { json: { file: "x" } })).status).toBe(415)
  })

  it("rate-limits /documents/*", async () => {
    let last = 0
    for (let index = 0; index < 35; index += 1) last = (await call(upload, { body: pdfForm(z3Pdf, { consent: null }) })).status
    expect(last).toBe(429)
  })
})

describe("upload → extract → confirm → engine", () => {
  async function uploadAndExtract(bytes = z3Pdf, name = "skan.pdf") {
    const meta = await (await call(upload, { body: pdfForm(bytes, { name }) })).json()
    const response = await call(extract, { id: meta.documentId })
    expect(response.status).toBe(200)
    return { id: meta.documentId as string, extraction: (await response.json()) as DocumentExtraction }
  }

  it("extracts fields with provenance and confidence from the content", async () => {
    const { extraction } = await uploadAndExtract()
    expect(extraction).toMatchObject({ detectedForm: "Z-3", status: "NEEDS_REVIEW", extractionMethod: "TEMPLATE", processedLocally: true })
    expect(extraction.fields.find((field) => field.key === "podstawa")).toMatchObject({ value: "6000.00", source: "TEMPLATE", page: 1, semanticKey: "monthlyBasisGrosze" })
    expect([...repo.extractions.values()]).toHaveLength(1)
  })

  it("regression: a 6000 zł basis from Z-3 stays 6000 zł (not 6000 × (1 − 13,71%))", async () => {
    const { id, extraction } = await uploadAndExtract()
    const response = await call(putFields, { method: "PUT", id, json: confirmAll(extraction) })
    expect(response.status).toBe(200)
    const body = (await response.json()) as DocumentAssessment
    expect(body.status).toBe("CONFIRMED")
    expect(body.mapping.prefill).toMatchObject({ monthlyBasisGrosze: 600_000, source: "DOCUMENT" })
    expect(body.mapping.prefill).not.toHaveProperty("grossMonthlyGrosze")
    expect(body.calculation?.basis.find((basis) => basis.parent === "FATHER")).toMatchObject({ monthlyBasisGrosze: 600_000, method: "KNOWN_BASIS" })
    expect(body.calculation?.totals.byBenefit.find((item) => item.benefit === "PATERNITY")?.totalGrosze).toBe(280_000)
    expect(body.eligibility?.eligibility.determinations.find((item) => item.benefit === "PATERNITY")?.status).toBe("ELIGIBLE")
    expect(body.timeline?.length).toBeGreaterThan(0)
    expect(body.checklist.length).toBeGreaterThan(0)
    expect(body.checklist.every((item) => item.legalBasis.length > 0)).toBe(true)
    expect(await repo.listChecklist(cookieSid(), id)).toHaveLength(body.checklist.length)
  })

  it("does not run the engine until required fields are confirmed; placeholders are rejected", async () => {
    const { id, extraction } = await uploadAndExtract()
    const response = await call(putFields, {
      method: "PUT",
      id,
      json: { fields: extraction.fields.map((field) => ({ key: field.key, value: field.key === "podstawa" ? "Do uzupełnienia" : field.value, confirmed: true })) },
    })
    const body = (await response.json()) as DocumentAssessment
    expect(body.status).toBe("NEEDS_REVIEW")
    expect(body.calculation).toBeNull()
    expect(body.mapping.prefill?.monthlyBasisGrosze).toBeUndefined()
    expect(body.extraction.findings).toContainEqual(expect.objectContaining({ code: "FIELD_INVALID", fieldKey: "podstawa" }))
  })

  it("keeps the original confidence and records the edit", async () => {
    const { id, extraction } = await uploadAndExtract()
    const original = extraction.fields.find((field) => field.key === "podstawa")!
    const body = (await (await call(putFields, { method: "PUT", id, json: { fields: [{ key: "podstawa", value: "6 100,00", confirmed: true }] } })).json()) as DocumentAssessment
    expect(body.extraction.fields.find((field) => field.key === "podstawa")).toMatchObject({ value: "6100.00", userEdited: true, source: "USER", confidence: original.confidence })
  })

  it("422 for unknown field keys, 409 before extraction", async () => {
    const meta = await (await call(upload, { body: pdfForm(z3Pdf) })).json()
    expect((await call(putFields, { method: "PUT", id: meta.documentId, json: { fields: [{ key: "podstawa", value: "1", confirmed: true }] } })).status).toBe(409)
    await call(extract, { id: meta.documentId })
    expect((await call(putFields, { method: "PUT", id: meta.documentId, json: { fields: [{ key: "nieznane", value: "1", confirmed: true }] } })).status).toBe(422)
  })

  it("422 for an unreadable PDF and marks it FAILED", async () => {
    const meta = await (await call(upload, { body: pdfForm("%PDF-1.4\nbroken") })).json()
    const response = await call(extract, { id: meta.documentId })
    expect(response.status).toBe(422)
    expect(await response.json()).toMatchObject({ code: "DOCUMENT_UNREADABLE" })
    expect(repo.uploads.get(meta.documentId)?.status).toBe("FAILED")
  })

  it("serves the preview only to the owner, uncached and not frameable by other origins", async () => {
    const { id } = await uploadAndExtract()
    const response = await call(getFile, { method: "GET", id })
    expect(response.status).toBe(200)
    expect(response.headers.get("content-type")).toBe("application/pdf")
    expect(response.headers.get("cache-control")).toBe("private, no-store")
    expect(response.headers.get("content-security-policy")).toContain("frame-ancestors 'self'")
    expect(response.headers.get("x-content-type-options")).toBe("nosniff")
    expect(new Uint8Array(await response.arrayBuffer()).length).toBe(z3Pdf.length)
    cookie = ""
    expect((await call(getFile, { method: "GET", id })).status).toBe(404)
    expect((await call(documentRoute.GET, { method: "GET", id })).status).toBe(404)
  })

  it("404 for unknown or malformed ids", async () => {
    expect((await call(documentRoute.GET, { method: "GET", id: "not-a-uuid" })).status).toBe(404)
    expect((await call(getExtraction, { method: "GET", id: "0193a000-0000-7000-8000-000000000099" })).status).toBe(404)
  })

  it("DELETE removes the file, the record and the extraction immediately", async () => {
    const { id } = await uploadAndExtract()
    const response = await call(documentRoute.DELETE, { method: "DELETE", id })
    expect(response.status).toBe(204)
    expect(repo.uploads.has(id)).toBe(false)
    expect(repo.extractions.size).toBe(0)
    expect(storage.files.size).toBe(0)
    expect((await call(documentRoute.GET, { method: "GET", id })).status).toBe(404)
  })

  it("TTL: after 24 h the document is gone; the next upload purges the file and the rows", async () => {
    const { id } = await uploadAndExtract()
    state.now = new Date("2026-11-22T10:00:01Z")
    expect((await call(documentRoute.GET, { method: "GET", id })).status).toBe(404)
    expect(repo.uploads.has(id)).toBe(true)
    await call(upload, { body: pdfForm(z3Pdf) })
    expect(repo.uploads.has(id)).toBe(false)
    expect(storage.files.has(`uploads/${id}`)).toBe(false)
    expect([...repo.extractions.values()].some((row) => row.uploadId === id)).toBe(false)
  })

  it("detects the form from content even when the file name says otherwise", async () => {
    const { extraction } = await uploadAndExtract(z3Pdf, "ZAMOWIENIE.pdf")
    expect(extraction.detectedForm).toBe("Z-3")
  })
})

describe("sample cases", () => {
  it("lists synthetic cases with the expected outcome in demo mode", async () => {
    const body = await (await call(listSamples, { method: "GET" })).json()
    expect(body.sampleCases.map((item: { id: string }) => item.id)).toEqual(["anna-zam", "tomasz-z3", "kasia-z3a", "ewa-zur"])
    expect(body.sampleCases[0]).toMatchObject({ origin: "SYNTHETIC", expected: { status: "ELIGIBLE", monthlyBasisGrosze: 690_320 } })
  })

  it("anna-zam end to end: verdict, basis 6 903,20 zł from gross 8 000 zł, amount, checklist and the ✓ badge", async () => {
    const loaded = await call(loadSample, { id: "anna-zam" })
    expect(loaded.status).toBe(201)
    const { document, extraction } = await loaded.json()
    expect(document).toMatchObject({ origin: "SAMPLE_CASE", sampleCaseId: "anna-zam" })
    expect(storage.files.size).toBe(0)
    const body = (await (await call(putFields, { method: "PUT", id: document.documentId, json: confirmAll(extraction) })).json()) as DocumentAssessment
    expect(body.mapping.prefill).toMatchObject({ grossMonthlyGrosze: 800_000 })
    expect(body.calculation?.basis[0]).toMatchObject({ monthlyBasisGrosze: 690_320 })
    expect(body.comparison).toMatchObject({ matches: true })
    expect(body.routing?.[0]).toMatchObject({ parent: "MOTHER", payer: "ZUS" })
    expect(body.checklist.map((item) => item.templateKey)).toContain("Z-3")
  })

  it("ewa-zur shows the withdrawn-form finding", async () => {
    const { extraction } = await (await call(loadSample, { id: "ewa-zur" })).json()
    expect(extraction).toMatchObject({ detectedForm: "ZUR", legacyForm: true })
    expect(extraction.findings).toContainEqual(expect.objectContaining({ code: "FORM_WITHDRAWN", ruleId: "LR-05" }))
  })

  it("404 for an unknown sample", async () => {
    expect((await call(loadSample, { id: "nie-ma" })).status).toBe(404)
    expect((await call(loadSample, { id: "../etc" })).status).toBe(404)
  })
})

describe("legacy POST /documents/analyze alias", () => {
  it("keeps the old shape and adds the new extraction", async () => {
    const form = new FormData()
    form.set("sampleCase", "tomasz-z3")
    const response = await call(legacy.POST, { body: form })
    expect(response.status).toBe(200)
    expect(response.headers.get("deprecation")).toBe("true")
    const body = await response.json()
    expect(body).toMatchObject({ formCode: "Z-3", requiresConfirmation: true, extraction: { detectedForm: "Z-3" } })
    expect(body.fields.find((field: { key: string }) => field.key === "podstawa")).toMatchObject({ value: "6000.00" })
  })

  it("requires consent for uploaded files", async () => {
    expect((await call(legacy.POST, { body: pdfForm(z3Pdf, { consent: null }) })).status).toBe(403)
  })
})

function cookieSid(): string {
  const value = decodeURIComponent(cookie.split("=")[1] ?? "")
  return value.split(".")[0]!
}
