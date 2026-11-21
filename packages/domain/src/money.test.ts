import { describe, expect, it } from "vitest"

import {
  dailyBasis,
  daysAmount,
  groszeToPln,
  multiplyGrosze,
  plnToGrosze,
  weeklyAmount,
} from "./money"

describe("money helpers", () => {
  it("converts PLN to integer grosze and back", () => {
    expect(plnToGrosze(123.456)).toBe(12_346)
    expect(plnToGrosze(0)).toBe(0)
    expect(groszeToPln(12_346)).toBe(123.46)
  })

  it("rejects non-finite PLN values", () => {
    expect(() => plnToGrosze(Number.NaN)).toThrow(TypeError)
    expect(() => plnToGrosze(Number.POSITIVE_INFINITY)).toThrow(TypeError)
  })

  it("rounds once per calculation", () => {
    expect(multiplyGrosze(1_000_000, 0.8629)).toBe(862_900)
    expect(dailyBasis(862_900)).toBe(28_763)
    expect(weeklyAmount(862_900, 1)).toBe(201_343)
    expect(daysAmount(862_900, 1, 14)).toBe(402_687)
  })
})
