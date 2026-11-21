import type {
  DataScope,
  DataSourceId,
  EmployerSourceData,
  EzlaSourceData,
  FieldSource,
  ImportedCaseData,
  ImportFieldKey,
  ImportManualField,
  ImportInconsistency,
  ImportSummary,
  PueSourceData,
  SourceFetchResult,
  SourceIssue,
  UscSourceData,
  ZusSourceData,
} from "@zpr/contracts/data-import"
import { importFieldLabels } from "@zpr/contracts/data-import"
import type { MobywatelPersona } from "@zpr/contracts/mobywatel"
import {
  CONTRIBUTION_DEDUCTION,
  analyzeSickLeave,
  assessEligibility,
  calculateBenefits,
  type CalculatorInput,
  type CaseFacts,
  type SickLeaveAnalysis,
} from "@zpr/domain"

import type { DataImportScenario } from "./types"

export type FieldSources = Partial<Record<ImportFieldKey, FieldSource>>

export interface ScenarioContext {
  scenario: DataImportScenario
  persona: MobywatelPersona
  results: readonly SourceFetchResult[]
  scopes: readonly DataScope[]
  now: string
}

export interface PreviewResult {
  data: ImportedCaseData
  fieldSources: FieldSources
  summary: ImportSummary
  eligibility: ReturnType<typeof assessEligibility>
  calculation: ReturnType<typeof calculateBenefits>
  sickLeave: SickLeaveAnalysis
  validationIssues: SourceIssue[]
}

const ORIGIN_LABELS: Record<Exclude<FieldSource["origin"], "MANUAL">, string> = {
  ZUS: "ZUS (symulacja)",
  EMPLOYER: "Pracodawca / płatnik (symulacja)",
  EZLA: "e-ZLA (symulacja)",
  USC: "USC (symulacja)",
  PUE: "PUE/eZUS (symulacja)",
  MOBYWATEL: "mObywatel (symulacja)",
  DERIVED: "Wyliczone z pobranych danych",
}

function originLabel(origin: Exclude<FieldSource["origin"], "MANUAL">): string {
  return ORIGIN_LABELS[origin]
}

function sourceResult(
  results: readonly SourceFetchResult[],
  source: DataSourceId
): SourceFetchResult | undefined {
  return results.find((item) => item.source === source)
}

function zusData(results: readonly SourceFetchResult[]): ZusSourceData | null {
  const data = sourceResult(results, "ZUS")?.data
  return data?.source === "ZUS" ? data : null
}

function employerData(
  results: readonly SourceFetchResult[]
): EmployerSourceData | null {
  const data = sourceResult(results, "EMPLOYER")?.data
  return data?.source === "EMPLOYER" ? data : null
}

function ezlaData(results: readonly SourceFetchResult[]): EzlaSourceData | null {
  const data = sourceResult(results, "EZLA")?.data
  return data?.source === "EZLA" ? data : null
}

function uscData(results: readonly SourceFetchResult[]): UscSourceData | null {
  const data = sourceResult(results, "USC")?.data
  return data?.source === "USC" ? data : null
}

function pueData(results: readonly SourceFetchResult[]): PueSourceData | null {
  const data = sourceResult(results, "PUE")?.data
  return data?.source === "PUE" ? data : null
}

function employmentTypeFromTitle(
  title: ZusSourceData["insurancePeriods"][number]["title"]
): ImportedCaseData["employmentType"] {
  switch (title) {
    case "EMPLOYMENT_CONTRACT":
      return "EMPLOYMENT"
    case "MANDATE_CONTRACT":
      return "MANDATE"
    case "SELF_EMPLOYMENT":
      return "SELF_EMPLOYMENT"
    case "OTHER":
      return "OTHER"
  }
}

function averageBasisAfterDeduction(
  bases: ZusSourceData["contributionBases"]
): number | undefined {
  if (bases.length === 0) return undefined
  const average =
    bases.reduce((sum, item) => sum + item.basisGrosze, 0) / bases.length
  return Math.round(average * (1 - CONTRIBUTION_DEDUCTION))
}

/**
 * Builds the form data from fetched sources only. Nothing is inferred from the
 * scenario itself, so a failed or excluded source leaves the field empty and
 * the user must complete it manually.
 */
export function buildInitialCaseData(context: ScenarioContext): {
  data: ImportedCaseData
  fieldSources: FieldSources
} {
  const data: ImportedCaseData = {
    firstName: context.persona.firstName,
    lastName: context.persona.lastName,
    email: context.persona.email,
    birthDate: context.persona.birthDate,
    city: context.persona.city,
  }
  const fieldSources: FieldSources = {
    firstName: { origin: "MOBYWATEL", label: originLabel("MOBYWATEL") },
    lastName: { origin: "MOBYWATEL", label: originLabel("MOBYWATEL") },
    email: { origin: "MOBYWATEL", label: originLabel("MOBYWATEL") },
    birthDate: { origin: "MOBYWATEL", label: originLabel("MOBYWATEL") },
    city: { origin: "MOBYWATEL", label: originLabel("MOBYWATEL") },
  }

  const zus = zusData(context.results)
  if (zus) {
    const period =
      zus.insurancePeriods.find((item) => item.isActive) ??
      [...zus.insurancePeriods].sort((left, right) =>
        right.startDate.localeCompare(left.startDate)
      )[0]

    if (period) {
      data.employmentType = employmentTypeFromTitle(period.title)
      fieldSources.employmentType = {
        origin: "ZUS",
        label: originLabel("ZUS"),
      }
      data.coverageMode = period.coverageMode
      fieldSources.coverageMode = {
        origin: "ZUS",
        label: originLabel("ZUS"),
      }
      data.insuranceStartDate = period.startDate
      fieldSources.insuranceStartDate = {
        origin: "ZUS",
        label: originLabel("ZUS"),
      }
      data.employerName = period.payerName
      fieldSources.employerName = {
        origin: "ZUS",
        label: originLabel("ZUS"),
      }
    }

    if (zus.benefitBasis) {
      data.monthlyBasisGrosze = zus.benefitBasis.averageMonthlyBasisGrosze
      fieldSources.monthlyBasisGrosze = {
        origin: "ZUS",
        label: originLabel("ZUS"),
      }
    } else if (zus.contributionBases.length > 0) {
      const basis = averageBasisAfterDeduction(zus.contributionBases)
      if (basis !== undefined) {
        data.monthlyBasisGrosze = basis
        fieldSources.monthlyBasisGrosze = {
          origin: "ZUS",
          label: `${originLabel("ZUS")} — średnia z podstaw`,
        }
      }
    }

    if (!data.grossMonthlyIncomePln && zus.contributionBases.length > 0) {
      const latest = [...zus.contributionBases].sort((left, right) =>
        right.period.localeCompare(left.period)
      )[0]
      if (latest) {
        data.grossMonthlyIncomePln = latest.basisGrosze / 100
        fieldSources.grossMonthlyIncomePln = {
          origin: "ZUS",
          label: originLabel("ZUS"),
        }
      }
    }
  }

  const employer = employerData(context.results)
  if (employer) {
    const payer = employer.payers.find((item) => item.isCurrent) ?? employer.payers[0]
    const employment =
      employer.employments.find((item) => item.endDate === null) ??
      [...employer.employments].sort((left, right) =>
        right.startDate.localeCompare(left.startDate)
      )[0]

    if (payer) {
      data.employerName = payer.name
      fieldSources.employerName = {
        origin: "EMPLOYER",
        label: originLabel("EMPLOYER"),
      }
    }

    if (employment) {
      data.employmentType = employment.contractType
      fieldSources.employmentType = {
        origin: "EMPLOYER",
        label: originLabel("EMPLOYER"),
      }
      data.employerName = employment.payerName
      fieldSources.employerName = {
        origin: "EMPLOYER",
        label: originLabel("EMPLOYER"),
      }
      data.grossMonthlyIncomePln = employment.grossMonthlyAmountGrosze / 100
      fieldSources.grossMonthlyIncomePln = {
        origin: "EMPLOYER",
        label: originLabel("EMPLOYER"),
      }
      if (!data.insuranceStartDate) {
        data.insuranceStartDate = employment.startDate
        fieldSources.insuranceStartDate = {
          origin: "EMPLOYER",
          label: originLabel("EMPLOYER"),
        }
      }
    }
  }

  const usc = uscData(context.results)
  if (usc) {
    const event = usc.familyEvents[0]
    const child = usc.children[0]

    if (event) {
      data.eventType = event.type
      fieldSources.eventType = { origin: "USC", label: originLabel("USC") }
      if (event.expectedDueDate) {
        data.expectedDueDate = event.expectedDueDate
        fieldSources.expectedDueDate = {
          origin: "USC",
          label: originLabel("USC"),
        }
      }
      if (event.eventDate) {
        data.eventDate = event.eventDate
        fieldSources.eventDate = { origin: "USC", label: originLabel("USC") }
      }
      const childrenCount =
        child?.childrenInBirth ??
        (event.childIds.length > 0 ? event.childIds.length : undefined)
      if (childrenCount !== undefined) {
        data.childrenCount = childrenCount
        fieldSources.childrenCount = {
          origin: "USC",
          label: originLabel("USC"),
        }
      }
      data.hasZaZyciem = event.hasZaZyciem
      fieldSources.hasZaZyciem = { origin: "USC", label: originLabel("USC") }
      data.isPremature = event.isPremature
      fieldSources.isPremature = { origin: "USC", label: originLabel("USC") }
    } else if (child) {
      data.eventType = child.isAdopted ? "ADOPTION" : "BIRTH"
      fieldSources.eventType = { origin: "USC", label: originLabel("USC") }
      data.eventDate = child.adoptionDate ?? child.birthDate
      fieldSources.eventDate = { origin: "USC", label: originLabel("USC") }
      data.childrenCount = child.childrenInBirth
      fieldSources.childrenCount = { origin: "USC", label: originLabel("USC") }
    }
  }

  return { data, fieldSources }
}

export function buildSickLeaveAnalysis(
  context: ScenarioContext,
  data: ImportedCaseData
): SickLeaveAnalysis {
  const source = sourceResult(context.results, "EZLA")
  const ezla = ezlaData(context.results)
  const asOf = context.now.slice(0, 10)
  const insuranceStartDate = data.insuranceStartDate

  if (!source || source.status === "ERROR" || !ezla) {
    const empty = analyzeSickLeave({
      periods: [],
      asOf,
      insuranceStartDate,
      employmentType: data.employmentType,
    })
    return {
      ...empty,
      status: "INDETERMINATE",
      warnings: [
        "e-ZLA nie zwróciło historii zwolnień. Nie oznacza to braku niezdolności do pracy — uzupełnij dane ręcznie.",
        ...empty.warnings,
      ],
    }
  }

  return analyzeSickLeave({
    asOf,
    insuranceStartDate,
    employmentType: data.employmentType,
    periods: ezla.sickLeaves.map((leave) => ({
      id: leave.id,
      startDate: leave.startDate,
      endDate: leave.endDate,
      days: leave.days,
      pregnancyRelated: leave.pregnancyRelated,
      kind: leave.kind,
    })),
  })
}

export function toCaseFacts(
  data: ImportedCaseData,
  sickLeave: SickLeaveAnalysis,
  results: readonly SourceFetchResult[],
  parentRole?: "MOTHER" | "FATHER"
): CaseFacts {
  const facts: CaseFacts = {}
  if (parentRole) facts.parentRole = parentRole
  if (data.employmentType) facts.employmentType = data.employmentType
  if (data.employmentType === "EMPLOYMENT") {
    facts.sicknessInsurance = "COMPULSORY"
  } else if (data.coverageMode) {
    facts.sicknessInsurance =
      data.coverageMode === "VOLUNTARY" ? "VOLUNTARY" : "COMPULSORY"
  }
  if (data.insuranceStartDate) facts.insuranceStartDate = data.insuranceStartDate
  const zus = zusData(results)
  const latestPeriod =
    zus?.insurancePeriods.find((period) => period.isActive) ??
    [...(zus?.insurancePeriods ?? [])].sort((left, right) =>
      right.startDate.localeCompare(left.startDate)
    )[0]
  if (latestPeriod?.endDate) facts.insuranceEndDate = latestPeriod.endDate
  if (data.eventType) facts.familyEvent = data.eventType
  if (data.eventDate) facts.eventDate = data.eventDate
  if (data.expectedDueDate) facts.expectedDueDate = data.expectedDueDate
  if (data.childrenCount) facts.childrenCount = data.childrenCount
  if (data.hasZaZyciem !== undefined) facts.hasZaZyciem = data.hasZaZyciem

  const arrears = zusData(results)?.arrears
  if (arrears?.status === "OPEN") facts.contributionArrears = true
  if (arrears?.status === "NONE" || arrears?.status === "PAID") {
    facts.contributionArrears = false
  }

  if (sickLeave.pregnancyRelatedDays > 0) facts.pregnancySickLeave = true
  if (sickLeave.totalDays > 0) facts.sickLeaveDays = sickLeave.totalDays

  return facts
}

export function toCalculatorInput(data: ImportedCaseData): CalculatorInput {
  return {
    grossMonthlyIncomeGrosze: Math.round(
      (data.grossMonthlyIncomePln ?? 0) * 100
    ),
    monthlyBasisOverrideGrosze: data.monthlyBasisGrosze,
    childrenCount: data.childrenCount ?? 1,
    hasZaZyciem: data.hasZaZyciem ?? false,
    paymentOption: "STANDARD_100_70",
    maternityWeeksBeforeBirth: 0,
    secondParentParentalWeeks: 0,
    parentalWorkFraction: 0,
    paternityDays: 0,
  }
}

export function buildInconsistencies(
  context: ScenarioContext,
  data: ImportedCaseData,
  sickLeave: SickLeaveAnalysis
): ImportInconsistency[] {
  const inconsistencies: ImportInconsistency[] = []
  const zus = zusData(context.results)
  const employer = employerData(context.results)
  const usc = uscData(context.results)
  const employment = employer?.employments[0]
  const period = zus?.insurancePeriods[0]

  if (employment && period) {
    if (employment.payerName !== period.payerName) {
      inconsistencies.push({
        code: "PAYER_MISMATCH",
        message:
          "Nazwa płatnika w module pracodawcy różni się od płatnika w ZUS.",
        severity: "WARNING",
        sources: ["ZUS", "EMPLOYER"],
      })
    }
    if (employment.startDate !== period.startDate) {
      inconsistencies.push({
        code: "INSURANCE_START_MISMATCH",
        message: `Zatrudnienie zaczyna się ${employment.startDate}, a ubezpieczenie ${period.startDate}. Sprawdź daty przed złożeniem wniosku.`,
        severity: "WARNING",
        sources: ["ZUS", "EMPLOYER"],
      })
    }
    if (
      employment.contractType === "EMPLOYMENT" &&
      period.coverageMode !== "COMPULSORY"
    ) {
      inconsistencies.push({
        code: "COVERAGE_MODE_MISMATCH",
        message:
          "Umowa o pracę zwykle oznacza obowiązkowe ubezpieczenie chorobowe, a ZUS zwrócił inny tryb.",
        severity: "WARNING",
        sources: ["ZUS", "EMPLOYER"],
      })
    }
  }

  if (
    employer &&
    employment &&
    zus &&
    zus.contributionBases.length > 0
  ) {
    const latest = [...zus.contributionBases].sort((left, right) =>
      right.period.localeCompare(left.period)
    )[0]
    if (latest) {
      const difference = Math.abs(
        latest.basisGrosze - employment.grossMonthlyAmountGrosze
      )
      if (difference > employment.grossMonthlyAmountGrosze * 0.05) {
        inconsistencies.push({
          code: "SALARY_BASIS_MISMATCH",
          message: `Ostatnia podstawa składki (${(latest.basisGrosze / 100).toFixed(2)} zł) różni się od wynagrodzenia (${(employment.grossMonthlyAmountGrosze / 100).toFixed(2)} zł).`,
          severity: "WARNING",
          sources: ["ZUS", "EMPLOYER"],
        })
      }
    }
  }

  if (sickLeave.status === "ATTENTION") {
    inconsistencies.push({
      code: "SICK_LEAVE_OUTSIDE_INSURANCE",
      message:
        "Co najmniej jedno zwolnienie wykracza poza okres ubezpieczenia.",
      severity: "WARNING",
      sources: ["ZUS", "EZLA"],
    })
  }

  if (sourceResult(context.results, "EZLA")?.status === "ERROR") {
    inconsistencies.push({
      code: "EZLA_UNAVAILABLE",
      message:
        "Brak historii e-ZLA uniemożliwia pełną analizę zasiłku chorobowego.",
      severity: "ERROR",
      sources: ["EZLA"],
    })
  }

  if (
    usc &&
    usc.children.length === 0 &&
    usc.familyEvents.length === 0 &&
    (data.eventType === "BIRTH" || data.eventType === "ADOPTION")
  ) {
    inconsistencies.push({
      code: "NO_CHILD_RECORD",
      message:
        "Formularz wskazuje urodzenie lub przysposobienie, ale USC nie zwróciło danych dziecka.",
      severity: "WARNING",
      sources: ["USC"],
    })
  }

  const pue = pueData(context.results)
  if (pue && usc && pue.cases.length > 0 && usc.children.length === 0) {
    inconsistencies.push({
      code: "BENEFIT_WITHOUT_CHILD_RECORD",
      message:
        "PUE zawiera sprawę świadczenia rodzinnego, ale USC nie ma danych dziecka.",
      severity: "INFO",
      sources: ["PUE", "USC"],
    })
  }

  return inconsistencies
}

function missingFieldReason(
  field: ImportFieldKey,
  context: ScenarioContext
): string {
  if (field === "eventType" || field === "eventDate" || field === "childrenCount") {
    return "USC nie zwróciło danych o dziecku. Uzupełnij informacje ręcznie."
  }
  if (
    field === "insuranceStartDate" ||
    field === "coverageMode" ||
    field === "monthlyBasisGrosze"
  ) {
    return "ZUS nie zwróciło kompletnych danych ubezpieczenia. Uzupełnij ręcznie."
  }
  if (
    field === "employmentType" ||
    field === "employerName" ||
    field === "grossMonthlyIncomePln"
  ) {
    return "Pracodawca nie zwrócił kompletnych danych zatrudnienia. Uzupełnij ręcznie."
  }
  if (context.scopes.length === 0) {
    return "Nie wybrano tego zakresu danych."
  }
  return "Nie udało się pobrać tej informacji. Uzupełnij ją ręcznie."
}

export function buildManualFields(
  context: ScenarioContext,
  data: ImportedCaseData
): ImportManualField[] {
  const required: ImportFieldKey[] = [
    "firstName",
    "lastName",
    "email",
    "birthDate",
    "city",
    "eventType",
    "childrenCount",
    "employmentType",
    "employerName",
    "insuranceStartDate",
    "coverageMode",
    "grossMonthlyIncomePln",
    "monthlyBasisGrosze",
  ]

  const manual: ImportManualField[] = []
  for (const field of required) {
    const value = data[field]
    if (value === undefined || value === "") {
      manual.push({
        field,
        label: importFieldLabels[field],
        reason: missingFieldReason(field, context),
      })
    }
  }
  if (!data.expectedDueDate && !data.eventDate) {
    manual.push({
      field: "expectedDueDate",
      label: importFieldLabels.expectedDueDate,
      reason:
        "Brak daty porodu lub urodzenia. Podaj przynajmniej jedną datę, aby wyznaczyć terminy.",
    })
  }
  return manual
}

export function buildSummary(
  context: ScenarioContext,
  data: ImportedCaseData,
  fieldSources: FieldSources
): ImportSummary {
  const manualFields = buildManualFields(context, data)
  const sickLeave = buildSickLeaveAnalysis(context, data)
  const inconsistencies = buildInconsistencies(context, data, sickLeave)
  const downloaded = context.results.filter(
    (item) => item.status === "SUCCESS" || item.status === "PARTIAL"
  ).length
  const unavailable = context.results.filter(
    (item) => item.status === "EMPTY" || item.status === "ERROR"
  ).length

  const notes: string[] = []
  for (const result of context.results) {
    for (const issue of result.issues) {
      if (issue.severity !== "INFO") {
        notes.push(`${result.label}: ${issue.message}`)
      }
    }
  }
  for (const [field, source] of Object.entries(fieldSources) as Array<
    [ImportFieldKey, FieldSource]
  >) {
    if (source.origin === "MANUAL") {
      notes.push(`${importFieldLabels[field]}: poprawione przez Ciebie.`)
    }
  }

  return {
    counts: {
      downloaded,
      unavailable,
      manual: manualFields.length,
      inconsistencies: inconsistencies.length,
    },
    sources: [...context.results],
    manualFields,
    inconsistencies,
    notes,
  }
}

export function previewImportData(
  context: ScenarioContext,
  override?: ImportedCaseData
): PreviewResult {
  const initial = buildInitialCaseData(context)
  const data: ImportedCaseData = { ...initial.data, ...(override ?? {}) }
  const fieldSources: FieldSources = { ...initial.fieldSources }

  if (override) {
    for (const key of Object.keys(override) as ImportFieldKey[]) {
      if (override[key] === undefined) continue
      if (initial.data[key] !== override[key]) {
        fieldSources[key] = {
          origin: "MANUAL",
          label: "Poprawione przez Ciebie",
        }
      }
    }
  }

  const sickLeave = buildSickLeaveAnalysis(context, data)
  const facts = toCaseFacts(
    data,
    sickLeave,
    context.results,
    context.scenario.parentRole
  )
  const eligibility = assessEligibility(facts, {
    asOf: context.now.slice(0, 10),
  })
  const calculation = calculateBenefits(toCalculatorInput(data))
  const summary = buildSummary(context, data, fieldSources)

  return {
    data,
    fieldSources,
    summary,
    eligibility,
    calculation,
    sickLeave,
    validationIssues: summary.manualFields.map((field) => ({
      code: `MISSING_${field.field.toUpperCase()}`,
      message: `${field.label}: ${field.reason}`,
      severity: "WARNING",
    })),
  }
}

export function toImportPrefillStorage(
  sessionId: string,
  preview: PreviewResult
): {
  sessionId: string
  data: ImportedCaseData
  fieldSources: FieldSources
} {
  return {
    sessionId,
    data: preview.data,
    fieldSources: preview.fieldSources,
  }
}
