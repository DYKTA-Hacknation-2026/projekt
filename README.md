# Zasiłkowy Przewodnik (ZPR)

A working scaffold for a Polish parental-benefits guide: separate web and REST API projects
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
- **Docker Compose** for PostgreSQL and both applications

## Quick start

Requires Node.js 20.9+ and pnpm via Corepack.

```bash
corepack enable pnpm
pnpm install

# Start PostgreSQL + pgvector only (host port 5435)
docker compose up -d db

# Apply schema, seed synthetic demo data, verify vector search
pnpm --filter @zpr/db db:migrate
pnpm --filter @zpr/db db:seed
pnpm --filter @zpr/db db:smoke

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

`.env.example` lists every supported variable. Never commit a real `.env` or
production secret. The two apps must share the same `SESSION_SECRET` and
`ADMIN_GATE_ENABLED` values. The API defaults to `http://127.0.0.1:3001` locally.

### Full Docker Compose

```bash
docker compose up --build -d
```

The API waits for PostgreSQL, applies migrations, seeds the demo data, and serves
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
| `/kalkulator`    | Unified calculator with assumptions, trace, and persisted result          |
| `/asystent`      | Retrieval-grounded assistant with source citations                        |
| `/dokumenty`     | Document analysis demo (sample ZUS forms or a PDF signature check)        |
| `/os-czasu`      | Two-parent leave/application/payment timeline planner                     |
| `/o-projekcie`   | What is real, what is simulated, legal caveats, and architecture          |
| `/admin`         | Admin skeleton: counts, rules, sources, ingestion jobs                    |
| `/admin/login`   | Demo admin login (only enforced when `ADMIN_GATE_ENABLED=true`)           |

## REST API

The web server forwards the existing `/api/*` paths to the API service.
All JSON endpoints use `application/json`; errors use RFC 9457 problem+json with
a stable `code` and an `x-request-id` header. See `/api/v1/openapi.json` for the
machine-readable contract.

| Endpoint                       | Method | Description                                              |
| ------------------------------ | ------ | -------------------------------------------------------- |
| `/api/health`                  | GET    | Liveness plus DB, pgvector, and migration checks         |
| `/api/v1/health`               | GET    | Versioned health, table checks, and demo row counts      |
| `/api/v1/knowledge/search`     | GET    | Hybrid pgvector + full-text search (`q`, `limit`, `asOf`) |
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
apps/web                 # Next.js UI, admin page gate, and same-origin API forwarding
├── app/                 # Polish pages and the /api/* forwarding route
├── components/          # calculator, assistant, timeline, onboarding, shell
├── server/              # REST client for page data and session reader
└── e2e/                 # Playwright UI, accessibility, and REST tests

apps/api                 # Next.js REST service
├── app/api/             # public API handlers
├── app/internal/        # authenticated dashboard and admin read endpoints
├── server/              # repositories, business services, parsing, and rate limits
└── tests/               # backend unit tests

packages/
├── domain/              # @zpr/domain — pure calculator and money helpers
├── contracts/           # @zpr/contracts — env, API, onboarding, calculator Zod schemas
├── db/                  # @zpr/db — Drizzle schema, repos, seed, migrations, health
└── ui/                  # @workspace/ui — shadcn/ui primitives and theme
```

The web app calls the API over HTTP. The API owns the database connection and
business services. Both apps share request and response types through
`@zpr/contracts`. Dashboard and admin reads use authenticated server-to-server
requests. With the admin gate enabled, the API also checks the admin session.

### Database layout

One PostgreSQL database, four schemas:

| Schema  | Contents                                                                 |
| ------- | ------------------------------------------------------------------------ |
| `app`   | users, profiles, insurance/employment, family events, cases, scenarios, calculations, drafts |
| `legal` | legal rules and versioned rule sets                                      |
| `kb`    | knowledge sources/documents/chunks, ingestion jobs, embedding models      |
| `chat`  | conversations, messages, tool calls, retrieved evidence                   |

The initial model contains the 20 required tables. `kb.knowledge_chunks` stores
`content`, `embedding`, `source_title`, `source_url`, `source_type`,
`page_number`, `section_identifier`, `legal_reference`, `valid_from`,
`valid_to`, `content_hash`, `metadata`, and `created_at` (plus relational keys).

Indexes created by the migration:

- HNSW cosine index on `kb.knowledge_chunks.embedding`
- GIN full-text index on `to_tsvector('simple', content)`
- GIN `jsonb_path_ops` index on chunk metadata
- B-tree indexes for document, model, legal reference, and validity lookups

### Embeddings

The scaffold uses a deterministic offline feature-hashing model so retrieval
works without API keys:

- provider `local-demo`, model `zpr-hash-1024`, **1024 dimensions**, cosine
- stored in `kb.embedding_models`; every chunk references its model
- a dimension check constraint prevents vectors of the wrong size
- changing model or dimensions requires a full re-embedding and a new index;
  incompatible vectors must never share a retrieval index

The hashing model is a demo stand-in, not a semantic model. Production must
replace it through the embedding-provider boundary and re-embed the corpus.

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
| `pnpm test`                          | Run Vitest across workspaces             |
| `pnpm e2e`                           | Run Playwright (builds first via Turbo)  |
| `pnpm --filter @zpr/db db:migrate`   | Apply Drizzle migrations                 |
| `pnpm --filter @zpr/db db:seed`      | Seed synthetic demo data (idempotent)    |
| `pnpm --filter @zpr/db db:smoke`     | Insert + similarity-search a test vector |
| `pnpm --filter @zpr/db db:generate`  | Generate a migration after schema edits  |
| `pnpm --filter @zpr/db db:studio`    | Open Drizzle Studio                      |
| `pnpm --filter web e2e`              | Run Playwright against both apps  |

The Playwright suite uses seeded PostgreSQL and starts both apps by default.
Set `PLAYWRIGHT_BASE_URL` to test an already running web and API pair.

Playwright needs browsers once:

```bash
pnpm --filter web exec playwright install chromium
```

## Demo data

The seed inserts synthetic personas and knowledge sources only — no real ZUS
sample cases or personal data:

- **Anna Kowalska** — employed, one child, standard 100%/70% variant
- **Tomasz Kowalski** — employed father, paternity/parental split
- **Kasia Nowak** — mandate contract ending before birth
- Polish legal extracts (Kodeks pracy, ustawa zasiłkowa, ZUS guide) chunked and
  embedded for hybrid retrieval
- Versioned legal rules, a demo rule set, and a seeded calculation

The demo credentials and all names are fictional. Government links point to
official public pages but the application never calls a government API.

## Tests and acceptance

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm --filter web e2e
```

The suite covers calculator normalization and amounts, money rounding, env
validation (including production secret rejection), embedding determinism and
similarity, timeline milestones, document warnings, assistant grounding, API
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
