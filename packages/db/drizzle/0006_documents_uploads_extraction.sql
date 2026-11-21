CREATE SCHEMA "docs";
--> statement-breakpoint
CREATE TYPE "app"."checklist_status" AS ENUM('TODO', 'DONE', 'N_A');--> statement-breakpoint
CREATE TYPE "docs"."document_status" AS ENUM('UPLOADED', 'EXTRACTING', 'NEEDS_REVIEW', 'CONFIRMED', 'FAILED', 'DELETED');--> statement-breakpoint
CREATE TYPE "docs"."extraction_method" AS ENUM('ACROFORM', 'TEMPLATE', 'OCR', 'LLM_ASSISTED', 'DEMO');--> statement-breakpoint
CREATE TYPE "docs"."finding_severity" AS ENUM('ERROR', 'WARNING', 'INFO');--> statement-breakpoint
CREATE TYPE "docs"."upload_origin" AS ENUM('USER_UPLOAD', 'SAMPLE_CASE');--> statement-breakpoint
CREATE TABLE "app"."checklist_items" (
	"id" uuid PRIMARY KEY NOT NULL,
	"owner_key" text NOT NULL,
	"case_id" uuid,
	"source_document_id" uuid,
	"template_key" text NOT NULL,
	"title" text NOT NULL,
	"parent" text NOT NULL,
	"prepared_by" text NOT NULL,
	"submit_to" text NOT NULL,
	"when_text" text NOT NULL,
	"due_date" date,
	"legal_basis" text NOT NULL,
	"status" "app"."checklist_status" DEFAULT 'TODO' NOT NULL,
	"rule_set_version" text NOT NULL,
	"input_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "docs"."extractions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"upload_id" uuid NOT NULL,
	"detected_form" text NOT NULL,
	"method" "docs"."extraction_method" NOT NULL,
	"confidence" numeric(4, 3) NOT NULL,
	"status" "docs"."document_status" NOT NULL,
	"result" jsonb NOT NULL,
	"confirmed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "docs"."uploads" (
	"id" uuid PRIMARY KEY NOT NULL,
	"owner_key" text NOT NULL,
	"owner_user_id" uuid,
	"storage_key" text NOT NULL,
	"sha256" text NOT NULL,
	"mime" text NOT NULL,
	"size" integer NOT NULL,
	"origin" "docs"."upload_origin" NOT NULL,
	"sample_case_id" text,
	"file_name_hint" text,
	"status" "docs"."document_status" DEFAULT 'UPLOADED' NOT NULL,
	"consent_granted_at" timestamp with time zone,
	"delete_after" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "docs"."validation_findings" (
	"id" uuid PRIMARY KEY NOT NULL,
	"extraction_id" uuid NOT NULL,
	"severity" "docs"."finding_severity" NOT NULL,
	"code" text NOT NULL,
	"field_key" text,
	"message" text NOT NULL,
	"legal_basis" text
);
--> statement-breakpoint
ALTER TABLE "app"."checklist_items" ADD CONSTRAINT "checklist_items_case_id_benefit_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "app"."benefit_cases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."checklist_items" ADD CONSTRAINT "checklist_items_source_document_id_uploads_id_fk" FOREIGN KEY ("source_document_id") REFERENCES "docs"."uploads"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "docs"."extractions" ADD CONSTRAINT "extractions_upload_id_uploads_id_fk" FOREIGN KEY ("upload_id") REFERENCES "docs"."uploads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "docs"."uploads" ADD CONSTRAINT "uploads_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "app"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "docs"."validation_findings" ADD CONSTRAINT "validation_findings_extraction_id_extractions_id_fk" FOREIGN KEY ("extraction_id") REFERENCES "docs"."extractions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "checklist_items_owner_idx" ON "app"."checklist_items" USING btree ("owner_key","created_at");--> statement-breakpoint
CREATE INDEX "checklist_items_document_idx" ON "app"."checklist_items" USING btree ("source_document_id");--> statement-breakpoint
CREATE INDEX "extractions_upload_idx" ON "docs"."extractions" USING btree ("upload_id","created_at");--> statement-breakpoint
CREATE INDEX "uploads_owner_idx" ON "docs"."uploads" USING btree ("owner_key","created_at");--> statement-breakpoint
CREATE INDEX "uploads_delete_after_idx" ON "docs"."uploads" USING btree ("delete_after");--> statement-breakpoint
CREATE INDEX "validation_findings_extraction_idx" ON "docs"."validation_findings" USING btree ("extraction_id");