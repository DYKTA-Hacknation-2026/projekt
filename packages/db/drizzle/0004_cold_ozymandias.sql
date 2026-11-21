CREATE TYPE "kb"."content_item_type" AS ENUM('ARTICLE', 'FAQ', 'DOCUMENT', 'GUIDE', 'GLOSSARY');--> statement-breakpoint
CREATE TYPE "kb"."content_source_kind" AS ENUM('LEGAL_ACT', 'OFFICIAL_GUIDANCE', 'OFFICIAL_FORM', 'GOVERNMENT_PAGE', 'EDITORIAL', 'OTHER');--> statement-breakpoint
CREATE TYPE "kb"."content_status" AS ENUM('DRAFT', 'IN_REVIEW', 'PUBLISHED', 'ARCHIVED');--> statement-breakpoint
CREATE TYPE "kb"."document_kind" AS ENUM('FORM', 'CERTIFICATE', 'ATTACHMENT', 'DEMO');--> statement-breakpoint
CREATE TABLE "kb"."content_article_legal_references" (
	"article_id" uuid NOT NULL,
	"legal_reference_id" uuid NOT NULL,
	"locator" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "content_article_legal_refs_pk" PRIMARY KEY("article_id","legal_reference_id")
);
--> statement-breakpoint
CREATE TABLE "kb"."content_article_sources" (
	"article_id" uuid NOT NULL,
	"source_id" uuid NOT NULL,
	"locator" text,
	"is_primary" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "content_article_sources_pk" PRIMARY KEY("article_id","source_id")
);
--> statement-breakpoint
CREATE TABLE "kb"."content_articles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"category_id" uuid NOT NULL,
	"title" text NOT NULL,
	"summary" text NOT NULL,
	"blocks" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"key_points" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"practical_tips" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"keywords" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"reading_minutes" integer DEFAULT 5 NOT NULL,
	"is_featured" boolean DEFAULT false NOT NULL,
	"popularity" integer DEFAULT 0 NOT NULL,
	"status" "kb"."content_status" DEFAULT 'DRAFT' NOT NULL,
	"last_reviewed_at" date NOT NULL,
	"published_at" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "kb"."content_categories" (
	"id" uuid PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"icon" text DEFAULT 'BookOpen' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"status" "kb"."content_status" DEFAULT 'PUBLISHED' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "kb"."content_documents" (
	"id" uuid PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"category_id" uuid NOT NULL,
	"code" text,
	"name" text NOT NULL,
	"kind" "kb"."document_kind" DEFAULT 'FORM' NOT NULL,
	"purpose" text NOT NULL,
	"when_required" text NOT NULL,
	"filled_by" text NOT NULL,
	"submitted_by" text NOT NULL,
	"information_needed" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"additional_documents" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"submission_channels" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"official_url" text,
	"official_source_label" text,
	"generator_href" text,
	"generator_label" text,
	"note" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"status" "kb"."content_status" DEFAULT 'DRAFT' NOT NULL,
	"last_reviewed_at" date NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "kb"."content_faq_items" (
	"id" uuid PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"category_id" uuid NOT NULL,
	"question" text NOT NULL,
	"short_answer" text NOT NULL,
	"explanation" text NOT NULL,
	"conditions" text,
	"what_to_do" text,
	"is_important" boolean DEFAULT false NOT NULL,
	"popularity" integer DEFAULT 0 NOT NULL,
	"article_id" uuid,
	"calculator_href" text,
	"status" "kb"."content_status" DEFAULT 'DRAFT' NOT NULL,
	"last_reviewed_at" date NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "kb"."content_glossary_terms" (
	"id" uuid PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"term" text NOT NULL,
	"letter" char(1) NOT NULL,
	"definition" text NOT NULL,
	"explanation" text,
	"example" text,
	"status" "kb"."content_status" DEFAULT 'DRAFT' NOT NULL,
	"last_reviewed_at" date NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "kb"."content_guides" (
	"id" uuid PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"category_id" uuid NOT NULL,
	"title" text NOT NULL,
	"summary" text NOT NULL,
	"audience" text NOT NULL,
	"conditions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"documents" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"steps" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"deadlines" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"places" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"problems" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"calculator_href" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"status" "kb"."content_status" DEFAULT 'DRAFT' NOT NULL,
	"last_reviewed_at" date NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "kb"."content_legal_references" (
	"id" uuid PRIMARY KEY NOT NULL,
	"citation" text NOT NULL,
	"title" text NOT NULL,
	"act_title" text NOT NULL,
	"url" text,
	"effective_from" date,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "kb"."content_relations" (
	"id" uuid PRIMARY KEY NOT NULL,
	"from_type" "kb"."content_item_type" NOT NULL,
	"from_id" uuid NOT NULL,
	"to_type" "kb"."content_item_type" NOT NULL,
	"to_id" uuid NOT NULL,
	"label" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "kb"."content_sources" (
	"id" uuid PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"publisher" text NOT NULL,
	"kind" "kb"."content_source_kind" DEFAULT 'OFFICIAL_GUIDANCE' NOT NULL,
	"url" text,
	"description" text,
	"accessed_at" date,
	"last_verified_at" date NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "kb"."content_article_legal_references" ADD CONSTRAINT "content_article_legal_references_article_id_content_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "kb"."content_articles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kb"."content_article_legal_references" ADD CONSTRAINT "content_article_legal_references_legal_reference_id_content_legal_references_id_fk" FOREIGN KEY ("legal_reference_id") REFERENCES "kb"."content_legal_references"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kb"."content_article_sources" ADD CONSTRAINT "content_article_sources_article_id_content_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "kb"."content_articles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kb"."content_article_sources" ADD CONSTRAINT "content_article_sources_source_id_content_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "kb"."content_sources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kb"."content_articles" ADD CONSTRAINT "content_articles_category_id_content_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "kb"."content_categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kb"."content_documents" ADD CONSTRAINT "content_documents_category_id_content_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "kb"."content_categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kb"."content_faq_items" ADD CONSTRAINT "content_faq_items_category_id_content_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "kb"."content_categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kb"."content_faq_items" ADD CONSTRAINT "content_faq_items_article_id_content_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "kb"."content_articles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kb"."content_guides" ADD CONSTRAINT "content_guides_category_id_content_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "kb"."content_categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "content_article_sources_source_idx" ON "kb"."content_article_sources" USING btree ("source_id");--> statement-breakpoint
CREATE UNIQUE INDEX "content_articles_slug_uq" ON "kb"."content_articles" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "content_articles_category_idx" ON "kb"."content_articles" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "content_articles_status_idx" ON "kb"."content_articles" USING btree ("status");--> statement-breakpoint
CREATE INDEX "content_articles_featured_idx" ON "kb"."content_articles" USING btree ("is_featured");--> statement-breakpoint
CREATE INDEX "content_articles_updated_idx" ON "kb"."content_articles" USING btree ("updated_at");--> statement-breakpoint
CREATE UNIQUE INDEX "content_categories_slug_uq" ON "kb"."content_categories" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "content_categories_order_idx" ON "kb"."content_categories" USING btree ("sort_order");--> statement-breakpoint
CREATE UNIQUE INDEX "content_documents_slug_uq" ON "kb"."content_documents" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "content_documents_category_idx" ON "kb"."content_documents" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "content_documents_code_idx" ON "kb"."content_documents" USING btree ("code");--> statement-breakpoint
CREATE INDEX "content_documents_status_idx" ON "kb"."content_documents" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "content_faq_items_slug_uq" ON "kb"."content_faq_items" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "content_faq_category_idx" ON "kb"."content_faq_items" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "content_faq_status_idx" ON "kb"."content_faq_items" USING btree ("status");--> statement-breakpoint
CREATE INDEX "content_faq_popularity_idx" ON "kb"."content_faq_items" USING btree ("popularity");--> statement-breakpoint
CREATE UNIQUE INDEX "content_glossary_slug_uq" ON "kb"."content_glossary_terms" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "content_glossary_letter_idx" ON "kb"."content_glossary_terms" USING btree ("letter");--> statement-breakpoint
CREATE INDEX "content_glossary_status_idx" ON "kb"."content_glossary_terms" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "content_guides_slug_uq" ON "kb"."content_guides" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "content_guides_category_idx" ON "kb"."content_guides" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "content_guides_status_idx" ON "kb"."content_guides" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "content_legal_references_citation_uq" ON "kb"."content_legal_references" USING btree ("citation");--> statement-breakpoint
CREATE UNIQUE INDEX "content_relations_pair_uq" ON "kb"."content_relations" USING btree ("from_type","from_id","to_type","to_id");--> statement-breakpoint
CREATE INDEX "content_relations_from_idx" ON "kb"."content_relations" USING btree ("from_type","from_id");--> statement-breakpoint
CREATE INDEX "content_relations_to_idx" ON "kb"."content_relations" USING btree ("to_type","to_id");--> statement-breakpoint
CREATE UNIQUE INDEX "content_sources_slug_uq" ON "kb"."content_sources" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "content_sources_kind_idx" ON "kb"."content_sources" USING btree ("kind");