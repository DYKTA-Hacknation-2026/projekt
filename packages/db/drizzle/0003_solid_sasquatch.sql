CREATE TYPE "app"."absence_kind" AS ENUM('SICK_LEAVE', 'MATERNITY', 'PARENTAL', 'UNPAID', 'OTHER');--> statement-breakpoint
CREATE TYPE "app"."benefit_application_status" AS ENUM('SUBMITTED', 'IN_PROGRESS', 'DECISION_ISSUED', 'PAID', 'REJECTED');--> statement-breakpoint
CREATE TYPE "app"."data_source_id" AS ENUM('ZUS', 'EMPLOYER', 'EZLA', 'USC', 'PUE');--> statement-breakpoint
CREATE TYPE "app"."import_session_status" AS ENUM('CONSENTED', 'RUNNING', 'COMPLETED', 'ACCEPTED', 'SKIPPED');--> statement-breakpoint
CREATE TYPE "app"."payer_type" AS ENUM('EMPLOYER', 'SELF_EMPLOYED', 'MANDATE_PRINCIPAL');--> statement-breakpoint
CREATE TYPE "app"."salary_component_kind" AS ENUM('BASE', 'BONUS', 'ALLOWANCE', 'OVERTIME', 'OTHER');--> statement-breakpoint
CREATE TYPE "app"."sick_leave_kind" AS ENUM('SICKNESS', 'PREGNANCY', 'CARE', 'REHABILITATION');--> statement-breakpoint
CREATE TYPE "app"."source_fetch_status" AS ENUM('PENDING', 'SUCCESS', 'PARTIAL', 'EMPTY', 'ERROR');--> statement-breakpoint
CREATE TABLE "app"."benefit_applications" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"case_number" text NOT NULL,
	"application_type" text NOT NULL,
	"benefit_kind" text NOT NULL,
	"status" "app"."benefit_application_status" DEFAULT 'SUBMITTED' NOT NULL,
	"submitted_at" date NOT NULL,
	"decision_number" text,
	"decision_date" date,
	"period_from" date,
	"period_to" date,
	"amount_grosze" integer,
	"documents" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"source" text DEFAULT 'SIMULATED_PUE' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app"."contribution_bases" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"insurance_period_id" uuid,
	"period_start" date NOT NULL,
	"period_end" date NOT NULL,
	"basis_grosze" integer DEFAULT 0 NOT NULL,
	"sickness_contribution_grosze" integer DEFAULT 0 NOT NULL,
	"paid" boolean DEFAULT true NOT NULL,
	"paid_at" date,
	"source" text DEFAULT 'SIMULATED_ZUS' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app"."contribution_payers" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"payer_type" "app"."payer_type" DEFAULT 'EMPLOYER' NOT NULL,
	"tax_id" text NOT NULL,
	"city" text,
	"is_current" boolean DEFAULT true NOT NULL,
	"source" text DEFAULT 'SIMULATED' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app"."data_import_sessions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"owner_key" text NOT NULL,
	"user_id" uuid,
	"persona_id" text NOT NULL,
	"scenario_id" text NOT NULL,
	"scopes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" "app"."import_session_status" DEFAULT 'CONSENTED' NOT NULL,
	"accepted_data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"field_sources" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"summary" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"engine_version" text DEFAULT '1.0.0-sim' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"accepted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "app"."data_import_snapshots" (
	"id" uuid PRIMARY KEY NOT NULL,
	"session_id" uuid NOT NULL,
	"source_id" "app"."data_source_id" NOT NULL,
	"status" "app"."source_fetch_status" DEFAULT 'PENDING' NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"issues" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"fetched_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app"."children" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"family_event_id" uuid,
	"first_name" text,
	"birth_date" date NOT NULL,
	"children_in_birth" integer DEFAULT 1 NOT NULL,
	"is_adopted" boolean DEFAULT false NOT NULL,
	"adoption_date" date,
	"birth_place" text,
	"source" text DEFAULT 'SIMULATED_USC' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app"."payroll_absences" (
	"id" uuid PRIMARY KEY NOT NULL,
	"employment_record_id" uuid NOT NULL,
	"kind" "app"."absence_kind" DEFAULT 'OTHER' NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app"."payroll_components" (
	"id" uuid PRIMARY KEY NOT NULL,
	"employment_record_id" uuid NOT NULL,
	"name" text NOT NULL,
	"kind" "app"."salary_component_kind" DEFAULT 'BASE' NOT NULL,
	"amount_grosze" integer DEFAULT 0 NOT NULL,
	"valid_from" date NOT NULL,
	"valid_to" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app"."sick_leave_periods" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"days" integer NOT NULL,
	"kind" "app"."sick_leave_kind" DEFAULT 'SICKNESS' NOT NULL,
	"pregnancy_related" boolean DEFAULT false NOT NULL,
	"certificate_ref" text NOT NULL,
	"payer_name" text NOT NULL,
	"status" text DEFAULT 'FINISHED' NOT NULL,
	"source" text DEFAULT 'SIMULATED_EZLA' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "app"."benefit_applications" ADD CONSTRAINT "benefit_applications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "app"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."contribution_bases" ADD CONSTRAINT "contribution_bases_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "app"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."contribution_bases" ADD CONSTRAINT "contribution_bases_insurance_period_id_insurance_periods_id_fk" FOREIGN KEY ("insurance_period_id") REFERENCES "app"."insurance_periods"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."contribution_payers" ADD CONSTRAINT "contribution_payers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "app"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."data_import_sessions" ADD CONSTRAINT "data_import_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "app"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."data_import_snapshots" ADD CONSTRAINT "data_import_snapshots_session_id_data_import_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "app"."data_import_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."children" ADD CONSTRAINT "children_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "app"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."children" ADD CONSTRAINT "children_family_event_id_family_events_id_fk" FOREIGN KEY ("family_event_id") REFERENCES "app"."family_events"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."payroll_absences" ADD CONSTRAINT "payroll_absences_employment_record_id_employment_records_id_fk" FOREIGN KEY ("employment_record_id") REFERENCES "app"."employment_records"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."payroll_components" ADD CONSTRAINT "payroll_components_employment_record_id_employment_records_id_fk" FOREIGN KEY ("employment_record_id") REFERENCES "app"."employment_records"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."sick_leave_periods" ADD CONSTRAINT "sick_leave_periods_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "app"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "benefit_applications_user_case_uq" ON "app"."benefit_applications" USING btree ("user_id","case_number");--> statement-breakpoint
CREATE INDEX "benefit_applications_user_idx" ON "app"."benefit_applications" USING btree ("user_id","submitted_at");--> statement-breakpoint
CREATE INDEX "contribution_bases_user_idx" ON "app"."contribution_bases" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "contribution_bases_period_idx" ON "app"."contribution_bases" USING btree ("period_start","period_end");--> statement-breakpoint
CREATE INDEX "contribution_payers_user_idx" ON "app"."contribution_payers" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "data_import_sessions_owner_idx" ON "app"."data_import_sessions" USING btree ("owner_key","created_at");--> statement-breakpoint
CREATE INDEX "data_import_sessions_user_idx" ON "app"."data_import_sessions" USING btree ("user_id","accepted_at");--> statement-breakpoint
CREATE INDEX "data_import_sessions_status_idx" ON "app"."data_import_sessions" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "data_import_snapshots_session_source_uq" ON "app"."data_import_snapshots" USING btree ("session_id","source_id");--> statement-breakpoint
CREATE INDEX "data_import_snapshots_session_idx" ON "app"."data_import_snapshots" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "children_user_idx" ON "app"."children" USING btree ("user_id","birth_date");--> statement-breakpoint
CREATE INDEX "payroll_absences_employment_idx" ON "app"."payroll_absences" USING btree ("employment_record_id");--> statement-breakpoint
CREATE INDEX "payroll_components_employment_idx" ON "app"."payroll_components" USING btree ("employment_record_id");--> statement-breakpoint
CREATE INDEX "sick_leave_periods_user_idx" ON "app"."sick_leave_periods" USING btree ("user_id","start_date");