CREATE TYPE "kb"."access_level" AS ENUM('PUBLIC', 'INTERNAL', 'RESTRICTED');--> statement-breakpoint
CREATE TYPE "kb"."redistribution_policy" AS ENUM('ALLOWED', 'ATTRIBUTION', 'CITATION_ONLY', 'PROHIBITED');--> statement-breakpoint
ALTER TYPE "kb"."document_status" ADD VALUE 'SUPERSEDED';--> statement-breakpoint
ALTER TYPE "kb"."document_status" ADD VALUE 'ARCHIVED';--> statement-breakpoint
ALTER TYPE "kb"."source_type" ADD VALUE 'OFFICIAL_GUIDANCE';--> statement-breakpoint
ALTER TYPE "kb"."source_type" ADD VALUE 'BENEFIT_TABLE';--> statement-breakpoint
ALTER TYPE "kb"."source_type" ADD VALUE 'FORM_INSTRUCTION';--> statement-breakpoint
ALTER TYPE "kb"."source_type" ADD VALUE 'GOVERNMENT_PAGE';--> statement-breakpoint
ALTER TYPE "kb"."source_type" ADD VALUE 'CHARITY_RESOURCE';--> statement-breakpoint
CREATE TABLE "kb"."chunk_embeddings" (
	"chunk_id" uuid NOT NULL,
	"embedding_model_id" uuid NOT NULL,
	"dimensions" integer NOT NULL,
	"embedding" vector NOT NULL,
	"content_hash" char(64) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chunk_embeddings_pk" PRIMARY KEY("chunk_id","embedding_model_id")
);
--> statement-breakpoint
ALTER TABLE "kb"."knowledge_chunks" DROP CONSTRAINT "knowledge_chunks_embedding_model_id_embedding_models_id_fk";
--> statement-breakpoint
DROP INDEX "kb"."knowledge_chunks_document_hash_model_uq";--> statement-breakpoint
DROP INDEX "kb"."knowledge_chunks_model_idx";--> statement-breakpoint
DROP INDEX "kb"."knowledge_documents_source_title_version_uq";--> statement-breakpoint
ALTER TABLE "kb"."embedding_models" ADD COLUMN "config_fingerprint" char(64);--> statement-breakpoint
ALTER TABLE "kb"."embedding_models" ADD COLUMN "settings" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "kb"."ingestion_jobs" ADD COLUMN "stage" text;--> statement-breakpoint
ALTER TABLE "kb"."ingestion_jobs" ADD COLUMN "attempts" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "kb"."ingestion_jobs" ADD COLUMN "embedding_model_id" uuid;--> statement-breakpoint
ALTER TABLE "kb"."knowledge_chunks" ADD COLUMN "chunk_index" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "kb"."knowledge_chunks" ADD COLUMN "page_end" integer;--> statement-breakpoint
ALTER TABLE "kb"."knowledge_chunks" ADD COLUMN "heading_path" text;--> statement-breakpoint
ALTER TABLE "kb"."knowledge_chunks" ADD COLUMN "search_text" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "kb"."knowledge_chunks" ADD COLUMN "stem_text" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "kb"."knowledge_chunks" ADD COLUMN "search_tsv" "tsvector" GENERATED ALWAYS AS (to_tsvector('simple'::regconfig, "kb"."knowledge_chunks"."search_text")) STORED;--> statement-breakpoint
ALTER TABLE "kb"."knowledge_chunks" ADD COLUMN "stem_tsv" "tsvector" GENERATED ALWAYS AS (to_tsvector('simple'::regconfig, "kb"."knowledge_chunks"."stem_text")) STORED;--> statement-breakpoint
ALTER TABLE "kb"."knowledge_chunks" ADD COLUMN "is_active" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "kb"."knowledge_documents" ADD COLUMN "document_key" text DEFAULT 'main' NOT NULL;--> statement-breakpoint
ALTER TABLE "kb"."knowledge_documents" ADD COLUMN "external_id" text;--> statement-breakpoint
ALTER TABLE "kb"."knowledge_documents" ADD COLUMN "source_url" text;--> statement-breakpoint
ALTER TABLE "kb"."knowledge_documents" ADD COLUMN "raw_hash" char(64);--> statement-breakpoint
ALTER TABLE "kb"."knowledge_documents" ADD COLUMN "page_count" integer;--> statement-breakpoint
ALTER TABLE "kb"."knowledge_documents" ADD COLUMN "access_level" "kb"."access_level";--> statement-breakpoint
ALTER TABLE "kb"."knowledge_documents" ADD COLUMN "redistribution" "kb"."redistribution_policy";--> statement-breakpoint
ALTER TABLE "kb"."knowledge_documents" ADD COLUMN "superseded_by_id" uuid;--> statement-breakpoint
ALTER TABLE "kb"."knowledge_documents" ADD COLUMN "last_ingested_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "kb"."knowledge_sources" ADD COLUMN "access_level" "kb"."access_level" DEFAULT 'PUBLIC' NOT NULL;--> statement-breakpoint
ALTER TABLE "kb"."knowledge_sources" ADD COLUMN "redistribution" "kb"."redistribution_policy" DEFAULT 'ATTRIBUTION' NOT NULL;--> statement-breakpoint
ALTER TABLE "kb"."knowledge_sources" ADD COLUMN "authority_rank" integer DEFAULT 50 NOT NULL;--> statement-breakpoint
ALTER TABLE "kb"."knowledge_sources" ADD COLUMN "language" text DEFAULT 'pl' NOT NULL;--> statement-breakpoint
ALTER TABLE "kb"."knowledge_sources" ADD COLUMN "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "kb"."knowledge_sources" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
-- ---------------------------------------------------------------------------
-- Data backfill (hand-written). Existing rows keep working after the split of
-- vectors into kb.chunk_embeddings. Re-ingestion recomputes search columns.
-- ---------------------------------------------------------------------------
INSERT INTO "kb"."chunk_embeddings" ("chunk_id", "embedding_model_id", "dimensions", "embedding", "content_hash", "created_at")
SELECT "id", "embedding_model_id", vector_dims("embedding"), "embedding"::vector, "content_hash", "created_at"
FROM "kb"."knowledge_chunks";--> statement-breakpoint
UPDATE "kb"."knowledge_chunks" AS c
SET "chunk_index" = ordered.rn - 1
FROM (
  SELECT "id", row_number() OVER (PARTITION BY "document_id" ORDER BY "created_at", "id") AS rn
  FROM "kb"."knowledge_chunks"
) AS ordered
WHERE ordered."id" = c."id";--> statement-breakpoint
UPDATE "kb"."knowledge_chunks" SET "search_text" = lower("content"), "stem_text" = lower("content");--> statement-breakpoint
UPDATE "kb"."knowledge_documents" SET "document_key" = "id"::text;--> statement-breakpoint
UPDATE "kb"."knowledge_sources" SET "access_level" = 'RESTRICTED', "redistribution" = 'PROHIBITED' WHERE "is_confidential";--> statement-breakpoint
DROP INDEX IF EXISTS "kb"."knowledge_chunks_content_fts_idx";--> statement-breakpoint
ALTER TABLE "kb"."chunk_embeddings" ADD CONSTRAINT "chunk_embeddings_chunk_id_knowledge_chunks_id_fk" FOREIGN KEY ("chunk_id") REFERENCES "kb"."knowledge_chunks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kb"."chunk_embeddings" ADD CONSTRAINT "chunk_embeddings_embedding_model_id_embedding_models_id_fk" FOREIGN KEY ("embedding_model_id") REFERENCES "kb"."embedding_models"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "chunk_embeddings_model_idx" ON "kb"."chunk_embeddings" USING btree ("embedding_model_id");--> statement-breakpoint
ALTER TABLE "kb"."ingestion_jobs" ADD CONSTRAINT "ingestion_jobs_embedding_model_id_embedding_models_id_fk" FOREIGN KEY ("embedding_model_id") REFERENCES "kb"."embedding_models"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kb"."knowledge_documents" ADD CONSTRAINT "knowledge_documents_superseded_by_id_knowledge_documents_id_fk" FOREIGN KEY ("superseded_by_id") REFERENCES "kb"."knowledge_documents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "knowledge_chunks_document_index_uq" ON "kb"."knowledge_chunks" USING btree ("document_id","chunk_index") WHERE "kb"."knowledge_chunks"."is_active";--> statement-breakpoint
CREATE INDEX "knowledge_chunks_active_idx" ON "kb"."knowledge_chunks" USING btree ("document_id","is_active");--> statement-breakpoint
CREATE INDEX "knowledge_chunks_hash_idx" ON "kb"."knowledge_chunks" USING btree ("content_hash");--> statement-breakpoint
CREATE INDEX "knowledge_chunks_search_tsv_idx" ON "kb"."knowledge_chunks" USING gin ("search_tsv");--> statement-breakpoint
CREATE INDEX "knowledge_chunks_stem_tsv_idx" ON "kb"."knowledge_chunks" USING gin ("stem_tsv");--> statement-breakpoint
CREATE UNIQUE INDEX "knowledge_documents_source_key_version_uq" ON "kb"."knowledge_documents" USING btree ("source_id","document_key","version");--> statement-breakpoint
CREATE INDEX "knowledge_documents_hash_idx" ON "kb"."knowledge_documents" USING btree ("content_hash");--> statement-breakpoint
CREATE INDEX "knowledge_documents_effective_idx" ON "kb"."knowledge_documents" USING btree ("effective_from","effective_to");--> statement-breakpoint
CREATE INDEX "knowledge_sources_access_idx" ON "kb"."knowledge_sources" USING btree ("access_level");--> statement-breakpoint
ALTER TABLE "kb"."knowledge_chunks" DROP COLUMN "embedding_model_id";--> statement-breakpoint
ALTER TABLE "kb"."knowledge_chunks" DROP COLUMN "embedding";--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- Per-model ANN index (hand-written). pgvector indexes need a fixed
-- dimension, so each embedding model gets a partial HNSW index over a cast
-- expression. The retrieval query uses exactly the same expression.
--   dims <= 2000 → vector(dims), dims <= 4000 → halfvec(dims), else exact scan.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION "kb"."ensure_embedding_index"(p_model_id uuid)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  v_dims integer;
  v_metric text;
  v_name text := 'chunk_embeddings_hnsw_' || replace(p_model_id::text, '-', '');
  v_type text;
  v_ops text;
BEGIN
  SELECT "dimensions", "distance_metric"::text INTO v_dims, v_metric
  FROM "kb"."embedding_models" WHERE "id" = p_model_id;
  IF v_dims IS NULL THEN
    RAISE EXCEPTION 'Unknown embedding model %', p_model_id;
  END IF;
  IF v_dims <= 2000 THEN
    v_type := 'vector';
  ELSIF v_dims <= 4000 THEN
    v_type := 'halfvec';
  ELSE
    RETURN NULL;
  END IF;
  v_ops := v_type || CASE v_metric
    WHEN 'L2' THEN '_l2_ops'
    WHEN 'INNER_PRODUCT' THEN '_ip_ops'
    ELSE '_cosine_ops'
  END;
  EXECUTE format(
    'CREATE INDEX IF NOT EXISTS %I ON "kb"."chunk_embeddings" USING hnsw ((embedding::%s(%s)) %s) WITH (m = 16, ef_construction = 64) WHERE embedding_model_id = %L',
    v_name, v_type, v_dims, v_ops, p_model_id
  );
  RETURN v_name;
END;
$$;--> statement-breakpoint
SELECT "kb"."ensure_embedding_index"("id") FROM "kb"."embedding_models";--> statement-breakpoint
GRANT EXECUTE ON FUNCTION "kb"."ensure_embedding_index"(uuid) TO zpr_ingest;
