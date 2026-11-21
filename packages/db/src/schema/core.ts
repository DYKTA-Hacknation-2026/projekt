import {
  boolean,
  char,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgSchema,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  primaryKey,
  customType,
  type AnyPgColumn,
} from "drizzle-orm/pg-core"
import { sql, type SQL } from "drizzle-orm"

import { uuidv7 } from "../ids"

/**
 * Dimension-less pgvector column. Each embedding model writes vectors of its
 * own dimension; retrieval casts to `vector(<dims>)` so that the partial HNSW
 * index of the active model is used (see `kb.chunk_embeddings`).
 */
const anyVector = customType<{ data: number[]; driverData: string }>({
  dataType: () => "vector",
  toDriver: (value) => `[${value.join(",")}]`,
  fromDriver: (value) =>
    value
      .slice(1, -1)
      .split(",")
      .filter((part) => part.length > 0)
      .map(Number),
})

const tsvector = customType<{ data: string }>({
  dataType: () => "tsvector",
})

export const appSchema = pgSchema("app")
export const legalSchema = pgSchema("legal")
export const kbSchema = pgSchema("kb")
export const chatSchema = pgSchema("chat")

const createdAt = timestamp("created_at", { withTimezone: true })
  .notNull()
  .defaultNow()
const updatedAt = timestamp("updated_at", { withTimezone: true })
  .notNull()
  .defaultNow()

export const userRoleEnum = appSchema.enum("user_role", ["USER", "ADMIN"])
export const employmentTypeEnum = appSchema.enum("employment_type", [
  "EMPLOYMENT",
  "MANDATE",
  "SELF_EMPLOYMENT",
  "OTHER",
])
export const coverageModeEnum = appSchema.enum("coverage_mode", [
  "COMPULSORY",
  "VOLUNTARY",
])
export const familyEventTypeEnum = appSchema.enum("family_event_type", [
  "PREGNANCY",
  "BIRTH",
  "ADOPTION",
  "FOSTER_CARE",
])
export const benefitCaseStatusEnum = appSchema.enum("benefit_case_status", [
  "DRAFT",
  "IN_REVIEW",
  "READY",
  "CLOSED",
])
export const paymentOptionEnum = appSchema.enum("payment_option", [
  "STANDARD_100_70",
  "FLAT_81_5",
])
export const calculationStatusEnum = appSchema.enum("calculation_status", [
  "OK",
  "INDETERMINATE",
  "ERROR",
])
export const applicationStatusEnum = appSchema.enum("application_status", [
  "DRAFT",
  "READY",
  "SIMULATED_SENT",
])
export const recipientEnum = appSchema.enum("application_recipient", [
  "EMPLOYER",
  "ZUS",
])

export const dataSourceEnum = appSchema.enum("data_source_id", [
  "ZUS",
  "EMPLOYER",
  "EZLA",
  "USC",
  "PUE",
])

export const sourceFetchStatusEnum = appSchema.enum("source_fetch_status", [
  "PENDING",
  "SUCCESS",
  "PARTIAL",
  "EMPTY",
  "ERROR",
])

export const importSessionStatusEnum = appSchema.enum("import_session_status", [
  "CONSENTED",
  "RUNNING",
  "COMPLETED",
  "ACCEPTED",
  "SKIPPED",
])

export const payerTypeEnum = appSchema.enum("payer_type", [
  "EMPLOYER",
  "SELF_EMPLOYED",
  "MANDATE_PRINCIPAL",
])

export const salaryComponentKindEnum = appSchema.enum(
  "salary_component_kind",
  ["BASE", "BONUS", "ALLOWANCE", "OVERTIME", "OTHER"]
)

export const absenceKindEnum = appSchema.enum("absence_kind", [
  "SICK_LEAVE",
  "MATERNITY",
  "PARENTAL",
  "UNPAID",
  "OTHER",
])

export const sickLeaveKindEnum = appSchema.enum("sick_leave_kind", [
  "SICKNESS",
  "PREGNANCY",
  "CARE",
  "REHABILITATION",
])

export const benefitApplicationStatusEnum = appSchema.enum(
  "benefit_application_status",
  ["SUBMITTED", "IN_PROGRESS", "DECISION_ISSUED", "PAID", "REJECTED"]
)

export const verificationStatusEnum = legalSchema.enum("verification_status", [
  "VERIFIED",
  "UNVERIFIED",
  "PROPOSED",
])

export const knowledgeSourceTypeEnum = kbSchema.enum("source_type", [
  "LEGAL_ACT",
  "GUIDE",
  "TASK_DOCUMENT",
  "WEB_PAGE",
  "FORM_TEMPLATE",
  "INTERNAL",
  "OFFICIAL_GUIDANCE",
  "BENEFIT_TABLE",
  "FORM_INSTRUCTION",
  "GOVERNMENT_PAGE",
  "CHARITY_RESOURCE",
])
/**
 * Who may *see* retrieved content. RESTRICTED sources (e.g. the confidential
 * ZUS sample cases) are rejected by the ingestion pipeline and never indexed.
 */
export const accessLevelEnum = kbSchema.enum("access_level", [
  "PUBLIC",
  "INTERNAL",
  "RESTRICTED",
])
/** How retrieved content may be shown to end users. */
export const redistributionPolicyEnum = kbSchema.enum("redistribution_policy", [
  "ALLOWED",
  "ATTRIBUTION",
  "CITATION_ONLY",
  "PROHIBITED",
])
export const knowledgeDocumentStatusEnum = kbSchema.enum("document_status", [
  "PENDING",
  "INDEXED",
  "FAILED",
  "SUPERSEDED",
  "ARCHIVED",
])
export const ingestionStatusEnum = kbSchema.enum("ingestion_status", [
  "QUEUED",
  "RUNNING",
  "SUCCEEDED",
  "FAILED",
])
export const distanceMetricEnum = kbSchema.enum("distance_metric", [
  "COSINE",
  "L2",
  "INNER_PRODUCT",
])

export const conversationStatusEnum = chatSchema.enum("conversation_status", [
  "ACTIVE",
  "ARCHIVED",
])
export const messageRoleEnum = chatSchema.enum("message_role", [
  "USER",
  "ASSISTANT",
  "SYSTEM",
  "TOOL",
])
export const toolCallStatusEnum = chatSchema.enum("tool_call_status", [
  "SUCCEEDED",
  "FAILED",
])

/* -------------------------------------------------------------------------- */
/* app — personal data, benefit cases and drafts                               */
/* -------------------------------------------------------------------------- */

export const users = appSchema.table(
  "users",
  {
    id: uuid("id")
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    email: text("email").notNull(),
    role: userRoleEnum("role").notNull().default("USER"),
    displayName: text("display_name").notNull(),
    isDemo: boolean("is_demo").notNull().default(false),
    createdAt,
    updatedAt,
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("users_email_uq").on(table.email),
    index("users_role_idx").on(table.role),
  ]
)

export const userProfiles = appSchema.table(
  "user_profiles",
  {
    id: uuid("id")
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    birthDate: date("birth_date"),
    city: text("city"),
    preferredLanguage: text("preferred_language").notNull().default("pl"),
    healthDataConsent: boolean("health_data_consent").notNull().default(false),
    aiAssistantConsent: boolean("ai_assistant_consent")
      .notNull()
      .default(false),
    documentProcessingConsent: boolean("document_processing_consent")
      .notNull()
      .default(false),
    createdAt,
    updatedAt,
  },
  (table) => [uniqueIndex("user_profiles_user_uq").on(table.userId)]
)

export const employmentRecords = appSchema.table(
  "employment_records",
  {
    id: uuid("id")
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    employerName: text("employer_name").notNull(),
    contractType: employmentTypeEnum("contract_type").notNull(),
    startDate: date("start_date").notNull(),
    endDate: date("end_date"),
    grossMonthlyAmountGrosze: integer("gross_monthly_amount_grosze")
      .notNull()
      .default(0),
    workingTimeFraction: numeric("working_time_fraction", {
      precision: 4,
      scale: 3,
    })
      .notNull()
      .default("1.000"),
    isCurrent: boolean("is_current").notNull().default(true),
    createdAt,
    updatedAt,
  },
  (table) => [
    index("employment_records_user_idx").on(table.userId),
    index("employment_records_current_idx").on(table.isCurrent),
  ]
)

export const insurancePeriods = appSchema.table(
  "insurance_periods",
  {
    id: uuid("id")
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    employmentRecordId: uuid("employment_record_id").references(
      () => employmentRecords.id,
      { onDelete: "set null" }
    ),
    insuranceType: text("insurance_type").notNull().default("SICKNESS"),
    coverageMode: coverageModeEnum("coverage_mode")
      .notNull()
      .default("COMPULSORY"),
    startDate: date("start_date").notNull(),
    endDate: date("end_date"),
    monthlyBasisGrosze: integer("monthly_basis_grosze").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    notes: text("notes"),
    createdAt,
    updatedAt,
  },
  (table) => [
    index("insurance_periods_user_idx").on(table.userId),
    index("insurance_periods_dates_idx").on(table.startDate, table.endDate),
  ]
)

export const familyEvents = appSchema.table(
  "family_events",
  {
    id: uuid("id")
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    eventType: familyEventTypeEnum("event_type").notNull(),
    eventDate: date("event_date"),
    expectedDueDate: date("expected_due_date"),
    childCount: integer("child_count").notNull().default(1),
    isPremature: boolean("is_premature").notNull().default(false),
    hasZaZyciem: boolean("has_za_zyciem").notNull().default(false),
    adoptionDate: date("adoption_date"),
    notes: text("notes"),
    createdAt,
    updatedAt,
  },
  (table) => [index("family_events_user_idx").on(table.userId)]
)

export const benefitCases = appSchema.table(
  "benefit_cases",
  {
    id: uuid("id")
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    familyEventId: uuid("family_event_id").references(() => familyEvents.id, {
      onDelete: "set null",
    }),
    caseNumber: text("case_number").notNull(),
    title: text("title").notNull(),
    status: benefitCaseStatusEnum("status").notNull().default("DRAFT"),
    dueDate: date("due_date"),
    summary: text("summary"),
    metadata: jsonb("metadata")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    createdAt,
    updatedAt,
  },
  (table) => [
    uniqueIndex("benefit_cases_number_uq").on(table.caseNumber),
    index("benefit_cases_user_idx").on(table.userId),
    index("benefit_cases_status_idx").on(table.status),
  ]
)

export const benefitScenarios = appSchema.table(
  "benefit_scenarios",
  {
    id: uuid("id")
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    caseId: uuid("case_id")
      .notNull()
      .references(() => benefitCases.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    paymentOption: paymentOptionEnum("payment_option")
      .notNull()
      .default("STANDARD_100_70"),
    leaveSplit: jsonb("leave_split")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    assumptions: jsonb("assumptions")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    createdAt,
    updatedAt,
  },
  (table) => [index("benefit_scenarios_case_idx").on(table.caseId)]
)

export const legalRules = legalSchema.table(
  "legal_rules",
  {
    id: uuid("id")
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    code: text("code").notNull(),
    title: text("title").notNull(),
    description: text("description").notNull(),
    category: text("category").notNull(),
    legalReference: text("legal_reference").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    createdAt,
    updatedAt,
  },
  (table) => [
    uniqueIndex("legal_rules_code_uq").on(table.code),
    index("legal_rules_category_idx").on(table.category),
  ]
)

export const legalRuleVersions = legalSchema.table(
  "legal_rule_versions",
  {
    id: uuid("id")
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    ruleId: uuid("rule_id")
      .notNull()
      .references(() => legalRules.id, { onDelete: "cascade" }),
    version: text("version").notNull(),
    effectiveFrom: date("effective_from").notNull(),
    effectiveTo: date("effective_to"),
    parameters: jsonb("parameters")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    verificationStatus: verificationStatusEnum("verification_status")
      .notNull()
      .default("UNVERIFIED"),
    sourceUrl: text("source_url"),
    notes: text("notes"),
    createdAt,
  },
  (table) => [
    uniqueIndex("legal_rule_versions_rule_version_uq").on(
      table.ruleId,
      table.version
    ),
    index("legal_rule_versions_effective_idx").on(
      table.effectiveFrom,
      table.effectiveTo
    ),
  ]
)

export const benefitCalculations = appSchema.table(
  "benefit_calculations",
  {
    id: uuid("id")
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    caseId: uuid("case_id").references(() => benefitCases.id, {
      onDelete: "cascade",
    }),
    scenarioId: uuid("scenario_id").references(() => benefitScenarios.id, {
      onDelete: "set null",
    }),
    ruleVersionId: uuid("rule_version_id").references(
      () => legalRuleVersions.id,
      { onDelete: "set null" }
    ),
    input: jsonb("input")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    result: jsonb("result")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    totalAmountGrosze: integer("total_amount_grosze").notNull().default(0),
    status: calculationStatusEnum("status").notNull().default("INDETERMINATE"),
    engineVersion: text("engine_version").notNull().default("0.1.0-scaffold"),
    createdAt,
  },
  (table) => [
    index("benefit_calculations_case_idx").on(table.caseId),
    index("benefit_calculations_created_idx").on(table.createdAt),
  ]
)

export const applicationDrafts = appSchema.table(
  "application_drafts",
  {
    id: uuid("id")
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    caseId: uuid("case_id")
      .notNull()
      .references(() => benefitCases.id, { onDelete: "cascade" }),
    applicationType: text("application_type").notNull(),
    recipient: recipientEnum("recipient").notNull().default("ZUS"),
    formCode: text("form_code"),
    payload: jsonb("payload")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    status: applicationStatusEnum("status").notNull().default("DRAFT"),
    createdAt,
    updatedAt,
  },
  (table) => [
    index("application_drafts_case_idx").on(table.caseId),
    index("application_drafts_status_idx").on(table.status),
  ]
)

/* -------------------------------------------------------------------------- */
/* app — simulated external data, accepted snapshots and provenance            */
/* -------------------------------------------------------------------------- */

export const dataImportSessions = appSchema.table(
  "data_import_sessions",
  {
    id: uuid("id")
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    ownerKey: text("owner_key").notNull(),
    userId: uuid("user_id").references(() => users.id, {
      onDelete: "cascade",
    }),
    personaId: text("persona_id").notNull(),
    scenarioId: text("scenario_id").notNull(),
    scopes: jsonb("scopes").$type<string[]>().notNull().default([]),
    status: importSessionStatusEnum("status").notNull().default("CONSENTED"),
    acceptedData: jsonb("accepted_data")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    fieldSources: jsonb("field_sources")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    summary: jsonb("summary")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    engineVersion: text("engine_version").notNull().default("1.0.0-sim"),
    createdAt,
    updatedAt,
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
  },
  (table) => [
    index("data_import_sessions_owner_idx").on(table.ownerKey, table.createdAt),
    index("data_import_sessions_user_idx").on(table.userId, table.acceptedAt),
    index("data_import_sessions_status_idx").on(table.status),
  ]
)

export const dataImportSnapshots = appSchema.table(
  "data_import_snapshots",
  {
    id: uuid("id")
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => dataImportSessions.id, { onDelete: "cascade" }),
    sourceId: dataSourceEnum("source_id").notNull(),
    status: sourceFetchStatusEnum("status").notNull().default("PENDING"),
    payload: jsonb("payload")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    issues: jsonb("issues").$type<unknown[]>().notNull().default([]),
    fetchedAt: timestamp("fetched_at", { withTimezone: true }),
    createdAt,
  },
  (table) => [
    uniqueIndex("data_import_snapshots_session_source_uq").on(
      table.sessionId,
      table.sourceId
    ),
    index("data_import_snapshots_session_idx").on(table.sessionId),
  ]
)

export const contributionPayers = appSchema.table(
  "contribution_payers",
  {
    id: uuid("id")
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    payerType: payerTypeEnum("payer_type").notNull().default("EMPLOYER"),
    taxId: text("tax_id").notNull(),
    city: text("city"),
    isCurrent: boolean("is_current").notNull().default(true),
    source: text("source").notNull().default("SIMULATED"),
    createdAt,
    updatedAt,
  },
  (table) => [index("contribution_payers_user_idx").on(table.userId)]
)

export const payrollComponents = appSchema.table(
  "payroll_components",
  {
    id: uuid("id")
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    employmentRecordId: uuid("employment_record_id")
      .notNull()
      .references(() => employmentRecords.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    kind: salaryComponentKindEnum("kind").notNull().default("BASE"),
    amountGrosze: integer("amount_grosze").notNull().default(0),
    validFrom: date("valid_from").notNull(),
    validTo: date("valid_to"),
    createdAt,
  },
  (table) => [
    index("payroll_components_employment_idx").on(table.employmentRecordId),
  ]
)

export const contributionBases = appSchema.table(
  "contribution_bases",
  {
    id: uuid("id")
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    insurancePeriodId: uuid("insurance_period_id").references(
      () => insurancePeriods.id,
      { onDelete: "set null" }
    ),
    periodStart: date("period_start").notNull(),
    periodEnd: date("period_end").notNull(),
    basisGrosze: integer("basis_grosze").notNull().default(0),
    sicknessContributionGrosze: integer("sickness_contribution_grosze")
      .notNull()
      .default(0),
    paid: boolean("paid").notNull().default(true),
    paidAt: date("paid_at"),
    source: text("source").notNull().default("SIMULATED_ZUS"),
    createdAt,
  },
  (table) => [
    index("contribution_bases_user_idx").on(table.userId),
    index("contribution_bases_period_idx").on(table.periodStart, table.periodEnd),
  ]
)

export const sickLeavePeriods = appSchema.table(
  "sick_leave_periods",
  {
    id: uuid("id")
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    startDate: date("start_date").notNull(),
    endDate: date("end_date").notNull(),
    days: integer("days").notNull(),
    kind: sickLeaveKindEnum("kind").notNull().default("SICKNESS"),
    pregnancyRelated: boolean("pregnancy_related").notNull().default(false),
    certificateRef: text("certificate_ref").notNull(),
    payerName: text("payer_name").notNull(),
    status: text("status").notNull().default("FINISHED"),
    source: text("source").notNull().default("SIMULATED_EZLA"),
    createdAt,
  },
  (table) => [index("sick_leave_periods_user_idx").on(table.userId, table.startDate)]
)

export const importedChildren = appSchema.table(
  "children",
  {
    id: uuid("id")
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    familyEventId: uuid("family_event_id").references(() => familyEvents.id, {
      onDelete: "set null",
    }),
    firstName: text("first_name"),
    birthDate: date("birth_date").notNull(),
    childrenInBirth: integer("children_in_birth").notNull().default(1),
    isAdopted: boolean("is_adopted").notNull().default(false),
    adoptionDate: date("adoption_date"),
    birthPlace: text("birth_place"),
    source: text("source").notNull().default("SIMULATED_USC"),
    createdAt,
  },
  (table) => [index("children_user_idx").on(table.userId, table.birthDate)]
)

export const benefitApplications = appSchema.table(
  "benefit_applications",
  {
    id: uuid("id")
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    caseNumber: text("case_number").notNull(),
    applicationType: text("application_type").notNull(),
    benefitKind: text("benefit_kind").notNull(),
    status: benefitApplicationStatusEnum("status")
      .notNull()
      .default("SUBMITTED"),
    submittedAt: date("submitted_at").notNull(),
    decisionNumber: text("decision_number"),
    decisionDate: date("decision_date"),
    periodFrom: date("period_from"),
    periodTo: date("period_to"),
    amountGrosze: integer("amount_grosze"),
    documents: jsonb("documents")
      .$type<Record<string, unknown>[]>()
      .notNull()
      .default([]),
    source: text("source").notNull().default("SIMULATED_PUE"),
    createdAt,
  },
  (table) => [
    uniqueIndex("benefit_applications_user_case_uq").on(
      table.userId,
      table.caseNumber
    ),
    index("benefit_applications_user_idx").on(table.userId, table.submittedAt),
  ]
)

export const payrollAbsences = appSchema.table(
  "payroll_absences",
  {
    id: uuid("id")
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    employmentRecordId: uuid("employment_record_id")
      .notNull()
      .references(() => employmentRecords.id, { onDelete: "cascade" }),
    kind: absenceKindEnum("kind").notNull().default("OTHER"),
    startDate: date("start_date").notNull(),
    endDate: date("end_date").notNull(),
    note: text("note"),
    createdAt,
  },
  (table) => [
    index("payroll_absences_employment_idx").on(table.employmentRecordId),
  ]
)

/* -------------------------------------------------------------------------- */
/* kb — knowledge sources, documents, chunks and embeddings                    */
/* -------------------------------------------------------------------------- */

export const embeddingModels = kbSchema.table(
  "embedding_models",
  {
    id: uuid("id")
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    name: text("name").notNull(),
    provider: text("provider").notNull(),
    dimensions: integer("dimensions").notNull(),
    distanceMetric: distanceMetricEnum("distance_metric")
      .notNull()
      .default("COSINE"),
    /**
     * Fingerprint of everything that changes the vector space (provider,
     * model, dimensions, query/document prefixes, normalisation). Index and
     * query time must use the same fingerprint.
     */
    configFingerprint: char("config_fingerprint", { length: 64 }),
    settings: jsonb("settings")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    isActive: boolean("is_active").notNull().default(false),
    description: text("description"),
    createdAt,
  },
  (table) => [
    uniqueIndex("embedding_models_name_uq").on(table.name),
    index("embedding_models_active_idx").on(table.isActive),
  ]
)

export const knowledgeSources = kbSchema.table(
  "knowledge_sources",
  {
    id: uuid("id")
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    publisher: text("publisher").notNull(),
    sourceType: knowledgeSourceTypeEnum("source_type").notNull(),
    url: text("url"),
    description: text("description"),
    isConfidential: boolean("is_confidential").notNull().default(false),
    accessLevel: accessLevelEnum("access_level").notNull().default("PUBLIC"),
    redistribution: redistributionPolicyEnum("redistribution")
      .notNull()
      .default("ATTRIBUTION"),
    /** Higher wins when sources conflict (statute > regulation > guide). */
    authorityRank: integer("authority_rank").notNull().default(50),
    language: text("language").notNull().default("pl"),
    metadata: jsonb("metadata")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    createdAt,
    updatedAt,
  },
  (table) => [
    uniqueIndex("knowledge_sources_slug_uq").on(table.slug),
    index("knowledge_sources_type_idx").on(table.sourceType),
    index("knowledge_sources_access_idx").on(table.accessLevel),
  ]
)

export const knowledgeDocuments = kbSchema.table(
  "knowledge_documents",
  {
    id: uuid("id")
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    sourceId: uuid("source_id")
      .notNull()
      .references(() => knowledgeSources.id, { onDelete: "cascade" }),
    /** Stable identifier of the logical document inside its source. */
    documentKey: text("document_key").notNull().default("main"),
    title: text("title").notNull(),
    version: text("version").notNull(),
    documentType: text("document_type").notNull().default("LEGAL_EXTRACT"),
    language: text("language").notNull().default("pl"),
    /** Official identifier, e.g. "Dz.U. 2026 poz. 854". */
    externalId: text("external_id"),
    sourceUrl: text("source_url"),
    publishedAt: date("published_at"),
    effectiveFrom: date("effective_from"),
    effectiveTo: date("effective_to"),
    /** sha256 of the normalised text; the deduplication key. */
    contentHash: char("content_hash", { length: 64 }),
    /** sha256 of the raw bytes (PDF/HTML) as fetched. */
    rawHash: char("raw_hash", { length: 64 }),
    storageKey: text("storage_key"),
    pageCount: integer("page_count"),
    /**
     * Optional per-document restriction. The effective policy is the more
     * restrictive of the source and the document (e.g. a public statute
     * source can hold an INTERNAL competition copy of its text).
     */
    accessLevel: accessLevelEnum("access_level"),
    redistribution: redistributionPolicyEnum("redistribution"),
    status: knowledgeDocumentStatusEnum("status").notNull().default("PENDING"),
    supersededById: uuid("superseded_by_id").references(
      (): AnyPgColumn => knowledgeDocuments.id,
      { onDelete: "set null" }
    ),
    lastIngestedAt: timestamp("last_ingested_at", { withTimezone: true }),
    metadata: jsonb("metadata")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    createdAt,
    updatedAt,
  },
  (table) => [
    uniqueIndex("knowledge_documents_source_key_version_uq").on(
      table.sourceId,
      table.documentKey,
      table.version
    ),
    index("knowledge_documents_source_idx").on(table.sourceId),
    index("knowledge_documents_status_idx").on(table.status),
    index("knowledge_documents_hash_idx").on(table.contentHash),
    index("knowledge_documents_effective_idx").on(
      table.effectiveFrom,
      table.effectiveTo
    ),
  ]
)

export const knowledgeChunks = kbSchema.table(
  "knowledge_chunks",
  {
    id: uuid("id")
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    documentId: uuid("document_id")
      .notNull()
      .references(() => knowledgeDocuments.id, { onDelete: "cascade" }),
    chunkIndex: integer("chunk_index").notNull().default(0),
    content: text("content").notNull(),
    sourceTitle: text("source_title").notNull(),
    sourceUrl: text("source_url"),
    sourceType: text("source_type").notNull(),
    pageNumber: integer("page_number"),
    pageEnd: integer("page_end"),
    sectionIdentifier: text("section_identifier"),
    /** Human-readable breadcrumb, e.g. "Ustawa zasiłkowa › Rozdział 4 › Art. 29". */
    headingPath: text("heading_path"),
    legalReference: text("legal_reference"),
    validFrom: date("valid_from"),
    validTo: date("valid_to"),
    contentHash: char("content_hash", { length: 64 }).notNull(),
    /** Lower-cased, diacritic-free text used for exact keyword matching. */
    searchText: text("search_text").notNull().default(""),
    /** Light Polish stems of `search_text` used for ranked keyword search. */
    stemText: text("stem_text").notNull().default(""),
    searchTsv: tsvector("search_tsv").generatedAlwaysAs(
      (): SQL =>
        sql`to_tsvector('simple'::regconfig, ${knowledgeChunks.searchText})`
    ),
    stemTsv: tsvector("stem_tsv").generatedAlwaysAs(
      (): SQL =>
        sql`to_tsvector('simple'::regconfig, ${knowledgeChunks.stemText})`
    ),
    isActive: boolean("is_active").notNull().default(true),
    metadata: jsonb("metadata")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    tokenCount: integer("token_count").notNull().default(0),
    createdAt,
  },
  (table) => [
    // Removed chunks are deactivated, not deleted, so chat evidence keeps
    // pointing at the text that was shown; only active chunks are ordered.
    uniqueIndex("knowledge_chunks_document_index_uq")
      .on(table.documentId, table.chunkIndex)
      .where(sql`${table.isActive}`),
    index("knowledge_chunks_active_idx").on(table.documentId, table.isActive),
    index("knowledge_chunks_document_idx").on(table.documentId),
    index("knowledge_chunks_hash_idx").on(table.contentHash),
    index("knowledge_chunks_legal_reference_idx").on(table.legalReference),
    index("knowledge_chunks_validity_idx").on(table.validFrom, table.validTo),
    index("knowledge_chunks_search_tsv_idx").using("gin", table.searchTsv),
    index("knowledge_chunks_stem_tsv_idx").using("gin", table.stemTsv),
  ]
)

/**
 * One row per (chunk, embedding model). The column has no fixed dimension:
 * every model gets its own partial HNSW index created by the ingestion
 * pipeline (`kb.ensure_embedding_index`), so switching provider, model or
 * dimensions needs no schema change and incompatible vectors never mix.
 */
export const chunkEmbeddings = kbSchema.table(
  "chunk_embeddings",
  {
    chunkId: uuid("chunk_id")
      .notNull()
      .references(() => knowledgeChunks.id, { onDelete: "cascade" }),
    embeddingModelId: uuid("embedding_model_id")
      .notNull()
      .references(() => embeddingModels.id, { onDelete: "restrict" }),
    dimensions: integer("dimensions").notNull(),
    embedding: anyVector("embedding").notNull(),
    /** Hash of the embedded text, so stale vectors can be detected. */
    contentHash: char("content_hash", { length: 64 }).notNull(),
    createdAt,
  },
  (table) => [
    primaryKey({
      name: "chunk_embeddings_pk",
      columns: [table.chunkId, table.embeddingModelId],
    }),
    index("chunk_embeddings_model_idx").on(table.embeddingModelId),
  ]
)

export const ingestionJobs = kbSchema.table(
  "ingestion_jobs",
  {
    id: uuid("id")
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    documentId: uuid("document_id")
      .notNull()
      .references(() => knowledgeDocuments.id, { onDelete: "cascade" }),
    status: ingestionStatusEnum("status").notNull().default("QUEUED"),
    /** Last pipeline stage reached (register, extract, … verify). */
    stage: text("stage"),
    attempts: integer("attempts").notNull().default(0),
    embeddingModelId: uuid("embedding_model_id").references(
      () => embeddingModels.id,
      { onDelete: "set null" }
    ),
    chunksCreated: integer("chunks_created").notNull().default(0),
    startedAt: timestamp("started_at", { withTimezone: true }),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
    error: text("error"),
    stats: jsonb("stats")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    createdAt,
  },
  (table) => [
    index("ingestion_jobs_document_idx").on(table.documentId),
    index("ingestion_jobs_status_idx").on(table.status),
  ]
)

/* -------------------------------------------------------------------------- */
/* chat — conversations, messages, tool calls and retrieved evidence           */
/* -------------------------------------------------------------------------- */

export const conversations = chatSchema.table(
  "conversations",
  {
    id: uuid("id")
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    userId: uuid("user_id").references(() => users.id, {
      onDelete: "cascade",
    }),
    /**
     * Opaque owner of the conversation (signed session id). Every read and
     * delete is filtered by it, so a guest can only reach their own chats.
     */
    ownerKey: text("owner_key"),
    title: text("title").notNull().default("Nowa rozmowa"),
    status: conversationStatusEnum("status").notNull().default("ACTIVE"),
    isSimulated: boolean("is_simulated").notNull().default(true),
    createdAt,
    updatedAt,
  },
  (table) => [
    index("conversations_user_idx").on(table.userId),
    index("conversations_updated_idx").on(table.updatedAt),
    index("conversations_owner_idx").on(table.ownerKey, table.updatedAt),
  ]
)

export const conversationMessages = chatSchema.table(
  "conversation_messages",
  {
    id: uuid("id")
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    role: messageRoleEnum("role").notNull(),
    content: text("content").notNull(),
    model: text("model"),
    tokensIn: integer("tokens_in"),
    tokensOut: integer("tokens_out"),
    metadata: jsonb("metadata")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    createdAt,
  },
  (table) => [
    index("conversation_messages_conversation_idx").on(table.conversationId),
    index("conversation_messages_created_idx").on(table.createdAt),
  ]
)

export const assistantToolCalls = chatSchema.table(
  "assistant_tool_calls",
  {
    id: uuid("id")
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    messageId: uuid("message_id")
      .notNull()
      .references(() => conversationMessages.id, { onDelete: "cascade" }),
    toolName: text("tool_name").notNull(),
    arguments: jsonb("arguments")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    result: jsonb("result")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    status: toolCallStatusEnum("status").notNull().default("SUCCEEDED"),
    latencyMs: integer("latency_ms"),
    createdAt,
  },
  (table) => [
    index("assistant_tool_calls_message_idx").on(table.messageId),
    index("assistant_tool_calls_tool_idx").on(table.toolName),
  ]
)

export const retrievedEvidence = chatSchema.table(
  "retrieved_evidence",
  {
    id: uuid("id")
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    messageId: uuid("message_id")
      .notNull()
      .references(() => conversationMessages.id, { onDelete: "cascade" }),
    chunkId: uuid("chunk_id")
      .notNull()
      .references(() => knowledgeChunks.id, { onDelete: "cascade" }),
    rank: integer("rank").notNull(),
    score: numeric("score", { precision: 8, scale: 5 }).notNull().default("0"),
    quote: text("quote").notNull(),
    createdAt,
  },
  (table) => [
    uniqueIndex("retrieved_evidence_message_chunk_rank_uq").on(
      table.messageId,
      table.chunkId,
      table.rank
    ),
    index("retrieved_evidence_message_idx").on(table.messageId),
  ]
)
