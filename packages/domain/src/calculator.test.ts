import { describe, expect, it } from "vitest"

import { calculateBenefits as calculateWithRules } from "./calculator"
import {
  buildParentalScenarios,
  compareCalculatorScenarios,
} from "./scenarios"
import { buildRuleSet } from "./rule-set"
import { testRuleParameters, testRuleSet } from "./testing"
import { averageMonthlyIncome, basisFromGross } from "./basis"
import { daysAmount } from "./money"
import { PRESET_CASES } from "./presets"
import type { CalculatorInput } from "./types"

const ruleSet = testRuleSet()

const calculateBenefits = (input: CalculatorInput, rules = ruleSet) =>
  calculateWithRules(input, rules)

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
    const result = calculateBenefits(input(), ruleSet)

    expect(result.maternityWeeks).toBe(20)
    expect(result.parentalPoolWeeks).toBe(41)
    // KP art. 182¹a § 4: 9 of the 41 weeks are reserved for the other parent and cannot be transferred.
    expect(result.motherParentalWeeks).toBe(32)
    expect(result.secondParentWeeks).toBe(0)
    expect(result.trace.map((step) => step.ruleId)).toContain("LR-123")
    expect(result.ruleSetVersion).toBe("2026.11-Z1")
  })

  it("marks an event before the earliest rule set as a historical simulation", () => {
    const old = calculateBenefits(input({ birthDate: "2024-01-01" }), ruleSet)
    expect(old.historicalSimulation).toBe(true)
    expect(old.historicalRuleSetVersion).toBeTruthy()
    expect(old.earliestSupportedDate).toBe("2026-07-01")
    expect(old.warnings.join(" ")).toContain("symulacja")

    const current = calculateBenefits(input({ birthDate: "2026-08-01" }), ruleSet)
    expect(current.historicalSimulation).toBe(false)
    expect(current.historicalRuleSetVersion).toBeNull()
  })

  it("never marks the preview as a verified entitlement while Q-29/Q-15 are open", () => {
    const result = calculateBenefits(input(), ruleSet)

    expect(result.verified).toBe(false)
    expect(result.status).toBe("INDETERMINATE")
    expect(result.warnings.join(" ")).toContain("Q-29")
    expect(result.totalGrosze).toBeGreaterThan(0)
  })

  it("derives the benefit basis from gross pay minus the 13.71% contribution", () => {
    const result = calculateBenefits(
      input({ grossMonthlyIncomeGrosze: 1_000_000 }),
      ruleSet
    )

    expect(result.basisGrosze).toBe(862_900)
    expect(result.dailyBasisGrosze).toBe(28_763)
  })

  it("uses a retrieved ZUS basis instead of recomputing it from gross pay", () => {
    const result = calculateBenefits(
      input({
        grossMonthlyIncomeGrosze: 1_000_000,
        monthlyBasisOverrideGrosze: 700_000,
      })
    )

    expect(result.basisGrosze).toBe(700_000)
    expect(result.trace.find((step) => step.ruleId === "LR-112")?.detail).toContain(
      "ZUS"
    )
    expect(result.warnings.join(" ")).toContain("symulowanego ZUS")
  })

  it("clamps out-of-range input instead of throwing", () => {
    const result = calculateBenefits(
      input({
        childrenCount: 12,
        maternityWeeksBeforeBirth: 20,
        secondParentParentalWeeks: 30,
        parentalWorkFraction: 4,
        paternityDays: 99,
      }),
      ruleSet
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
    expect(
      calculateBenefits(input({ hasZaZyciem: true }), ruleSet).parentalPoolWeeks
    ).toBe(65)

    const multiple = calculateBenefits(
      input({ hasZaZyciem: true, childrenCount: 2 }),
      ruleSet
    )
    expect(multiple.parentalPoolWeeks).toBe(67)
    expect(multiple.maternityWeeks).toBe(31)
  })

  it("reserves the non-transferable nine weeks for the second parent", () => {
    const result = calculateBenefits(
      input({ secondParentParentalWeeks: 9, paternityDays: 14 }),
      ruleSet
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
      input({ paymentOption: "FLAT_81_5", secondParentParentalWeeks: 9 }),
      ruleSet
    )

    const [maternity, motherParental, secondParent] = result.lines
    expect(maternity?.rate).toBeCloseTo(0.815)
    expect(motherParental?.rate).toBeCloseTo(0.815)
    expect(secondParent?.rate).toBeCloseTo(0.7)
    expect(result.warnings.join(" ")).toContain("81,5%")
  })

  it("extends the parental leave proportionally when working part-time", () => {
    const result = calculateBenefits(
      input({ parentalWorkFraction: 0.5 }),
      ruleSet
    )

    // KP art. 182¹f § 2: extension = weeks combined with work × fraction = 32 × ½.
    expect(result.extensionWeeks).toBe(16)
    expect(result.lines.map((line) => line.kind)).toContain(
      "WORK_COMBINATION_EXTENSION"
    )
    expect(result.warnings.join(" ")).toContain("21 dni")
  })

  it("changes the amounts when only the rule set changes (no code change)", () => {
    const rows = testRuleParameters()
    const rates = rows.find((row) => row.code === "LR-130")
    expect(rates).toBeDefined()
    rates!.parameters = { ...rates!.parameters, parental: 0.75 }

    const changed = buildRuleSet(rows)
    const before = calculateBenefits(
      input({ secondParentParentalWeeks: 9 }),
      ruleSet
    )
    const after = calculateBenefits(
      input({ secondParentParentalWeeks: 9 }),
      changed
    )

    expect(after.lines.some((line) => line.rate === 0.75)).toBe(true)
    expect(after.totalGrosze).toBeGreaterThan(before.totalGrosze)
  })

  it("becomes verified when the rule set has no blocking gaps", () => {
    const result = calculateBenefits(input(), testRuleSet({ verified: true }))

    expect(result.verified).toBe(true)
    expect(result.status).toBe("OK")
    expect(result.warnings.join(" ")).not.toContain("Q-29")
    expect(result.warnings.join(" ")).not.toContain("Q-15")
  })
})

describe("adoption and foster care (FR-CALC-04)", () => {
  const adoption = (overrides: Partial<CalculatorInput> = {}) =>
    calculateBenefits(input({ mode: "ADOPTION", ...overrides }))

  it("grants the standard leave for a 5-year-old adopted child", () => {
    const result = adoption({ childAgeYears: 5, placementDate: "2026-03-10" })

    expect(result.eligible).toBe(true)
    expect(result.guaranteeApplied).toBe(false)
    expect(result.maternityWeeks).toBe(20)
    expect(result.parentalPoolWeeks).toBe(41)
    expect(result.lines[0]?.leaveType).toBe(
      "Urlop na warunkach macierzyńskiego"
    )
    expect(result.lines[0]?.rate).toBe(1)
    expect(result.trace.map((s) => s.legalReference).join(" ")).toContain("183")
  })

  it("applies the 9 + 38 week guarantee near the 14-year limit", () => {
    const nearly = adoption({ childAgeYears: 13.9 })
    expect(nearly.guaranteeApplied).toBe(true)
    expect(nearly.maternityWeeks).toBe(9)
    expect(nearly.parentalPoolWeeks).toBe(38)

    const half = adoption({ childAgeYears: 13.5 })
    expect(half.guaranteeApplied).toBe(false)
    expect(half.maternityWeeks).toBe(20)
    expect(half.parentalPoolWeeks).toBe(41)
    expect(half.motherParentalWeeks).toBe(6)
    expect(half.trace.map((s) => s.ruleId)).toContain("LR-129")

    expect(
      adoption({ childAgeYears: 13.9, hasZaZyciem: true }).parentalPoolWeeks
    ).toBe(62)
  })

  it("uses dates when both are given and rejects a child over the limit", () => {
    const near = adoption({
      childBirthDate: "2012-09-01",
      placementDate: "2026-03-01",
    })
    expect(near.guaranteeApplied).toBe(false)
    expect(near.maternityWeeks).toBe(20)
    expect(near.parentalPoolWeeks).toBe(41)
    expect(near.motherParentalWeeks).toBeLessThan(10)
    expect(near.ageAtPlacementYears).toBeCloseTo(13.5, 1)

    const over = adoption({ childAgeYears: 14 })
    expect(over.eligible).toBe(false)
    expect(over.status).toBe("NOT_ELIGIBLE")
    expect(over.lines).toHaveLength(0)
    expect(over.totalGrosze).toBe(0)
  })

  it("limits non-professional foster care to 7 years, or 10 when school is deferred", () => {
    const foster = (overrides: Partial<CalculatorInput>) =>
      calculateBenefits(input({ mode: "FOSTER_CARE", ...overrides }))

    expect(foster({ childAgeYears: 8 }).eligible).toBe(false)
    expect(
      foster({ childAgeYears: 8, isDeferredSchooling: true }).eligible
    ).toBe(true)
    expect(
      foster({ childAgeYears: 10, isDeferredSchooling: true }).eligible
    ).toBe(false)
    expect(foster({ childAgeYears: 3 }).maternityWeeks).toBe(20)
  })

  it("excludes professional foster families with a warning", () => {
    const result = calculateBenefits(
      input({
        mode: "FOSTER_CARE",
        childAgeYears: 3,
        isProfessionalFosterFamily: true,
      })
    )
    expect(result.eligible).toBe(false)
    expect(result.warnings.join(" ")).toContain("Zawodowe rodziny zastępcze")
  })
})

describe("independent incomes and flexible split (FR-CALC-03)", () => {
  it("computes each parent's benefit from their own basis", () => {
    const result = calculateBenefits(
      input({
        grossMonthlyIncomeGrosze: 1_000_000,
        secondParentMonthlyIncomeGrosze: 500_000,
        secondParentParentalWeeks: 9,
        paternityDays: 14,
      })
    )

    expect(result.basisGrosze).toBe(862_900)
    expect(result.secondParentBasisGrosze).toBe(431_450)
    const second = result.lines.find(
      (l) => l.beneficiary === "SECOND_PARENT" && l.kind === "PARENTAL"
    )
    expect(second?.rate).toBeCloseTo(0.7)
    expect(second?.amountGrosze).toBe(daysAmount(431_450, 0.7, 63))
    const paternity = result.lines.find((l) => l.kind === "PATERNITY")
    expect(paternity?.rate).toBe(1)
    expect(paternity?.amountGrosze).toBe(daysAmount(431_450, 1, 14))
  })

  it("lets the second parent take more than 9 weeks when the mother takes fewer", () => {
    const result = calculateBenefits(
      input({
        paymentOption: "FLAT_81_5",
        motherParentalWeeks: 20,
        secondParentParentalWeeks: 21,
        secondParentMonthlyIncomeGrosze: 700_000,
      })
    )

    expect(result.motherParentalWeeks).toBe(20)
    expect(result.secondParentWeeks).toBe(21)
    const secondLines = result.lines.filter(
      (l) => l.beneficiary === "SECOND_PARENT"
    )
    expect(secondLines.map((l) => [l.weeks, l.rate])).toEqual([
      [9, 0.7],
      [12, 0.815],
    ])
  })

  it("never lets the two parents exceed the pool", () => {
    const result = calculateBenefits(
      input({ motherParentalWeeks: 35, secondParentParentalWeeks: 20 })
    )
    expect(result.motherParentalWeeks + result.secondParentWeeks).toBe(41)
    expect(result.warnings.join(" ")).toContain("41 tygodni")
  })

  it("warns when the mother waives her non-transferable weeks", () => {
    const result = calculateBenefits(
      input({ motherParentalWeeks: 5, secondParentParentalWeeks: 30 })
    )
    expect(result.secondParentWeeks).toBe(30)
    expect(result.warnings.join(" ")).toContain("rezygnuje")
  })

  it("lets the father take over maternity weeks above the mother's 14", () => {
    const result = calculateBenefits(
      input({
        secondParentMonthlyIncomeGrosze: 500_000,
        fatherMaternityTakeoverWeeks: 6,
      })
    )
    expect(result.motherMaternityWeeks).toBe(14)
    const takeover = result.lines.find((l) => l.kind === "MATERNITY_TAKEOVER")
    expect(takeover?.weeks).toBe(6)
    expect(takeover?.rate).toBe(1)
    expect(takeover?.amountGrosze).toBe(daysAmount(431_450, 1, 42))

    const capped = calculateBenefits(
      input({ fatherMaternityTakeoverWeeks: 10 })
    )
    expect(capped.fatherMaternityTakeoverWeeks).toBe(6)
    expect(capped.warnings.join(" ")).toContain("najwyżej 6")
  })
})

describe("supplementary maternity and special cases (FR-CALC-01)", () => {
  it("grants up to 15 weeks for a premature baby week for week", () => {
    const result = calculateBenefits(
      input({
        birthWeekOfPregnancy: 27,
        birthWeightGrams: 950,
        childHospitalWeeks: 12,
      })
    )
    expect(result.supplementaryWeeks).toBe(12)
    const line = result.lines.find((l) => l.kind === "MATERNITY_SUPPLEMENTARY")
    expect(line?.rate).toBe(1)
    expect(line?.amountGrosze).toBe(daysAmount(862_900, 1, 84))
    expect(result.lines[1]).toBe(line)
    expect(result.trace.map((s) => s.legalReference).join(" ")).toContain(
      "180²"
    )

    expect(
      calculateBenefits(
        input({ birthWeekOfPregnancy: 26, childHospitalWeeks: 30 })
      ).supplementaryWeeks
    ).toBe(15)
  })

  it("caps at 8 weeks for 28–37 weeks and for term babies with hospital stay", () => {
    expect(
      calculateBenefits(
        input({
          birthWeekOfPregnancy: 32,
          birthWeightGrams: 1800,
          childHospitalWeeks: 10,
        })
      ).supplementaryWeeks
    ).toBe(8)
    expect(
      calculateBenefits(
        input({
          birthWeekOfPregnancy: 39,
          childHospitalWeeks: 3,
          childHospitalDaysDay5To28: 4,
        })
      ).supplementaryWeeks
    ).toBe(1)
    expect(
      calculateBenefits(
        input({
          birthWeekOfPregnancy: 39,
          childHospitalWeeks: 3,
          childHospitalDaysDay5To28: 1,
        })
      ).supplementaryWeeks
    ).toBe(0)
  })

  it("gives exactly 8 weeks after a stillbirth and no parental leave", () => {
    const result = calculateBenefits(
      input({ specialCase: "STILLBIRTH", paternityDays: 14 })
    )
    expect(result.maternityWeeks).toBe(8)
    expect(result.parentalPoolWeeks).toBe(0)
    expect(result.paternityDays).toBe(0)
    expect(result.lines[0]?.days).toBe(56)
    expect(result.lines.some((line) => line.leaveType === "Zasiłek pogrzebowy")).toBe(
      true
    )
  })

  it("keeps at least 7 days after a death shortly before the 8th week", () => {
    const result = calculateBenefits(
      input({ specialCase: "CHILD_DEATH_BEFORE_8W", childDeathDay: 54 })
    )
    expect(result.lines[0]?.days).toBe(61)
  })

  it("pays 7 days after a death following the 8th week", () => {
    const result = calculateBenefits(
      input({ specialCase: "CHILD_DEATH_AFTER_8W" })
    )
    expect(result.lines).toHaveLength(1)
    expect(result.lines[0]?.days).toBe(64)
    expect(result.lines[0]?.amountGrosze).toBe(daysAmount(862_900, 1, 64))
  })
})

describe("working during parental leave (FR-CALC-02)", () => {
  it("extends the leave proportionally for half-time work, within 82 weeks", () => {
    const result = calculateBenefits(
      input({ parentalWorkFraction: 0.5, combineWorkInExtension: true })
    )

    expect(result.extensionWeeks).toBe(32)
    expect(
      result.parentalPoolWeeks + result.extensionWeeks
    ).toBeLessThanOrEqual(result.extensionCapWeeks)
    expect(result.extensionCapWeeks).toBe(82)

    const combined = result.lines.find((l) =>
      l.leaveType.includes("praca łączona")
    )
    expect(combined?.amountGrosze).toBe(daysAmount(862_900, 0.7 * 0.5, 32 * 7))
    const extension = result.lines.find(
      (l) => l.kind === "WORK_COMBINATION_EXTENSION"
    )
    expect(extension?.amountGrosze).toBe(daysAmount(862_900, 0.7 * 0.5, 32 * 7))
    expect(result.trace.map((s) => s.legalReference).join(" ")).toContain("4a")
  })

  it("floors the extension formula and uses the multiple/Za życiem caps", () => {
    const quarter = calculateBenefits(
      input({
        parentalWorkFraction: 0.25,
        combineWorkInExtension: true,
        workCombinedWeeks: 20,
      })
    )
    expect(quarter.extensionWeeks).toBeCloseTo(46 / 7, 5)

    expect(
      calculateBenefits(input({ childrenCount: 2, hasZaZyciem: true }))
        .extensionCapWeeks
    ).toBe(134)
    expect(
      calculateBenefits(input({ hasZaZyciem: true })).extensionCapWeeks
    ).toBe(130)
  })
})

describe("individual basis (FR-CALC-05)", () => {
  it("excludes months with absence over 50% and supports supplementing", () => {
    const average = averageMonthlyIncome([
      { grossGrosze: 400_000 },
      { grossGrosze: 100_000, absenceOver50Percent: true },
      {
        grossGrosze: 100_000,
        absenceOver50Percent: true,
        supplementedGrosze: 500_000,
      },
    ])
    expect(average.usedMonths).toBe(2)
    expect(average.excludedMonths).toBe(1)
    expect(average.averageGrosze).toBe(450_000)
  })

  it("uses the detailed 12-month mode", () => {
    const result = calculateBenefits(
      input({
        incomeMode: "DETAILED",
        monthlyIncomes: Array.from({ length: 12 }, (_, i) => ({
          grossGrosze: 1_000_000,
          absenceOver50Percent: i < 2,
        })),
      })
    )
    expect(result.basisGrosze).toBe(862_900)
  })

  it("does not invent the minimum wage when the rule set does not contain it", () => {
    const result = calculateBenefits(
      input({ grossMonthlyIncomeGrosze: 100_000 })
    )
    expect(result.basisGrosze).toBe(basisFromGross(100_000))
    expect(result.lines.find((l) => l.kind === "MATERNITY")?.minimumApplied).toBe(
      false
    )
    expect(result.analysis.amountStatus).toBe("CALCULATED_LOWER_BOUND")
  })

  it("lifts tiny parental amounts to the parental-benefit floor only when the rule set has it", () => {
    const contractor = calculateBenefits(
      input({
        grossMonthlyIncomeGrosze: 100_000,
        employmentType: "CONTRACTOR",
      }),
      testRuleSet({ verified: true })
    )
    expect(contractor.basisGrosze).toBe(86_290)
    const parental = contractor.lines.find((l) => l.kind === "PARENTAL")
    expect(parental?.minimumApplied).toBe(true)
    expect(parental?.amountGrosze).toBe(Math.round((100_000 * 32 * 7) / 30))
  })
})

describe("insurance, both parents and ZUS correctness", () => {
  it("keeps maternity cover after an employer liquidation instead of treating it as no insurance", () => {
    const result = calculateBenefits(
      input({
        birthDate: "2026-08-01",
        motherInsuranceEndDate: "2026-01-31",
        motherEndReason: "EMPLOYER_LIQUIDATION",
      })
    )
    const maternity = result.analysis.determinations.find(
      (entry) => entry.benefit === "MATERNITY"
    )
    expect(maternity?.status).toBe("ELIGIBLE")
    expect(result.motherEligible).toBe(true)
  })

  it("does not transfer the nine non-transferable weeks between parents", () => {
    const result = calculateBenefits(
      input({ motherParentalWeeks: 5, secondParentParentalWeeks: 36 })
    )
    expect(result.motherParentalWeeks).toBe(5)
    expect(result.secondParentWeeks).toBe(32)
    expect(result.motherParentalWeeks + result.secondParentWeeks).toBe(37)
    expect(result.warnings.join(" ")).toContain("32")
  })

  it("pays 100% after a stillbirth even when 81.5% was selected", () => {
    const result = calculateBenefits(
      input({ paymentOption: "FLAT_81_5", specialCase: "STILLBIRTH" })
    )
    expect(result.lines).toHaveLength(2)
    expect(result.lines[0]?.rate).toBe(1)
    expect(result.lines[0]?.amountGrosze).toBe(
      daysAmount(862_900, 1, 56)
    )
    expect(result.warnings.join(" ")).toContain("81,5%")
  })

  it("uses 81.5% for the father's maternity takeover", () => {
    const result = calculateBenefits(
      input({
        paymentOption: "FLAT_81_5",
        fatherMaternityTakeoverWeeks: 6,
        secondParentMonthlyIncomeGrosze: 800_000,
      })
    )
    const takeover = result.lines.find((line) => line.kind === "MATERNITY_TAKEOVER")
    expect(takeover?.rate).toBe(0.815)
  })

  it("applies work combination only to employees", () => {
    const result = calculateBenefits(
      input({
        motherEmploymentType: "CONTRACTOR",
        parentalWorkFraction: 0.5,
      })
    )
    expect(result.extensionWeeks).toBe(0)
    expect(result.warnings.join(" ")).toContain("pracownik")
  })

  it("does not pay an uninsured mother", () => {
    const result = calculateBenefits(
      input({ motherSicknessInsurance: "NONE" })
    )
    expect(result.motherEligible).toBe(false)
    expect(result.lines.filter((line) => line.beneficiary === "MOTHER")).toHaveLength(
      0
    )
  })

  it("supports a father-only case", () => {
    const result = calculateBenefits(
      input({
        motherEnabled: false,
        secondParentParentalWeeks: 32,
        paternityDays: 14,
      })
    )
    expect(result.motherEligible).toBe(false)
    expect(result.fatherEligible).toBe(true)
    expect(result.motherParentalWeeks).toBe(0)
    expect(result.secondParentWeeks).toBe(32)
    expect(result.totalGrosze).toBeGreaterThan(0)
    expect(
      result.lines.every((line) => line.beneficiary === "SECOND_PARENT")
    ).toBe(true)
  })

  it("uses a known basis without deducting 13.71% again", () => {
    const result = calculateBenefits(
      input({
        incomeMode: "KNOWN_BASIS",
        grossMonthlyIncomeGrosze: 0,
        knownBasisGrosze: 500_000,
      })
    )
    expect(result.basisGrosze).toBe(500_000)
    expect(result.lines[0]?.amountGrosze).toBe(daysAmount(500_000, 1, 140))
  })

  it("does not invent a 1 000 zł floor without a basis", () => {
    const result = calculateBenefits(input({ grossMonthlyIncomeGrosze: 0 }))
    expect(result.totalGrosze).toBe(0)
    expect(result.lines).toHaveLength(0)
    expect(result.warnings.join(" ")).toContain("Brak podstawy")
  })

  it("reports totals per beneficiary", () => {
    const result = calculateBenefits(
      input({
        grossMonthlyIncomeGrosze: 800_000,
        secondParentParentalWeeks: 9,
        paternityDays: 14,
      })
    )
    const mother = result.totalsByBeneficiary.find(
      (entry) => entry.beneficiary === "MOTHER"
    )
    const father = result.totalsByBeneficiary.find(
      (entry) => entry.beneficiary === "SECOND_PARENT"
    )
    expect(mother?.totalGrosze).toBe(6_829_566)
    expect(father?.totalGrosze).toBe(1_336_919)
  })
})

describe("preset cases", () => {
  it("every preset calculates without throwing", () => {
    for (const preset of PRESET_CASES) {
      const result = calculateBenefits(preset.input)
      expect(result.eligible, preset.id).toBe(true)
      expect(result.totalGrosze, preset.id).toBeGreaterThan(0)
    }
  })
})

describe("database parameters with the expanded calculator", () => {
  it("does not invent a benefit floor when the database amount is unset", () => {
    const result = calculateBenefits(
      input({ grossMonthlyIncomeGrosze: 100_000, employmentType: "CONTRACTOR" })
    )
    expect(result.lines.every((line) => !line.minimumApplied)).toBe(true)
    expect(result.warnings.join(" ")).toContain("Q-29")
  })
  it("uses changed rates, deductions and divisors for both parents' separate incomes", () => {
    const rules = testRuleSet()
    rules.basis.contributionDeduction = 0.2
    rules.basis.dailyDivisor = 20
    rules.parental.rate = 0.6
    const result = calculateBenefits(
      input({
        grossMonthlyIncomeGrosze: 1_000_000,
        secondParentMonthlyIncomeGrosze: 500_000,
        motherParentalWeeks: 20,
        secondParentParentalWeeks: 21,
      }),
      rules
    )
    expect(result.basisGrosze).toBe(800_000)
    expect(result.secondParentBasisGrosze).toBe(400_000)
    const father = result.lines.filter(
      (line) => line.beneficiary === "SECOND_PARENT"
    )
    expect(father.every((line) => line.rate === 0.6)).toBe(true)
    expect(father.reduce((sum, line) => sum + line.amountGrosze, 0)).toBe(
      1_764_000
    )
  })
})

describe("engine analysis surfaced by the calculator adapter", () => {
  it("keeps the COMPLETE/PARTIAL/MANUAL_REVIEW status and missing evidence", () => {
    const complete = calculateBenefits(input())
    expect(complete.analysis.status).toBe("COMPLETE")
    expect(complete.analysis.amountStatus).toBe("CALCULATED_LOWER_BOUND")
    expect(complete.analysis.totalGrosze).toBe(complete.totalGrosze)

    const partial = calculateBenefits(
      input({ grossMonthlyIncomeGrosze: 0, motherEnabled: true, fatherEnabled: false })
    )
    expect(partial.analysis.status).toBe("PARTIAL")
    expect(partial.analysis.totalGrosze).toBeNull()
    expect(partial.analysis.missingEvidence.length).toBeGreaterThan(0)
  })

  it("does not assume voluntary coverage when the answer is UNKNOWN", () => {
    const result = calculateBenefits(
      input({
        grossMonthlyIncomeGrosze: 800_000,
        motherEmploymentType: "CONTRACTOR",
        motherSicknessInsurance: "UNKNOWN",
        fatherEnabled: false,
      })
    )
    expect(result.analysis.status).toBe("PARTIAL")
    expect(result.analysis.missingEvidence.some((item) => /coverage|ubezpieczenie/i.test(item.key + item.question))).toBe(true)
    expect(result.warnings.join(" ")).toContain("ubezpieczeniu chorobow")
  })
})

describe("parental-leave scenario comparison", () => {
  it("builds variants from the rule set and verifies every one with the engine", () => {
    const scenarios = buildParentalScenarios(
      input({
        grossMonthlyIncomeGrosze: 800_000,
        secondParentMonthlyIncomeGrosze: 800_000,
        paternityDays: 14,
      }),
      ruleSet
    )
    expect(scenarios.map((scenario) => scenario.id)).toEqual([
      "MOTHER_MOST",
      "FATHER_NINE",
      "SHARED",
    ])

    const comparison = compareCalculatorScenarios(
      input({
        grossMonthlyIncomeGrosze: 800_000,
        secondParentMonthlyIncomeGrosze: 800_000,
        paternityDays: 14,
      }),
      ruleSet
    )
    expect(comparison.outcomes).toHaveLength(3)
    expect(comparison.outcomes[0]?.differenceGrosze).toBe(0)
    expect(
      comparison.outcomes[1]?.result.analysis.totalGrosze
    ).toBeGreaterThan(comparison.outcomes[0]?.result.analysis.totalGrosze ?? 0)
    expect(comparison.outcomes[2]?.result.analysis.status).toBe("COMPLETE")
  })

  it("keeps unknown amounts as null in every variant", () => {
    const comparison = compareCalculatorScenarios(
      input({ grossMonthlyIncomeGrosze: 0 }),
      ruleSet
    )
    for (const outcome of comparison.outcomes) {
      expect(outcome.result.analysis.totalGrosze).toBeNull()
      expect(outcome.differenceGrosze).toBeNull()
      expect(outcome.result.analysis.status).toBe("PARTIAL")
    }
  })
})
