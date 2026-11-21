-- ZUS Parental Benefits Guide — initial schema.
-- One PostgreSQL database holds application data, legal rules and RAG vectors.
-- pgvector is enabled explicitly here (the compose init script also does this
-- defensively for containers that skip migrations during bootstrap).
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
--> statement-breakpoint
CREATE SCHEMA "app";
--> statement-breakpoint
CREATE SCHEMA "chat";
--> statement-breakpoint
CREATE SCHEMA "kb";
--> statement-breakpoint
CREATE SCHEMA "legal";
--> statement-breakpoint
CREATE TYPE "app"."application_status" AS ENUM('DRAFT', 'READY', 'SIMULATED_SENT');--> statement-breakpoint
CREATE TYPE "app"."benefit_case_status" AS ENUM('DRAFT', 'IN_REVIEW', 'READY', 'CLOSED');--> statement-breakpoint
CREATE TYPE "app"."calculation_status" AS ENUM('OK', 'INDETERMINATE', 'ERROR');--> statement-breakpoint
CREATE TYPE "chat"."conversation_status" AS ENUM('ACTIVE', 'ARCHIVED');--> statement-breakpoint
CREATE TYPE "app"."coverage_mode" AS ENUM('COMPULSORY', 'VOLUNTARY');--> statement-breakpoint
CREATE TYPE "kb"."distance_metric" AS ENUM('COSINE', 'L2', 'INNER_PRODUCT');--> statement-breakpoint
CREATE TYPE "app"."employment_type" AS ENUM('EMPLOYMENT', 'MANDATE', 'SELF_EMPLOYMENT', 'OTHER');--> statement-breakpoint
CREATE TYPE "app"."family_event_type" AS ENUM('PREGNANCY', 'BIRTH', 'ADOPTION', 'FOSTER_CARE');--> statement-breakpoint
CREATE TYPE "kb"."ingestion_status" AS ENUM('QUEUED', 'RUNNING', 'SUCCEEDED', 'FAILED');--> statement-breakpoint
CREATE TYPE "kb"."document_status" AS ENUM('PENDING', 'INDEXED', 'FAILED');--> statement-breakpoint
CREATE TYPE "kb"."source_type" AS ENUM('LEGAL_ACT', 'GUIDE', 'TASK_DOCUMENT', 'WEB_PAGE', 'FORM_TEMPLATE', 'INTERNAL');--> statement-breakpoint
CREATE TYPE "chat"."message_role" AS ENUM('USER', 'ASSISTANT', 'SYSTEM', 'TOOL');--> statement-breakpoint
CREATE TYPE "app"."payment_option" AS ENUM('STANDARD_100_70', 'FLAT_81_5');--> statement-breakpoint
CREATE TYPE "app"."application_recipient" AS ENUM('EMPLOYER', 'ZUS');--> statement-breakpoint
CREATE TYPE "chat"."tool_call_status" AS ENUM('SUCCEEDED', 'FAILED');--> statement-breakpoint
CREATE TYPE "app"."user_role" AS ENUM('USER', 'ADMIN');--> statement-breakpoint
CREATE TYPE "legal"."verification_status" AS ENUM('VERIFIED', 'UNVERIFIED', 'PROPOSED');--> statement-breakpoint
CREATE TABLE "app"."application_drafts" (
	"id" uuid PRIMARY KEY NOT NULL,
	"case_id" uuid NOT NULL,
	"application_type" text NOT NULL,
	"recipient" "app"."application_recipient" DEFAULT 'ZUS' NOT NULL,
	"form_code" text,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" "app"."application_status" DEFAULT 'DRAFT' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chat"."assistant_tool_calls" (
	"id" uuid PRIMARY KEY NOT NULL,
	"message_id" uuid NOT NULL,
	"tool_name" text NOT NULL,
	"arguments" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"result" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" "chat"."tool_call_status" DEFAULT 'SUCCEEDED' NOT NULL,
	"latency_ms" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app"."benefit_calculations" (
	"id" uuid PRIMARY KEY NOT NULL,
	"case_id" uuid,
	"scenario_id" uuid,
	"rule_version_id" uuid,
	"input" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"result" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"total_amount_grosze" integer DEFAULT 0 NOT NULL,
	"status" "app"."calculation_status" DEFAULT 'INDETERMINATE' NOT NULL,
	"engine_version" text DEFAULT '0.1.0-scaffold' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app"."benefit_cases" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"family_event_id" uuid,
	"case_number" text NOT NULL,
	"title" text NOT NULL,
	"status" "app"."benefit_case_status" DEFAULT 'DRAFT' NOT NULL,
	"due_date" date,
	"summary" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app"."benefit_scenarios" (
	"id" uuid PRIMARY KEY NOT NULL,
	"case_id" uuid NOT NULL,
	"name" text NOT NULL,
	"payment_option" "app"."payment_option" DEFAULT 'STANDARD_100_70' NOT NULL,
	"leave_split" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"assumptions" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chat"."conversation_messages" (
	"id" uuid PRIMARY KEY NOT NULL,
	"conversation_id" uuid NOT NULL,
	"role" "chat"."message_role" NOT NULL,
	"content" text NOT NULL,
	"model" text,
	"tokens_in" integer,
	"tokens_out" integer,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chat"."conversations" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid,
	"title" text DEFAULT 'Nowa rozmowa' NOT NULL,
	"status" "chat"."conversation_status" DEFAULT 'ACTIVE' NOT NULL,
	"is_simulated" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "kb"."embedding_models" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"provider" text NOT NULL,
	"dimensions" integer NOT NULL,
	"distance_metric" "kb"."distance_metric" DEFAULT 'COSINE' NOT NULL,
	"is_active" boolean DEFAULT false NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app"."employment_records" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"employer_name" text NOT NULL,
	"contract_type" "app"."employment_type" NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date,
	"gross_monthly_amount_grosze" integer DEFAULT 0 NOT NULL,
	"working_time_fraction" numeric(4, 3) DEFAULT '1.000' NOT NULL,
	"is_current" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app"."family_events" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"event_type" "app"."family_event_type" NOT NULL,
	"event_date" date,
	"expected_due_date" date,
	"child_count" integer DEFAULT 1 NOT NULL,
	"is_premature" boolean DEFAULT false NOT NULL,
	"has_za_zyciem" boolean DEFAULT false NOT NULL,
	"adoption_date" date,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "kb"."ingestion_jobs" (
	"id" uuid PRIMARY KEY NOT NULL,
	"document_id" uuid NOT NULL,
	"status" "kb"."ingestion_status" DEFAULT 'QUEUED' NOT NULL,
	"chunks_created" integer DEFAULT 0 NOT NULL,
	"started_at" timestamp with time zone,
	"finished_at" timestamp with time zone,
	"error" text,
	"stats" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app"."insurance_periods" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"employment_record_id" uuid,
	"insurance_type" text DEFAULT 'SICKNESS' NOT NULL,
	"coverage_mode" "app"."coverage_mode" DEFAULT 'COMPULSORY' NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date,
	"monthly_basis_grosze" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "kb"."knowledge_chunks" (
	"id" uuid PRIMARY KEY NOT NULL,
	"document_id" uuid NOT NULL,
	"embedding_model_id" uuid NOT NULL,
	"content" text NOT NULL,
	"embedding" vector(1024) NOT NULL,
	"source_title" text NOT NULL,
	"source_url" text,
	"source_type" text NOT NULL,
	"page_number" integer,
	"section_identifier" text,
	"legal_reference" text,
	"valid_from" date,
	"valid_to" date,
	"content_hash" char(64) NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"token_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "kb"."knowledge_documents" (
	"id" uuid PRIMARY KEY NOT NULL,
	"source_id" uuid NOT NULL,
	"title" text NOT NULL,
	"version" text NOT NULL,
	"document_type" text DEFAULT 'LEGAL_EXTRACT' NOT NULL,
	"language" text DEFAULT 'pl' NOT NULL,
	"published_at" date,
	"effective_from" date,
	"effective_to" date,
	"content_hash" char(64),
	"storage_key" text,
	"status" "kb"."document_status" DEFAULT 'PENDING' NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "kb"."knowledge_sources" (
	"id" uuid PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"publisher" text NOT NULL,
	"source_type" "kb"."source_type" NOT NULL,
	"url" text,
	"description" text,
	"is_confidential" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "legal"."legal_rule_versions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"rule_id" uuid NOT NULL,
	"version" text NOT NULL,
	"effective_from" date NOT NULL,
	"effective_to" date,
	"parameters" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"verification_status" "legal"."verification_status" DEFAULT 'UNVERIFIED' NOT NULL,
	"source_url" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "legal"."legal_rules" (
	"id" uuid PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"category" text NOT NULL,
	"legal_reference" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chat"."retrieved_evidence" (
	"id" uuid PRIMARY KEY NOT NULL,
	"message_id" uuid NOT NULL,
	"chunk_id" uuid NOT NULL,
	"rank" integer NOT NULL,
	"score" numeric(8, 5) DEFAULT '0' NOT NULL,
	"quote" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app"."user_profiles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"birth_date" date,
	"city" text,
	"preferred_language" text DEFAULT 'pl' NOT NULL,
	"health_data_consent" boolean DEFAULT false NOT NULL,
	"ai_assistant_consent" boolean DEFAULT false NOT NULL,
	"document_processing_consent" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app"."users" (
	"id" uuid PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"role" "app"."user_role" DEFAULT 'USER' NOT NULL,
	"display_name" text NOT NULL,
	"is_demo" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "app"."application_drafts" ADD CONSTRAINT "application_drafts_case_id_benefit_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "app"."benefit_cases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat"."assistant_tool_calls" ADD CONSTRAINT "assistant_tool_calls_message_id_conversation_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "chat"."conversation_messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."benefit_calculations" ADD CONSTRAINT "benefit_calculations_case_id_benefit_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "app"."benefit_cases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."benefit_calculations" ADD CONSTRAINT "benefit_calculations_scenario_id_benefit_scenarios_id_fk" FOREIGN KEY ("scenario_id") REFERENCES "app"."benefit_scenarios"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."benefit_calculations" ADD CONSTRAINT "benefit_calculations_rule_version_id_legal_rule_versions_id_fk" FOREIGN KEY ("rule_version_id") REFERENCES "legal"."legal_rule_versions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."benefit_cases" ADD CONSTRAINT "benefit_cases_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "app"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."benefit_cases" ADD CONSTRAINT "benefit_cases_family_event_id_family_events_id_fk" FOREIGN KEY ("family_event_id") REFERENCES "app"."family_events"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."benefit_scenarios" ADD CONSTRAINT "benefit_scenarios_case_id_benefit_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "app"."benefit_cases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat"."conversation_messages" ADD CONSTRAINT "conversation_messages_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "chat"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat"."conversations" ADD CONSTRAINT "conversations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "app"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."employment_records" ADD CONSTRAINT "employment_records_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "app"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."family_events" ADD CONSTRAINT "family_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "app"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kb"."ingestion_jobs" ADD CONSTRAINT "ingestion_jobs_document_id_knowledge_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "kb"."knowledge_documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."insurance_periods" ADD CONSTRAINT "insurance_periods_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "app"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."insurance_periods" ADD CONSTRAINT "insurance_periods_employment_record_id_employment_records_id_fk" FOREIGN KEY ("employment_record_id") REFERENCES "app"."employment_records"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kb"."knowledge_chunks" ADD CONSTRAINT "knowledge_chunks_document_id_knowledge_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "kb"."knowledge_documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kb"."knowledge_chunks" ADD CONSTRAINT "knowledge_chunks_embedding_model_id_embedding_models_id_fk" FOREIGN KEY ("embedding_model_id") REFERENCES "kb"."embedding_models"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kb"."knowledge_documents" ADD CONSTRAINT "knowledge_documents_source_id_knowledge_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "kb"."knowledge_sources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "legal"."legal_rule_versions" ADD CONSTRAINT "legal_rule_versions_rule_id_legal_rules_id_fk" FOREIGN KEY ("rule_id") REFERENCES "legal"."legal_rules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat"."retrieved_evidence" ADD CONSTRAINT "retrieved_evidence_message_id_conversation_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "chat"."conversation_messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat"."retrieved_evidence" ADD CONSTRAINT "retrieved_evidence_chunk_id_knowledge_chunks_id_fk" FOREIGN KEY ("chunk_id") REFERENCES "kb"."knowledge_chunks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."user_profiles" ADD CONSTRAINT "user_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "app"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "application_drafts_case_idx" ON "app"."application_drafts" USING btree ("case_id");--> statement-breakpoint
CREATE INDEX "application_drafts_status_idx" ON "app"."application_drafts" USING btree ("status");--> statement-breakpoint
CREATE INDEX "assistant_tool_calls_message_idx" ON "chat"."assistant_tool_calls" USING btree ("message_id");--> statement-breakpoint
CREATE INDEX "assistant_tool_calls_tool_idx" ON "chat"."assistant_tool_calls" USING btree ("tool_name");--> statement-breakpoint
CREATE INDEX "benefit_calculations_case_idx" ON "app"."benefit_calculations" USING btree ("case_id");--> statement-breakpoint
CREATE INDEX "benefit_calculations_created_idx" ON "app"."benefit_calculations" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "benefit_cases_number_uq" ON "app"."benefit_cases" USING btree ("case_number");--> statement-breakpoint
CREATE INDEX "benefit_cases_user_idx" ON "app"."benefit_cases" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "benefit_cases_status_idx" ON "app"."benefit_cases" USING btree ("status");--> statement-breakpoint
CREATE INDEX "benefit_scenarios_case_idx" ON "app"."benefit_scenarios" USING btree ("case_id");--> statement-breakpoint
CREATE INDEX "conversation_messages_conversation_idx" ON "chat"."conversation_messages" USING btree ("conversation_id");--> statement-breakpoint
CREATE INDEX "conversation_messages_created_idx" ON "chat"."conversation_messages" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "conversations_user_idx" ON "chat"."conversations" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "conversations_updated_idx" ON "chat"."conversations" USING btree ("updated_at");--> statement-breakpoint
CREATE UNIQUE INDEX "embedding_models_name_uq" ON "kb"."embedding_models" USING btree ("name");--> statement-breakpoint
CREATE INDEX "embedding_models_active_idx" ON "kb"."embedding_models" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "employment_records_user_idx" ON "app"."employment_records" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "employment_records_current_idx" ON "app"."employment_records" USING btree ("is_current");--> statement-breakpoint
CREATE INDEX "family_events_user_idx" ON "app"."family_events" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "ingestion_jobs_document_idx" ON "kb"."ingestion_jobs" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "ingestion_jobs_status_idx" ON "kb"."ingestion_jobs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "insurance_periods_user_idx" ON "app"."insurance_periods" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "insurance_periods_dates_idx" ON "app"."insurance_periods" USING btree ("start_date","end_date");--> statement-breakpoint
CREATE UNIQUE INDEX "knowledge_chunks_document_hash_model_uq" ON "kb"."knowledge_chunks" USING btree ("document_id","content_hash","embedding_model_id");--> statement-breakpoint
CREATE INDEX "knowledge_chunks_document_idx" ON "kb"."knowledge_chunks" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "knowledge_chunks_model_idx" ON "kb"."knowledge_chunks" USING btree ("embedding_model_id");--> statement-breakpoint
CREATE INDEX "knowledge_chunks_legal_reference_idx" ON "kb"."knowledge_chunks" USING btree ("legal_reference");--> statement-breakpoint
CREATE INDEX "knowledge_chunks_validity_idx" ON "kb"."knowledge_chunks" USING btree ("valid_from","valid_to");--> statement-breakpoint
CREATE UNIQUE INDEX "knowledge_documents_source_title_version_uq" ON "kb"."knowledge_documents" USING btree ("source_id","title","version");--> statement-breakpoint
CREATE INDEX "knowledge_documents_source_idx" ON "kb"."knowledge_documents" USING btree ("source_id");--> statement-breakpoint
CREATE INDEX "knowledge_documents_status_idx" ON "kb"."knowledge_documents" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "knowledge_sources_slug_uq" ON "kb"."knowledge_sources" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "knowledge_sources_type_idx" ON "kb"."knowledge_sources" USING btree ("source_type");--> statement-breakpoint
CREATE UNIQUE INDEX "legal_rule_versions_rule_version_uq" ON "legal"."legal_rule_versions" USING btree ("rule_id","version");--> statement-breakpoint
CREATE INDEX "legal_rule_versions_effective_idx" ON "legal"."legal_rule_versions" USING btree ("effective_from","effective_to");--> statement-breakpoint
CREATE UNIQUE INDEX "legal_rules_code_uq" ON "legal"."legal_rules" USING btree ("code");--> statement-breakpoint
CREATE INDEX "legal_rules_category_idx" ON "legal"."legal_rules" USING btree ("category");--> statement-breakpoint
CREATE UNIQUE INDEX "retrieved_evidence_message_chunk_rank_uq" ON "chat"."retrieved_evidence" USING btree ("message_id","chunk_id","rank");--> statement-breakpoint
CREATE INDEX "retrieved_evidence_message_idx" ON "chat"."retrieved_evidence" USING btree ("message_id");--> statement-breakpoint
CREATE UNIQUE INDEX "user_profiles_user_uq" ON "app"."user_profiles" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_uq" ON "app"."users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "users_role_idx" ON "app"."users" USING btree ("role");

-- ---------------------------------------------------------------------------
-- Embedding model contract
-- ---------------------------------------------------------------------------
-- Active demo model: zpr-hash-1024 (provider local-demo), 1024 dimensions.
-- Every chunk carries embedding_model_id. Retrieval always filters by the
-- active model, so vectors from incompatible models are never mixed.
COMMENT ON COLUMN "kb"."knowledge_chunks"."embedding" IS
  'pgvector embedding; dimensions must equal kb.embedding_models.dimensions. Active demo model: zpr-hash-1024 (1024 dims).';
--> statement-breakpoint
ALTER TABLE "kb"."knowledge_chunks"
  ADD CONSTRAINT "knowledge_chunks_embedding_dims_chk"
  CHECK (vector_dims("embedding") = 1024);
--> statement-breakpoint

-- Approximate nearest-neighbour index for cosine similarity.
CREATE INDEX "knowledge_chunks_embedding_hnsw_idx"
  ON "kb"."knowledge_chunks"
  USING hnsw ("embedding" vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);
--> statement-breakpoint

-- PostgreSQL full-text search (the custom image can swap `simple` for the
-- Polish ispell configuration without changing this index).
CREATE INDEX "knowledge_chunks_content_fts_idx"
  ON "kb"."knowledge_chunks"
  USING gin (to_tsvector('simple', "content"));
--> statement-breakpoint

CREATE INDEX "knowledge_chunks_metadata_gin_idx"
  ON "kb"."knowledge_chunks"
  USING gin ("metadata" jsonb_path_ops);
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- Least-privilege application roles
-- ---------------------------------------------------------------------------
-- These are NOLOGIN grouping roles. A deployment creates login roles with the
-- same names and grants them through the environment-specific secret store.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'zpr_app') THEN
    CREATE ROLE zpr_app NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'zpr_ingest') THEN
    CREATE ROLE zpr_ingest NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'zpr_readonly') THEN
    CREATE ROLE zpr_readonly NOLOGIN;
  END IF;
END $$;
--> statement-breakpoint

DO $$
BEGIN
  EXECUTE format(
    'GRANT CONNECT ON DATABASE %I TO zpr_app, zpr_ingest, zpr_readonly',
    current_database()
  );
END $$;
--> statement-breakpoint

GRANT USAGE ON SCHEMA app, legal, kb, chat TO zpr_app, zpr_ingest, zpr_readonly;
--> statement-breakpoint

GRANT SELECT ON ALL TABLES IN SCHEMA legal, kb TO zpr_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA app, chat TO zpr_app;
--> statement-breakpoint

GRANT SELECT ON ALL TABLES IN SCHEMA legal TO zpr_ingest;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA kb TO zpr_ingest;
--> statement-breakpoint

GRANT SELECT ON ALL TABLES IN SCHEMA app, legal, kb, chat TO zpr_readonly;
--> statement-breakpoint

ALTER DEFAULT PRIVILEGES IN SCHEMA legal GRANT SELECT ON TABLES TO zpr_app;
--> statement-breakpoint
ALTER DEFAULT PRIVILEGES IN SCHEMA kb GRANT SELECT ON TABLES TO zpr_app;
--> statement-breakpoint
ALTER DEFAULT PRIVILEGES IN SCHEMA app GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO zpr_app;
--> statement-breakpoint
ALTER DEFAULT PRIVILEGES IN SCHEMA chat GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO zpr_app;
--> statement-breakpoint
ALTER DEFAULT PRIVILEGES IN SCHEMA legal GRANT SELECT ON TABLES TO zpr_ingest;
--> statement-breakpoint
ALTER DEFAULT PRIVILEGES IN SCHEMA kb GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO zpr_ingest;
--> statement-breakpoint
ALTER DEFAULT PRIVILEGES IN SCHEMA app GRANT SELECT ON TABLES TO zpr_readonly;
--> statement-breakpoint
ALTER DEFAULT PRIVILEGES IN SCHEMA legal GRANT SELECT ON TABLES TO zpr_readonly;
--> statement-breakpoint
ALTER DEFAULT PRIVILEGES IN SCHEMA kb GRANT SELECT ON TABLES TO zpr_readonly;
--> statement-breakpoint
ALTER DEFAULT PRIVILEGES IN SCHEMA chat GRANT SELECT ON TABLES TO zpr_readonly;
