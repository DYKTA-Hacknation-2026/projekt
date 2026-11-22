import { describe, expect, it } from "vitest"

import { DOCUMENT_PREFILL_STORAGE_KEY } from "@zpr/contracts/documents"
import type { CalculatorInput } from "@zpr/domain"

import {
  CALCULATOR_PREFILL_KEY,
  IMPORT_PREFILL_KEY,
  ONBOARDING_PREFILL_KEY,
  readCalculatorPrefill,
  serializeCalculatorPrefill,
} from "../lib/calculator-prefill"

class MemoryStorage {
  private readonly values = new Map<string, string>()
  getItem(key: string) {
    return this.values.get(key) ?? null
  }
  setItem(key: string, value: string) {
    this.values.set(key, value)
  }
  removeItem(key: string) {
    this.values.delete(key)
  }
}

const fullInput: CalculatorInput = {
  grossMonthlyIncomeGrosze: 800_000,
  childrenCount: 2,
  hasZaZyciem: true,
  paymentOption: "STANDARD_100_70",
  birthDate: "2027-03-10",
  maternityWeeksBeforeBirth: 2,
  secondParentParentalWeeks: 9,
  parentalWorkFraction: 0,
  paternityDays: 14,
  mode: "BIRTH",
  motherEmploymentType: "EMPLOYEE",
  fatherEmploymentType: "EMPLOYEE",
  motherSicknessInsurance: "COMPULSORY",
  fatherSicknessInsurance: "COMPULSORY",
  incomeMode: "SIMPLE",
}

describe("calculator handoff storage", () => {
  it("maps builder data to the calculator fields and clears the handoff", () => {
    const storage = new MemoryStorage()
    storage.setItem(
      ONBOARDING_PREFILL_KEY,
      JSON.stringify({
        eventType: "PREGNANCY",
        expectedDueDate: "2027-04-01",
        childrenCount: 2,
        hasZaZyciem: true,
        employmentType: "MANDATE",
        coverageMode: "VOLUNTARY",
        grossMonthlyIncomePln: 6500,
        insuranceStartDate: "2025-02-01",
      })
    )

    const prefill = readCalculatorPrefill(storage)
    expect(prefill?.source).toBe("ONBOARDING")
    expect(prefill?.input).toMatchObject({
      mode: "BIRTH",
      birthDate: "2027-04-01",
      childrenCount: 2,
      hasZaZyciem: true,
      motherEmploymentType: "CONTRACTOR",
      motherSicknessInsurance: "VOLUNTARY",
      grossMonthlyIncomeGrosze: 650_000,
    })
    expect(storage.getItem(ONBOARDING_PREFILL_KEY)).toBeNull()
  })

  it("lets the most specific calculator handoff win", () => {
    const storage = new MemoryStorage()
    storage.setItem(
      ONBOARDING_PREFILL_KEY,
      JSON.stringify({ eventType: "PREGNANCY", grossMonthlyIncomePln: 5000 })
    )
    storage.setItem(
      CALCULATOR_PREFILL_KEY,
      serializeCalculatorPrefill(fullInput, "ADVANCED")
    )

    const prefill = readCalculatorPrefill(storage)
    expect(prefill?.source).toBe("CALCULATOR")
    expect(prefill?.input).toMatchObject({
      grossMonthlyIncomeGrosze: 800_000,
      childrenCount: 2,
    })
    expect(storage.getItem(CALCULATOR_PREFILL_KEY)).toBeNull()
    expect(storage.getItem(ONBOARDING_PREFILL_KEY)).toBeNull()
  })

  it("keeps an accepted import as a valid source", () => {
    const storage = new MemoryStorage()
    storage.setItem(
      IMPORT_PREFILL_KEY,
      JSON.stringify({
        sessionId: "00000000-0000-4000-8000-000000000001",
        data: {
          eventType: "BIRTH",
          eventDate: "2027-01-15",
          childrenCount: 1,
          grossMonthlyIncomePln: 7200,
          monthlyBasisGrosze: 620_000,
        },
        fieldSources: {},
      })
    )

    const prefill = readCalculatorPrefill(storage)
    expect(prefill?.source).toBe("IMPORT")
    expect(prefill?.input).toMatchObject({
      mode: "BIRTH",
      birthDate: "2027-01-15",
      monthlyBasisOverrideGrosze: 620_000,
      incomeMode: "KNOWN_BASIS",
    })
    expect(storage.getItem(IMPORT_PREFILL_KEY)).toBeNull()
  })

  it("merges a payer's basis from a document into builder facts", () => {
    const storage = new MemoryStorage()
    storage.setItem(
      ONBOARDING_PREFILL_KEY,
      JSON.stringify({
        eventType: "PREGNANCY",
        expectedDueDate: "2027-06-01",
        childrenCount: 1,
        grossMonthlyIncomePln: 5000,
      })
    )
    storage.setItem(
      DOCUMENT_PREFILL_STORAGE_KEY,
      JSON.stringify({
        documentId: "00000000-0000-4000-8000-000000000002",
        source: "DOCUMENT",
        monthlyBasisGrosze: 600_000,
        employmentType: "EMPLOYEE",
        childrenCount: 1,
      })
    )

    const prefill = readCalculatorPrefill(storage)
    expect(prefill?.source).toBe("ONBOARDING")
    expect(prefill?.input).toMatchObject({
      birthDate: "2027-06-01",
      grossMonthlyIncomeGrosze: 500_000,
      monthlyBasisOverrideGrosze: 600_000,
    })
  })

  it("ignores a malformed handoff instead of inventing data", () => {
    const storage = new MemoryStorage()
    storage.setItem(CALCULATOR_PREFILL_KEY, "{not json")
    expect(readCalculatorPrefill(storage)).toBeNull()
  })
})
