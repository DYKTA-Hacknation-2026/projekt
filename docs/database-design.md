# Database Design

Status: v0.2 · 2026-11-21 · PostgreSQL 17 + pgvector, Drizzle ORM (`packages/db`)

## 1. Principles

1. **Schemas separate concerns.** Legal knowledge, rule configuration, personal data, simulation and audit live in separate Postgres schemas. Least-privilege DB roles are possible later.
2. **No personal data in `kb` or `rules`.** No legal text in `app`.
3. **Immutability where reproducibility matters:**
   - published `rules.rule_sets`
   - `app.calculation_runs`
   - `kb.document_versions`
4. **Time:** `timestamptz` for events. `date` for legal dates (birth, leave start), interpreted in `Europe/Warsaw`.
5. **Money:** `bigint` grosze. **Rates:** `numeric(6,4)`.
6. **IDs:** `uuid` v7 (time-ordered), generated app-side.
7. **Soft delete only for content.** Personal data is hard-deleted on request or at TTL.
8. Migrations use `drizzle-kit generate`. The SQL is reviewed and committed. Seeds are idempotent.

## 2. Schemas and tables

### 2.1 `rules`: versioned legal parameters (FR-ADM-01)

| Table | Key columns | Notes |
|-------|-------------|-------|
| `rule_sets` | `id`, `version` (unique), `status` enum(`DRAFT`,`PUBLISHED`,`RETIRED`), `effective_from date`, `effective_to date null`, `based_on_id`, `created_by`, `published_by`, `published_at`, `notes` | Check: no overlapping `PUBLISHED` ranges. Exclusion constraint on `daterange(effective_from, effective_to)` where status = 'PUBLISHED'. |
| `rule_parameters` | `id`, `rule_set_id` FK, `key text`, `value jsonb`, `verification` enum(`VERIFIED_T`,`VERIFIED_ZUS`,`UNVERIFIED`), `blocking bool`, `open_question text null`, unique(`rule_set_id`,`key`) | `value` is validated in the app against a per-key Zod schema (`@zpr/contracts/params`) |
| `rule_parameter_sources` | `parameter_id` FK, `source_document_version_id` FK → `kb.document_versions`, `locator` (page, art., ust.), `quote text` | Links a parameter to its legal source (citations in the admin and the UI) |
| `rule_set_changes` | `id`, `rule_set_id`, `actor_id`, `diff jsonb`, `created_at` | Audit of draft edits |

Trigger: `UPDATE` and `DELETE` on parameters of a `PUBLISHED` set → `RAISE EXCEPTION`.

### 2.2 `kb`: knowledge base for RAG (FR-PRD-08)

| Table | Key columns | Notes |
|-------|-------------|-------|
| `sources` | `id`, `code` (e.g. `T`, `USTAWA_ZASILKOWA`, `KP`, `PORADNIK_2026`, `ZUS_WWW_…`), `title`, `publisher`, `kind` enum(`LEGAL_ACT`,`GUIDE`,`TASK_DOC`,`WEB_PAGE`,`FORM_TEMPLATE`), `canonical_url`, `license_note`, `confidential bool` | `confidential` = never shown verbatim to the public (e.g. sample cases) |
| `document_versions` | `id`, `source_id`, `version_label`, `effective_from date`, `effective_to date null`, `published_at`, `content_sha256`, `raw_storage_key`, `status` (`INGESTING`,`ACTIVE`,`SUPERSEDED`) | One row per edition or consolidated text |
| `chunks` | `id`, `document_version_id`, `ord int`, `heading_path text[]` (e.g. `{Rozdział 8, Art. 29, ust. 1}`), `locator jsonb` (page, article, paragraph, point), `content text`, `content_tsv tsvector` (generated, `polish` config), `token_count`, `metadata jsonb` (benefit tags, audience, LR ids) | GIN on `content_tsv`; GIN on `metadata` |
| `chunk_embeddings` | `chunk_id`, `model text`, `dims int`, `embedding vector` | PK(`chunk_id`,`model`). A **partial HNSW index per model** with a cast: `CREATE INDEX … USING hnsw ((embedding::vector(1024)) vector_cosine_ops) WHERE model = 'X'`. Switching providers or models needs no table change. |
| `ingestion_runs` | `id`, `document_version_id`, `started_at`, `finished_at`, `status`, `stats jsonb`, `error` | |
| `glossary_terms` | `term`, `definition`, `source_chunk_id` | Tooltip glossary |

**Polish FTS:** Postgres ships no Polish dictionary. The custom image `infra/docker/postgres` installs the `polish` ispell or hunspell files and creates:

```sql
CREATE TEXT SEARCH DICTIONARY polish_ispell (TEMPLATE = ispell, DictFile = polish, AffFile = polish, StopWords = polish);
CREATE TEXT SEARCH CONFIGURATION polish (COPY = simple);
ALTER TEXT SEARCH CONFIGURATION polish ALTER MAPPING FOR asciiword, word, hword, hword_part, asciihword, hword_asciipart
  WITH polish_ispell, simple;
```

If the dictionary is unavailable (managed DB, deployment option B), fall back to `simple` + `unaccent` and rely more on the vector side. The configuration name is an env setting.

### 2.3 `app`: users and personal data (minimal)

| Table | Key columns | Notes |
|-------|-------------|-------|
| `users` | `id`, `kind` enum(`GUEST`,`SIM_MOBYWATEL`,`ADMIN`), `sim_persona_id null`, `display_name`, `created_at`, `last_seen_at` | No real identity data |
| `sessions` | `id` (random 256-bit, hashed), `user_id`, `expires_at`, `user_agent_hash` | |
| `consents` | `user_id`, `kind` (`HEALTH_DATA`,`AI_ASSISTANT`,`DOCUMENT_PROCESSING`), `granted_at`, `revoked_at` | RODO art. 9 ust. 2 lit. a |
| `households` | `id`, `owner_user_id`, `created_at`, `delete_after timestamptz` | TTL for guests (e.g. 7 days) |
| `parents` | `id`, `household_id`, `role` enum(`MOTHER`,`FATHER`,`CAREGIVER`), `birth_year int null` | Birth **year** is enough for LR-11 (age 50+) |
| `insurance_titles` | `id`, `parent_id`, `kind` enum, `payer_name`, `payer_insured_count_nov30 int null`, `coverage_mode` enum(`COMPULSORY`,`VOLUNTARY`), `working_time_fraction numeric(4,3)`, `start_date`, `end_date null`, `end_reason` enum null, `source` enum(`USER`,`SIMULATION`,`DOCUMENT`) | |
| `coverage_periods` | `id`, `insurance_title_id`, `from date`, `to date null` | Sickness insurance periods (breaks matter: LR-10) |
| `basis_inputs` | `id`, `insurance_title_id`, `month date`, `amount_grosze bigint`, `component jsonb`, `source` | Raw inputs only. The basis is computed by the engine (LR-112…119). Per month: gross amount, deducted contributions, days worked and days required (the ½-month rule), and component type (monthly, quarterly or annual). |
| `family_events` | `id`, `household_id`, `kind` enum(`PREGNANCY`,`BIRTH`,`CARE_TAKING`), `expected_due_date`, `event_date`, `arrangement` enum null, `adoption_final_date`, `premature bool`, `health_notes_enc bytea null` | Encrypted free text |
| `children` | `id`, `family_event_id`, `birth_date`, `stillborn bool`, `death_date null`, `za_zyciem bool`, `school_deferred bool`, `hospitalisation daterange[]` | |
| `sick_leaves` | `id`, `parent_id`, `from`, `to`, `code char(1)`, `source` | e-ZLA (simulated or user-entered) |
| `scenarios` | `id`, `household_id`, `name`, `payment_option` enum, `option_81_5_application_date`, `created_at`, `updated_at` | |
| `leave_segments` | `id`, `scenario_id`, `parent_id`, `kind` enum, `start date`, `end date`, `part_index`, `work_fraction numeric(4,3)`, `takeover_reason` enum null | |
| `calculation_runs` | `id`, `household_id null`, `scenario_id null`, `rule_set_id`, `input_hash char(64)`, `input_snapshot jsonb`, `result jsonb`, `engine_version`, `created_at` | Immutable. Index (`input_hash`, `rule_set_id`) for a cache. |
| `checklist_items` | `id`, `household_id`, `template_key`, `due_date null`, `status` (`TODO`,`DONE`,`N_A`), `calculation_run_id` | Generated from the engine routing and deadlines |

### 2.4 `docs`: uploads and extraction (FR-PRD-06)

| Table | Key columns | Notes |
|-------|-------------|-------|
| `uploads` | `id`, `owner_user_id`, `storage_key`, `sha256`, `mime`, `size`, `origin` enum(`USER_UPLOAD`,`SAMPLE_CASE`), `delete_after` | |
| `sample_cases` | `id`, `code`, `title`, `description`, `storage_prefix`, `expected jsonb` (granted?, amount?, notes), `visible_in_demo bool` | Metadata only. Files are in private storage (Q-19). |
| `extractions` | `id`, `upload_id`, `detected_form` (`ZAM`,`Z-3`,`Z-3a`,`ZAS-53`,`ZAS-12`,`POSWIADCZENIE`,`ZUR`,`ZAO`,`Z-3b`,`UNKNOWN`), `method` enum(`ACROFORM`,`TEMPLATE`,`OCR`,`LLM_ASSISTED`), `confidence`, `status` (`PENDING`,`NEEDS_REVIEW`,`CONFIRMED`,`FAILED`), `created_at` | |
| `extracted_fields` | `id`, `extraction_id`, `field_key`, `raw_value`, `normalized jsonb`, `confidence`, `page`, `bbox jsonb`, `confirmed_value jsonb null`, `confirmed_at` | Only confirmed values flow into the facts |
| `validation_findings` | `id`, `extraction_id`, `severity` (`ERROR`,`WARNING`,`INFO`), `code`, `field_key`, `message_key` | E.g. a deprecated form after 2026-10-24 (LR-05), missing attachments |

### 2.5 `sim`: simulated government systems (FR-SIM-*)

All rows are synthetic. Every API response from these tables carries `simulated: true`.

| Table | Purpose |
|-------|---------|
| `personas` | A fake citizen: `id`, `display_name`, `fake_pesel` (checksum-valid but drawn from a reserved test range, flagged), `scenario_tag` |
| `insurance_records` | Persona coverage history (title, mode, periods, payer, basis per month) → FR-SIM-02 |
| `payers` | Fake payers with `insured_count_nov30` → LR-01 routing |
| `ezla_certificates` | `persona_id`, `from`, `to`, `code`, `issuer`, `status` → FR-SIM-04 |
| `debt_statements` | `persona_id`, `as_of`, `amount_grosze`, `breakdown jsonb` → FR-SIM-03 |
| `pue_messages` | Inquiry threads with canned or AI-drafted (labelled) replies → FR-SIM-05 |
| `applications` | `id`, `user_id`, `kind` (`LEAVE_MATERNITY`,`LEAVE_PARENTAL`,`LEAVE_PATERNITY`,`LEAVE_SUPPLEMENTARY`,`ZAM`,`ZAS-53`,…), `recipient` (`EMPLOYER`,`ZUS`), `payload jsonb`, `status` (`DRAFT`,`SIM_SENT`,`SIM_ACKNOWLEDGED`), `pdf_storage_key` → FR-SIM-06 |
| `civil_registry_requests` | `kind` (`FULL`,`ABRIDGED`), `child_ref`, `status` → FR-SIM-07 |

### 2.6 `content`: curated, admin-managed

| Table | Columns |
|-------|---------|
| `support_organizations` | `id`, `name`, `kind` (`CHARITY`,`FOUNDATION`,`ASSOCIATION`), `situations text[]` (`CHILD_DEATH`,`PREMATURE`,`MISCARRIAGE`,`SEVERE_ILLNESS`), `url`, `phone`, `region`, `charitable_only bool` (must be true, T p.13 i), `source_url`, `verified_at`, `verified_by`, `published bool` |
| `external_links` | `id`, `title`, `url`, `owner` (`ZUS`,`MRPiPS`,`PIP`,`GOV`), `topics text[]`, `checked_at` |
| `checklist_templates` | `key`, `title`, `body_md`, `applies_when jsonb` (engine reason or route codes), `rule_refs text[]` |
| `info_pages` | `slug`, `title`, `body_md`, `rule_refs text[]`, `source_chunk_ids uuid[]`, `published` |
| `feature_flags` | `key`, `enabled`, `description` |

### 2.7 `ai`: assistant

| Table | Columns |
|-------|---------|
| `conversations` | `id`, `user_id`, `household_id null`, `created_at`, `delete_after` |
| `messages` | `id`, `conversation_id`, `role`, `content` (scrubbed), `model`, `tokens_in/out`, `created_at` |
| `message_citations` | `message_id`, `chunk_id`, `document_version_id`, `quote`, `rank` |
| `tool_calls` | `id`, `message_id`, `tool`, `args jsonb`, `result_ref` (e.g. `calculation_run_id`), `latency_ms`, `status` |
| `feedback` | `message_id`, `helpful bool`, `comment` |

### 2.8 `audit`

`audit.events(id, at, actor_id, actor_kind, action, entity, entity_id, data jsonb)` is append-only. Admin changes, publications, simulated submissions and data deletions are logged here.

## 3. Key indexes

- `kb.chunks`: GIN(`content_tsv`), GIN(`metadata jsonb_path_ops`), btree(`document_version_id`, `ord`).
- `kb.chunk_embeddings`: partial HNSW per active model (`m=16`, `ef_construction=64`).
- `rules.rule_sets`: a GiST exclusion constraint on the effective range of published sets.
- `app.calculation_runs`: (`input_hash`, `rule_set_id`).
- `*.delete_after`: btree, for the TTL purge job.

## 4. Retention

| Data | Retention |
|------|-----------|
| Guest household + scenarios + conversations | 7 days after last activity (configurable) |
| Uploads (user) | 24 h. Extracted confirmed facts stay with the household. |
| Sample-case files | Never copied into the DB. Read from private storage. |
| Calculation runs | With the household. Anonymised aggregate counters may be kept. |
| Audit | 1 year (demo: unlimited) |

A purge job runs as a route triggered by cron, or `pg_cron` in compose.

## 5. Seed plan

1. `rules`: rule sets `2026.11-Z1` (effective from 2026-11-01) and `2027.01-Z1` (effective from 2027-01-01, single *okres zasiłkowy*), both `PUBLISHED`. They hold the VERIFIED-T and VERIFIED-ZUS parameters from `domain-model.md` §3.3. The Q-29 and Q-15 keys are present with `blocking=true` until the admin enters sourced values.
2. `kb.sources`: `T`, `USTAWA_ZASILKOWA` (two versions: 2026-07-01 and 2027-01-01), `KP`, `ROZP_2026_1316`, `ROZP_2025_322` and `PORADNIK_2026`, ingested from `fixtures/private/sources/`. `confidential=true` until Q-19 is answered.
3. `content.external_links`: the 3 official links from T p.14, plus the gov.pl civil registry link.
4. `content.support_organizations`: **empty** (A-11).
5. `sim.*`: about 12 synthetic personas mirroring `demo-scenarios.md`.
6. `docs.sample_cases`: generated from the private fixture manifest at deploy time, and only if present.

## 6. Entity-relationship overview

```
rules.rule_sets 1─* rules.rule_parameters *─* kb.document_versions (via rule_parameter_sources)
kb.sources 1─* kb.document_versions 1─* kb.chunks 1─* kb.chunk_embeddings
app.users 1─* app.households 1─* app.parents 1─* app.insurance_titles 1─* app.coverage_periods
                                                                   └─* app.basis_inputs
app.households 1─* app.family_events 1─* app.children
app.households 1─* app.scenarios 1─* app.leave_segments
app.scenarios 1─* app.calculation_runs *─1 rules.rule_sets
docs.uploads 1─* docs.extractions 1─* docs.extracted_fields
ai.conversations 1─* ai.messages 1─* ai.message_citations *─1 kb.chunks
sim.personas 1─* sim.insurance_records / sim.ezla_certificates / sim.debt_statements
```
