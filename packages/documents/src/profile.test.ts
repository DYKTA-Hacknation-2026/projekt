import { describe, expect, it } from "vitest"

import type { CaseProfile } from "@zpr/contracts/case-profile"
import type { DocumentExtraction } from "@zpr/contracts/documents"

import { mapDocumentFacts } from "./mapping"
import { applyCaseProfile, compareDocumentWithProfile } from "./profile"

function extraction(
  fields: DocumentExtraction["fields"] = []
): DocumentExtraction {
  return {
    documentId: "00000000-0000-7000-8000-000000000001",
    status: "CONFIRMED",
    detectedForm: "ZAM",
    formTitle: "ZAM — wniosek o zasiłek macierzyński",
    legacyForm: false,
    attachments: [],
    detectionSignals: ["nagłówek: ZAM"],
    extractionMethod: "TEMPLATE",
    confidence: 0.9,
    fields,
    findings: [],
    pages: 1,
    hasTextLayer: true,
    origin: "USER_UPLOAD",
    detectedAt: "2026-11-21T10:00:00.000Z",
    requiresConfirmation: true,
    processedLocally: true,
  }
}

function field(
  key: string,
  value: string,
  semanticKey: DocumentExtraction["fields"][number]["semanticKey"],
  type: DocumentExtraction["fields"][number]["type"] = "TEXT"
) {
  return {
    key,
    label: key,
    value,
    type,
    confidence: 0.95,
    source: "TEMPLATE" as const,
    confirmed: true,
    userEdited: false,
    required: true,
    needsReview: false,
    semanticKey,
  }
}

const profile: CaseProfile = {
  version: 1,
  scenario: "PREGNANCY",
  label: "Oczekiwanie narodzin dziecka",
  analyzedAt: "2026-11-21T10:00:00.000Z",
  request: {
    asOf: "2026-11-21",
    event: {
      kind: "PREGNANCY",
      expectedDueDate: "2026-10-01",
      childrenCount: 1,
    },
    parents: [
      {
        role: "MOTHER",
        insurance: { title: "MANDATE", sicknessInsurance: "VOLUNTARY" },
        basis: { method: "GROSS_MONTHLY", grossMonthlyGrosze: 800_000 },
      },
    ],
    plan: { paymentOption: "FLAT_81_5" },
  },
}

const documentFields = [
  field("event", "2026-10-01", "eventDate", "DATE"),
  field("children", "1", "childrenCount", "INTEGER"),
  {
    ...field("title", "EMPLOYMENT", "employmentType", "ENUM"),
    options: [
      { value: "EMPLOYMENT", label: "Umowa o pracę" },
      { value: "MANDATE", label: "Umowa zlecenia" },
    ],
  },
  field("basis", "6000.00", "monthlyBasisGrosze", "MONEY"),
  field("flat", "true", "flatRateApplication", "BOOLEAN"),
]

describe("document ↔ case profile", () => {
  it("compares matching, missing and divergent facts without calling the document correct", () => {
    const document = extraction(documentFields)
    const comparison = compareDocumentWithProfile(
      profile,
      document,
      mapDocumentFacts(document)
    )

    expect(comparison.status).toBe("DIFFERENCES")
    expect(comparison.matches).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: "Liczba dzieci" }),
        expect.objectContaining({ label: "Wariant wypłaty" }),
      ])
    )
    expect(comparison.missingInDocument).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: "Przewidywany termin porodu" }),
      ])
    )
    expect(comparison.mismatches).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: "Forma zatrudnienia" }),
        expect.objectContaining({ label: "Podstawa wymiaru" }),
      ])
    )
    expect(comparison.suggestions.join(" ")).toMatch(/rozbieżność/i)
    expect(comparison.suggestions.join(" ")).not.toMatch(/ZUS zaakceptuje/i)
    expect(comparison.disclaimer).toMatch(/nie jest potwierdzenie/i)
  })

  it("fills facts the document lacks from the profile but keeps document values", () => {
    const document = extraction(
      documentFields.filter(
        (item) =>
          item.semanticKey !== "monthlyBasisGrosze" &&
          item.semanticKey !== "eventDate"
      )
    )
    const original = mapDocumentFacts(document)
    expect(original.missing.map((item) => item.semanticKey)).toEqual(
      expect.arrayContaining(["monthlyBasisGrosze", "eventDate"])
    )

    const merged = applyCaseProfile(original, profile, document)
    expect(merged.request?.event.expectedDueDate).toBe("2026-10-01")
    expect(merged.request?.parents[0]?.basis).toMatchObject({
      method: "GROSS_MONTHLY",
      grossMonthlyGrosze: 800_000,
    })
    expect(merged.missing).toHaveLength(0)
    expect(merged.notes.join(" ")).toMatch(/profilu sprawy/i)
  })

  it("lets a value read from the document win over the profile", () => {
    const document = extraction(documentFields)
    const merged = applyCaseProfile(
      mapDocumentFacts(document),
      profile,
      document
    )
    expect(merged.request?.parents[0]?.basis).toMatchObject({
      method: "KNOWN_BASIS",
      monthlyBasisGrosze: 600_000,
    })
  })

  it("does not turn a pregnancy application into a birth using the profile", () => {
    const pregnancyDocument = extraction([
      field("due", "2027-03-10", "expectedDueDate", "DATE"),
      field("children", "1", "childrenCount", "INTEGER"),
    ])
    const birthProfile: CaseProfile = {
      ...profile,
      scenario: "BIRTH",
      request: {
        ...profile.request,
        event: { kind: "BIRTH", birthDate: "2026-10-01", childrenCount: 1 },
      },
    }
    const merged = applyCaseProfile(
      mapDocumentFacts(pregnancyDocument),
      birthProfile,
      pregnancyDocument
    )
    expect(merged.request?.event).toMatchObject({
      kind: "PREGNANCY",
      expectedDueDate: "2027-03-10",
    })
    expect(merged.request?.event.birthDate).toBeUndefined()
  })

  it("flags low-confidence fields and legacy forms for manual review", () => {
    const document = extraction([
      ...documentFields.map((item) =>
        item.semanticKey === "monthlyBasisGrosze"
          ? { ...item, confidence: 0.4, needsReview: true }
          : item
      ),
    ])
    document.legacyForm = true
    const comparison = compareDocumentWithProfile(
      profile,
      document,
      mapDocumentFacts(document)
    )
    expect(comparison.manualReview.join(" ")).toMatch(/pewnością 40%/i)
    expect(comparison.manualReview.join(" ")).toMatch(/formularz wycofany/i)
  })
})
