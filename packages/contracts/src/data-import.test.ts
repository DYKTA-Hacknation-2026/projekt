import { describe, expect, it } from "vitest"

import {
  acceptImportSchema,
  contributionBasisSchema,
  importedCaseDataSchema,
  sourceFetchResultSchema,
  startImportSchema,
} from "./data-import"

describe("data-import contracts", () => {
  it("requires at least one consented scope", () => {
    expect(startImportSchema.safeParse({ scopes: [] }).success).toBe(false)
    expect(
      startImportSchema.safeParse({ scopes: ["INSURANCE_HISTORY"] }).success
    ).toBe(true)
  })

  it("accepts a partial prefill but validates supplied values", () => {
    expect(importedCaseDataSchema.safeParse({}).success).toBe(true)
    expect(
      importedCaseDataSchema.safeParse({
        firstName: "Anna",
        email: "anna@example.test",
        childrenCount: 1,
      }).success
    ).toBe(true)
    expect(
      importedCaseDataSchema.safeParse({ email: "not-an-email" }).success
    ).toBe(false)
    expect(
      importedCaseDataSchema.safeParse({ expectedDueDate: "2027-13-01" })
        .success
    ).toBe(false)
  })

  it("requires data when accepting a session", () => {
    expect(acceptImportSchema.safeParse({}).success).toBe(false)
    expect(acceptImportSchema.safeParse({ data: {} }).success).toBe(true)
  })

  it("validates a source result with simulated provenance", () => {
    const result = {
      source: "ZUS",
      label: "ZUS — ubezpieczenie i składki",
      institution: "ZUS (symulacja)",
      requestedScopes: ["INSURANCE_HISTORY"],
      status: "SUCCESS",
      activities: [
        { id: "zus-insurance", label: "Historia", status: "SUCCESS" },
      ],
      data: {
        source: "ZUS",
        insurancePeriods: [],
        contributionBases: [],
        arrears: null,
        benefitBasis: null,
      },
      issues: [],
      provenance: {
        institution: "ZUS (symulacja)",
        transport: "SIMULATED",
        scenarioId: "anna-employment",
        fetchedAt: "2026-11-21T09:00:00.000Z",
      },
    }

    expect(sourceFetchResultSchema.safeParse(result).success).toBe(true)
    expect(
      sourceFetchResultSchema.safeParse({
        ...result,
        provenance: { ...result.provenance, transport: "REAL" },
      }).success
    ).toBe(false)
  })

  it("rejects contribution bases with a non-monthly period", () => {
    const base = {
      id: "cb-1",
      insurancePeriodId: "ins-1",
      period: "2026-11",
      basisGrosze: 800_000,
      sicknessContributionGrosze: 19_600,
      paid: true,
      paidAt: null,
    }
    expect(contributionBasisSchema.safeParse(base).success).toBe(true)
    expect(
      contributionBasisSchema.safeParse({ ...base, period: "2026-11-01" })
        .success
    ).toBe(false)
  })
})
