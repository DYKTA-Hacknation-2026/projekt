# Architecture

Status: v0.2 · 2026-11-21 · Covers NFR-01…12, FR-* (see `requirements-traceability.md`)

## 1. Architectural drivers

| Driver | Source | Consequence |
|--------|--------|-------------|
| Correct, explainable calculations checked by the jury against the sample cases | T §6 | A pure, versioned, test-first rules engine with golden tests from the sample cases |
| Parameters editable when the law changes | T p.14 | Rule sets as data (DB) with versioning, verification status and an admin UI |
| Many simulated government integrations | T p.13–14 | One `integrations-sim` module behind production-shaped ports (interfaces) |
| Production potential and a code-structure review | T §5–6 | A modular monolith with clear package boundaries, REST, OpenAPI, Docker, tests |
| AI allowed but must be disclosed; legal accuracy is paramount | T §9, brief | The AI layer is advisory only. It calls deterministic tools and cites sources. |
| Health data and confidential sample cases | RODO art. 9, T p.12 | Data minimisation, encryption, TTL for uploads, private storage for the sample cases |
| RWD, WCAG 2.2 AA, Polish UI | T §4–5, brief | shadcn/ui (Radix) primitives, a11y tests in CI, a Polish message catalogue |

## 2. Style: modular monolith

There is one deployable Next.js application (`apps/web`) that hosts the following:

- **Presentation**: RSC pages and client components.
- **REST API**: `app/api/v1/**/route.ts`, kept thin.
- **Composition root**: `apps/web/server/`, where it wires the packages together.

Domain logic lives in **workspace packages** with enforced dependency directions. Microservices are rejected: one team, one hackathon, and no independent scaling needs. Package boundaries still allow later extraction, for example of the rules engine as a service for ZUS systems.

### Dependency graph (allowed imports)

```
apps/web ─┬─▶ @zpr/contracts ─▶ @zpr/domain
          ├─▶ @zpr/domain            (pure; imports nothing internal except decimal/date libs)
          ├─▶ @zpr/db ─────────▶ @zpr/domain (types only)
          ├─▶ @zpr/integrations-sim ─▶ @zpr/contracts
          ├─▶ @zpr/documents ───▶ @zpr/contracts, @zpr/ai (LLM fallback port)
          ├─▶ @zpr/rag ─────────▶ @zpr/ai (embedding port), @zpr/db
          ├─▶ @zpr/ai ──────────▶ @zpr/contracts (tool schemas)
          └─▶ @workspace/ui
```

The graph is enforced with `eslint-plugin-boundaries` or `dependency-cruiser` in CI. `@zpr/domain` may **not** import `db`, `ai`, `rag`, `next` or any Node I/O.

## 3. Folder structure (target)

```
.
├── apps/
│   └── web/
│       ├── app/
│       │   ├── (public)/                 # no session needed
│       │   │   ├── page.tsx              # landing: „Przewodnik”
│       │   │   ├── przewodnik/           # info hub: ciąża, macierzyński, ojciec, adopcja, ryzyka, ochrona
│       │   │   │   └── [slug]/page.tsx
│       │   │   ├── sytuacje-szczegolne/  # stillbirth, premature birth, hospitalisation… (sensitive mode)
│       │   │   ├── wsparcie/             # charities + official links (FR-INF-04/05)
│       │   │   └── o-projekcie/          # AI disclosure, simulation disclosure, sources (DEL-08/09)
│       │   ├── (app)/                    # guest or simulated-login session
│       │   │   ├── start/                # onboarding wizard
│       │   │   ├── kalkulator/           # integrated calculator (FR-CALC-00)
│       │   │   ├── planer/               # two-parent timeline planner
│       │   │   ├── uprawnienia/          # eligibility summary + „Dlaczego?”
│       │   │   ├── dokumenty/            # upload / sample-case picker (FR-DEMO-01/02)
│       │   │   ├── wnioski/              # simulated applications (FR-SIM-06/07)
│       │   │   ├── konto-zus/            # simulated PUE/eZUS: insurance, e-ZLA, debt, messages
│       │   │   ├── lista-kontrolna/      # personalised checklist + deadlines
│       │   │   └── asystent/             # RAG assistant
│       │   ├── (sim)/mobywatel/          # simulated mObywatel login screens (clearly branded SYMULACJA)
│       │   ├── admin/                    # rule sets, parameters, KB sources, charities, links, flags
│       │   ├── api/v1/…/route.ts         # REST (see §6)
│       │   ├── layout.tsx                # lang="pl", skip link, simulation banner slot
│       │   └── globals.css
│       ├── proxy.ts                      # Next 16 "proxy" (formerly middleware): session + admin gating
│       ├── server/                       # composition root (server-only)
│       │   ├── container.ts              # builds services from packages + env
│       │   ├── services/                 # application services (use cases) shared by RSC and route handlers
│       │   ├── auth/                     # session, simulated mObywatel adapter, admin auth
│       │   └── http/                     # route-handler helpers: zod parsing, problem+json errors, rate limit
│       ├── components/                   # app-specific components (calculator steps, timeline, citations)
│       ├── messages/pl/                  # all Polish copy (reasons, labels, help texts)
│       ├── e2e/                          # Playwright specs (+ axe a11y checks)
│       └── next.config.ts
├── packages/
│   ├── domain/                           # @zpr/domain — pure rules engine
│   │   └── src/{coverage,routing,sickness,maternity-equivalent,leave,amounts,risks,protection,validation,
│   │            ruleset,money,dates,trace}/  + __tests__/golden/
│   ├── contracts/                        # @zpr/contracts — Zod DTOs, REST schemas, OpenAPI generation, tool schemas
│   ├── db/                               # @zpr/db — Drizzle schema, migrations, seed, repositories
│   ├── integrations-sim/                 # @zpr/integrations-sim — ports + simulated adapters + synthetic personas
│   ├── documents/                        # @zpr/documents — PDF parsing, form detectors, field mappers, validators
│   ├── ai/                               # @zpr/ai — LLM/embedding provider ports, AI SDK adapters, assistant, tools, guards
│   ├── rag/                              # @zpr/rag — ingestion, chunking, hybrid retrieval, citations
│   ├── ui/                               # @workspace/ui — shadcn/ui (exists)
│   ├── eslint-config/                    # exists
│   └── typescript-config/                # exists
├── infra/
│   ├── docker/postgres/                  # Dockerfile: pgvector + Polish ispell dictionary; init.sql
│   └── docker/web/Dockerfile             # standalone Next build
├── fixtures/
│   ├── personas/                         # synthetic, committed (our own invented data)
│   └── private/                          # ZUS sample cases — .gitignored (Q-19)
├── docs/                                 # this documentation
├── docker-compose.yml                    # postgres(pgvector) + web (+ optional ollama for local LLM)
└── turbo.json / pnpm-workspace.yaml
```

Packages are "just-in-time" TypeScript packages, the same as the existing `@workspace/ui`. They export TS sources and are compiled by Next through `transpilePackages`, and by Vitest directly.

## 4. Layering inside the app

```
Route handler / RSC page / Server action
        │  (parse with Zod from @zpr/contracts; auth from proxy+session)
        ▼
Application service (apps/web/server/services)       ← use cases, transactions, audit
        │
        ├─▶ @zpr/domain.evaluate(facts, ruleSet)      ← pure
        ├─▶ repositories (@zpr/db)                    ← Drizzle
        ├─▶ ports: Simulated gov (@zpr/integrations-sim), LLM (@zpr/ai), Retrieval (@zpr/rag)
        ▼
DTO (Zod) → JSON (REST) or props (RSC)
```

- **Reads in RSC** call application services directly, in-process with no HTTP hop.
- **Mutations and all calculator calls** from client components go through **REST** (`/api/v1`), as T §5 recommends. Server actions are used only for trivial form posts in admin, if at all.
- All errors use the `application/problem+json` format with stable error codes.

## 5. Key design decisions

| # | Decision | Alternatives considered | Rationale |
|---|----------|------------------------|-----------|
| AD-01 | Rules engine as **TypeScript code + data parameters**. Rule logic is code; numbers, rates and thresholds are DB parameters. | A JSON rules DSL, or a BRMS (Drools) | Legal logic such as takeovers, parts and loss scenarios is procedural. A DSL would be slow to build and hard to test. Parameters cover T p.14 ("stopy procentowej… maksymalnego wymiaru"). |
| AD-02 | Rule sets are **immutable once published**. Each calculation pins `ruleSetVersion` and stores an `inputHash`. | Mutable parameters | Reproducibility, audit, and jury re-checks |
| AD-03 | Money is in **integer grosze**; rates use `decimal.js`; dates use `Temporal` (polyfill) or `date-fns` with **PlainDate** semantics in `Europe/Warsaw`. | JS floats | Correctness |
| AD-04 | **Three-valued outcome** (`ELIGIBLE` / `NOT_ELIGIBLE` / `INDETERMINATE` + `NEEDS_INPUT`) | Boolean | The policy of never guessing (legal-assumptions §1) |
| AD-05 | Simulated integrations behind **ports** with `simulated: true` in every DTO, plus a persistent UI banner | Hard-coded mocks in UI | Production swap-ability (e.g. a real mObywatel OIDC later); honesty requirement |
| AD-06 | AI through **Vercel AI SDK** behind our own `LlmProvider` and `EmbeddingProvider` ports. The model is chosen by env, e.g. `LLM_PROVIDER=anthropic`, `LLM_MODEL=claude-sonnet-5-5`, or a local Ollama. | A direct vendor SDK | Provider-agnostic (brief) |
| AD-07 | **Hybrid retrieval**: pgvector HNSW + Postgres FTS (Polish dictionary), fused with RRF, all in one Postgres | A dedicated vector DB | One datastore; simpler ops; sufficient scale |
| AD-08 | Document extraction is **deterministic first** (AcroForm fields, then layout/regex templates per form code). An LLM is used only as a fallback to propose values, and **the user always confirms** before any calculation. | LLM-first extraction | Jury correctness checks; explainability |
| AD-09 | **Guest mode** by default. Simulated mObywatel login unlocks "import from ZUS". | Login wall | The jury must test fast (T §6). Privacy. |
| AD-10 | The Next 16 **`proxy.ts`** (the `middleware` convention is deprecated in 16) is used only for coarse gating, e.g. `/admin`. Fine-grained authorisation lives in services. | — | Next 16 docs: proxy should not rely on shared modules |

## 6. REST API (v1)

Base path: `/api/v1`. JSON only. OpenAPI 3.1 is generated from the Zod schemas (Zod 4 `toJSONSchema`) and served at `/api/v1/openapi.json`.

| Method | Path | Purpose | Req |
|--------|------|---------|-----|
| POST | `/eligibility/evaluate` | Facts → determinations (no persistence required) | FR-PRD-02, FR-INF-01 |
| POST | `/calculations` | Facts + scenario → full `EngineResult` (stored, returns `id`) | FR-CALC-* |
| GET | `/calculations/{id}` | Retrieve a stored result + trace | NFR-11 |
| GET/POST | `/scenarios` · GET/PUT/DELETE `/scenarios/{id}` | Planner scenarios | FR-PRD-05 |
| POST | `/scenarios/{id}/validate` | Invariant checks (14 weeks, 9 weeks, parts…) | FR-CALC-03 |
| POST | `/scenarios/compare` | Up to 3 scenarios side by side | FR-CALC-08 |
| GET | `/checklists?scenarioId=` | Personalised documents, routing and deadlines | FR-INF-02 |
| GET | `/rulesets/active` | Public parameters + verification flags | FR-ADM-01 |
| GET | `/content/support-organizations` · `/content/links` | Charities, official links | FR-INF-04/05 |
| POST | `/documents` (multipart) | Upload a PDF → `documentId` | FR-DEMO-02 |
| POST | `/documents/{id}/extract` | Run the extraction pipeline | FR-PRD-06 |
| PUT | `/documents/{id}/fields` | The user confirms or corrects fields | AD-08 |
| GET | `/sample-cases` · POST `/sample-cases/{id}/load` | Pick a ZUS sample case (private storage) → facts | FR-DEMO-01 |
| POST | `/sim/mobywatel/authorize` · GET `/sim/mobywatel/callback` | Simulated login | FR-SIM-01 |
| GET | `/sim/zus/insurance` | Simulated insurance periods (or "no insurance") | FR-SIM-02 |
| POST | `/sim/zus/debt-certificates` | Simulated debt certificate as of a date | FR-SIM-03 |
| GET | `/sim/zus/ezla` | Simulated e-ZLA list | FR-SIM-04 |
| GET/POST | `/sim/pue/messages` | Simulated PUE/eZUS inquiries | FR-SIM-05 |
| GET | `/sim/pue/account` | Simulated account data | FR-SIM-05 |
| POST | `/sim/applications` · GET `/sim/applications/{id}` | Simulated leave and benefit applications (draft → "sent") + PDF render | FR-SIM-06 |
| POST | `/sim/civil-registry/birth-certificate-requests` | Simulated birth-certificate copy request | FR-SIM-07 |
| POST | `/assistant/chat` | Streaming chat (AI SDK UI message stream over SSE) | FR-PRD-07 |
| GET | `/assistant/conversations/{id}` | History with citations | FR-PRD-07 |
| * | `/admin/rulesets…`, `/admin/kb/sources…`, `/admin/content…` | Admin (role `ADMIN`) | FR-ADM-01/02 |
| GET | `/health` · `/openapi.json` | Ops | NFR-03 |

## 7. Cross-cutting concerns

### 7.1 Security and privacy

- **Sessions:** httpOnly, Secure, SameSite=Lax cookies backed by a `sessions` table. Guest sessions are anonymous. The admin uses a separate credential (env-seeded, Argon2id hash) and role checks in services.
- **PESEL and identity:** only synthetic personas exist in the simulation. A user-entered PESEL is **not required** anywhere.
- **Health data** (pregnancy, e-ZLA): explicit consent screen; column-level encryption (AES-256-GCM, app-side key from env/KMS) for free-text health fields; minimal retention.
- **Uploads:** size ≤ 10 MB, PDF MIME + magic-byte check, never executed, parsed in a worker with a timeout, deleted after 24 h (configurable). The ZUS sample cases are read from `fixtures/private` or a private bucket, are never public URLs, and are watermarked in the UI as "Przykład ZUS – wyłącznie do celów HackNation".
- **LLM data protection:** a PII scrubber runs before prompts (names, PESEL patterns, addresses). The provider and data-retention mode are documented in "O projekcie".
- **Hardening:** rate limiting on `/assistant/*` and `/documents/*`; CSP headers; dependency audit in CI; a licence check (DEL-10/11), with an allowlist of MIT/Apache-2.0/BSD/ISC.

### 7.2 Accessibility (WCAG 2.2 AA)

- Radix-based shadcn components; `lang="pl"`; skip link; visible focus with no focus obscured (2.4.11); target size ≥ 24 px (2.5.8).
- No drag-only interactions (2.5.7): the timeline planner always offers date inputs and buttons as well as dragging.
- Accessible authentication (3.3.8): the simulated login has no cognitive tests. Redundant entry (3.3.7): we pre-fill from the profile.
- Charts and timelines have table equivalents. Amounts are announced with `aria-live="polite"` on recalculation.
- Automated checks run `@axe-core/playwright` on every page in CI, plus a manual keyboard and screen-reader (NVDA) pass before the demo.
- Plain language in Polish, with a glossary tooltip for legal terms. A sensitive mode is used for loss scenarios.

### 7.3 Internationalisation

All UI copy is in Polish and lives in `apps/web/messages/pl`. A plain typed object is used (no i18n framework needed now). Formatting uses `Intl.NumberFormat('pl-PL', {style:'currency', currency:'PLN'})` and `Intl.DateTimeFormat('pl-PL')`.

### 7.4 Observability

- Structured logs (pino) with a request id.
- A `calculation_runs` table as the business audit.
- An `assistant_tool_calls` table.
- OpenTelemetry hooks via Next `instrumentation.ts`, optional.

### 7.5 Simulation honesty (NFR-10)

- A global `<SimulationBanner>` appears on any page that shows simulated data.
- Every simulated DTO carries `{ simulated: true, disclaimer: "…" }`.
- Generated "documents" (certificates, application confirmations) are watermarked „SYMULACJA – dokument nie ma mocy prawnej”.
- Copy never says "wysłano do ZUS". It says „zasymulowano wysłanie”.

## 8. Testing strategy

| Level | Tool | Scope | Gate |
|-------|------|-------|------|
| Unit / property | Vitest + fast-check | `@zpr/domain`: every LR-xx has at least one test, plus property tests for the invariants (domain-model §6) | 100% of LR rules covered; ≥ 90% branch coverage in the domain |
| Golden | Vitest | Sample cases → expected verdict and amount (private fixtures run locally or in a private CI secret) plus synthetic personas (public) | Must pass before the demo |
| Contract | Vitest + Zod | REST DTOs, OpenAPI snapshot | CI |
| Integration | Vitest + Testcontainers (pgvector image) | Repositories, retrieval quality, document extraction | CI |
| RAG eval | Vitest-run eval set (`rag/evals/*.jsonl`) | Retrieval recall@k, citation correctness, refusal on out-of-scope, the "no numbers without a tool" check | Thresholds in `rag-architecture.md` |
| E2E | Playwright (desktop + mobile viewport) + axe | The demo scenarios (`demo-scenarios.md`) | CI on main |

## 9. Deployment

- **Local:** `docker compose up` runs Postgres 17 + pgvector + the Polish dictionary, and the web app. Ollama is an optional profile.
- **Demo (public URL, DEL-06):** two options, decided at P0:
  - **A:** a single VPS running docker compose behind Caddy (TLS). This is the simplest match to the compose setup.
  - **B:** Vercel for the web app and a managed Postgres with pgvector (Neon or Supabase).

  Either way: migrations run at deploy, seeding is idempotent, and the private sample cases are mounted from secret storage.
- **Production potential:** a stateless web tier, Postgres as the single source of truth, ports ready for the real mObywatel (OIDC), the ZUS APIs, and PUE.

## 10. Risks

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Missing external values (Q-29: minimum wage, *świadczenie rodzicielskie*) and rounding (Q-15) | Amount edge cases (floor, debt threshold) and precision vs sample cases | INDETERMINATE policy for affected cases only; the admin enters sourced values; ask mentors at P0. (Durations and basis rules have been sourced since v0.2.) |
| Legal text changes on 2027-01-01 (U art. 9 ust. 4) | Wrong *okres zasiłkowy* across titles | Rule sets versioned by effective date (`2026.11-Z1`, `2027.01-Z1`) |
| Sample-case confidentiality vs public demo (Q-19) | Disqualification or legal risk | Private storage, no commit, ask mentors early |
| LLM hallucinating amounts or law | Trust and correctness | Tools-only numbers, a post-generation numeric guard, mandatory citations, refusal policy |
| Scope too big for the hackathon timebox | Incomplete demo | Roadmap phases with an "MVP cut line" (see `implementation-roadmap.md`) |
| Next 16 API differences | Build breaks | Read `node_modules/next/dist/docs` before coding (AGENTS.md) |
