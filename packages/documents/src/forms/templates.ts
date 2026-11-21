import type {
  BasisKind,
  DocumentFormCode,
  ExtractedField,
  FieldType,
  SemanticKey,
} from "@zpr/contracts/documents"

/**
 * Field templates per form code. The data items follow the scope of
 * R1316 (Dz.U. 2026 poz. 1316) annex 2 (Z-3), annex 3 (Z-3a) and annex 6
 * (ZAM). The exact print layout of the ZUS templates is not available to us
 * (Q-20), so the label patterns are deliberately tolerant: they match the
 * label text ("Podstawa wymiaru zasiłku…") rather than box numbers.
 *
 * Each field declares a stable `semanticKey` used by the facts mapping —
 * never the Polish label.
 */

export interface FieldOption {
  value: string
  label: string
  /** Folded-text pattern recognising the option in free text. */
  match: RegExp
}

export interface FieldSpec {
  key: string
  label: string
  type: FieldType
  semanticKey?: SemanticKey
  basisKind?: BasisKind
  required?: boolean
  /** Folded AcroForm names (see `foldFieldName`). */
  acroNames: string[]
  /** Folded label patterns; the value is the text after the colon on that line. */
  labels: RegExp[]
  options?: FieldOption[]
  /** Never transferred automatically, even when confirmed. */
  informational?: boolean
}

export const EMPLOYMENT_OPTIONS: FieldOption[] = [
  { value: "EMPLOYMENT", label: "Umowa o pracę (pracownik)", match: /UMOW[AY] O PRACE|PRACOWNIK|STOSUNEK PRACY/ },
  { value: "MANDATE", label: "Umowa zlecenia", match: /ZLECENI/ },
  { value: "SELF_EMPLOYMENT", label: "Działalność gospodarcza", match: /DZIALALNOSC|PRZEDSIEBIOR|SAMOZATRUDN/ },
]

const SICKNESS_OPTIONS: FieldOption[] = [
  { value: "COMPULSORY", label: "Obowiązkowe", match: /OBOWIAZKOW/ },
  { value: "VOLUNTARY", label: "Dobrowolne", match: /DOBROWOLN/ },
  { value: "NONE", label: "Brak ubezpieczenia chorobowego", match: /^BRAK|NIE PODLEGA/ },
]

const ROLE_OPTIONS: FieldOption[] = [
  { value: "MOTHER", label: "Matka dziecka", match: /MATKA|MATKI/ },
  { value: "FATHER", label: "Ojciec dziecka", match: /OJCIEC|OJCA/ },
]

const BENEFIT_OPTIONS: FieldOption[] = [
  { value: "MATERNITY", label: "Zasiłek macierzyński", match: /MACIERZYNSK/ },
  { value: "PARENTAL", label: "Zasiłek za urlop rodzicielski", match: /RODZICIELSK/ },
  { value: "PATERNITY", label: "Zasiłek za urlop ojcowski", match: /OJCOWSK/ },
  { value: "SICKNESS", label: "Zasiłek chorobowy", match: /CHOROBOW/ },
]

const label = (...parts: string[]) => parts.map((part) => new RegExp(part))

const person: FieldSpec[] = [
  { key: "imie", label: "Imię", type: "TEXT", semanticKey: "firstName", acroNames: ["IMIE", "IMIEUBEZPIECZONEGO"], labels: label("^(?:\\d+\\.\\s*)?IMIE(?: \\(IMIONA\\))?(?! I NAZWISKO)") },
  { key: "nazwisko", label: "Nazwisko", type: "TEXT", semanticKey: "lastName", acroNames: ["NAZWISKO", "NAZWISKOUBEZPIECZONEGO"], labels: label("^(?:\\d+\\.\\s*)?NAZWISKO") },
  { key: "pesel", label: "PESEL", type: "TEXT", semanticKey: "pesel", acroNames: ["PESEL"], labels: label("^(?:\\d+\\.\\s*)?(?:NUMER )?PESEL") },
]

const insurance = (required: boolean): FieldSpec[] => [
  {
    key: "tytulUbezpieczenia",
    label: "Tytuł ubezpieczenia",
    type: "ENUM",
    semanticKey: "employmentType",
    required,
    acroNames: ["TYTULUBEZPIECZENIA", "TYTUL", "RODZAJUMOWY"],
    labels: label("TYTUL (?:DO )?UBEZPIECZENIA", "RODZAJ UMOWY", "FORMA ZATRUDNIENIA"),
    options: EMPLOYMENT_OPTIONS,
  },
  {
    key: "poczatekUbezpieczenia",
    label: "Początek ubezpieczenia chorobowego",
    type: "DATE",
    semanticKey: "insuranceStartDate",
    acroNames: ["POCZATEKUBEZPIECZENIA", "UBEZPIECZENIEOD", "DATAOBJECIA"],
    labels: label("(?:POCZATEK|DATA OBJECIA)[^:]*UBEZPIECZ", "UBEZPIECZENIE CHOROBOWE OD", "UBEZPIECZONY OD"),
  },
  {
    key: "koniecUbezpieczenia",
    label: "Koniec ubezpieczenia chorobowego",
    type: "DATE",
    semanticKey: "insuranceEndDate",
    acroNames: ["KONIECUBEZPIECZENIA", "UBEZPIECZENIEDO", "DATAUSTANIA"],
    labels: label("(?:KONIEC|DATA USTANIA)[^:]*UBEZPIECZ", "UBEZPIECZENIE CHOROBOWE DO"),
  },
]

const basis: FieldSpec = {
  key: "podstawa",
  label: "Podstawa wymiaru zasiłku (miesięczna)",
  type: "MONEY",
  semanticKey: "monthlyBasisGrosze",
  basisKind: "NET_BASIS",
  acroNames: ["PODSTAWA", "PODSTAWAWYMIARU", "PODSTAWAWYMIARUZASILKU", "PRZECIETNEWYNAGRODZENIE"],
  labels: label("PODSTAWA WYMIARU", "PRZECIETNE MIESIECZNE WYNAGRODZENIE[^:]*PODSTAW"),
}

const gross: FieldSpec = {
  key: "wynagrodzenieBrutto",
  label: "Wynagrodzenie brutto (miesięczne)",
  type: "MONEY",
  semanticKey: "grossMonthlyGrosze",
  basisKind: "GROSS",
  acroNames: ["WYNAGRODZENIEBRUTTO", "PRZYCHODBRUTTO", "BRUTTO"],
  labels: label("WYNAGRODZENIE BRUTTO", "PRZYCHOD BRUTTO", "MIESIECZNE WYNAGRODZENIE \\(BRUTTO\\)"),
}

/** An amount whose nature (gross vs basis) the label does not settle. Never transferred. */
const ambiguousAmount: FieldSpec = {
  key: "kwotaNiejednoznaczna",
  label: "Kwota (nie wiadomo, czy brutto, czy podstawa)",
  type: "MONEY",
  informational: true,
  acroNames: ["KWOTA", "WYNAGRODZENIE"],
  labels: label("^(?:\\d+\\.\\s*)?KWOTA(?! ZASILKU)", "^(?:\\d+\\.\\s*)?WYNAGRODZENIE(?! BRUTTO)(?![^:]*PODSTAW)"),
}

const payerSize: FieldSpec = {
  key: "liczbaUbezpieczonych",
  label: "Liczba osób zgłoszonych do ubezpieczenia chorobowego (30 listopada)",
  type: "INTEGER",
  semanticKey: "payerSize",
  acroNames: ["LICZBAUBEZPIECZONYCH", "LICZBAZGLOSZONYCH"],
  labels: label("LICZBA (?:OSOB|UBEZPIECZONYCH)[^:]*ZGLOSZON", "LICZBA UBEZPIECZONYCH"),
}

const documentDate: FieldSpec = {
  key: "dataDokumentu",
  label: "Data wystawienia / złożenia",
  type: "DATE",
  semanticKey: "documentDate",
  acroNames: ["DATA", "DATAWYSTAWIENIA", "DATAZLOZENIA", "DATAWNIOSKU"],
  labels: label("DATA (?:WYSTAWIENIA|ZLOZENIA|WNIOSKU|SPORZADZENIA)"),
}

const eventDates = (requiredEvent: boolean): FieldSpec[] => [
  {
    key: "dataPorodu",
    label: "Data porodu (urodzenia dziecka)",
    type: "DATE",
    semanticKey: "eventDate",
    required: requiredEvent,
    acroNames: ["DATAPORODU", "DATAURODZENIADZIECKA"],
    labels: label("DATA (?:PORODU|URODZENIA DZIECKA)"),
  },
  {
    key: "terminPorodu",
    label: "Przewidywany termin porodu",
    type: "DATE",
    semanticKey: "expectedDueDate",
    acroNames: ["TERMINPORODU", "PRZEWIDYWANYTERMINPORODU"],
    labels: label("(?:PRZEWIDYWANY TERMIN|PRZEWIDYWANA DATA) PORODU"),
  },
]

const benefitKind: FieldSpec = {
  key: "rodzajZasilku",
  label: "Rodzaj zasiłku",
  type: "ENUM",
  semanticKey: "benefitKind",
  acroNames: ["RODZAJZASILKU", "ZASILEK"],
  labels: label("RODZAJ ZASILKU", "WNIOSKUJE O (?:WYPLATE )?ZASIL"),
  options: BENEFIT_OPTIONS,
}

const parentRole: FieldSpec = {
  key: "wnioskodawca",
  label: "Wnioskodawca (rodzic)",
  type: "ENUM",
  semanticKey: "parentRole",
  acroNames: ["WNIOSKODAWCA", "ROLARODZICA"],
  labels: label("WNIOSKODAWCA", "JESTEM (?:MATKA|OJCEM)", "ROLA RODZICA"),
  options: ROLE_OPTIONS,
}

const childrenCount: FieldSpec = {
  key: "liczbaDzieci",
  label: "Liczba dzieci urodzonych przy jednym porodzie",
  type: "INTEGER",
  semanticKey: "childrenCount",
  acroNames: ["LICZBADZIECI"],
  labels: label("LICZBA DZIECI"),
}

const flatRate: FieldSpec = {
  key: "wniosek815",
  label: "Wniosek o zasiłek w wysokości 81,5%",
  type: "BOOLEAN",
  semanticKey: "flatRateApplication",
  acroNames: ["WNIOSEK815", "STAWKA815"],
  labels: label("81[,.]5"),
}

const sickness: FieldSpec = {
  key: "rodzajUbezpieczenia",
  label: "Ubezpieczenie chorobowe",
  type: "ENUM",
  semanticKey: "sicknessInsurance",
  acroNames: ["RODZAJUBEZPIECZENIA", "UBEZPIECZENIECHOROBOWE"],
  labels: label("^(?:\\d+\\.\\s*)?(?:RODZAJ )?UBEZPIECZENI[AE] CHOROBOWE(?:GO)?$"),
  options: SICKNESS_OPTIONS,
}

const periodStart: FieldSpec = {
  key: "okresOd",
  label: "Okres zasiłku — od",
  type: "DATE",
  semanticKey: "benefitPeriodStart",
  acroNames: ["OKRESOD", "ZASILEKOD"],
  labels: label("OKRES[^:]*\\bOD\\b", "ZASILEK OD"),
}

const periodEnd: FieldSpec = {
  key: "okresDo",
  label: "Okres zasiłku — do",
  type: "DATE",
  semanticKey: "benefitPeriodEnd",
  acroNames: ["OKRESDO", "ZASILEKDO"],
  labels: label("OKRES[^:]*\\bDO\\b", "ZASILEK DO"),
}

const payerCertificate = (title: "EMPLOYMENT" | "MANDATE" | "SELF_EMPLOYMENT"): FieldSpec[] => [
  ...person,
  ...insurance(title !== "EMPLOYMENT").map((spec) =>
    spec.key === "tytulUbezpieczenia" ? { ...spec, required: title !== "EMPLOYMENT" } : spec
  ),
  ...(title === "EMPLOYMENT" ? [] : [sickness]),
  payerSize,
  benefitKind,
  parentRole,
  ...eventDates(false),
  { ...basis, required: false },
  gross,
  ambiguousAmount,
  documentDate,
]

const benefitApplication: FieldSpec[] = [
  ...person,
  parentRole,
  benefitKind,
  ...eventDates(false),
  childrenCount,
  periodStart,
  periodEnd,
  flatRate,
  ...insurance(true),
  payerSize,
  basis,
  gross,
  ambiguousAmount,
  documentDate,
]

export interface FormTemplate {
  form: DocumentFormCode
  /** Legal basis of the data items. */
  legalBasis: string
  fields: FieldSpec[]
  /** The basis (or gross pay) must be present before the calculator can use it. */
  needsBasis: boolean
  /** Benefit-side form whose event date is required. */
  needsEventDate: boolean
}

export const TEMPLATES: Record<Exclude<DocumentFormCode, "UNKNOWN">, FormTemplate> = {
  "Z-3": { form: "Z-3", legalBasis: "R1316 § 3 ust. 1 pkt 1, załącznik nr 2", fields: payerCertificate("EMPLOYMENT"), needsBasis: true, needsEventDate: false },
  "Z-3a": { form: "Z-3a", legalBasis: "R1316 § 3 ust. 1 pkt 2, załącznik nr 3", fields: payerCertificate("MANDATE"), needsBasis: true, needsEventDate: false },
  "Z-3b": { form: "Z-3b", legalBasis: "Poradnik ZUS s. 28 (druk zniesiony 24.10.2026)", fields: payerCertificate("SELF_EMPLOYMENT"), needsBasis: true, needsEventDate: false },
  ZAM: { form: "ZAM", legalBasis: "R1316 § 12, załącznik nr 6", fields: benefitApplication, needsBasis: false, needsEventDate: true },
  ZUR: { form: "ZUR", legalBasis: "Poradnik ZUS s. 35 (druk wycofany 24.10.2026)", fields: benefitApplication, needsBasis: false, needsEventDate: true },
  ZAO: { form: "ZAO", legalBasis: "Poradnik ZUS s. 35 (druk wycofany 24.10.2026)", fields: benefitApplication, needsBasis: false, needsEventDate: true },
  "ZAS-53": { form: "ZAS-53", legalBasis: "Treść zadania s. 3", fields: [...person, ...insurance(false), periodStart, periodEnd, documentDate], needsBasis: false, needsEventDate: false },
  "ZAS-12": { form: "ZAS-12", legalBasis: "R1316 § 12", fields: [...person, benefitKind, periodStart, periodEnd, documentDate], needsBasis: false, needsEventDate: false },
  POSWIADCZENIE: { form: "POSWIADCZENIE", legalBasis: "R1316 § 13 ust. 1", fields: [...person, ...eventDates(false), documentDate], needsBasis: false, needsEventDate: false },
}

/** Generic fields read from an unrecognised form so the user can still fill them in. */
export const UNKNOWN_TEMPLATE: FormTemplate = {
  form: "UNKNOWN",
  legalBasis: "—",
  fields: [...person, ...insurance(false), ...eventDates(false), basis, gross, ambiguousAmount],
  needsBasis: false,
  needsEventDate: false,
}

export function templateFor(form: DocumentFormCode): FormTemplate {
  return form === "UNKNOWN" ? UNKNOWN_TEMPLATE : TEMPLATES[form]
}

/** ENUM options without the matcher, as carried by `ExtractedField.options`. */
export function publicOptions(spec: FieldSpec): ExtractedField["options"] {
  return spec.options?.map(({ value, label }) => ({ value, label }))
}
