import { describe, expect, it } from "vitest"

import { evaluate } from "./evaluate"
import { AssessmentInputError } from "./validation"
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
} from "./test-fixtures"
import type { Assessment, InsuranceInput } from "./types"

/**
 * Boundary tests: each legal threshold is checked one day / one unit on each
 * side. Expected values are computed independently of the engine.
 */

const pregnantWithLeave = (leave: object, insurance: InsuranceInput, extra: object = {}) =>
  assess({
    asOf: "2026-12-15",
    event: { kind: "PREGNANCY", expectedDueDate: "2027-06-01", childrenCount: 1 },
    parents: [employee({ insurance, ...extra })],
    sickLeave: { pregnancyCode: true, ...leave } as never,
  })

const sickLines = (a: Assessment) =>
  a.breakdown.filter((item) => item.benefit === "SICKNESS_IN_PREGNANCY" || item.benefit === "EMPLOYER_SICK_PAY")
const sickDays = (a: Assessment) => sickLines(a).reduce((sum, item) => sum + item.days, 0)

describe("waiting period for sickness benefit (U art. 4 ust. 1–3)", () => {
  const compulsory: InsuranceInput = { title: "EMPLOYMENT", startDate: "2026-12-01", payerSize: "OVER_20" }

  it("30 days of compulsory insurance: the right starts on day 31", () => {
    const onTime = pregnantWithLeave({ start: "2026-12-31", end: "2027-01-05" }, compulsory)
    expect(sickDays(onTime)).toBe(6)
    expect(sickLines(onTime)[0]!.period!.start).toBe("2026-12-31")
    const oneDayEarly = pregnantWithLeave({ start: "2026-12-30", end: "2027-01-05" }, compulsory)
    expect(sickDays(oneDayEarly)).toBe(6)
    expect(sickLines(oneDayEarly)[0]!.period!.start).toBe("2026-12-31")
    expect(determination(oneDayEarly, "SICKNESS_IN_PREGNANCY").reasons.map((r) => r.code)).toContain("WAITING_PARTIAL")
    expect(sickLines(oneDayEarly)[0]!.amountGrosze).toBeLessThanOrEqual(138_064)
  })

  it("a leave that ends before the waiting period is over gives no right", () => {
    const a = pregnantWithLeave({ start: "2026-12-10", end: "2026-12-30" }, compulsory)
    expect(determination(a, "SICKNESS_IN_PREGNANCY").status).toBe("NOT_ELIGIBLE")
    expect(sickLines(a)).toEqual([])
  })

  it("90 days for voluntary insurance", () => {
    const voluntary: InsuranceInput = { title: "MANDATE", sicknessInsurance: "VOLUNTARY", startDate: "2026-10-01", payerSize: "UP_TO_20" }
    const ok = pregnantWithLeave({ start: "2026-12-30", end: "2027-01-05" }, voluntary)
    expect(sickLines(ok)[0]!.period!.start).toBe("2026-12-30")
    const early = pregnantWithLeave({ start: "2026-12-29", end: "2027-01-05" }, voluntary)
    expect(sickLines(early)[0]!.period!.start).toBe("2026-12-30")
  })

  it("has no waiting period when a day-one exception applies (U art. 4 ust. 3)", () => {
    const a = pregnantWithLeave({ start: "2026-12-21", end: "2026-12-28" }, { ...compulsory, startDate: "2026-12-20", dayOneException: "GRADUATE_WITHIN_90_DAYS" })
    expect(sickDays(a)).toBe(8)
  })

  it("counts an earlier insurance when the gap is at most 30 days, not 31 (U art. 4 ust. 2)", () => {
    const prior = { previousInsuranceStartDate: "2026-09-01", previousInsuranceEndDate: "2026-10-31" }
    const gap30 = pregnantWithLeave({ start: "2026-12-15", end: "2026-12-20" }, { ...compulsory, ...prior, startDate: "2026-12-01" })
    expect(sickDays(gap30)).toBe(6)
    const gap31 = pregnantWithLeave({ start: "2026-12-15", end: "2026-12-20" }, { ...compulsory, ...prior, startDate: "2026-12-02" })
    expect(determination(gap31, "SICKNESS_IN_PREGNANCY").status).toBe("NOT_ELIGIBLE")
    const gap31Unpaid = pregnantWithLeave(
      { start: "2026-12-15", end: "2026-12-20" },
      { ...compulsory, ...prior, startDate: "2026-12-02", previousGapReason: "UNPAID_LEAVE" }
    )
    expect(sickDays(gap31Unpaid)).toBe(6)
  })

  it("asks for the insurance start date instead of assuming the waiting period is over", () => {
    const a = pregnantWithLeave({ start: "2026-12-30", end: "2027-01-05" }, { title: "EMPLOYMENT", payerSize: "OVER_20" })
    expect(determination(a, "SICKNESS_IN_PREGNANCY").status).toBe("NEEDS_INPUT")
    expect(missingKeys(a)).toContain("insurance.startDate")
  })
})

describe("okres zasiłkowy and employer sick pay (U art. 8–9; KP art. 92)", () => {
  const insurance: InsuranceInput = { title: "EMPLOYMENT", startDate: "2024-01-01", payerSize: "OVER_20" }

  it("pays at most 270 days in pregnancy", () => {
    const a = pregnantWithLeave({ start: "2027-01-05", end: "2027-10-31" }, insurance)
    expect(sickDays(a)).toBe(270)
    expect(Math.max(...sickLines(a).map((item) => Number(item.period!.end.replace(/-/g, ""))))).toBe(20_271_001)
    expect(hasWarning(a, "BENEFIT_PERIOD_EXHAUSTED")).toBe(true)
  })

  it("269 days already used leaves exactly one payable day; 270 leaves none", () => {
    const last = pregnantWithLeave({ start: "2027-01-05", end: "2027-01-09", priorDaysInBenefitPeriod: 269 }, insurance)
    expect(sickDays(last)).toBe(1)
    const none = pregnantWithLeave({ start: "2027-01-05", end: "2027-01-09", priorDaysInBenefitPeriod: 270 }, insurance)
    expect(sickLines(none)).toEqual([])
    expect(determination(none, "REHABILITATION").status).toBe("CONDITIONAL")
  })

  it("employer pays 33 days, or 14 from the year after the employee turns 50", () => {
    const leave = { start: "2027-02-01", end: "2027-03-15" } // 43 days
    const young = pregnantWithLeave(leave, insurance, { birthYear: 1977 }) // turns 50 in 2027 → still 33 in 2027
    expect(line(young, "sick-pay-2027").days).toBe(33)
    expect(line(young, "sickness-2027").days).toBe(10)
    const older = pregnantWithLeave(leave, insurance, { birthYear: 1976 }) // turned 50 in 2026 → 14 from 2027
    expect(line(older, "sick-pay-2027")).toMatchObject({ days: 14, amountGrosze: 322_149 })
    expect(line(older, "sickness-2027")).toMatchObject({ days: 29, amountGrosze: 667_309 })
  })

  it("deducts employer-paid days already used this year", () => {
    const a = pregnantWithLeave({ start: "2027-02-01", end: "2027-02-10", employerPaidDaysUsedThisYear: 30 }, insurance, { birthYear: 1990 })
    expect(line(a, "sick-pay-2027")).toMatchObject({ days: 3, amountGrosze: 69_032 })
    expect(line(a, "sickness-2027").days).toBe(7)
  })
})

describe("sickness benefit after the insurance ended (U art. 7)", () => {
  const ended: InsuranceInput = { title: "EMPLOYMENT", startDate: "2024-01-01", endDate: "2026-12-31", payerSize: "OVER_20" }

  it("requires onset within 14 days of the end and at least 30 days of incapacity", () => {
    expect(determination(pregnantWithLeave({ start: "2027-01-14", end: "2027-02-12" }, ended), "SICKNESS_IN_PREGNANCY").status).toBe("ELIGIBLE")
    expect(determination(pregnantWithLeave({ start: "2027-01-15", end: "2027-02-13" }, ended), "SICKNESS_IN_PREGNANCY").status).toBe("NOT_ELIGIBLE")
    expect(determination(pregnantWithLeave({ start: "2027-01-14", end: "2027-02-11" }, ended), "SICKNESS_IN_PREGNANCY").status).toBe("NOT_ELIGIBLE")
  })

  it("is paid by ZUS and warns that the cap on the basis could not be checked", () => {
    const a = pregnantWithLeave({ start: "2027-01-14", end: "2027-02-12" }, ended)
    expect(determination(a, "SICKNESS_IN_PREGNANCY").payer).toBe("ZUS")
    expect(hasWarning(a, "AFTER_TITLE_BASIS_CAP")).toBe(true)
  })
})

describe("insurance on the day the right arises (U art. 29 ust. 1)", () => {
  const withInsurance = (insurance: InsuranceInput) => assess({ parents: [employee({ insurance })] })

  it("the last insured day is enough; the day after is not", () => {
    expect(determination(withInsurance({ title: "EMPLOYMENT", endDate: BIRTH }), "MATERNITY").status).toBe("ELIGIBLE")
    expect(determination(withInsurance({ title: "EMPLOYMENT", endDate: "2027-03-09" }), "MATERNITY").status).toBe("NOT_ELIGIBLE")
  })

  it("insurance that starts on the birth date is enough — there is no waiting period for maternity benefit", () => {
    expect(determination(withInsurance({ title: "EMPLOYMENT", startDate: BIRTH }), "MATERNITY").status).toBe("ELIGIBLE")
    expect(determination(withInsurance({ title: "EMPLOYMENT", startDate: "2027-03-11" }), "MATERNITY").status).toBe("NOT_ELIGIBLE")
  })

  it("counts a period of childcare leave (urlop wychowawczy) as insurance", () => {
    expect(determination(withInsurance({ title: "EMPLOYMENT", endDate: "2026-06-30", onChildcareLeave: true }), "MATERNITY").status).toBe("ELIGIBLE")
  })

  it("a forecast depends on the insurance lasting until the birth", () => {
    const a = assess({
      asOf: "2026-11-21",
      event: { kind: "PREGNANCY", expectedDueDate: BIRTH },
      parents: [employee({ insurance: { title: "MANDATE", sicknessInsurance: "VOLUNTARY", startDate: "2026-05-01", endDate: "2027-02-28", payerSize: "UP_TO_20" } })],
    })
    expect(determination(a, "MATERNITY").status).toBe("NOT_ELIGIBLE")
    expect(hasWarning(a, "INSURANCE_ENDS_BEFORE_BIRTH")).toBe(true)
  })
})

describe("the 81.5% application deadline (U art. 30a): 21 days, counted from the day after the birth", () => {
  const flat = (filed?: string, asOf = AFTER_BIRTH) =>
    assess({ asOf, plan: { paymentOption: "FLAT_81_5", flatRateApplicationDate: filed, parentalSegments: [{ parent: "MOTHER", weeks: 32 }] } })

  it("accepts the 21st day and rejects the 22nd", () => {
    expect(line(flat("2027-03-31"), "maternity").ratePercent).toBe("81,5%")
    expect(line(flat("2027-04-01"), "maternity").ratePercent).toBe("100%")
    expect(line(flat("2027-03-10"), "maternity").ratePercent).toBe("81,5%")
  })

  it("without a filing date, the deadline day itself is still open; the next day it has passed", () => {
    const open = flat(undefined, "2027-03-31")
    expect(line(open, "maternity").ratePercent).toBe("81,5%")
    expect(open.nextSteps.find((step) => step.ruleId === "LR-130A")?.dueDate).toBe("2027-03-31")
    const passed = flat(undefined, "2027-04-01")
    expect(line(passed, "maternity").ratePercent).toBe("100%")
    expect(hasWarning(passed, "FLAT_DEADLINE_PASSED")).toBe(true)
  })

  it("counts from the day the child is taken in for adoption", () => {
    const a = assess({
      asOf: "2027-02-04",
      event: { kind: "ADOPTION", childBirthDate: "2023-05-01", careTakingDate: "2027-01-15", courtApplicationDate: "2027-01-18" },
      plan: { paymentOption: "FLAT_81_5", flatRateApplicationDate: "2027-02-05" },
    })
    expect(line(a, "maternity-terms").ratePercent).toBe("81,5%")
    expect(a.timeline.find((entry) => entry.id === "deadline-81-5")?.date).toBe("2027-02-05")
  })

  it("is not offered after a stillbirth, where there is no parental leave", () => {
    const a = assess({ event: born({ stillbirth: true }), plan: { paymentOption: "FLAT_81_5", flatRateApplicationDate: "2027-03-12" } })
    expect(line(a, "maternity").ratePercent).toBe("100%")
  })
})

describe("maternity leave before the birth (KP art. 180 § 2)", () => {
  const pre = (weeks: number, extra: object = {}) =>
    assess({ asOf: "2026-11-21", event: { kind: "PREGNANCY", expectedDueDate: BIRTH, childrenCount: 1 }, plan: { maternityWeeksBeforeBirth: weeks, ...extra } })

  it("allows exactly 6 weeks before the due date, paid at 100% from the first day", () => {
    const a = pre(6)
    expect(period(a, "maternity-pre")).toMatchObject({ start: "2027-01-27", end: "2027-03-09", days: 42 })
    expect(period(a, "maternity")).toMatchObject({ start: BIRTH, days: 98 })
    expect(line(a, "maternity-pre").amountGrosze).toBe(966_448)
    expect(line(a, "maternity").amountGrosze).toBe(2_255_045)
    expect(a.timeline.find((entry) => entry.id === "deadline-pre-birth")?.date).toBe("2027-01-13")
  })

  it("never exceeds the maternity dimension in total", () => {
    const a = pre(6)
    expect(a.periods.filter((item) => item.benefit === "MATERNITY").reduce((sum, item) => sum + item.days, 0)).toBe(140)
  })

  it("corrects 7 weeks and a start earlier than 6 weeks before the due date", () => {
    const seven = pre(7)
    expect(period(seven, "maternity-pre").days).toBe(42)
    expect(seven.planAdjustments.join(" ")).toContain("od 0 do 6 tygodni")
    const early = pre(0, { maternityStartDate: "2027-01-20" })
    expect(period(early, "maternity-pre").start).toBe("2027-01-27")
    expect(early.planAdjustments.join(" ")).toContain("najwcześniej 6 tygodni")
  })

  it("keeps the pre-birth part at 100% under the 81.5% variant", () => {
    const a = pre(2, { paymentOption: "FLAT_81_5", flatRateApplicationDate: "2027-03-31" })
    expect(line(a, "maternity-pre").ratePercent).toBe("100%")
    expect(a.assumptions.join(" ")).toContain("A-26")
  })

  it("starts on the birth date when no leave is taken before the birth", () => {
    expect(period(pre(0), "maternity").start).toBe(BIRTH)
  })
})

describe("takeover of maternity leave (KP art. 180 § 4–17)", () => {
  const takeover = (reason: string, extra: object = {}, mother: object = {}) =>
    assess({ parents: [employee(mother), father()], plan: { maternityTakeover: { reason, ...extra } as never } })

  it("needs at least 14 weeks used by the mother, 8 in special cases", () => {
    const resign = takeover("MOTHER_RESIGNS_AFTER_14_WEEKS", { motherWeeksAfterBirth: 13 })
    expect(period(resign, "maternity").days).toBe(98)
    expect(resign.planAdjustments.join(" ")).toContain("14 tygodni")
    const incapacity = takeover("MOTHER_INCAPACITY", { motherWeeksAfterBirth: 8 }, { incapacityForIndependentExistence: true })
    expect(period(incapacity, "maternity").days).toBe(56)
    expect(period(incapacity, "maternity-father").start).toBe("2027-05-05")
    const noRuling = takeover("MOTHER_INCAPACITY", { motherWeeksAfterBirth: 8 })
    expect(missingKeys(noRuling)).toContain("mother.incapacityForIndependentExistence")
  })

  it("lets the father take over for the mother's hospital stay only, and the mother resume", () => {
    const a = takeover("MOTHER_HOSPITALIZED", {}, { hospitalization: { start: "2027-05-10", end: "2027-05-20" } })
    expect(period(a, "maternity")).toMatchObject({ end: "2027-05-09", days: 61 })
    expect(period(a, "maternity-father")).toMatchObject({ start: "2027-05-10", end: "2027-05-20", days: 11 })
    expect(period(a, "maternity-resumed")).toMatchObject({ start: "2027-05-21", end: "2027-07-27", days: 68 })
    expect(line(a, "maternity").amountGrosze).toBe(1_403_651)
    expect(line(a, "maternity-father").amountGrosze).toBe(165_000)
    expect(line(a, "maternity-resumed").amountGrosze).toBe(1_564_725)
    // KP art. 180 § 14: never more than the dimension in total.
    expect(a.periods.filter((item) => item.benefit === "MATERNITY").reduce((sum, item) => sum + item.days, 0)).toBe(140)
  })

  it("does not let the father start before the mother used 8 weeks in the hospital case", () => {
    const a = takeover("MOTHER_HOSPITALIZED", {}, { hospitalization: { start: "2027-04-01", end: "2027-05-20" } })
    expect(period(a, "maternity-father").start).toBe("2027-05-05")
  })

  it("lets the mother's abandonment give the father the rest, not earlier than week 8", () => {
    const early = takeover("MOTHER_ABANDONED_CHILD", {}, { abandonedChildOn: "2027-04-01" })
    expect(period(early, "maternity").end).toBe("2027-05-04")
    expect(period(early, "maternity-father").start).toBe("2027-05-05")
    const late = takeover("MOTHER_ABANDONED_CHILD", {}, { abandonedChildOn: "2027-06-01" })
    expect(period(late, "maternity-father").start).toBe("2027-06-02")
  })

  it("keeps the rest with the mother when the father has no right to the benefit", () => {
    const a = assess({
      parents: [employee(), father({ insurance: { title: "NONE" } })],
      plan: { maternityTakeover: { reason: "MOTHER_RESIGNS_AFTER_14_WEEKS", motherWeeksAfterBirth: 14 } },
    })
    expect(a.periods.some((item) => item.id === "maternity-father")).toBe(false)
    expect(a.periods.filter((item) => item.benefit === "MATERNITY").reduce((sum, item) => sum + item.days, 0)).toBe(140)
    expect(a.planAdjustments.join(" ")).toContain("brak ubezpieczenia")
  })
})

describe("parental leave limits (KP art. 182¹a–182¹c)", () => {
  const segments = (count: number) =>
    Array.from({ length: count }, (_, index) => ({
      parent: "MOTHER" as const,
      weeks: 1,
      startDate: new Date(Date.UTC(2027, 7, 1 + index * 14)).toISOString().slice(0, 10),
    }))

  it("allows at most 5 parts for both parents together", () => {
    const a = assess({ plan: { parentalSegments: segments(6) } })
    expect(a.periods.filter((item) => item.benefit === "PARENTAL")).toHaveLength(5)
    expect(a.planAdjustments.join(" ")).toContain("najwyżej na 5 części")
    const split = assess({
      parents: [employee(), father()],
      plan: {
        parentalSegments: [
          ...segments(3),
          { parent: "FATHER" as const, weeks: 1, startDate: "2028-01-10" },
          { parent: "FATHER" as const, weeks: 1, startDate: "2028-02-10" },
          { parent: "FATHER" as const, weeks: 1, startDate: "2028-03-10" },
        ],
      },
    })
    expect(split.periods.filter((item) => item.benefit === "PARENTAL")).toHaveLength(5)
  })

  it("must be used by the end of the year in which the child turns 6", () => {
    const clipped = assess({ plan: { parentalSegments: [{ parent: "MOTHER", weeks: 32, startDate: "2033-12-01" }] } })
    expect(period(clipped, "parental-1")).toMatchObject({ start: "2033-12-01", end: "2033-12-31", days: 31 })
    const late = assess({ plan: { parentalSegments: [{ parent: "MOTHER", weeks: 4, startDate: "2034-01-01" }] } })
    expect(late.periods.some((item) => item.benefit === "PARENTAL")).toBe(false)
    expect(late.planAdjustments.join(" ")).toContain("2033-12-31")
  })

  it("must not exceed the pool even when the parents use leave at the same time", () => {
    const a = assess({
      parents: [employee(), father()],
      plan: {
        parentalSegments: [
          { parent: "MOTHER", weeks: 32, startDate: "2027-08-01" },
          { parent: "FATHER", weeks: 9, startDate: "2027-08-01" },
        ],
      },
    })
    const total = a.periods.filter((item) => item.benefit === "PARENTAL").reduce((sum, item) => sum + item.days, 0)
    expect(total).toBe(287)
    expect(total).toBeLessThanOrEqual(41 * 7)
  })

  it("splits the father's segment at his nine reserved weeks: 70% reserved, the rest follows the 81.5% variant", () => {
    const a = assess({
      parents: [employee(), father()],
      plan: {
        paymentOption: "FLAT_81_5",
        flatRateApplicationDate: "2027-03-20",
        parentalSegments: [
          { parent: "MOTHER", weeks: 16 },
          { parent: "FATHER", weeks: 12 },
        ],
      },
    })
    expect(line(a, "parental-2-1")).toMatchObject({ days: 63, ratePercent: "70%" })
    expect(line(a, "parental-2-2")).toMatchObject({ days: 21, ratePercent: "81,5%" })
  })
})

describe("paternity leave (KP art. 182³)", () => {
  const withPlan = (paternity: object[], extra: object = {}) =>
    assess({ parents: [employee(), father()], plan: { parentalSegments: [{ parent: "MOTHER", weeks: 32 }], paternity: paternity as never }, ...extra })
  const days = (a: Assessment) => a.periods.filter((item) => item.benefit === "PATERNITY").reduce((sum, item) => sum + item.days, 0)

  it("is at most 14 days and twins do not extend it", () => {
    expect(days(withPlan([{ days: 20 }]))).toBe(14)
    expect(withPlan([{ days: 20 }]).planAdjustments.join(" ")).toContain("14 dni")
    expect(days(assess({ event: born({ childrenCount: 2 }), parents: [employee(), father()] }))).toBe(14)
  })

  it("splits into at most two parts of at least a week each", () => {
    const tooShort = withPlan([{ days: 3 }, { days: 3 }])
    expect(tooShort.periods.filter((item) => item.benefit === "PATERNITY").map((item) => item.days)).toEqual([7, 7])
    expect(tooShort.planAdjustments.join(" ")).toContain("nie może być krótsza niż tydzień")
    const three = withPlan([{ days: 7 }, { days: 4 }, { days: 3 }])
    expect(three.periods.filter((item) => item.benefit === "PATERNITY")).toHaveLength(2)
    expect(three.planAdjustments.join(" ")).toContain("najwyżej w 2 częściach")
  })

  it("lapses after the day before the child's first birthday", () => {
    const lastDay = withPlan([{ startDate: "2028-03-08", days: 14 }])
    expect(period(lastDay, "paternity-1")).toMatchObject({ start: "2028-03-08", end: "2028-03-09", days: 2 })
    expect(lastDay.planAdjustments.join(" ")).toContain("2028-03-09")
    const tooLate = withPlan([{ startDate: "2028-03-10", days: 14 }])
    expect(tooLate.periods.some((item) => item.benefit === "PATERNITY")).toBe(false)
    expect(tooLate.timeline.find((entry) => entry.id === "deadline-paternity")?.date).toBe("2028-03-09")
  })

  it("expires the right when no leave was taken and the deadline has passed", () => {
    const a = assess({ asOf: "2028-03-10", parents: [employee(), father()], plan: { paternity: [] } })
    expect(determination(a, "PATERNITY", "FATHER").status).toBe("NOT_ELIGIBLE")
    expect(determination(a, "PATERNITY", "FATHER").reasons.map((r) => r.code)).toContain("PATERNITY_EXPIRED")
  })

  it("applies the leap-day convention for a child born on 29 February", () => {
    const a = assess({ asOf: "2028-04-01", event: born({ birthDate: "2028-02-29" }), parents: [employee(), father()] })
    expect(a.timeline.find((entry) => entry.id === "deadline-paternity")?.date).toBe("2029-02-27")
    expect(a.assumptions.join(" ")).toContain("A-22")
  })

  it("grants the benefit to an insured non-employee father, and to a father who started work after the birth", () => {
    const selfEmployed = father({ insurance: { title: "SELF_EMPLOYMENT", sicknessInsurance: "VOLUNTARY", startDate: "2020-01-01", contributionDebt: { exists: false } } })
    const a = assess({ parents: [employee(), selfEmployed] })
    expect(determination(a, "PATERNITY", "FATHER").status).toBe("ELIGIBLE")
    expect(determination(a, "PATERNITY", "FATHER").payer).toBe("ZUS")
    const lateFather = father({ insurance: { title: "EMPLOYMENT", startDate: "2027-03-20", payerSize: "UP_TO_20" } })
    const forecast = assess({ parents: [employee(), lateFather], plan: { paternity: [{ startDate: "2027-04-05", days: 14 }] } })
    // The first leave day is still in the future on 2027-04-01, so the right is a forecast.
    expect(determination(forecast, "PATERNITY", "FATHER").status).toBe("CONDITIONAL")
    const later = assess({ asOf: "2027-04-10", parents: [employee(), lateFather], plan: { paternity: [{ startDate: "2027-04-05", days: 14 }] } })
    expect(determination(later, "PATERNITY", "FATHER").status).toBe("ELIGIBLE")
    expect(determination(later, "PATERNITY", "FATHER").reasons.map((r) => r.code)).toContain("STARTED_WORK_AFTER_BIRTH")
    expect(period(later, "paternity-1").days).toBe(14)
    expect(line(later, "paternity-1").amountGrosze).toBe(210_000)
  })

  it("does not apply to foster families and is limited by the 14th birthday after adoption", () => {
    const foster = assess({
      asOf: "2027-02-01",
      event: { kind: "FOSTER_CARE", childBirthDate: "2023-05-01", careTakingDate: "2027-01-15" },
      parents: [employee(), father()],
    })
    expect(determination(foster, "PATERNITY", "FATHER").status).toBe("NOT_ELIGIBLE")
    const adopted = assess({
      asOf: "2026-12-10",
      event: { kind: "ADOPTION", childBirthDate: "2013-03-01", careTakingDate: "2026-11-15", courtApplicationDate: "2026-11-16", adoptionFinalDate: "2026-12-01" },
      parents: [employee(), father()],
    })
    expect(adopted.timeline.find((entry) => entry.id === "deadline-paternity")?.date).toBe("2027-02-28")
  })
})

describe("age limits for adoption and foster care (U art. 29 ust. 1 pkt 2–3; KP art. 183)", () => {
  const adoption = (dob: string, care: string) =>
    assess({ asOf: care, event: { kind: "ADOPTION", childBirthDate: dob, careTakingDate: care, courtApplicationDate: care } })
  const foster = (dob: string, care: string, extra: object = {}) =>
    assess({ asOf: care, event: { kind: "FOSTER_CARE", childBirthDate: dob, careTakingDate: care, ...extra } })

  it("adoption: until the child turns 14", () => {
    expect(determination(adoption("2013-01-15", "2027-01-14"), "MATERNITY_TERMS").status).toBe("ELIGIBLE")
    const tooOld = determination(adoption("2013-01-15", "2027-01-15"), "MATERNITY_TERMS")
    expect(tooOld.status).toBe("NOT_ELIGIBLE")
    expect(tooOld.reasons.map((r) => r.code)).toContain("CHILD_TOO_OLD")
  })

  it("foster care: until the child turns 7, or 10 when schooling was deferred", () => {
    expect(determination(foster("2020-01-16", "2027-01-15"), "MATERNITY_TERMS").status).toBe("ELIGIBLE")
    expect(determination(foster("2020-01-16", "2027-01-16"), "MATERNITY_TERMS").status).toBe("NOT_ELIGIBLE")
    expect(determination(foster("2020-01-16", "2027-01-16", { schoolDeferred: true }), "MATERNITY_TERMS").status).toBe("ELIGIBLE")
    expect(determination(foster("2017-01-16", "2027-01-15", { schoolDeferred: true }), "MATERNITY_TERMS").status).toBe("ELIGIBLE")
    expect(determination(foster("2017-01-15", "2027-01-15", { schoolDeferred: true }), "MATERNITY_TERMS").status).toBe("NOT_ELIGIBLE")
  })
})

describe("supplementary maternity leave variants (KP art. 180² § 1)", () => {
  const supplementary = (weeks: number | undefined, grams: number | undefined, stays: { start: string; end: string }[]) =>
    assess({ event: born({ gestationalWeeksCompleted: weeks, lowestBirthWeightGrams: grams, childHospitalStays: stays }) })
  const weeksOf = (a: Assessment) => a.periods.find((item) => item.benefit === "SUPPLEMENTARY_MATERNITY")?.days ?? 0
  const longStay = [{ start: "2027-03-10", end: "2027-07-08" }] // 121 days

  it.each([
    [27, 1500, "SUPPLEMENTARY_A", 105],
    [28, 1500, "SUPPLEMENTARY_B", 56],
    [36, 1500, "SUPPLEMENTARY_B", 56],
    [37, 3000, "SUPPLEMENTARY_C", 56],
    [40, 1000, "SUPPLEMENTARY_A", 105],
    [40, 1001, "SUPPLEMENTARY_C", 56],
    [30, 1001, "SUPPLEMENTARY_B", 56],
  ])("%i completed weeks, %i g → %s (%i days)", (weeks, grams, code, days) => {
    const a = supplementary(weeks, grams, weeks >= 37 ? [{ start: "2027-03-14", end: "2027-07-08" }] : longStay)
    expect(determination(a, "SUPPLEMENTARY_MATERNITY").reasons[0]!.code).toBe(code)
    expect(weeksOf(a)).toBe(days)
  })

  it("counts only the stay inside the window (15 weeks for variants A, 8 for B)", () => {
    const a = supplementary(27, 900, [{ start: "2027-06-17", end: "2027-06-30" }]) // days 100..113, window ends on day 105
    expect(weeksOf(a)).toBe(7)
  })

  it("variant C: at least 2 consecutive days, the first between day 5 and day 28", () => {
    const stay = (start: string, end: string) => supplementary(38, 3200, [{ start, end }])
    expect(weeksOf(stay("2027-03-14", "2027-03-15"))).toBe(7) // days 5–6
    expect(determination(stay("2027-03-13", "2027-03-14"), "SUPPLEMENTARY_MATERNITY").status).toBe("NOT_ELIGIBLE") // first day is day 4
    expect(determination(stay("2027-03-14", "2027-03-14"), "SUPPLEMENTARY_MATERNITY").status).toBe("NOT_ELIGIBLE") // a single day
    expect(weeksOf(stay("2027-04-06", "2027-04-07"))).toBe(7) // first day is day 28
    expect(determination(stay("2027-04-07", "2027-04-08"), "SUPPLEMENTARY_MATERNITY").status).toBe("NOT_ELIGIBLE") // first day is day 29
  })
})

describe("external values missing from the sources (Q-29) are never invented", () => {
  const extra = { minimumWageGrosze: 480_600, sourceNote: "wartość testowa, nie z przepisów" }

  it("keeps working without them and marks the result as a lower bound", () => {
    const a = assess({ parents: [employee({ basis: { method: "GROSS_MONTHLY", grossMonthlyGrosze: 100_000 } })] })
    expect(a.basis[0]!.minimumBasisApplied).toBe("NOT_CHECKED")
    expect(a.totals.amountStatus).toBe("CALCULATED_LOWER_BOUND")
  })

  it("applies the minimum basis for full time (U art. 45) only when the value is supplied", () => {
    const low = employee({ basis: { method: "GROSS_MONTHLY", grossMonthlyGrosze: 100_000 } })
    const a = assess({ parents: [low], externalParameters: extra })
    expect(a.basis[0]).toMatchObject({ monthlyBasisGrosze: 414_710, minimumBasisApplied: "APPLIED" })
    expect(a.ruleSet.version).toBe("2027.01-Z1+ext")
    const high = assess({ externalParameters: extra })
    expect(high.basis[0]!.minimumBasisApplied).toBe("NOT_NEEDED")
    const partTime = assess({
      parents: [{ ...low, insurance: { ...low.insurance, workingTimeFraction: "0.5" } }],
      externalParameters: extra,
    })
    expect(partTime.basis[0]).toMatchObject({ monthlyBasisGrosze: 86_290, minimumBasisApplied: "NOT_APPLICABLE" })
  })

  it("raises a low monthly benefit to the świadczenie rodzicielskie amount, pro rata", () => {
    const a = assess({
      parents: [employee({ basis: { method: "KNOWN_BASIS", monthlyBasisGrosze: 100_000 } })],
      plan: { parentalSegments: [{ parent: "MOTHER", weeks: 4 }] },
      externalParameters: { parentalBenefitAmountGrosze: 90_000, sourceNote: "wartość testowa" },
    })
    expect(line(a, "parental-1").amountGrosze).toBe(65_333)
    expect(line(a, "parental-1-floor").amountGrosze).toBe(18_667)
    expect(a.breakdown.some((item) => item.id === "maternity-floor")).toBe(false)
    expect(a.totals.amountStatus).toBe("CALCULATED")
    expect(hasWarning(a, "PARENTAL_BENEFIT_FLOOR_NOT_APPLIED")).toBe(false)
  })

  it("compares debt with 1% of the minimum wage: equal does not exceed, one grosz more does (U art. 2a)", () => {
    const debtor = (amountGrosze: number) =>
      assess({
        parents: [employee({ insurance: { title: "SELF_EMPLOYMENT", sicknessInsurance: "VOLUNTARY", startDate: "2024-01-01", contributionDebt: { exists: true, amountGrosze } } })],
        externalParameters: extra,
      })
    expect(determination(debtor(4_806), "MATERNITY").status).toBe("ELIGIBLE")
    expect(determination(debtor(4_807), "MATERNITY").status).toBe("CONDITIONAL")
  })

  it("asks for the threshold comparison when the minimum wage is unknown", () => {
    const a = assess({
      parents: [employee({ insurance: { title: "SELF_EMPLOYMENT", sicknessInsurance: "VOLUNTARY", startDate: "2024-01-01", contributionDebt: { exists: true, amountGrosze: 10_000 } } })],
    })
    expect(missingKeys(a)).toContain("insurance.contributionDebt.exceedsThreshold")
  })
})

describe("benefit basis (U art. 36–38, 48a, 50)", () => {
  const history = (months: { month: string; grossGrosze: number; workedAtLeastHalf?: boolean }[], startDate = "2024-01-01") =>
    assess({
      parents: [employee({ basis: { method: "MONTHLY_HISTORY", months }, insurance: { title: "EMPLOYMENT", startDate, payerSize: "OVER_20", workingTimeFraction: "1" } })],
    })
  const window = [
    "2026-03", "2026-04", "2026-05", "2026-06", "2026-07", "2026-08",
    "2026-09", "2026-10", "2026-11", "2026-12", "2027-01", "2027-02",
  ]
  const twelve = window.map((month, index) => ({ month, grossGrosze: index < 6 ? 700_000 : 900_000 }))

  it("averages the twelve months before the month of the right", () => {
    expect(history(twelve).basis[0]!.monthlyBasisGrosze).toBe(690_320)
  })

  it("ignores months outside the window", () => {
    const a = history([{ month: "2026-02", grossGrosze: 5_000_000 }, ...twelve])
    expect(a.basis[0]!.monthlyBasisGrosze).toBe(690_320)
    expect(a.basis[0]!.steps.join(" ")).toContain("Pominięto 2026-02")
    const current = history([{ month: "2027-03", grossGrosze: 5_000_000 }, ...twelve])
    expect(current.basis[0]!.monthlyBasisGrosze).toBe(690_320)
  })

  it("excludes months in which less than half of the time was worked (justified absence)", () => {
    const a = history(twelve.map((item) => (item.month === "2026-05" ? { ...item, grossGrosze: 100_000, workedAtLeastHalf: false } : item)))
    expect(a.basis[0]!.monthlyBasisGrosze).toBe(698_165)
    expect(a.basis[0]!.steps.join(" ")).toContain("Wyłączono 2026-05")
  })

  it("uses all months when every month was reduced (U art. 38 ust. 3)", () => {
    const a = history(window.map((month) => ({ month, grossGrosze: 100_000, workedAtLeastHalf: false })))
    expect(a.basis[0]!.monthlyBasisGrosze).toBe(86_290)
  })

  it("uses only full calendar months of insurance when insured for less than a year (U art. 36 ust. 2)", () => {
    const a = history(twelve, "2026-06-15")
    expect(a.basis[0]!.monthlyBasisGrosze).toBe(733_465)
    expect(a.basis[0]!.steps.join(" ")).toContain("nie jest pełnym miesiącem")
  })

  it("flags the same month given twice as inconsistent", () => {
    const a = history([...twelve, twelve[0]!])
    expect(a.basis[0]!.status).toBe("INCONSISTENT")
    expect(a.totals.totalGrosze).toBeNull()
  })

  it("asks for the contractual pay when there is no full month (U art. 37, 49)", () => {
    const a = history([], "2027-03-01")
    expect(a.basis[0]!.status).toBe("UNKNOWN")
    expect(missingKeys(a)).toContain("basis.contractualMonthly")
  })

  it("applies the declared-basis formula for short insurance of a non-employee (U art. 48a)", () => {
    const months = ["2026-10", "2026-11", "2026-12", "2027-01", "2027-02"].map((month) => ({ month, declaredBasisGrosze: 500_000, lowestBasisGrosze: 300_000 }))
    const a = assess({
      parents: [employee({ insurance: { title: "SELF_EMPLOYMENT", sicknessInsurance: "VOLUNTARY", startDate: "2026-10-01", contributionDebt: { exists: false } }, basis: { method: "DECLARED_SHORT_INSURANCE", months } })],
    })
    expect(a.basis[0]!.monthlyBasisGrosze).toBe(330_778)
    expect(a.appliedRules.map((rule) => rule.ruleId)).toContain("LR-117")
  })

  it("rejects a non-positive known basis", () => {
    const a = assess({ parents: [employee({ basis: { method: "KNOWN_BASIS", monthlyBasisGrosze: 0 } })] })
    expect(a.basis[0]!.status).toBe("INCONSISTENT")
  })

  it("rounds the amount of a line half up, exactly once", () => {
    const a = assess({
      parents: [employee(), father({ basis: { method: "KNOWN_BASIS", monthlyBasisGrosze: 4_515 } })],
      plan: { parentalSegments: [{ parent: "MOTHER", weeks: 32 }], paternity: [{ days: 1 }] },
    })
    expect(line(a, "paternity-1")).toMatchObject({ exactAmount: "301/2", amountGrosze: 151 })
  })

  it("warns about raising the basis during pregnancy and about a new title", () => {
    const a = assess({ parents: [employee({ contributionBasisRaisedDuringPregnancy: true, titleStartedDuringPregnancy: true })] })
    expect(a.warnings.map((warning) => warning.code)).toEqual(expect.arrayContaining(["BASIS_RAISED_IN_PREGNANCY", "TITLE_STARTED_IN_PREGNANCY"]))
    expect(a.warnings.filter((warning) => warning.severity === "RISK").length).toBeGreaterThanOrEqual(2)
  })
})

describe("rule set selection by the date the right arises (A-12)", () => {
  const bornOn = (birthDate: string) => assess({ asOf: "2027-01-15", event: born({ birthDate }) })

  it("selects the version in force on the birth date, on both sides of each change", () => {
    expect(assess({ asOf: "2026-07-05", event: born({ birthDate: "2026-07-01" }) }).ruleSet.version).toBe("2026.07-Z1")
    expect(bornOn("2026-10-23").ruleSet.version).toBe("2026.07-Z1")
    expect(bornOn("2026-10-24").ruleSet.version).toBe("2026.10-Z1")
    expect(bornOn("2026-12-31").ruleSet.version).toBe("2026.10-Z1")
    expect(bornOn("2027-01-01").ruleSet.version).toBe("2027.01-Z1")
  })

  it("applies the version of the birth date to the whole period, even past a change in the law", () => {
    const a = assess({
      asOf: "2027-01-15",
      event: born({ birthDate: "2026-12-31" }),
      parents: [employee(), father()],
      plan: { parentalSegments: [{ parent: "MOTHER", weeks: 32 }, { parent: "FATHER", weeks: 9 }] },
    })
    // The father's leave runs into 2028, after the 2027.01 version took effect — the 2026.10 rules still apply.
    expect(a.periods.reduce((latest, item) => (item.end > latest ? item.end : latest), "") >= "2028-01-01").toBe(true)
    expect(a.ruleSet).toMatchObject({ version: "2026.10-Z1", effectiveTo: "2026-12-31" })
  })

  it("can pin a historical version for re-checking an old calculation", () => {
    const a = assess({ ruleSetVersion: "2026.07-Z1" })
    expect(a.ruleSet).toMatchObject({ version: "2026.07-Z1", selectedBy: "wersja wskazana w żądaniu" })
  })
})

describe("structurally invalid input is rejected, not guessed", () => {
  const base = { asOf: AFTER_BIRTH, event: born(), parents: [employee()] }

  it.each([
    ["an impossible calendar date", { event: born({ birthDate: "2027-02-30" }) }],
    ["a malformed evaluation date", { asOf: "21.11.2026" }],
    ["no parents", { parents: [] }],
    ["the same role twice", { parents: [employee(), employee()] }],
    ["paternity without a father", { plan: { paternity: [{ days: 14 }] } }],
    ["an impossible date inside the plan", { plan: { parentalSegments: [{ parent: "MOTHER", weeks: 4, startDate: "2028-00-10" }] } }],
    ["an impossible date in the insurance data", { parents: [employee({ insurance: { title: "EMPLOYMENT", startDate: "2024-13-01" } })] }],
    ["an impossible date in a hospital stay", { event: born({ childHospitalStays: [{ start: "2027-03-10", end: "2027-02-31" }] }) }],
  ])("throws for %s", (_name, overrides) => {
    expect(() => evaluate({ ...base, ...overrides } as never)).toThrow(AssessmentInputError)
  })
})
