import {
  dailyBasis,
  daysAmount,
  formatRatePercent,
  multiplyGrosze,
  weeklyAmount,
} from "./money"
import type { RuleSet } from "./rule-set"

import type {
  CalculatorInput,
  CalculatorResult,
  CalculationLine,
  CalculationTraceStep,
} from "./types"

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function normalizeInput(
  input: CalculatorInput,
  ruleSet: RuleSet
): CalculatorInput {
  return {
    ...input,
    grossMonthlyIncomeGrosze: Math.max(
      0,
      Math.round(input.grossMonthlyIncomeGrosze)
    ),
    childrenCount: clamp(
      Math.round(input.childrenCount),
      1,
      ruleSet.maternity.maxChildren
    ),
    maternityWeeksBeforeBirth: clamp(
      Math.round(input.maternityWeeksBeforeBirth),
      0,
      ruleSet.maternity.maxPreBirthWeeks
    ),
    secondParentParentalWeeks: clamp(
      Math.round(input.secondParentParentalWeeks),
      0,
      ruleSet.parental.nonTransferableWeeks
    ),
    parentalWorkFraction: clamp(
      input.parentalWorkFraction,
      0,
      ruleSet.parental.maxWorkFraction
    ),
    paternityDays: clamp(
      Math.round(input.paternityDays),
      0,
      ruleSet.paternity.days
    ),
  }
}

function verificationWarnings(ruleSet: RuleSet): string[] {
  const warnings: string[] = []
  if (ruleSet.unverifiedRules.length > 0) {
    warnings.push(
      `Zestaw reguł ${ruleSet.version} nie jest w pełni zweryfikowany (${ruleSet.unverifiedRules.join(", ")}).`
    )
  }
  if (!ruleSet.basis.roundingVerified) {
    warnings.push("Zasady zaokrąglania kwot (Q-15) wymagają zatwierdzenia.")
  }
  if (
    ruleSet.minimum.blocking &&
    ruleSet.minimum.parentalBenefitAmountGrosze === null
  ) {
    warnings.push(
      "Minimalna kwota zasiłku macierzyńskiego — świadczenie rodzicielskie (Q-29) — nie jest uzupełniona."
    )
  }
  return warnings
}

/**
 * Deterministic, explainable preview used by the scaffold calculator.
 *
 * Every legal value comes from `ruleSet`, which the server builds from the
 * effective rows of `legal.legal_rule_versions`. Changing a percentage or a
 * duration is therefore a database change: this function does not need a new
 * deployment.
 */
export function calculateBenefits(
  input: CalculatorInput,
  ruleSet: RuleSet
): CalculatorResult {
  const normalized = normalizeInput(input, ruleSet)
  const children = normalized.childrenCount
  const maternityWeeks =
    ruleSet.maternity.weeksByChildren[children] ??
    ruleSet.maternity.weeksByChildren[ruleSet.maternity.maxChildren] ??
    0
  const postBirthWeeks = Math.max(
    0,
    maternityWeeks - normalized.maternityWeeksBeforeBirth
  )

  const parentalPoolWeeks = normalized.hasZaZyciem
    ? children > 1
      ? ruleSet.parental.poolWeeks.zaZyciemMultiple
      : ruleSet.parental.poolWeeks.zaZyciemSingle
    : children > 1
      ? ruleSet.parental.poolWeeks.multiple
      : ruleSet.parental.poolWeeks.single

  const secondParentWeeks = Math.min(
    normalized.secondParentParentalWeeks,
    ruleSet.parental.nonTransferableWeeks,
    parentalPoolWeeks
  )
  const motherParentalWeeks = Math.max(0, parentalPoolWeeks - secondParentWeeks)

  // KP art. 182¹e–f: working part-time extends the leave proportionally.
  // The demo formula follows the handbook example (16 weeks × ½ = 8 weeks).
  const extensionWeeks = Math.round(
    motherParentalWeeks * normalized.parentalWorkFraction
  )

  const basisGrosze = multiplyGrosze(
    normalized.grossMonthlyIncomeGrosze,
    1 - ruleSet.basis.contributionDeduction
  )
  const dailyBasisGrosze = dailyBasis(
    basisGrosze,
    ruleSet.basis.dailyDivisor
  )

  const lines: CalculationLine[] = []
  const flat = normalized.paymentOption === "FLAT_81_5"
  const maternityRate = flat
    ? ruleSet.parental.flatRate
    : ruleSet.maternity.rate
  const parentalRate = flat ? ruleSet.parental.flatRate : ruleSet.parental.rate

  lines.push({
    kind: "MATERNITY",
    label: "Zasiłek macierzyński (urlop macierzyński)",
    weeks: maternityWeeks,
    days: maternityWeeks * 7,
    rate: maternityRate,
    amountGrosze:
      weeklyAmount(basisGrosze, maternityRate, ruleSet.basis.dailyDivisor) *
      maternityWeeks,
    legalReference: "KP art. 180 §1; U art. 31 ust. 1",
  })

  lines.push({
    kind: "PARENTAL",
    label: "Zasiłek macierzyński (urlop rodzicielski mamy)",
    weeks: motherParentalWeeks,
    days: motherParentalWeeks * 7,
    rate: parentalRate,
    amountGrosze:
      weeklyAmount(basisGrosze, parentalRate, ruleSet.basis.dailyDivisor) *
      motherParentalWeeks,
    legalReference: "KP art. 182¹a; U art. 31 ust. 2–3",
  })

  if (extensionWeeks > 0) {
    lines.push({
      kind: "WORK_COMBINATION_EXTENSION",
      label: "Przedłużenie urlopu rodzicielskiego (praca łączona)",
      weeks: extensionWeeks,
      days: extensionWeeks * 7,
      rate: parentalRate,
      amountGrosze:
        weeklyAmount(
          basisGrosze,
          parentalRate * (1 - normalized.parentalWorkFraction),
          ruleSet.basis.dailyDivisor
        ) * motherParentalWeeks,
      legalReference: "KP art. 182¹e–f; U art. 31 ust. 4a",
    })
  }

  if (secondParentWeeks > 0) {
    lines.push({
      kind: "PARENTAL",
      label: `Urlop rodzicielski drugiego rodzica (${ruleSet.parental.nonTransferableWeeks} tygodni)`,
      weeks: secondParentWeeks,
      days: secondParentWeeks * 7,
      rate: ruleSet.parental.rate,
      amountGrosze:
        weeklyAmount(
          basisGrosze,
          ruleSet.parental.rate,
          ruleSet.basis.dailyDivisor
        ) * secondParentWeeks,
      legalReference: "KP art. 182¹a §4; U art. 31 ust. 3f",
    })
  }

  if (normalized.paternityDays > 0) {
    lines.push({
      kind: "PATERNITY",
      label: "Zasiłek macierzyński (urlop ojcowski)",
      weeks: 0,
      days: normalized.paternityDays,
      rate: ruleSet.maternity.rate,
      amountGrosze: daysAmount(
        basisGrosze,
        ruleSet.maternity.rate,
        normalized.paternityDays,
        ruleSet.basis.dailyDivisor
      ),
      legalReference: "KP art. 182³; U art. 31 ust. 1",
    })
  }

  const totalGrosze = lines.reduce((sum, line) => sum + line.amountGrosze, 0)
  const warnings: string[] = []

  if (normalized.parentalWorkFraction > 0) {
    warnings.push(
      `Łączenie urlopu rodzicielskiego z pracą wymaga wniosku najpóźniej ${ruleSet.deadlines.workCombinationNoticeDays} dni przed rozpoczęciem pracy. Pracodawca może odmówić ze względów organizacyjnych.`
    )
  }
  if (flat) {
    warnings.push(
      `Wariant ${formatRatePercent(ruleSet.parental.flatRate)} wymaga pisemnego wniosku w ciągu ${ruleSet.deadlines.flatRateApplicationDays} dni od porodu (lub przyjęcia dziecka). ${ruleSet.parental.nonTransferableWeeks} tygodni drugiego rodzica zawsze pozostaje na poziomie ${formatRatePercent(ruleSet.parental.rate)}.`
    )
  }
  if (normalized.maternityWeeksBeforeBirth > 0) {
    warnings.push(
      `Maksymalnie ${ruleSet.maternity.maxPreBirthWeeks} tygodni urlopu macierzyńskiego można wykorzystać przed przewidywanym terminem porodu; potrzebne jest zaświadczenie lekarskie.`
    )
  }
  warnings.push(...verificationWarnings(ruleSet))

  const trace: CalculationTraceStep[] = [
    {
      ruleId: "LR-123",
      label: `Wymiar urlopu macierzyńskiego: ${maternityWeeks} tygodni`,
      detail: `Liczba dzieci: ${children === ruleSet.maternity.maxChildren ? `${children} lub więcej` : children}. Wykorzystano ${normalized.maternityWeeksBeforeBirth} tyg. przed porodem, po porodzie pozostaje ${postBirthWeeks} tyg.`,
      legalReference: "KP art. 180 §1–2",
    },
    {
      ruleId: "LR-127",
      label: `Pula urlopu rodzicielskiego: ${parentalPoolWeeks} tygodni`,
      detail: `Dla mamy: ${motherParentalWeeks} tyg., dla drugiego rodzica: ${secondParentWeeks} tyg. (${ruleSet.parental.nonTransferableWeeks} tygodni jest niezbywalne).`,
      legalReference: "KP art. 182¹a; KP art. 182¹c",
    },
    {
      ruleId: "LR-130",
      label: flat
        ? `Wybrano wariant ${formatRatePercent(ruleSet.parental.flatRate)} dla całego okresu`
        : `Wybrano wariant ${formatRatePercent(ruleSet.maternity.rate)} (macierzyński) + ${formatRatePercent(ruleSet.parental.rate)} (rodzicielski)`,
      detail: `Stawki: macierzyński ${formatRatePercent(maternityRate)}, rodzicielski ${formatRatePercent(parentalRate)}. Wartości zaokrąglane do groszy.`,
      legalReference: "U art. 30a, 31 ust. 1–4",
    },
    {
      ruleId: "LR-112",
      label: "Podstawa wymiaru po potrąceniu składki chorobowej",
      detail: `Podstawa miesięczna = wynagrodzenie brutto × (1 − ${(ruleSet.basis.contributionDeduction * 100).toLocaleString("pl-PL", { maximumFractionDigits: 2 })}%). Podstawa dzienna = 1/${ruleSet.basis.dailyDivisor} podstawy miesięcznej.`,
      legalReference: "U art. 36, 38; P s. 24",
    },
    {
      ruleId: "LR-133",
      label: `Urlop ojcowski: ${normalized.paternityDays} dni`,
      detail: `Maksymalnie ${ruleSet.paternity.days} dni, w jednej lub ${ruleSet.paternity.maxParts} częściach; termin do ukończenia ${ruleSet.paternity.deadlineMonths}. miesiąca życia dziecka.`,
      legalReference: "KP art. 182³",
    },
  ]

  return {
    input: normalized,
    normalizedChildrenCount: children,
    maternityWeeks,
    preBirthWeeks: normalized.maternityWeeksBeforeBirth,
    postBirthWeeks,
    parentalPoolWeeks,
    secondParentWeeks,
    motherParentalWeeks,
    extensionWeeks,
    paternityDays: normalized.paternityDays,
    basisGrosze,
    dailyBasisGrosze,
    lines,
    totalGrosze,
    verified: ruleSet.verified,
    status: ruleSet.verified ? "OK" : "INDETERMINATE",
    ruleSetVersion: ruleSet.version,
    ruleSetEffectiveFrom: ruleSet.effectiveFrom,
    ruleSetVerified: ruleSet.verified,
    warnings,
    trace,
  }
}
