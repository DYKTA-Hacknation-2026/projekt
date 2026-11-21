import type { ContributionBasis } from "@zpr/contracts/data-import"

export const CONTRIBUTION_DEDUCTION = 0.1371
export const SICKNESS_CONTRIBUTION_RATE = 0.0245

export function sicknessContribution(basisGrosze: number): number {
  return Math.round(basisGrosze * SICKNESS_CONTRIBUTION_RATE)
}

export function contributionBasis(input: {
  id: string
  insurancePeriodId: string
  period: string
  basisGrosze: number
  paid?: boolean
  paidAt?: string | null
}): ContributionBasis {
  return {
    id: input.id,
    insurancePeriodId: input.insurancePeriodId,
    period: input.period,
    basisGrosze: input.basisGrosze,
    sicknessContributionGrosze: sicknessContribution(input.basisGrosze),
    paid: input.paid ?? true,
    paidAt: input.paidAt ?? `${input.period}-20`,
  }
}

/** Average gross contribution basis converted into the benefit basis. */
export function averageBenefitBasis(
  bases: readonly ContributionBasis[]
): number {
  if (bases.length === 0) return 0
  const average =
    bases.reduce((sum, item) => sum + item.basisGrosze, 0) / bases.length
  return Math.round(average * (1 - CONTRIBUTION_DEDUCTION))
}
