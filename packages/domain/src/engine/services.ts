import { evaluate } from "./evaluate"
import type { DocumentReport } from "./documents"
import type {
  Assessment,
  AssessmentInput,
  BenefitType,
  LeavePlanInput,
  ParentRole,
} from "./types"

/**
 * Use-case services behind the REST endpoints and assistant tools. Each one
 * runs the same `evaluate` and returns the slice its caller needs, so every
 * channel gives identical answers for identical input.
 */

type Common = Pick<
  Assessment,
  | "kind"
  | "disclaimer"
  | "engineVersion"
  | "inputHash"
  | "asOf"
  | "ruleSet"
  | "anchor"
  | "status"
  | "appliedRules"
  | "sources"
  | "assumptions"
  | "missingEvidence"
  | "warnings"
  | "nextSteps"
  | "unsupported"
  | "manualReviewReasons"
>

function common(assessment: Assessment): Common {
  const {
    kind,
    disclaimer,
    engineVersion,
    inputHash,
    asOf,
    ruleSet,
    anchor,
    status,
    appliedRules,
    sources,
    assumptions,
    missingEvidence,
    warnings,
    nextSteps,
    unsupported,
    manualReviewReasons,
  } = assessment
  return {
    kind,
    disclaimer,
    engineVersion,
    inputHash,
    asOf,
    ruleSet,
    anchor,
    status,
    appliedRules,
    sources,
    assumptions,
    missingEvidence,
    warnings,
    nextSteps,
    unsupported,
    manualReviewReasons,
  }
}

export interface EligibilityReport extends Common {
  eligibility: Assessment["eligibility"]
  applicableBenefits: Assessment["applicableBenefits"]
}

export function evaluateEligibility(input: AssessmentInput): EligibilityReport {
  const { assessment } = evaluate(input)
  return { ...common(assessment), eligibility: assessment.eligibility, applicableBenefits: assessment.applicableBenefits }
}

/** Full assessment: eligibility, periods, breakdown, totals and allocation. */
export function calculateParentalBenefits(input: AssessmentInput): Assessment {
  return evaluate(input).assessment
}

export interface TimelineReport extends Common {
  periods: Assessment["periods"]
  timeline: Assessment["timeline"]
  allocation: Assessment["allocation"]
  planAdjustments: string[]
}

export function generateBenefitTimeline(input: AssessmentInput): TimelineReport {
  const { assessment } = evaluate(input)
  return {
    ...common(assessment),
    periods: assessment.periods,
    timeline: assessment.timeline,
    allocation: assessment.allocation,
    planAdjustments: assessment.planAdjustments,
  }
}

export interface DocumentsReport extends Common, DocumentReport {
  eligibility: Assessment["eligibility"]
}

export function identifyRequiredDocuments(input: AssessmentInput): DocumentsReport {
  const { assessment, documents } = evaluate(input)
  return { ...common(assessment), ...documents, eligibility: assessment.eligibility }
}

export interface ScenarioInput {
  name: string
  plan: LeavePlanInput
}

export interface ScenarioOutcome {
  name: string
  status: Assessment["status"]
  totalGrosze: number | null
  differenceGrosze: number | null
  amountStatus: Assessment["totals"]["amountStatus"]
  byParent: Assessment["totals"]["byParent"]
  allocation: Assessment["allocation"]
  days: { parent: ParentRole; benefit: BenefitType; days: number }[]
  lastLeaveDay: Record<ParentRole, string | null>
  planAdjustments: string[]
  warnings: Assessment["warnings"]
  inputHash: string
}

export interface ScenarioComparisonReport {
  kind: "ESTIMATE"
  disclaimer: string
  engineVersion: string
  ruleSet: Assessment["ruleSet"]
  baseline: string
  outcomes: ScenarioOutcome[]
  /** Facts missing for any scenario (shared by all of them). */
  missingEvidence: Assessment["missingEvidence"]
  notes: string[]
}

/** Runs the same household facts with different leave plans. */
export function compareBenefitScenarios(base: Omit<AssessmentInput, "plan">, scenarios: readonly ScenarioInput[]): ScenarioComparisonReport {
  if (scenarios.length === 0) throw new RangeError("Podaj co najmniej jeden scenariusz.")
  const results = scenarios.map((scenario) => ({ scenario, assessment: evaluate({ ...base, plan: scenario.plan }).assessment }))
  const first = results[0]!.assessment.totals.totalGrosze
  const outcomes = results.map(({ scenario, assessment }) => {
    const days = new Map<string, { parent: ParentRole; benefit: BenefitType; days: number }>()
    for (const period of assessment.periods) {
      const key = `${period.parent}:${period.benefit}`
      const entry = days.get(key) ?? { parent: period.parent, benefit: period.benefit, days: 0 }
      entry.days += period.days
      days.set(key, entry)
    }
    const lastLeaveDay = (parent: ParentRole) =>
      assessment.periods
        .filter((period) => period.parent === parent && period.benefit !== "SICKNESS_IN_PREGNANCY" && period.benefit !== "EMPLOYER_SICK_PAY")
        .reduce<string | null>((latest, period) => (!latest || period.end > latest ? period.end : latest), null)
    const total = assessment.totals.totalGrosze
    return {
      name: scenario.name,
      status: assessment.status,
      totalGrosze: total,
      differenceGrosze: total !== null && first !== null ? total - first : null,
      amountStatus: assessment.totals.amountStatus,
      byParent: assessment.totals.byParent,
      allocation: assessment.allocation,
      days: [...days.values()],
      lastLeaveDay: { MOTHER: lastLeaveDay("MOTHER"), FATHER: lastLeaveDay("FATHER") },
      planAdjustments: assessment.planAdjustments,
      warnings: assessment.warnings,
      inputHash: assessment.inputHash,
    }
  })
  const firstAssessment = results[0]!.assessment
  const missing = new Map<string, Assessment["missingEvidence"][number]>()
  for (const { assessment } of results) {
    for (const item of assessment.missingEvidence) missing.set(`${item.parent ?? "-"}:${item.key}`, item)
  }
  return {
    kind: "ESTIMATE",
    disclaimer: firstAssessment.disclaimer,
    engineVersion: firstAssessment.engineVersion,
    ruleSet: firstAssessment.ruleSet,
    baseline: scenarios[0]!.name,
    outcomes,
    missingEvidence: [...missing.values()],
    notes: [
      "Kwoty brutto, przed zaliczką na PIT. Różnice liczone względem pierwszego scenariusza.",
      "Dziewięć tygodni urlopu rodzicielskiego drugiego rodzica jest zawsze płatne 70% (U art. 31 ust. 3f) i przepada, jeśli nie zostanie wykorzystane.",
    ],
  }
}
