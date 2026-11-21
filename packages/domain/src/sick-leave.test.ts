import { describe, expect, it } from "vitest"

import { analyzeSickLeave } from "./sick-leave"

describe("analyzeSickLeave", () => {
  it("counts days, identifies pregnancy-related leave and keeps periods inside insurance", () => {
    const result = analyzeSickLeave({
      asOf: "2026-11-21",
      insuranceStartDate: "2024-01-01",
      employmentType: "EMPLOYMENT",
      periods: [
        {
          id: "zla-1",
          startDate: "2026-10-05",
          endDate: "2026-10-18",
          pregnancyRelated: true,
        },
        {
          id: "zla-2",
          startDate: "2026-11-16",
          endDate: "2026-11-20",
          pregnancyRelated: true,
        },
        {
          id: "zla-3",
          startDate: "2026-11-01",
          endDate: "2026-11-15",
          pregnancyRelated: false,
        },
      ],
    })

    expect(result.status).toBe("OK")
    expect(result.totalDays).toBe(34)
    expect(result.pregnancyRelatedDays).toBe(19)
    expect(result.periods).toHaveLength(3)
    expect(result.periods.every((period) => !period.outsideInsurance)).toBe(true)
    expect(result.reasons.map((reason) => reason.ruleId)).toContain("A-15")
    expect(result.warnings.join(" ")).toContain("33 dni")
  })

  it("marks leave outside the insurance period and overlapping certificates", () => {
    const result = analyzeSickLeave({
      asOf: "2026-11-21",
      insuranceStartDate: "2026-10-01",
      periods: [
        {
          startDate: "2026-09-20",
          endDate: "2026-10-02",
          pregnancyRelated: true,
        },
        {
          startDate: "2026-10-01",
          endDate: "2026-10-10",
          pregnancyRelated: false,
        },
      ],
    })

    expect(result.status).toBe("ATTENTION")
    expect(result.periods[0]?.outsideInsurance).toBe(true)
    expect(result.periods[1]?.overlapsPrevious).toBe(true)
    expect(result.warnings.join(" ")).toContain("nakładają")
  })

  it("returns an explicit empty result and a follow-up when e-ZLA has no data", () => {
    const result = analyzeSickLeave({
      asOf: "2026-11-21",
      periods: [],
    })

    expect(result.status).toBe("OK")
    expect(result.totalDays).toBe(0)
    expect(result.warnings[0]).toContain("e-ZLA")
  })

  it("is indeterminate without an insurance start date", () => {
    const result = analyzeSickLeave({
      asOf: "2026-11-21",
      periods: [
        {
          startDate: "2026-10-05",
          endDate: "2026-10-18",
          pregnancyRelated: false,
        },
      ],
    })

    expect(result.status).toBe("INDETERMINATE")
    expect(result.warnings.join(" ")).toContain("Brak początku")
  })

  it("rejects invalid dates", () => {
    expect(() =>
      analyzeSickLeave({
        asOf: "2026-13-01",
        periods: [],
      })
    ).toThrow(RangeError)
  })
})
