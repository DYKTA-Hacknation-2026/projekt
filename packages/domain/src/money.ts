/** Integer grosze helpers. Rounding is explicit and happens once per value. */

export const GROSZE_PER_PLN = 100

export function plnToGrosze(pln: number): number {
  if (!Number.isFinite(pln)) {
    throw new TypeError("Kwota w złotych musi być liczbą.")
  }
  return Math.round(pln * GROSZE_PER_PLN)
}

export function groszeToPln(grosze: number): number {
  return Math.round(grosze) / GROSZE_PER_PLN
}

export function multiplyGrosze(amountGrosze: number, factor: number): number {
  return Math.round(amountGrosze * factor)
}

/** A month is treated as 30 days for benefit purposes (U art. 36 ust. 3). */
export function dailyBasis(basisGrosze: number): number {
  return Math.round(basisGrosze / 30)
}

export function weeklyAmount(basisGrosze: number, rate: number): number {
  return Math.round((basisGrosze * rate * 7) / 30)
}

export function daysAmount(
  basisGrosze: number,
  rate: number,
  days: number
): number {
  return Math.round((basisGrosze * rate * days) / 30)
}
