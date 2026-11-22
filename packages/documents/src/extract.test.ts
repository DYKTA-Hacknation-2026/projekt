import { describe, expect, it } from "vitest"

import { applyBlockers, type DocumentExtraction } from "@zpr/contracts/documents"

import { applyFieldUpdates, extractFromPdf } from "./extract"
import { mapDocumentFacts } from "./mapping"
import { formPage, writePdf } from "./pdf/writer"
import { scrubDocumentText, type FieldSuggester } from "./ports"
import { buildSyntheticSamplePdf } from "./samples"

const ID = "0193a000-0000-7000-8000-000000000001"
const AS_OF = "2026-11-21"

async function extract(bytes: Uint8Array, extra: Partial<Parameters<typeof extractFromPdf>[1]> = {}) {
  return extractFromPdf(bytes, { documentId: ID, asOf: AS_OF, origin: "USER_UPLOAD", ...extra })
}

const field = (extraction: DocumentExtraction, key: string) => extraction.fields.find((item) => item.key === key)
const confirmAll = (extraction: DocumentExtraction) =>
  applyFieldUpdates(
    extraction,
    extraction.fields.map((item) => ({ key: item.key, value: item.value, confirmed: true })),
    { asOf: AS_OF }
  )

describe("template extraction from a flattened PDF (synthetic Z-3)", () => {
  const pdf = writePdf({
    pages: [
      formPage(
        ["ZAŚWIADCZENIE PŁATNIKA SKŁADEK Z-3", "DOKUMENT TESTOWY"],
        [
          ["1. Imię", "Jan"],
          ["2. Nazwisko", "Testowy"],
          ["3. Początek ubezpieczenia chorobowego", "01.02.2025"],
          ["4. Podstawa wymiaru zasiłku", "6 000,00 zł"],
          ["5. Data porodu", "2026-11-10"],
        ]
      ),
    ],
  })

  it("reads every field with provenance, page and confidence", async () => {
    const extraction = await extract(pdf, { fileName: "skan.pdf" })
    expect(extraction).toMatchObject({ detectedForm: "Z-3", legacyForm: false, extractionMethod: "TEMPLATE", hasTextLayer: true, pages: 1, requiresConfirmation: true, processedLocally: true })
    expect(field(extraction, "podstawa")).toMatchObject({ value: "6000.00", rawValue: "6 000,00 zl", source: "TEMPLATE", page: 1, semanticKey: "monthlyBasisGrosze", basisKind: "NET_BASIS", required: true, confirmed: false })
    expect(field(extraction, "podstawa")!.confidence).toBeGreaterThanOrEqual(0.9)
    expect(field(extraction, "poczatekUbezpieczenia")).toMatchObject({ value: "2025-02-01", semanticKey: "insuranceStartDate" })
    // Z-3 implies an employee — filled from the form code, marked with its own confidence.
    expect(field(extraction, "tytulUbezpieczenia")).toMatchObject({ value: "EMPLOYMENT", source: "TEMPLATE" })
    expect(extraction.findings.map((finding) => finding.code)).toContain("PAYER_CERTIFICATE_ONLY")
  })

  it("maps the payer's basis to KNOWN_BASIS and the prefill to monthlyBasisGrosze — never to gross pay", async () => {
    const confirmed = confirmAll(await extract(pdf))
    const mapping = mapDocumentFacts(confirmed)
    expect(mapping.request?.parents[0]?.basis).toEqual({ method: "KNOWN_BASIS", monthlyBasisGrosze: 600_000, origin: "PAYER_CERTIFICATE" })
    expect(mapping.prefill).toMatchObject({ monthlyBasisGrosze: 600_000, source: "DOCUMENT", employmentType: "EMPLOYEE" })
    expect(mapping.prefill).not.toHaveProperty("grossMonthlyGrosze")
  })

  it("ignores unconfirmed fields", async () => {
    const mapping = mapDocumentFacts(await extract(pdf))
    expect(mapping.request).toBeNull()
    expect(mapping.prefill).toBeNull()
    expect(mapping.missing.map((item) => item.semanticKey)).toEqual(["employmentType", "monthlyBasisGrosze", "eventDate"])
  })
})

describe("AcroForm extraction (synthetic tomasz-z3)", () => {
  it("reads values from form fields and detects the form from its code field", async () => {
    const extraction = await extract(buildSyntheticSamplePdf("tomasz-z3")!, { fileName: "dokument_platnika.pdf" })
    expect(extraction.detectedForm).toBe("Z-3")
    expect(extraction.extractionMethod).toBe("ACROFORM")
    expect(extraction.detectionSignals.join(" ")).toContain("kod_formularza")
    expect(field(extraction, "podstawa")).toMatchObject({ value: "6000.00", source: "ACROFORM", page: 1 })
    expect(field(extraction, "podstawa")!.bbox).toMatchObject({ width: 220 })
    expect(field(extraction, "imie")).toMatchObject({ value: "Tomasz", source: "ACROFORM" })
    expect(field(extraction, "wnioskodawca")).toMatchObject({ value: "FATHER" })
    expect(field(extraction, "rodzajZasilku")).toMatchObject({ value: "PATERNITY" })
  })
})

describe("ZAM with an attached Z-3 page (synthetic anna-zam)", () => {
  it("merges the attachment and treats gross pay as GROSS", async () => {
    const extraction = await extract(buildSyntheticSamplePdf("anna-zam")!)
    expect(extraction).toMatchObject({ detectedForm: "ZAM", attachments: ["Z-3"], pages: 2 })
    expect(field(extraction, "wynagrodzenieBrutto")).toMatchObject({ value: "8000.00", basisKind: "GROSS", page: 2 })
    expect(field(extraction, "dataPorodu")).toMatchObject({ value: "2026-11-10", required: true })
    expect(field(extraction, "wniosek815")).toMatchObject({ value: "false" })
    const mapping = mapDocumentFacts(confirmAll(extraction))
    expect(mapping.request?.parents[0]?.basis).toEqual({ method: "GROSS_MONTHLY", grossMonthlyGrosze: 800_000 })
    expect(mapping.request?.parents[0]?.insurance).toMatchObject({ title: "EMPLOYMENT", payerSize: "UP_TO_20", startDate: "2024-09-01" })
    expect(mapping.request?.event).toMatchObject({ kind: "BIRTH", birthDate: "2026-11-10", childrenCount: 1 })
    expect(mapping.prefill).toMatchObject({ grossMonthlyGrosze: 800_000, eventDate: "2026-11-10" })
    expect(mapping.prefill).not.toHaveProperty("monthlyBasisGrosze")
  })
})

describe("validators", () => {
  it.each([
    ["ZUR", "ZUR\nWNIOSEK O ZASIŁEK"],
    ["ZAO", "ZAO\nWNIOSEK O ZASIŁEK OJCOWSKI"],
    ["Z-3b", "Z-3b\nZAŚWIADCZENIE PŁATNIKA SKŁADEK"],
  ])("flags withdrawn form %s filed after 24.10.2026 (LR-05)", async (code, heading) => {
    const pdf = writePdf({ pages: [formPage(heading.split("\n"), [["Data złożenia wniosku", "05.11.2026"], ["Data porodu", "01.11.2026"]])] })
    const extraction = await extract(pdf)
    expect(extraction).toMatchObject({ detectedForm: code, legacyForm: true })
    expect(extraction.findings).toContainEqual(expect.objectContaining({ code: "FORM_WITHDRAWN", severity: "WARNING", ruleId: "LR-05" }))
  })

  it("treats a legacy form dated before the reform as informational", async () => {
    const pdf = writePdf({ pages: [formPage(["ZUR", "WNIOSEK"], [["Data złożenia wniosku", "01.10.2026"], ["Data porodu", "20.09.2026"]])] })
    const extraction = await extract(pdf)
    expect(extraction.findings.map((finding) => finding.code)).toContain("FORM_PRE_REFORM")
    expect(extraction.findings.map((finding) => finding.code)).not.toContain("FORM_WITHDRAWN")
  })

  it("reports a missing required field as a blocking error", async () => {
    const pdf = writePdf({ pages: [formPage(["Z-3", "ZAŚWIADCZENIE PŁATNIKA SKŁADEK"], [["Imię", "Jan"]])] })
    const extraction = await extract(pdf)
    expect(extraction.findings).toContainEqual(expect.objectContaining({ severity: "ERROR", code: "FIELD_MISSING", fieldKey: "podstawa" }))
    expect(applyBlockers(extraction.fields)).toContainEqual(expect.objectContaining({ key: "podstawa", reason: "MISSING" }))
  })

  it("reports inconsistent dates", async () => {
    const pdf = writePdf({
      pages: [
        formPage(["Z-3a", "ZAŚWIADCZENIE"], [
          ["Początek ubezpieczenia chorobowego", "01.09.2026"],
          ["Koniec ubezpieczenia chorobowego", "01.08.2026"],
          ["Podstawa wymiaru zasiłku", "3000"],
        ]),
      ],
    })
    const codes = (await extract(pdf)).findings.map((finding) => finding.code)
    expect(codes).toContain("DATES_INSURANCE_ORDER")
  })

  it("warns when insurance ended before the birth (synthetic kasia-z3a)", async () => {
    const extraction = await extract(buildSyntheticSamplePdf("kasia-z3a")!)
    expect(extraction.detectedForm).toBe("Z-3a")
    expect(field(extraction, "rodzajUbezpieczenia")).toMatchObject({ value: "VOLUNTARY" })
    expect(extraction.findings).toContainEqual(expect.objectContaining({ code: "INSURANCE_ENDED_BEFORE_EVENT", ruleId: "LR-72" }))
  })

  it("never transfers an amount whose nature is unclear", async () => {
    const pdf = writePdf({ pages: [formPage(["Z-3", "ZAŚWIADCZENIE PŁATNIKA SKŁADEK"], [["Kwota", "5 000,00 zł"], ["Data porodu", "01.11.2026"]])] })
    const extraction = await extract(pdf)
    expect(field(extraction, "kwotaNiejednoznaczna")).toMatchObject({ value: "5000.00", needsReview: true })
    expect(field(extraction, "kwotaNiejednoznaczna")?.semanticKey).toBeUndefined()
    expect(extraction.findings.map((finding) => finding.code)).toContain("BASIS_AMBIGUOUS")
    const mapping = mapDocumentFacts(confirmAll(extraction))
    expect(mapping.request?.parents[0]?.basis).toBeUndefined()
    expect(mapping.prefill).not.toHaveProperty("monthlyBasisGrosze")
    expect(mapping.prefill).not.toHaveProperty("grossMonthlyGrosze")
  })

  it("flags a PDF without a text layer and an unknown form", async () => {
    const extraction = await extract(writePdf({ pages: [{ lines: [] }] }))
    expect(extraction).toMatchObject({ detectedForm: "UNKNOWN", hasTextLayer: false })
    expect(extraction.findings.map((finding) => finding.code)).toEqual(expect.arrayContaining(["FORM_UNKNOWN", "NO_TEXT_LAYER"]))
  })
})

describe("user confirmation", () => {
  it("keeps the extraction confidence and marks edits as USER", async () => {
    const extraction = await extract(buildSyntheticSamplePdf("kasia-z3a")!)
    const before = field(extraction, "podstawa")!
    const updated = applyFieldUpdates(extraction, [{ key: "podstawa", value: "4 600,00", confirmed: true }], { asOf: AS_OF })
    expect(field(updated, "podstawa")).toMatchObject({ value: "4600.00", source: "USER", userEdited: true, confirmed: true, confidence: before.confidence })
  })

  it("rejects a placeholder value for the basis", async () => {
    const extraction = await extract(buildSyntheticSamplePdf("kasia-z3a")!)
    const updated = applyFieldUpdates(extraction, [{ key: "podstawa", value: "Do uzupełnienia", confirmed: true }], { asOf: AS_OF })
    expect(applyBlockers(updated.fields)).toContainEqual(expect.objectContaining({ key: "podstawa", reason: "INVALID" }))
    expect(updated.findings).toContainEqual(expect.objectContaining({ code: "FIELD_INVALID", fieldKey: "podstawa" }))
    expect(mapDocumentFacts(updated).prefill?.monthlyBasisGrosze).toBeUndefined()
    expect(updated.status).toBe("NEEDS_REVIEW")
  })

  it("becomes CONFIRMED when every required field is confirmed and valid", async () => {
    expect(confirmAll(await extract(buildSyntheticSamplePdf("kasia-z3a")!)).status).toBe("CONFIRMED")
  })
})

describe("LLM fallback", () => {
  it("proposes only missing fields, scrubbed, always for review", async () => {
    const seen: string[] = []
    const suggester: FieldSuggester = {
      name: "fake",
      async suggest(request) {
        seen.push(request.text)
        return [
          { key: "podstawa", value: "5 100,00 zł" },
          { key: "imie", value: "Ktoś inny" },
        ]
      },
    }
    const pdf = writePdf({ pages: [formPage(["Z-3", "ZAŚWIADCZENIE"], [["Imię", "Jan"], ["PESEL", "90010112345"], ["Podstawa: według aneksu", "brak"]])] })
    const extraction = await extract(pdf, { suggester })
    expect(seen[0]).not.toContain("90010112345")
    expect(seen[0]).not.toMatch(/\bJan\b/)
    expect(field(extraction, "podstawa")).toMatchObject({ value: "5100.00", source: "LLM", needsReview: true, confirmed: false })
    expect(field(extraction, "podstawa")!.confidence).toBeLessThan(0.85)
    expect(field(extraction, "imie")).toMatchObject({ value: "Jan", source: "TEMPLATE" })
    expect(extraction).toMatchObject({ extractionMethod: "LLM_ASSISTED", processedLocally: false })
  })

  it("is never called without a suggester (no consent / disabled)", async () => {
    const extraction = await extract(buildSyntheticSamplePdf("kasia-z3a")!)
    expect(extraction.processedLocally).toBe(true)
  })

  it("scrubs identifiers and known names", () => {
    const text = scrubDocumentText("Anna Kowalska, PESEL 90010112345, ul. Długa 5, 00-950 Warszawa, anna@example.test, NIP: 123-456-78-90", ["Anna", "Kowalska"])
    expect(text).not.toMatch(/Anna|Kowalska|90010112345|Długa|00-950|example|123-456/)
  })
})

describe("PDF safety", () => {
  it("rejects bytes without the PDF signature", async () => {
    await expect(extract(new TextEncoder().encode("MZ\x90\x00 not a pdf"))).rejects.toMatchObject({ code: "PDF_INVALID" })
  })

  it("rejects a corrupted PDF", async () => {
    await expect(extract(new TextEncoder().encode("%PDF-1.4\ngarbage"))).rejects.toMatchObject({ code: "PDF_INVALID" })
  })
})
