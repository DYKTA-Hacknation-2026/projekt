import { addDays, ageInYears, endOfYearChildTurns, lastDayBeforeAge, periodDays } from "./calendar"
import type { EvaluationContext } from "./context"
import type { FamilyEventInput } from "./types"

/** Children born in one birth (or taken in together); 5 means "five or more" (KP art. 180 § 1 pkt 5). */
export function childrenKey(count: number | undefined): 1 | 2 | 3 | 4 | 5 {
  const value = Math.max(1, Math.round(count ?? 1))
  return (value >= 5 ? 5 : value) as 1 | 2 | 3 | 4 | 5
}

export function maternityWeeks(ctx: EvaluationContext, count: number): number {
  ctx.use("LR-123")
  return ctx.p.maternity.weeksByChildren[childrenKey(count)]
}

export function parentalPoolWeeks(
  ctx: EvaluationContext,
  count: number,
  zaZyciem: boolean,
  guaranteeCase: boolean
): number {
  ctx.use("LR-127")
  const pools = ctx.p.parental
  if (guaranteeCase) {
    ctx.use("LR-129A")
    return zaZyciem ? pools.guaranteeCasePoolWeeks.zaZyciem : pools.guaranteeCasePoolWeeks.standard
  }
  const multiple = childrenKey(count) > 1
  if (zaZyciem) return multiple ? pools.poolWeeks.zaZyciemMultiple : pools.poolWeeks.zaZyciemSingle
  return multiple ? pools.poolWeeks.multiple : pools.poolWeeks.single
}

/** KP art. 182¹f § 1, § 1¹ — caps on the parental leave extended by part-time work. */
export function workExtensionCapWeeks(ctx: EvaluationContext, count: number, zaZyciem: boolean): number {
  const caps = ctx.p.parental.workExtensionCapWeeks
  const multiple = childrenKey(count) > 1
  if (zaZyciem) return multiple ? caps.zaZyciemMultiple : caps.zaZyciemSingle
  return multiple ? caps.multiple : caps.single
}

export interface SupplementaryResult {
  status: "NOT_APPLICABLE" | "NEEDS_INPUT" | "NOT_ELIGIBLE" | "ELIGIBLE"
  variant: "A" | "B" | "C" | null
  weeks: number
  hospitalDays: number
  explanation: string
}

/**
 * Uzupełniający urlop macierzyński (KP art. 180²): one week per week of the
 * child's hospital stay within the variant window; stays are summed and a
 * part week rounds up (§ 3). For multiple births, the lowest birth weight and
 * the longest-hospitalised child are used (§ 2). Adoption and foster care:
 * only stays after the child was taken in count (art. 183 § 3¹).
 *
 * Day numbering follows A-21: the birth date is day 1.
 */
export function supplementaryLeave(
  ctx: EvaluationContext,
  event: FamilyEventInput,
  birthDate: string | null
): SupplementaryResult {
  const stays = event.childHospitalStays ?? []
  const none = (explanation: string, status: SupplementaryResult["status"] = "NOT_APPLICABLE"): SupplementaryResult => ({
    status,
    variant: null,
    weeks: 0,
    hospitalDays: 0,
    explanation,
  })
  if (!birthDate || event.stillbirth) return none("Nie dotyczy.")
  if (stays.length === 0) return none("Nie zgłoszono pobytu dziecka w szpitalu.")
  ctx.use("LR-126")
  ctx.assume("A-21")
  const s = ctx.p.supplementary
  const weeks = event.gestationalWeeksCompleted
  const weight = event.lowestBirthWeightGrams

  let variant: "A" | "B" | "C"
  if (weight !== undefined && weight <= s.veryLowWeightMaxGrams) variant = "A"
  else if (weeks === undefined) {
    ctx.need({
      key: "event.gestationalWeeksCompleted",
      question: "W którym tygodniu ciąży urodziło się dziecko (ile pełnych tygodni ciąży)?",
      why: "Wymiar uzupełniającego urlopu macierzyńskiego zależy od tygodnia ciąży i masy urodzeniowej (KP art. 180² § 1).",
      affects: "SUPPLEMENTARY_MATERNITY",
    })
    return none("Brak tygodnia ciąży przy porodzie.", "NEEDS_INPUT")
  } else if (weeks < s.veryEarlyBeforeCompletedWeek) variant = "A"
  else if (weeks < s.pretermBeforeCompletedWeek) {
    if (weight === undefined) {
      ctx.need({
        key: "event.lowestBirthWeightGrams",
        question: "Jaka była masa urodzeniowa dziecka (przy kilkorgu dzieci — najniższa)?",
        why: "Dziecko urodzone między 28. a 37. tygodniem z masą do 1000 g ma dłuższy okres liczenia pobytu w szpitalu (15 zamiast 8 tygodni).",
        affects: "SUPPLEMENTARY_MATERNITY",
      })
      return none("Brak masy urodzeniowej.", "NEEDS_INPUT")
    }
    variant = "B"
  } else variant = "C"

  const windowWeeks = variant === "A" ? s.veryEarlyWindowWeeks : variant === "B" ? s.pretermWindowWeeks : s.termWindowWeeks
  // Day k after birth (A-21) = birthDate + (k − 1).
  const day = (k: number) => addDays(birthDate, k - 1)
  const windowStart = variant === "C" ? day(s.termFirstDayFrom) : day(1)
  const windowEnd = day(windowWeeks * 7)
  const careFrom = event.kind === "ADOPTION" || event.kind === "FOSTER_CARE" ? event.careTakingDate : undefined

  const byChild = new Map<number, Set<string>>()
  for (const stay of stays) {
    const child = stay.child ?? 0
    const days = byChild.get(child) ?? new Set<string>()
    for (let date = stay.start; date <= stay.end; date = addDays(date, 1)) {
      if (careFrom && date < careFrom) continue
      days.add(date)
    }
    byChild.set(child, days)
  }

  let best = 0
  let qualifies = false
  for (const days of byChild.values()) {
    const counted = [...days].filter((date) => date >= windowStart && date <= windowEnd).length
    // Variant C: ≥ 2 consecutive days with the first between day 5 and day 28.
    const childQualifies =
      variant !== "C" ||
      [...days].some(
        (date) => date >= day(s.termFirstDayFrom) && date <= day(s.termFirstDayTo) && days.has(addDays(date, 1))
      )
    if (childQualifies) {
      qualifies = true
      best = Math.max(best, counted)
    }
  }

  if (!qualifies || best === 0) {
    return {
      status: "NOT_ELIGIBLE",
      variant,
      weeks: 0,
      hospitalDays: best,
      explanation:
        variant === "C"
          ? "Przy porodzie po 37. tygodniu potrzebny jest pobyt dziecka w szpitalu przez co najmniej 2 kolejne dni, z pierwszym dniem między 5. a 28. dniem po porodzie."
          : "Brak dni pobytu w szpitalu w okresie liczenia.",
    }
  }

  const resultWeeks = Math.ceil(best / 7)
  const label = {
    A: "przed ukończeniem 28. tygodnia ciąży lub z masą do 1000 g — pobyt do końca 15. tygodnia po porodzie",
    B: "między 28. a 37. tygodniem ciąży, masa powyżej 1000 g — pobyt do końca 8. tygodnia po porodzie",
    C: "po ukończeniu 37. tygodnia ciąży — pobyt od 5. dnia do końca 8. tygodnia po porodzie",
  }[variant]
  return {
    status: "ELIGIBLE",
    variant,
    weeks: resultWeeks,
    hospitalDays: best,
    explanation: `Dziecko urodzone ${label}: ${best} dni w szpitalu w okresie ${windowStart} – ${windowEnd} → ${resultWeeks} tyg. (niepełny tydzień w górę).`,
  }
}

export interface MaternityTermsResult {
  eligibleByAge: boolean | null
  ageAtCareTaking: number | null
  ageCapYears: number
  /** Last day the leave may last because of the age cap (A-22). */
  ageCapLastDay: string | null
  dimensionDays: number
  availableDays: number
  guaranteeCase: boolean
  parentalLastDay: string | null
  explanation: string
}

/** Urlop na warunkach urlopu macierzyńskiego (KP art. 183 § 1–3, § 7) and the parental cap. */
export function maternityTerms(
  ctx: EvaluationContext,
  event: FamilyEventInput,
  start: string | null
): MaternityTermsResult {
  ctx.use("LR-129")
  ctx.assume("A-22", "A-36")
  const t = ctx.p.maternityTerms
  const adoption = event.kind === "ADOPTION"
  const ageCapYears = adoption
    ? t.adoptionMaxChildAgeYears
    : event.schoolDeferred
      ? t.fosterDeferredSchoolMaxChildAgeYears
      : t.fosterMaxChildAgeYears
  const dimensionDays =
    t.weeksByChildren[childrenKey(event.childrenCount)] * 7 -
    Math.max(0, Math.round(event.previouslyUsedMaternityTermsWeeks ?? 0)) * 7
  const dob = event.childBirthDate
  if (!dob || !event.careTakingDate) {
    return {
      eligibleByAge: null,
      ageAtCareTaking: null,
      ageCapYears,
      ageCapLastDay: null,
      dimensionDays,
      availableDays: dimensionDays,
      guaranteeCase: false,
      parentalLastDay: null,
      explanation: "Brak daty urodzenia dziecka lub daty przyjęcia na wychowanie.",
    }
  }
  const age = ageInYears(dob, event.careTakingDate)
  const eligibleByAge = age < ageCapYears
  const ageCapLastDay = lastDayBeforeAge(dob, ageCapYears * 12)
  const from = start ?? event.careTakingDate
  const untilCap = ageCapLastDay >= from ? periodDays({ start: from, end: ageCapLastDay }) : 0
  let availableDays = Math.min(dimensionDays, untilCap)
  let guaranteeCase = false
  if (eligibleByAge && availableDays < t.guaranteedWeeks * 7) {
    guaranteeCase = true
    availableDays = t.guaranteedWeeks * 7
    ctx.use("LR-129A")
    ctx.assume("A-17")
    ctx.warn({
      code: "Q30_GUARANTEE",
      severity: "WARNING",
      text: "Limit wieku dziecka skróciłby urlop poniżej 9 tygodni. Zastosowano gwarantowane 9 tygodni urlopu na warunkach urlopu macierzyńskiego i 38 (62) tygodni rodzicielskiego — to nasza wykładnia KP art. 183 § 3 (Q-30). Potwierdź w ZUS.",
      ruleId: "LR-129A",
    })
    ctx.review("Wymiar urlopu przy dziecku blisko granicy wieku zależy od wykładni KP art. 183 § 3 (Q-30).")
  }
  const parentalLastDay = adoption
    ? lastDayBeforeAge(dob, ageCapYears * 12)
    : endOfYearChildTurns(dob, ctx.p.parental.lastYearChildAge)
  if (!adoption && age >= ctx.p.parental.lastYearChildAge) {
    ctx.unsupported("U-11")
    ctx.review("Urlop rodzicielski rodziny zastępczej dla dziecka, które ukończyło 6 lat — przepisy KP art. 182¹c i art. 183 kolidują (U-11).")
  }
  return {
    eligibleByAge,
    ageAtCareTaking: age,
    ageCapYears,
    ageCapLastDay,
    dimensionDays,
    availableDays,
    guaranteeCase,
    parentalLastDay,
    explanation: eligibleByAge
      ? `Dziecko w wieku ${age} lat przy przyjęciu (limit: do ukończenia ${ageCapYears} lat). Wymiar ${dimensionDays / 7} tyg., do wykorzystania ${availableDays} dni.`
      : `Dziecko ukończyło ${ageCapYears} lat przed przyjęciem — urlop na warunkach urlopu macierzyńskiego nie przysługuje.`,
  }
}
