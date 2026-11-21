import { describe, expect, it } from "vitest"

import { buildRuleSet, RuleSetError } from "./rule-set"
import { testRuleParameters, testRuleSet } from "./testing"

describe("buildRuleSet", () => {
  it("maps the seeded parameter rows into the engine contract", () => {
    const ruleSet = testRuleSet()

    expect(ruleSet.version).toBe("2026.11-Z1")
    expect(ruleSet.maternity.weeksByChildren[1]).toBe(20)
    expect(ruleSet.parental.poolWeeks.zaZyciemMultiple).toBe(67)
    expect(ruleSet.paternity.days).toBe(14)
    expect(ruleSet.deadlines.flatRateApplicationDays).toBe(21)
    expect(ruleSet.verified).toBe(false)
    expect(ruleSet.unverifiedRules).toContain("LR-132")
  })

  it("reports a missing rule instead of falling back to code defaults", () => {
    const rows = testRuleParameters().filter((row) => row.code !== "LR-130")

    expect(() => buildRuleSet(rows)).toThrow(RuleSetError)
    try {
      buildRuleSet(rows)
    } catch (error) {
      expect(error).toBeInstanceOf(RuleSetError)
      expect((error as RuleSetError).missingCodes).toContain("LR-130")
    }
  })

  it("reports a malformed parameter with its key", () => {
    const rows = testRuleParameters()
    const rates = rows.find((row) => row.code === "LR-130")
    rates!.parameters = { ...rates!.parameters, parental: "70%" }

    expect(() => buildRuleSet(rows)).toThrow(RuleSetError)
    try {
      buildRuleSet(rows)
    } catch (error) {
      expect((error as RuleSetError).invalidKeys).toContain("LR-130.parental")
    }
  })

  it("becomes fully verified when the blocking gaps are filled", () => {
    const ruleSet = testRuleSet({ verified: true })

    expect(ruleSet.verified).toBe(true)
    expect(ruleSet.unverifiedRules).toEqual([])
    expect(ruleSet.minimum.parentalBenefitAmountGrosze).toBe(100_000)
  })
})
