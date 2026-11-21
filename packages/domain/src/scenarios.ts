import { calculateBenefits } from "./calculator"
import { isIsoDate } from "./dates"
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
  verified: false
  status: CalculatorResult["status"]
  notes: string[]
}

export function compareLeaveScenarios(
  base: ScenarioBase,
  scenarios: readonly LeaveScenario[]
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
    const result = calculateBenefits(input)
    let motherLeaveEnd: string | null = null
    if (base.dueDate && isIsoDate(base.dueDate)) {
      const plan = buildTimeline({
        dueDate: base.dueDate,
        maternityWeeksBeforeBirth: result.input.maternityWeeksBeforeBirth,
        childrenCount: result.input.childrenCount,
        secondParentParentalWeeks: result.input.secondParentParentalWeeks,
        paternityDays: result.input.paternityDays,
        hasZaZyciem: result.input.hasZaZyciem,
      })
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
    verified: false,
    status: results.some(({ result }) => result.status === "INDETERMINATE")
      ? "INDETERMINATE"
      : "OK",
    notes: [
      "Kwoty brutto, przed zaliczką na PIT. Szacunek demonstracyjny do czasu zatwierdzenia parametrów Q-15 i Q-29.",
      "Przy rozdziale urlopu dziewięć tygodni drugiego rodzica jest zawsze płatne 70% (U art. 31 ust. 3f).",
    ],
  }
}
