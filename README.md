# Zasiłkowy Przewodnik (ZPR)

A working scaffold for a Polish parental-benefits guide: separate web and REST API projects
with a deterministic calculator, grounded knowledge assistant, document-analysis
demo, personalised timeline, and an admin skeleton. Everything runs locally
without AI API keys or government integrations.

> **Demo status.** All government data, documents, and integrations are
> simulated. The calculator returns `INDETERMINATE` amounts until the minimum
> base, parental benefit (Q-29), and rounding policy (Q-15) are approved. The
> assistant answers only from retrieved sources and deterministic services; it
> never invents amounts, deadlines or eligibility decisions.

## Stack

- **Next.js 16** App Router, React 19, Turbopack, `proxy.ts` for admin gating
- **TypeScript** strict, Zod contracts, shared UI from `@workspace/ui`
- **Tailwind CSS v4** + shadcn/ui primitives
- **PostgreSQL 17 + pgvector 0.8** — one database for app data and vectors
- **Drizzle ORM** with generated SQL migrations
- **Vitest** unit tests and **Playwright** e2e/a11y tests
- **pnpm workspaces + Turborepo**
- **Docker Compose** for PostgreSQL and both applications

## Quick start

Requires Node.js 22+ (AI SDK 7) and pnpm via Corepack.

```bash
corepack enable pnpm
pnpm install

# Start PostgreSQL + pgvector only (host port 5435)
docker compose up -d db

# Apply schema, seed synthetic demo data, build and verify the knowledge base
pnpm --filter @zpr/db db:migrate
pnpm --filter @zpr/db db:seed
pnpm kb:seed            # ingest committed sources + run kb:verify (idempotent)

# Start the web and API apps
pnpm dev
```

Open <http://localhost:3000>. The API health check is at
<http://localhost:3000/api/health>.

The defaults in `.env.example` match the Compose database, so no `.env` file is
required for the standard local setup. To override values, create:

- `apps/web/.env.local` for `API_URL` and web session settings,
- `apps/api/.env.local` for database, embedding, rate limit, and admin settings, and
- `packages/db/.env` for migration/seed/smoke scripts.
- `packages/rag/.env` for knowledge-base scripts (`kb:*`).

`.env.example` lists every supported variable. Never commit a real `.env` or
production secret. The two apps must share the same `SESSION_SECRET` and
`ADMIN_GATE_ENABLED` values. The API defaults to `http://127.0.0.1:3001` locally.

### Full Docker Compose

```bash
docker compose up --build -d
```

The API waits for PostgreSQL, applies migrations, seeds the demo data and knowledge base, and serves
requests on the Compose network. The web service waits for the API health check
and serves <http://localhost:3000>. The database is exposed on
`${POSTGRES_PORT:-5435}`.

### Host port already in use?

PostgreSQL is mapped to **5435** by default because 5432–5434 are commonly
occupied. Override it without editing Compose:

```bash
POSTGRES_PORT=5540 docker compose up -d db
DATABASE_URL=postgresql://zpr:zpr_local_password@localhost:5540/zpr pnpm --filter @zpr/db db:migrate
```

## Routes

| Route            | Purpose                                                                   |
| ---------------- | ------------------------------------------------------------------------- |
| `/`              | Landing page, roadmap, safety and simulation disclosures                  |
| `/panel`         | Dashboard: case, nearest deadlines, calculations, knowledge base status   |
| `/start`         | Guided onboarding wizard that creates a synthetic household and case      |
| `/dane`          | Consent, retrieval, summary and verification of simulated ZUS/e-ZLA/USC data |
| `/mobywatel`     | Simulated mObywatel / login.gov.pl flow that prefills the onboarding wizard |
| `/kalkulator`    | Birth/adoption/foster calculator: both parents, work + parental leave, detailed/known basis, ZUS case JSON import, trace and persisted result |
| `/asystent`      | Streaming conversational assistant: tools, citations, history, deletion   |
| `/dokumenty`     | Document analysis: sample case or PDF upload → extraction → field confirmation → eligibility, amount, checklist and deadlines |
| `/os-czasu`      | Plan Rodzicielstwa: interactive three-track leave timeline, stages, details and table view |
| `/wiedza`        | Centrum wiedzy: search, categories, FAQ, articles, documents, guides, glossary |
| `/wiedza/faq`    | FAQ with category filter and full-text search                            |
| `/wiedza/artykul/[slug]` | Article with sections, key points, related FAQ, documents, guides, sources and legal basis |
| `/wiedza/dokumenty` | Document and form cards with official links and review dates          |
| `/wiedza/przewodniki` | Step-by-step procedure guides                                     |
| `/wiedza/slownik` | Glossary with alphabetical filter                                       |
| `/wiedza/zrodla` | Registry of official sources and verification dates                      |
| `/admin/wiedza`  | Knowledge content inventory, status control and review dates             |
| `/o-projekcie`   | What is real, what is simulated, legal caveats, and architecture          |
| `/admin`         | Admin skeleton: counts, rules, sources, ingestion jobs                    |
| `/admin/login`   | Demo admin login (only enforced when `ADMIN_GATE_ENABLED=true`)           |

### Calculator modes

- **Birth** — both parents, separate incomes, maternity takeover, paternity, 81.5% variant, work combined with parental leave, premature/child-loss cases.
- **Adoption / foster care** — non-professional foster families, age limits 7/10/14, 9 + 38/62 week guarantee, professional foster exclusion.
- **ZUS sets** — illustrative presets plus a browser-side import of a private `SC-xx.json`. The file is parsed locally and is never uploaded; the form shows which fields were mapped and which still need to be filled in.
- **Individual basis** — simple monthly amount, 12-month history with absence/supplement, or an already established ZUS/payer basis (Z-3/Z-3a). The result remains `verified: false` until Q-29/Q-15 are confirmed.

## REST API

The web server forwards the existing `/api/*` paths to the API service.
All JSON endpoints use `application/json`; errors use RFC 9457 problem+json with
a stable `code` and an `x-request-id` header. See `/api/v1/openapi.json` for the
machine-readable contract.

| Endpoint                               | Method     | Description                                                                                       |
| -------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------- |
| `/api/health`                          | GET        | Liveness plus DB, pgvector, and migration checks                                                  |
| `/api/v1/health`                       | GET        | Versioned health, table checks, and demo row counts                                               |
| `/api/v1/knowledge/search`             | GET        | Hybrid retrieval (`q`, `limit`, `asOf`, `source`, `sourceType`, `tag`, `minRelevance`)            |
| `/api/v1/assistant/chat`               | POST       | Streaming chat (AI SDK UI message stream, SSE)                                                    |
| `/api/v1/assistant/messages`           | POST       | Same orchestration, single JSON reply (REST integration)                                          |
| `/api/v1/assistant/conversations`      | GET/DELETE | List / delete all of this session's conversations                                                 |
| `/api/v1/assistant/conversations/{id}` | GET/DELETE | History with tool results and sources / delete                                                    |
| `/api/v1/assistant/session`            | GET        | Profile availability and answer mode (no personal data)                                           |
| `/api/v1/onboarding`                   | POST       | Create a household, user profile, and benefit case                                                |
| `/api/v1/calculations`                 | GET        | Recent calculations                                                                               |
| `/api/v1/calculations`                 | POST       | Deterministic calculation; persists input and trace                                               |
| `/api/v1/eligibility/evaluate`         | POST       | Deterministic eligibility per parent and benefit (engine)                                         |
| `/api/v1/benefits/calculate`           | POST       | Full assessment: periods, breakdown, totals, allocation, sources                                  |
| `/api/v1/scenarios/compare`            | POST       | One household, up to 5 leave plans, difference vs the first                                       |
| `/api/v1/timeline`                     | POST       | Benefit periods and dated deadlines                                                               |
| `/api/v1/documents/required`           | POST       | Required documents, forms and where to submit them                                                |
| `/api/v1/rulesets`                     | GET        | Rule set versions, parameters with verification status, rules, assumptions, unsupported scenarios |
| `/api/v1/documents`                    | POST       | Upload a PDF (multipart `file` + `consent=DOCUMENT_PROCESSING`) → `documentId`, status, TTL       |
| `/api/v1/documents/{id}`               | GET/DELETE | Metadata and status / immediate deletion of file, extraction and findings                         |
| `/api/v1/documents/{id}/file`          | GET        | The owner's PDF for the preview (session-bound, `no-store`, never a public URL)                   |
| `/api/v1/documents/{id}/extract`       | POST       | Run extraction (AcroForm → template/regex → optional OCR → optional LLM proposals)                |
| `/api/v1/documents/{id}/extraction`    | GET        | Latest extraction, facts mapping and saved checklist                                              |
| `/api/v1/documents/{id}/fields`        | PUT        | Confirm/correct fields; when complete: eligibility, amounts, documents, timeline, checklist       |
| `/api/v1/documents/cleanup`            | POST       | TTL purge for a cron job (service token); uploads also trigger it                                 |
| `/api/v1/sample-cases`                 | GET        | Synthetic sample cases (+ private ones from a git-ignored manifest)                               |
| `/api/v1/sample-cases/{id}/load`       | POST       | Load a sample case as a document of this session and extract it                                   |
| `/api/v1/documents/analyze`            | GET/POST   | **Deprecated** one-step alias of the above (old response shape + `extraction`)                    |
| `/api/v1/admin/login`                  | POST       | Demo admin login, sets an HMAC-signed HttpOnly cookie                                             |
| `/api/v1/admin/logout`                 | POST       | Clears the admin cookie                                                                           |
| `/api/v1/data-import/sources`  | GET    | Simulated institutions, consent scopes and progress steps |
| `/api/v1/data-import/sessions` | POST   | Start a consented retrieval session                      |
| `/api/v1/data-import/sessions/{id}` | GET | Session state, source results and summary             |
| `/api/v1/data-import/sessions/{id}/summary` | GET | Downloaded / unavailable / manual / inconsistent report |
| `/api/v1/data-import/sessions/{id}/sources/{source}` | POST | Fetch one simulated source             |
| `/api/v1/data-import/sessions/{id}/preview` | POST | Map data, run eligibility rules and preview the calculator |
| `/api/v1/data-import/sessions/{id}/accept` | POST | Save accepted data and return the form prefill |
| `/api/v1/data-import/sessions/{id}/skip` | POST | Abandon retrieval without blocking manual entry |
| `/api/v1/sim/mobywatel/personas` | GET  | Synthetic profiles for the simulated login              |
| `/api/v1/sim/mobywatel/authorize` | POST | Set a short-lived signed prefill session                |
| `/api/v1/sim/mobywatel/logout` | POST   | Clear the simulated mObywatel session                    |

### Documents (`/dokumenty`)

```
PDF ─▶ POST /documents        size ≤ 10 MB, declared type + %PDF- magic bytes, consent DOCUMENT_PROCESSING,
                              private storage (var/uploads or a bucket adapter), docs.uploads, delete_after = now + 24 h
    ─▶ POST /{id}/extract     @zpr/documents: pdf.js text + AcroForm → form detection (fields → headings → text → file name)
                              → R1316 annex 2/3/6 templates → [OCR if a scan and DOCUMENT_OCR_ENABLED]
                              → [LLM proposals if DOCUMENT_LLM_FALLBACK + per-request consent, PII scrubbed]
                              → validators (LR-05 withdrawn forms, missing fields, dates, attachments) → docs.extractions
    ─▶ UI                      PDF preview next to the fields: value, source, page, confidence, "changed by you"
    ─▶ PUT /{id}/fields        user confirms/corrects; userEdited kept, original confidence kept
    ─▶ engine                  evaluateEligibility, calculateParentalBenefits, identifyRequiredDocuments, generateBenefitTimeline
    ─▶ app.checklist_items     documents, where to file (payer vs ZUS) and deadlines
    ─▶ /kalkulator             prefill { monthlyBasisGrosze | grossMonthlyGrosze } — a payer's basis is used as-is
```

- **Deterministic first.** No external AI unless `DOCUMENT_LLM_FALLBACK=true`,
  an `AI_PROVIDER` is configured *and* the user ticks the AI consent for that
  upload. Proposals are `source: LLM`, low confidence, never confirmed automatically.
- **Confirmation is mandatory.** „Potwierdź i oblicz” stays disabled until every
  required field is filled, valid and confirmed; a placeholder such as
  „Do uzupełnienia” is never a valid amount.
- **Basis vs gross.** „Podstawa wymiaru zasiłku” (Z-3/Z-3a) → `KNOWN_BASIS`;
  gross pay → `GROSS_MONTHLY` (13,71% deducted by the engine); an amount of
  unclear nature is shown but never transferred.
- **Privacy.** File names and content are never logged; only a form-code hint
  derived from the name is stored. Files and rows are purged at the TTL
  (`DOCUMENT_TTL_HOURS`, default 24) by the next upload or `POST /documents/cleanup`.
- **Sample cases.** Four synthetic cases (SC-SYN-01…04) are generated in code
  (`packages/documents/src/samples`). Real ZUS cases are never committed: put
  them in `fixtures/private/sample-cases/` (git-ignored) with a `manifest.json`
  (`{"cases":[{"id","code","label","formCode","file","expected":{…}}]}`) and set
  `SAMPLE_CASES_DIR`; the golden harness runs them too.

### Simulated mObywatel login

`/mobywatel` mimics the real login.gov.pl → mObywatel flow: choose the method,
confirm the synthetic persona, review the data scope and confirm with PIN or
biometrics. The API stores only a persona id in a signed, HttpOnly cookie
(`zpr_mobywatel`, 10 minutes); `/start` reads it and prefills the wizard. No
PESEL is requested or stored, and every screen is labelled **SYMULACJA**.

Examples:

```bash
curl -s http://localhost:3000/api/v1/health | jq

curl -s 'http://localhost:3000/api/v1/knowledge/search?q=zasi%C5%82ek%20macierzy%C5%84ski&limit=3' | jq

# Exact form code, valid on a given date, legal sources only
curl -s 'http://localhost:3000/api/v1/knowledge/search?q=Z-3a&asOf=2027-02-01&sourceType=FORM_INSTRUCTION,LEGAL_ACT' | jq

curl -s -X POST http://localhost:3000/api/v1/calculations \
  -H 'content-type: application/json' \
  -d '{"input":{"grossMonthlyIncomeGrosze":800000,"childrenCount":1,"secondParentParentalWeeks":9,"paternityDays":14}}' | jq

# Documents: upload (consent required), extract, confirm (cookie jar keeps the session)
curl -s -c /tmp/zpr -b /tmp/zpr -X POST http://localhost:3000/api/v1/documents \
  -F 'file=@zaswiadczenie.pdf;type=application/pdf' -F 'consent=DOCUMENT_PROCESSING' | jq
curl -s -c /tmp/zpr -b /tmp/zpr -X POST http://localhost:3000/api/v1/documents/<id>/extract | jq
curl -s -c /tmp/zpr -b /tmp/zpr -X POST http://localhost:3000/api/v1/sample-cases/anna-zam/load | jq

curl -s -X POST http://localhost:3000/api/v1/assistant/messages \
  -H 'content-type: application/json' \
  -d '{"message":"Jestem na B2B i jestem w ciąży. Co powinnam zrobić?"}' | jq
```

## Architecture

```
apps/web                 # Next.js UI, admin page gate, and same-origin API forwarding
├── app/                 # Polish pages, knowledge centre, and /api/* forwarding
├── components/          # calculator, assistant, timeline, onboarding, shell
├── server/              # REST client for page data and session reader
└── e2e/                 # Playwright UI, accessibility, and REST tests

apps/api                 # Next.js REST service
├── app/api/             # public API handlers
├── app/internal/        # authenticated dashboard and admin read endpoints
├── server/              # repositories, business services, parsing, and rate limits
└── tests/               # backend unit tests

packages/
├── domain/              # @zpr/domain — pure calculator, eligibility, documents, deadlines, scenarios, timeline, e-ZLA analysis
├── ai/                  # @zpr/ai — assistant orchestration, tools, guards, provider factory, rules model
├── contracts/           # @zpr/contracts — env, API, onboarding, calculator, data-import Zod schemas
├── data-sources/        # @zpr/data-sources — demo scenarios, per-institution providers, mapping engine
├── documents/           # @zpr/documents — PDF reading, form detection, R1316 templates, validators, facts mapping, synthetic samples
├── db/                  # @zpr/db — Drizzle schema, repos, seed, migrations, health
├── rag/                 # @zpr/rag — ingestion pipeline, embeddings, hybrid retrieval
│   ├── knowledge/       #   committed (redistributable) curated sources
│   └── evals/           #   retrieval eval set used by kb:verify
└── ui/                  # @workspace/ui — shadcn/ui primitives and theme
```

The web app calls the API over HTTP. The API owns the database connection and
business services. Both apps share request and response types through
`@zpr/contracts`. Dashboard and admin reads use authenticated server-to-server
requests. With the admin gate enabled, the API also checks the admin session.

Dependency direction: `apps/api → @zpr/contracts → @zpr/domain`,
`apps/api → @zpr/rag → @zpr/db`, `apps/api → @zpr/ai → @zpr/contracts, @zpr/domain`.

`apps/api → @zpr/data-sources → @zpr/contracts, @zpr/domain`.
`@zpr/domain` is pure and performs no I/O; `@zpr/ai` has no database access —
the API injects application services through the `AssistantServices` port.

### OpenRouter

Set these values in your root `.env` (choose a model ID from OpenRouter):

```dotenv
AI_PROVIDER=openrouter
AI_MODEL=provider/model-id
AI_API_KEY=your-openrouter-api-key
```

Then run `docker compose up --build -d api`. OpenRouter uses
`https://openrouter.ai/api/v1` by default; `AI_BASE_URL` can override it.
The model must support tool calling for the assistant's retrieval and calculations.

### Simulated data retrieval

`/dane` starts after the existing mObywatel simulation. Nothing is fetched
until the user selects data scopes and confirms:

1. **Consent** — each institution shows its scopes (insurance history,
   contribution bases, employment, sick leave, child data, benefit cases).
2. **Per-source retrieval** — ZUS, employer/payer, e-ZLA, USC and PUE/eZUS run
   as separate providers with their own progress and failure states.
3. **Summary** — downloaded, unavailable, manually required fields and
   cross-source inconsistencies, each with provenance.
4. **Verification** — every field shows its origin; edits are marked manual.
   A preview runs the deterministic eligibility rules and the calculator
   before anything is accepted.

Accepted data is stored in `app.data_import_sessions` and
`app.data_import_snapshots`, projected into the normalised tables
(`contribution_bases`, `sick_leave_periods`, `children`, `benefit_applications`,
`contribution_payers`, `payroll_components`, `payroll_absences`) and linked to
the household by `importSessionId` during onboarding. The onboarding wizard
and calculator then read the same accepted prefill; the panel shows the latest
retrieval report and eligibility result.

Demo scenarios (synthetic, deterministic, no randomness):

| Scenario | Persona | Purpose |
| -------- | ------- | ------- |
| `anna-employment` | Anna Kowalska | Employment contract, continuous compulsory insurance, pregnancy-related e-ZLA, USC has no birth record yet |
| `marek-self-employment` | Marek Wiśniewski | Sole proprietor, voluntary sickness insurance, open contribution arrears, child from USC, PUE cases |
| `kasia-incomplete` | Kasia Nowak | Mandate ended before birth, insurance gap, e-ZLA outage, empty USC/PUE — manual completion required |

The scenario engine is pure and deterministic. Providers implement one
interface (`DataSourceProvider`), so a real integration can replace a provider
without changing the flow, contracts or mapping.

### Centrum wiedzy

The human-readable knowledge centre is a database-backed editorial layer in the
`kb` schema (`content_*` tables), separate from the RAG corpus. Categories,
articles (structured JSON blocks), FAQ, document cards, procedures, glossary
terms, official sources, legal references and generic cross-links are seeded
from `packages/db/src/content/` and editable without code changes. Article and
guide pages render sources, legal basis and `lastReviewedAt`; `/admin/wiedza`
is behind the existing admin gate and can hide or publish a record. Search is
accent-insensitive and server-side; see
[docs/knowledge-center.md](docs/knowledge-center.md).

### Conversational assistant

One turn: **PII scrub → intent classification → tool policy → tool loop
(`streamText`) → streamed answer → guards → persistence.**

- **Provider-independent** (Vercel AI SDK 7): `AI_PROVIDER=anthropic | openai | openrouter |
ollama | openai-compatible`. With `none` (default) an offline rules model
  plugs into the same `streamText` loop: same tools, real retrieval, guards,
  streaming and persistence; the answer is composed only from tool results
  and retrieved passages.
- **Tools** (Zod, strict, read-only): `searchKnowledgeBase`,
  `getUserInsuranceProfile`, `checkBenefitEligibility`, `calculateBenefit`,
  `compareLeaveScenarios`, `getRequiredDocuments`, `getRelevantDeadlines`,
  `getBenefitTimeline`. None accepts SQL, table names or user ids; none writes.
  Profile or plan changes happen only in the wizard/calculator/planner.
- **Tool policy**: the intent classifier lists required tools (retrieval for
  every legal question; eligibility → `checkBenefitEligibility`, amounts →
  `calculateBenefit`, plans → `compareLeaveScenarios`, documents →
  `getRequiredDocuments`, deadlines → `getRelevantDeadlines`). `prepareStep`
  forces each one (`toolChoice`), max two attempts, last step answers.
- **RAG**: passages are filtered by validity date (`asOf`), labelled `S1…` per
  turn, sent to the model as `<untrusted_source>` data (neutralised), and shown
  as clickable citations with locator, page and validity window. Citation-only
  sources are never quoted. Earlier turns reach the model as plain text without
  old citations or tool output.
- **Guards** (`data-grounding`): unknown `[S#]` labels, numbers not present in
  tool results/sources/user messages, eligibility wording without the
  eligibility tool, legal answers without citations.
- **Privacy & security**: PESEL, account, ID-document, e-mail and phone
  numbers are removed before the model and the database see them; logs carry
  ids/counts only; a signed `zpr_sid` cookie owns conversations (every read
  and delete is owner-filtered in SQL); profile use needs the per-request
  toggle, a session bound by onboarding, and AI consent; rate limits per
  address and per session.

### Database layout

One PostgreSQL database, five schemas:

| Schema  | Contents                                                                                     |
| ------- | -------------------------------------------------------------------------------------------- |
| `app`   | users, profiles, insurance/employment, family events, cases, scenarios, calculations, drafts |
| `legal` | legal rules and versioned rule sets                                      |
| `kb`    | knowledge sources/documents/chunks, ingestion jobs, embedding models, Centrum wiedzy content (`content_*`) |
| `chat`  | conversations, messages, tool calls, retrieved evidence                   |
| `docs`  | uploads (24 h TTL), extractions (fields as one JSON snapshot), validation findings; `app.checklist_items` holds the generated checklist |

`kb.knowledge_chunks` stores model-independent text and metadata (`content`,
page range, `section_identifier`, `heading_path`, `legal_reference`,
`valid_from`/`valid_to`, `content_hash`, benefit tags) plus two app-computed
search columns (`search_text`, `stem_text`) with generated `tsvector`s.
Vectors live in `kb.chunk_embeddings`, one row per (chunk, embedding model).

Indexes:

- a **partial HNSW index per embedding model** (`kb.ensure_embedding_index`),
  created by the ingestion pipeline for that model's dimension
- GIN indexes on `search_tsv` (exact codes such as `Z-3a`) and `stem_tsv`
  (Polish inflection-tolerant keywords)
- GIN `jsonb_path_ops` on chunk metadata; B-tree on validity and references

### Knowledge base (RAG)

`@zpr/rag` implements the ingestion pipeline and hybrid retrieval. Read
[docs/knowledge-sources.md](docs/knowledge-sources.md) before adding or
updating a source.

- **Ingestion** — register → extract (PDF/HTML/Markdown, page-aware) →
  boundaries → normalise → section-aware chunking (Polish legal grammar:
  Rozdział/Art./§/ust./pkt/lit.; guide headings from the TOC) → embed →
  store → index → verify. Idempotent (source key + content hash), retried,
  and verified inside the store transaction.
- **Versions** — document versions carry effective dates; provision-level
  dates come from amendment notes (e.g. art. 9 ust. 4 from 2027-01-01).
- **Retrieval** — pgvector + BM25-ranked full text + exact domain terms
  (ZAM, e-ZLA, Z-3/Z-3a, „Za życiem”) + phrase matches, fused with RRF, with
  access/metadata/date filters, an authority prior, a calibrated relevance
  threshold and an explicit `NO_EVIDENCE` outcome.
- **Access** — PUBLIC / INTERNAL / RESTRICTED per source and document.
  Competition PDFs are INTERNAL and citation-only; ZUS sample cases are
  RESTRICTED and refused by the pipeline.

| Command                                    | Purpose                                                     |
| ------------------------------------------ | ----------------------------------------------------------- |
| `pnpm kb:seed`                             | Reproducible KB from committed sources, then `kb:verify`    |
| `pnpm kb:seed -- --with-local`             | Also ingest local competition PDFs (`KB_LOCAL_SOURCES_DIR`) |
| `pnpm kb:verify`                           | Integrity checks + retrieval eval set (recall gate)         |
| `pnpm --filter @zpr/rag kb:ingest …`       | Ingest / re-ingest one manifest document or source          |
| `pnpm --filter @zpr/rag kb:inspect <file>` | Dry-run extraction and chunking, no database                |
| `pnpm --filter @zpr/rag kb:search "<q>"`   | Debug ranking (ranks per list, relevance, dates)            |
| `pnpm --filter @zpr/rag kb:reembed`        | Re-embed with a new `EMBEDDING_*` configuration             |

### Embeddings

`EmbeddingProvider` (`embedDocument()`, `embedQuery()`) has two adapters:

- `local-demo` — deterministic offline feature hashing (default, 1024 dims).
  It is lexical, not semantic; it keeps the demo and tests reproducible.
- OpenAI-compatible `/embeddings` (`openai`, `ollama`, `openai-compatible`)
  for production, e.g. a multilingual model such as `bge-m3`.

The same `EMBEDDING_*` configuration drives ingestion and retrieval. Each
configuration has its own fingerprinted `kb.embedding_models` row and index,
so changing provider, model, dimensions or prefixes never mixes vectors —
run `pnpm --filter @zpr/rag kb:reembed` after a change.

### Database roles

The migration creates NOLOGIN grouping roles:

| Role           | Access                                         |
| -------------- | ---------------------------------------------- |
| `zpr_app`      | read `legal`/`kb`; read/write `app` and `chat` |
| `zpr_ingest`   | read `legal`; read/write `kb`                  |
| `zpr_readonly` | read-only across all schemas                   |

Local development connects as the owner (`zpr`). A deployment attaches login
roles to these groups instead of using the owner account.

### Admin gate

`ADMIN_GATE_ENABLED=false` by default so the scaffold's admin pages are
reachable in a demo. Set it to `true` to protect `/admin` with the demo login:

- email `admin@zpr.local`
- password `demo-admin` (from `ADMIN_DEMO_PASSWORD`)

The session is an HMAC-signed, HttpOnly `zpr_admin` cookie. Replace the demo
credential flow before any real deployment.

### Rule parameters

The calculator, UI timeline planner and deadline guidance resolve shared legal
parameters from `legal.legal_rule_versions.parameters` in `apps/api`. The web
app reads the validated set through the authenticated `/internal/rule-set` view.
Changing these percentages, week counts and deadlines is a data change.
The expanded assessment endpoints and assistant engine tools retain the
versioned assessment rule catalog described in [calculation-engine.md](docs/calculation-engine.md);
new adoption, loss and hospitalisation cases retain their statutory rules.

The active set is resolved for a date (`getRuleParameters(asOf)`), mapped by the
stable rule codes (`LR-123`, `LR-127`, `LR-130`, `LR-112`, `LR-133`, `LR-100`,
`LR-132`, `LR-134`, `LR-101`, `LR-102`) and validated before use. A missing or malformed parameter
returns a `503` problem response instead of silently using an old value.

Until the admin editing UI lands (FR-ADM-01), change a value directly in the
active rule version and re-run the app; `pnpm --filter @zpr/db db:seed` upserts
the seeded versions and also adds `LR-134`. Results store the rule set version
and pin `rule_version_id` of the amount rule (`LR-130`).

## Scripts

| Command                                                                      | Description                                                                                  |
| ---------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `pnpm dev`                                                                   | Start all workspaces in watch mode                                                           |
| `pnpm build`                                                                 | Build all workspaces                                                                         |
| `pnpm typecheck`                                                             | Type-check all workspaces                                                                    |
| `pnpm lint`                                                                  | Lint all workspaces                                                                          |
| `pnpm test`                                                                  | Run Vitest across workspaces (set `TEST_DATABASE_URL` to include pgvector integration tests) |
| `pnpm e2e`                                                                   | Run Playwright (builds first via Turbo)                                                      |
| `pnpm --filter @zpr/db db:migrate`                                           | Apply Drizzle migrations                                                                     |
| `pnpm --filter @zpr/db db:seed`                                              | Seed synthetic demo data (idempotent)                                                        |
| `pnpm kb:seed` / `pnpm kb:verify`                                            | Build / verify the knowledge base                                                            |
| `pnpm db:setup`                                                              | migrate + demo seed + knowledge base                                                         |
| `pnpm --filter @zpr/db db:generate`                                          | Generate a migration after schema edits                                                      |
| `pnpm --filter @zpr/db db:studio`                                            | Open Drizzle Studio                                                                          |
| `pnpm --filter web e2e`                                                      | Run Playwright against a running server                                                      |
| The Playwright suite uses seeded PostgreSQL and starts both apps by default. |
| Set `PLAYWRIGHT_BASE_URL` to test an already running web and API pair.       |

Playwright needs browsers once:

```bash
pnpm --filter web exec playwright install chromium
```

## Demo data

The seeds insert synthetic personas and redistributable knowledge only — no
real ZUS sample cases or personal data:

- **Anna Kowalska** — employed, one child, standard 100%/70% variant
- **Tomasz Kowalski** — employed father, paternity/parental split
- **Kasia Nowak** — mandate contract ending before birth
- **Marek Wiśniewski** — sole proprietor with voluntary sickness insurance
- Data-retrieval scenarios: Anna (employment), Marek (self-employment), Kasia
  (incomplete history), each consistent across ZUS, employer, e-ZLA, USC and PUE
- `kb:seed`: curated sources in `packages/rag/knowledge/` (statute excerpts in
  two dated versions, Kodeks pracy, form instructions, benefit table, „Za
  życiem”, guide summary, support organisations), chunked and embedded; the
  competition PDFs are added only with `--with-local` and stay INTERNAL
- Versioned legal rules, a demo rule set, and a seeded calculation

The demo credentials and all names are fictional. Government links point to
official public pages but the application never calls a government API.

## Tests and acceptance

```bash
pnpm typecheck
pnpm lint
pnpm test
TEST_DATABASE_URL=postgresql://zpr:zpr_local_password@localhost:5435/zpr pnpm test   # + pgvector and docs integration
pnpm kb:verify
pnpm build
pnpm --filter web e2e
```

Knowledge-base tests (`packages/rag`): unit tests for normalisation, legal and
guide structure detection, chunking, embedding compatibility, fusion, PII
redaction and BM25; integration tests (each in its own throw-away database)
for ingestion stages, idempotency, updates, deduplication, retries, rollback,
restricted-source refusal, vector search, exact keyword retrieval (ZAM, e-ZLA,
Z-3 vs Z-3a, „Za życiem”, urlop rodzicielski, zasiłek macierzyński), metadata
and access filters, versioned legal sources and no-result outcomes.

The suite also covers calculator normalization and amounts, money rounding, env
validation (including production secret rejection), timeline milestones, document warnings, API
problem responses, all route headings, calculator/assistant flows, and axe
accessibility checks on `/`, `/kalkulator`, `/asystent`, `/mobywatel` and `/dane` at desktop and
mobile sizes.

Document tests (`packages/documents`, `apps/api/tests/documents*.test.ts`,
`apps/web/tests/document-prefill.test.ts`, `apps/web/e2e/documents.spec.ts`):
form detection (whole-token codes, `ZAMOWIENIE.pdf`, Z-3b/ZUR/ZAO/ZAS-53),
AcroForm and template extraction on synthetic PDFs, validators, LLM fallback
scrubbing, golden SC-SYN cases through the engine, API status codes
(400/403/404/413/415/429), consent, TTL purge on PostgreSQL, the basis-vs-gross
regression, and the E2E flows with axe.

Data-retrieval tests (`packages/data-sources`): scenario consistency (payer,
employment and insurance dates, contribution bases vs benefit basis, USC birth
date vs PUE), deterministic output, consent-scope filtering, empty/error
sources, self-employment and arrears, incomplete insurance history, mapping to
the calculator and eligibility rules, and e-ZLA analysis. The API flow is
covered by `apps/web/e2e/data-import.spec.ts` (consent → retrieval → summary →
verification → onboarding prefill) and the manual-skip path.

Assistant tests (`packages/ai`, `apps/web/tests/assistant-security.test.ts`,
`apps/web/e2e/assistant.spec.ts`): tool selection for all supported question
types, policy forcing tools on a non-cooperating LLM (mock model),
source-grounded answers and evidence parts, fabricated citations and numbers,
missing evidence and retrieval outages, missing user facts (one follow-up
question, no invented income), prompt injection in user text, history and
retrieved passages, invalid tool arguments (schema + in-tool validation, loop
cap), profile authorization and minimisation, forged session cookies,
conversation ownership and deletion, PII removal, streaming order, provider
failure and abort, and multi-turn continuity.

### Calculation engine

`@zpr/domain/engine` decides eligibility and calculates parental benefits
without an LLM: exact BigInt-rational money, rules and rates versioned by
effective date (`2026.07-Z1`, `2026.10-Z1`, `2027.01-Z1`), an assessment with
eligibility, applicable benefits, breakdown, totals, periods, per-parent
allocation, applied rules, sources, assumptions, missing evidence, warnings and
next steps. The REST endpoints above and the assistant tools are adapters over
the same `evaluate`. See [docs/calculation-engine.md](docs/calculation-engine.md).

## Known limitations

- Amounts are estimates, never ZUS decisions. The deterministic engine
  (`docs/calculation-engine.md`) uses exact arithmetic and versioned rules, but
  Q-29 (minimum wage, świadczenie rodzicielskie, average wage) is not in the
  provided sources, so affected results are labelled lower/upper bounds, and
  rounding (Q-15) is a documented assumption. The 20 unsupported legal
  scenarios are listed in that document. The official ZUS sample cases were
  not available, so no agreement with them is claimed.
- Without `AI_PROVIDER` the assistant runs in offline rules mode: grounded and
  structured, but phrasing is templated. Configure an LLM for natural answers.
- The curated knowledge base is small (e.g. no KP art. 182¹e text on combining
  leave with work), so some questions honestly end in "no evidence".
- Sessions are demo-grade: onboarding with an e-mail binds that synthetic user
  to the browser; there is no real authentication.
- Document templates follow the data scope of R1316 annexes 2, 3 and 6, but
  the exact ZUS print layouts (Q-20) and real sample cases (Q-19) were not
  available: extraction is verified on synthetic PDFs only. OCR needs
  `pdftoppm` + `tesseract -l pol` and is off by default; parsing runs in-process
  with a timeout (no separate worker yet).
- The admin area is a read-only skeleton with a demo login.
- Government integrations, applications, and PZ/eZUS flows are not implemented.
  `/dane` simulates them locally; no request leaves the application.
- The data-retrieval session is demo-grade: consent and provenance are recorded,
  but there is no production identity proof or audit trail.
- The offline embedding model is not suitable for production retrieval quality.
