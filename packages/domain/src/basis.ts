import { CONTRIBUTION_DEDUCTION } from "./constants"
import { multiplyGrosze } from "./money"
import type { MonthlyIncomeEntry } from "./types"

export interface AverageIncome {
  averageGrosze: number
  usedMonths: number
  excludedMonths: number
  supplementedMonths: number
}

/**
 * Average monthly gross pay from up to 12 months (U art. 36, 38).
 * Months with absence over 50% are excluded unless a supplemented amount
 * (dopełnienie) is given.
 */
export function averageMonthlyIncome(
  entries: readonly MonthlyIncomeEntry[],
  referenceMonths = 12
): AverageIncome {
  let sum = 0
  let used = 0
  let excluded = 0
  let supplemented = 0

  for (const entry of entries.slice(0, referenceMonths)) {
    if (entry.absenceOver50Percent) {
      if (entry.supplementedGrosze !== undefined) {
        sum += Math.max(0, Math.round(entry.supplementedGrosze))
        used += 1
        supplemented += 1
      } else {
        excluded += 1
      }
      continue
    }
    sum += Math.max(0, Math.round(entry.grossGrosze))
    used += 1
  }

  return {
    averageGrosze: used > 0 ? Math.round(sum / used) : 0,
    usedMonths: used,
    excludedMonths: excluded,
    supplementedMonths: supplemented,
  }
}

/** Basis = gross × (1 − 13.71%), rounded once. */
export function basisFromGross(
  grossGrosze: number,
  contributionDeduction = CONTRIBUTION_DEDUCTION
): number {
  return multiplyGrosze(grossGrosze, 1 - contributionDeduction)
}
