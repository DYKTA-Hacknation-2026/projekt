import { describe, expect, it } from "vitest"

import { assessmentInputSchema, fractionSchema, scenarioComparisonSchema, toAssessmentInput } from "./engine"

const valid = {
  asOf: "2027-04-01",
  event: { kind: "BIRTH", birthDate: "2027-03-10", childrenCount: 1 },
  parents: [
    {
      role: "MOTHER",
      insurance: { title: "EMPLOYMENT", startDate: "2024-01-01", payerSize: "OVER_20", workingTimeFraction: "1" },
      basis: { method: "GROSS_MONTHLY", grossMonthlyGrosze: 800_000 },
    },
  ],
}

describe("assessment request schema", () => {
  it("accepts a complete request and converts to engine input", () => {
    const parsed = assessmentInputSchema.parse(valid)
    expect(toAssessmentInput(parsed, "2026-11-21").asOf).toBe("2027-04-01")
    const withoutDate = assessmentInputSchema.parse({ ...valid, asOf: undefined })
    expect(toAssessmentInput(withoutDate, "2026-11-21").asOf).toBe("2026-11-21")
  })

  it("is strict: unknown and smuggled fields are rejected", () => {
    expect(assessmentInputSchema.safeParse({ ...valid, userId: "someone-else" }).success).toBe(false)
    expect(assessmentInputSchema.safeParse({ ...valid, parents: [{ ...valid.parents[0], pesel: "x" }] }).success).toBe(false)
    expect(assessmentInputSchema.safeParse({ ...valid, event: { ...valid.event, kind: "WEDDING" } }).success).toBe(false)
  })

  it("keeps money in integer grosze — no floating-point złoty", () => {
    const float = { ...valid, parents: [{ ...valid.parents[0], basis: { method: "GROSS_MONTHLY", grossMonthlyGrosze: 8000.5 } }] }
    expect(assessmentInputSchema.safeParse(float).success).toBe(false)
    const negative = { ...valid, parents: [{ ...valid.parents[0], basis: { method: "KNOWN_BASIS", monthlyBasisGrosze: -1 } }] }
    expect(assessmentInputSchema.safeParse(negative).success).toBe(false)
  })

  it("validates dates and months", () => {
    expect(assessmentInputSchema.safeParse({ ...valid, event: { ...valid.event, birthDate: "10.03.2027" } }).success).toBe(false)
    const history = (month: string) => ({
      ...valid,
      parents: [{ ...valid.parents[0], basis: { method: "MONTHLY_HISTORY", months: [{ month, grossGrosze: 1 }] } }],
    })
    expect(assessmentInputSchema.safeParse(history("2027-02")).success).toBe(true)
    expect(assessmentInputSchema.safeParse(history("2027-13")).success).toBe(false)
  })

  it("allows one or two parents with distinct roles", () => {
    expect(assessmentInputSchema.safeParse({ ...valid, parents: [] }).success).toBe(false)
    const mother = valid.parents[0]
    expect(assessmentInputSchema.safeParse({ ...valid, parents: [mother, mother] }).success).toBe(false)
    expect(assessmentInputSchema.safeParse({ ...valid, parents: [mother, { role: "FATHER" }, { role: "MOTHER" }] }).success).toBe(false)
    expect(assessmentInputSchema.safeParse({ ...valid, parents: [mother, { role: "FATHER" }] }).success).toBe(true)
  })

  it("bounds plan values to what the law allows before the engine sees them", () => {
    const plan = (extra: object) => assessmentInputSchema.safeParse({ ...valid, plan: extra }).success
    expect(plan({ maternityWeeksBeforeBirth: 6 })).toBe(true)
    expect(plan({ maternityWeeksBeforeBirth: 7 })).toBe(false)
    expect(plan({ paternity: [{ days: 14 }] })).toBe(true)
    expect(plan({ paternity: [{ days: 15 }] })).toBe(false)
    expect(plan({ paymentOption: "FLAT_90" })).toBe(false)
  })

  it("requires a cited source for administrator-entered external values", () => {
    const withExternal = (externalParameters: object) => assessmentInputSchema.safeParse({ ...valid, externalParameters }).success
    expect(withExternal({ minimumWageGrosze: 480_600, sourceNote: "Dz.U. 2026 poz. 1" })).toBe(true)
    expect(withExternal({ minimumWageGrosze: 480_600 })).toBe(false)
    expect(withExternal({ minimumWageGrosze: 4806.5, sourceNote: "Dz.U. 2026 poz. 1" })).toBe(false)
  })
})

describe("fractions", () => {
  it("accepts decimal strings and numbers and normalises them to exact text", () => {
    expect(fractionSchema.parse("0.5")).toBe("0.5")
    expect(fractionSchema.parse(0.5)).toBe("0.5")
    expect(fractionSchema.parse("1/2")).toBe("1/2")
    expect(fractionSchema.parse(0)).toBe("0")
  })

  it("rejects garbage and out-of-range values", () => {
    for (const value of ["abc", "0,5", "-0.1", 1.5, "2", "0.12345"]) {
      expect(fractionSchema.safeParse(value).success, String(value)).toBe(false)
    }
  })
})

describe("scenario comparison schema", () => {
  it("takes one household and up to five plans", () => {
    const plans = Array.from({ length: 5 }, (_, index) => ({ name: `Plan ${index}`, plan: {} }))
    expect(scenarioComparisonSchema.safeParse({ event: valid.event, parents: valid.parents, scenarios: plans }).success).toBe(true)
    expect(scenarioComparisonSchema.safeParse({ event: valid.event, parents: valid.parents, scenarios: [...plans, plans[0]] }).success).toBe(false)
    expect(scenarioComparisonSchema.safeParse({ event: valid.event, parents: valid.parents, scenarios: [] }).success).toBe(false)
  })
})
