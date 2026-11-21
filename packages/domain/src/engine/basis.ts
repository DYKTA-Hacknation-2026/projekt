import { monthStart, precedingMonths } from "./calendar"
import type { EvaluationContext } from "./context"
import { ONE, Ratio, formatGrosze, groszeToNumber, ratio, sumRatios } from "./decimal"
import type { RuleId } from "./sources"
import type { BasisResult, BenefitType, ParentInput } from "./types"

export interface ComputedBasis extends BasisResult {
  /** Monthly basis in grosze as an exact value (already rounded to grosze). */
  monthly: Ratio | null
}

function unknown(parent: ParentInput, steps: string[], ruleIds: RuleId[], status: BasisResult["status"] = "UNKNOWN"): ComputedBasis {
  return {
    parent: parent.role,
    status,
    method: parent.basis?.method ?? null,
    monthlyBasisGrosze: null,
    dailyBasis: null,
    steps,
    minimumBasisApplied: "NOT_CHECKED",
    ruleIds,
    monthly: null,
  }
}

const formatRatioPln = (value: Ratio) => formatGrosze(value.round("HALF_UP"))

/**
 * Benefit basis (podstawa wymiaru zasiłku) for one parent, as of the day the
 * right arises. Employees: U art. 36–38, 40, 45; non-employees: art. 48–50.
 * Maternity-type benefits use the same rules (art. 47, 52).
 */
export function computeBasis(
  ctx: EvaluationContext,
  parent: ParentInput,
  rightDate: string,
  affects: BenefitType[]
): ComputedBasis {
  const employee = parent.insurance?.title === "EMPLOYMENT"
  const deduction = ratio(ctx.p.basis.contributionDeduction)
  const keep = ONE.sub(deduction)
  const ruleIds: RuleId[] = ["LR-119", employee ? "LR-112" : "LR-116"]
  ctx.use(...ruleIds)
  const steps: string[] = []
  const input = parent.basis

  if (!input) {
    ctx.need({
      key: "basis",
      parent: parent.role,
      question: employee
        ? "Jakie było twoje przeciętne miesięczne wynagrodzenie brutto z 12 miesięcy przed miesiącem porodu (albo podstawa wymiaru z zaświadczenia Z-3)?"
        : "Od jakiej miesięcznej podstawy opłacasz składkę chorobową (albo jaka jest podstawa wymiaru z zaświadczenia płatnika)?",
      why: "Bez podstawy wymiaru nie wyliczymy kwoty zasiłku — nie podajemy kwot szacowanych bez danych.",
      affects,
    })
    steps.push("Brak danych o wynagrodzeniu lub przychodzie — kwoty nie zostaną wyliczone.")
    return unknown(parent, steps, ruleIds)
  }

  let monthly: Ratio
  let status: BasisResult["status"] = "CALCULATED"

  switch (input.method) {
    case "KNOWN_BASIS": {
      if (input.monthlyBasisGrosze <= 0) {
        steps.push("Podana podstawa wymiaru musi być dodatnia.")
        return unknown(parent, steps, ruleIds, "INCONSISTENT")
      }
      monthly = ratio(input.monthlyBasisGrosze)
      status = "PROVIDED"
      steps.push(`Podstawa wymiaru podana wprost: ${formatGrosze(input.monthlyBasisGrosze)} miesięcznie.`)
      if (input.origin === "PREVIOUS_BENEFIT") {
        steps.push("Podstawy nie ustala się na nowo, jeśli przerwa między zasiłkami była krótsza niż miesiąc kalendarzowy (U art. 43).")
      }
      break
    }
    case "GROSS_MONTHLY": {
      if (input.grossMonthlyGrosze <= 0) {
        steps.push("Kwota brutto musi być dodatnia.")
        return unknown(parent, steps, ruleIds, "INCONSISTENT")
      }
      const exact = ratio(input.grossMonthlyGrosze).mul(keep)
      monthly = ratio(exact.round(ctx.p.money.basisRounding))
      steps.push(
        employee
          ? `Wynagrodzenie brutto ${formatGrosze(input.grossMonthlyGrosze)} − 13,71% składek pracownika = ${formatRatioPln(monthly)} (dokładnie ${exact.toFixed(4)} gr, zaokrąglone do grosza).`
          : `Podstawa składki chorobowej ${formatGrosze(input.grossMonthlyGrosze)} − 13,71% (U art. 3 pkt 4) = ${formatRatioPln(monthly)}.`
      )
      steps.push("Przyjęto, że ta kwota jest przeciętną z 12 miesięcy kalendarzowych przed miesiącem powstania prawa.")
      if (employee) ctx.assume("A-33")
      ctx.assume("A-20")
      break
    }
    case "MONTHLY_HISTORY": {
      const window = new Set(precedingMonths(rightDate, ctx.p.basis.referenceMonths))
      const seen = new Set<string>()
      const startMonth = parent.insurance?.startDate
      const firstFullMonth =
        startMonth && startMonth !== monthStart(startMonth) ? nextMonthKey(startMonth) : startMonth?.slice(0, 7)
      const inWindow = input.months.filter((month) => {
        if (seen.has(month.month)) return false
        seen.add(month.month)
        if (!window.has(month.month)) {
          steps.push(`Pominięto ${month.month}: poza 12 miesiącami poprzedzającymi miesiąc powstania prawa.`)
          return false
        }
        if (firstFullMonth && month.month < firstFullMonth) {
          steps.push(`Pominięto ${month.month}: nie jest pełnym miesiącem kalendarzowym ubezpieczenia (U art. 36 ust. 2).`)
          return false
        }
        return true
      })
      ctx.assume("A-32", "A-20")
      if (seen.size !== input.months.length) {
        steps.push("Ten sam miesiąc podano więcej niż raz.")
        return unknown(parent, steps, ruleIds, "INCONSISTENT")
      }
      if (inWindow.length === 0) {
        steps.push("Brak pełnych miesięcy ubezpieczenia w okresie odniesienia. Przy ubezpieczeniu krótszym niż miesiąc podstawą jest wynagrodzenie (przychód) za pełny miesiąc z umowy (U art. 37, 49).")
        ctx.use("LR-113")
        ctx.need({
          key: "basis.contractualMonthly",
          parent: parent.role,
          question: "Jakie jest miesięczne wynagrodzenie (przychód) określone w umowie?",
          why: "Przy ubezpieczeniu krótszym niż pełny miesiąc podstawą jest kwota za pełny miesiąc (U art. 37, 49).",
          affects,
        })
        return unknown(parent, steps, ruleIds)
      }
      const full = inWindow.filter((month) => month.workedAtLeastHalf !== false)
      const used = full.length > 0 ? full : inWindow
      if (full.length === 0) {
        steps.push("We wszystkich miesiącach przepracowano mniej niż połowę czasu — przyjęto wszystkie miesiące po uzupełnieniu (U art. 38 ust. 3, art. 50 ust. 2).")
      }
      for (const month of inWindow) {
        if (!used.includes(month)) {
          steps.push(`Wyłączono ${month.month}: przepracowano mniej niż połowę obowiązującego czasu (U art. ${employee ? "38 ust. 2 pkt 1" : "50 ust. 1 pkt 1"}).`)
        }
      }
      let needsSupplement = false
      const amounts = used.map((month) => {
        const base = month.supplementedGrossGrosze ?? month.grossGrosze
        if (month.supplementedGrossGrosze === undefined && month.workedAtLeastHalf === false) needsSupplement = true
        return ratio(base).mul(keep)
      })
      if (needsSupplement) {
        steps.push("Część miesięcy wymaga uzupełnienia według U art. 37 ust. 2 — podaj kwoty po uzupełnieniu; przyjęto kwoty podane.")
      }
      const total = sumRatios(amounts)
      const average = total.div(used.length)
      monthly = ratio(average.round(ctx.p.money.basisRounding))
      steps.push(
        `Suma ${used.length} mies. po odliczeniu 13,71%: ${total.toFixed(2)} gr; średnia = ${average.toFixed(4)} gr → ${formatRatioPln(monthly)} (U art. 38 ust. 1).`
      )
      if (employee) ctx.assume("A-33")
      break
    }
    case "DECLARED_SHORT_INSURANCE": {
      ctx.use("LR-117")
      ctx.assume("A-20")
      const window = new Set(precedingMonths(rightDate, ctx.p.basis.referenceMonths))
      const months = input.months.filter((month) => window.has(month.month))
      if (months.length === 0) {
        steps.push("Brak pełnych miesięcy ubezpieczenia w okresie odniesienia (U art. 48a).")
        return unknown(parent, steps, ruleIds)
      }
      const lowest = sumRatios(months.map((month) => ratio(month.lowestBasisGrosze).mul(keep))).div(months.length)
      const excess = sumRatios(
        months.map((month) => ratio(Math.max(0, month.declaredBasisGrosze - month.lowestBasisGrosze)).mul(keep))
      ).div(months.length)
      const part2 = excess.div(ctx.p.basis.referenceMonths).mul(months.length)
      const exact = lowest.add(part2)
      monthly = ratio(exact.round(ctx.p.money.basisRounding))
      steps.push(
        `U art. 48a: średnia najniższa podstawa po odliczeniu ${lowest.toFixed(2)} gr + 1/12 × średnia nadwyżka ${excess.toFixed(2)} gr × ${months.length} mies. = ${exact.toFixed(4)} gr → ${formatRatioPln(monthly)}.`
      )
      break
    }
  }

  let minimumBasisApplied: BasisResult["minimumBasisApplied"] = "NOT_APPLICABLE"
  if (employee && status !== "PROVIDED") {
    ctx.use("LR-115")
    const fraction = parent.insurance?.workingTimeFraction
    const minimumWage = ctx.p.external.minimumWageGrosze
    if (fraction === undefined) {
      minimumBasisApplied = "NOT_CHECKED"
      steps.push("Nie wiadomo, czy to pełny etat — nie sprawdzono minimalnej podstawy (U art. 45).")
    } else if (!ratio(fraction).eq(ONE)) {
      minimumBasisApplied = "NOT_APPLICABLE"
      steps.push("Minimalna podstawa (U art. 45) dotyczy pracy w pełnym wymiarze czasu — nie stosuje się.")
    } else if (minimumWage === null) {
      minimumBasisApplied = "NOT_CHECKED"
      steps.push("Minimalnej podstawy (minimalne wynagrodzenie − 13,71%, U art. 45) nie sprawdzono: kwoty minimalnego wynagrodzenia nie ma w źródłach (Q-29).")
    } else {
      const floor = ratio(ratio(minimumWage).mul(keep).round(ctx.p.money.basisRounding))
      if (monthly.lt(floor)) {
        steps.push(`Podstawa niższa od minimalnej (${formatRatioPln(floor)}) — podwyższona do minimalnej (U art. 45).`)
        monthly = floor
        minimumBasisApplied = "APPLIED"
      } else {
        minimumBasisApplied = "NOT_NEEDED"
      }
    }
  }

  const daily = monthly.div(ctx.p.basis.dailyDivisor)
  steps.push(`Podstawa dzienna = 1/30 podstawy miesięcznej = ${daily.toFixed(4)} gr (U art. 36 ust. 3) — bez zaokrąglania w obliczeniach.`)

  if (parent.contributionBasisRaisedDuringPregnancy) {
    ctx.warn({
      code: "BASIS_RAISED_IN_PREGNANCY",
      severity: "RISK",
      parent: parent.role,
      text: "Podwyższenie podstawy wymiaru składek w ciąży wyłącznie po to, by uzyskać wyższy zasiłek, może skończyć się decyzją ZUS ustalającą niższą podstawę.",
      ruleId: "LR-71",
    })
  }

  return {
    parent: parent.role,
    status,
    method: input.method,
    monthlyBasisGrosze: groszeToNumber(monthly.round("HALF_UP")),
    dailyBasis: daily.toFixed(4),
    steps,
    minimumBasisApplied,
    ruleIds: [...ruleIds, ...(employee ? (["LR-115"] as RuleId[]) : [])],
    monthly,
  }
}

function nextMonthKey(date: string): string {
  const [year, month] = date.split("-").map(Number) as [number, number]
  const nextYear = month === 12 ? year + 1 : year
  const nextMonth = month === 12 ? 1 : month + 1
  return `${nextYear}-${String(nextMonth).padStart(2, "0")}`
}
