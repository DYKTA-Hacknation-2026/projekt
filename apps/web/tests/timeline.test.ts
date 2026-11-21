import { describe, expect, it } from "vitest"

import { testRuleSet } from "@zpr/domain/testing"

import { buildTimeline } from "@/lib/timeline"

const ruleSet = testRuleSet()

describe("timeline planner", () => {
  it("reproduces scenario S-10 for one child and two weeks before birth", () => {
    const plan = buildTimeline(
      {
        dueDate: "2027-03-10",
        maternityWeeksBeforeBirth: 2,
        childrenCount: 1,
        secondParentParentalWeeks: 9,
        paternityDays: 14,
        hasZaZyciem: false,
      },
      ruleSet
    )

    expect(plan.maternityWeeks).toBe(20)
    expect(plan.postBirthWeeks).toBe(18)
    expect(plan.parentalPoolWeeks).toBe(41)
    expect(plan.secondParentWeeks).toBe(9)
    expect(plan.motherParentalWeeks).toBe(32)

    const start = plan.milestones.find(
      (milestone) => milestone.id === "maternity-start"
    )
    expect(start?.date).toBe("2027-02-24")
  })

  it("handles twins and the Za życiem certificate", () => {
    const twins = buildTimeline(
      {
        dueDate: "2027-03-10",
        maternityWeeksBeforeBirth: 0,
        childrenCount: 2,
        secondParentParentalWeeks: 9,
        paternityDays: 14,
        hasZaZyciem: false,
      },
      ruleSet
    )
    expect(twins.maternityWeeks).toBe(31)
    expect(twins.parentalPoolWeeks).toBe(43)

    const zaZyciem = buildTimeline(
      {
        dueDate: "2027-03-10",
        maternityWeeksBeforeBirth: 0,
        childrenCount: 1,
        secondParentParentalWeeks: 0,
        paternityDays: 14,
        hasZaZyciem: true,
      },
      ruleSet
    )
    expect(zaZyciem.parentalPoolWeeks).toBe(65)
    expect(zaZyciem.motherParentalWeeks).toBe(65)
  })

  it("places the 81.5% application deadline 21 days after birth", () => {
    const plan = buildTimeline(
      {
        dueDate: "2027-03-10",
        maternityWeeksBeforeBirth: 0,
        childrenCount: 1,
        secondParentParentalWeeks: 9,
        paternityDays: 14,
        hasZaZyciem: false,
      },
      ruleSet
    )

    const deadline = plan.milestones.find(
      (milestone) => milestone.id === "application-815"
    )
    expect(deadline?.date).toBe("2027-03-31")
  })
})
