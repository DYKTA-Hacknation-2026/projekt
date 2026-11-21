import { buildRuleSet, RuleSetError, type RuleSet } from "@zpr/domain"

import { getRepositories } from "@/server/container"
import { AppError } from "@zpr/contracts/problem"

/** Calendar date in Europe/Warsaw, the time zone used for legal dates. */
function warsawToday(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Warsaw" }).format(
    now
  )
}

/**
 * The single read path for legal parameters. Every calculation, eligibility
 * check, timeline and assistant tool goes through it, so a value edited in
 * `legal.legal_rule_versions` applies everywhere without a code change.
 */
export async function getActiveRuleSet(asOf?: string): Promise<RuleSet> {
  const date = asOf ?? warsawToday()

  try {
    const rows = await getRepositories().legal.getRuleParameters(date)
    return buildRuleSet(rows)
  } catch (error) {
    if (error instanceof RuleSetError) {
      throw new AppError(
        503,
        "UPSTREAM_ERROR",
        `Nie można zbudować zestawu reguł na ${date}: ${error.message}`,
        {
          missingRules: error.missingCodes,
          invalidParameters: error.invalidKeys,
        }
      )
    }
    throw error
  }
}
