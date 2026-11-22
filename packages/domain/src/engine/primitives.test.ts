import { describe, expect, it } from "vitest"

import {
  ageInYears,
  birthdayOf,
  deadlineAfter,
  deadlineBefore,
  endOfYearChildTurns,
  intersect,
  lastDayBeforeAge,
  overlapDays,
  periodDays,
  periodOfDays,
  precedingMonths,
  splitByYear,
} from "./calendar"
import { Ratio, formatGrosze, ratio, ratioFromUserNumber } from "./decimal"
import { canonicalJson, sha256Hex } from "./hash"
import { RULES, RULE_SETS, ruleSetByVersion, ruleSetFor } from "./index"

describe("exact arithmetic (no floating point)", () => {
  it("adds decimals exactly where binary floats fail", () => {
    expect(0.1 + 0.2).not.toBe(0.3)
    expect(ratio("0.1").add("0.2").eq("0.3")).toBe(true)
  })

  it("parses decimals, percentages and fractions exactly", () => {
    expect(ratio("0.815").toFraction()).toBe("163/200")
    expect(ratio("81.5%").eq("0.815")).toBe(true)
    expect(ratio("13,71%").eq("0.1371")).toBe(true)
    expect(ratio("1/3").mul(3).eq(1)).toBe(true)
  })

  it("refuses non-integer JS numbers instead of guessing their binary value", () => {
    expect(() => ratio(0.815)).toThrow(TypeError)
    expect(() => ratio(Number.NaN)).toThrow(TypeError)
    expect(ratioFromUserNumber(0.5).eq("1/2")).toBe(true)
    expect(ratioFromUserNumber(0.815).eq("163/200")).toBe(true)
  })

  it("rounds half up, once, with explicit modes", () => {
    expect(ratio("301/2").round("HALF_UP")).toBe(151n)
    expect(ratio("-301/2").round("HALF_UP")).toBe(-151n)
    expect(ratio("301/2").round("FLOOR")).toBe(150n)
    expect(ratio("301/2").round("CEIL")).toBe(151n)
    expect(ratio("-5/2").round("FLOOR")).toBe(-3n)
    expect(ratio("2999/1000").round("HALF_UP")).toBe(3n)
    expect(ratio("1499/1000").round("HALF_UP")).toBe(1n)
  })

  it("keeps the daily 1/30 divisor exact until the end", () => {
    const daily = ratio(690_320).div(30)
    expect(daily.toFraction()).toBe("69032/3")
    // 30 days of the daily value give back the monthly basis exactly.
    expect(daily.mul(30).eq(690_320)).toBe(true)
  })

  it("formats grosze as złoty with a non-breaking space", () => {
    expect(formatGrosze(690_320)).toBe("6 903,20 zł")
    expect(formatGrosze(5)).toBe("0,05 zł")
    expect(ratio("2/3").toFixed(4)).toBe("0.6667")
    expect(ratio("0.815").toPercent()).toBe("81,5%")
    expect(ratio(1).toPercent()).toBe("100%")
  })

  it("rejects division by zero", () => {
    expect(() => ratio(1).div(0)).toThrow(RangeError)
    expect(Ratio.fraction(1, 3).lt("1/2")).toBe(true)
  })
})

describe("calendar conventions", () => {
  it("counts periods inclusively on both ends", () => {
    expect(periodDays({ start: "2027-03-10", end: "2027-03-10" })).toBe(1)
    expect(periodDays({ start: "2027-03-10", end: "2027-07-27" })).toBe(140)
    expect(periodOfDays("2027-03-10", 140)).toEqual({ start: "2027-03-10", end: "2027-07-27" })
    expect(periodOfDays("2027-03-10", 0)).toBeNull()
  })

  it("intersects inclusive periods", () => {
    const a = { start: "2027-01-01", end: "2027-01-31" }
    expect(overlapDays(a, { start: "2027-01-31", end: "2027-02-10" })).toBe(1)
    expect(intersect(a, { start: "2027-02-01", end: "2027-02-10" })).toBeNull()
  })

  it("handles leap years and month ends", () => {
    expect(birthdayOf("2024-02-29", 1)).toBe("2025-02-28")
    expect(lastDayBeforeAge("2027-03-10", 12)).toBe("2028-03-09")
    expect(lastDayBeforeAge("2027-03-01", 12)).toBe("2028-02-29")
    expect(ageInYears("2013-01-15", "2027-01-14")).toBe(13)
    expect(ageInYears("2013-01-15", "2027-01-15")).toBe(14)
    expect(endOfYearChildTurns("2027-03-10", 6)).toBe("2033-12-31")
  })

  it("applies the deadline counting conventions", () => {
    expect(deadlineAfter("2027-03-10", 21)).toBe("2027-03-31")
    expect(deadlineBefore("2027-03-10", 14)).toBe("2027-02-24")
  })

  it("splits periods at calendar-year boundaries", () => {
    expect(splitByYear({ start: "2026-12-20", end: "2027-02-10" })).toEqual([
      { start: "2026-12-20", end: "2026-12-31" },
      { start: "2027-01-01", end: "2027-02-10" },
    ])
  })

  it("lists the twelve months before the month of the right", () => {
    const months = precedingMonths("2027-03-10", 12)
    expect(months).toHaveLength(12)
    expect(months[0]).toBe("2026-03")
    expect(months[11]).toBe("2027-02")
  })
})

describe("rule set versions", () => {
  it("selects the version in force on the boundary days", () => {
    expect(ruleSetFor("2026-06-30")).toBeNull()
    expect(ruleSetFor("2026-07-01")?.version).toBe("2026.07-Z1")
    expect(ruleSetFor("2026-10-23")?.version).toBe("2026.07-Z1")
    expect(ruleSetFor("2026-10-24")?.version).toBe("2026.10-Z1")
    expect(ruleSetFor("2026-12-31")?.version).toBe("2026.10-Z1")
    expect(ruleSetFor("2027-01-01")?.version).toBe("2027.01-Z1")
    expect(ruleSetFor("2035-05-05")?.version).toBe("2027.01-Z1")
  })

  it("has contiguous, non-overlapping validity windows", () => {
    for (let index = 1; index < RULE_SETS.length; index += 1) {
      const previous = RULE_SETS[index - 1]!
      const current = RULE_SETS[index]!
      expect(previous.effectiveTo).not.toBeNull()
      const next = new Date(`${previous.effectiveTo}T00:00:00Z`)
      next.setUTCDate(next.getUTCDate() + 1)
      expect(next.toISOString().slice(0, 10)).toBe(current.effectiveFrom)
    }
    expect(RULE_SETS.at(-1)!.effectiveTo).toBeNull()
  })

  it("changes only what the law changed", () => {
    const [v0707, v1024, v0101] = RULE_SETS
    expect(v0707!.parameters.forms.zamMerged).toBe(false)
    expect(v1024!.parameters.forms.zamMerged).toBe(true)
    expect(v1024!.parameters.sickness.singlePeriodAcrossTitles).toBe(false)
    expect(v0101!.parameters.sickness.singlePeriodAcrossTitles).toBe(true)
    expect(v0101!.rules).toContain("LR-103A")
    expect(v1024!.rules).not.toContain("LR-103A")
  })

  it("is immutable once published", () => {
    const set = ruleSetByVersion("2027.01-Z1")!
    expect(Object.isFrozen(set)).toBe(true)
    expect(() => {
      ;(set.parameters.rates as { parental: string }).parental = "0.9"
    }).toThrow()
  })

  it("holds the documented rates, limits and deadlines as data", () => {
    const p = ruleSetFor("2027-03-10")!.parameters
    expect(p.rates).toMatchObject({ maternity: "1", parental: "0.7", flat: "0.815", flatApplicationDays: 21 })
    expect(p.maternity.weeksByChildren).toEqual({ 1: 20, 2: 31, 3: 33, 4: 35, 5: 37 })
    expect(p.parental.poolWeeks).toEqual({ single: 41, multiple: 43, zaZyciemSingle: 65, zaZyciemMultiple: 67 })
    expect(p.parental.nonTransferableWeeks).toBe(9)
    expect(p.parental.maxParts).toBe(5)
    expect(p.paternity).toMatchObject({ maxDays: 14, maxParts: 2, minPartDays: 7 })
    expect(p.sickness).toMatchObject({ waitingDaysCompulsory: 30, waitingDaysVoluntary: 90, maxPeriodDaysPregnancy: 270 })
    expect(p.basis.contributionDeduction).toBe("0.1371")
  })

  it("never ships a value the sources do not contain", () => {
    for (const set of RULE_SETS) {
      expect(set.parameters.external).toEqual({
        minimumWageGrosze: null,
        parentalBenefitAmountGrosze: null,
        averageWageGrosze: null,
        rehabilitationIndex: null,
      })
      expect(set.parameterMeta.find((meta) => meta.path === "external")?.verification).toBe("UNVERIFIED")
    }
  })

  it("cites an official provision for every rule that is not a documented assumption", () => {
    for (const rule of Object.values(RULES)) {
      if (rule.verification === "ASSUMPTION") continue
      expect(rule.sources.length, rule.id).toBeGreaterThan(0)
    }
  })
})

describe("reproducibility primitives", () => {
  it("matches the SHA-256 reference vectors", () => {
    expect(sha256Hex("")).toBe("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855")
    expect(sha256Hex("abc")).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad")
    expect(sha256Hex("a".repeat(1000))).toBe("41edece42d63e8d9bf515a9ba6932e1c20cbc9f5a5d134645adb5db1b9737ea3")
  })

  it("canonicalises key order and drops undefined", () => {
    expect(canonicalJson({ b: 1, a: [2, { d: undefined, c: 3 }] })).toBe('{"a":[2,{"c":3}],"b":1}')
  })
})
