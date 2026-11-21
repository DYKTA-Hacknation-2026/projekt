import { deadlineAfter } from "./calendar"
import type { ComputedBasis } from "./basis"
import type { EvaluationContext } from "./context"
import { ONE, Ratio, formatGrosze, groszeToNumber, ratio } from "./decimal"
import type { DerivedEvent, RateKey, Schedule, ScheduledPeriod } from "./schedule"
import type { RuleId } from "./sources"
import type { AmountStatus, CalculationLine, ParentRole } from "./types"

export interface FlatRateStatus {
  requested: boolean
  applies: boolean
  /** Filing still needed by this date. */
  deadline: string | null
  /** U art. 31 ust. 3g: no parental day in the child's first year. */
  firstYearFallback: boolean
  note: string | null
}

/** U art. 30a and art. 31 ust. 3, 3f, 3g — exact conditions of the 81.5% variant. */
export function flatRateStatus(ctx: EvaluationContext, ev: DerivedEvent, schedule: Schedule): FlatRateStatus {
  const plan = ctx.input.plan ?? {}
  const requested = plan.paymentOption === "FLAT_81_5"
  const none = (note: string | null): FlatRateStatus => ({ requested, applies: false, deadline: null, firstYearFallback: false, note })
  if (!requested) return none(null)
  ctx.use("LR-130A")
  const motherHasMaternity = schedule.periods.some(
    (period) => period.parent === "MOTHER" && (period.benefit === "MATERNITY" || period.benefit === "MATERNITY_TERMS")
  )
  if (!motherHasMaternity) {
    return none("Wariant 81,5% wymaga wniosku ubezpieczonej matki (przy adopcji — ubezpieczonego), która pobiera zasiłek za urlop macierzyński lub na jego warunkach (U art. 30a).")
  }
  if (schedule.poolWeeks === 0) {
    return none("Wariant 81,5% dotyczy urlopu macierzyńskiego i rodzicielskiego w pełnym wymiarze; po urodzeniu martwego dziecka lub jego zgonie nie ma urlopu rodzicielskiego — zasiłek wynosi 100%.")
  }
  if (!ev.anchorDate) return none("Brak daty porodu lub przyjęcia dziecka — nie można ustalić terminu wniosku.")
  ctx.assume("A-23")
  const deadline = deadlineAfter(ev.anchorDate, ctx.p.rates.flatApplicationDays)
  const filed = plan.flatRateApplicationDate
  if (filed && filed > deadline) {
    ctx.warn({
      code: "FLAT_APPLICATION_LATE",
      severity: "RISK",
      parent: "MOTHER",
      text: `Wniosek o 81,5% złożony ${filed}, po terminie ${deadline} (21 dni od ${ev.adoption ? "przyjęcia dziecka" : "porodu"}) — przysługuje wariant 100% + 70%.`,
      ruleId: "LR-130A",
    })
    return { requested, applies: false, deadline, firstYearFallback: false, note: "Wniosek po terminie." }
  }
  if (!filed && ctx.asOf > deadline && !ev.estimated) {
    ctx.warn({
      code: "FLAT_DEADLINE_PASSED",
      severity: "RISK",
      parent: "MOTHER",
      text: `Termin na wniosek o 81,5% minął ${deadline}. Jeśli wniosek nie został złożony, przysługuje wariant 100% + 70%.`,
      ruleId: "LR-130A",
    })
    return { requested, applies: false, deadline, firstYearFallback: false, note: "Termin minął." }
  }
  ctx.warn({
    code: "FLAT_RATE_CONDITIONS",
    severity: "INFO",
    parent: "MOTHER",
    text: `Wariant 81,5% wymaga pisemnego wniosku ${ev.adoption ? "ubezpieczonego" : "matki"} najpóźniej ${deadline} (21 dni od ${ev.adoption ? "przyjęcia dziecka" : "porodu"}) o zasiłek za urlop macierzyński i rodzicielski w pełnym wymiarze. Dziewięć tygodni drugiego rodzica zawsze wynosi 70%.`,
    ruleId: "LR-130A",
  })
  const firstYearFallback = !ev.adoption && !schedule.parentalInFirstYear
  if (firstYearFallback) {
    ctx.use("LR-130C")
    ctx.warn({
      code: "FLAT_NO_PARENTAL_IN_FIRST_YEAR",
      severity: "WARNING",
      parent: "MOTHER",
      text: `Plan nie przewiduje ani jednego dnia urlopu rodzicielskiego w pierwszym roku życia dziecka (do ${schedule.firstYearLastDay}). Wtedy zasiłek za urlop rodzicielski wynosi 70%, a zasiłek za urlop macierzyński można na wniosek wyrównać do 100% (U art. 31 ust. 3g, ust. 4).`,
      ruleId: "LR-130C",
    })
  }
  return { requested, applies: true, deadline, firstYearFallback, note: filed ? null : `Wniosek trzeba złożyć najpóźniej ${deadline}.` }
}

interface RateDecision {
  rate: string
  ruleIds: RuleId[]
  note?: string
}

function rateFor(ctx: EvaluationContext, period: ScheduledPeriod, flat: FlatRateStatus): RateDecision {
  const r = ctx.p.rates
  const flatOn = flat.applies
  switch (period.rateKey) {
    case "PRE_BIRTH":
      if (flatOn) ctx.assume("A-26")
      return { rate: r.preBirth, ruleIds: ["LR-130D"] }
    case "MATERNITY":
      return flatOn ? { rate: r.flat, ruleIds: ["LR-130A"] } : { rate: r.maternity, ruleIds: ["LR-130"] }
    case "MATERNITY_TAKEOVER":
      if (flatOn) {
        ctx.assume("A-27")
        return { rate: r.flat, ruleIds: ["LR-130A"], note: "Stawka jak za urlop macierzyński matki (A-27)." }
      }
      return { rate: r.maternity, ruleIds: ["LR-130"] }
    case "MATERNITY_TERMS":
      return flatOn ? { rate: r.flat, ruleIds: ["LR-130A"] } : { rate: r.maternityTerms, ruleIds: ["LR-130"] }
    case "SUPPLEMENTARY":
      return { rate: r.supplementary, ruleIds: ["LR-130"] }
    case "PATERNITY":
      return { rate: r.paternity, ruleIds: ["LR-130"] }
    case "MATERNITY_EQUIVALENT":
      return { rate: r.maternityEquivalent, ruleIds: ["LR-121A"] }
    case "PARENTAL_RESERVED_OTHER":
      return { rate: r.otherParentReserved, ruleIds: ["LR-130B"], note: flatOn ? "9 tygodni drugiego rodzica zawsze 70% (U art. 31 ust. 3f)." : undefined }
    case "PARENTAL_OWN":
    case "PARENTAL_SHARED": {
      const applicant = period.parent === "MOTHER"
      if (flatOn && !flat.firstYearFallback && (applicant || period.rateKey === "PARENTAL_SHARED")) {
        return { rate: r.flat, ruleIds: ["LR-130A"], note: period.rateKey === "PARENTAL_SHARED" ? "Część dzielona z matką zachowuje 81,5% (U art. 30a ust. 3)." : undefined }
      }
      if (flatOn && flat.firstYearFallback) return { rate: r.parental, ruleIds: ["LR-130C"] }
      return { rate: r.parental, ruleIds: ["LR-130"] }
    }
  }
}

export interface AmountResult {
  lines: CalculationLine[]
  status: Record<ParentRole, AmountStatus>
}

const MATERNITY_FAMILY = new Set(["MATERNITY", "MATERNITY_TERMS", "SUPPLEMENTARY_MATERNITY", "PARENTAL", "PATERNITY"])

function money(value: Ratio): { exact: string; grosze: number } {
  return { exact: value.toFraction(), grosze: groszeToNumber(value.round("HALF_UP")) }
}

export function calculateLines(
  ctx: EvaluationContext,
  schedule: Schedule,
  flat: FlatRateStatus,
  bases: Map<ParentRole, ComputedBasis>
): AmountResult {
  ctx.use("LR-MONEY", "LR-ROUND")
  ctx.assume("A-03", "A-20")
  const lines: CalculationLine[] = []
  const status: Record<ParentRole, AmountStatus> = { MOTHER: "NOT_APPLICABLE", FATHER: "NOT_APPLICABLE" }
  const divisor = ctx.p.basis.dailyDivisor
  const parentalBenefit = ctx.p.external.parentalBenefitAmountGrosze
  let floorMissing = false

  const mark = (parent: ParentRole, next: AmountStatus) => {
    const order: AmountStatus[] = ["NOT_APPLICABLE", "CALCULATED", "CALCULATED_UPPER_BOUND", "CALCULATED_LOWER_BOUND", "NOT_CALCULATED", "BASIS_UNKNOWN"]
    if (order.indexOf(next) > order.indexOf(status[parent])) status[parent] = next
  }

  for (const period of schedule.periods) {
    const decision = rateFor(ctx, period, flat)
    ctx.use(...decision.ruleIds)
    const rate = ratio(decision.rate)
    const paid = ONE.sub(period.work)
    const basis = bases.get(period.parent)
    const monthly = basis?.monthly ?? null
    const ruleIds: RuleId[] = [...decision.ruleIds, "LR-MONEY", "LR-ROUND"]
    if (!period.work.isZero()) ruleIds.push("LR-131")
    let amount: { exact: string; grosze: number } | null = null
    let formula = `podstawa × ${rate.toPercent()}${period.work.isZero() ? "" : ` × (1 − ${period.work.toFixed(2)})`} × ${period.days} dni / ${divisor}`
    if (monthly) {
      const value = monthly.mul(rate).mul(paid).mul(period.days).div(divisor)
      amount = money(value)
      formula = `${formatGrosze(monthly.round("HALF_UP"))} × ${rate.toPercent()}${period.work.isZero() ? "" : ` × ${paid.toFixed(2)}`} × ${period.days} / ${divisor} = ${value.toFixed(4)} gr → ${formatGrosze(amount.grosze)}`
      let lineStatus: AmountStatus = basis?.minimumBasisApplied === "NOT_CHECKED" ? "CALCULATED_LOWER_BOUND" : "CALCULATED"
      if (MATERNITY_FAMILY.has(period.benefit) && parentalBenefit === null) {
        lineStatus = "CALCULATED_LOWER_BOUND"
        floorMissing = true
      }
      mark(period.parent, lineStatus)
    } else {
      mark(period.parent, "BASIS_UNKNOWN")
    }
    lines.push({
      id: period.id,
      parent: period.parent,
      benefit: period.benefit,
      label: period.label,
      period: { start: period.start, end: period.end },
      days: period.days,
      rate: decision.rate,
      ratePercent: rate.toPercent(),
      paidFraction: paid.toFixed(2),
      monthlyBasisGrosze: basis?.monthlyBasisGrosze ?? null,
      exactAmount: amount?.exact ?? null,
      amountGrosze: amount?.grosze ?? null,
      formula,
      ruleIds,
      note: decision.note,
    })

    // U art. 31 ust. 3a–3c: raise the monthly amount to the świadczenie rodzicielskie.
    if (monthly && parentalBenefit !== null && MATERNITY_FAMILY.has(period.benefit)) {
      const monthlyAmount = monthly.mul(rate)
      const floor = ratio(parentalBenefit)
      if (monthlyAmount.lt(floor)) {
        ctx.use("LR-132")
        ctx.assume("A-34")
        if (!period.work.isZero()) {
          ctx.review("Podwyższenie do kwoty świadczenia rodzicielskiego przy łączeniu urlopu z pracą — źródła nie określają kolejności obniżenia i podwyższenia.")
        }
        const topUp = floor.sub(monthlyAmount).mul(period.days).div(divisor)
        const value = money(topUp)
        lines.push({
          id: `${period.id}-floor`,
          parent: period.parent,
          benefit: period.benefit,
          label: "Podwyższenie do kwoty świadczenia rodzicielskiego",
          period: { start: period.start, end: period.end },
          days: period.days,
          rate: "1",
          ratePercent: "100%",
          paidFraction: "1.00",
          monthlyBasisGrosze: basis?.monthlyBasisGrosze ?? null,
          exactAmount: value.exact,
          amountGrosze: value.grosze,
          formula: `(${formatGrosze(parentalBenefit)} − ${formatGrosze(monthlyAmount.round("HALF_UP"))}) × ${period.days} / ${divisor} → ${formatGrosze(value.grosze)}`,
          ruleIds: ["LR-132", "LR-ROUND"],
        })
      }
    }
  }

  if (floorMissing) {
    ctx.use("LR-132")
    ctx.warn({
      code: "PARENTAL_BENEFIT_FLOOR_NOT_APPLIED",
      severity: "INFO",
      text: "Zasiłek macierzyński niższy od kwoty świadczenia rodzicielskiego podwyższa się do tej kwoty (U art. 31 ust. 3a). Tej kwoty nie ma w udostępnionych źródłach (Q-29), więc wynik może być zaniżony dla niskich podstaw.",
      ruleId: "LR-132",
    })
  }

  // U art. 31 ust. 4 — one-off top-up of maternity to 100% when no parental day falls in the first year.
  if (flat.applies && flat.firstYearFallback) {
    for (const line of [...lines]) {
      if ((line.benefit === "MATERNITY" || line.benefit === "MATERNITY_TERMS") && line.rate === ctx.p.rates.flat) {
        const basis = bases.get(line.parent)?.monthly
        const diff = ONE.sub(ctx.p.rates.flat)
        const value = basis ? money(basis.mul(diff).mul(line.days).div(divisor)) : null
        lines.push({
          id: `${line.id}-topup`,
          parent: line.parent,
          benefit: line.benefit,
          label: "Jednorazowe wyrównanie zasiłku macierzyńskiego do 100% (na wniosek)",
          period: line.period,
          days: line.days,
          rate: diff.toFixed(3),
          ratePercent: diff.toPercent(),
          paidFraction: "1.00",
          monthlyBasisGrosze: line.monthlyBasisGrosze,
          exactAmount: value?.exact ?? null,
          amountGrosze: value?.grosze ?? null,
          formula: basis ? `podstawa × 18,5% × ${line.days} / ${divisor} → ${formatGrosze(value!.grosze)}` : "brak podstawy",
          ruleIds: ["LR-130C", "LR-ROUND"],
          note: "Wymaga wniosku (U art. 31 ust. 4).",
        })
      }
    }
  }

  return { lines, status }
}

export function sumGrosze(lines: readonly CalculationLine[]): number | null {
  let total = 0n
  for (const line of lines) {
    if (line.amountGrosze === null) return null
    total += BigInt(line.amountGrosze)
  }
  return groszeToNumber(total)
}
