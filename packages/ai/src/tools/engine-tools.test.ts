import { describe, expect, it } from "vitest"

import { fakeServices } from "../test-helpers"
import { TurnState } from "../turn"
import { createAssistantTools } from "."

/**
 * The assistant reaches eligibility, amounts, periods and documents only
 * through the deterministic engine. These tests call the tools directly (as
 * the model would) and compare their output with the engine.
 */

const TODAY = "2026-11-21"

async function call<T = Record<string, any>>(name: string, input: unknown, options: Parameters<typeof fakeServices>[0] = {}): Promise<T> {
  const turn = new TurnState(TODAY)
  const tools = createAssistantTools(fakeServices({ today: TODAY, ...options }).services, turn) as unknown as Record<
    string,
    { execute: (input: unknown, options: unknown) => Promise<T> }
  >
  return tools[name]!.execute(input, { toolCallId: `${name}-1`, messages: [] })
}

describe("calculateBenefit", () => {
  it("returns engine amounts: 8 000 zł, 20 weeks maternity + 32 weeks parental, 100% and 70%", async () => {
    const out = await call("calculateBenefit", { grossMonthlyIncomePln: 8000 })
    expect(out.status).toBe("OK")
    const maternity = out.lines.find((item: any) => item.kind === "MATERNITY")
    const parental = out.lines.find((item: any) => item.kind === "PARENTAL")
    expect(maternity).toMatchObject({ days: 140, ratePercent: 100, amountGrosze: 3_221_493 })
    expect(parental).toMatchObject({ days: 224, ratePercent: 70, amountGrosze: 3_608_073 })
    expect(out.totalGrosze).toBe(6_829_566)
    expect(out.totalFormatted).toContain("68 295,66")
    expect(out.engine.ruleSetVersion).toMatch(/^20\d\d\.\d\d-Z1$/)
    expect(out.engine.appliedRules.length).toBeGreaterThan(0)
    expect(out.disclaimer).toMatch(/nie decyzja ZUS/)
  })

  it("uses the 81.5% variant for the whole period but keeps the other parent's nine weeks at 70%", async () => {
    const out = await call("calculateBenefit", {
      grossMonthlyIncomePln: 8000,
      paymentOption: "FLAT_81_5",
      secondParentParentalWeeks: 9,
    })
    expect(out.lines.find((item: any) => item.kind === "MATERNITY").ratePercent).toBe(81.5)
    const parental = out.lines.filter((item: any) => item.kind === "PARENTAL")
    expect(parental.map((item: any) => item.ratePercent).sort()).toEqual([70, 81.5])
  })

  it("never invents an income", async () => {
    const out = await call("calculateBenefit", {})
    expect(out.status).toBe("NEEDS_INPUT")
    expect(out.missing[0].key).toBe("grossMonthlyIncomePln")
    expect(out.lines).toBeUndefined()
    expect(out.totalFormatted).toBeUndefined()
  })

  it("discloses that the period was placed on an assumed date when no due date is known", async () => {
    const out = await call("calculateBenefit", { grossMonthlyIncomePln: 8000 })
    expect(out.warnings.join(" ")).toContain("umownej daty")
  })

  it("rejects arguments outside the contract, such as a smuggled field", async () => {
    const out = await call("calculateBenefit", { grossMonthlyIncomePln: 8000, userId: "x" })
    expect(out.status).toBe("INVALID_INPUT")
  })
})

describe("checkBenefitEligibility", () => {
  it("asks for the insurance title instead of guessing", async () => {
    const out = await call("checkBenefitEligibility", {})
    expect(out.assessment.determinations.every((item: any) => item.status === "NEEDS_INPUT")).toBe(true)
    expect(out.assessment.nextQuestion.key).toBe("employmentType")
    // Even the paternity row asks which parent is asking, instead of assuming.
    const paternity = out.assessment.determinations.find((item: any) => item.benefit === "PATERNITY_BENEFIT")
    expect(paternity.missingFacts[0].key).toBe("parentRole")
  })

  it("rejects a mandate worker without voluntary insurance, citing the engine rule", async () => {
    const out = await call("checkBenefitEligibility", {
      benefits: ["MATERNITY_ALLOWANCE"],
      facts: { employmentType: "MANDATE", sicknessInsurance: "NONE" },
    })
    const [maternity] = out.assessment.determinations
    expect(maternity.status).toBe("NOT_ELIGIBLE")
    expect(maternity.reasons[0].ruleId).toBe("LR-72")
    expect(maternity.legalBasis.join(" ")).toContain("U art. 29")
  })

  it("explains the 270-day, 100% and waiting-period rules for sickness in pregnancy", async () => {
    const out = await call("checkBenefitEligibility", {
      benefits: ["SICKNESS_IN_PREGNANCY"],
      facts: { employmentType: "EMPLOYMENT", insuranceStartDate: "2026-01-01" },
    })
    expect(out.assessment.determinations[0].status).toBe("ELIGIBLE")
    expect(out.assessment.determinations[0].reasons.map((reason: any) => reason.ruleId)).toContain("LR-103")
  })

  it("routes self-employed parents to ZUS and flags contribution debt as a condition", async () => {
    const out = await call("checkBenefitEligibility", {
      benefits: ["MATERNITY_ALLOWANCE"],
      facts: { employmentType: "SELF_EMPLOYMENT", sicknessInsurance: "VOLUNTARY", contributionArrears: true, eventDate: "2027-03-10", familyEvent: "BIRTH" },
    })
    const [maternity] = out.assessment.determinations
    expect(maternity.payer).toBe("ZUS")
    expect(maternity.engineStatus).toBe("CONDITIONAL")
  })

  it("does not grant paternity leave to the mother", async () => {
    const out = await call("checkBenefitEligibility", {
      benefits: ["PATERNITY_BENEFIT"],
      facts: { parentRole: "MOTHER", employmentType: "EMPLOYMENT" },
    })
    expect(out.assessment.determinations[0].status).toBe("NOT_ELIGIBLE")
  })
})

describe("compareLeaveScenarios", () => {
  const scenarios = [
    { name: "Mama całość", secondParentParentalWeeks: 0, paternityDays: 0 },
    { name: "Tata 9 tygodni", secondParentParentalWeeks: 9, paternityDays: 0 },
  ]

  it("returns engine amounts and the difference between plans", async () => {
    const out = await call("compareLeaveScenarios", { grossMonthlyIncomePln: 8000, dueDate: "2027-03-10", scenarios })
    expect(out.status).toBe("OK")
    expect(out.outcomes[0]).toMatchObject({ maternityWeeks: 20, motherParentalWeeks: 32, secondParentWeeks: 0, totalGrosze: 6_829_566 })
    // The father has the same income here: 63 days at 70% of 6 903,20 zł.
    expect(out.outcomes[1]).toMatchObject({ secondParentWeeks: 9, motherParentalWeeks: 32 })
    expect(out.outcomes[1].totalGrosze - out.outcomes[0].totalGrosze).toBe(Math.round((690_320 * 0.7 * 63) / 30))
    expect(out.outcomes[1].motherLeaveEnd).toBe("2028-03-07")
  })

  it("returns weeks but no amounts when the income is unknown", async () => {
    const out = await call("compareLeaveScenarios", { dueDate: "2027-03-10", scenarios })
    expect(out.status).toBe("PARTIAL")
    expect(out.amountsAvailable).toBe(false)
    expect(out.outcomes[1].secondParentWeeks).toBe(9)
    expect(out.outcomes.every((item: any) => item.totalGrosze === null && item.totalFormatted === null)).toBe(true)
    expect(out.missing[0].key).toBe("grossMonthlyIncomePln")
  })
})

describe("getRequiredDocuments", () => {
  it("names the forms and where to submit them, from the engine", async () => {
    const out = await call("getRequiredDocuments", {
      benefit: "MATERNITY_ALLOWANCE",
      facts: { employmentType: "SELF_EMPLOYMENT", sicknessInsurance: "VOLUNTARY", eventDate: "2027-03-10", familyEvent: "BIRTH" },
    })
    expect(out.routing.payer).toBe("ZUS")
    expect(out.documents.map((doc: any) => doc.code)).toContain("ZAM")
    expect(out.formsVersion).toContain("ZAM")
  })

  it("asks about the payer size for an employee", async () => {
    const out = await call("getRequiredDocuments", {
      benefit: "MATERNITY_ALLOWANCE",
      facts: { employmentType: "EMPLOYMENT" },
    })
    expect(out.routing.payer).toBe("UNKNOWN")
    expect(out.missingFacts.length).toBeGreaterThan(0)
  })
})

describe("getBenefitTimeline", () => {
  it("builds the plan with dates from the engine and asks for the due date when unknown", async () => {
    const out = await call("getBenefitTimeline", { dueDate: "2027-03-10", secondParentParentalWeeks: 9, maternityWeeksBeforeBirth: 2 })
    expect(out.status).toBe("OK")
    expect(out.maternityWeeks).toBe(20)
    expect(out.postBirthWeeks).toBe(18)
    expect(out.parentalPoolWeeks).toBe(41)
    expect(out.secondParentWeeks).toBe(9)
    const start = out.milestones.find((item: any) => item.title.toLowerCase().includes("rozpoczęcia") || item.id === "period-maternity-pre")
    expect(out.milestones.some((item: any) => item.id === "deadline-81-5" && item.date === "2027-03-31")).toBe(true)
    expect(start).toBeDefined()
    expect(out.milestones.every((item: any) => item.dateFormatted)).toBe(true)

    const missing = await call("getBenefitTimeline", {})
    expect(missing.status).toBe("NEEDS_INPUT")
    expect(missing.missing[0].key).toBe("expectedDueDate")
  })
})
