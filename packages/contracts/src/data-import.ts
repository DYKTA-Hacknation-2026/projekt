import { z } from "zod"

import { isoDateSchema, uuidSchema } from "./common"
import {
  coverageModeSchema,
  employmentTypeSchema,
  familyEventTypeSchema,
} from "./onboarding"

/**
 * Contracts for the simulated data-retrieval flow.
 *
 * Every institution is a separate source with its own payload. The flow is:
 * consent (scopes) → per-source fetch → summary → user verification → save.
 * All payloads are synthetic; no PESEL, medical diagnosis or government
 * credential is part of the contract.
 */

export const DATA_SOURCE_IDS = [
  "ZUS",
  "EMPLOYER",
  "EZLA",
  "USC",
  "PUE",
] as const

export const dataSourceIdSchema = z.enum(DATA_SOURCE_IDS)
export type DataSourceId = z.infer<typeof dataSourceIdSchema>

export const DATA_SCOPE_KEYS = [
  "INSURANCE_HISTORY",
  "CONTRIBUTION_BASIS",
  "CONTRIBUTION_STATUS",
  "EMPLOYMENT_HISTORY",
  "SICK_LEAVE_HISTORY",
  "CHILD_DATA",
  "BENEFIT_CASES",
] as const

export const dataScopeSchema = z.enum(DATA_SCOPE_KEYS)
export type DataScope = z.infer<typeof dataScopeSchema>

export const sourceFetchStatusSchema = z.enum([
  "PENDING",
  "SUCCESS",
  "PARTIAL",
  "EMPTY",
  "ERROR",
])
export type SourceFetchStatus = z.infer<typeof sourceFetchStatusSchema>

export const importSessionStatusSchema = z.enum([
  "CONSENTED",
  "RUNNING",
  "COMPLETED",
  "ACCEPTED",
  "SKIPPED",
])
export type ImportSessionStatus = z.infer<typeof importSessionStatusSchema>

export const importSeveritySchema = z.enum(["INFO", "WARNING", "ERROR"])
export type ImportSeverity = z.infer<typeof importSeveritySchema>

export const insuranceTitleSchema = z.enum([
  "EMPLOYMENT_CONTRACT",
  "MANDATE_CONTRACT",
  "SELF_EMPLOYMENT",
  "OTHER",
])
export type InsuranceTitle = z.infer<typeof insuranceTitleSchema>

export const sicknessInsuranceModeSchema = z.enum([
  "COMPULSORY",
  "VOLUNTARY",
  "NONE",
])
export type SicknessInsuranceMode = z.infer<typeof sicknessInsuranceModeSchema>

export const payerTypeSchema = z.enum([
  "EMPLOYER",
  "SELF_EMPLOYED",
  "MANDATE_PRINCIPAL",
])
export type PayerType = z.infer<typeof payerTypeSchema>

export const salaryComponentKindSchema = z.enum([
  "BASE",
  "BONUS",
  "ALLOWANCE",
  "OVERTIME",
  "OTHER",
])
export type SalaryComponentKind = z.infer<typeof salaryComponentKindSchema>

export const absenceKindSchema = z.enum([
  "SICK_LEAVE",
  "MATERNITY",
  "PARENTAL",
  "UNPAID",
  "OTHER",
])
export type AbsenceKind = z.infer<typeof absenceKindSchema>

export const sickLeaveKindSchema = z.enum([
  "SICKNESS",
  "PREGNANCY",
  "CARE",
  "REHABILITATION",
])
export type SickLeaveKind = z.infer<typeof sickLeaveKindSchema>

export const benefitApplicationStatusSchema = z.enum([
  "SUBMITTED",
  "IN_PROGRESS",
  "DECISION_ISSUED",
  "PAID",
  "REJECTED",
])
export type BenefitApplicationStatus = z.infer<
  typeof benefitApplicationStatusSchema
>

export const benefitKindSchema = z.enum([
  "MATERNITY",
  "PARENTAL",
  "PATERNITY",
  "SICKNESS",
  "CHILDCARE",
  "OTHER",
])
export type ImportBenefitKind = z.infer<typeof benefitKindSchema>

export const pueDocumentKindSchema = z.enum([
  "DECISION",
  "CERTIFICATE",
  "APPLICATION_CONFIRMATION",
  "OTHER",
])
export type PueDocumentKind = z.infer<typeof pueDocumentKindSchema>

/* -------------------------------------------------------------------------- */
/* Entities returned by the simulated institutions                            */
/* -------------------------------------------------------------------------- */

export const contributionPayerSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  type: payerTypeSchema,
  /** Synthetic 10-digit identifier shown as "NIP (syntetyczny)". */
  taxId: z.string().regex(/^\d{10}$/),
  city: z.string().min(1),
  isCurrent: z.boolean(),
})
export type ContributionPayer = z.infer<typeof contributionPayerSchema>

export const salaryComponentSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  kind: salaryComponentKindSchema,
  amountGrosze: z.number().int().nonnegative(),
  validFrom: isoDateSchema,
  validTo: isoDateSchema.nullable().optional(),
})
export type SalaryComponent = z.infer<typeof salaryComponentSchema>

export const salaryChangeSchema = z.object({
  effectiveFrom: isoDateSchema,
  previousGrosze: z.number().int().nonnegative(),
  newGrosze: z.number().int().nonnegative(),
  reason: z.string().min(1),
})
export type SalaryChange = z.infer<typeof salaryChangeSchema>

export const absenceRecordSchema = z.object({
  id: z.string().min(1),
  kind: absenceKindSchema,
  startDate: isoDateSchema,
  endDate: isoDateSchema,
  note: z.string().optional(),
})
export type AbsenceRecord = z.infer<typeof absenceRecordSchema>

export const employmentRecordSchema = z.object({
  id: z.string().min(1),
  payerId: z.string().min(1),
  payerName: z.string().min(1),
  contractType: employmentTypeSchema,
  title: z.string().min(1),
  startDate: isoDateSchema,
  endDate: isoDateSchema.nullable(),
  /** 1 = full time. */
  workingTimeFraction: z.number().min(0.05).max(1.5),
  grossMonthlyAmountGrosze: z.number().int().nonnegative(),
  components: z.array(salaryComponentSchema).default([]),
  changes: z.array(salaryChangeSchema).default([]),
  absences: z.array(absenceRecordSchema).default([]),
})
export type EmploymentRecord = z.infer<typeof employmentRecordSchema>

export const insurancePeriodSchema = z.object({
  id: z.string().min(1),
  title: insuranceTitleSchema,
  payerId: z.string().nullable(),
  payerName: z.string().min(1),
  coverageMode: coverageModeSchema,
  sicknessInsurance: sicknessInsuranceModeSchema,
  startDate: isoDateSchema,
  endDate: isoDateSchema.nullable(),
  isActive: z.boolean(),
  notes: z.string().optional(),
})
export type InsurancePeriod = z.infer<typeof insurancePeriodSchema>

export const contributionBasisSchema = z.object({
  id: z.string().min(1),
  insurancePeriodId: z.string().min(1),
  /** Contribution month, YYYY-MM. */
  period: z.string().regex(/^\d{4}-\d{2}$/, "Okres musi mieć format RRRR-MM"),
  basisGrosze: z.number().int().nonnegative(),
  sicknessContributionGrosze: z.number().int().nonnegative(),
  paid: z.boolean(),
  paidAt: isoDateSchema.nullable(),
})
export type ContributionBasis = z.infer<typeof contributionBasisSchema>

export const contributionArrearsSchema = z.object({
  status: z.enum(["NONE", "OPEN", "PAID"]),
  amountGrosze: z.number().int().nonnegative(),
  asOf: isoDateSchema,
  note: z.string().optional(),
})
export type ContributionArrears = z.infer<typeof contributionArrearsSchema>

export const benefitBasisSchema = z.object({
  insurancePeriodId: z.string().min(1),
  averageMonthlyBasisGrosze: z.number().int().nonnegative(),
  basisFrom: isoDateSchema,
  basisTo: isoDateSchema,
  monthsCount: z.number().int().positive(),
  note: z.string().optional(),
})
export type BenefitBasis = z.infer<typeof benefitBasisSchema>

export const sickLeavePeriodSchema = z.object({
  id: z.string().min(1),
  startDate: isoDateSchema,
  endDate: isoDateSchema,
  days: z.number().int().positive(),
  kind: sickLeaveKindSchema,
  /** Only the legal fact, never a diagnosis or medical detail. */
  pregnancyRelated: z.boolean(),
  certificateRef: z.string().min(1),
  payerName: z.string().min(1),
  status: z.enum(["ACTIVE", "FINISHED"]),
})
export type SickLeavePeriod = z.infer<typeof sickLeavePeriodSchema>

export const childRecordSchema = z.object({
  id: z.string().min(1),
  firstName: z.string().min(1),
  birthDate: isoDateSchema,
  childrenInBirth: z.number().int().min(1).max(10),
  isAdopted: z.boolean(),
  adoptionDate: isoDateSchema.nullable(),
  birthPlace: z.string().min(1),
})
export type ChildRecord = z.infer<typeof childRecordSchema>

export const familyEventRecordSchema = z.object({
  id: z.string().min(1),
  type: familyEventTypeSchema,
  eventDate: isoDateSchema.nullable(),
  expectedDueDate: isoDateSchema.nullable(),
  childIds: z.array(z.string().min(1)),
  isPremature: z.boolean(),
  hasZaZyciem: z.boolean(),
})
export type FamilyEventRecord = z.infer<typeof familyEventRecordSchema>

export const benefitCaseRecordSchema = z.object({
  id: z.string().min(1),
  caseNumber: z.string().min(1),
  applicationType: z.string().min(1),
  benefitKind: benefitKindSchema,
  status: benefitApplicationStatusSchema,
  submittedAt: isoDateSchema,
  decisionNumber: z.string().nullable(),
  decisionDate: isoDateSchema.nullable(),
  periodFrom: isoDateSchema.nullable(),
  periodTo: isoDateSchema.nullable(),
  amountGrosze: z.number().int().nonnegative().nullable(),
})
export type BenefitCaseRecord = z.infer<typeof benefitCaseRecordSchema>

export const pueDocumentSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  kind: pueDocumentKindSchema,
  issuedAt: isoDateSchema,
  reference: z.string().min(1),
  available: z.boolean(),
})
export type PueDocument = z.infer<typeof pueDocumentSchema>

/* -------------------------------------------------------------------------- */
/* Per-source payloads                                                        */
/* -------------------------------------------------------------------------- */

export const zusSourceDataSchema = z.object({
  source: z.literal("ZUS"),
  insurancePeriods: z.array(insurancePeriodSchema),
  contributionBases: z.array(contributionBasisSchema),
  arrears: contributionArrearsSchema.nullable(),
  benefitBasis: benefitBasisSchema.nullable(),
})
export type ZusSourceData = z.infer<typeof zusSourceDataSchema>

export const employerSourceDataSchema = z.object({
  source: z.literal("EMPLOYER"),
  payers: z.array(contributionPayerSchema),
  employments: z.array(employmentRecordSchema),
})
export type EmployerSourceData = z.infer<typeof employerSourceDataSchema>

export const ezlaSourceDataSchema = z.object({
  source: z.literal("EZLA"),
  sickLeaves: z.array(sickLeavePeriodSchema),
})
export type EzlaSourceData = z.infer<typeof ezlaSourceDataSchema>

export const uscSourceDataSchema = z.object({
  source: z.literal("USC"),
  children: z.array(childRecordSchema),
  familyEvents: z.array(familyEventRecordSchema),
})
export type UscSourceData = z.infer<typeof uscSourceDataSchema>

export const pueSourceDataSchema = z.object({
  source: z.literal("PUE"),
  cases: z.array(benefitCaseRecordSchema),
  documents: z.array(pueDocumentSchema),
})
export type PueSourceData = z.infer<typeof pueSourceDataSchema>

export const sourceDataSchema = z.discriminatedUnion("source", [
  zusSourceDataSchema,
  employerSourceDataSchema,
  ezlaSourceDataSchema,
  uscSourceDataSchema,
  pueSourceDataSchema,
])
export type SourceData = z.infer<typeof sourceDataSchema>

/* -------------------------------------------------------------------------- */
/* Fetch orchestration                                                        */
/* -------------------------------------------------------------------------- */

export const sourceActivitySchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  status: sourceFetchStatusSchema,
})
export type SourceActivity = z.infer<typeof sourceActivitySchema>

export const sourceIssueSchema = z.object({
  code: z.string().min(1),
  message: z.string().min(1),
  severity: importSeveritySchema,
})
export type SourceIssue = z.infer<typeof sourceIssueSchema>

export const sourceProvenanceSchema = z.object({
  institution: z.string().min(1),
  transport: z.literal("SIMULATED"),
  scenarioId: z.string().min(1),
  fetchedAt: z.string().datetime(),
})
export type SourceProvenance = z.infer<typeof sourceProvenanceSchema>

export const sourceFetchResultSchema = z.object({
  source: dataSourceIdSchema,
  label: z.string().min(1),
  institution: z.string().min(1),
  requestedScopes: z.array(dataScopeSchema),
  status: sourceFetchStatusSchema,
  activities: z.array(sourceActivitySchema),
  data: sourceDataSchema.nullable(),
  issues: z.array(sourceIssueSchema),
  provenance: sourceProvenanceSchema,
})
export type SourceFetchResult = z.infer<typeof sourceFetchResultSchema>

export const sourceScopeSchema = z.object({
  id: dataScopeSchema,
  label: z.string().min(1),
  description: z.string().min(1),
})
export type SourceScope = z.infer<typeof sourceScopeSchema>

export const dataSourceCatalogItemSchema = z.object({
  id: dataSourceIdSchema,
  label: z.string().min(1),
  institution: z.string().min(1),
  description: z.string().min(1),
  /** Always true — the flag is rendered next to the source in the UI. */
  simulated: z.literal(true),
  scopes: z.array(sourceScopeSchema),
  activities: z.array(
    z.object({
      id: z.string().min(1),
      label: z.string().min(1),
    })
  ),
})
export type DataSourceCatalogItem = z.infer<typeof dataSourceCatalogItemSchema>

export const dataSourceCatalogSchema = z.object({
  sources: z.array(dataSourceCatalogItemSchema),
  scopes: z.array(sourceScopeSchema),
  disclaimer: z.string().min(1),
})
export type DataSourceCatalog = z.infer<typeof dataSourceCatalogSchema>

/* -------------------------------------------------------------------------- */
/* Editable prefill and provenance                                            */
/* -------------------------------------------------------------------------- */

export const IMPORT_FIELD_KEYS = [
  "firstName",
  "lastName",
  "email",
  "birthDate",
  "city",
  "eventType",
  "expectedDueDate",
  "eventDate",
  "childrenCount",
  "hasZaZyciem",
  "isPremature",
  "employmentType",
  "employerName",
  "insuranceStartDate",
  "coverageMode",
  "grossMonthlyIncomePln",
  "monthlyBasisGrosze",
] as const

export const importFieldKeySchema = z.enum(IMPORT_FIELD_KEYS)
export type ImportFieldKey = z.infer<typeof importFieldKeySchema>

export const fieldOriginSchema = z.enum([
  "ZUS",
  "EMPLOYER",
  "EZLA",
  "USC",
  "PUE",
  "MOBYWATEL",
  "MANUAL",
  "DERIVED",
])
export type FieldOrigin = z.infer<typeof fieldOriginSchema>

export const fieldSourceSchema = z.object({
  origin: fieldOriginSchema,
  label: z.string().min(1),
})
export type FieldSource = z.infer<typeof fieldSourceSchema>

export const importedCaseDataSchema = z.object({
  firstName: z.string().trim().max(80).optional(),
  lastName: z.string().trim().max(80).optional(),
  email: z.email().max(160).optional(),
  birthDate: isoDateSchema.optional(),
  city: z.string().trim().max(120).optional(),
  eventType: familyEventTypeSchema.optional(),
  expectedDueDate: isoDateSchema.optional(),
  eventDate: isoDateSchema.optional(),
  childrenCount: z.number().int().min(1).max(10).optional(),
  hasZaZyciem: z.boolean().optional(),
  isPremature: z.boolean().optional(),
  employmentType: employmentTypeSchema.optional(),
  employerName: z.string().trim().max(160).optional(),
  insuranceStartDate: isoDateSchema.optional(),
  coverageMode: coverageModeSchema.optional(),
  grossMonthlyIncomePln: z.number().min(0).max(1_000_000).optional(),
  /** Monthly benefit basis read from ZUS contribution bases. */
  monthlyBasisGrosze: z.number().int().nonnegative().optional(),
})
export type ImportedCaseData = z.infer<typeof importedCaseDataSchema>

export const importManualFieldSchema = z.object({
  field: importFieldKeySchema,
  label: z.string().min(1),
  reason: z.string().min(1),
})
export type ImportManualField = z.infer<typeof importManualFieldSchema>

export const importInconsistencySchema = z.object({
  code: z.string().min(1),
  message: z.string().min(1),
  severity: importSeveritySchema,
  sources: z.array(dataSourceIdSchema),
})
export type ImportInconsistency = z.infer<typeof importInconsistencySchema>

export const importCountsSchema = z.object({
  downloaded: z.number().int().nonnegative(),
  unavailable: z.number().int().nonnegative(),
  manual: z.number().int().nonnegative(),
  inconsistencies: z.number().int().nonnegative(),
})
export type ImportCounts = z.infer<typeof importCountsSchema>

export const importSummarySchema = z.object({
  counts: importCountsSchema,
  sources: z.array(sourceFetchResultSchema),
  manualFields: z.array(importManualFieldSchema),
  inconsistencies: z.array(importInconsistencySchema),
  notes: z.array(z.string()),
})
export type ImportSummary = z.infer<typeof importSummarySchema>

export const importSessionSchema = z.object({
  id: uuidSchema,
  personaId: z.string().min(1),
  personaName: z.string().min(1),
  scenarioId: z.string().min(1),
  scenarioLabel: z.string().min(1),
  status: importSessionStatusSchema,
  scopes: z.array(dataScopeSchema),
  sources: z.array(sourceFetchResultSchema),
  summary: importSummarySchema,
  createdAt: z.string().datetime(),
  acceptedAt: z.string().datetime().nullable(),
})
export type ImportSession = z.infer<typeof importSessionSchema>

/* -------------------------------------------------------------------------- */
/* Session responses                                                          */
/* -------------------------------------------------------------------------- */

export const startImportSchema = z.object({
  scopes: z.array(dataScopeSchema).min(1, "Wybierz co najmniej jeden zakres danych"),
})
export type StartImportInput = z.infer<typeof startImportSchema>

export const acceptImportSchema = z.object({
  data: importedCaseDataSchema,
})
export type AcceptImportInput = z.infer<typeof acceptImportSchema>

export const previewImportRequestSchema = z.object({
  data: importedCaseDataSchema.optional(),
})
export type PreviewImportRequest = z.infer<typeof previewImportRequestSchema>

export const importPreviewSchema = z.object({
  data: importedCaseDataSchema,
  fieldSources: z.partialRecord(importFieldKeySchema, fieldSourceSchema),
  summary: importSummarySchema,
  eligibility: z.unknown(),
  calculation: z.unknown(),
  sickLeave: z.unknown(),
  validationIssues: z.array(sourceIssueSchema),
})
export type ImportPreview = z.infer<typeof importPreviewSchema>

export const importSessionViewSchema = z.object({
  session: importSessionSchema,
  initialData: importedCaseDataSchema,
  fieldSources: z.partialRecord(importFieldKeySchema, fieldSourceSchema),
})
export type ImportSessionView = z.infer<typeof importSessionViewSchema>

export const importAcceptanceSchema = z.object({
  session: importSessionSchema,
  prefill: importedCaseDataSchema,
  fieldSources: z.partialRecord(importFieldKeySchema, fieldSourceSchema),
  calculationInput: z.unknown(),
  eligibility: z.unknown(),
  sickLeave: z.unknown(),
  onboardingUrl: z.literal("/start?import=accepted"),
})
export type ImportAcceptance = z.infer<typeof importAcceptanceSchema>

/** Shape stored in sessionStorage for the onboarding wizard and calculator. */
export const importPrefillStorageSchema = z.object({
  sessionId: uuidSchema,
  data: importedCaseDataSchema,
  fieldSources: z.partialRecord(importFieldKeySchema, fieldSourceSchema),
})
export type ImportPrefillStorage = z.infer<typeof importPrefillStorageSchema>

export const importFieldLabels: Record<ImportFieldKey, string> = {
  firstName: "Imię",
  lastName: "Nazwisko",
  email: "Adres e-mail",
  birthDate: "Data urodzenia",
  city: "Miejscowość",
  eventType: "Sytuacja rodzinna",
  expectedDueDate: "Przewidywany termin porodu",
  eventDate: "Data urodzenia / przyjęcia dziecka",
  childrenCount: "Liczba dzieci z jednego porodu",
  hasZaZyciem: "Zaświadczenie „Za życiem”",
  isPremature: "Poród przedwcześnie zakończony",
  employmentType: "Forma zatrudnienia",
  employerName: "Pracodawca / płatnik składek",
  insuranceStartDate: "Początek ubezpieczenia",
  coverageMode: "Rodzaj ubezpieczenia chorobowego",
  grossMonthlyIncomePln: "Miesięczny dochód brutto",
  monthlyBasisGrosze: "Podstawa wymiaru zasiłku",
}

export const DATA_IMPORT_DISCLOSURE =
  "To symulacja. Pobranie danych nie łączy się z ZUS, PUE/eZUS, USC ani e-ZLA. Wszystkie rekordy są syntetyczne, a pobranie wymaga Twojej zgody na wybrany zakres."
