import { describe, expect, it } from "vitest"

import { DOCUMENT_PREFILL_STORAGE_KEY } from "@zpr/contracts/documents"
import { calculateBenefits } from "@zpr/domain"
import { testRuleSet } from "@zpr/domain/testing"

import { parseDocumentPrefill, serializeDocumentPrefill, takeDocumentPrefill } from "@/lib/document-prefill"

const documentId = "0193a000-0000-7000-8000-000000000001"

describe("document → calculator handoff", () => {
  it("regression: a 6000 zł basis is passed as the basis override, not as gross pay", () => {
    const patch = parseDocumentPrefill(serializeDocumentPrefill({ documentId, source: "DOCUMENT", monthlyBasisGrosze: 600_000 }))
    expect(patch).toEqual({ monthlyBasisGrosze: 600_000 })
    expect(patch).not.toHaveProperty("incomePln")
  })

  it("passes gross pay to the income field", () => {
    expect(parseDocumentPrefill(serializeDocumentPrefill({ documentId, source: "DOCUMENT", grossMonthlyGrosze: 800_000, employmentType: "EMPLOYEE" }))).toEqual({
      incomePln: "8000",
      employmentType: "EMPLOYEE",
    })
  })

  it("rejects the old loose `{ income }` shape and malformed JSON", () => {
    expect(parseDocumentPrefill(JSON.stringify({ income: "8000" }))).toBeNull()
    expect(parseDocumentPrefill("{")).toBeNull()
    expect(parseDocumentPrefill(null)).toBeNull()
  })

  it("is read once", () => {
    const store = new Map([[DOCUMENT_PREFILL_STORAGE_KEY, serializeDocumentPrefill({ documentId, source: "DOCUMENT", monthlyBasisGrosze: 600_000 })]])
    const storage = { getItem: (key: string) => store.get(key) ?? null, removeItem: (key: string) => void store.delete(key) }
    expect(takeDocumentPrefill(storage)).toEqual({ monthlyBasisGrosze: 600_000 })
    expect(takeDocumentPrefill(storage)).toBeNull()
  })

  it("the calculator keeps a 6000 zł override at 6000 zł instead of 6000 × (1 − 13,71%)", () => {
    const ruleSet = testRuleSet()
    const result = calculateBenefits({
      grossMonthlyIncomeGrosze: 600_000,
      monthlyBasisOverrideGrosze: 600_000,
      childrenCount: 1,
      hasZaZyciem: false,
      paymentOption: "STANDARD_100_70",
      maternityWeeksBeforeBirth: 0,
      secondParentParentalWeeks: 9,
      parentalWorkFraction: 0,
      paternityDays: 14,
    }, ruleSet)
    expect(result.basisGrosze).toBe(600_000)
    const recomputed = calculateBenefits({
      grossMonthlyIncomeGrosze: 600_000,
      childrenCount: 1,
      hasZaZyciem: false,
      paymentOption: "STANDARD_100_70",
      maternityWeeksBeforeBirth: 0,
      secondParentParentalWeeks: 9,
      parentalWorkFraction: 0,
      paternityDays: 14,
    }, ruleSet)
    expect(recomputed.basisGrosze).toBe(517_740)
  })
})
