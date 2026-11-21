import { addDays, addMonths, daysBetween, isIsoDate, parseIsoDate } from "../dates"

/**
 * Calendar conventions used by the engine. Every boundary decision is a named
 * function so tests can pin it and the assumptions list can cite it.
 *
 * - Dates are ISO `YYYY-MM-DD` plain dates (no time zone).
 * - Periods are **inclusive** on both ends: `{ start, end }` covers
 *   `daysBetween(start, end) + 1` calendar days.
 * - One week of leave = 7 calendar days (KP art. 183¹ § 1).
 * - Benefits are due for every calendar day, weekends included
 *   (U art. 11 ust. 4, art. 31 ust. 5).
 */

export { addDays, addMonths, daysBetween, isIsoDate }

export interface Period {
  start: string
  /** Inclusive last day. */
  end: string
}

export function periodDays(period: Period): number {
  return daysBetween(period.start, period.end) + 1
}

/** A period of `days` calendar days starting on `start` (inclusive). */
export function periodOfDays(start: string, days: number): Period | null {
  if (days <= 0) return null
  return { start, end: addDays(start, days - 1) }
}

export function dayAfter(date: string): string {
  return addDays(date, 1)
}

export function dayBefore(date: string): string {
  return addDays(date, -1)
}

export function minDate(a: string, b: string): string {
  return a <= b ? a : b
}

export function maxDate(a: string, b: string): string {
  return a >= b ? a : b
}

export function isWithin(date: string, period: Period): boolean {
  return date >= period.start && date <= period.end
}

/** Intersection of two inclusive periods, or null. */
export function intersect(a: Period, b: Period): Period | null {
  const start = maxDate(a.start, b.start)
  const end = minDate(a.end, b.end)
  return start <= end ? { start, end } : null
}

/** Days of `a` that fall within `b`. */
export function overlapDays(a: Period, b: Period): number {
  const both = intersect(a, b)
  return both ? periodDays(both) : 0
}

/**
 * The day a person "completes N years of age" (ukończenie N roku życia).
 * Convention (assumption A-22): on the N-th birthday; for 29 February the
 * birthday falls on 28 February in non-leap years (calendar-month clamping).
 */
export function birthdayOf(birthDate: string, years: number): string {
  return addMonths(birthDate, years * 12)
}

/**
 * Last day of a right that lasts "do ukończenia przez dziecko N" (years or
 * months): the day before the anniversary (assumption A-22).
 */
export function lastDayBeforeAge(birthDate: string, months: number): string {
  return addDays(addMonths(birthDate, months), -1)
}

/** Age in completed years on `date`. */
export function ageInYears(birthDate: string, date: string): number {
  let years = parseIsoDate(date).getUTCFullYear() - parseIsoDate(birthDate).getUTCFullYear()
  if (birthdayOf(birthDate, years) > date) years -= 1
  return years
}

/** 31 December of the calendar year in which the child turns `years` (KP art. 182¹c). */
export function endOfYearChildTurns(birthDate: string, years: number): string {
  const year = parseIsoDate(birthDate).getUTCFullYear() + years
  return `${year}-12-31`
}

export function yearOf(date: string): number {
  return parseIsoDate(date).getUTCFullYear()
}

/** First day of the month of `date`. */
export function monthStart(date: string): string {
  return `${date.slice(0, 7)}-01`
}

/** `YYYY-MM` keys of the `count` calendar months immediately before the month of `date`. */
export function precedingMonths(date: string, count: number): string[] {
  const months: string[] = []
  const first = monthStart(date)
  for (let index = count; index >= 1; index -= 1) {
    months.push(addMonths(first, -index).slice(0, 7))
  }
  return months
}

/** Splits an inclusive period by calendar year (used for the 33/14-day employer sick-pay limit). */
export function splitByYear(period: Period): Period[] {
  const parts: Period[] = []
  let cursor = period.start
  while (cursor <= period.end) {
    const yearEnd = `${yearOf(cursor)}-12-31`
    const end = minDate(yearEnd, period.end)
    parts.push({ start: cursor, end })
    cursor = dayAfter(end)
  }
  return parts
}

/**
 * Deadline "N days after event" (e.g. U art. 30a: "nie później niż 21 dni po
 * porodzie"): the event day is not counted, so the last allowed day is
 * `event + N` (assumption A-23, the usual civil-law counting rule; the
 * counting rule itself is not in the provided sources).
 */
export function deadlineAfter(event: string, days: number): string {
  return addDays(event, days)
}

/** Deadline "at least N days before X": the latest day to act is `X − N`. */
export function deadlineBefore(date: string, days: number): string {
  return addDays(date, -days)
}

export function isValidPeriod(period: Partial<Period> | undefined): period is Period {
  return Boolean(
    period && isIsoDate(period.start) && isIsoDate(period.end) && period.start <= period.end
  )
}
