import { date, index, integer, jsonb, numeric, pgSchema, text, timestamp, uuid } from "drizzle-orm/pg-core"

import type { DocumentExtraction } from "@zpr/contracts/documents"

import { uuidv7 } from "../ids"
import { appSchema, benefitCases, users } from "./core"

/**
 * `docs` — uploaded documents and their extraction (database-design §2.4,
 * FR-PRD-06). Personal data: rows are hard-deleted at `delete_after`
 * (24 h) together with the stored file; extractions and findings cascade.
 *
 * Fields are kept as one JSON snapshot in `extractions.result` rather than an
 * `extracted_fields` table: the confirmation UI reads and writes the whole
 * set at once, every edit re-runs the validators over all fields, and the
 * snapshot has the same 24 h lifetime. Only confirmed values leave this
 * schema — as engine facts and `app.checklist_items`.
 */
export const docsSchema = pgSchema("docs")

export const uploadOriginEnum = docsSchema.enum("upload_origin", ["USER_UPLOAD", "SAMPLE_CASE"])
export const documentStatusEnum = docsSchema.enum("document_status", [
  "UPLOADED",
  "EXTRACTING",
  "NEEDS_REVIEW",
  "CONFIRMED",
  "FAILED",
  "DELETED",
])
export const extractionMethodEnum = docsSchema.enum("extraction_method", ["ACROFORM", "TEMPLATE", "OCR", "LLM_ASSISTED", "DEMO"])
export const findingSeverityEnum = docsSchema.enum("finding_severity", ["ERROR", "WARNING", "INFO"])
export const checklistStatusEnum = appSchema.enum("checklist_status", ["TODO", "DONE", "N_A"])

export const documentUploads = docsSchema.table(
  "uploads",
  {
    id: uuid("id")
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    /** Session subject of the uploader (guests have no user row). */
    ownerKey: text("owner_key").notNull(),
    ownerUserId: uuid("owner_user_id").references(() => users.id, { onDelete: "cascade" }),
    /** Opaque private-storage key, or `sample:<id>` for a sample case. Never a URL. */
    storageKey: text("storage_key").notNull(),
    sha256: text("sha256").notNull(),
    mime: text("mime").notNull(),
    size: integer("size").notNull(),
    origin: uploadOriginEnum("origin").notNull(),
    sampleCaseId: text("sample_case_id"),
    /** Form code suggested by the file name (the name itself is not stored). */
    fileNameHint: text("file_name_hint"),
    status: documentStatusEnum("status").notNull().default("UPLOADED"),
    consentGrantedAt: timestamp("consent_granted_at", { withTimezone: true }),
    deleteAfter: timestamp("delete_after", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("uploads_owner_idx").on(table.ownerKey, table.createdAt),
    index("uploads_delete_after_idx").on(table.deleteAfter),
  ]
)

export const documentExtractions = docsSchema.table(
  "extractions",
  {
    id: uuid("id")
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    uploadId: uuid("upload_id")
      .notNull()
      .references(() => documentUploads.id, { onDelete: "cascade" }),
    detectedForm: text("detected_form").notNull(),
    method: extractionMethodEnum("method").notNull(),
    confidence: numeric("confidence", { precision: 4, scale: 3 }).notNull(),
    status: documentStatusEnum("status").notNull(),
    result: jsonb("result").$type<DocumentExtraction>().notNull(),
    confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("extractions_upload_idx").on(table.uploadId, table.createdAt)]
)

export const documentValidationFindings = docsSchema.table(
  "validation_findings",
  {
    id: uuid("id")
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    extractionId: uuid("extraction_id")
      .notNull()
      .references(() => documentExtractions.id, { onDelete: "cascade" }),
    severity: findingSeverityEnum("severity").notNull(),
    code: text("code").notNull(),
    fieldKey: text("field_key"),
    message: text("message").notNull(),
    legalBasis: text("legal_basis"),
  },
  (table) => [index("validation_findings_extraction_idx").on(table.extractionId)]
)

/**
 * Personalised checklist generated from the engine's document report and
 * deadlines (database-design §2.3). Kept with the owner after the upload is
 * purged — it holds no document content, only template keys and dates.
 */
export const checklistItems = appSchema.table(
  "checklist_items",
  {
    id: uuid("id")
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    ownerKey: text("owner_key").notNull(),
    caseId: uuid("case_id").references(() => benefitCases.id, { onDelete: "cascade" }),
    sourceDocumentId: uuid("source_document_id").references(() => documentUploads.id, { onDelete: "set null" }),
    templateKey: text("template_key").notNull(),
    title: text("title").notNull(),
    parent: text("parent").notNull(),
    preparedBy: text("prepared_by").notNull(),
    submitTo: text("submit_to").notNull(),
    whenText: text("when_text").notNull(),
    dueDate: date("due_date"),
    legalBasis: text("legal_basis").notNull(),
    status: checklistStatusEnum("status").notNull().default("TODO"),
    ruleSetVersion: text("rule_set_version").notNull(),
    inputHash: text("input_hash").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("checklist_items_owner_idx").on(table.ownerKey, table.createdAt),
    index("checklist_items_document_idx").on(table.sourceDocumentId),
  ]
)
