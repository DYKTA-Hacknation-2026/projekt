import { z } from "zod"

import { calculatorInputSchema } from "@zpr/contracts/calculator"
import { importPrefillStorageSchema } from "@zpr/contracts/data-import"
import { DOCUMENT_PREFILL_STORAGE_KEY } from "@zpr/contracts/documents"
import { onboardingSchema } from "@zpr/contracts/onboarding"
import type {
  CalculatorInput,
  CalculatorMode,
  EmploymentType,
  SicknessCoverage,
} from "@zpr/domain"

import { parseDocumentPrefill } from "./document-prefill"

/**
 * One-shot handoffs between the builder, the assistant, data import, document
 * analysis and both calculator modes. Each reader validates the stored shape
 * and clears the keys, so a later visit never silently reuses stale facts.
 */

export const CALCULATOR_PREFILL_KEY = "zpr:calculator-prefill"
export const ONBOARDING_PREFILL_KEY = "zpr:onboarding-prefill"
export const IMPORT_PREFILL_KEY = "zpr:import-prefill"

type PrefillStorage = Pick<Storage, "getItem" | "removeItem" | "setItem">

const onboardingPrefillSchema = onboardingSchema
  .omit({ consents: true })
  .partial()

const calculatorPrefillStorageSchema = z.object({
  source: z.enum(["QUICK", "ADVANCED"]).default("QUICK"),
  input: calculatorInputSchema.partial(),
})

export type CalculatorPrefillSource =
  | "CALCULATOR"
  | "ONBOARDING"
  | "IMPORT"
  | "DOCUMENT"

export interface CalculatorPrefill {
  input: Partial<CalculatorInput>
  source: CalculatorPrefillSource
  notices: string[]
}

export function serializeCalculatorPrefill(
  input: CalculatorInput,
  source: "QUICK" | "ADVANCED" = "QUICK"
): string {
  return JSON.stringify({
    source,
    input: calculatorInputSchema.parse(input),
  })
}

export function storeCalculatorPrefill(
  storage: PrefillStorage,
  input: CalculatorInput,
  source: "QUICK" | "ADVANCED" = "QUICK"
): void {
  try {
    storage.setItem(CALCULATOR_PREFILL_KEY, serializeCalculatorPrefill(input, source))
  } catch {
    // Storage can be unavailable (private mode, quota). The button still works
    // without the handoff.
  }
}

/** Reads only the calculator → builder handoff, leaving other sources intact. */
export function takeCalculatorPrefillInput(
  storage: PrefillStorage
): Partial<CalculatorInput> | null {
  let raw: string | null = null
  try {
    raw = storage.getItem(CALCULATOR_PREFILL_KEY)
    if (raw) storage.removeItem(CALCULATOR_PREFILL_KEY)
  } catch {
    return null
  }
  if (!raw) return null
  const parsed = readCalculator(raw)
  return parsed?.input ?? null
}

function employment(value: string | undefined): EmploymentType | undefined {
  if (value === "EMPLOYMENT") return "EMPLOYEE"
  if (value === "MANDATE") return "CONTRACTOR"
  if (value === "SELF_EMPLOYMENT") return "BUSINESS"
  return undefined
}

function coverage(
  value: "COMPULSORY" | "VOLUNTARY" | undefined
): SicknessCoverage | undefined {
  if (value === "COMPULSORY") return "COMPULSORY"
  if (value === "VOLUNTARY") return "VOLUNTARY"
  return undefined
}

function modeFor(
  eventType: "PREGNANCY" | "BIRTH" | "ADOPTION" | "FOSTER_CARE" | undefined
): CalculatorMode | undefined {
  if (!eventType) return undefined
  if (eventType === "ADOPTION") return "ADOPTION"
  if (eventType === "FOSTER_CARE") return "FOSTER_CARE"
  return "BIRTH"
}

function readOnboarding(raw: string): CalculatorPrefill | null {
  let json: unknown
  try {
    json = JSON.parse(raw)
  } catch {
    return null
  }
  const parsed = onboardingPrefillSchema.safeParse(json)
  if (!parsed.success) return null
  const data = parsed.data
  const mode = modeFor(data.eventType)
  const employmentType = employment(data.employmentType)
  const insurance = coverage(data.coverageMode)
  const notice: string[] = []
  if (data.isPremature) {
    notice.push(
      "Kreator wskazał poród przedwczesny. W trybie zaawansowanym uzupełnij tydzień ciąży i masę urodzeniową, aby silnik sprawdził uzupełniający urlop macierzyński."
    )
  }
  if (data.employmentType === "OTHER") {
    notice.push(
      "Forma zatrudnienia „inna / brak tytułu” nie jest osobnym wariantem kalkulatora. Ustaw właściwą formę w kroku 2."
    )
  }
  return {
    source: "ONBOARDING",
    notices: [
      "Dane z kreatora zostały wstępnie wpisane. Sprawdź je przed obliczeniem.",
      ...notice,
    ],
    input: {
      ...(mode ? { mode } : {}),
      ...(mode === "BIRTH" && (data.eventDate || data.expectedDueDate)
        ? { birthDate: data.eventDate ?? data.expectedDueDate }
        : {}),
      ...(mode && mode !== "BIRTH" && (data.eventDate || data.expectedDueDate)
        ? { placementDate: data.eventDate ?? data.expectedDueDate }
        : {}),
      ...(data.childrenCount !== undefined
        ? { childrenCount: data.childrenCount }
        : {}),
      ...(data.hasZaZyciem !== undefined
        ? { hasZaZyciem: data.hasZaZyciem }
        : {}),
      ...(employmentType
        ? {
            employmentType,
            motherEmploymentType: employmentType,
          }
        : {}),
      ...(insurance ? { motherSicknessInsurance: insurance } : {}),
      ...(data.grossMonthlyIncomePln !== undefined
        ? {
            grossMonthlyIncomeGrosze: Math.round(
              data.grossMonthlyIncomePln * 100
            ),
            incomeMode: "SIMPLE" as const,
          }
        : {}),
      ...(data.insuranceStartDate
        ? { motherInsuranceStartDate: data.insuranceStartDate }
        : {}),
    },
  }
}

function readImport(raw: string): CalculatorPrefill | null {
  let json: unknown
  try {
    json = JSON.parse(raw)
  } catch {
    return null
  }
  const parsed = importPrefillStorageSchema.safeParse(json)
  if (!parsed.success) return null
  const data = parsed.data.data
  const mode = modeFor(data.eventType)
  const employmentType = employment(data.employmentType)
  const insurance = coverage(data.coverageMode)
  return {
    source: "IMPORT",
    notices: [
      "Dochód, liczba dzieci i podstawa wymiaru pochodzą z zaakceptowanego raportu pobrania. Możesz je poprawić.",
    ],
    input: {
      ...(mode ? { mode } : {}),
      ...(mode === "BIRTH" && (data.eventDate || data.expectedDueDate)
        ? { birthDate: data.eventDate ?? data.expectedDueDate }
        : {}),
      ...(mode && mode !== "BIRTH" && (data.eventDate || data.expectedDueDate)
        ? { placementDate: data.eventDate ?? data.expectedDueDate }
        : {}),
      ...(data.childrenCount !== undefined
        ? { childrenCount: data.childrenCount }
        : {}),
      ...(data.hasZaZyciem !== undefined
        ? { hasZaZyciem: data.hasZaZyciem }
        : {}),
      ...(employmentType
        ? { employmentType, motherEmploymentType: employmentType }
        : {}),
      ...(insurance ? { motherSicknessInsurance: insurance } : {}),
      ...(data.monthlyBasisGrosze !== undefined
        ? {
            monthlyBasisOverrideGrosze: data.monthlyBasisGrosze,
            incomeMode: "KNOWN_BASIS" as const,
          }
        : data.grossMonthlyIncomePln !== undefined
          ? {
              grossMonthlyIncomeGrosze: Math.round(
                data.grossMonthlyIncomePln * 100
              ),
              incomeMode: "SIMPLE" as const,
            }
          : {}),
      ...(data.insuranceStartDate
        ? { motherInsuranceStartDate: data.insuranceStartDate }
        : {}),
    },
  }
}

function readDocument(raw: string): CalculatorPrefill | null {
  const data = parseDocumentPrefill(raw)
  if (!data) return null
  return {
    source: "DOCUMENT",
    notices: [
      "Podstawa wymiaru pochodzi z zatwierdzonego dokumentu. Kalkulator nie potrąca z niej 13,71% ponownie.",
    ],
    input: {
      ...(data.monthlyBasisGrosze !== undefined
        ? {
            monthlyBasisOverrideGrosze: data.monthlyBasisGrosze,
            incomeMode: "KNOWN_BASIS" as const,
          }
        : data.incomePln !== undefined
          ? {
              grossMonthlyIncomeGrosze: Math.round(Number(data.incomePln) * 100),
              incomeMode: "SIMPLE" as const,
            }
          : {}),
      ...(data.employmentType
        ? {
            employmentType: data.employmentType,
            motherEmploymentType: data.employmentType,
          }
        : {}),
      ...(data.childrenCount !== undefined
        ? { childrenCount: data.childrenCount }
        : {}),
      ...(data.paymentOption ? { paymentOption: data.paymentOption } : {}),
    },
  }
}

function readCalculator(raw: string): CalculatorPrefill | null {
  let json: unknown
  try {
    json = JSON.parse(raw)
  } catch {
    return null
  }
  const parsed = calculatorPrefillStorageSchema.safeParse(json)
  if (!parsed.success) return null
  return {
    source: "CALCULATOR",
    notices: [
      "Dane z poprzedniego trybu kalkulatora zostały przeniesione. Sprawdź je przed obliczeniem.",
    ],
    input: parsed.data.input,
  }
}

/**
 * Returns the most specific stored prefill and clears every handoff key.
 * Precedence: calculator → builder → import → document.
 */
export function readCalculatorPrefill(storage: PrefillStorage): CalculatorPrefill | null {
  const entries: Array<[string, (raw: string) => CalculatorPrefill | null]> = [
    [CALCULATOR_PREFILL_KEY, readCalculator],
    [ONBOARDING_PREFILL_KEY, readOnboarding],
    [IMPORT_PREFILL_KEY, readImport],
    [DOCUMENT_PREFILL_STORAGE_KEY, readDocument],
  ]
  const found: CalculatorPrefill[] = []
  for (const [key, parse] of entries) {
    let raw: string | null = null
    try {
      raw = storage.getItem(key)
    } catch {
      raw = null
    }
    if (raw) {
      const parsed = parse(raw)
      if (parsed) found.push(parsed)
    }
    try {
      if (raw) storage.removeItem(key)
    } catch {
      // Ignore storage failures; the calculation itself does not depend on it.
    }
  }
  const primary = found[0]
  if (!primary) return null

  // Merge from the least to the most specific source so a basis from a
  // document survives even when the builder supplied the remaining facts.
  const input = found
    .slice()
    .reverse()
    .reduce<Partial<CalculatorInput>>(
      (merged, prefill) => ({ ...merged, ...prefill.input }),
      {}
    )
  const notices = [...new Set(found.flatMap((prefill) => prefill.notices))]
  return { input, source: primary.source, notices }
}
