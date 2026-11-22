import { calculateBenefits } from "./calculator"
import { isIsoDate } from "./dates"
import { formatRatePercent } from "./money"
import type { RuleSet } from "./rule-set"
import { buildTimeline } from "./timeline"
import type { CalculatorInput, CalculatorResult, PaymentOption } from "./types"

/**
 * Side-by-side comparison of leave plans. Every number comes from
 * `calculateBenefits` and `buildTimeline`; this module only arranges them.
 */

export interface LeaveScenario {
  name: string
  paymentOption: PaymentOption
  maternityWeeksBeforeBirth: number
  secondParentParentalWeeks: number
  parentalWorkFraction: number
  paternityDays: number
}

export interface ScenarioBase {
  grossMonthlyIncomeGrosze: number
  childrenCount: number
  hasZaZyciem: boolean
  dueDate?: string
}

export interface ScenarioOutcome {
  name: string
  input: CalculatorInput
  maternityWeeks: number
  motherParentalWeeks: number
  secondParentWeeks: number
  extensionWeeks: number
  paternityDays: number
  totalGrosze: number
  /** Difference to the first scenario, in grosze. */
  totalDifferenceGrosze: number
  lines: CalculatorResult["lines"]
  /** Last day of the mother's parental leave, when a due date is known. */
  motherLeaveEnd: string | null
  warnings: string[]
}

export interface ScenarioComparison {
  base: ScenarioBase
  outcomes: ScenarioOutcome[]
  verified: boolean
  status: CalculatorResult["status"]
  notes: string[]
}

/* ------------------------------------------------------------------------ */
/* Full-facts comparison (the quick calculator and its advanced handoff)     */
/* ------------------------------------------------------------------------ */

export interface CalculatorScenario {
  id: "MOTHER_MOST" | "FATHER_NINE" | "SHARED"
  name: string
  description: string
  input: CalculatorInput
}

export interface CalculatorScenarioOutcome {
  id: CalculatorScenario["id"]
  name: string
  description: string
  result: CalculatorResult
  /** Difference to the first variant; `null` when either amount is unknown. */
  differenceGrosze: number | null
}

export interface CalculatorComparison {
  baseline: string
  outcomes: CalculatorScenarioOutcome[]
  verified: boolean
  status: CalculatorResult["status"]
  notes: string[]
}

function parentalPoolWeeks(input: CalculatorInput, ruleSet: RuleSet): number {
  const multiple = (input.childrenCount ?? 1) > 1
  if (input.hasZaZyciem) {
    return multiple
      ? ruleSet.parental.poolWeeks.zaZyciemMultiple
      : ruleSet.parental.poolWeeks.zaZyciemSingle
  }
  return multiple
    ? ruleSet.parental.poolWeeks.multiple
    : ruleSet.parental.poolWeeks.single
}

/**
 * Leave-sharing variants built only from the active rule set. The engine still
 * validates every variant and reports any correction in `planAdjustments`;
 * this function never claims that a variant is legally available.
 */
export function buildParentalScenarios(
  input: CalculatorInput,
  ruleSet: RuleSet
): CalculatorScenario[] {
  const pool = parentalPoolWeeks(input, ruleSet)
  const reserved = ruleSet.parental.nonTransferableWeeks
  const motherShare = Math.max(reserved, pool - reserved)
  const fatherShare = Math.max(reserved, Math.floor(pool / 2))
  const sharedMother = Math.max(reserved, pool - fatherShare)
  const fatherEnabled = input.fatherEnabled !== false

  const base: CalculatorInput = {
    ...input,
    motherEnabled: input.motherEnabled !== false,
    secondParentParentalWeeks: 0,
    motherParentalWeeks: motherShare,
  }

  const scenarios: CalculatorScenario[] = [
    {
      id: "MOTHER_MOST",
      name: "Mama bierze większość",
      description: `Mama wykorzystuje swoją część urlopu rodzicielskiego (${motherShare} tyg.), a ${reserved} tyg. drugiego rodzica pozostaje niewykorzystane.`,
      input: base,
    },
  ]
  if (!fatherEnabled) return scenarios

  scenarios.push({
    id: "FATHER_NINE",
    name: "Tata bierze 9 tygodni",
    description: `Mama bierze ${motherShare} tyg., a tata wykorzystuje swoje ${reserved} tyg. urlopu rodzicielskiego.`,
    input: {
      ...base,
      secondParentParentalWeeks: reserved,
      motherParentalWeeks: motherShare,
    },
  })
  scenarios.push({
    id: "SHARED",
    name: "Urlop dzielony po połowie",
    description: `Mama bierze ${sharedMother} tyg., a tata ${fatherShare} tyg. Podział jest sprawdzany przez silnik — nadmiar zostanie skrócony.`,
    input: {
      ...base,
      secondParentParentalWeeks: fatherShare,
      motherParentalWeeks: sharedMother,
    },
  })
  return scenarios
}

/** Runs the same household facts with several parental-leave splits. */
export function compareCalculatorScenarios(
  input: CalculatorInput,
  ruleSet: RuleSet,
  scenarios: readonly CalculatorScenario[] = buildParentalScenarios(
    input,
    ruleSet
  )
): CalculatorComparison {
  if (scenarios.length === 0) {
    throw new RangeError("Podaj co najmniej jeden scenariusz.")
  }
  const results = scenarios.map((scenario) => ({
    scenario,
    result: calculateBenefits(scenario.input, ruleSet),
  }))
  const firstKnown = results[0]?.result.analysis.totalGrosze ?? null
  const outcomes: CalculatorScenarioOutcome[] = results.map(
    ({ scenario, result }) => {
      const total = result.analysis.totalGrosze
      return {
        id: scenario.id,
        name: scenario.name,
        description: scenario.description,
        result,
        differenceGrosze:
          total !== null && firstKnown !== null ? total - firstKnown : null,
      }
    }
  )
  return {
    baseline: outcomes[0]?.name ?? "",
    outcomes,
    verified: outcomes.every((outcome) => outcome.result.verified),
    status: outcomes.some(
      (outcome) => outcome.result.status === "NOT_ELIGIBLE"
    )
      ? "NOT_ELIGIBLE"
      : outcomes.some((outcome) => outcome.result.status === "INDETERMINATE")
        ? "INDETERMINATE"
        : "OK",
    notes: [
      "Wszystkie warianty liczy ten sam silnik reguł. Różnice dotyczą wyłącznie podziału urlopu rodzicielskiego i są liczone względem pierwszego wariantu.",
      "Dziewięć tygodni urlopu rodzicielskiego drugiego rodzica jest zawsze płatne 70% (U art. 31 ust. 3f). Silnik zgłasza każdą korektę planu.",
    ],
  }
}

export function compareLeaveScenarios(
  base: ScenarioBase,
  scenarios: readonly LeaveScenario[],
  ruleSet: RuleSet
): ScenarioComparison {
  if (scenarios.length === 0) {
    throw new RangeError("Podaj co najmniej jeden scenariusz.")
  }

  const results = scenarios.map((scenario) => {
    const input: CalculatorInput = {
      grossMonthlyIncomeGrosze: base.grossMonthlyIncomeGrosze,
      childrenCount: base.childrenCount,
      hasZaZyciem: base.hasZaZyciem,
      paymentOption: scenario.paymentOption,
      maternityWeeksBeforeBirth: scenario.maternityWeeksBeforeBirth,
      secondParentParentalWeeks: scenario.secondParentParentalWeeks,
      parentalWorkFraction: scenario.parentalWorkFraction,
      paternityDays: scenario.paternityDays,
    }
    const result = calculateBenefits(input, ruleSet)
    let motherLeaveEnd: string | null = null
    if (base.dueDate && isIsoDate(base.dueDate)) {
      const plan = buildTimeline(
        {
          dueDate: base.dueDate,
          maternityWeeksBeforeBirth: result.input.maternityWeeksBeforeBirth,
          childrenCount: result.input.childrenCount,
          secondParentParentalWeeks: result.input.secondParentParentalWeeks,
          paternityDays: result.input.paternityDays,
          hasZaZyciem: result.input.hasZaZyciem,
        },
        ruleSet
      )
      motherLeaveEnd =
        plan.milestones.find((milestone) => milestone.id === "parental-end")
          ?.date ?? null
    }
    return { scenario, result, motherLeaveEnd }
  })

  const firstTotal = results[0]?.result.totalGrosze ?? 0

  return {
    base,
    outcomes: results.map(({ scenario, result, motherLeaveEnd }) => ({
      name: scenario.name,
      input: result.input,
      maternityWeeks: result.maternityWeeks,
      motherParentalWeeks: result.motherParentalWeeks,
      secondParentWeeks: result.secondParentWeeks,
      extensionWeeks: result.extensionWeeks,
      paternityDays: result.paternityDays,
      totalGrosze: result.totalGrosze,
      totalDifferenceGrosze: result.totalGrosze - firstTotal,
      lines: result.lines,
      motherLeaveEnd,
      warnings: result.warnings,
    })),
    verified: results.every(({ result }) => result.verified),
    status: results.some(({ result }) => result.status === "INDETERMINATE")
      ? "INDETERMINATE"
      : "OK",
    notes: [
      "Kwoty brutto, przed zaliczką na PIT. Szacunek demonstracyjny do czasu zatwierdzenia parametrów Q-15 i Q-29.",
      `Przy rozdziale urlopu ${ruleSet.parental.nonTransferableWeeks} tygodni drugiego rodzica jest zawsze płatne ${formatRatePercent(ruleSet.parental.rate)} (U art. 31 ust. 3f).`,
    ],
  }
}
