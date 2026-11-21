/**
 * Exact rational arithmetic on BigInt for authoritative money calculations.
 *
 * Benefit amounts are defined as `basis × rate × days / 30` (U art. 11 ust. 4–5,
 * art. 36 ust. 3, art. 31 ust. 5). The divisor 30 makes most daily amounts
 * non-terminating decimals, so a decimal type would still round silently.
 * A rational keeps every intermediate value exact; rounding happens once, at
 * the point the rule set says, and is recorded in the calculation trace.
 *
 * Numbers are accepted only when they are safe integers. Fractions come in as
 * decimal strings ("0.815", "13.71%") or as `n/d` strings ("1/2"), never as
 * binary floating-point values.
 */

export type RoundingMode = "HALF_UP" | "FLOOR" | "CEIL"

export type RatioInput = Ratio | bigint | number | string

function abs(value: bigint): bigint {
  return value < 0n ? -value : value
}

function gcd(a: bigint, b: bigint): bigint {
  let x = abs(a)
  let y = abs(b)
  while (y !== 0n) {
    const t = x % y
    x = y
    y = t
  }
  return x === 0n ? 1n : x
}

const DECIMAL = /^([+-])?(\d+)(?:\.(\d+))?(%)?$/
const FRACTION = /^([+-])?(\d+)\/(\d+)$/

export class Ratio {
  readonly num: bigint
  readonly den: bigint

  private constructor(num: bigint, den: bigint) {
    if (den === 0n) throw new RangeError("Dzielenie przez zero.")
    const sign = den < 0n ? -1n : 1n
    const divisor = gcd(num, den)
    this.num = (sign * num) / divisor
    this.den = (sign * den) / divisor
  }

  static of(value: RatioInput): Ratio {
    if (value instanceof Ratio) return value
    if (typeof value === "bigint") return new Ratio(value, 1n)
    if (typeof value === "number") {
      if (!Number.isSafeInteger(value)) {
        throw new TypeError(
          `Liczba ${value} nie jest bezpieczną liczbą całkowitą. Podaj ułamek jako tekst, np. "0.815".`
        )
      }
      return new Ratio(BigInt(value), 1n)
    }
    const text = value.trim().replace(",", ".")
    const fraction = FRACTION.exec(text)
    if (fraction) {
      const sign = fraction[1] === "-" ? -1n : 1n
      return new Ratio(sign * BigInt(fraction[2]!), BigInt(fraction[3]!))
    }
    const decimal = DECIMAL.exec(text)
    if (!decimal) throw new TypeError(`Nieprawidłowa liczba dziesiętna: "${value}".`)
    const sign = decimal[1] === "-" ? -1n : 1n
    const fractionDigits = decimal[3] ?? ""
    const scale = 10n ** BigInt(fractionDigits.length)
    const percent = decimal[4] ? 100n : 1n
    return new Ratio(
      sign * (BigInt(decimal[2]!) * scale + BigInt(fractionDigits || "0")),
      scale * percent
    )
  }

  static fraction(num: bigint | number, den: bigint | number): Ratio {
    return Ratio.of(num).div(den)
  }

  add(other: RatioInput): Ratio {
    const o = Ratio.of(other)
    return new Ratio(this.num * o.den + o.num * this.den, this.den * o.den)
  }

  sub(other: RatioInput): Ratio {
    const o = Ratio.of(other)
    return new Ratio(this.num * o.den - o.num * this.den, this.den * o.den)
  }

  mul(other: RatioInput): Ratio {
    const o = Ratio.of(other)
    return new Ratio(this.num * o.num, this.den * o.den)
  }

  div(other: RatioInput): Ratio {
    const o = Ratio.of(other)
    if (o.num === 0n) throw new RangeError("Dzielenie przez zero.")
    return new Ratio(this.num * o.den, this.den * o.num)
  }

  cmp(other: RatioInput): -1 | 0 | 1 {
    const o = Ratio.of(other)
    const left = this.num * o.den
    const right = o.num * this.den
    return left < right ? -1 : left > right ? 1 : 0
  }

  eq(other: RatioInput): boolean {
    return this.cmp(other) === 0
  }

  lt(other: RatioInput): boolean {
    return this.cmp(other) < 0
  }

  lte(other: RatioInput): boolean {
    return this.cmp(other) <= 0
  }

  gt(other: RatioInput): boolean {
    return this.cmp(other) > 0
  }

  gte(other: RatioInput): boolean {
    return this.cmp(other) >= 0
  }

  isZero(): boolean {
    return this.num === 0n
  }

  isNegative(): boolean {
    return this.num < 0n
  }

  isInteger(): boolean {
    return this.den === 1n
  }

  /** Rounds to an integer with an explicit mode. HALF_UP rounds ties away from zero. */
  round(mode: RoundingMode = "HALF_UP"): bigint {
    const { num, den } = this
    const quotient = num / den // truncates toward zero
    const remainder = num % den
    if (remainder === 0n) return quotient
    const negative = num < 0n
    switch (mode) {
      case "FLOOR":
        return negative ? quotient - 1n : quotient
      case "CEIL":
        return negative ? quotient : quotient + 1n
      case "HALF_UP": {
        const twice = abs(remainder) * 2n
        if (twice >= den) return negative ? quotient - 1n : quotient + 1n
        return quotient
      }
    }
  }

  floor(): bigint {
    return this.round("FLOOR")
  }

  ceil(): bigint {
    return this.round("CEIL")
  }

  /** Decimal representation with `scale` fraction digits (rounded HALF_UP). */
  toFixed(scale: number): string {
    const factor = 10n ** BigInt(scale)
    const scaled = this.mul(factor).round("HALF_UP")
    const negative = scaled < 0n
    const digits = abs(scaled).toString().padStart(scale + 1, "0")
    const integer = digits.slice(0, digits.length - scale) || "0"
    const fraction = scale > 0 ? `.${digits.slice(digits.length - scale)}` : ""
    return `${negative ? "-" : ""}${integer}${fraction}`
  }

  /** Exact `n/d` form, used in traces so a reviewer can re-check the arithmetic. */
  toFraction(): string {
    return this.den === 1n ? this.num.toString() : `${this.num}/${this.den}`
  }

  /** Percentage text for rates, e.g. 0.815 → "81,5%". */
  toPercent(): string {
    const text = this.mul(100).toFixed(2).replace(/\.?0+$/, "")
    return `${text.replace(".", ",")}%`
  }

  toJSON(): string {
    return this.toFraction()
  }
}

export const ZERO = Ratio.of(0)
export const ONE = Ratio.of(1)

export function ratio(value: RatioInput): Ratio {
  return Ratio.of(value)
}

export function minRatio(a: Ratio, b: Ratio): Ratio {
  return a.lte(b) ? a : b
}

export function maxRatio(a: Ratio, b: Ratio): Ratio {
  return a.gte(b) ? a : b
}

export function sumRatios(values: readonly Ratio[]): Ratio {
  return values.reduce((sum, value) => sum.add(value), ZERO)
}

/** Converts a JS number that a user typed (e.g. 0.5) into an exact ratio via its shortest decimal form. */
export function ratioFromUserNumber(value: number | string): Ratio {
  if (typeof value === "string") return Ratio.of(value)
  if (!Number.isFinite(value)) throw new TypeError("Wartość musi być liczbą skończoną.")
  // Number#toString yields the shortest decimal that round-trips, i.e. what was typed.
  const text = value.toString()
  if (/e/i.test(text)) throw new TypeError(`Wartość ${text} ma zbyt wiele cyfr.`)
  return Ratio.of(text)
}

/** Grosze helpers. Amounts leave the engine as safe integers. */
export function groszeToNumber(value: bigint): number {
  const result = Number(value)
  if (!Number.isSafeInteger(result)) throw new RangeError("Kwota przekracza zakres.")
  return result
}

export function formatGrosze(value: bigint | number): string {
  const grosze = typeof value === "number" ? BigInt(value) : value
  const negative = grosze < 0n
  const absolute = abs(grosze)
  const zl = (absolute / 100n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ")
  const gr = (absolute % 100n).toString().padStart(2, "0")
  return `${negative ? "-" : ""}${zl},${gr} zł`
}
