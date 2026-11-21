/** Pure ISO-date helpers (no clock access). */

const MS_PER_DAY = 86_400_000

export function parseIsoDate(value: string | undefined): number | null {
  if (!value) return null
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return null
  const [, y, m, d] = match
  const time = Date.UTC(Number(y), Number(m) - 1, Number(d))
  return Number.isNaN(time) ? null : time
}

export function daysBetween(fromMs: number, toMs: number): number {
  return Math.round((toMs - fromMs) / MS_PER_DAY)
}

/** Timestamp of the `years`-th birthday of someone born at `birthMs`. */
export function addYears(birthMs: number, years: number): number {
  const date = new Date(birthMs)
  return Date.UTC(
    date.getUTCFullYear() + years,
    date.getUTCMonth(),
    date.getUTCDate()
  )
}
