import { describe, expect, it } from "vitest"

import { calculateBenefits } from "./calculator"
import type { CalculatorInput } from "./types"

const baseInput: CalculatorInput = {
  grossMonthlyIncomeGrosze: 1_000_000,
  childrenCount: 1,
  hasZaZyciem: false,
  paymentOption: "STANDARD_100_70",
  maternityWeeksBeforeBirth: 0,
  secondParentParentalWeeks: 0,
  parentalWorkFraction: 0,
  paternityDays: 0,
}

function input(overrides: Partial<CalculatorInput> = {}): CalculatorInput {
  return { ...baseInput, ...overrides }
}

describe("calculateBenefits", () => {
  it("uses the statutory maternity and parental weeks for one child", () => {
    const result = calculateBenefits(input())

    expect(result.maternityWeeks).toBe(20)
    expect(result.parentalPoolWeeks).toBe(41)
    // KP art. 182¹a § 4: 9 of the 41 weeks are reserved for the other parent and cannot be transferred.
    expect(result.motherParentalWeeks).toBe(32)
    expect(result.secondParentWeeks).toBe(0)
    expect(result.trace.map((step) => step.ruleId)).toContain("LR-123")
  })

  it("never marks the preview as a verified entitlement", () => {
    const result = calculateBenefits(input())

    expect(result.verified).toBe(false)
    expect(result.status).toBe("INDETERMINATE")
    expect(result.warnings.join(" ")).toContain("Q-29")
    expect(result.totalGrosze).toBeGreaterThan(0)
  })

  it("derives the benefit basis from gross pay minus the 13.71% contribution", () => {
    const result = calculateBenefits(input({ grossMonthlyIncomeGrosze: 1_000_000 }))

    expect(result.basisGrosze).toBe(862_900)
    expect(result.dailyBasisGrosze).toBe(28_763)
  })

  it("clamps out-of-range input instead of throwing", () => {
    const result = calculateBenefits(
      input({
        childrenCount: 12,
        maternityWeeksBeforeBirth: 20,
        secondParentParentalWeeks: 30,
        parentalWorkFraction: 4,
        paternityDays: 99,
      })
    )

    expect(result.normalizedChildrenCount).toBe(5)
    expect(result.maternityWeeks).toBe(37)
    expect(result.preBirthWeeks).toBe(6)
    expect(result.postBirthWeeks).toBe(31)
    expect(result.secondParentWeeks).toBe(9)
    expect(result.input.parentalWorkFraction).toBe(0.5)
    expect(result.paternityDays).toBe(14)
  })

  it("applies the Za życiem parental pool", () => {
    expect(calculateBenefits(input({ hasZaZyciem: true })).parentalPoolWeeks).toBe(65)

    const multiple = calculateBenefits(
      input({ hasZaZyciem: true, childrenCount: 2 })
    )
    expect(multiple.parentalPoolWeeks).toBe(67)
    expect(multiple.maternityWeeks).toBe(31)
  })

  it("reserves the non-transferable nine weeks for the second parent", () => {
    const result = calculateBenefits(
      input({ secondParentParentalWeeks: 9, paternityDays: 14 })
    )

    expect(result.secondParentWeeks).toBe(9)
    expect(result.motherParentalWeeks).toBe(32)
    expect(result.paternityDays).toBe(14)
    expect(result.lines.map((line) => line.kind)).toEqual([
      "MATERNITY",
      "PARENTAL",
      "PARENTAL",
      "PATERNITY",
    ])
  })

  it("uses the 81.5% rate for the flat option but keeps 70% for the second parent", () => {
    const result = calculateBenefits(
      input({ paymentOption: "FLAT_81_5", secondParentParentalWeeks: 9 })
    )

    const [maternity, motherParental, secondParent] = result.lines
    expect(maternity?.rate).toBeCloseTo(0.815)
    expect(motherParental?.rate).toBeCloseTo(0.815)
    expect(secondParent?.rate).toBeCloseTo(0.7)
    expect(result.warnings.join(" ")).toContain("81,5%")
  })

  it("extends the parental leave proportionally when working part-time", () => {
    const result = calculateBenefits(input({ parentalWorkFraction: 0.5 }))

    // KP art. 182¹f § 2: extension = weeks combined with work × fraction = 32 × ½.
    expect(result.extensionWeeks).toBe(16)
    expect(result.lines.map((line) => line.kind)).toContain(
      "WORK_COMBINATION_EXTENSION"
    )
    expect(result.warnings.join(" ")).toContain("21 dni")
  })
})
