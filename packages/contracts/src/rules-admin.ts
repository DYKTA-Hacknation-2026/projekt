import { z } from "zod"

/**
 * Admin editor for legal parameters (FR-ADM-01).
 *
 * The catalogue below is the single description of what an administrator may
 * change for each rule code stored in `legal.legal_rule_versions`. The API
 * validates values with it and the web panel renders the same fields, so a new
 * editable parameter only needs an entry here (plus the value in the DB).
 */

export const RULE_VERIFICATION_STATUSES = [
  "VERIFIED",
  "PROPOSED",
  "UNVERIFIED",
] as const

export type RuleVerificationStatus = (typeof RULE_VERIFICATION_STATUSES)[number]

export type RuleFieldType =
  "number" | "percent" | "money" | "boolean" | "weeks" | "pool"

export interface RuleFieldMeta {
  /** Key in the `parameters` JSON object. */
  key: string
  label: string
  type: RuleFieldType
  /** Display unit, e.g. `dni`, `tyg.`, `%`, `zł`. */
  unit?: string
  hint?: string
  /** Lower bound in the stored unit (percent: 0, money: grosze). */
  min?: number
  /** Upper bound in the stored unit. */
  max?: number
  integer?: boolean
  /** `money` only: an empty value is stored as `null` (unknown Q-29 value). */
  allowNull?: boolean
  /** `weeks` / `pool`: labels for the nested keys. */
  objectLabels?: Record<string, string>
}

export interface RuleEditorMeta {
  summary: string
  fields: RuleFieldMeta[]
}

const WEEKS_LABELS: Record<string, string> = {
  "1": "1 dziecko",
  "2": "2 dzieci",
  "3": "3 dzieci",
  "4": "4 dzieci",
  "5": "5 dzieci",
}

const POOL_LABELS: Record<string, string> = {
  single: "Jedno dziecko",
  multiple: "Bliźnięta lub więcej",
  zaZyciemSingle: "Jedno dziecko · Za życiem",
  zaZyciemMultiple: "Bliźnięta lub więcej · Za życiem",
}

export const RULE_EDITOR_META: Record<string, RuleEditorMeta> = {
  "LR-123": {
    summary:
      "Wymiar urlopu macierzyńskiego zależy od liczby dzieci urodzonych przy porodzie.",
    fields: [
      {
        key: "weeksByChildren",
        label: "Wymiar urlopu według liczby dzieci",
        type: "weeks",
        unit: "tyg.",
        min: 1,
        max: 52,
        integer: true,
        objectLabels: WEEKS_LABELS,
        hint: "KP art. 180 § 1–2. Wartości dotyczą jednego porodu.",
      },
      {
        key: "maxPreBirthWeeks",
        label: "Maksymalny urlop przed porodem",
        type: "number",
        unit: "tyg.",
        min: 0,
        max: 26,
        integer: true,
      },
      {
        key: "motherPersonalWeeks",
        label: "Część osobista matki",
        type: "number",
        unit: "tyg.",
        min: 0,
        max: 52,
        integer: true,
        hint: "Część, której matka nie może przenieść na drugiego rodzica.",
      },
    ],
  },
  "LR-127": {
    summary:
      "Wspólna pula urlopu rodzicielskiego, część niezbywalna i limity łączenia z pracą.",
    fields: [
      {
        key: "pool",
        label: "Pula urlopu rodzicielskiego",
        type: "pool",
        unit: "tyg.",
        min: 1,
        max: 104,
        integer: true,
        objectLabels: POOL_LABELS,
        hint: "KP art. 182¹a. Wariant „Za życiem” dotyczy dzieci z zaświadczeniem.",
      },
      {
        key: "nonTransferable",
        label: "Część niezbywalna dla każdego rodzica",
        type: "number",
        unit: "tyg.",
        min: 0,
        max: 52,
        integer: true,
      },
      {
        key: "maxWorkFraction",
        label: "Maksymalny wymiar pracy podczas urlopu",
        type: "percent",
        min: 0,
        max: 1,
        hint: "Np. 50% oznacza pół etatu.",
      },
      {
        key: "maxParts",
        label: "Maksymalna liczba części urlopu",
        type: "number",
        unit: "części",
        min: 1,
        max: 20,
        integer: true,
      },
      {
        key: "deadlineChildAgeYears",
        label: "Termin wykorzystania — wiek dziecka",
        type: "number",
        unit: "lat",
        min: 0,
        max: 18,
        integer: true,
      },
    ],
  },
  "LR-130": {
    summary:
      "Procenty zasiłku macierzyńskiego i rodzicielskiego oraz stawka stała 81,5%.",
    fields: [
      {
        key: "maternity",
        label: "Stawka zasiłku macierzyńskiego",
        type: "percent",
        min: 0,
        max: 1,
        hint: "100% podstawy wymiaru.",
      },
      {
        key: "parental",
        label: "Stawka zasiłku rodzicielskiego",
        type: "percent",
        min: 0,
        max: 1,
        hint: "Stawka podstawowa, np. 70%.",
      },
      {
        key: "flat81_5",
        label: "Stawka stała (wniosek o 81,5%)",
        type: "percent",
        min: 0,
        max: 1,
        hint: "U art. 30a. Dotyczy wniosku złożonego w terminie.",
      },
    ],
  },
  "LR-112": {
    summary:
      "Podstawa wymiaru zasiłku: okres odniesienia, potrącenie składki i dzielnik.",
    fields: [
      {
        key: "referenceMonths",
        label: "Okres odniesienia",
        type: "number",
        unit: "mies.",
        min: 1,
        max: 36,
        integer: true,
      },
      {
        key: "contributionDeduction",
        label: "Potrącenie składki chorobowej",
        type: "percent",
        min: 0,
        max: 1,
      },
      {
        key: "dailyDivisor",
        label: "Dzielnik podstawy dziennej",
        type: "number",
        min: 1,
        max: 31,
        integer: true,
      },
      {
        key: "roundingVerified",
        label: "Zaokrąglenia zweryfikowane",
        type: "boolean",
        hint: "Odznacz, jeśli sposób zaokrągleń nie został potwierdzony (Q-15).",
      },
    ],
  },
  "LR-133": {
    summary: "Wymiar i zasady wykorzystania urlopu ojcowskiego.",
    fields: [
      {
        key: "days",
        label: "Wymiar urlopu",
        type: "number",
        unit: "dni",
        min: 0,
        max: 60,
        integer: true,
      },
      {
        key: "maxParts",
        label: "Maksymalna liczba części",
        type: "number",
        unit: "części",
        min: 1,
        max: 10,
        integer: true,
      },
      {
        key: "minPartDays",
        label: "Minimalna długość części",
        type: "number",
        unit: "dni",
        min: 1,
        max: 60,
        integer: true,
      },
      {
        key: "deadlineMonths",
        label: "Termin na złożenie wniosku",
        type: "number",
        unit: "mies.",
        min: 0,
        max: 36,
        integer: true,
      },
    ],
  },
  "LR-100": {
    summary:
      "Okresy wyczekiwania, dni płacone przez pracodawcę i maksymalny okres zasiłkowy.",
    fields: [
      {
        key: "compulsoryDays",
        label: "Wyczekiwanie — ubezpieczenie obowiązkowe",
        type: "number",
        unit: "dni",
        min: 0,
        max: 365,
        integer: true,
      },
      {
        key: "voluntaryDays",
        label: "Wyczekiwanie — ubezpieczenie dobrowolne",
        type: "number",
        unit: "dni",
        min: 0,
        max: 365,
        integer: true,
      },
      {
        key: "gapToleranceDays",
        label: "Tolerancja przerwy w ubezpieczeniu",
        type: "number",
        unit: "dni",
        min: 0,
        max: 365,
        integer: true,
      },
      {
        key: "dayOneGraduateDays",
        label: "Absolwent — okres liczony od pierwszego dnia",
        type: "number",
        unit: "dni",
        min: 0,
        max: 365,
        integer: true,
      },
      {
        key: "employerPaidDays",
        label: "Dni płacone przez pracodawcę",
        type: "number",
        unit: "dni",
        min: 0,
        max: 365,
        integer: true,
      },
      {
        key: "employerPaidDaysAfter50",
        label: "Dni płacone przez pracodawcę (50+)",
        type: "number",
        unit: "dni",
        min: 0,
        max: 365,
        integer: true,
      },
      {
        key: "sicknessMaxPeriodDays",
        label: "Maksymalny okres zasiłkowy",
        type: "number",
        unit: "dni",
        min: 0,
        max: 730,
        integer: true,
      },
    ],
  },
  "LR-132": {
    summary:
      "Minimalna kwota zasiłku macierzyńskiego (podwyższenie do świadczenia rodzicielskiego).",
    fields: [
      {
        key: "parentalBenefitAmountGrosze",
        label: "Kwota świadczenia rodzicielskiego",
        type: "money",
        unit: "zł",
        min: 0,
        allowNull: true,
        hint: "Puste pole = wartość nieznana (Q-29). Wynik będzie oznaczony jako niezweryfikowany.",
      },
      {
        key: "blocking",
        label: "Brak wartości blokuje wynik",
        type: "boolean",
      },
    ],
  },
  "LR-134": {
    summary:
      "Terminy wniosków urlopowych, przekazania dokumentów do ZUS i wypłaty zasiłku.",
    fields: [
      {
        key: "maternityPreBirthRequestDays",
        label: "Wniosek o urlop przed porodem",
        type: "number",
        unit: "dni",
        min: 0,
        max: 365,
        integer: true,
      },
      {
        key: "maternityResignationNoticeDays",
        label: "Rezygnacja z urlopu — wypowiedzenie",
        type: "number",
        unit: "dni",
        min: 0,
        max: 365,
        integer: true,
      },
      {
        key: "flatRateApplicationDays",
        label: "Wniosek o stawkę 81,5%",
        type: "number",
        unit: "dni",
        min: 0,
        max: 365,
        integer: true,
      },
      {
        key: "parentalRequestNoticeDays",
        label: "Wniosek o urlop rodzicielski",
        type: "number",
        unit: "dni",
        min: 0,
        max: 365,
        integer: true,
      },
      {
        key: "workCombinationNoticeDays",
        label: "Wniosek o łączenie urlopu z pracą",
        type: "number",
        unit: "dni",
        min: 0,
        max: 365,
        integer: true,
      },
      {
        key: "paternityRequestNoticeDays",
        label: "Wniosek o urlop ojcowski",
        type: "number",
        unit: "dni",
        min: 0,
        max: 365,
        integer: true,
      },
      {
        key: "adoptionRequestDays",
        label: "Wniosek o urlop adopcyjny",
        type: "number",
        unit: "dni",
        min: 0,
        max: 365,
        integer: true,
      },
      {
        key: "adoptionStartMaxDays",
        label: "Maksymalne odroczenie startu urlopu adopcyjnego",
        type: "number",
        unit: "dni",
        min: 0,
        max: 365,
        integer: true,
      },
      {
        key: "employerForwardingDays",
        label: "Przekazanie dokumentów do ZUS",
        type: "number",
        unit: "dni",
        min: 0,
        max: 365,
        integer: true,
      },
      {
        key: "zusPaymentDays",
        label: "Termin wypłaty zasiłku",
        type: "number",
        unit: "dni",
        min: 0,
        max: 365,
        integer: true,
      },
      {
        key: "limitationMonths",
        label: "Przedawnienie roszczeń",
        type: "number",
        unit: "mies.",
        min: 0,
        max: 120,
        integer: true,
      },
    ],
  },
  "LR-101": {
    summary:
      "Próg zadłużenia składkowego, wygaśnięcie prawa i wypłata po spłacie.",
    fields: [
      {
        key: "thresholdShareOfMinWage",
        label: "Próg zadłużenia",
        type: "percent",
        min: 0,
        max: 1,
        hint: "Udział minimalnego wynagrodzenia, np. 1%.",
      },
      {
        key: "expiryMonths",
        label: "Wygaśnięcie prawa po braku spłaty",
        type: "number",
        unit: "mies.",
        min: 0,
        max: 120,
        integer: true,
      },
      {
        key: "payAfterRepaymentDays",
        label: "Wypłata po spłacie zadłużenia",
        type: "number",
        unit: "dni",
        min: 0,
        max: 365,
        integer: true,
      },
    ],
  },
  "LR-102": {
    summary:
      "Próg liczby ubezpieczonych decyduje, czy zasiłek wypłaca płatnik, czy ZUS.",
    fields: [
      {
        key: "selfPayThreshold",
        label: "Próg liczby ubezpieczonych",
        type: "number",
        unit: "osób",
        min: 0,
        max: 10_000,
        integer: true,
      },
    ],
  },
}

/** One rule version as exposed to the admin panel. */
export interface AdminRuleVersion {
  id: string
  ruleId: string
  code: string
  title: string
  description: string
  category: string
  legalReference: string
  version: string
  effectiveFrom: string
  effectiveTo: string | null
  verificationStatus: RuleVerificationStatus
  parameters: Record<string, unknown>
  sourceUrl: string | null
  notes: string | null
  createdAt: string
}

export interface AdminRuleGroup {
  ruleId: string
  code: string
  title: string
  description: string
  category: string
  legalReference: string
  /** Version in force on the panel date (`asOf`). */
  current: AdminRuleVersion | null
  /** Newest first. */
  versions: AdminRuleVersion[]
  /** First day a new version may start (the day after the newest version). */
  nextEffectiveFrom: string
  suggestedVersion: string
}

export interface AdminRulesData {
  asOf: string
  rules: AdminRuleGroup[]
}

export const saveRuleVersionSchema = z.object({
  ruleId: z.string().min(1),
  effectiveFrom: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Data musi być w formacie RRRR-MM-DD."),
  verificationStatus: z.enum(RULE_VERIFICATION_STATUSES),
  sourceUrl: z.string().max(500).optional(),
  notes: z.string().max(1000).optional(),
  parameters: z.record(z.string(), z.unknown()),
})

export type SaveRuleVersionInput = z.infer<typeof saveRuleVersionSchema>

export class RuleParameterError extends Error {
  readonly fieldErrors: Record<string, string>

  constructor(fieldErrors: Record<string, string>) {
    super("Nieprawidłowe wartości parametrów reguły.")
    this.name = "RuleParameterError"
    this.fieldErrors = fieldErrors
  }
}

function numberField(field: RuleFieldMeta, value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error("musi być liczbą")
  }
  if (field.integer && !Number.isInteger(value)) {
    throw new Error("musi być liczbą całkowitą")
  }
  if (field.min !== undefined && value < field.min) {
    throw new Error(`nie może być mniejsze niż ${field.min}`)
  }
  if (field.max !== undefined && value > field.max) {
    throw new Error(`nie może być większe niż ${field.max}`)
  }
  return value
}

function objectField(
  field: RuleFieldMeta,
  value: unknown
): Record<string, number> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("musi być obiektem")
  }
  const source = value as Record<string, unknown>
  const keys = Object.keys(field.objectLabels ?? {})
  const result: Record<string, number> = {}
  for (const key of keys) {
    const entry = source[key]
    if (typeof entry !== "number" || !Number.isFinite(entry)) {
      throw new Error(
        `pole „${field.objectLabels?.[key] ?? key}” musi być liczbą`
      )
    }
    if (field.integer && !Number.isInteger(entry)) {
      throw new Error(
        `pole „${field.objectLabels?.[key] ?? key}” musi być liczbą całkowitą`
      )
    }
    if (field.min !== undefined && entry < field.min) {
      throw new Error(
        `pole „${field.objectLabels?.[key] ?? key}” nie może być mniejsze niż ${field.min}`
      )
    }
    if (field.max !== undefined && entry > field.max) {
      throw new Error(
        `pole „${field.objectLabels?.[key] ?? key}” nie może być większe niż ${field.max}`
      )
    }
    result[key] = entry
  }
  return result
}

/**
 * Validates the editable fields of a rule and returns canonical values
 * (percentages 0–1, money in grosze). Unknown keys are ignored; the caller
 * merges the result with the existing version.
 */
export function normalizeRuleParameters(
  code: string,
  parameters: Record<string, unknown>
): Record<string, unknown> {
  const meta = RULE_EDITOR_META[code]
  if (!meta) {
    throw new RuleParameterError({ _rule: `Reguła ${code} nie ma edytora.` })
  }

  const errors: Record<string, string> = {}
  const result: Record<string, unknown> = {}

  for (const field of meta.fields) {
    const value = parameters[field.key]
    try {
      if (field.type === "boolean") {
        if (typeof value !== "boolean") throw new Error("musi być Tak lub Nie")
        result[field.key] = value
      } else if (field.type === "money") {
        if (value === null && field.allowNull) {
          result[field.key] = null
        } else {
          if (typeof value !== "number" || !Number.isFinite(value)) {
            throw new Error("musi być kwotą")
          }
          if (field.integer && !Number.isInteger(value)) {
            throw new Error("musi być kwotą w groszach")
          }
          if (field.min !== undefined && value < field.min) {
            throw new Error(`nie może być mniejsze niż ${field.min} gr`)
          }
          result[field.key] = value
        }
      } else if (field.type === "weeks" || field.type === "pool") {
        result[field.key] = objectField(field, value)
      } else {
        result[field.key] = numberField(field, value)
      }
    } catch (error) {
      errors[field.key] =
        error instanceof Error ? error.message : "błędna wartość"
    }
  }

  if (Object.keys(errors).length > 0) throw new RuleParameterError(errors)
  return result
}
