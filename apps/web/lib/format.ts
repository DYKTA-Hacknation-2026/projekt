const currencyFormatter = new Intl.NumberFormat("pl-PL", {
  style: "currency",
  currency: "PLN",
  maximumFractionDigits: 2,
})

const dateFormatter = new Intl.DateTimeFormat("pl-PL", {
  day: "2-digit",
  month: "long",
  year: "numeric",
})

const shortDateFormatter = new Intl.DateTimeFormat("pl-PL", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
})

const numberFormatter = new Intl.NumberFormat("pl-PL")

export function formatPln(grosze: number): string {
  return currencyFormatter.format(grosze / 100)
}

export function formatPlnFromPln(pln: number): string {
  return currencyFormatter.format(pln)
}

export function formatDate(value: Date | string | null | undefined): string {
  if (!value) return "—"
  const date = typeof value === "string" ? new Date(`${value}T00:00:00`) : value
  if (Number.isNaN(date.getTime())) return "—"
  return dateFormatter.format(date)
}

export function formatShortDate(value: Date | string | null | undefined): string {
  if (!value) return "—"
  const date = typeof value === "string" ? new Date(`${value}T00:00:00`) : value
  if (Number.isNaN(date.getTime())) return "—"
  return shortDateFormatter.format(date)
}

export function formatNumber(value: number): string {
  return numberFormatter.format(value)
}

export function formatPercent(fraction: number): string {
  return new Intl.NumberFormat("pl-PL", {
    style: "percent",
    maximumFractionDigits: 1,
  }).format(fraction)
}

export function addDays(value: string, days: number): string {
  const date = new Date(`${value}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

export function addWeeks(value: string, weeks: number): string {
  return addDays(value, weeks * 7)
}

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}
