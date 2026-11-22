import { addDays, addMonths, daysBetween } from "../dates"
import { periodDays } from "./calendar"
import type { EvaluationContext } from "./context"
import { ratio } from "./decimal"
import type { RuleId } from "./sources"
import type {
  BenefitType,
  EligibilityStatus,
  ParentInput,
  ParentRole,
  Reason,
  SicknessCoverage,
} from "./types"

/** Sickness coverage implied by the title where the law fixes it. */
export function sicknessCoverage(parent: ParentInput | undefined): SicknessCoverage | undefined {
  const insurance = parent?.insurance
  if (!insurance?.title) return undefined
  // An explicit "no coverage" wins over the default implied by the title: an
  // employee can be found not to be subject to insurance (e.g. a sham contract
  // or a ZUS decision of non-subjection), and the engine must not assume cover.
  if (insurance.title === "EMPLOYMENT") {
    return insurance.sicknessInsurance === "NONE" ? "NONE" : "COMPULSORY"
  }
  if (insurance.title === "NONE") return "NONE"
  return insurance.sicknessInsurance
}

export const TITLE_LABELS = {
  EMPLOYMENT: "umowa o pracę",
  MANDATE: "umowa zlecenia",
  SELF_EMPLOYMENT: "pozarolnicza działalność gospodarcza",
  OTHER: "inny tytuł ubezpieczenia",
  NONE: "brak tytułu ubezpieczenia",
} as const

export interface CoverageOnDate {
  status: "YES" | "NO" | "UNKNOWN"
  cause?: "NO_COVERAGE" | "NOT_STARTED" | "ENDED" | "TITLE_UNKNOWN" | "COVERAGE_UNKNOWN"
  /** The date lies after `asOf`: coverage must still last on that day. */
  future: boolean
}

export function insuredOn(ctx: EvaluationContext, parent: ParentInput | undefined, date: string): CoverageOnDate {
  const future = date > ctx.asOf
  if (!parent?.insurance?.title) return { status: "UNKNOWN", cause: "TITLE_UNKNOWN", future }
  const coverage = sicknessCoverage(parent)
  if (coverage === "NONE") return { status: "NO", cause: "NO_COVERAGE", future }
  if (coverage === undefined) return { status: "UNKNOWN", cause: "COVERAGE_UNKNOWN", future }
  const { startDate, endDate } = parent.insurance
  if (startDate && startDate > date) return { status: "NO", cause: "NOT_STARTED", future }
  if (endDate && endDate < date) return { status: "NO", cause: "ENDED", future }
  return { status: "YES", future }
}

export interface WaitingPeriod {
  /** First day the sickness benefit is due, or null when unknown. */
  eligibleFrom: string | null
  waitingDays: number
  priorDaysCounted: number
  dayOne: boolean
}

/** U art. 4 ust. 1–3. "Po upływie 30 dni" — the right starts on day 31 of insurance. */
export function waitingPeriod(ctx: EvaluationContext, parent: ParentInput): WaitingPeriod {
  const coverage = sicknessCoverage(parent)
  const insurance = parent.insurance ?? {}
  const waitingDays =
    coverage === "VOLUNTARY" ? ctx.p.sickness.waitingDaysVoluntary : ctx.p.sickness.waitingDaysCompulsory
  ctx.use("LR-100")
  if (insurance.dayOneException) {
    ctx.use("LR-101")
    return {
      eligibleFrom: insurance.startDate ?? null,
      waitingDays: 0,
      priorDaysCounted: 0,
      dayOne: true,
    }
  }
  if (!insurance.startDate) {
    ctx.need({
      key: "insurance.startDate",
      parent: parent.role,
      question: "Od kiedy nieprzerwanie podlegasz ubezpieczeniu chorobowemu?",
      why: "Od tego zależy okres wyczekiwania na zasiłek chorobowy (30 albo 90 dni).",
      affects: "SICKNESS_IN_PREGNANCY",
    })
    return { eligibleFrom: null, waitingDays, priorDaysCounted: 0, dayOne: false }
  }
  let priorDaysCounted = 0
  const { previousInsuranceStartDate: prevStart, previousInsuranceEndDate: prevEnd } = insurance
  if (prevStart && prevEnd && prevStart <= prevEnd && prevEnd < insurance.startDate) {
    const gapDays = daysBetween(prevEnd, insurance.startDate) - 1
    if (gapDays <= ctx.p.sickness.priorPeriodGapToleranceDays || insurance.previousGapReason) {
      priorDaysCounted = periodDays({ start: prevStart, end: prevEnd })
    }
  }
  const remaining = Math.max(0, waitingDays - priorDaysCounted)
  return {
    eligibleFrom: addDays(insurance.startDate, remaining),
    waitingDays,
    priorDaysCounted,
    dayOne: false,
  }
}

export interface DebtGate {
  status: "NOT_APPLICABLE" | "OK" | "BLOCKED" | "EXPIRED" | "UNKNOWN"
  repaymentDeadline?: string
  paymentBy?: string
}

/** U art. 2a ust. 1–2, art. 64 ust. 3 — self-employed, cooperating persons and similar only. */
export function debtGate(ctx: EvaluationContext, parent: ParentInput, rightDate: string, benefit: BenefitType): DebtGate {
  const insurance = parent.insurance
  const title = insurance?.title
  if (title !== "SELF_EMPLOYMENT" && title !== "OTHER") return { status: "NOT_APPLICABLE" }
  ctx.use("LR-108")
  const debt = insurance?.contributionDebt
  const repaymentDeadline = addMonths(rightDate, ctx.p.debt.expiryMonths)
  if (!debt) {
    ctx.need({
      key: "insurance.contributionDebt",
      parent: parent.role,
      question: "Czy w dniu porodu (powstania prawa) masz zaległości w składkach ZUS? Jeśli tak — na jaką kwotę?",
      why: "Zadłużenie przedsiębiorcy powyżej 1% minimalnego wynagrodzenia wstrzymuje wypłatę zasiłku (U art. 2a).",
      affects: benefit,
    })
    return { status: "UNKNOWN", repaymentDeadline }
  }
  if (!debt.exists) return { status: "OK" }
  let exceeds = debt.exceedsThreshold
  const minimumWage = ctx.p.external.minimumWageGrosze
  if (exceeds === undefined && debt.amountGrosze !== undefined && minimumWage !== null) {
    const threshold = ratio(minimumWage).mul(ctx.p.debt.thresholdShareOfMinimumWage)
    exceeds = ratio(debt.amountGrosze).gt(threshold)
  }
  if (exceeds === undefined) {
    ctx.need({
      key: "insurance.contributionDebt.exceedsThreshold",
      parent: parent.role,
      question: "Czy zadłużenie przekracza 1% minimalnego wynagrodzenia za pracę (zaświadczenie o niezaleganiu z ZUS)?",
      why: "Kwoty minimalnego wynagrodzenia nie ma w udostępnionych źródłach (Q-29), więc nie porównamy jej sami.",
      affects: benefit,
    })
    return { status: "UNKNOWN", repaymentDeadline }
  }
  if (!exceeds) return { status: "OK" }
  if (debt.repaidOn) {
    if (debt.repaidOn <= repaymentDeadline) {
      return {
        status: "OK",
        repaymentDeadline,
        paymentBy: addDays(debt.repaidOn, ctx.p.debt.paymentAfterRepaymentDays),
      }
    }
    return { status: "EXPIRED", repaymentDeadline }
  }
  if (ctx.asOf > repaymentDeadline) return { status: "EXPIRED", repaymentDeadline }
  return { status: "BLOCKED", repaymentDeadline }
}

export function payerFor(
  ctx: EvaluationContext,
  parent: ParentInput,
  afterTitle: boolean
): "EMPLOYER" | "ZUS" | "UNKNOWN" {
  ctx.use("LR-109")
  const title = parent.insurance?.title
  if (afterTitle || title === "SELF_EMPLOYMENT" || title === "OTHER") return "ZUS"
  if (parent.insurance?.payerSize === "OVER_20") return "EMPLOYER"
  if (parent.insurance?.payerSize === "UP_TO_20") return "ZUS"
  return "UNKNOWN"
}

export interface Entitlement {
  status: EligibilityStatus
  reasons: Reason[]
  conditions: string[]
  missingEvidence: string[]
  /** Right exists although insurance ended (U art. 30). */
  afterTitle: boolean
  /** Employee entitled to zasiłek w wysokości zasiłku macierzyńskiego until the birth (U art. 30 ust. 3). */
  maternityEquivalent: boolean
}

const EMPLOYER_END = new Set(["EMPLOYER_DEATH", "EMPLOYER_BANKRUPTCY", "EMPLOYER_LIQUIDATION"])

function reason(ctx: EvaluationContext, ruleId: RuleId, code: string, text: string): Reason {
  ctx.use(ruleId)
  return { ruleId, code, text }
}

/**
 * Entitlement to zasiłek macierzyński on the day the right arises (U art. 29
 * ust. 1–2, art. 30). Shared by maternity, maternity-terms, supplementary,
 * parental and paternity determinations.
 */
export function maternityEntitlement(
  ctx: EvaluationContext,
  parent: ParentInput | undefined,
  rightDate: string,
  benefit: BenefitType,
  options: { allowAfterTitle: boolean; role: ParentRole; dateLabel: string }
): Entitlement {
  const result: Entitlement = {
    status: "ELIGIBLE",
    reasons: [],
    conditions: [],
    missingEvidence: [],
    afterTitle: false,
    maternityEquivalent: false,
  }
  const event = ctx.input.event

  if (event.professionalFosterFamily) {
    result.status = "NOT_ELIGIBLE"
    result.reasons.push(
      reason(ctx, "LR-120A", "PROFESSIONAL_FOSTER_FAMILY", "Zawodowa rodzina zastępcza nie ma prawa do zasiłku macierzyńskiego ani urlopu na warunkach urlopu macierzyńskiego.")
    )
    return result
  }

  if (!parent?.insurance?.title) {
    ctx.need({
      key: "insurance.title",
      parent: options.role,
      question: "Na jakiej podstawie pracujesz: umowa o pracę, umowa zlecenia, własna działalność, czy nie masz tytułu ubezpieczenia?",
      why: "Tytuł ubezpieczenia decyduje o ubezpieczeniu chorobowym, a więc o prawie do zasiłku i o tym, kto go wypłaca.",
      affects: benefit,
    })
    result.status = "NEEDS_INPUT"
    result.missingEvidence.push("insurance.title")
    return result
  }

  const insurance = parent.insurance
  const title = insurance.title!
  const coverage = sicknessCoverage(parent)

  if (title === "OTHER") {
    ctx.unsupported("U-12")
    ctx.warn({
      code: "OTHER_TITLE",
      severity: "WARNING",
      parent: options.role,
      text: "Dla tego tytułu ubezpieczenia silnik stosuje ogólną zasadę (ubezpieczenie chorobowe w dniu powstania prawa). Potwierdź szczegóły w ZUS.",
    })
  }

  if (coverage === undefined) {
    ctx.need({
      key: "insurance.sicknessInsurance",
      parent: options.role,
      question: "Czy opłacasz dobrowolne ubezpieczenie chorobowe w ZUS?",
      why: "Przy umowie zlecenia i działalności ubezpieczenie chorobowe jest dobrowolne; bez niego zasiłek nie przysługuje.",
      affects: benefit,
    })
    result.status = "NEEDS_INPUT"
    result.missingEvidence.push("insurance.sicknessInsurance")
    return result
  }

  if (insurance.onChildcareLeave) {
    result.reasons.push(
      reason(ctx, "LR-120", "CHILDCARE_LEAVE_COUNTS", `Prawo powstaje także w okresie urlopu wychowawczego (${options.dateLabel}: ${rightDate}).`)
    )
    return applyDebt(ctx, parent, rightDate, benefit, result)
  }

  const coverageOnDate = insuredOn(ctx, parent, rightDate)

  if (coverageOnDate.status === "YES") {
    result.reasons.push(
      reason(
        ctx,
        "LR-120",
        "INSURED_ON_RIGHT_DATE",
        `${coverage === "COMPULSORY" ? "Obowiązkowe" : "Dobrowolne"} ubezpieczenie chorobowe (${TITLE_LABELS[title]}) obejmuje dzień powstania prawa (${options.dateLabel}: ${rightDate}).`
      )
    )
    if (coverageOnDate.future) {
      result.status = "CONDITIONAL"
      result.conditions.push(
        `Ubezpieczenie chorobowe musi trwać w dniu ${rightDate} (${options.dateLabel}). Rozwiązanie umowy, zakończenie działalności lub wyrejestrowanie przed tym dniem odbiera prawo do zasiłku.`
      )
      if (insurance.endDate && insurance.endDate >= rightDate) {
        result.conditions.push(`Zaplanowany koniec tytułu (${insurance.endDate}) przypada po tym dniu.`)
      }
    }
    return applyDebt(ctx, parent, rightDate, benefit, result)
  }

  if (coverageOnDate.cause === "NO_COVERAGE") {
    result.status = "NOT_ELIGIBLE"
    result.reasons.push(
      reason(
        ctx,
        "LR-72",
        "NO_SICKNESS_INSURANCE",
        insurance.title === "NONE"
          ? "Bez tytułu do ubezpieczenia chorobowego zasiłek macierzyński z ZUS nie przysługuje."
          : "Przy tym tytule ubezpieczenie chorobowe jest dobrowolne; bez przystąpienia do niego zasiłek macierzyński nie przysługuje."
      )
    )
    return result
  }

  if (coverageOnDate.cause === "NOT_STARTED") {
    result.status = "NOT_ELIGIBLE"
    result.reasons.push(
      reason(ctx, "LR-120", "INSURANCE_STARTS_LATER", `Ubezpieczenie zaczyna się ${insurance.startDate}, czyli po dniu powstania prawa (${rightDate}).`)
    )
    return result
  }

  // Coverage ended before the right arose.
  const endedOn = insurance.endDate!
  if (!options.allowAfterTitle) {
    result.status = "NOT_ELIGIBLE"
    result.reasons.push(
      reason(ctx, "LR-72", "INSURANCE_ENDED", `Ubezpieczenie chorobowe ustało ${endedOn}, przed dniem powstania prawa (${rightDate}).`)
    )
    return result
  }

  const endReason = insurance.endReason
  if (insurance.title === "EMPLOYMENT" && endReason && EMPLOYER_END.has(endReason)) {
    result.afterTitle = true
    result.reasons.push(
      reason(ctx, "LR-121", "AFTER_TITLE_EMPLOYER", "Ubezpieczenie ustało w ciąży wskutek śmierci, upadłości lub likwidacji pracodawcy — zasiłek macierzyński przysługuje mimo ustania ubezpieczenia; wypłaca ZUS.")
    )
    if (insurance.otherEmploymentProvided !== true) {
      result.maternityEquivalent = true
    }
    return pregnancyCondition(ctx, parent, result, benefit)
  }

  if (insurance.title === "EMPLOYMENT" && endReason === "UNLAWFUL_TERMINATION_FINAL_JUDGMENT") {
    result.afterTitle = true
    result.reasons.push(
      reason(ctx, "LR-121", "AFTER_TITLE_UNLAWFUL", "Rozwiązanie umowy w ciąży z naruszeniem prawa stwierdzone prawomocnym wyrokiem — zasiłek macierzyński przysługuje po porodzie mimo ustania ubezpieczenia (U art. 30 ust. 1 pkt 2).")
    )
    ctx.warn({
      code: "D07_UNLAWFUL_TERMINATION",
      severity: "INFO",
      parent: options.role,
      text: "Treść zadania (s. 4) wymienia bezprawne rozwiązanie umowy także przy zasiłku w wysokości zasiłku macierzyńskiego przed porodem. Ustawa (art. 30 ust. 3) ogranicza ten zasiłek do śmierci, upadłości i likwidacji pracodawcy — stosujemy ustawę (konflikt D-07).",
      ruleId: "LR-121A",
    })
    return pregnancyCondition(ctx, parent, result, benefit)
  }

  if (insurance.title === "EMPLOYMENT" && endReason === "FIXED_TERM_CONTRACT_END" && options.role === "MOTHER") {
    ctx.use("LR-122")
    const contract = insurance.fixedTermContract
    if (contract?.replacementContract === true) {
      result.status = "NOT_ELIGIBLE"
      result.reasons.push(
        reason(ctx, "LR-122", "REPLACEMENT_CONTRACT_NOT_EXTENDED", "Umowa na zastępstwo nie przedłuża się do dnia porodu (KP art. 177 § 3¹); ubezpieczenie ustało przed porodem.")
      )
      return result
    }
    const longer = contract?.longerThanOneMonth
    const after3 = contract?.wouldEndAfterThirdMonthOfPregnancy
    if (longer === true && after3 === true && contract?.replacementContract === false) {
      result.afterTitle = true
      result.reasons.push(
        reason(ctx, "LR-122", "FIXED_TERM_EXTENDED_TO_BIRTH", "Umowa terminowa dłuższa niż miesiąc, która rozwiązałaby się po 3. miesiącu ciąży, przedłuża się do dnia porodu; zasiłek macierzyński przysługuje po ustaniu ubezpieczenia (KP art. 177 § 3, U art. 30 ust. 4).")
      )
      ctx.warn({
        code: "FIXED_TERM_EXTENDED",
        severity: "INFO",
        parent: options.role,
        text: `Umowa przedłuża się z mocy prawa do dnia porodu, więc ubezpieczenie trwa do porodu mimo daty końca ${endedOn}.`,
        ruleId: "LR-122",
      })
      return result
    }
    if (longer === false || after3 === false) {
      result.status = "NOT_ELIGIBLE"
      result.reasons.push(
        reason(ctx, "LR-72", "FIXED_TERM_ENDED", "Umowa terminowa nie spełnia warunków przedłużenia do dnia porodu (KP art. 177 § 3), więc ubezpieczenie ustało przed porodem.")
      )
      return result
    }
    result.status = "NEEDS_INPUT"
    ctx.need({
      key: "insurance.fixedTermContract",
      parent: options.role,
      question: "Czy umowa terminowa była zawarta na dłużej niż miesiąc, czy rozwiązałaby się po upływie 3. miesiąca ciąży i czy nie jest umową na zastępstwo?",
      why: "Taka umowa przedłuża się do dnia porodu (KP art. 177 § 3), co zachowuje prawo do zasiłku macierzyńskiego.",
      affects: benefit,
    })
    result.missingEvidence.push("insurance.fixedTermContract")
    return result
  }

  result.status = "NOT_ELIGIBLE"
  result.reasons.push(
    reason(ctx, "LR-72", "INSURANCE_ENDED_BEFORE_RIGHT", `Ubezpieczenie chorobowe ustało ${endedOn}, przed dniem powstania prawa (${rightDate}), z przyczyny, która nie zachowuje prawa do zasiłku.`)
  )
  if (insurance.title === "EMPLOYMENT" && endReason === "TERMINATION_BY_EMPLOYER" && options.role === "MOTHER") {
    ctx.warn({
      code: "TERMINATION_DURING_PROTECTION",
      severity: "RISK",
      parent: options.role,
      text: "W ciąży pracodawca może wypowiedzieć umowę tylko w razie upadłości lub likwidacji albo rozwiązać ją bez wypowiedzenia z winy pracownicy za zgodą związku zawodowego (KP art. 177). Jeśli sąd prawomocnie stwierdzi naruszenie przepisów, zasiłek macierzyński przysługuje po porodzie (U art. 30 ust. 1 pkt 2).",
      ruleId: "LR-80",
    })
  }
  return result
}

function pregnancyCondition(
  ctx: EvaluationContext,
  parent: ParentInput,
  result: Entitlement,
  benefit: BenefitType
): Entitlement {
  const during = parent.insurance?.endedDuringPregnancy
  if (during === false) {
    result.status = "NOT_ELIGIBLE"
    result.maternityEquivalent = false
    result.reasons.push(
      reason(ctx, "LR-121", "ENDED_BEFORE_PREGNANCY", "Ubezpieczenie ustało przed ciążą, więc art. 30 ustawy zasiłkowej nie ma zastosowania.")
    )
    return result
  }
  if (during === undefined) {
    result.status = "CONDITIONAL"
    result.conditions.push("Ubezpieczenie musiało ustać w okresie ciąży — potwierdza to zaświadczenie lekarskie o stanie ciąży w okresie zatrudnienia (R1316 § 15, § 17).")
    ctx.need({
      key: "insurance.endedDuringPregnancy",
      parent: parent.role,
      question: "Czy zatrudnienie ustało, gdy byłaś już w ciąży?",
      why: "Prawo do zasiłku po ustaniu ubezpieczenia dotyczy tylko ustania w okresie ciąży (U art. 30).",
      affects: benefit,
    })
  }
  return result
}

function applyDebt(
  ctx: EvaluationContext,
  parent: ParentInput,
  rightDate: string,
  benefit: BenefitType,
  result: Entitlement
): Entitlement {
  const gate = debtGate(ctx, parent, rightDate, benefit)
  switch (gate.status) {
    case "BLOCKED":
      result.status = "CONDITIONAL"
      result.reasons.push(
        reason(ctx, "LR-108", "DEBT_BLOCKS_PAYMENT", "Zadłużenie w składkach powyżej 1% minimalnego wynagrodzenia w dniu powstania prawa wstrzymuje wypłatę do spłaty całości.")
      )
      result.conditions.push(
        `Spłać całe zadłużenie najpóźniej do ${gate.repaymentDeadline} — inaczej prawo do zasiłku przedawni się (U art. 2a ust. 2). ZUS wypłaca zasiłek do 60 dni od spłaty.`
      )
      break
    case "EXPIRED":
      result.status = "NOT_ELIGIBLE"
      result.reasons.push(
        reason(ctx, "LR-108", "DEBT_RIGHT_EXPIRED", `Zadłużenia nie spłacono w ciągu 6 miesięcy od powstania prawa (termin: ${gate.repaymentDeadline}) — prawo do zasiłku przedawniło się.`)
      )
      break
    case "UNKNOWN":
      if (result.status === "ELIGIBLE") result.status = "CONDITIONAL"
      result.conditions.push("Brak zadłużenia w składkach powyżej 1% minimalnego wynagrodzenia w dniu powstania prawa (U art. 2a).")
      break
    case "OK":
      if (gate.paymentBy) {
        result.reasons.push(
          reason(ctx, "LR-108", "DEBT_REPAID", `Zadłużenie spłacono w terminie; ZUS wypłaca zasiłek do ${gate.paymentBy} (60 dni od spłaty).`)
        )
      }
      break
    case "NOT_APPLICABLE":
      break
  }
  return result
}
