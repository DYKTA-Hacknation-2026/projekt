import { describe, expect, it } from "vitest"

import { calculateBenefits } from "@zpr/domain"
import { testRuleSet } from "@zpr/domain/testing"

const ruleSet = testRuleSet()

describe("deterministic calculator preview", () => {
  it("uses the 13.71% contribution deduction and 1/30 daily basis", () => {
    const result = calculateBenefits(
      {
        grossMonthlyIncomeGrosze: 800_000,
        childrenCount: 1,
        hasZaZyciem: false,
        paymentOption: "STANDARD_100_70",
        maternityWeeksBeforeBirth: 2,
        secondParentParentalWeeks: 9,
        parentalWorkFraction: 0,
        paternityDays: 14,
      },
      ruleSet
    )

    expect(result.basisGrosze).toBe(690_320)
    expect(result.dailyBasisGrosze).toBe(23_011)
    expect(result.maternityWeeks).toBe(20)
    expect(result.parentalPoolWeeks).toBe(41)
    expect(result.totalGrosze).toBeGreaterThan(0)
    expect(result.status).toBe("INDETERMINATE")
    expect(result.verified).toBe(false)
    expect(result.ruleSetVersion).toBe("2026.11-Z1")
  })

  it("marks the result as needing external parameters", () => {
    const result = calculateBenefits(
      {
        grossMonthlyIncomeGrosze: 0,
        childrenCount: 5,
        hasZaZyciem: true,
        paymentOption: "FLAT_81_5",
        maternityWeeksBeforeBirth: 0,
        secondParentParentalWeeks: 9,
        parentalWorkFraction: 0,
        paternityDays: 14,
      },
      ruleSet
    )

    expect(result.maternityWeeks).toBe(37)
    expect(result.parentalPoolWeeks).toBe(67)
    expect(result.warnings.join(" ")).toContain("Q-29")
  })
})
