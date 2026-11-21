# Zasiłkowy Przewodnik (ZPR)

A working scaffold for a Polish parental-benefits guide: one Next.js application
with a deterministic calculator, grounded knowledge assistant, document-analysis
demo, personalised timeline, and an admin skeleton. Everything runs locally
without AI API keys or government integrations.

> **Demo status.** All government data, documents, and integrations are
> simulated. The calculator returns `INDETERMINATE` amounts until the minimum
> base, parental benefit (Q-29), and rounding policy (Q-15) are approved. The
> assistant quotes retrieved sources and never invents amounts or eligibility
> decisions.

## Stack

- **Next.js 16** App Router, React 19, Turbopack, `proxy.ts` for admin gating
- **TypeScript** strict, Zod contracts, shared UI from `@workspace/ui`
- **Tailwind CSS v4** + shadcn/ui primitives
- **PostgreSQL 17 + pgvector 0.8** — one database for app data and vectors
- **Drizzle ORM** with generated SQL migrations
- **Vitest** unit tests and **Playwright** e2e/a11y tests
- **pnpm workspaces + Turborepo**
- **Docker Compose** for PostgreSQL and the web image

## Quick start

Requires Node.js 20.9+ and pnpm via Corepack.

```bash
corepack enable pnpm
pnpm install

# Start PostgreSQL + pgvector only (host port 5435)
docker compose up -d db

# Apply schema, seed synthetic demo data, build and verify the knowledge base
pnpm --filter @zpr/db db:migrate
pnpm --filter @zpr/db db:seed
pnpm kb:seed            # ingest committed sources + run kb:verify (idempotent)

# Start the web app
pnpm dev
```

Open <http://localhost:3000>. The API health check is at
<http://localhost:3000/api/health>.

The defaults in `.env.example` match the Compose database, so no `.env` file is
required for the standard local setup. To override values, create:

- `apps/web/.env.local` for the Next.js app, and
- `packages/db/.env` for migration/seed scripts, and
- `packages/rag/.env` for knowledge-base scripts (`kb:*`).

`.env.example` lists every supported variable. Never commit a real `.env` or
production secret.

### Full Docker Compose

```bash
docker compose up --build -d
```

This builds the web image, waits for a healthy database, runs migrations, the
demo seed and the knowledge-base seed, then starts Next.js on <http://localhost:3000>. The database is exposed on
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
| `/kalkulator`    | Unified calculator with assumptions, trace, and persisted result          |
| `/asystent`      | Retrieval-grounded assistant with source citations                        |
| `/dokumenty`     | Document analysis demo (sample ZUS forms or a PDF signature check)        |
| `/os-czasu`      | Two-parent leave/application/payment timeline planner                     |
| `/o-projekcie`   | What is real, what is simulated, legal caveats, and architecture          |
| `/admin`         | Admin skeleton: counts, rules, sources, ingestion jobs                    |
| `/admin/login`   | Demo admin login (only enforced when `ADMIN_GATE_ENABLED=true`)           |

## REST API

All JSON endpoints use `application/json`; errors use RFC 9457 problem+json with
a stable `code` and an `x-request-id` header. See `/api/v1/openapi.json` for the
machine-readable contract.

| Endpoint                       | Method | Description                                              |
| ------------------------------ | ------ | -------------------------------------------------------- |
| `/api/health`                  | GET    | Liveness plus DB, pgvector, and migration checks         |
| `/api/v1/health`               | GET    | Versioned health, table checks, and demo row counts      |
| `/api/v1/knowledge/search`     | GET    | Hybrid retrieval (`q`, `limit`, `asOf`, `source`, `sourceType`, `tag`, `minRelevance`) |
| `/api/v1/assistant/chat`       | POST   | Grounded answer with `[S1]` citations and AI disclosure  |
| `/api/v1/onboarding`           | POST   | Create a household, user profile, and benefit case       |
| `/api/v1/calculations`         | GET    | Recent calculations                                      |
| `/api/v1/calculations`         | POST   | Deterministic calculation; persists input and trace      |
| `/api/v1/documents/analyze`    | GET    | Available synthetic sample documents                     |
| `/api/v1/documents/analyze`    | POST   | Analyze a PDF or `sampleCase` multipart field            |
| `/api/v1/admin/login`          | POST   | Demo admin login, sets an HMAC-signed HttpOnly cookie    |
| `/api/v1/admin/logout`         | POST   | Clears the admin cookie                                  |

Examples:

```bash
curl -s http://localhost:3000/api/v1/health | jq

curl -s 'http://localhost:3000/api/v1/knowledge/search?q=zasi%C5%82ek%20macierzy%C5%84ski&limit=3' | jq

# Exact form code, valid on a given date, legal sources only
curl -s 'http://localhost:3000/api/v1/knowledge/search?q=Z-3a&asOf=2027-02-01&sourceType=FORM_INSTRUCTION,LEGAL_ACT' | jq

curl -s -X POST http://localhost:3000/api/v1/calculations \
  -H 'content-type: application/json' \
  -d '{"input":{"grossMonthlyIncomeGrosze":800000,"childrenCount":1,"secondParentParentalWeeks":9,"paternityDays":14}}' | jq

curl -s -X POST http://localhost:3000/api/v1/documents/analyze \
  -F 'sampleCase=anna-zam' | jq

curl -s -X POST http://localhost:3000/api/v1/assistant/chat \
  -H 'content-type: application/json' \
  -d '{"message":"Ile trwa urlop macierzyński przy jednym dziecku?"}' | jq
```

## Architecture

```
apps/web
├── app/                 # Polish routes, RSC pages, route handlers, error/not-found
├── components/          # calculator, assistant, timeline, onboarding, shell
├── lib/                 # formatting and the pure timeline builder
├── messages/pl/         # all Polish copy and labels
├── server/
│   ├── container.ts     # composition root (env + repositories)
│   ├── services/        # dashboard, admin, assistant, calculations, documents…
│   ├── http/            # zod parsing, problem+json, rate limiting, route wrapper
│   └── auth/            # admin cookie/session helpers
├── proxy.ts             # optional admin gate (Next 16 proxy, not middleware)
├── e2e/                 # Playwright route, calculator, assistant, axe specs
└── tests/               # Vitest unit tests

packages/
├── domain/              # @zpr/domain — pure calculator and money helpers
├── contracts/           # @zpr/contracts — env, API, onboarding, calculator Zod schemas
├── db/                  # @zpr/db — Drizzle schema, repos, seed, migrations, health
├── rag/                 # @zpr/rag — ingestion pipeline, embeddings, hybrid retrieval
│   ├── knowledge/       #   committed (redistributable) curated sources
│   └── evals/           #   retrieval eval set used by kb:verify
└── ui/                  # @workspace/ui — shadcn/ui primitives and theme
```

Dependency direction: `apps/web → @zpr/contracts → @zpr/domain`,
`apps/web → @zpr/rag → @zpr/db`. `@zpr/domain` is pure and performs no I/O.

### Database layout

One PostgreSQL database, four schemas:

| Schema  | Contents                                                                 |
| ------- | ------------------------------------------------------------------------ |
| `app`   | users, profiles, insurance/employment, family events, cases, scenarios, calculations, drafts |
| `legal` | legal rules and versioned rule sets                                      |
| `kb`    | knowledge sources/documents/chunks, ingestion jobs, embedding models      |
| `chat`  | conversations, messages, tool calls, retrieved evidence                   |

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

| Command                                   | Purpose                                                   |
| ----------------------------------------- | --------------------------------------------------------- |
| `pnpm kb:seed`                            | Reproducible KB from committed sources, then `kb:verify`  |
| `pnpm kb:seed -- --with-local`            | Also ingest local competition PDFs (`KB_LOCAL_SOURCES_DIR`)|
| `pnpm kb:verify`                          | Integrity checks + retrieval eval set (recall gate)        |
| `pnpm --filter @zpr/rag kb:ingest …`      | Ingest / re-ingest one manifest document or source         |
| `pnpm --filter @zpr/rag kb:inspect <file>`| Dry-run extraction and chunking, no database               |
| `pnpm --filter @zpr/rag kb:search "<q>"`  | Debug ranking (ranks per list, relevance, dates)           |
| `pnpm --filter @zpr/rag kb:reembed`       | Re-embed with a new `EMBEDDING_*` configuration            |

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

| Role          | Access                                                        |
| ------------- | ------------------------------------------------------------- |
| `zpr_app`     | read `legal`/`kb`; read/write `app` and `chat`                 |
| `zpr_ingest`  | read `legal`; read/write `kb`                                  |
| `zpr_readonly`| read-only across all schemas                                   |

Local development connects as the owner (`zpr`). A deployment attaches login
roles to these groups instead of using the owner account.

### Admin gate

`ADMIN_GATE_ENABLED=false` by default so the scaffold's admin pages are
reachable in a demo. Set it to `true` to protect `/admin` with the demo login:

- email `admin@zpr.local`
- password `demo-admin` (from `ADMIN_DEMO_PASSWORD`)

The session is an HMAC-signed, HttpOnly `zpr_admin` cookie. Replace the demo
credential flow before any real deployment.

## Scripts

| Command                              | Description                              |
| ------------------------------------ | ---------------------------------------- |
| `pnpm dev`                           | Start all workspaces in watch mode       |
| `pnpm build`                         | Build all workspaces                     |
| `pnpm typecheck`                     | Type-check all workspaces                |
| `pnpm lint`                          | Lint all workspaces                      |
| `pnpm test`                          | Run Vitest across workspaces (set `TEST_DATABASE_URL` to include pgvector integration tests) |
| `pnpm e2e`                           | Run Playwright (builds first via Turbo)  |
| `pnpm --filter @zpr/db db:migrate`   | Apply Drizzle migrations                 |
| `pnpm --filter @zpr/db db:seed`      | Seed synthetic demo data (idempotent)    |
| `pnpm kb:seed` / `pnpm kb:verify`    | Build / verify the knowledge base        |
| `pnpm db:setup`                      | migrate + demo seed + knowledge base     |
| `pnpm --filter @zpr/db db:generate`  | Generate a migration after schema edits  |
| `pnpm --filter @zpr/db db:studio`    | Open Drizzle Studio                      |
| `pnpm --filter web e2e`              | Run Playwright against a running server  |

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
TEST_DATABASE_URL=postgresql://zpr:zpr_local_password@localhost:5435/zpr pnpm test   # + pgvector integration
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
validation (including production secret rejection), timeline milestones, document warnings, assistant grounding, API
problem responses, all route headings, calculator/assistant flows, and axe
accessibility checks on `/`, `/kalkulator`, and `/asystent` at desktop and
mobile sizes.

## Known limitations

- Calculator amounts are a labelled preview; Q-29 and Q-15 are unapproved.
- The assistant is deterministic retrieval + quotation; it does not use an LLM
  and deliberately refuses to invent amounts or decisions.
- Document analysis checks PDF signatures and returns deterministic sample
  fields; it does not perform OCR.
- The admin area is a read-only skeleton with a demo login.
- Government integrations, applications, and PZ/eZUS flows are not implemented.
- The offline embedding model is not suitable for production retrieval quality.
