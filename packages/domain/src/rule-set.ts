/**
 * Legal parameters consumed by the deterministic engine.
 *
 * The values live in `legal.legal_rule_versions.parameters` and are read from
 * the database. Nothing in this package falls back to hard-coded amounts: a
 * missing or malformed parameter is a configuration error (`RuleSetError`), so
 * a change of the law is a data change, not a code change.
 */

/** Codes are stable identifiers; the values are stored per version in the DB. */
export const RULE_CODES = {
  maternity: "LR-123",
  parental: "LR-127",
  rates: "LR-130",
  basis: "LR-112",
  paternity: "LR-133",
  coverage: "LR-100",
  minimum: "LR-132",
  deadlines: "LR-134",
  debt: "LR-101",
  payer: "LR-102",
} as const

export type RuleCode = (typeof RULE_CODES)[keyof typeof RULE_CODES]

export type RuleVerificationStatus = "VERIFIED" | "UNVERIFIED" | "PROPOSED"

/** One effective version of a single rule, as stored in the database. */
export interface RuleParameterVersion {
  id: string
  code: string
  version: string
  effectiveFrom: string
  effectiveTo: string | null
  verificationStatus: RuleVerificationStatus
  parameters: Record<string, unknown>
}

export interface RuleSet {
  /** Shared version label of the active rules, e.g. `2026.11-Z1`. */
  version: string
  effectiveFrom: string
  effectiveTo: string | null
  /** Every required rule is VERIFIED and no blocking parameter is missing. */
  verified: boolean
  /** Codes that still need a verified value (for warnings in the UI). */
  unverifiedRules: string[]
  /** Rule code → database id of the version that supplied the value. */
  versionIds: Record<string, string>
  maternity: {
    weeksByChildren: Record<number, number>
    maxChildren: number
    maxPreBirthWeeks: number
    motherPersonalWeeks: number
    rate: number
  }
  parental: {
    poolWeeks: {
      single: number
      multiple: number
      zaZyciemSingle: number
      zaZyciemMultiple: number
    }
    nonTransferableWeeks: number
    maxWorkFraction: number
    maxParts: number
    deadlineChildAgeYears: number
    rate: number
    flatRate: number
  }
  paternity: {
    days: number
    maxParts: number
    minPartDays: number
    deadlineMonths: number
  }
  basis: {
    referenceMonths: number
    contributionDeduction: number
    dailyDivisor: number
    roundingVerified: boolean
  }
  coverage: {
    compulsoryDays: number
    voluntaryDays: number
    gapToleranceDays: number
    dayOneGraduateDays: number
    employerPaidDays: number
    employerPaidDaysAfter50: number
  }
  sickness: {
    maxPeriodDays: number
  }
  debt: {
    thresholdShareOfMinWage: number
    expiryMonths: number
    payAfterRepaymentDays: number
  }
  payer: {
    selfPayThreshold: number
  }
  deadlines: {
    maternityPreBirthRequestDays: number
    maternityResignationNoticeDays: number
    flatRateApplicationDays: number
    parentalRequestNoticeDays: number
    workCombinationNoticeDays: number
    paternityRequestNoticeDays: number
    adoptionRequestDays: number
    adoptionStartMaxDays: number
    employerForwardingDays: number
    zusPaymentDays: number
    limitationMonths: number
  }
  minimum: {
    parentalBenefitAmountGrosze: number | null
    blocking: boolean
  }
}

export interface RuleSetErrorDetails {
  missingCodes?: string[]
  invalidKeys?: string[]
}

/** Thrown when the database does not contain a complete rule set. */
export class RuleSetError extends Error {
  readonly missingCodes: string[]
  readonly invalidKeys: string[]

  constructor(message: string, details: RuleSetErrorDetails = {}) {
    super(message)
    this.name = "RuleSetError"
    this.missingCodes = details.missingCodes ?? []
    this.invalidKeys = details.invalidKeys ?? []
  }
}

function numberValue(
  rule: RuleParameterVersion,
  key: string,
  options: { min?: number; max?: number; integer?: boolean } = {}
): number {
  const value = rule.parameters[key]
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new RuleSetError(
      `Reguła ${rule.code}: parametr „${key}” musi być liczbą.`,
      { invalidKeys: [`${rule.code}.${key}`] }
    )
  }
  if (options.integer && !Number.isInteger(value)) {
    throw new RuleSetError(
      `Reguła ${rule.code}: parametr „${key}” musi być liczbą całkowitą.`,
      { invalidKeys: [`${rule.code}.${key}`] }
    )
  }
  if (options.min !== undefined && value < options.min) {
    throw new RuleSetError(
      `Reguła ${rule.code}: parametr „${key}” nie może być mniejszy niż ${options.min}.`,
      { invalidKeys: [`${rule.code}.${key}`] }
    )
  }
  if (options.max !== undefined && value > options.max) {
    throw new RuleSetError(
      `Reguła ${rule.code}: parametr „${key}” nie może być większy niż ${options.max}.`,
      { invalidKeys: [`${rule.code}.${key}`] }
    )
  }
  return value
}

function booleanValue(rule: RuleParameterVersion, key: string): boolean {
  const value = rule.parameters[key]
  if (typeof value !== "boolean") {
    throw new RuleSetError(
      `Reguła ${rule.code}: parametr „${key}” musi być wartością logiczną.`,
      { invalidKeys: [`${rule.code}.${key}`] }
    )
  }
  return value
}

function numberObject<K extends string>(
  rule: RuleParameterVersion,
  key: string,
  requiredKeys: readonly K[]
): Record<K, number> {
  const value = rule.parameters[key]
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new RuleSetError(
      `Reguła ${rule.code}: parametr „${key}” musi być obiektem.`,
      { invalidKeys: [`${rule.code}.${key}`] }
    )
  }
  const source = value as Record<string, unknown>
  const result = {} as Record<K, number>
  for (const requiredKey of requiredKeys) {
    const entry = source[requiredKey]
    if (typeof entry !== "number" || !Number.isFinite(entry)) {
      throw new RuleSetError(
        `Reguła ${rule.code}: parametr „${key}.${requiredKey}” musi być liczbą.`,
        { invalidKeys: [`${rule.code}.${key}.${requiredKey}`] }
      )
    }
    result[requiredKey] = entry
  }
  return result
}

/** `{1: 20, 2: 31, …}`; keys are stored as JSON strings. */
function weeksObject(
  rule: RuleParameterVersion,
  key: string
): Record<number, number> {
  const value = rule.parameters[key]
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new RuleSetError(
      `Reguła ${rule.code}: parametr „${key}” musi być obiektem.`,
      { invalidKeys: [`${rule.code}.${key}`] }
    )
  }
  const result: Record<number, number> = {}
  for (const [rawKey, rawValue] of Object.entries(
    value as Record<string, unknown>
  )) {
    const childCount = Number(rawKey)
    if (
      !Number.isInteger(childCount) ||
      childCount < 1 ||
      typeof rawValue !== "number" ||
      !Number.isFinite(rawValue) ||
      rawValue <= 0
    ) {
      throw new RuleSetError(
        `Reguła ${rule.code}: parametr „${key}” zawiera nieprawidłowy wpis „${rawKey}”.`,
        { invalidKeys: [`${rule.code}.${key}.${rawKey}`] }
      )
    }
    result[childCount] = rawValue
  }
  return result
}

/**
 * Builds the engine input from the effective versions returned by the
 * repository. Pure and deterministic: the same rows always produce the same
 * rule set.
 */
export function buildRuleSet(rows: readonly RuleParameterVersion[]): RuleSet {
  const byCode = new Map(rows.map((row) => [row.code, row]))
  const requiredCodes = Object.values(RULE_CODES)
  const missingCodes = requiredCodes.filter((code) => !byCode.has(code))

  if (missingCodes.length > 0) {
    throw new RuleSetError(
      `Brak obowiązujących wersji reguł: ${missingCodes.join(", ")}.`,
      { missingCodes }
    )
  }

  function rule(code: RuleCode): RuleParameterVersion {
    const row = byCode.get(code)
    if (!row) {
      // Guarded by the check above; keeps TypeScript honest.
      throw new RuleSetError(`Brak reguły ${code}.`, { missingCodes: [code] })
    }
    return row
  }

  const maternityRule = rule(RULE_CODES.maternity)
  const parentalRule = rule(RULE_CODES.parental)
  const ratesRule = rule(RULE_CODES.rates)
  const basisRule = rule(RULE_CODES.basis)
  const paternityRule = rule(RULE_CODES.paternity)
  const coverageRule = rule(RULE_CODES.coverage)
  const minimumRule = rule(RULE_CODES.minimum)
  const deadlinesRule = rule(RULE_CODES.deadlines)
  const debtRule = rule(RULE_CODES.debt)
  const payerRule = rule(RULE_CODES.payer)

  const weeksByChildren = weeksObject(maternityRule, "weeksByChildren")
  const pool = numberObject(parentalRule, "pool", [
    "single",
    "multiple",
    "zaZyciemSingle",
    "zaZyciemMultiple",
  ] as const)

  const minWeeks = Math.min(...Object.values(weeksByChildren))
  if (minWeeks <= 0) {
    throw new RuleSetError(
      `Reguła ${maternityRule.code}: wymiary urlopu muszą być dodatnie.`,
      { invalidKeys: [`${maternityRule.code}.weeksByChildren`] }
    )
  }

  const maternityRate = numberValue(ratesRule, "maternity", { min: 0, max: 1 })
  const parentalRate = numberValue(ratesRule, "parental", { min: 0, max: 1 })
  const flatRate = numberValue(ratesRule, "flat81_5", { min: 0, max: 1 })
  const contributionDeduction = numberValue(
    basisRule,
    "contributionDeduction",
    {
      min: 0,
      max: 1,
    }
  )
  const roundingVerified = booleanValue(basisRule, "roundingVerified")
  const minimumAmountRaw = minimumRule.parameters.parentalBenefitAmountGrosze
  const minimumAmount =
    typeof minimumAmountRaw === "number" && Number.isFinite(minimumAmountRaw)
      ? minimumAmountRaw
      : null
  const minimumBlocking = booleanValue(minimumRule, "blocking")

  const versionIds: Record<string, string> = {}
  for (const key of Object.keys(RULE_CODES) as Array<keyof typeof RULE_CODES>) {
    versionIds[key] = rule(RULE_CODES[key]).id
  }

  const unverifiedRules: string[] = requiredCodes.filter((code) => {
    const row = rule(code)
    return row.verificationStatus !== "VERIFIED"
  })
  if (
    minimumBlocking &&
    minimumAmount === null &&
    !unverifiedRules.includes(minimumRule.code)
  ) {
    unverifiedRules.push(minimumRule.code)
  }

  const latest = [...rows].sort((a, b) =>
    b.effectiveFrom.localeCompare(a.effectiveFrom)
  )[0]
  const effectiveFrom = latest?.effectiveFrom ?? ""
  const effectiveTo =
    rows
      .map((row) => row.effectiveTo)
      .filter((value): value is string => Boolean(value))
      .sort()[0] ?? null

  return {
    version: latest?.version ?? "unknown",
    effectiveFrom,
    effectiveTo,
    verified:
      unverifiedRules.length === 0 &&
      roundingVerified &&
      (!minimumBlocking || minimumAmount !== null),
    unverifiedRules,
    versionIds,
    maternity: {
      weeksByChildren,
      maxChildren: Math.max(...Object.keys(weeksByChildren).map(Number)),
      maxPreBirthWeeks: numberValue(maternityRule, "maxPreBirthWeeks", {
        min: 0,
        integer: true,
      }),
      motherPersonalWeeks: numberValue(maternityRule, "motherPersonalWeeks", {
        min: 0,
        integer: true,
      }),
      rate: maternityRate,
    },
    parental: {
      poolWeeks: pool,
      nonTransferableWeeks: numberValue(parentalRule, "nonTransferable", {
        min: 0,
        integer: true,
      }),
      maxWorkFraction: numberValue(parentalRule, "maxWorkFraction", {
        min: 0,
        max: 1,
      }),
      maxParts: numberValue(parentalRule, "maxParts", {
        min: 1,
        integer: true,
      }),
      deadlineChildAgeYears: numberValue(
        parentalRule,
        "deadlineChildAgeYears",
        {
          min: 0,
          integer: true,
        }
      ),
      rate: parentalRate,
      flatRate,
    },
    paternity: {
      days: numberValue(paternityRule, "days", { min: 0, integer: true }),
      maxParts: numberValue(paternityRule, "maxParts", {
        min: 1,
        integer: true,
      }),
      minPartDays: numberValue(paternityRule, "minPartDays", {
        min: 0,
        integer: true,
      }),
      deadlineMonths: numberValue(paternityRule, "deadlineMonths", {
        min: 0,
        integer: true,
      }),
    },
    basis: {
      referenceMonths: numberValue(basisRule, "referenceMonths", {
        min: 1,
        integer: true,
      }),
      contributionDeduction,
      dailyDivisor: numberValue(basisRule, "dailyDivisor", {
        min: 1,
        integer: true,
      }),
      roundingVerified,
    },
    coverage: {
      compulsoryDays: numberValue(coverageRule, "compulsoryDays", {
        min: 0,
        integer: true,
      }),
      voluntaryDays: numberValue(coverageRule, "voluntaryDays", {
        min: 0,
        integer: true,
      }),
      gapToleranceDays: numberValue(coverageRule, "gapToleranceDays", {
        min: 0,
        integer: true,
      }),
      dayOneGraduateDays: numberValue(coverageRule, "dayOneGraduateDays", {
        min: 0,
        integer: true,
      }),
      employerPaidDays: numberValue(coverageRule, "employerPaidDays", {
        min: 0,
        integer: true,
      }),
      employerPaidDaysAfter50: numberValue(
        coverageRule,
        "employerPaidDaysAfter50",
        { min: 0, integer: true }
      ),
    },
    sickness: {
      maxPeriodDays: numberValue(coverageRule, "sicknessMaxPeriodDays", {
        min: 0,
        integer: true,
      }),
    },
    debt: {
      thresholdShareOfMinWage: numberValue(
        debtRule,
        "thresholdShareOfMinWage",
        {
          min: 0,
          max: 1,
        }
      ),
      expiryMonths: numberValue(debtRule, "expiryMonths", {
        min: 0,
        integer: true,
      }),
      payAfterRepaymentDays: numberValue(debtRule, "payAfterRepaymentDays", {
        min: 0,
        integer: true,
      }),
    },
    payer: {
      selfPayThreshold: numberValue(payerRule, "selfPayThreshold", {
        min: 0,
        integer: true,
      }),
    },
    deadlines: {
      maternityPreBirthRequestDays: numberValue(
        deadlinesRule,
        "maternityPreBirthRequestDays",
        { min: 0, integer: true }
      ),
      maternityResignationNoticeDays: numberValue(
        deadlinesRule,
        "maternityResignationNoticeDays",
        { min: 0, integer: true }
      ),
      flatRateApplicationDays: numberValue(
        deadlinesRule,
        "flatRateApplicationDays",
        { min: 0, integer: true }
      ),
      parentalRequestNoticeDays: numberValue(
        deadlinesRule,
        "parentalRequestNoticeDays",
        { min: 0, integer: true }
      ),
      workCombinationNoticeDays: numberValue(
        deadlinesRule,
        "workCombinationNoticeDays",
        { min: 0, integer: true }
      ),
      paternityRequestNoticeDays: numberValue(
        deadlinesRule,
        "paternityRequestNoticeDays",
        { min: 0, integer: true }
      ),
      adoptionRequestDays: numberValue(deadlinesRule, "adoptionRequestDays", {
        min: 0,
        integer: true,
      }),
      adoptionStartMaxDays: numberValue(deadlinesRule, "adoptionStartMaxDays", {
        min: 0,
        integer: true,
      }),
      employerForwardingDays: numberValue(
        deadlinesRule,
        "employerForwardingDays",
        { min: 0, integer: true }
      ),
      zusPaymentDays: numberValue(deadlinesRule, "zusPaymentDays", {
        min: 0,
        integer: true,
      }),
      limitationMonths: numberValue(deadlinesRule, "limitationMonths", {
        min: 0,
        integer: true,
      }),
    },
    minimum: {
      parentalBenefitAmountGrosze: minimumAmount,
      blocking: minimumBlocking,
    },
  }
}
