import { describe, expect, it } from "vitest"

import { evaluateEligibility, identifyRequiredDocuments, compareBenefitScenarios, generateBenefitTimeline } from "./services"
import {
  AFTER_BIRTH,
  BIRTH,
  assess,
  born,
  determination,
  employee,
  father,
  hasWarning,
  line,
  missingKeys,
  period,
  run,
} from "./test-fixtures"

/**
 * Acceptance scenarios. Every expected amount below was computed outside the
 * engine with exact fractions: basis = round(gross × (1 − 0.1371)); amount =
 * round(basis × rate × days / 30); rounding half up, once per line.
 *
 *   gross 8 000,00 zł → basis 6 903,20 zł (690 320 gr)
 *   100% × 140 days = 3 221 493 gr      70% × 224 days = 3 608 073 gr
 */

describe("insured employee (mother, umowa o pracę)", () => {
  const a = assess()

  it("is eligible for maternity benefit and pays through a large payer", () => {
    expect(determination(a, "MATERNITY").status).toBe("ELIGIBLE")
    expect(determination(a, "MATERNITY").payer).toBe("EMPLOYER")
    expect(determination(a, "PARENTAL").status).toBe("ELIGIBLE")
    expect(a.eligibility.status).toBe("ELIGIBLE")
    expect(a.ruleSet.version).toBe("2027.01-Z1")
  })

  it("derives 20 weeks of maternity leave starting on the birth date (inclusive periods)", () => {
    const maternity = period(a, "maternity")
    expect(maternity).toMatchObject({ start: "2027-03-10", end: "2027-07-27", days: 140, benefit: "MATERNITY" })
    expect(period(a, "parental-1")).toMatchObject({ start: "2027-07-28", end: "2028-03-07", days: 224 })
  })

  it("calculates the amounts with the documented 100% and 70% rates", () => {
    expect(a.basis[0]).toMatchObject({ monthlyBasisGrosze: 690_320, status: "CALCULATED" })
    expect(line(a, "maternity")).toMatchObject({ ratePercent: "100%", amountGrosze: 3_221_493 })
    expect(line(a, "parental-1")).toMatchObject({ ratePercent: "70%", amountGrosze: 3_608_073 })
    expect(a.totals.totalGrosze).toBe(6_829_566)
    expect(a.totals.gross).toBe(true)
  })

  it("is honest that the minimum-wage rules could only change the result upwards", () => {
    expect(a.totals.amountStatus).toBe("CALCULATED_LOWER_BOUND")
    expect(hasWarning(a, "PARENTAL_BENEFIT_FLOOR_NOT_APPLIED")).toBe(true)
    expect(a.assumptions.join(" ")).toContain("A-20")
  })

  it("reports rule versions, sources and assumptions for every applied rule", () => {
    const lr123 = a.appliedRules.find((rule) => rule.ruleId === "LR-123")
    expect(lr123).toMatchObject({ ruleSetVersion: "2027.01-Z1", verification: "VERIFIED_ZUS" })
    expect(lr123?.sources.join(";")).toContain("KP art. 180")
    expect(a.sources).toContain("U art. 31 ust. 1–2")
    expect(a.disclaimer).toMatch(/To nie jest decyzja ZUS/)
    expect(a.kind).toBe("ESTIMATE")
  })

  it("is not an official decision and lists unsupported scenarios it did not decide", () => {
    expect(a.unsupported.map((item) => item.code)).toEqual(expect.arrayContaining(["U-04", "U-19"]))
  })
})

describe("self-employed parent (działalność, dobrowolne ubezpieczenie)", () => {
  const selfEmployed = (debt?: NonNullable<NonNullable<ReturnType<typeof employee>["insurance"]>["contributionDebt"]>) =>
    employee({
      insurance: { title: "SELF_EMPLOYMENT", sicknessInsurance: "VOLUNTARY", startDate: "2024-01-01", contributionDebt: debt },
      basis: { method: "GROSS_MONTHLY", grossMonthlyGrosze: 500_000 },
    })

  it("is paid by ZUS from the contribution basis minus 13.71%", () => {
    const a = assess({ parents: [selfEmployed({ exists: false })] })
    expect(determination(a, "MATERNITY").status).toBe("ELIGIBLE")
    expect(determination(a, "MATERNITY").payer).toBe("ZUS")
    expect(a.basis[0]).toMatchObject({ monthlyBasisGrosze: 431_450 })
    expect(line(a, "maternity").amountGrosze).toBe(2_013_433)
    expect(a.warnings.map((warning) => warning.code)).toEqual(expect.arrayContaining(["NO_KP_PROTECTION", "VOLUNTARY_DEREGISTRATION"]))
  })

  it("holds payment while contribution debt above 1% of the minimum wage exists", () => {
    const a = assess({ parents: [selfEmployed({ exists: true, exceedsThreshold: true })] })
    const maternity = determination(a, "MATERNITY")
    expect(maternity.status).toBe("CONDITIONAL")
    expect(maternity.conditions.join(" ")).toContain("2027-09-10")
    expect(a.nextSteps.some((step) => step.ruleId === "LR-108")).toBe(true)
  })

  it("asks about the debt instead of assuming none", () => {
    const a = assess({ parents: [selfEmployed()] })
    expect(determination(a, "MATERNITY").status).toBe("CONDITIONAL")
    expect(missingKeys(a)).toContain("insurance.contributionDebt")
  })

  it("loses the right when the debt is not repaid within six months", () => {
    const expired = assess({ asOf: "2027-09-11", parents: [selfEmployed({ exists: true, exceedsThreshold: true })] })
    expect(determination(expired, "MATERNITY").status).toBe("NOT_ELIGIBLE")
    const late = assess({ parents: [selfEmployed({ exists: true, exceedsThreshold: true, repaidOn: "2027-09-11" })] })
    expect(determination(late, "MATERNITY").status).toBe("NOT_ELIGIBLE")
    const inTime = assess({ parents: [selfEmployed({ exists: true, exceedsThreshold: true, repaidOn: "2027-09-10" })] })
    expect(determination(inTime, "MATERNITY").status).toBe("ELIGIBLE")
    expect(determination(inTime, "MATERNITY").reasons.map((reason) => reason.text).join(" ")).toContain("2027-11-09")
  })

  it("routes documents to ZUS and does not ask for the birth certificate", () => {
    const docs = identifyRequiredDocuments({ asOf: AFTER_BIRTH, event: born(), parents: [selfEmployed({ exists: false })] })
    expect(docs.documents.find((doc) => doc.code === "ZAM")).toMatchObject({ submitTo: "ZUS", preparedBy: "YOU" })
    expect(docs.documents.find((doc) => doc.code === "ODPIS-AU")?.submitTo).toBe("NONE")
    expect(docs.formsVersion).toContain("ZAM")
  })
})

describe("civil-law contract worker (umowa zlecenia)", () => {
  const mandate = (extra: object = {}) =>
    employee({ insurance: { title: "MANDATE", sicknessInsurance: "VOLUNTARY", startDate: "2026-06-01", payerSize: "UP_TO_20", ...extra } })

  it("is entitled with voluntary insurance and is paid by ZUS at a small payer", () => {
    const a = assess({ parents: [mandate()] })
    expect(determination(a, "MATERNITY").status).toBe("ELIGIBLE")
    expect(determination(a, "MATERNITY").payer).toBe("ZUS")
    const docs = identifyRequiredDocuments({ asOf: AFTER_BIRTH, event: born(), parents: [mandate()] })
    expect(docs.documents.map((doc) => doc.code)).toContain("Z-3A")
  })

  it("is paid by the principal when it reports more than 20 insured persons", () => {
    const a = assess({ parents: [mandate({ payerSize: "OVER_20" })] })
    expect(determination(a, "MATERNITY").payer).toBe("EMPLOYER")
    const docs = identifyRequiredDocuments({ asOf: AFTER_BIRTH, event: born(), parents: [mandate({ payerSize: "OVER_20" })] })
    expect(docs.documents.map((doc) => doc.code)).not.toContain("Z-3A")
  })

  it("has no right without voluntary sickness insurance on the birth date", () => {
    const a = assess({ parents: [mandate({ sicknessInsurance: "NONE" })] })
    expect(determination(a, "MATERNITY").status).toBe("NOT_ELIGIBLE")
    expect(a.breakdown).toHaveLength(0)
  })

  it("asks whether the insurance is voluntary instead of assuming it", () => {
    const a = assess({ parents: [mandate({ sicknessInsurance: undefined })] })
    expect(determination(a, "MATERNITY").status).toBe("NEEDS_INPUT")
    expect(missingKeys(a)).toContain("insurance.sicknessInsurance")
    expect(a.status).toBe("PARTIAL")
  })
})

describe("uninsured parent", () => {
  const uninsured = employee({ insurance: { title: "NONE" } })

  it("has no maternity-type entitlement and no amount", () => {
    const a = assess({ parents: [uninsured] })
    expect(determination(a, "MATERNITY").status).toBe("NOT_ELIGIBLE")
    expect(determination(a, "MATERNITY").payer).toBe("NONE")
    expect(a.breakdown).toEqual([])
    expect(a.periods).toEqual([])
    expect(a.totals.totalGrosze).toBeNull()
    expect(a.totals.amountStatus).toBe("NOT_APPLICABLE")
    expect(a.eligibility.status).toBe("NOT_ELIGIBLE")
  })

  it("lets an insured father use parental leave when the mother was not insured", () => {
    const a = assess({ parents: [uninsured, father()] })
    const parental = determination(a, "PARENTAL", "FATHER")
    expect(parental.status).toBe("ELIGIBLE")
    expect(parental.reasons.map((reason) => reason.code)).toContain("FATHER_WHEN_MOTHER_UNINSURED")
    expect(determination(a, "PATERNITY", "FATHER").status).toBe("ELIGIBLE")
    expect(a.allocation.find((entry) => entry.parent === "FATHER")).toMatchObject({ parentalDays: 224, paternityDays: 14 })
    expect(a.breakdown.some((item) => item.parent === "FATHER" && item.benefit === "MATERNITY")).toBe(false)
  })
})

describe("both parents sharing leave", () => {
  const parents = [employee(), father()]
  const sharing = { parentalSegments: [{ parent: "MOTHER" as const, weeks: 32 }, { parent: "FATHER" as const, weeks: 9 }] }

  it("allocates leave and amounts to each parent with the reserved nine weeks at 70%", () => {
    const a = assess({ parents, plan: sharing })
    expect(period(a, "parental-1")).toMatchObject({ parent: "MOTHER", days: 224 })
    expect(period(a, "parental-2")).toMatchObject({ parent: "FATHER", start: "2028-03-08", days: 63 })
    expect(line(a, "parental-2")).toMatchObject({ ratePercent: "70%", amountGrosze: 661_500 })
    expect(line(a, "paternity-1")).toMatchObject({ parent: "FATHER", days: 14, ratePercent: "100%", amountGrosze: 210_000 })
    expect(a.totals.totalGrosze).toBe(7_701_066)
    expect(a.totals.byParent).toEqual([
      expect.objectContaining({ parent: "MOTHER", totalGrosze: 6_829_566 }),
      expect.objectContaining({ parent: "FATHER", totalGrosze: 871_500 }),
    ])
  })

  it("reports the non-transferable portion per parent", () => {
    const a = assess({ parents, plan: sharing })
    const mother = a.allocation.find((entry) => entry.parent === "MOTHER")!
    const dad = a.allocation.find((entry) => entry.parent === "FATHER")!
    expect(mother).toMatchObject({ maxOwnParentalWeeks: 32, reservedParentalWeeks: 9, parentalDays: 224, maternityDays: 140 })
    expect(dad).toMatchObject({ reservedParentalDaysUsed: 63, reservedParentalDaysUnused: 0, parentalDays: 63 })
  })

  it("lets the reserved nine weeks lapse and says so when the father uses none", () => {
    const a = assess({ parents, plan: { parentalSegments: [{ parent: "MOTHER", weeks: 32 }] } })
    expect(a.allocation.find((entry) => entry.parent === "FATHER")).toMatchObject({ parentalDays: 0, reservedParentalDaysUnused: 63 })
  })

  it("never lets one parent take the other's nine weeks, nor exceed the shared pool", () => {
    const a = assess({
      parents,
      plan: { parentalSegments: [{ parent: "MOTHER", weeks: 41 }, { parent: "FATHER", weeks: 20 }] },
    })
    expect(period(a, "parental-1").days).toBe(224)
    expect(period(a, "parental-2").days).toBe(63)
    expect(a.planAdjustments).toHaveLength(2)
    expect(a.planAdjustments[0]).toContain("32 tygodni")
    expect(a.planAdjustments[1]).toContain("41 tygodni")
  })

  it("models the 81.5% variant: whole period at 81.5%, the other parent's nine weeks at 70%", () => {
    const a = assess({
      parents,
      plan: { ...sharing, paymentOption: "FLAT_81_5", flatRateApplicationDate: "2027-03-31" },
    })
    expect(line(a, "maternity")).toMatchObject({ ratePercent: "81,5%", amountGrosze: 2_625_517 })
    expect(line(a, "parental-1")).toMatchObject({ ratePercent: "81,5%", amountGrosze: 4_200_827 })
    expect(line(a, "parental-2")).toMatchObject({ ratePercent: "70%", amountGrosze: 661_500 })
    expect(line(a, "paternity-1").ratePercent).toBe("100%")
    expect(a.totals.totalGrosze).toBe(7_697_844)
    expect(hasWarning(a, "FLAT_RATE_CONDITIONS")).toBe(true)
  })

  it("falls back to 100% + 70% when the 81.5% application is late", () => {
    const a = assess({
      parents,
      plan: { ...sharing, paymentOption: "FLAT_81_5", flatRateApplicationDate: "2027-04-01" },
    })
    expect(line(a, "maternity")).toMatchObject({ ratePercent: "100%", amountGrosze: 3_221_493 })
    expect(hasWarning(a, "FLAT_APPLICATION_LATE")).toBe(true)
  })

  it("applies 70% and a one-off top-up of maternity to 100% when no parental leave falls in year one", () => {
    const a = assess({
      parents: [employee()],
      plan: {
        paymentOption: "FLAT_81_5",
        flatRateApplicationDate: "2027-03-20",
        parentalSegments: [{ parent: "MOTHER", weeks: 32, startDate: "2028-04-01" }],
      },
    })
    expect(line(a, "maternity").ratePercent).toBe("81,5%")
    expect(line(a, "maternity-topup")).toMatchObject({ ratePercent: "18,5%", amountGrosze: 595_976 })
    expect(line(a, "parental-1")).toMatchObject({ ratePercent: "70%", amountGrosze: 3_608_073 })
    expect(hasWarning(a, "FLAT_NO_PARENTAL_IN_FIRST_YEAR")).toBe(true)
  })

  it("lets the father take over maternity leave after the mother's 14 weeks", () => {
    const a = assess({
      parents,
      plan: { maternityTakeover: { reason: "MOTHER_RESIGNS_AFTER_14_WEEKS", motherWeeksAfterBirth: 14 } },
    })
    expect(period(a, "maternity")).toMatchObject({ parent: "MOTHER", days: 98, end: "2027-06-15" })
    expect(period(a, "maternity-father")).toMatchObject({ parent: "FATHER", start: "2027-06-16", end: "2027-07-27", days: 42 })
    expect(line(a, "maternity").amountGrosze).toBe(2_255_045)
    expect(line(a, "maternity-father").amountGrosze).toBe(630_000)
    expect(a.allocation.find((entry) => entry.parent === "FATHER")?.maternityTakeoverDays).toBe(42)
  })

  it("never lets the total of the mother and the father exceed the maternity dimension", () => {
    const a = assess({
      parents,
      plan: { maternityTakeover: { reason: "MOTHER_RESIGNS_AFTER_14_WEEKS", motherWeeksAfterBirth: 14 } },
    })
    const days = a.periods.filter((item) => item.benefit === "MATERNITY").reduce((sum, item) => sum + item.days, 0)
    expect(days).toBe(140)
  })
})

describe("part-time work during parental leave", () => {
  const withWork = (workFraction: string, extra: object = {}) =>
    assess({ plan: { parentalSegments: [{ parent: "MOTHER", weeks: 32, workFraction, ...extra }] } })

  it("extends the leave proportionally and reduces the benefit for the worked share", () => {
    const a = withWork("0.5")
    expect(period(a, "parental-1")).toMatchObject({ days: 224, workFraction: "0.50" })
    expect(period(a, "parental-1-extension")).toMatchObject({ start: "2028-03-08", days: 112 })
    expect(line(a, "parental-1")).toMatchObject({ paidFraction: "0.50", amountGrosze: 1_804_036 })
    expect(line(a, "parental-1-extension")).toMatchObject({ paidFraction: "1.00", amountGrosze: 1_804_036 })
    expect(a.allocation[0]!.parentalExtensionDays).toBe(112)
    expect(hasWarning(a, "WORK_COMBINATION_NOTICE")).toBe(true)
    expect(a.appliedRules.map((rule) => rule.ruleId)).toEqual(expect.arrayContaining(["LR-128", "LR-131"]))
  })

  it("applies the formula for working also during the extension (extension / (1 − fraction))", () => {
    const a = withWork("0.5", { extensionWorkFraction: "0.5" })
    expect(period(a, "parental-1-extension").days).toBe(224)
    expect(line(a, "parental-1-extension").paidFraction).toBe("0.50")
  })

  it("drops a part day from the extension", () => {
    const a = assess({ plan: { parentalSegments: [{ parent: "MOTHER", weeks: 0, days: 5, workFraction: "0.5" }] } })
    // 5 days × ½ = 2.5 → 2 days (KP art. 182¹f § 4).
    expect(period(a, "parental-1-extension").days).toBe(2)
  })

  it("caps work at half time and explains the change", () => {
    const a = withWork("0.6")
    expect(period(a, "parental-1-extension").days).toBe(112)
    expect(a.planAdjustments.join(" ")).toContain("połowę etatu")
  })

  it("does not apply to a parent who is not an employee", () => {
    const a = assess({
      parents: [employee({ insurance: { title: "SELF_EMPLOYMENT", sicknessInsurance: "VOLUNTARY", startDate: "2024-01-01", contributionDebt: { exists: false } } })],
      plan: { parentalSegments: [{ parent: "MOTHER", weeks: 32, workFraction: "0.5" }] },
    })
    expect(a.periods.some((item) => item.id.endsWith("extension"))).toBe(false)
    expect(a.planAdjustments.join(" ")).toContain("nie jest pracownikiem")
  })
})

describe("adoptive parent and foster care", () => {
  const adoption = (overrides: object = {}) => ({
    kind: "ADOPTION" as const,
    childBirthDate: "2023-05-01",
    careTakingDate: "2027-01-15",
    courtApplicationDate: "2027-01-18",
    childrenCount: 1,
    ...overrides,
  })

  it("grants leave on the terms of maternity leave from the day the child is taken in", () => {
    const a = assess({ asOf: "2027-02-01", event: adoption() })
    expect(determination(a, "MATERNITY_TERMS").status).toBe("ELIGIBLE")
    expect(period(a, "maternity-terms")).toMatchObject({ start: "2027-01-15", end: "2027-06-03", days: 140 })
    expect(line(a, "maternity-terms")).toMatchObject({ ratePercent: "100%", amountGrosze: 3_221_493 })
    expect(a.anchor.kind).toBe("CARE_TAKING")
  })

  it("requires the application to the guardianship court for adoption", () => {
    const a = assess({ asOf: "2027-02-01", event: adoption({ courtApplicationDate: undefined }) })
    expect(determination(a, "MATERNITY_TERMS").status).toBe("CONDITIONAL")
    expect(missingKeys(a)).toContain("event.courtApplicationDate")
  })

  it("excludes professional foster families", () => {
    const a = assess({ asOf: "2027-02-01", event: { kind: "FOSTER_CARE", childBirthDate: "2023-05-01", careTakingDate: "2027-01-15", professionalFosterFamily: true } })
    expect(determination(a, "MATERNITY_TERMS").status).toBe("NOT_ELIGIBLE")
    expect(determination(a, "MATERNITY_TERMS").reasons[0]!.code).toBe("PROFESSIONAL_FOSTER_FAMILY")
    expect(a.breakdown).toHaveLength(0)
  })

  it("deducts leave already used in foster care from the adoption dimension", () => {
    const a = assess({ asOf: "2027-02-01", event: adoption({ previouslyUsedMaternityTermsWeeks: 8 }) })
    expect(period(a, "maternity-terms").days).toBe(84)
  })

  it("applies the 9-week guarantee near the age limit and sends the case to manual review", () => {
    const a = assess({ asOf: "2026-12-21", event: adoption({ childBirthDate: "2012-12-30", careTakingDate: "2026-12-20", courtApplicationDate: "2026-12-21" }) })
    expect(period(a, "maternity-terms").days).toBe(63)
    expect(a.status).toBe("MANUAL_REVIEW")
    expect(a.manualReviewReasons.join(" ")).toContain("Q-30")
    expect(a.assumptions.join(" ")).toContain("A-17")
  })

  it("gives the adoptive father paternity leave from the final adoption order", () => {
    const a = assess({
      asOf: "2027-03-01",
      event: adoption({ adoptionFinalDate: "2027-02-10" }),
      parents: [employee(), father()],
    })
    expect(determination(a, "PATERNITY", "FATHER").status).toBe("ELIGIBLE")
    expect(a.timeline.find((entry) => entry.id === "deadline-paternity")?.date).toBe("2028-02-10")
  })
})

describe("parent of a premature child (uzupełniający urlop macierzyński)", () => {
  const premature = (overrides: object = {}) =>
    assess({
      event: born({
        gestationalWeeksCompleted: 27,
        lowestBirthWeightGrams: 900,
        childHospitalStays: [{ start: "2027-03-10", end: "2027-04-20" }],
        ...overrides,
      }),
    })

  it("grants one week per week of hospital stay directly after maternity leave", () => {
    const a = premature()
    const supplementary = determination(a, "SUPPLEMENTARY_MATERNITY")
    expect(supplementary.status).toBe("ELIGIBLE")
    expect(supplementary.reasons[0]!.code).toBe("SUPPLEMENTARY_A")
    expect(period(a, "supplementary")).toMatchObject({ start: "2027-07-28", end: "2027-09-07", days: 42 })
    expect(line(a, "supplementary")).toMatchObject({ ratePercent: "100%", amountGrosze: 966_448 })
    expect(period(a, "parental-1").start).toBe("2027-09-08")
  })

  it("can be taken by the father instead of the mother — never both", () => {
    const a = assess({
      event: born({ gestationalWeeksCompleted: 27, lowestBirthWeightGrams: 900, childHospitalStays: [{ start: "2027-03-10", end: "2027-04-20" }] }),
      parents: [employee(), father()],
      plan: { supplementaryParent: "FATHER" },
    })
    const supplementary = a.periods.filter((item) => item.benefit === "SUPPLEMENTARY_MATERNITY")
    expect(supplementary).toHaveLength(1)
    expect(supplementary[0]!.parent).toBe("FATHER")
  })

  it("sums hospital stays and rounds a part week up", () => {
    const a = premature({
      childHospitalStays: [
        { start: "2027-03-10", end: "2027-03-12" },
        { start: "2027-03-20", end: "2027-03-24" },
      ],
    })
    // 3 + 5 = 8 days → 2 weeks.
    expect(period(a, "supplementary").days).toBe(14)
  })

  it("uses the longest-hospitalised child and the lowest birth weight in multiple births", () => {
    const a = premature({
      childrenCount: 2,
      childHospitalStays: [
        { child: 0, start: "2027-03-10", end: "2027-03-12" },
        { child: 1, start: "2027-03-10", end: "2027-03-19" },
      ],
    })
    expect(period(a, "supplementary").days).toBe(14)
    expect(period(a, "maternity").days).toBe(217)
  })

  it("asks for the week of pregnancy and the birth weight instead of guessing", () => {
    const a = premature({ gestationalWeeksCompleted: undefined, lowestBirthWeightGrams: undefined })
    expect(determination(a, "SUPPLEMENTARY_MATERNITY").status).toBe("NEEDS_INPUT")
    expect(missingKeys(a)).toContain("event.gestationalWeeksCompleted")
  })

  it("does not grant it without a hospital stay", () => {
    const a = premature({ childHospitalStays: [] })
    expect(a.eligibility.determinations.some((item) => item.benefit === "SUPPLEMENTARY_MATERNITY")).toBe(false)
  })
})

describe("incomplete or inconsistent evidence", () => {
  it("returns a partial assessment that asks for what is missing and invents nothing", () => {
    const a = assess({ asOf: "2026-11-21", event: { kind: "PREGNANCY" }, parents: [{ role: "MOTHER" }] })
    expect(a.status).toBe("PARTIAL")
    expect(a.eligibility.status).toBe("NEEDS_INPUT")
    expect(missingKeys(a)).toEqual(expect.arrayContaining(["insurance.title", "event.expectedDueDate"]))
    expect(a.breakdown).toEqual([])
    expect(a.totals.totalGrosze).toBeNull()
    expect(a.nextSteps[0]!.text).toContain("Uzupełnij")
  })

  it("never fabricates an amount when the calculation basis is unknown", () => {
    const a = assess({ parents: [employee({ basis: undefined })] })
    expect(a.status).toBe("PARTIAL")
    expect(a.basis[0]).toMatchObject({ status: "UNKNOWN", monthlyBasisGrosze: null })
    expect(a.breakdown.length).toBeGreaterThan(0)
    for (const item of a.breakdown) {
      expect(item.amountGrosze).toBeNull()
      expect(item.exactAmount).toBeNull()
    }
    expect(a.periods.length).toBeGreaterThan(0)
    expect(a.totals).toMatchObject({ totalGrosze: null, amountStatus: "BASIS_UNKNOWN" })
    expect(missingKeys(a)).toContain("basis")
  })

  it.each([
    ["birth date later than the evaluation date", { event: born({ birthDate: "2027-05-01" }) }],
    ["more deaths than children", { event: born({ childDeaths: [{ date: "2027-03-12" }, { date: "2027-03-13" }] }) }],
    ["stillbirth together with a death after birth", { event: born({ stillbirth: true, childDeaths: [{ date: "2027-03-12" }] }) }],
    ["a hospital stay that ends before it starts", { event: born({ childHospitalStays: [{ start: "2027-03-20", end: "2027-03-12" }] }) }],
    ["a hospital stay that starts before the birth", { event: born({ childHospitalStays: [{ start: "2027-03-01", end: "2027-03-12" }] }) }],
    ["an employee with voluntary insurance", { parents: [employee({ insurance: { title: "EMPLOYMENT", sicknessInsurance: "VOLUNTARY" } })] }],
    ["insurance that ends before it starts", { parents: [employee({ insurance: { title: "EMPLOYMENT", startDate: "2025-01-01", endDate: "2024-01-01" } })] }],
    ["no title but sickness insurance", { parents: [employee({ insurance: { title: "NONE", sicknessInsurance: "COMPULSORY" } })] }],
  ] as const)("routes %s to manual review", (_name, overrides) => {
    const a = assess({ asOf: AFTER_BIRTH, ...overrides } as never)
    expect(a.status).toBe("MANUAL_REVIEW")
    expect(a.manualReviewReasons.length).toBeGreaterThan(0)
    expect(a.eligibility.status).toBe("MANUAL_REVIEW")
    expect(a.nextSteps.some((step) => step.text.includes("ZUS"))).toBe(true)
  })

  it("does not decide events from before the supported legal state", () => {
    const a = assess({ asOf: "2026-07-15", event: born({ birthDate: "2026-06-30" }) })
    expect(a.status).toBe("MANUAL_REVIEW")
    expect(a.ruleSet.version).toBe("—")
    expect(a.unsupported[0]!.code).toBe("U-01")
    expect(a.breakdown).toEqual([])
    expect(a.totals.totalGrosze).toBeNull()
  })

  it("rejects an unknown pinned rule set", () => {
    const a = assess({ ruleSetVersion: "1999.01" })
    expect(a.status).toBe("MANUAL_REVIEW")
    expect(a.manualReviewReasons[0]).toContain("1999.01")
  })

  it("is a forecast, not a fact, while the child is not yet born", () => {
    const a = assess({ asOf: "2026-11-21", event: { kind: "PREGNANCY", expectedDueDate: BIRTH, childrenCount: 1 } })
    expect(determination(a, "MATERNITY").status).toBe("CONDITIONAL")
    expect(determination(a, "MATERNITY").conditions.join(" ")).toContain("2027-03-10")
    expect(a.anchor).toEqual({ kind: "DUE_DATE", date: BIRTH, estimated: true })
    expect(period(a, "maternity").estimated).toBe(true)
  })
})

describe("special circumstances", () => {
  it("pays 8 weeks after a stillbirth, no parental leave, and the funeral allowance", () => {
    const a = assess({ event: born({ stillbirth: true }) })
    expect(period(a, "maternity")).toMatchObject({ days: 56, end: "2027-05-04" })
    expect(line(a, "maternity")).toMatchObject({ ratePercent: "100%", amountGrosze: 1_288_597 })
    expect(determination(a, "PARENTAL").status).toBe("NOT_ELIGIBLE")
    expect(line(a, "funeral").amountGrosze).toBe(700_000)
    expect(determination(a, "STILLBIRTH_FUNERAL_ALLOWANCE").status).toBe("CONDITIONAL")
    expect(a.periods.some((item) => item.benefit === "PARENTAL")).toBe(false)
  })

  it("keeps the right for 8 weeks, but at least 7 days after the death, when a child dies early", () => {
    const early = assess({ event: born({ childDeaths: [{ date: "2027-03-20" }] }) })
    expect(period(early, "maternity").end).toBe("2027-05-04")
    const near = assess({ event: born({ childDeaths: [{ date: "2027-05-04" }] }) })
    expect(period(near, "maternity").end).toBe("2027-05-11")
  })

  it("keeps the right for only 7 days after a death after the eighth week", () => {
    const a = assess({ event: born({ childDeaths: [{ date: "2027-05-05" }] }) })
    expect(period(a, "maternity")).toMatchObject({ end: "2027-05-12" })
    expect(a.periods.some((item) => item.benefit === "PARENTAL")).toBe(false)
  })

  it("sizes leave by the surviving children in multiple births", () => {
    const a = assess({ event: born({ childrenCount: 2, childDeaths: [{ date: "2027-03-12" }] }) })
    expect(period(a, "maternity").days).toBe(140)
    expect(determination(a, "MATERNITY").reasons.map((reason) => reason.code)).toContain("PARTIAL_LOSS")
  })

  it.each([
    [1, 140, 41],
    [2, 217, 43],
    [3, 231, 43],
    [4, 245, 43],
    [5, 259, 43],
    [6, 259, 43],
  ])("applies the multiple-birth dimension for %i children (%i days of maternity leave, %i weeks pool)", (children, days, pool) => {
    const a = assess({ event: born({ childrenCount: children }), parents: [employee(), father()] })
    expect(period(a, "maternity").days).toBe(days)
    expect(a.allocation[0]!.maxOwnParentalWeeks + a.allocation[0]!.reservedParentalWeeks).toBe(pool)
  })

  it.each([
    [false, 1, 32],
    [false, 2, 34],
    [true, 1, 56],
    [true, 2, 58],
  ])("sizes the pool for zaZyciem=%s and %i child(ren): one parent may use at most %i weeks (pool − 9)", (zaZyciem, children, mother) => {
    const a = assess({ event: born({ zaZyciem, childrenCount: children }), parents: [employee(), father()] })
    expect(a.allocation[0]!.maxOwnParentalWeeks).toBe(mother)
    expect(a.allocation[0]!.reservedParentalWeeks).toBe(9)
  })

  it("keeps the pregnancy benefit after the employer's bankruptcy: equivalent benefit until the birth", () => {
    const a = assess({
      asOf: "2027-02-01",
      event: { kind: "PREGNANCY", expectedDueDate: BIRTH, childrenCount: 1 },
      parents: [employee({ insurance: { title: "EMPLOYMENT", startDate: "2024-01-01", endDate: "2026-12-31", endReason: "EMPLOYER_BANKRUPTCY", endedDuringPregnancy: true, otherEmploymentProvided: false } })],
    })
    expect(determination(a, "MATERNITY_EQUIVALENT").status).not.toBe("NOT_ELIGIBLE")
    expect(determination(a, "MATERNITY_EQUIVALENT").payer).toBe("ZUS")
    expect(period(a, "maternity-equivalent")).toMatchObject({ start: "2027-01-01", end: "2027-03-09", days: 68 })
    expect(line(a, "maternity-equivalent").ratePercent).toBe("100%")
    expect(determination(a, "MATERNITY").payer).toBe("ZUS")
  })

  it("follows the statute over the task text for unlawful termination (conflict D-07)", () => {
    const a = assess({
      asOf: "2027-02-01",
      event: { kind: "PREGNANCY", expectedDueDate: BIRTH, childrenCount: 1 },
      parents: [employee({ insurance: { title: "EMPLOYMENT", startDate: "2024-01-01", endDate: "2026-12-31", endReason: "UNLAWFUL_TERMINATION_FINAL_JUDGMENT", endedDuringPregnancy: true } })],
    })
    expect(determination(a, "MATERNITY").status).not.toBe("NOT_ELIGIBLE")
    expect(a.eligibility.determinations.some((item) => item.benefit === "MATERNITY_EQUIVALENT")).toBe(false)
    expect(hasWarning(a, "D07_UNLAWFUL_TERMINATION")).toBe(true)
  })

  it("extends a qualifying fixed-term contract to the birth", () => {
    const base = { title: "EMPLOYMENT" as const, startDate: "2024-01-01", endDate: "2027-01-31", endReason: "FIXED_TERM_CONTRACT_END" as const }
    const extended = assess({
      asOf: "2027-02-01",
      event: { kind: "PREGNANCY", expectedDueDate: BIRTH, childrenCount: 1 },
      parents: [employee({ insurance: { ...base, fixedTermContract: { longerThanOneMonth: true, wouldEndAfterThirdMonthOfPregnancy: true, replacementContract: false } } })],
    })
    expect(determination(extended, "MATERNITY").status).not.toBe("NOT_ELIGIBLE")
    const replacement = assess({
      asOf: "2027-02-01",
      event: { kind: "PREGNANCY", expectedDueDate: BIRTH, childrenCount: 1 },
      parents: [employee({ insurance: { ...base, fixedTermContract: { replacementContract: true } } })],
    })
    expect(determination(replacement, "MATERNITY").status).toBe("NOT_ELIGIBLE")
  })

  it("warns when the title ends before the birth and the employer terminated without a judgment", () => {
    const a = assess({
      asOf: "2027-02-01",
      event: { kind: "PREGNANCY", expectedDueDate: BIRTH, childrenCount: 1 },
      parents: [employee({ insurance: { title: "EMPLOYMENT", startDate: "2024-01-01", endDate: "2027-01-31", endReason: "TERMINATION_BY_EMPLOYER" } })],
    })
    expect(determination(a, "MATERNITY").status).toBe("NOT_ELIGIBLE")
    expect(hasWarning(a, "TERMINATION_DURING_PROTECTION")).toBe(true)
    expect(hasWarning(a, "INSURANCE_ENDS_BEFORE_BIRTH")).toBe(true)
  })

  it("lets the father take over after the mother's death", () => {
    const a = assess({
      parents: [employee({ deathDate: "2027-03-25" }), father()],
      plan: { maternityTakeover: { reason: "MOTHER_DIED" } },
    })
    expect(period(a, "maternity")).toMatchObject({ parent: "MOTHER", end: "2027-03-25" })
    expect(period(a, "maternity-father")).toMatchObject({ parent: "FATHER", start: "2027-03-26", end: "2027-07-27" })
  })

  it("lets the father take over from an uninsured mother who died", () => {
    const a = assess({
      parents: [employee({ insurance: { title: "NONE" }, deathDate: "2027-03-25" }), father()],
      plan: { maternityTakeover: { reason: "UNINSURED_MOTHER_DIED" } },
    })
    expect(determination(a, "MATERNITY").status).toBe("NOT_ELIGIBLE")
    expect(period(a, "maternity-father")).toMatchObject({ start: "2027-03-26", end: "2027-07-27" })
  })
})

describe("sickness in pregnancy and special benefits", () => {
  const sickLines = (a: ReturnType<typeof assess>) =>
    a.breakdown.filter((item) => item.benefit === "SICKNESS_IN_PREGNANCY" || item.benefit === "EMPLOYER_SICK_PAY")
  const pregnant = (leave: object, mother = employee()) =>
    assess({ asOf: "2026-12-15", event: { kind: "PREGNANCY", expectedDueDate: "2027-05-01", childrenCount: 1 }, parents: [mother], sickLeave: { pregnancyCode: true, ...leave } as never })

  it("pays employer sick pay for 33 days a year and sickness benefit after, both at 100% with code B", () => {
    const a = pregnant({ start: "2026-12-20", end: "2027-02-10" })
    expect(line(a, "sick-pay-2026")).toMatchObject({ days: 12, ratePercent: "100%", amountGrosze: 276_128 })
    expect(line(a, "sick-pay-2027")).toMatchObject({ days: 33, amountGrosze: 759_352 })
    expect(line(a, "sickness-2027")).toMatchObject({ days: 8, benefit: "SICKNESS_IN_PREGNANCY", amountGrosze: 184_085 })
    expect(determination(a, "SICKNESS_IN_PREGNANCY").status).toBe("ELIGIBLE")
  })

  it("pays 80% when the certificate has no pregnancy code, and asks about it", () => {
    const a = pregnant({ start: "2027-01-05", end: "2027-01-14", pregnancyCode: false })
    expect(line(a, "sick-pay-2027").ratePercent).toBe("80%")
    expect(missingKeys(a)).toContain("sickLeave.pregnancyCode")
  })

  it("pays a non-employee from the first day of incapacity", () => {
    const a = pregnant(
      { start: "2027-01-05", end: "2027-01-14" },
      employee({ insurance: { title: "MANDATE", sicknessInsurance: "VOLUNTARY", startDate: "2026-01-01", payerSize: "UP_TO_20" } })
    )
    expect(sickLines(a).map((item) => item.benefit)).toEqual(["SICKNESS_IN_PREGNANCY"])
    expect(line(a, "sickness").days).toBe(10)
  })

  it("explains the rehabilitation benefit when the 270-day period is exhausted", () => {
    const a = pregnant({ start: "2027-01-05", end: "2027-01-14", priorDaysInBenefitPeriod: 265 })
    expect(sickLines(a).reduce((sum, item) => sum + item.days, 0)).toBe(5)
    const rehab = determination(a, "REHABILITATION")
    expect(rehab.status).toBe("CONDITIONAL")
    expect(rehab.reasons[0]!.text).toContain("100%")
  })

  it("covers sickness after the insurance ended when incapacity started within 14 days and lasts 30 days", () => {
    const mother = employee({ insurance: { title: "EMPLOYMENT", startDate: "2024-01-01", endDate: "2026-12-31", payerSize: "OVER_20" } })
    const a = pregnant({ start: "2027-01-10", end: "2027-02-08" }, mother)
    expect(determination(a, "SICKNESS_IN_PREGNANCY").status).toBe("ELIGIBLE")
    expect(determination(a, "SICKNESS_IN_PREGNANCY").payer).toBe("ZUS")
  })
})

describe("routing, documents, comparison and timeline services", () => {
  it("identifies documents per benefit, with where to submit and due dates", () => {
    const docs = identifyRequiredDocuments({
      asOf: "2027-02-01",
      event: { kind: "PREGNANCY", expectedDueDate: BIRTH, childrenCount: 1 },
      parents: [employee(), father()],
      plan: { maternityWeeksBeforeBirth: 2, paymentOption: "FLAT_81_5" },
      providedDocuments: ["odpis-au"],
    })
    const codes = docs.documents.map((doc) => doc.code)
    expect(codes).toEqual(expect.arrayContaining(["WNIOSEK-URLOP-MACIERZYNSKI", "ZASW-TERMIN-PORODU", "WNIOSEK-81,5", "WNIOSEK-URLOP-RODZICIELSKI", "WNIOSEK-URLOP-OJCOWSKI"]))
    expect(docs.documents.find((doc) => doc.code === "WNIOSEK-URLOP-MACIERZYNSKI")?.dueDate).toBe("2027-02-10")
    expect(docs.documents.find((doc) => doc.code === "WNIOSEK-81,5")?.dueDate).toBe("2027-03-31")
    expect(docs.documents.find((doc) => doc.code === "ODPIS-AU" && doc.parent === "MOTHER")?.provided).toBe(true)
    expect(docs.routing.find((entry) => entry.parent === "MOTHER")?.payer).toBe("EMPLOYER")
    expect(docs.routing.find((entry) => entry.parent === "FATHER")?.payer).toBe("ZUS")
  })

  it("uses the legacy forms before 24 October 2026 and ZAM afterwards", () => {
    const mother = employee({ insurance: { title: "SELF_EMPLOYMENT", sicknessInsurance: "VOLUNTARY", startDate: "2024-01-01", contributionDebt: { exists: false } } })
    const before = identifyRequiredDocuments({ asOf: "2026-09-15", event: born({ birthDate: "2026-09-01" }), parents: [mother] })
    expect(before.ruleSet.version).toBe("2026.07-Z1")
    expect(before.documents.map((doc) => doc.code)).toEqual(expect.arrayContaining(["Z-3B"]))
    const after = identifyRequiredDocuments({ asOf: "2026-11-15", event: born({ birthDate: "2026-11-01" }), parents: [mother] })
    expect(after.ruleSet.version).toBe("2026.10-Z1")
    expect(after.documents.map((doc) => doc.code)).toContain("ZAM")
    expect(after.documents.map((doc) => doc.code)).not.toContain("Z-3B")
  })

  it("compares leave plans and reports the difference against the first scenario", () => {
    const result = compareBenefitScenarios(
      { asOf: AFTER_BIRTH, event: born(), parents: [employee(), father()] },
      [
        { name: "Mama całość", plan: { parentalSegments: [{ parent: "MOTHER", weeks: 32 }], paternity: [] } },
        { name: "Tata 9 tygodni", plan: { parentalSegments: [{ parent: "MOTHER", weeks: 32 }, { parent: "FATHER", weeks: 9 }], paternity: [] } },
      ]
    )
    expect(result.outcomes[0]!.differenceGrosze).toBe(0)
    expect(result.outcomes[0]!.totalGrosze).toBe(6_829_566)
    // 63 days at 70% of the father's basis (450 000 gr).
    expect(result.outcomes[1]!.differenceGrosze).toBe(661_500)
    expect(result.outcomes[1]!.lastLeaveDay.FATHER).toBe("2028-05-09")
  })

  it("generates a dated timeline with deadlines and their status", () => {
    const report = generateBenefitTimeline({
      asOf: "2027-03-15",
      event: born(),
      parents: [employee(), father()],
      plan: { paymentOption: "FLAT_81_5" },
    })
    const deadline = report.timeline.find((entry) => entry.id === "deadline-81-5")!
    expect(deadline).toMatchObject({ date: "2027-03-31", status: "UPCOMING", kind: "DEADLINE" })
    expect(report.timeline.find((entry) => entry.id === "anchor")?.status).toBe("PASSED")
    expect(report.timeline.map((entry) => entry.date)).toEqual([...report.timeline.map((entry) => entry.date)].sort())
    expect(report.timeline.find((entry) => entry.id === "deadline-paternity")?.date).toBe("2028-03-09")
  })

  it("evaluates eligibility without any amounts or periods needed", () => {
    const report = evaluateEligibility({ asOf: AFTER_BIRTH, event: born(), parents: [employee()] })
    expect(report.eligibility.determinations.length).toBeGreaterThan(0)
    expect(report.applicableBenefits.find((item) => item.benefit === "MATERNITY")?.status).toBe("ELIGIBLE")
  })
})

describe("determinism", () => {
  it("returns identical output and hash for identical input, and a new hash when input changes", () => {
    const first = run()
    const second = run()
    expect(JSON.stringify(first.assessment)).toBe(JSON.stringify(second.assessment))
    expect(first.assessment.inputHash).toMatch(/^[0-9a-f]{64}$/)
    const changed = run({ parents: [employee({ basis: { method: "GROSS_MONTHLY", grossMonthlyGrosze: 800_001 } })] })
    expect(changed.assessment.inputHash).not.toBe(first.assessment.inputHash)
  })
})
