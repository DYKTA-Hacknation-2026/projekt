import { addDays, daysBetween, isIsoDate } from "./dates"

/**
 * Deterministic analysis of e-ZLA periods for the sickness-benefit process.
 *
 * It uses only legal facts (dates, whether the incapacity is related to
 * pregnancy) and never a diagnosis. The analysis answers three questions the
 * benefit process needs: is the leave inside the insurance period, how many
 * days does it cover, and does it change the rate or the 270-day limit.
 */

export interface SickLeaveFact {
  id?: string
  startDate: string
  endDate: string
  /** Optional declared length; recomputed from dates when absent. */
  days?: number
  pregnancyRelated: boolean
  kind?: "SICKNESS" | "PREGNANCY" | "CARE" | "REHABILITATION"
}

export interface SickLeavePeriodAnalysis {
  id: string | null
  startDate: string
  endDate: string
  days: number
  pregnancyRelated: boolean
  activeOnAsOf: boolean
  outsideInsurance: boolean
  overlapsPrevious: boolean
}

export interface SickLeaveAnalysis {
  status: "OK" | "ATTENTION" | "INDETERMINATE"
  asOf: string
  totalDays: number
  pregnancyRelatedDays: number
  periods: SickLeavePeriodAnalysis[]
  reasons: Array<{
    ruleId: string
    text: string
    legalBasis: string
  }>
  warnings: string[]
}

export const SICK_LEAVE_LIMIT_DAYS = 270
export const EMPLOYER_PAID_DAYS = 33

export function analyzeSickLeave(input: {
  periods: readonly SickLeaveFact[]
  asOf: string
  insuranceStartDate?: string
  insuranceEndDate?: string
  employmentType?: "EMPLOYMENT" | "MANDATE" | "SELF_EMPLOYMENT" | "OTHER" | "NONE"
}): SickLeaveAnalysis {
  if (!isIsoDate(input.asOf)) {
    throw new RangeError("asOf musi być datą RRRR-MM-DD")
  }

  const reasons: SickLeaveAnalysis["reasons"] = []
  const warnings: string[] = []
  const periods: SickLeavePeriodAnalysis[] = []
  let totalDays = 0
  let pregnancyRelatedDays = 0

  const sorted = [...input.periods].sort((left, right) =>
    left.startDate.localeCompare(right.startDate)
  )

  for (const [index, period] of sorted.entries()) {
    if (!isIsoDate(period.startDate) || !isIsoDate(period.endDate)) {
      throw new RangeError("Okres zwolnienia musi mieć daty RRRR-MM-DD")
    }
    if (period.endDate < period.startDate) {
      throw new RangeError("Koniec zwolnienia nie może być przed początkiem")
    }

    const days = daysBetween(period.startDate, addDays(period.endDate, 1))
    const outsideInsurance =
      (input.insuranceStartDate !== undefined &&
        period.startDate < input.insuranceStartDate) ||
      (input.insuranceEndDate !== undefined &&
        period.endDate > input.insuranceEndDate)
    const activeOnAsOf =
      period.startDate <= input.asOf && period.endDate >= input.asOf
    const previous = index > 0 ? sorted[index - 1] : undefined
    const overlapsPrevious = previous
      ? period.startDate <= previous.endDate
      : false

    totalDays += days
    if (period.pregnancyRelated) pregnancyRelatedDays += days

    periods.push({
      id: period.id ?? null,
      startDate: period.startDate,
      endDate: period.endDate,
      days,
      pregnancyRelated: period.pregnancyRelated,
      activeOnAsOf,
      outsideInsurance,
      overlapsPrevious,
    })
  }

  if (periods.some((period) => period.outsideInsurance)) {
    reasons.push({
      ruleId: "LR-100",
      text: "Co najmniej jedno zwolnienie zaczyna się lub kończy poza okresem ubezpieczenia chorobowego. Zasiłek za ten okres wymaga osobnej oceny.",
      legalBasis: "U art. 4 ust. 1; U art. 13",
    })
  } else if (periods.length > 0 && input.insuranceStartDate) {
    reasons.push({
      ruleId: "LR-100",
      text: "Wszystkie zwolnienia mieszczą się w okresie ubezpieczenia chorobowego przekazanym przez ZUS.",
      legalBasis: "U art. 4 ust. 1",
    })
  }

  if (pregnancyRelatedDays > 0) {
    reasons.push({
      ruleId: "A-15",
      text: "Zwolnienie jest oznaczone jako związane z ciążą. W tym okresie wynagrodzenie chorobowe lub zasiłek chorobowy wynosi 100% podstawy.",
      legalBasis: "KP art. 92 § 1 pkt 2; U art. 11 ust. 1",
    })
  }

  if (totalDays > SICK_LEAVE_LIMIT_DAYS) {
    warnings.push(
      `Łączny czas zwolnień (${totalDays} dni) przekracza ustawowy okres zasiłkowy ${SICK_LEAVE_LIMIT_DAYS} dni. Dalsze uprawnienie wymaga indywidualnej oceny.`
    )
  }

  if (
    input.employmentType === "EMPLOYMENT" &&
    totalDays > EMPLOYER_PAID_DAYS
  ) {
    warnings.push(
      `Przez pierwsze ${EMPLOYER_PAID_DAYS} dni niezdolności w roku wynagrodzenie chorobowe wypłaca pracodawca. Potem zasiłek wypłaca płatnik składek lub ZUS.`
    )
  }

  if (periods.some((period) => period.overlapsPrevious)) {
    warnings.push(
      "Zwolnienia nakładają się na siebie. Sprawdź, czy nie są to korekty tego samego zaświadczenia."
    )
  }

  if (periods.length === 0) {
    return {
      status: "OK",
      asOf: input.asOf,
      totalDays: 0,
      pregnancyRelatedDays: 0,
      periods,
      reasons,
      warnings: [
        "Źródło e-ZLA nie zwróciło żadnych zwolnień. Nie oznacza to braku niezdolności do pracy — możesz uzupełnić dane ręcznie.",
      ],
    }
  }

  const status =
    periods.some((period) => period.outsideInsurance) ||
    totalDays > SICK_LEAVE_LIMIT_DAYS
      ? "ATTENTION"
      : input.insuranceStartDate
        ? "OK"
        : "INDETERMINATE"

  if (!input.insuranceStartDate) {
    warnings.push(
      "Brak początku okresu ubezpieczenia. Nie można potwierdzić, czy zwolnienia mieszczą się w ochronie."
    )
  }

  return {
    status,
    asOf: input.asOf,
    totalDays,
    pregnancyRelatedDays,
    periods,
    reasons,
    warnings,
  }
}
