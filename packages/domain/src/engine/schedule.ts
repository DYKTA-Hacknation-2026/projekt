import {
  addDays,
  addMonths,
  dayAfter,
  dayBefore,
  endOfYearChildTurns,
  lastDayBeforeAge,
  maxDate,
  minDate,
  periodDays,
} from "./calendar"
import type { EvaluationContext } from "./context"
import { ONE, Ratio, ZERO, ratio, ratioFromUserNumber } from "./decimal"
import {
  maternityTerms,
  maternityWeeks,
  parentalPoolWeeks,
  supplementaryLeave,
  workExtensionCapWeeks,
  type MaternityTermsResult,
  type SupplementaryResult,
} from "./leave"
import type { BenefitPeriod, BenefitType, ParentRole, TakeoverReason } from "./types"

export type RateKey =
  | "PRE_BIRTH"
  | "MATERNITY"
  | "MATERNITY_TAKEOVER"
  | "MATERNITY_TERMS"
  | "SUPPLEMENTARY"
  | "PARENTAL_OWN"
  | "PARENTAL_RESERVED_OTHER"
  | "PARENTAL_SHARED"
  | "PATERNITY"
  | "MATERNITY_EQUIVALENT"

export interface ScheduledPeriod extends BenefitPeriod {
  rateKey: RateKey
  work: Ratio
  extension?: boolean
}

export interface DerivedEvent {
  adoption: boolean
  anchorKind: "BIRTH" | "DUE_DATE" | "CARE_TAKING" | "NONE"
  anchorDate: string | null
  estimated: boolean
  /** Birth date (actual or expected) of the child; for adoption the child's date of birth. */
  childBirthDate: string | null
  dueDate: string | null
  children: number
  zaZyciem: boolean
  stillbirth: boolean
  survivors: number
  lastDeath: string | null
}

export interface ScheduleEligibility {
  motherMaternity: boolean
  fatherTakeover: boolean
  parental: Record<ParentRole, boolean>
  employee: Record<ParentRole, boolean>
  paternity: boolean
  supplementary: Record<ParentRole, boolean>
  motherEquivalentFrom: string | null
}

export interface Schedule {
  periods: ScheduledPeriod[]
  maternityDimensionDays: number
  poolWeeks: number
  ownLimitDays: number
  parentalUsedDays: Record<ParentRole, number>
  parentalLastDay: string | null
  firstYearLastDay: string | null
  parentalInFirstYear: boolean
  supplementary: SupplementaryResult
  terms: MaternityTermsResult | null
  maternityEnd: string | null
  paternityDeadline: string | null
  lossCutoff: string | null
}

const weeksText = (days: number) => {
  const weeks = Math.floor(days / 7)
  const rest = days % 7
  return rest === 0 ? `${weeks}` : `${weeks} tyg. ${rest} dn.`
}

function makePeriod(
  ctx: EvaluationContext,
  partial: Omit<ScheduledPeriod, "days" | "weeks" | "work"> & { work?: Ratio }
): ScheduledPeriod | null {
  if (partial.end < partial.start) return null
  const days = periodDays(partial)
  return {
    ...partial,
    work: partial.work ?? ZERO,
    workFraction: partial.work && !partial.work.isZero() ? partial.work.toFixed(2) : undefined,
    days,
    weeks: weeksText(days),
    estimated: partial.estimated,
  }
}

function truncate(period: ScheduledPeriod | null, cutoff: string | null): ScheduledPeriod | null {
  if (!period || !cutoff || period.end <= cutoff) return period
  if (period.start > cutoff) return null
  const end = cutoff
  const days = periodDays({ start: period.start, end })
  return { ...period, end, days, weeks: weeksText(days) }
}

const FATHER_TAKEOVER_LABEL: Record<TakeoverReason, string> = {
  MOTHER_RESIGNS_AFTER_14_WEEKS: "po rezygnacji matki",
  MOTHER_INCAPACITY: "niezdolność matki do samodzielnej egzystencji",
  MOTHER_HOSPITALIZED: "pobyt matki w szpitalu",
  MOTHER_DIED: "zgon matki",
  MOTHER_ABANDONED_CHILD: "porzucenie dziecka przez matkę",
  UNINSURED_MOTHER_DIED: "zgon nieubezpieczonej matki",
  UNINSURED_MOTHER_ABANDONED_CHILD: "porzucenie dziecka przez nieubezpieczoną matkę",
  UNINSURED_MOTHER_INCAPACITY: "niezdolność nieubezpieczonej matki do samodzielnej egzystencji",
  UNINSURED_MOTHER_EMPLOYED: "zatrudnienie nieubezpieczonej matki",
}

export function buildSchedule(ctx: EvaluationContext, ev: DerivedEvent, el: ScheduleEligibility): Schedule {
  const plan = ctx.input.plan ?? {}
  const event = ctx.input.event
  const periods: ScheduledPeriod[] = []
  const estimated = ev.estimated
  const childDob = ev.childBirthDate
  const push = (period: ScheduledPeriod | null) => {
    if (period && period.days > 0) periods.push(period)
  }

  // ---------------------------------------------------------------- loss cut-off
  let lossCutoff: string | null = null
  if (childDob && !ev.adoption && ev.lastDeath && ev.survivors === 0 && !ev.stillbirth) {
    ctx.use("LR-125")
    ctx.assume("A-23")
    const deathBeforeEightWeeks = ev.lastDeath <= addDays(childDob, ctx.p.maternity.lossChildAgeLimitWeeks * 7 - 1)
    if (!deathBeforeEightWeeks) lossCutoff = addDays(ev.lastDeath, ctx.p.maternity.lossMinDaysAfterDeath)
  }

  // ---------------------------------------------------------------- maternity / maternity terms
  let maternityEnd: string | null = null
  let lastMaternityParent: ParentRole | null = null
  let maternityDimensionDays = 0
  let terms: MaternityTermsResult | null = null
  let guaranteeCase = false

  if (ev.adoption) {
    const start = plan.maternityStartDate ?? event.careTakingDate ?? null
    terms = maternityTerms(ctx, event, start)
    guaranteeCase = terms.guaranteeCase
    maternityDimensionDays = terms.availableDays
    if (start && terms.eligibleByAge !== false) {
      if (event.careTakingDate && start > addDays(event.careTakingDate, ctx.p.deadlines.maternityTermsStartMaxDays)) {
        ctx.adjust(`Urlop na warunkach urlopu macierzyńskiego musi się zacząć najpóźniej ${ctx.p.deadlines.maternityTermsStartMaxDays} dni od przyjęcia dziecka (KP art. 183 § 6).`)
      }
      const holder: ParentRole | null = el.motherMaternity ? "MOTHER" : el.fatherTakeover ? "FATHER" : null
      if (holder) {
        const end = addDays(start, maternityDimensionDays - 1)
        push(
          makePeriod(ctx, {
            id: "maternity-terms",
            parent: holder,
            benefit: "MATERNITY_TERMS",
            label: "Zasiłek za okres urlopu na warunkach urlopu macierzyńskiego",
            start,
            end,
            estimated,
            rateKey: "MATERNITY_TERMS",
          })
        )
        maternityEnd = end
        lastMaternityParent = holder
      }
    }
  } else if (ev.anchorDate && childDob) {
    const birth = childDob
    const dimensionWeeks = maternityWeeks(ctx, ev.children)
    maternityDimensionDays = dimensionWeeks * 7
    const maxPre = ctx.p.maternity.maxPreBirthWeeks
    let preWeeks = Math.round(plan.maternityWeeksBeforeBirth ?? 0)
    if (preWeeks < 0 || preWeeks > maxPre) {
      ctx.adjust(`Przed porodem można wykorzystać od 0 do ${maxPre} tygodni urlopu macierzyńskiego (KP art. 180 § 2) — przyjęto ${Math.min(maxPre, Math.max(0, preWeeks))}.`)
      preWeeks = Math.min(maxPre, Math.max(0, preWeeks))
    }
    const reference = ev.dueDate ?? birth
    let start = plan.maternityStartDate ?? addDays(reference, -preWeeks * 7)
    if (ev.dueDate && start < addDays(ev.dueDate, -maxPre * 7)) {
      ctx.adjust(`Urlop macierzyński może się zacząć najwcześniej 6 tygodni przed przewidywaną datą porodu (${addDays(ev.dueDate, -maxPre * 7)}).`)
      start = addDays(ev.dueDate, -maxPre * 7)
    }
    if (start > birth) start = birth
    ctx.assume("A-21")
    let end = addDays(start, maternityDimensionDays - 1)
    const preDays = periodDays({ start, end: birth }) - 1
    if (preDays > 0) ctx.use("LR-130D")
    if (end < addDays(birth, ctx.p.maternity.motherPersonalWeeks * 7 - 1)) {
      ctx.unsupported("U-14")
      ctx.review("Po porodzie zostaje mniej niż 14 tygodni urlopu macierzyńskiego (późny poród po urlopie przed porodem) — przepisy nie rozstrzygają tej sytuacji (Q-26).")
    }

    // Loss of a child (KP art. 180¹).
    if (ev.stillbirth || (ev.lastDeath && ev.survivors === 0 && !lossCutoff)) {
      ctx.use("LR-125")
      const eightWeeks = addDays(birth, ctx.p.maternity.lossWeeksAfterBirth * 7 - 1)
      end = ev.lastDeath && !ev.stillbirth ? maxDate(eightWeeks, addDays(ev.lastDeath, ctx.p.maternity.lossMinDaysAfterDeath)) : eightWeeks
      maternityDimensionDays = periodDays({ start, end })
    } else if (ev.lastDeath && ev.survivors > 0) {
      ctx.use("LR-125")
      const reducedEnd = addDays(start, maternityWeeks(ctx, ev.survivors) * 7 - 1)
      const keep = minDate(end, addDays(ev.lastDeath, ctx.p.maternity.lossMinDaysAfterDeath))
      end = maxDate(reducedEnd, keep)
      maternityDimensionDays = periodDays({ start, end })
    }
    if (event.childPlacedInCareOn && event.childPlacedInCareOn < end) {
      ctx.use("LR-125A")
      ctx.unsupported("U-20")
      end = maxDate(event.childPlacedInCareOn, addDays(birth, ctx.p.maternity.abandonmentMinWeeks * 7 - 1))
    }
    end = lossCutoff ? minDate(end, lossCutoff) : end
    maternityEnd = end

    const takeover = plan.maternityTakeover
    const motherPeriod = (from: string, to: string, id = "maternity") => {
      if (from < birth) {
        push(
          makePeriod(ctx, {
            id: `${id}-pre`,
            parent: "MOTHER",
            benefit: "MATERNITY",
            label: "Zasiłek macierzyński — urlop przed porodem",
            start: from,
            end: minDate(dayBefore(birth), to),
            estimated,
            rateKey: "PRE_BIRTH",
          })
        )
      }
      push(
        makePeriod(ctx, {
          id,
          parent: "MOTHER",
          benefit: "MATERNITY",
          label: "Zasiłek macierzyński — urlop macierzyński",
          start: maxDate(from, birth),
          end: to,
          estimated,
          rateKey: "MATERNITY",
        })
      )
    }
    const fatherPeriod = (from: string, to: string, reason: TakeoverReason) => {
      push(
        makePeriod(ctx, {
          id: "maternity-father",
          parent: "FATHER",
          benefit: "MATERNITY",
          label: `Zasiłek macierzyński ojca — część urlopu macierzyńskiego (${FATHER_TAKEOVER_LABEL[reason]})`,
          start: from,
          end: to,
          estimated,
          rateKey: "MATERNITY_TAKEOVER",
        })
      )
    }

    if (!takeover) {
      if (el.motherMaternity) {
        motherPeriod(start, end)
        lastMaternityParent = "MOTHER"
      }
    } else {
      ctx.use("LR-123A", "LR-124")
      const reason = takeover.reason
      const uninsuredCase = reason.startsWith("UNINSURED_")
      const minWeeks =
        reason === "MOTHER_RESIGNS_AFTER_14_WEEKS" ? ctx.p.maternity.motherPersonalWeeks : ctx.p.maternity.specialTakeoverMinWeeks
      if (uninsuredCase) {
        if (el.motherMaternity) {
          ctx.adjust("Wybrano przejęcie urlopu po nieubezpieczonej matce, ale matka ma prawo do zasiłku — pominięto przejęcie.")
          motherPeriod(start, end)
          lastMaternityParent = "MOTHER"
        } else if (el.fatherTakeover) {
          const mother = ctx.parent("MOTHER")
          const eventDay =
            reason === "UNINSURED_MOTHER_DIED"
              ? mother?.deathDate
              : reason === "UNINSURED_MOTHER_ABANDONED_CHILD"
                ? mother?.abandonedChildOn
                : reason === "UNINSURED_MOTHER_EMPLOYED"
                  ? mother?.tookEmploymentAtLeastHalfTimeOn && dayBefore(mother.tookEmploymentAtLeastHalfTimeOn)
                  : takeover.fromDate
          if (!eventDay) {
            ctx.need({
              key: "plan.maternityTakeover.fromDate",
              parent: "MOTHER",
              question: "Od kiedy zaistniała okoliczność uzasadniająca przejęcie urlopu przez ojca (zgon, porzucenie, orzeczenie, zatrudnienie matki)?",
              why: "Ojciec ma prawo do części urlopu macierzyńskiego przypadającej po tym dniu (KP art. 180 § 15, § 17).",
              affects: "MATERNITY",
            })
          } else {
            const fatherEnd = addDays(birth, maternityDimensionDays - 1)
            fatherPeriod(maxDate(dayAfter(eventDay), birth), minDate(fatherEnd, end), reason)
            if (reason === "UNINSURED_MOTHER_EMPLOYED") {
              ctx.warn({
                code: "UNINSURED_MOTHER_EMPLOYMENT_LIMIT",
                severity: "INFO",
                parent: "FATHER",
                text: "Zasiłek ojca przysługuje najdłużej do końca zatrudnienia matki (U art. 29 ust. 10).",
                ruleId: "LR-124",
              })
            }
            lastMaternityParent = "FATHER"
          }
        }
      } else if (!el.motherMaternity) {
        ctx.adjust("Przejęcie urlopu macierzyńskiego wymaga, aby matka miała prawo do zasiłku — pominięto przejęcie.")
      } else {
        const mother = ctx.parent("MOTHER")
        let motherUntil: string
        let fatherFrom: string
        let fatherTo = end
        let resumeMother: { from: string; to: string } | null = null
        const minEnd = addDays(birth, minWeeks * 7 - 1)
        switch (reason) {
          case "MOTHER_DIED": {
            const died = mother?.deathDate ?? takeover.fromDate
            if (!died) {
              ctx.need({ key: "mother.deathDate", parent: "MOTHER", question: "Podaj datę zgonu matki.", why: "Ojciec przejmuje część urlopu przypadającą po tym dniu (KP art. 180 § 12).", affects: "MATERNITY" })
              motherUntil = end
              fatherFrom = dayAfter(end)
            } else {
              motherUntil = minDate(died, end)
              fatherFrom = dayAfter(died)
            }
            break
          }
          case "MOTHER_ABANDONED_CHILD": {
            const left = mother?.abandonedChildOn ?? takeover.fromDate ?? minEnd
            motherUntil = maxDate(minDate(left, end), minEnd)
            fatherFrom = dayAfter(motherUntil)
            break
          }
          case "MOTHER_HOSPITALIZED": {
            const stay = mother?.hospitalization
            if (!stay?.start) {
              ctx.need({ key: "mother.hospitalization", parent: "MOTHER", question: "W jakim okresie matka przebywa w szpitalu?", why: "Ojciec przejmuje urlop na czas pobytu matki w szpitalu, po 8 tygodniach urlopu matki (KP art. 180 § 10–11).", affects: "MATERNITY" })
              motherUntil = end
              fatherFrom = dayAfter(end)
            } else {
              fatherFrom = maxDate(stay.start, dayAfter(minEnd))
              fatherTo = minDate(stay.end ?? end, end)
              motherUntil = dayBefore(fatherFrom)
              if (fatherTo < end) resumeMother = { from: dayAfter(fatherTo), to: end }
            }
            break
          }
          default: {
            let weeks = Math.round(takeover.motherWeeksAfterBirth ?? minWeeks)
            if (weeks < minWeeks) {
              ctx.adjust(`Matka musi wykorzystać po porodzie co najmniej ${minWeeks} tygodni urlopu macierzyńskiego przed przejęciem przez ojca (KP art. 180 § ${minWeeks === 14 ? 4 : 6}) — przyjęto ${minWeeks}.`)
              weeks = minWeeks
            }
            if (reason === "MOTHER_INCAPACITY" && !mother?.incapacityForIndependentExistence) {
              ctx.need({ key: "mother.incapacityForIndependentExistence", parent: "MOTHER", question: "Czy matka ma orzeczenie o niezdolności do samodzielnej egzystencji?", why: "Przejęcie po 8 tygodniach wymaga takiego orzeczenia (KP art. 180 § 6).", affects: "MATERNITY" })
            }
            motherUntil = minDate(addDays(birth, weeks * 7 - 1), end)
            fatherFrom = dayAfter(motherUntil)
          }
        }
        motherPeriod(start, motherUntil)
        if (el.fatherTakeover && fatherFrom <= fatherTo) {
          fatherPeriod(fatherFrom, fatherTo, reason)
          lastMaternityParent = "FATHER"
        } else if (fatherFrom <= fatherTo) {
          ctx.adjust("Ojciec nie ma prawa do zasiłku macierzyńskiego (brak ubezpieczenia chorobowego) — pozostała część urlopu zostaje przy matce.")
          resumeMother = { from: fatherFrom, to: end }
        }
        if (resumeMother) {
          motherPeriod(resumeMother.from, resumeMother.to, "maternity-resumed")
          lastMaternityParent = resumeMother.to === end ? "MOTHER" : lastMaternityParent
        } else if (!lastMaternityParent) {
          lastMaternityParent = "MOTHER"
        }
      }
    }
    if (el.motherEquivalentFrom && el.motherEquivalentFrom < birth) {
      ctx.use("LR-121A")
      ctx.assume("A-30")
      push(
        makePeriod(ctx, {
          id: "maternity-equivalent",
          parent: "MOTHER",
          benefit: "MATERNITY_EQUIVALENT",
          label: "Zasiłek w wysokości zasiłku macierzyńskiego (do dnia porodu)",
          start: el.motherEquivalentFrom,
          end: dayBefore(birth),
          estimated,
          rateKey: "MATERNITY_EQUIVALENT",
        })
      )
    }
  }

  const maternityPeriods = periods.filter((period) => period.benefit === "MATERNITY" || period.benefit === "MATERNITY_TERMS")
  const lastMaternityEnd = maternityPeriods.reduce<string | null>((latest, period) => (!latest || period.end > latest ? period.end : latest), null)

  // ---------------------------------------------------------------- supplementary
  const supplementary = supplementaryLeave(ctx, event, ev.adoption ? childDob : ev.anchorKind === "BIRTH" ? childDob : null)
  let cursor: string | null = lastMaternityEnd ? dayAfter(lastMaternityEnd) : ev.anchorDate
  if (supplementary.status === "ELIGIBLE" && lastMaternityEnd) {
    const holder = plan.supplementaryParent ?? lastMaternityParent ?? "MOTHER"
    if (!el.supplementary[holder]) {
      ctx.adjust("Rodzic wskazany do uzupełniającego urlopu macierzyńskiego nie ma prawa do zasiłku — pominięto ten okres.")
    } else {
      if (!el.employee[holder]) {
        ctx.assume("A-19")
        ctx.warn({
          code: "Q32_SUPPLEMENTARY_NON_EMPLOYEE",
          severity: "INFO",
          parent: holder,
          text: "Poradnik ZUS opisuje uzupełniający urlop macierzyński tylko dla pracowników; ustawa (art. 29a ust. 1) i R1316 § 26 przewidują zasiłek także dla innych ubezpieczonych (Q-32).",
          ruleId: "LR-126",
        })
      }
      const start = dayAfter(lastMaternityEnd)
      const period = truncate(
        makePeriod(ctx, {
          id: "supplementary",
          parent: holder,
          benefit: "SUPPLEMENTARY_MATERNITY",
          label: "Zasiłek za okres uzupełniającego urlopu macierzyńskiego",
          start,
          end: addDays(start, supplementary.weeks * 7 - 1),
          estimated,
          rateKey: "SUPPLEMENTARY",
        }),
        lossCutoff
      )
      push(period)
      if (period) cursor = dayAfter(period.end)
    }
  }

  // ---------------------------------------------------------------- parental
  const noChild = ev.stillbirth || (ev.lastDeath !== null && ev.survivors === 0 && !lossCutoff)
  const poolWeeks = noChild ? 0 : parentalPoolWeeks(ctx, ev.children, ev.zaZyciem, guaranteeCase)
  const reserved = ctx.p.parental.nonTransferableWeeks
  const previouslyUsed = ev.adoption ? Math.max(0, Math.round(event.previouslyUsedParentalWeeks ?? 0)) * 7 : 0
  const poolDays = Math.max(0, poolWeeks * 7 - previouslyUsed)
  const ownLimitDays = Math.max(0, (poolWeeks - reserved) * 7 - previouslyUsed)
  const capDays = workExtensionCapWeeks(ctx, ev.children, ev.zaZyciem) * 7
  const parentalLastDay = ev.adoption
    ? (terms?.parentalLastDay ?? null)
    : childDob
      ? endOfYearChildTurns(childDob, ctx.p.parental.lastYearChildAge)
      : null
  const firstYearLastDay = childDob && !ev.adoption ? lastDayBeforeAge(childDob, 12) : null
  const used: Record<ParentRole, number> = { MOTHER: 0, FATHER: 0 }
  let totalBase = 0
  let totalExtension = 0
  let parts = 0
  let parentalInFirstYear = false
  const maxWork = ratio(ctx.p.parental.maxWorkFraction)

  if (poolWeeks > 0) {
    ctx.assume("A-25", "A-28")
    const primary: ParentRole | null = el.parental.MOTHER ? "MOTHER" : el.parental.FATHER ? "FATHER" : null
    const segments =
      plan.parentalSegments ?? (primary ? [{ parent: primary, weeks: ownLimitDays / 7 }] : [])
    for (const [index, segment] of segments.entries()) {
      const who = segment.parent
      if (!el.parental[who]) {
        ctx.adjust(`${who === "MOTHER" ? "Matka" : "Ojciec"} nie ma prawa do zasiłku za urlop rodzicielski — pominięto część ${index + 1}.`)
        continue
      }
      if (parts >= ctx.p.parental.maxParts) {
        ctx.adjust(`Urlop rodzicielski można podzielić najwyżej na ${ctx.p.parental.maxParts} części (łącznie dla obojga rodziców) — pominięto część ${index + 1}.`)
        continue
      }
      let base = Math.max(0, Math.round(segment.weeks * 7 + (segment.days ?? 0)))
      const ownLeft = ownLimitDays - used[who]
      const poolLeft = poolDays - totalBase
      if (base > ownLeft || base > poolLeft) {
        const allowed = Math.max(0, Math.min(ownLeft, poolLeft))
        ctx.adjust(
          base > ownLeft
            ? `Jeden rodzic może wykorzystać najwyżej ${ownLimitDays / 7} tygodni urlopu rodzicielskiego — ${reserved} tygodni jest zarezerwowanych dla drugiego rodzica i nie można ich przenieść (KP art. 182¹a § 4). Skrócono część ${index + 1} do ${allowed} dni.`
            : `Łączny wymiar urlopu rodzicielskiego obojga rodziców to ${poolWeeks} tygodni (KP art. 182¹a § 1–3, § 6) — skrócono część ${index + 1} do ${allowed} dni.`
        )
        base = allowed
      }
      if (base === 0) continue
      let work = segment.workFraction !== undefined ? ratioFromUserNumber(segment.workFraction) : ZERO
      if (work.isNegative()) work = ZERO
      if (work.gt(maxWork)) {
        ctx.adjust(`Wymiar pracy w czasie urlopu rodzicielskiego może wynosić najwyżej połowę etatu (KP art. 182¹e § 1) — przyjęto ${maxWork.toFixed(1)}.`)
        work = maxWork
      }
      if (!work.isZero() && !el.employee[who]) {
        ctx.adjust("Łączenie urlopu rodzicielskiego z pracą u pracodawcy dotyczy pracowników (KP art. 182¹e) — pominięto wymiar pracy dla rodzica, który nie jest pracownikiem.")
        work = ZERO
      }
      const start = segment.startDate ?? cursor
      if (!start) continue
      if (parentalLastDay && start > parentalLastDay) {
        ctx.adjust(`Część ${index + 1} urlopu rodzicielskiego zaczyna się po terminie ${parentalLastDay} — pominięto ją.`)
        continue
      }
      let end = addDays(start, base - 1)
      if (parentalLastDay && end > parentalLastDay) {
        ctx.adjust(`Urlop rodzicielski trzeba wykorzystać do ${parentalLastDay} (${event.kind === "ADOPTION" ? "ukończenie przez dziecko 14 lat, KP art. 183 § 4¹" : "koniec roku, w którym dziecko kończy 6 lat, KP art. 182¹c"}) — skrócono część ${index + 1}.`)
        end = parentalLastDay
        base = periodDays({ start, end })
      }
      parts += 1
      const label = (suffix: string) => `Zasiłek za okres urlopu rodzicielskiego — ${who === "MOTHER" ? "matka" : "ojciec"}${suffix}`
      const rateKeyFor = (offsetDays: number): RateKey =>
        who === "FATHER" ? (used.FATHER + offsetDays < reserved * 7 ? "PARENTAL_RESERVED_OTHER" : "PARENTAL_SHARED") : "PARENTAL_OWN"

      // Split the father's segment at the boundary of his reserved nine weeks.
      const pieces: { start: string; end: string; rateKey: RateKey }[] = []
      if (who === "FATHER" && used.FATHER < reserved * 7 && used.FATHER + base > reserved * 7) {
        const reservedPart = reserved * 7 - used.FATHER
        pieces.push({ start, end: addDays(start, reservedPart - 1), rateKey: "PARENTAL_RESERVED_OTHER" })
        pieces.push({ start: addDays(start, reservedPart), end, rateKey: "PARENTAL_SHARED" })
      } else {
        pieces.push({ start, end, rateKey: rateKeyFor(0) })
      }
      for (const [pieceIndex, piece] of pieces.entries()) {
        push(
          truncate(
            makePeriod(ctx, {
              id: `parental-${index + 1}${pieces.length > 1 ? `-${pieceIndex + 1}` : ""}`,
              parent: who,
              benefit: "PARENTAL",
              label: label(
                piece.rateKey === "PARENTAL_RESERVED_OTHER"
                  ? " (część wyłączna, 9 tyg.)"
                  : piece.rateKey === "PARENTAL_SHARED"
                    ? " (część ponad 9 tygodni)"
                    : ""
              ),
              start: piece.start,
              end: piece.end,
              estimated,
              rateKey: piece.rateKey,
              work,
              part: parts,
            }),
            lossCutoff
          )
        )
      }
      used[who] += base
      totalBase += base

      // Proportional extension for part-time work (KP art. 182¹f).
      let extensionEnd = end
      if (!work.isZero()) {
        ctx.use("LR-128", "LR-131")
        ctx.assume("A-35")
        ctx.warn({
          code: "WORK_COMBINATION_NOTICE",
          severity: "INFO",
          parent: who,
          text: "Łączenie urlopu rodzicielskiego z pracą u pracodawcy udzielającego urlopu wymaga wniosku co najmniej 21 dni przed podjęciem pracy. Pracodawca może odmówić ze względu na organizację lub rodzaj pracy (odpowiedź w 7 dni). Zasiłek za ten czas jest proporcjonalnie niższy (U art. 31 ust. 4a).",
          ruleId: "LR-128",
        })
        let extensionWork = segment.extensionWorkFraction !== undefined ? ratioFromUserNumber(segment.extensionWorkFraction) : ZERO
        if (extensionWork.gt(maxWork)) extensionWork = maxWork
        if (extensionWork.isNegative()) extensionWork = ZERO
        let exact: Ratio = ratio(base).mul(work)
        if (!extensionWork.isZero()) exact = exact.div(ONE.sub(extensionWork))
        let extension = Number(exact.floor())
        const capLeft = capDays - totalBase - totalExtension
        if (extension > capLeft) {
          ctx.adjust(`Wydłużony urlop rodzicielski nie może przekroczyć ${capDays / 7} tygodni (KP art. 182¹f § 1) — skrócono wydłużenie.`)
          extension = Math.max(0, capLeft)
        }
        totalExtension += extension
        if (extension > 0) {
          const extStart = dayAfter(end)
          const period = truncate(
            makePeriod(ctx, {
              id: `parental-${parts}-extension`,
              parent: who,
              benefit: "PARENTAL",
              label: `Wydłużenie urlopu rodzicielskiego (praca w części etatu, ${base} dni × ${work.toFixed(2)})`,
              start: extStart,
              end: minDate(addDays(extStart, extension - 1), parentalLastDay ?? addDays(extStart, extension - 1)),
              estimated,
              rateKey: who === "FATHER" && used.FATHER <= reserved * 7 ? "PARENTAL_RESERVED_OTHER" : who === "FATHER" ? "PARENTAL_SHARED" : "PARENTAL_OWN",
              work: extensionWork,
              part: parts,
              extension: true,
            }),
            lossCutoff
          )
          push(period)
          if (period) extensionEnd = period.end
        }
      }
      if (firstYearLastDay && start <= firstYearLastDay) parentalInFirstYear = true
      if (!segment.startDate) cursor = dayAfter(extensionEnd)
    }
  }

  // ---------------------------------------------------------------- paternity
  let paternityDeadline: string | null = null
  if (el.paternity) {
    ctx.use("LR-133")
    const pat = ctx.p.paternity
    if (event.kind === "ADOPTION") {
      ctx.assume("A-22", "A-23")
      // "do upływu 12 miesięcy od dnia uprawomocnienia" ends on the corresponding date (A-23),
      // and never after the day before the child's 14th birthday (A-22).
      paternityDeadline =
        event.adoptionFinalDate && childDob
          ? minDate(
              addMonths(event.adoptionFinalDate, pat.adoptionDeadlineMonths),
              lastDayBeforeAge(childDob, pat.adoptionMaxChildAgeYears * 12)
            )
          : null
    } else if (childDob) {
      ctx.assume("A-22")
      paternityDeadline = lastDayBeforeAge(childDob, pat.deadlineChildAgeMonths)
    }
    const defaultStart = event.kind === "ADOPTION" ? (event.adoptionFinalDate ?? null) : childDob
    let parts = plan.paternity ?? (defaultStart ? [{ days: pat.maxDays }] : [])
    if (parts.length > pat.maxParts) {
      ctx.adjust(`Urlop ojcowski można wykorzystać najwyżej w ${pat.maxParts} częściach (KP art. 182³ § 1¹).`)
      parts = parts.slice(0, pat.maxParts)
    }
    let usedDays = 0
    let patCursor = defaultStart
    for (const [index, part] of parts.entries()) {
      let days = Math.max(0, Math.round(part.days))
      if (parts.length > 1 && days < pat.minPartDays) {
        ctx.adjust(`Przy podziale urlopu ojcowskiego żadna część nie może być krótsza niż tydzień (KP art. 182³ § 1¹) — wydłużono część ${index + 1} do ${pat.minPartDays} dni.`)
        days = pat.minPartDays
      }
      if (usedDays + days > pat.maxDays) {
        ctx.adjust(`Urlop ojcowski wynosi najwyżej ${pat.maxDays} dni (KP art. 182³ § 1); liczba dzieci go nie wydłuża.`)
        days = Math.max(0, pat.maxDays - usedDays)
      }
      const start = part.startDate ?? patCursor
      if (!start || days === 0) continue
      let end = addDays(start, days - 1)
      if (paternityDeadline && end > paternityDeadline) {
        ctx.adjust(`Urlop ojcowski trzeba wykorzystać do ${paternityDeadline}; dni po tym terminie przepadają (KP art. 182³ § 1).`)
        end = paternityDeadline
      }
      const period = makePeriod(ctx, {
        id: `paternity-${index + 1}`,
        parent: "FATHER",
        benefit: "PATERNITY",
        label: "Zasiłek za okres urlopu ojcowskiego",
        start,
        end,
        estimated: estimated && !part.startDate,
        rateKey: "PATERNITY",
        part: index + 1,
      })
      push(period)
      if (period) {
        usedDays += period.days
        patCursor = dayAfter(period.end)
      }
    }
  }

  periods.sort((a, b) => (a.start === b.start ? a.id.localeCompare(b.id) : a.start.localeCompare(b.start)))

  return {
    periods,
    maternityDimensionDays,
    poolWeeks,
    ownLimitDays,
    parentalUsedDays: used,
    parentalLastDay,
    firstYearLastDay,
    parentalInFirstYear,
    supplementary,
    terms,
    maternityEnd,
    paternityDeadline,
    lossCutoff,
  }
}

export type { BenefitType }
