/**
 * Test-only rule set. Production code always reads the values from the
 * database; this fixture exists so unit tests stay deterministic.
 *
 * Keep the values in sync with `packages/db/src/scripts/seed.ts` when the
 * seeded legal parameters change.
 */
import {
  buildRuleSet,
  type RuleParameterVersion,
  type RuleSet,
} from "./rule-set"

const EFFECTIVE_FROM = "2026-11-01"

function row(
  id: string,
  code: string,
  parameters: Record<string, unknown>,
  verificationStatus: RuleParameterVersion["verificationStatus"] = "VERIFIED"
): RuleParameterVersion {
  return {
    id,
    code,
    version: "2026.11-Z1",
    effectiveFrom: EFFECTIVE_FROM,
    effectiveTo: null,
    verificationStatus,
    parameters,
  }
}

export function testRuleParameters(): RuleParameterVersion[] {
  return [
    row("01900000-0000-7000-8000-000000001401", "LR-123", {
      weeksByChildren: { 1: 20, 2: 31, 3: 33, 4: 35, 5: 37 },
      maxPreBirthWeeks: 6,
      motherPersonalWeeks: 14,
    }),
    row("01900000-0000-7000-8000-000000001402", "LR-127", {
      pool: {
        single: 41,
        multiple: 43,
        zaZyciemSingle: 65,
        zaZyciemMultiple: 67,
      },
      nonTransferable: 9,
      maxWorkFraction: 0.5,
      maxParts: 5,
      deadlineChildAgeYears: 6,
    }),
    row("01900000-0000-7000-8000-000000001403", "LR-130", {
      maternity: 1,
      parental: 0.7,
      flat81_5: 0.815,
    }),
    row("01900000-0000-7000-8000-000000001404", "LR-112", {
      referenceMonths: 12,
      contributionDeduction: 0.1371,
      dailyDivisor: 30,
      roundingVerified: false,
    }),
    row("01900000-0000-7000-8000-000000001405", "LR-133", {
      days: 14,
      maxParts: 2,
      minPartDays: 7,
      deadlineMonths: 12,
    }),
    row("01900000-0000-7000-8000-000000001406", "LR-100", {
      compulsoryDays: 30,
      voluntaryDays: 90,
      gapToleranceDays: 30,
      dayOneGraduateDays: 90,
      employerPaidDays: 33,
      employerPaidDaysAfter50: 14,
      sicknessMaxPeriodDays: 270,
    }),
    row(
      "01900000-0000-7000-8000-000000001407",
      "LR-132",
      { parentalBenefitAmountGrosze: null, blocking: true },
      "UNVERIFIED"
    ),
    row("01900000-0000-7000-8000-000000001408", "LR-134", {
      maternityPreBirthRequestDays: 14,
      maternityResignationNoticeDays: 7,
      flatRateApplicationDays: 21,
      parentalRequestNoticeDays: 21,
      workCombinationNoticeDays: 21,
      paternityRequestNoticeDays: 7,
      adoptionRequestDays: 7,
      adoptionStartMaxDays: 21,
      employerForwardingDays: 7,
      zusPaymentDays: 30,
      limitationMonths: 6,
    }),
    row("01900000-0000-7000-8000-000000001409", "LR-101", {
      thresholdShareOfMinWage: 0.01,
      expiryMonths: 6,
      payAfterRepaymentDays: 60,
    }),
    row("01900000-0000-7000-8000-000000001410", "LR-102", {
      selfPayThreshold: 20,
    }),
  ]
}

/**
 * A rule set for tests. `verified: true` simulates an admin having supplied
 * the open values (Q-29, Q-15) without touching any code.
 */
export function testRuleSet(options: { verified?: boolean } = {}): RuleSet {
  const rows = testRuleParameters()
  if (options.verified) {
    for (const item of rows) {
      item.verificationStatus = "VERIFIED"
      if (item.code === "LR-132") {
        item.parameters = {
          parentalBenefitAmountGrosze: 100_000,
          blocking: false,
        }
      }
      if (item.code === "LR-112") {
        item.parameters = { ...item.parameters, roundingVerified: true }
      }
    }
  }
  return buildRuleSet(rows)
}
