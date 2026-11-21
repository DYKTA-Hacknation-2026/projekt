import { calculateBenefits } from "./calculator-engine"
import { evaluate } from "./engine/evaluate"
import { latestRuleSet } from "./engine/rulesets"
import type { AssessmentInput, ParentInput } from "./engine/types"

import type {
  CalculatorInput,
  CalculatorResult,
  CalculationLine,
  CalculationTraceStep,
} from "./types"

/**
 * The simplified, date-free calculator used by the integrated calculator UI.
 *
 * It is an adapter over the deterministic engine (`./engine`), so it applies
 * exactly the same rules, rates and rounding. Simplifications, all reported in
 * `warnings`:
 * - the mother is an employee with sickness insurance on the birth date;
 * - one gross monthly income is used for both parents (assumption A-29);
 * - dates are nominal (due date = start of the current rule set), because the
 *   amounts do not depend on calendar dates.
 */

/** KP art. 180 §1 — 20/31/33/35/37 weeks. */
export const MATERNITY_WEEKS_BY_CHILDREN: Record<number, number> = latestRuleSet().parameters.maternity.weeksByChildren

/** KP art. 182¹a — 41/43 weeks, or 65/67 with a "Za życiem" certificate. */
export const PARENTAL_POOL_WEEKS = latestRuleSet().parameters.parental.poolWeeks

export const PARENTAL_NON_TRANSFERABLE_WEEKS = latestRuleSet().parameters.parental.nonTransferableWeeks
export const CONTRIBUTION_DEDUCTION = Number(latestRuleSet().parameters.basis.contributionDeduction)
export const MATERNITY_RATE = 1
export const PARENTAL_RATE = 0.7
export const FLAT_RATE = 0.815

const SIMPLIFICATION_WARNING =
  "Kalkulator uproszczony: matka jest pracownicą ubezpieczoną w dniu porodu, a dla drugiego rodzica przyjęto ten sam dochód. Kwoty są szacunkiem — kwota świadczenia rodzicielskiego i minimalne wynagrodzenie (Q-29) nie są zawarte w źródłach, a zasady zaokrąglania (Q-15) przyjęliśmy jako założenie."

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function normalizeInput(input: CalculatorInput): CalculatorInput {
  return {
    ...input,
    grossMonthlyIncomeGrosze: Math.max(0, Math.round(input.grossMonthlyIncomeGrosze)),
    childrenCount: clamp(Math.round(input.childrenCount), 1, 5),
    maternityWeeksBeforeBirth: clamp(Math.round(input.maternityWeeksBeforeBirth), 0, 6),
    secondParentParentalWeeks: clamp(Math.round(input.secondParentParentalWeeks), 0, PARENTAL_NON_TRANSFERABLE_WEEKS),
    parentalWorkFraction: clamp(input.parentalWorkFraction, 0, 0.5),
    paternityDays: clamp(Math.round(input.paternityDays), 0, 14),
  }
}

/** Leave plan equivalent to the simplified calculator input (mother uses pool − 9 weeks, father the reserved part). */
export function calculatorToLeavePlan(input: CalculatorInput): NonNullable<AssessmentInput["plan"]> {
  const normalized = normalizeInput(input)
  const poolWeeks = normalized.hasZaZyciem
    ? normalized.childrenCount > 1
      ? PARENTAL_POOL_WEEKS.zaZyciemMultiple
      : PARENTAL_POOL_WEEKS.zaZyciemSingle
    : normalized.childrenCount > 1
      ? PARENTAL_POOL_WEEKS.multiple
      : PARENTAL_POOL_WEEKS.single
  return {
    paymentOption: normalized.paymentOption,
    maternityWeeksBeforeBirth: normalized.maternityWeeksBeforeBirth,
    parentalSegments: [
      {
        parent: "MOTHER",
        weeks: poolWeeks - PARENTAL_NON_TRANSFERABLE_WEEKS,
        workFraction: normalized.parentalWorkFraction > 0 ? String(normalized.parentalWorkFraction) : undefined,
      },
      ...(normalized.secondParentParentalWeeks > 0
        ? [{ parent: "FATHER" as const, weeks: normalized.secondParentParentalWeeks }]
        : []),
    ],
    paternity: normalized.paternityDays > 0 ? [{ days: normalized.paternityDays }] : [],
  }
}

/** Maps the simplified calculator input to an engine assessment request. */
export function calculatorToAssessmentInput(input: CalculatorInput): AssessmentInput {
  const normalized = normalizeInput(input)
  const nominalDueDate = latestRuleSet().effectiveFrom
  const basis: ParentInput["basis"] =
    normalized.grossMonthlyIncomeGrosze > 0
      ? { method: "GROSS_MONTHLY", grossMonthlyGrosze: normalized.grossMonthlyIncomeGrosze }
      : undefined
  const withFather = normalized.secondParentParentalWeeks > 0 || normalized.paternityDays > 0
  const parents: ParentInput[] = [{ role: "MOTHER", insurance: { title: "EMPLOYMENT" }, basis }]
  if (withFather) parents.push({ role: "FATHER", insurance: { title: "EMPLOYMENT" }, basis })
  return {
    asOf: nominalDueDate,
    event: {
      kind: "PREGNANCY",
      expectedDueDate: nominalDueDate,
      childrenCount: normalized.childrenCount,
      zaZyciem: normalized.hasZaZyciem,
    },
    parents,
    plan: calculatorToLeavePlan(normalized),
  }
}

const KIND_ORDER: CalculationLine["kind"][] = ["MATERNITY", "PARENTAL", "WORK_COMBINATION_EXTENSION", "PATERNITY"]

/** Deterministic, explainable estimate for the integrated calculator. */
export function calculateEngineBenefits(input: CalculatorInput, ruleSet: import("./rule-set").RuleSet): CalculatorResult {
  const normalized = normalizeInput(input)
  const { assessment, schedule } = evaluate(calculatorToAssessmentInput(normalized))
  const children = normalized.childrenCount
  const maternityWeeks = MATERNITY_WEEKS_BY_CHILDREN[children] ?? 37
  const motherBasis = assessment.basis.find((basis) => basis.parent === "MOTHER")
  const basisGrosze = motherBasis?.monthlyBasisGrosze ?? 0
  const allocation = (role: "MOTHER" | "FATHER") => assessment.allocation.find((entry) => entry.parent === role)
  const mother = allocation("MOTHER")
  const father = allocation("FATHER")

  const lines: CalculationLine[] = assessment.breakdown
    .filter((line) => ["MATERNITY", "PARENTAL", "PATERNITY"].includes(line.benefit))
    .map((line) => {
      const extension = line.id.endsWith("extension")
      const kind: CalculationLine["kind"] = extension
        ? "WORK_COMBINATION_EXTENSION"
        : (line.benefit as "MATERNITY" | "PARENTAL" | "PATERNITY")
      return {
        kind,
        beneficiary: line.parent === "FATHER" ? "SECOND_PARENT" as const : "MOTHER" as const,
        leaveType: line.label,
        minimumApplied: false,
        label: line.label,
        weeks: Math.floor(line.days / 7),
        days: line.days,
        // Display value only; the authoritative amount is `amountGrosze`.
        rate: Number(line.rate) * Number(line.paidFraction),
        amountGrosze: line.amountGrosze ?? 0,
        legalReference: [...new Set(line.ruleIds)].join(", "),
      }
    })
    .sort((a, b) => KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind))

  const trace: CalculationTraceStep[] = assessment.appliedRules.map((rule) => ({
    ruleId: rule.ruleId,
    label: rule.title,
    detail: rule.openQuestion ? `Wersja ${rule.ruleSetVersion}; kwestia otwarta ${rule.openQuestion}.` : `Wersja ${rule.ruleSetVersion}.`,
    legalReference: rule.sources.join("; "),
  }))

  const amountsKnown = assessment.totals.totalGrosze !== null && basisGrosze > 0
  return {
    ...calculateBenefits(normalized, ruleSet),
    input: normalized,
    normalizedChildrenCount: children,
    maternityWeeks,
    preBirthWeeks: normalized.maternityWeeksBeforeBirth,
    postBirthWeeks: maternityWeeks - normalized.maternityWeeksBeforeBirth,
    parentalPoolWeeks: schedule?.poolWeeks ?? 0,
    secondParentWeeks: (father?.parentalDays ?? 0) / 7,
    motherParentalWeeks: (mother?.parentalDays ?? 0) / 7,
    extensionWeeks: ((mother?.parentalExtensionDays ?? 0) + (father?.parentalExtensionDays ?? 0)) / 7,
    paternityDays: father?.paternityDays ?? 0,
    basisGrosze,
    dailyBasisGrosze: Math.round(basisGrosze / 30),
    lines,
    totalGrosze: amountsKnown ? (assessment.totals.totalGrosze ?? 0) : 0,
    verified: false,
    status: amountsKnown && assessment.totals.amountStatus === "CALCULATED" ? "OK" : "INDETERMINATE",
    warnings: [
      ...assessment.planAdjustments,
      ...assessment.warnings.filter((warning) => warning.code !== "VOLUNTARY_DEREGISTRATION").map((warning) => warning.text),
      SIMPLIFICATION_WARNING,
    ],
    trace,
  }
}
