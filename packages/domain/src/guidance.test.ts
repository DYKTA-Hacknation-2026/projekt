import { describe, expect, it } from "vitest"

import { addMonths } from "./dates"
import { relevantDeadlines } from "./deadlines"
import { requiredDocuments } from "./documents"
import { assessEligibility } from "./eligibility"
import { compareLeaveScenarios } from "./scenarios"
import { testRuleSet } from "./testing"

const asOf = "2026-11-21"
const ruleSet = testRuleSet()

function maternity(facts: Parameters<typeof assessEligibility>[0]) {
  return assessEligibility(facts, {
    asOf,
    ruleSet,
    benefits: ["MATERNITY_ALLOWANCE"],
  }).determinations[0]!
}

describe("assessEligibility", () => {
  it("asks for the insurance title instead of guessing", () => {
    const result = assessEligibility({}, { asOf, ruleSet })
    expect(result.determinations.every((d) => d.status === "NEEDS_INPUT")).toBe(
      true
    )
    expect(result.nextQuestion?.key).toBe("employmentType")
  })

  it("treats an employee as covered by compulsory sickness insurance", () => {
    const result = maternity({
      employmentType: "EMPLOYMENT",
      parentRole: "MOTHER",
    })
    expect(result.status).toBe("ELIGIBLE")
    expect(result.legalBasis.join(" ")).toContain("U art. 29")
  })

  it("needs to know about voluntary insurance for B2B", () => {
    const result = maternity({ employmentType: "SELF_EMPLOYMENT" })
    expect(result.status).toBe("NEEDS_INPUT")
    expect(result.missingFacts[0]?.key).toBe("sicknessInsurance")
  })

  it("flags contribution arrears for the self-employed", () => {
    const unknown = maternity({
      employmentType: "SELF_EMPLOYMENT",
      sicknessInsurance: "VOLUNTARY",
    })
    expect(unknown.status).toBe("ELIGIBLE")
    expect(unknown.missingFacts[0]?.key).toBe("contributionArrears")

    const arrears = maternity({
      employmentType: "SELF_EMPLOYMENT",
      sicknessInsurance: "VOLUNTARY",
      contributionArrears: true,
    })
    expect(arrears.status).toBe("INDETERMINATE")
    expect(arrears.legalBasis).toContain("U art. 2a ust. 1–2")
  })

  it("rejects uninsured people and professional foster families", () => {
    expect(
      maternity({ employmentType: "MANDATE", sicknessInsurance: "NONE" }).status
    ).toBe("NOT_ELIGIBLE")
    expect(
      maternity({
        employmentType: "EMPLOYMENT",
        professionalFosterFamily: true,
      }).status
    ).toBe("NOT_ELIGIBLE")
  })

  it("applies the waiting period to sickness benefit in pregnancy", () => {
    const fresh = assessEligibility(
      {
        employmentType: "MANDATE",
        sicknessInsurance: "VOLUNTARY",
        insuranceStartDate: "2026-10-01",
      },
      { asOf, ruleSet, benefits: ["SICKNESS_IN_PREGNANCY"] }
    ).determinations[0]!
    expect(fresh.status).toBe("NOT_ELIGIBLE")

    const long = assessEligibility(
      { employmentType: "EMPLOYMENT", insuranceStartDate: "2026-01-01" },
      { asOf, ruleSet, benefits: ["SICKNESS_IN_PREGNANCY"] }
    ).determinations[0]!
    expect(long.status).toBe("ELIGIBLE")
  })

  it("does not grant paternity to the mother", () => {
    const result = assessEligibility(
      { employmentType: "EMPLOYMENT", parentRole: "MOTHER" },
      { asOf, ruleSet, benefits: ["PATERNITY_BENEFIT"] }
    )
    expect(result.determinations[0]?.status).toBe("NOT_ELIGIBLE")
  })
})

describe("requiredDocuments", () => {
  it("routes the self-employed to ZUS with ZAM", () => {
    const list = requiredDocuments(
      "MATERNITY_ALLOWANCE",
      {
        employmentType: "SELF_EMPLOYMENT",
      },
      ruleSet
    )
    expect(list.routing.payer).toBe("ZUS")
    expect(list.documents.map((d) => d.code)).toContain("ZAM")
    expect(list.documents.find((d) => d.code === "Z-3b")?.caveat).toContain(
      "Q-33"
    )
  })

  it("asks about the payer size for employees", () => {
    const list = requiredDocuments(
      "MATERNITY_ALLOWANCE",
      {
        employmentType: "EMPLOYMENT",
      },
      ruleSet
    )
    expect(list.routing.payer).toBe("UNKNOWN")
    expect(list.missingFacts.map((m) => m.key)).toContain("payerSize")
  })
})

describe("relevantDeadlines", () => {
  it("computes dates from the birth", () => {
    const report = relevantDeadlines({ eventDate: "2027-03-10" }, { ruleSet })
    expect(report.deadlines.find((d) => d.id === "flat-81-5")?.date).toBe(
      "2027-03-31"
    )
    expect(
      report.deadlines.find((d) => d.id === "paternity-deadline")?.date
    ).toBe("2028-03-09")
  })

  it("keeps rules relative when no date is known", () => {
    const report = relevantDeadlines({ familyEvent: "PREGNANCY" }, { ruleSet })
    expect(report.deadlines.every((d) => d.date === null)).toBe(true)
    expect(report.missingFacts[0]?.key).toBe("expectedDueDate")
  })

  it("labels due-date based dates as estimates", () => {
    const report = relevantDeadlines(
      { expectedDueDate: "2027-03-10" },
      { ruleSet }
    )
    expect(report.caveats.join(" ")).toContain("przewidywanego")
    expect(
      report.deadlines.find((d) => d.id === "maternity-pre-birth")?.date
    ).toBe("2027-01-27")
  })
})

describe("compareLeaveScenarios", () => {
  it("compares plans with numbers from the calculator", () => {
    const plan = {
      paymentOption: "STANDARD_100_70" as const,
      maternityWeeksBeforeBirth: 0,
      parentalWorkFraction: 0,
      paternityDays: 14,
    }
    const comparison = compareLeaveScenarios(
      {
        grossMonthlyIncomeGrosze: 800_000,
        childrenCount: 1,
        hasZaZyciem: false,
        dueDate: "2027-03-10",
      },
      [
        { ...plan, name: "Mama całość", secondParentParentalWeeks: 0 },
        { ...plan, name: "Tata 9 tygodni", secondParentParentalWeeks: 9 },
      ],
      ruleSet
    )
    expect(comparison.outcomes[0]?.totalDifferenceGrosze).toBe(0)
    expect(comparison.outcomes[1]?.secondParentWeeks).toBe(9)
    expect(comparison.outcomes[1]?.motherParentalWeeks).toBe(32)
    expect(comparison.verified).toBe(false)
    expect(comparison.outcomes[0]?.motherLeaveEnd).not.toBeNull()
  })
})

describe("addMonths", () => {
  it("clamps to the end of shorter months", () => {
    expect(addMonths("2027-01-31", 1)).toBe("2027-02-28")
  })
})
