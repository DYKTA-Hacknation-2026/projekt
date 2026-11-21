const PLN = new Intl.NumberFormat("pl-PL", {
  style: "currency",
  currency: "PLN",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

export function formatPln(grosze: number): string {
  return PLN.format(grosze / 100)
}

const DATE = new Intl.DateTimeFormat("pl-PL", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
})

export function formatDatePl(iso: string): string {
  return DATE.format(new Date(`${iso}T00:00:00Z`))
}

export function warsawToday(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Warsaw" }).format(
    now
  )
}
