/** Statutory parameters used by the calculator. Money is in grosze. */

/** KP art. 180 §1 / art. 183 §1 — 20/31/33/35/37 weeks. */
export const MATERNITY_WEEKS_BY_CHILDREN: Record<number, number> = {
  1: 20,
  2: 31,
  3: 33,
  4: 35,
  5: 37,
}

/** KP art. 182¹a — 41/43 weeks, or 65/67 with a "Za życiem" certificate. */
export const PARENTAL_POOL_WEEKS = {
  single: 41,
  multiple: 43,
  zaZyciemSingle: 65,
  zaZyciemMultiple: 67,
} as const

/**
 * Guaranteed parental leave for a child placed close to the age limit
 * (KP art. 183 §3): 38 weeks, or 62 with a "Za życiem" certificate.
 */
export const GUARANTEED_PARENTAL_WEEKS = 38
export const GUARANTEED_PARENTAL_WEEKS_ZA_ZYCIEM = 62
/** Guaranteed maternity-terms leave for a child placed close to the age limit. */
export const GUARANTEED_MATERNITY_WEEKS = 9

/**
 * Maximum total parental leave including the work-combination extension
 * (KP art. 182¹f §2): 82/86 weeks, or 130/134 with "Za życiem".
 */
export const PARENTAL_TOTAL_CAP_WEEKS = {
  single: 82,
  multiple: 86,
  zaZyciemSingle: 130,
  zaZyciemMultiple: 134,
} as const

export const PARENTAL_NON_TRANSFERABLE_WEEKS = 9
/** The mother must use at least 14 weeks before the father can take over (KP art. 180 §4). */
export const MATERNITY_MIN_MOTHER_WEEKS = 14

export const CONTRIBUTION_DEDUCTION = 0.1371
export const MATERNITY_RATE = 1
export const PARENTAL_RATE = 0.7
export const FLAT_RATE = 0.815

/** Maximum age (years) of an adopted child (KP art. 183 §1). */
export const ADOPTION_MAX_AGE_YEARS = 14
/** Maximum age (years) of a child in non-professional foster care (KP art. 183 §1). */
export const FOSTER_MAX_AGE_YEARS = 7
/** ...or 10 years when school duty has been deferred. */
export const FOSTER_MAX_AGE_DEFERRED_YEARS = 10

/** Weeks of stillbirth / early-death maternity leave (KP art. 180¹). */
export const LOSS_MATERNITY_WEEKS = 8
export const LOSS_MIN_DAYS_AFTER_DEATH = 7
export const LATE_DEATH_BENEFIT_DAYS = 7

/**
 * External values (Q-29: minimum wage, minimum contribution basis, parental
 * benefit floor, average wage) are NOT constants in this file. They belong to
 * the active rule set or to a per-request override with an official source.
 * Missing values must surface as a bound or an unknown, never as a guess.
 */

export const DAYS_PER_YEAR = 365.2425
