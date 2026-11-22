import { describe, expect, it } from "vitest"

import { householdInput } from "@zpr/ai"
import { calculateBenefits, type CalculatorInput, type CaseFacts } from "@zpr/domain"
import { evaluate, evaluateEligibility } from "@zpr/domain/engine"
import type { BenefitType, EligibilityStatus, ParentRole } from "@zpr/domain/engine"

/**
 * Synthetic golden cases with a verdict we know from the law, not from a scan.
 * They exercise the same mapping the form and the chatbot use, so a failure
 * means a real regression rather than a gap in the private ZUS extraction.
 */

const AS_OF = "2026-11-22"

function run(facts: CaseFacts) {
  const input = householdInput(facts, { asOf: AS_OF }).input
  return {
    input,
    form: evaluate(input).assessment,
    chat: evaluateEligibility(input),
  }
}

function statusOf(
  determinations: { parent: ParentRole; benefit: BenefitType; status: EligibilityStatus }[],
  parent: ParentRole,
  benefit: BenefitType
): EligibilityStatus | undefined {
  return determinations.find((entry) => entry.parent === parent && entry.benefit === benefit)?.status
}

interface GoldenCase {
  name: string
  facts: CaseFacts
  checks: { parent: ParentRole; benefit: BenefitType; status: EligibilityStatus }[]
}

const employee = {
  employmentType: "EMPLOYMENT",
  sicknessInsurance: "COMPULSORY",
  insuranceStartDate: "2024-01-01",
  parentRole: "MOTHER",
  familyEvent: "BIRTH",
  eventDate: "2026-08-01",
  childrenCount: 1,
} satisfies CaseFacts

const cases: GoldenCase[] = [
  {
    name: "employee after a normal birth",
    facts: employee,
    checks: [
      { parent: "MOTHER", benefit: "MATERNITY", status: "ELIGIBLE" },
      { parent: "MOTHER", benefit: "PARENTAL", status: "ELIGIBLE" },
    ],
  },
  {
    name: "mandate without voluntary sickness insurance",
    facts: {
      ...employee,
      employmentType: "MANDATE",
      sicknessInsurance: "NONE",
    },
    checks: [{ parent: "MOTHER", benefit: "MATERNITY", status: "NOT_ELIGIBLE" }],
  },
  {
    name: "mandate with voluntary sickness insurance and a met waiting period",
    facts: {
      ...employee,
      employmentType: "MANDATE",
      sicknessInsurance: "VOLUNTARY",
    },
    checks: [{ parent: "MOTHER", benefit: "MATERNITY", status: "ELIGIBLE" }],
  },
  {
    name: "self-employed with voluntary insurance and no arrears",
    facts: {
      ...employee,
      employmentType: "SELF_EMPLOYMENT",
      sicknessInsurance: "VOLUNTARY",
      contributionArrears: false,
    },
    checks: [{ parent: "MOTHER", benefit: "MATERNITY", status: "ELIGIBLE" }],
  },
  {
    name: "self-employed with arrears above the 1% threshold",
    facts: {
      ...employee,
      employmentType: "SELF_EMPLOYMENT",
      sicknessInsurance: "VOLUNTARY",
      insuranceStartDate: "2024-01-01",
      contributionArrears: true,
      contributionDebtExceedsThreshold: true,
    },
    checks: [{ parent: "MOTHER", benefit: "MATERNITY", status: "CONDITIONAL" }],
  },
  {
    name: "employee found not subject to insurance (sham contract)",
    facts: { ...employee, sicknessInsurance: "NONE" },
    checks: [{ parent: "MOTHER", benefit: "MATERNITY", status: "NOT_ELIGIBLE" }],
  },
  {
    name: "employment ended before birth due to employer liquidation",
    facts: {
      ...employee,
      insuranceEndDate: "2026-01-31",
      insuranceEndReason: "EMPLOYER_LIQUIDATION",
      otherEmploymentProvided: false,
    },
    checks: [
      { parent: "MOTHER", benefit: "MATERNITY_EQUIVALENT", status: "ELIGIBLE" },
      { parent: "MOTHER", benefit: "MATERNITY", status: "ELIGIBLE" },
    ],
  },
  {
    name: "employment ended before birth by resignation",
    facts: {
      ...employee,
      insuranceEndDate: "2026-01-31",
      insuranceEndReason: "RESIGNATION_OR_AGREEMENT",
    },
    checks: [{ parent: "MOTHER", benefit: "MATERNITY", status: "NOT_ELIGIBLE" }],
  },
  {
    name: "stillbirth",
    facts: { ...employee, stillbirth: true },
    checks: [{ parent: "MOTHER", benefit: "MATERNITY", status: "ELIGIBLE" }],
  },
  {
    name: "twins",
    facts: { ...employee, childrenCount: 2 },
    checks: [{ parent: "MOTHER", benefit: "MATERNITY", status: "ELIGIBLE" }],
  },
  {
    name: "supplementary maternity after a term hospital stay",
    facts: {
      ...employee,
      gestationalWeeksCompleted: 40,
      childHospitalWeeks: 1,
    },
    checks: [
      { parent: "MOTHER", benefit: "SUPPLEMENTARY_MATERNITY", status: "ELIGIBLE" },
    ],
  },
  {
    name: "adoption of a two-year-old",
    facts: {
      ...employee,
      familyEvent: "ADOPTION",
      eventDate: "2026-08-01",
      childBirthDate: "2024-01-01",
      courtApplicationDate: "2026-06-01",
      adoptionFinalDate: "2026-07-15",
    },
    checks: [{ parent: "MOTHER", benefit: "MATERNITY_TERMS", status: "ELIGIBLE" }],
  },
  {
    name: "non-professional foster family",
    facts: {
      ...employee,
      familyEvent: "FOSTER_CARE",
      eventDate: "2026-08-01",
      childBirthDate: "2024-01-01",
      professionalFosterFamily: false,
    },
    checks: [{ parent: "MOTHER", benefit: "MATERNITY_TERMS", status: "ELIGIBLE" }],
  },
  {
    name: "professional foster family is excluded",
    facts: {
      ...employee,
      familyEvent: "FOSTER_CARE",
      eventDate: "2026-08-01",
      childBirthDate: "2024-01-01",
      professionalFosterFamily: true,
    },
    checks: [{ parent: "MOTHER", benefit: "MATERNITY_TERMS", status: "NOT_ELIGIBLE" }],
  },
  {
    name: "father's paternity leave",
    facts: { ...employee, parentRole: "FATHER" },
    checks: [{ parent: "FATHER", benefit: "PATERNITY", status: "ELIGIBLE" }],
  },
  {
    name: "sickness in pregnancy with a met waiting period",
    facts: {
      ...employee,
      familyEvent: "PREGNANCY",
      eventDate: undefined,
      expectedDueDate: "2027-01-01",
      pregnancySickLeave: true,
      sickLeaveStart: "2026-09-01",
      sickLeaveEnd: "2026-10-01",
    },
    checks: [
      { parent: "MOTHER", benefit: "SICKNESS_IN_PREGNANCY", status: "ELIGIBLE" },
    ],
  },
  {
    name: "sickness in pregnancy without an insurance start date",
    facts: {
      ...employee,
      insuranceStartDate: undefined,
      familyEvent: "PREGNANCY",
      eventDate: undefined,
      expectedDueDate: "2027-01-01",
      pregnancySickLeave: true,
      sickLeaveStart: "2026-09-01",
      sickLeaveEnd: "2026-10-01",
    },
    checks: [
      { parent: "MOTHER", benefit: "SICKNESS_IN_PREGNANCY", status: "NEEDS_INPUT" },
    ],
  },
  {
    name: "missing employment title is not guessed",
    facts: {
      ...employee,
      employmentType: undefined,
      sicknessInsurance: undefined,
    },
    checks: [{ parent: "MOTHER", benefit: "MATERNITY", status: "NEEDS_INPUT" }],
  },
]

describe("synthetic golden cases — form and chat agree with the law", () => {
  for (const item of cases) {
    it(item.name, () => {
      const { form, chat } = run(item.facts)
      for (const check of item.checks) {
        expect(statusOf(form.eligibility.determinations, check.parent, check.benefit), `${item.name} / form`).toBe(check.status)
        expect(statusOf(chat.eligibility.determinations, check.parent, check.benefit), `${item.name} / chat`).toBe(check.status)
      }
    })
  }

  it("does not assess an event before the available rule sets", () => {
    const { form, chat } = run({ ...employee, eventDate: "2024-01-10" })
    expect(form.status).toBe("MANUAL_REVIEW")
    expect(form.unsupported.map((item) => item.code)).toContain("U-01")
    expect(form.eligibility.determinations).toHaveLength(0)
    expect(chat.status).toBe("MANUAL_REVIEW")
    expect(chat.unsupported.map((item) => item.code)).toContain("U-01")
    expect(chat.eligibility.determinations).toHaveLength(0)
  })

  it("asks for the debt threshold instead of assuming it", () => {
    const { form, chat } = run({
      ...employee,
      employmentType: "SELF_EMPLOYMENT",
      sicknessInsurance: "VOLUNTARY",
      contributionArrears: true,
    })
    expect(statusOf(form.eligibility.determinations, "MOTHER", "MATERNITY")).toBe("CONDITIONAL")
    expect(statusOf(chat.eligibility.determinations, "MOTHER", "MATERNITY")).toBe("CONDITIONAL")
    expect(form.missingEvidence.map((item) => item.key)).toContain("insurance.contributionDebt.exceedsThreshold")
  })
})

describe("synthetic golden cases — calculator", () => {
  const base: CalculatorInput = {
    grossMonthlyIncomeGrosze: 800_000,
    childrenCount: 1,
    hasZaZyciem: false,
    paymentOption: "STANDARD_100_70",
    maternityWeeksBeforeBirth: 0,
    secondParentParentalWeeks: 0,
    parentalWorkFraction: 0,
    paternityDays: 0,
    mode: "BIRTH",
    birthDate: "2026-08-01",
    employmentType: "EMPLOYEE",
    motherEmploymentType: "EMPLOYEE",
    fatherEmploymentType: "EMPLOYEE",
    motherEnabled: true,
    fatherEnabled: false,
    motherSicknessInsurance: "COMPULSORY",
    incomeMode: "SIMPLE",
  }

  it("calculates an eligible employee", () => {
    const result = calculateBenefits(base)
    expect(result.motherEligible).toBe(true)
    expect(result.analysis.eligibilityStatus).not.toBe("NOT_ELIGIBLE")
  })

  it("does not calculate an amount for a historical event in the UI contract", () => {
    const result = calculateBenefits({ ...base, birthDate: "2024-01-10" })
    expect(result.historicalSimulation).toBe(true)
    expect(result.earliestSupportedDate).toBe("2026-07-01")
  })

  it("does not invent an income", () => {
    const result = calculateBenefits({ ...base, grossMonthlyIncomeGrosze: 0 })
    expect(result.analysis.totalGrosze).toBeNull()
    expect(result.analysis.amountStatus).toBe("BASIS_UNKNOWN")
  })

  it("keeps maternity after an employer liquidation", () => {
    const result = calculateBenefits({
      ...base,
      motherInsuranceEndDate: "2026-01-31",
      motherEndReason: "EMPLOYER_LIQUIDATION",
    })
    expect(result.motherEligible).toBe(true)
    expect(result.analysis.determinations.find((entry) => entry.benefit === "MATERNITY")?.status).toBe("ELIGIBLE")
  })

  it("refuses a mandate without voluntary sickness insurance", () => {
    const result = calculateBenefits({
      ...base,
      motherEmploymentType: "CONTRACTOR",
      motherSicknessInsurance: "NONE",
    })
    expect(result.motherEligible).toBe(false)
    expect(result.status).toBe("NOT_ELIGIBLE")
  })
})
