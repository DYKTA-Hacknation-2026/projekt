import {
  dailyBasis,
  daysAmount,
  multiplyGrosze,
  weeklyAmount,
} from "./money"

import type {
  CalculatorInput,
  CalculatorResult,
  CalculationLine,
  CalculationTraceStep,
} from "./types"

/** KP art. 180 §1 — 20/31/33/35/37 weeks. */
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

export const PARENTAL_NON_TRANSFERABLE_WEEKS = 9
export const CONTRIBUTION_DEDUCTION = 0.1371
export const MATERNITY_RATE = 1
export const PARENTAL_RATE = 0.7
export const FLAT_RATE = 0.815

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function normalizeInput(input: CalculatorInput): CalculatorInput {
  return {
    ...input,
    grossMonthlyIncomeGrosze: Math.max(
      0,
      Math.round(input.grossMonthlyIncomeGrosze)
    ),
    childrenCount: clamp(Math.round(input.childrenCount), 1, 5),
    maternityWeeksBeforeBirth: clamp(
      Math.round(input.maternityWeeksBeforeBirth),
      0,
      6
    ),
    secondParentParentalWeeks: clamp(
      Math.round(input.secondParentParentalWeeks),
      0,
      PARENTAL_NON_TRANSFERABLE_WEEKS
    ),
    parentalWorkFraction: clamp(input.parentalWorkFraction, 0, 0.5),
    paternityDays: clamp(Math.round(input.paternityDays), 0, 14),
  }
}

/**
 * Deterministic, explainable preview used by the scaffold calculator.
 *
 * It intentionally returns `verified: false` for absolute amounts: the
 * minimum-wage and świadczenie rodzicielskie values (Q-29) and the final
 * rounding policy (Q-15) are not yet configured. The calculation engine will
 * replace this preview with the full `@zpr/domain.evaluate` implementation.
 */
export function calculateBenefits(input: CalculatorInput): CalculatorResult {
  const normalized = normalizeInput(input)
  const children = normalized.childrenCount
  const maternityWeeks = MATERNITY_WEEKS_BY_CHILDREN[children] ?? 37
  const postBirthWeeks = Math.max(
    0,
    maternityWeeks - normalized.maternityWeeksBeforeBirth
  )

  const parentalPoolWeeks = normalized.hasZaZyciem
    ? children > 1
      ? PARENTAL_POOL_WEEKS.zaZyciemMultiple
      : PARENTAL_POOL_WEEKS.zaZyciemSingle
    : children > 1
      ? PARENTAL_POOL_WEEKS.multiple
      : PARENTAL_POOL_WEEKS.single

  const secondParentWeeks = Math.min(
    normalized.secondParentParentalWeeks,
    PARENTAL_NON_TRANSFERABLE_WEEKS,
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
    1 - CONTRIBUTION_DEDUCTION
  )
  const dailyBasisGrosze = dailyBasis(basisGrosze)

  const lines: CalculationLine[] = []
  const flat = normalized.paymentOption === "FLAT_81_5"
  const maternityRate = flat ? FLAT_RATE : MATERNITY_RATE
  const parentalRate = flat ? FLAT_RATE : PARENTAL_RATE

  lines.push({
    kind: "MATERNITY",
    label: "Zasiłek macierzyński (urlop macierzyński)",
    weeks: maternityWeeks,
    days: maternityWeeks * 7,
    rate: maternityRate,
    amountGrosze: weeklyAmount(basisGrosze, maternityRate) * maternityWeeks,
    legalReference: "KP art. 180 §1; U art. 31 ust. 1",
  })

  lines.push({
    kind: "PARENTAL",
    label: "Zasiłek macierzyński (urlop rodzicielski mamy)",
    weeks: motherParentalWeeks,
    days: motherParentalWeeks * 7,
    rate: parentalRate,
    amountGrosze:
      weeklyAmount(basisGrosze, parentalRate) * motherParentalWeeks,
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
          parentalRate * (1 - normalized.parentalWorkFraction)
        ) * motherParentalWeeks,
      legalReference: "KP art. 182¹e–f; U art. 31 ust. 4a",
    })
  }

  if (secondParentWeeks > 0) {
    lines.push({
      kind: "PARENTAL",
      label: "Urlop rodzicielski drugiego rodzica (9 tygodni)",
      weeks: secondParentWeeks,
      days: secondParentWeeks * 7,
      rate: PARENTAL_RATE,
      amountGrosze: weeklyAmount(basisGrosze, PARENTAL_RATE) * secondParentWeeks,
      legalReference: "KP art. 182¹a §4; U art. 31 ust. 3f",
    })
  }

  if (normalized.paternityDays > 0) {
    lines.push({
      kind: "PATERNITY",
      label: "Zasiłek macierzyński (urlop ojcowski)",
      weeks: 0,
      days: normalized.paternityDays,
      rate: MATERNITY_RATE,
      amountGrosze: daysAmount(
        basisGrosze,
        MATERNITY_RATE,
        normalized.paternityDays
      ),
      legalReference: "KP art. 182³; U art. 31 ust. 1",
    })
  }

  const totalGrosze = lines.reduce((sum, line) => sum + line.amountGrosze, 0)
  const warnings: string[] = []

  if (normalized.parentalWorkFraction > 0) {
    warnings.push(
      "Łączenie urlopu rodzicielskiego z pracą wymaga wniosku najpóźniej 21 dni przed rozpoczęciem pracy. Pracodawca może odmówić ze względów organizacyjnych."
    )
  }
  if (flat) {
    warnings.push(
      "Wariant 81,5% wymaga pisemnego wniosku w ciągu 21 dni od porodu (lub przyjęcia dziecka). Dziewięć tygodni drugiego rodzica zawsze pozostaje na poziomie 70%."
    )
  }
  if (normalized.maternityWeeksBeforeBirth > 0) {
    warnings.push(
      "Maksymalnie 6 tygodni urlopu macierzyńskiego można wykorzystać przed przewidywanym terminem porodu; potrzebne jest zaświadczenie lekarskie."
    )
  }

  const trace: CalculationTraceStep[] = [
    {
      ruleId: "LR-123",
      label: `Wymiar urlopu macierzyńskiego: ${maternityWeeks} tygodni`,
      detail: `Liczba dzieci: ${children === 5 ? "5 lub więcej" : children}. Wykorzystano ${normalized.maternityWeeksBeforeBirth} tyg. przed porodem, po porodzie pozostaje ${postBirthWeeks} tyg.`,
      legalReference: "KP art. 180 §1–2",
    },
    {
      ruleId: "LR-127",
      label: `Pula urlopu rodzicielskiego: ${parentalPoolWeeks} tygodni`,
      detail: `Dla mamy: ${motherParentalWeeks} tyg., dla drugiego rodzica: ${secondParentWeeks} tyg. (9 tygodni jest niezbywalne).`,
      legalReference: "KP art. 182¹a; KP art. 182¹c",
    },
    {
      ruleId: "LR-130",
      label: flat
        ? "Wybrano wariant 81,5% dla całego okresu"
        : "Wybrano wariant 100% (macierzyński) + 70% (rodzicielski)",
      detail: `Stawki: macierzyński ${Math.round(maternityRate * 100)}%, rodzicielski ${Math.round(parentalRate * 100)}%. Wartości zaokrąglane do groszy.`,
      legalReference: "U art. 30a, 31 ust. 1–4",
    },
    {
      ruleId: "LR-112",
      label: "Podstawa wymiaru po potrąceniu składki chorobowej",
      detail: "Podstawa miesięczna = wynagrodzenie brutto × (1 − 13,71%). Podstawa dzienna = 1/30 podstawy miesięcznej.",
      legalReference: "U art. 36, 38; P s. 24",
    },
    {
      ruleId: "LR-133",
      label: `Urlop ojcowski: ${normalized.paternityDays} dni`,
      detail: "Maksymalnie 14 dni, w jednej lub dwóch częściach; termin do ukończenia 12. miesiąca życia dziecka.",
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
    verified: false,
    status: "INDETERMINATE",
    warnings: [
      ...warnings,
      "Kwoty są szacunkiem demonstracyjnym. Minimalna podstawa, maksymalny wymiar i kwota świadczenia rodzicielskiego (Q-29) oraz zasady zaokrąglania (Q-15) wymagają zatwierdzenia.",
    ],
    trace,
  }
}
