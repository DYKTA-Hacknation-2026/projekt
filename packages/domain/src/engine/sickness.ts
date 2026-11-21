import { addDays, maxDate, periodDays, splitByYear, yearOf } from "./calendar"
import type { ComputedBasis } from "./basis"
import type { EvaluationContext } from "./context"
import { debtGate, insuredOn, payerFor, sicknessCoverage, waitingPeriod } from "./coverage"
import { formatGrosze, groszeToNumber, ratio } from "./decimal"
import type { RuleId } from "./sources"
import type { AmountStatus, BenefitPeriod, CalculationLine, Determination, Reason } from "./types"

export interface SicknessResult {
  determinations: Determination[]
  lines: CalculationLine[]
  periods: BenefitPeriod[]
  amountStatus: AmountStatus
}

const LABELS = {
  SICKNESS_IN_PREGNANCY: "Zasiłek chorobowy w okresie ciąży",
  EMPLOYER_SICK_PAY: "Wynagrodzenie chorobowe od pracodawcy (w ciąży 100%)",
  REHABILITATION: "Świadczenie rehabilitacyjne",
} as const

function reasonOf(ctx: EvaluationContext, ruleId: RuleId, code: string, text: string): Reason {
  ctx.use(ruleId)
  return { ruleId, code, text }
}

/**
 * Sickness in pregnancy for the mother: employer sick pay (KP art. 92),
 * sickness benefit (U art. 4, 7–9, 11) and the rehabilitation benefit
 * (U art. 18–19, information and rate only).
 */
export function assessSickness(ctx: EvaluationContext, basis: ComputedBasis | null): SicknessResult {
  const mother = ctx.parent("MOTHER")
  const leave = ctx.input.sickLeave
  const result: SicknessResult = { determinations: [], lines: [], periods: [], amountStatus: "NOT_APPLICABLE" }
  if (!mother) return result
  const event = ctx.input.event
  if (event.kind === "ADOPTION" || event.kind === "FOSTER_CARE") return result

  const determination = (status: Determination["status"], reasons: Reason[], extra: Partial<Determination> = {}): Determination => ({
    benefit: "SICKNESS_IN_PREGNANCY",
    parent: "MOTHER",
    label: LABELS.SICKNESS_IN_PREGNANCY,
    status,
    reasons,
    conditions: [],
    missingEvidence: [],
    payer: "UNKNOWN",
    ...extra,
  })

  ctx.use("LR-104")
  const title = mother.insurance?.title
  if (!title) {
    ctx.need({
      key: "insurance.title",
      parent: "MOTHER",
      question: "Na jakiej podstawie pracujesz: umowa o pracę, umowa zlecenia, własna działalność, czy nie masz tytułu ubezpieczenia?",
      why: "Od tytułu zależy ubezpieczenie chorobowe i okres wyczekiwania.",
      affects: "SICKNESS_IN_PREGNANCY",
    })
    result.determinations.push(determination("NEEDS_INPUT", [], { missingEvidence: ["insurance.title"] }))
    return result
  }
  const coverage = sicknessCoverage(mother)
  if (coverage === "NONE") {
    result.determinations.push(
      determination("NOT_ELIGIBLE", [reasonOf(ctx, "LR-100", "NO_SICKNESS_INSURANCE", "Zasiłek chorobowy przysługuje tylko osobie objętej ubezpieczeniem chorobowym.")], { payer: "NONE" })
    )
    return result
  }
  if (coverage === undefined) {
    ctx.need({
      key: "insurance.sicknessInsurance",
      parent: "MOTHER",
      question: "Czy opłacasz dobrowolne ubezpieczenie chorobowe w ZUS?",
      why: "Przy zleceniu i działalności zasiłek chorobowy przysługuje tylko z dobrowolnym ubezpieczeniem, po 90 dniach.",
      affects: "SICKNESS_IN_PREGNANCY",
    })
    result.determinations.push(determination("NEEDS_INPUT", [], { missingEvidence: ["insurance.sicknessInsurance"] }))
    return result
  }

  const waiting = waitingPeriod(ctx, mother)
  const reasons: Reason[] = [
    reasonOf(
      ctx,
      waiting.dayOne ? "LR-101" : "LR-100",
      "WAITING_PERIOD",
      waiting.dayOne
        ? "Prawo do zasiłku chorobowego od pierwszego dnia ubezpieczenia (U art. 4 ust. 3)."
        : `Okres wyczekiwania: ${waiting.waitingDays} dni ${coverage === "COMPULSORY" ? "obowiązkowego" : "dobrowolnego"} ubezpieczenia${waiting.priorDaysCounted > 0 ? `, z czego ${waiting.priorDaysCounted} dni z poprzedniego ubezpieczenia (przerwa do 30 dni)` : ""}${waiting.eligibleFrom ? `; prawo od ${waiting.eligibleFrom}` : ""}.`
    ),
  ]

  if (!leave) {
    // No sick leave yet: state the right as of today.
    let status: Determination["status"] = "NEEDS_INPUT"
    const conditions: string[] = ["Niezdolność do pracy w ciąży potwierdzona zwolnieniem e-ZLA z kodem „B”."]
    if (waiting.eligibleFrom) {
      status = ctx.asOf >= waiting.eligibleFrom ? "ELIGIBLE" : "CONDITIONAL"
      if (status === "CONDITIONAL") conditions.push(`Zasiłek przysługuje za niezdolność od ${waiting.eligibleFrom}.`)
    }
    if (title === "EMPLOYMENT") {
      reasons.push(reasonOf(ctx, "LR-106", "EMPLOYER_SICK_PAY_FIRST", "Przez pierwsze 33 dni niezdolności w roku (14 dni od roku po ukończeniu 50 lat) pracodawca wypłaca wynagrodzenie chorobowe — w ciąży 100%; potem zasiłek chorobowy 100%."))
    } else {
      reasons.push(reasonOf(ctx, "LR-104", "BENEFIT_FROM_DAY_ONE", "Osoba, która nie jest pracownikiem, otrzymuje zasiłek od pierwszego dnia niezdolności (po okresie wyczekiwania), w ciąży 100% podstawy."))
    }
    reasons.push(reasonOf(ctx, "LR-103", "BENEFIT_PERIOD_270", "Okres zasiłkowy w ciąży wynosi do 270 dni."))
    const gate = debtGate(ctx, mother, ctx.asOf, "SICKNESS_IN_PREGNANCY")
    if (gate.status === "BLOCKED") {
      status = "CONDITIONAL"
      conditions.push("Spłata zadłużenia w składkach powyżej 1% minimalnego wynagrodzenia (U art. 2a).")
    }
    result.determinations.push(determination(status, reasons, { conditions, payer: payerFor(ctx, mother, false) }))
    return result
  }

  // A concrete sick leave.
  if (leave.end < leave.start) {
    ctx.review("Zwolnienie lekarskie kończy się przed datą rozpoczęcia.")
    result.determinations.push(determination("MANUAL_REVIEW", reasons))
    return result
  }
  if (!leave.pregnancyCode) {
    ctx.need({
      key: "sickLeave.pregnancyCode",
      parent: "MOTHER",
      question: "Czy zwolnienie lekarskie (e-ZLA) ma kod „B” (ciąża)?",
      why: "Kod „B” potwierdza, że niezdolność przypada w ciąży — wtedy zasiłek wynosi 100% (U art. 11 ust. 2, art. 57). Bez kodu płatnik wypłaci 80%.",
      affects: ["SICKNESS_IN_PREGNANCY", "EMPLOYER_SICK_PAY"],
    })
  }

  const coverageOnStart = insuredOn(ctx, mother, leave.start)
  let afterTitle = false
  if (coverageOnStart.status === "NO") {
    const ended = mother.insurance?.endDate
    const days = periodDays(leave)
    if (
      coverageOnStart.cause === "ENDED" &&
      ended &&
      leave.start <= addDays(ended, ctx.p.sickness.afterTitleOnsetDays) &&
      days >= ctx.p.sickness.afterTitleMinIncapacityDays
    ) {
      afterTitle = true
      reasons.push(
        reasonOf(ctx, "LR-102", "AFTER_TITLE", `Niezdolność powstała w ciągu 14 dni od ustania ubezpieczenia (${ended}) i trwa co najmniej 30 dni — zasiłek przysługuje po ustaniu tytułu; w ciąży bez limitu 91 dni. Wypłaca ZUS.`)
      )
      ctx.unsupported("U-15")
    } else {
      reasons.push(
        reasonOf(ctx, "LR-102", "NOT_INSURED_AT_ONSET", "W dniu powstania niezdolności nie było ubezpieczenia chorobowego, a warunki zasiłku po ustaniu tytułu (do 14 dni od ustania, niezdolność ≥ 30 dni) nie są spełnione.")
      )
      result.determinations.push(determination("NOT_ELIGIBLE", reasons, { payer: "NONE" }))
      return result
    }
  }

  if (!waiting.eligibleFrom && !afterTitle) {
    result.determinations.push(determination("NEEDS_INPUT", reasons, { missingEvidence: ["insurance.startDate"] }))
    return result
  }
  const paidFrom = afterTitle ? leave.start : maxDate(leave.start, waiting.eligibleFrom!)
  if (paidFrom > leave.end) {
    reasons.push(reasonOf(ctx, "LR-100", "WAITING_NOT_MET", `Cała niezdolność przypada przed końcem okresu wyczekiwania (prawo od ${waiting.eligibleFrom}).`))
    result.determinations.push(determination("NOT_ELIGIBLE", reasons, { payer: "NONE" }))
    return result
  }
  if (paidFrom > leave.start) {
    reasons.push(reasonOf(ctx, "LR-100", "WAITING_PARTIAL", `Dni ${leave.start} – ${addDays(paidFrom, -1)} przypadają w okresie wyczekiwania i nie są płatne ani wliczane do okresu zasiłkowego (U art. 9 ust. 3).`))
  }

  // U art. 8–9: the 270-day okres zasiłkowy in pregnancy.
  ctx.use("LR-103")
  if (ctx.p.sickness.singlePeriodAcrossTitles) ctx.use("LR-103A")
  const prior = Math.max(0, Math.round(leave.priorDaysInBenefitPeriod ?? 0))
  if (leave.priorDaysInBenefitPeriod === undefined) ctx.unsupported("U-13")
  const capLeft = Math.max(0, ctx.p.sickness.maxPeriodDaysPregnancy - prior)
  const requested = periodDays({ start: paidFrom, end: leave.end })
  const payable = Math.min(requested, capLeft)
  const payableEnd = addDays(paidFrom, payable - 1)
  const exhausted = requested > capLeft

  const rate = ratio(leave.pregnancyCode === false ? ctx.p.sickness.rateGeneral : ctx.p.sickness.ratePregnancy)
  const monthly = basis?.monthly ?? null
  const payer = payerFor(ctx, mother, afterTitle)

  const line = (id: string, benefit: "EMPLOYER_SICK_PAY" | "SICKNESS_IN_PREGNANCY", start: string, end: string, ruleIds: RuleId[]) => {
    const days = periodDays({ start, end })
    const value = monthly ? monthly.mul(rate).mul(days).div(ctx.p.basis.dailyDivisor) : null
    const grosze = value ? groszeToNumber(value.round("HALF_UP")) : null
    result.lines.push({
      id,
      parent: "MOTHER",
      benefit,
      label: LABELS[benefit],
      period: { start, end },
      days,
      rate: rate.toFixed(2).replace(/0+$/, "").replace(/\.$/, ""),
      ratePercent: rate.toPercent(),
      paidFraction: "1.00",
      monthlyBasisGrosze: basis?.monthlyBasisGrosze ?? null,
      exactAmount: value?.toFraction() ?? null,
      amountGrosze: grosze,
      formula: monthly && grosze !== null
        ? `${formatGrosze(monthly.round("HALF_UP"))} × ${rate.toPercent()} × ${days} / 30 = ${value!.toFixed(4)} gr → ${formatGrosze(grosze)}`
        : `podstawa × ${rate.toPercent()} × ${days} dni / 30`,
      ruleIds: [...ruleIds, "LR-MONEY", "LR-ROUND"],
    })
    result.periods.push({
      id,
      parent: "MOTHER",
      benefit,
      label: LABELS[benefit],
      start,
      end,
      days,
      weeks: (days / 7).toFixed(1),
      estimated: false,
    })
  }

  if (payable > 0) {
    if (mother.insurance?.title === "EMPLOYMENT" && !afterTitle) {
      ctx.use("LR-106")
      let usedThisYear = Math.max(0, Math.round(leave.employerPaidDaysUsedThisYear ?? 0))
      if (mother.birthYear === undefined) {
        ctx.need({
          key: "mother.birthYear",
          parent: "MOTHER",
          question: "W którym roku się urodziłaś?",
          why: "Po roku, w którym pracownik ukończył 50 lat, pracodawca płaci wynagrodzenie chorobowe przez 14 zamiast 33 dni (KP art. 92). W ciąży obie kwoty wynoszą 100%, więc zmienia to tylko płatnika.",
          affects: "EMPLOYER_SICK_PAY",
        })
      }
      const firstYear = yearOf(paidFrom)
      for (const part of splitByYear({ start: paidFrom, end: payableEnd })) {
        const year = yearOf(part.start)
        const limit =
          mother.birthYear !== undefined && year > mother.birthYear + 50
            ? ctx.p.sickness.employerPaidDaysAfter50
            : ctx.p.sickness.employerPaidDays
        const used = year === firstYear ? usedThisYear : 0
        const employerDays = Math.max(0, Math.min(limit - used, periodDays(part)))
        if (employerDays > 0) {
          line(`sick-pay-${year}`, "EMPLOYER_SICK_PAY", part.start, addDays(part.start, employerDays - 1), ["LR-106"])
        }
        if (employerDays < periodDays(part)) {
          line(`sickness-${year}`, "SICKNESS_IN_PREGNANCY", addDays(part.start, employerDays), part.end, ["LR-104", "LR-103"])
        }
        usedThisYear = 0
      }
      result.determinations.push({
        benefit: "EMPLOYER_SICK_PAY",
        parent: "MOTHER",
        label: LABELS.EMPLOYER_SICK_PAY,
        status: "ELIGIBLE",
        reasons: [reasonOf(ctx, "LR-106", "EMPLOYER_SICK_PAY", "Pracodawca wypłaca wynagrodzenie chorobowe za pierwsze dni niezdolności w roku kalendarzowym (33 albo 14 dni); w ciąży 100%, według zasad podstawy zasiłku chorobowego.")],
        conditions: [],
        missingEvidence: [],
        payer: "EMPLOYER",
      })
    } else {
      line("sickness", "SICKNESS_IN_PREGNANCY", paidFrom, payableEnd, ["LR-104", "LR-103"])
    }
  }

  const conditions: string[] = []
  let status: Determination["status"] = "ELIGIBLE"
  const gate = debtGate(ctx, mother, leave.start, "SICKNESS_IN_PREGNANCY")
  if (gate.status === "BLOCKED") {
    status = "CONDITIONAL"
    conditions.push(`Wypłata po spłacie zadłużenia w składkach — najpóźniej do ${gate.repaymentDeadline} (U art. 2a).`)
  } else if (gate.status === "EXPIRED") {
    status = "NOT_ELIGIBLE"
  }
  if (title === "SELF_EMPLOYMENT" || title === "MANDATE") {
    reasons.push(reasonOf(ctx, "LR-104", "BENEFIT_FROM_DAY_ONE", "Zasiłek przysługuje od pierwszego dnia niezdolności (bez wynagrodzenia chorobowego)."))
  }
  result.determinations.push(determination(status, reasons, { conditions, payer }))
  result.amountStatus = monthly ? (afterTitle ? "CALCULATED_UPPER_BOUND" : basis?.minimumBasisApplied === "NOT_CHECKED" ? "CALCULATED_LOWER_BOUND" : "CALCULATED") : "BASIS_UNKNOWN"
  if (afterTitle && monthly) {
    ctx.warn({
      code: "AFTER_TITLE_BASIS_CAP",
      severity: "INFO",
      parent: "MOTHER",
      text: "Po ustaniu tytułu podstawa zasiłku chorobowego nie może przekroczyć 100% przeciętnego wynagrodzenia (U art. 46). Tej kwoty nie ma w źródłach, więc wynik może być zawyżony dla wysokich podstaw.",
      ruleId: "LR-112",
    })
  }

  if (exhausted) {
    ctx.use("LR-107")
    ctx.unsupported("U-05")
    ctx.warn({
      code: "BENEFIT_PERIOD_EXHAUSTED",
      severity: "WARNING",
      parent: "MOTHER",
      text: `Zwolnienie przekracza 270 dni okresu zasiłkowego — zasiłek chorobowy wypłacany do ${payableEnd}. Dalej możliwe jest świadczenie rehabilitacyjne.`,
      ruleId: "LR-103",
    })
    result.determinations.push({
      benefit: "REHABILITATION",
      parent: "MOTHER",
      label: LABELS.REHABILITATION,
      status: "CONDITIONAL",
      reasons: [
        reasonOf(ctx, "LR-107", "REHABILITATION_RULES", "Świadczenie rehabilitacyjne przysługuje po wyczerpaniu zasiłku chorobowego, gdy dalsze leczenie rokuje odzyskanie zdolności do pracy, najdłużej 12 miesięcy; w ciąży 100% podstawy (poza ciążą 90% przez 3 miesiące, potem 75%)."),
      ],
      conditions: ["Orzeczenie lekarza orzecznika ZUS (U art. 18 ust. 3).", "Wniosek o świadczenie rehabilitacyjne z zaświadczeniem o stanie zdrowia (R1316 § 11)."],
      missingEvidence: [],
      payer: "ZUS",
    })
  }
  return result
}
