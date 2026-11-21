/**
 * Calendar-date helpers with PlainDate semantics (YYYY-MM-DD, no time zone).
 * Durations are calendar days; one week is seven days (KP art. 183¹ § 1).
 */

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

export function isIsoDate(value: unknown): value is string {
  if (typeof value !== "string" || !ISO_DATE.test(value)) return false
  const date = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value)
}

export function parseIsoDate(value: string): Date {
  if (!isIsoDate(value)) {
    throw new RangeError(`Nieprawidłowa data: ${value}`)
  }
  return new Date(`${value}T00:00:00Z`)
}

export function addDays(value: string, days: number): string {
  const date = parseIsoDate(value)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

/** Adds calendar months, clamping to the last day of the target month. */
export function addMonths(value: string, months: number): string {
  const date = parseIsoDate(value)
  const day = date.getUTCDate()
  date.setUTCDate(1)
  date.setUTCMonth(date.getUTCMonth() + months)
  const lastDay = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)
  ).getUTCDate()
  date.setUTCDate(Math.min(day, lastDay))
  return date.toISOString().slice(0, 10)
}

export function daysBetween(start: string, end: string): number {
  return Math.round(
    (parseIsoDate(end).getTime() - parseIsoDate(start).getTime()) / 86_400_000
  )
}
