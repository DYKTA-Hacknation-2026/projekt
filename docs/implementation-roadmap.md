# Implementation Roadmap

Status: v0.2 · 2026-11-21. The ZUS legal sources have been received, so the external critical path is now the sample cases plus Q-29.

## 1. Phase dependency graph

```
P0 Foundations ──┬──▶ P1 Domain core ──▶ P2 Calculators & eligibility ──┬──▶ P5 Product UI ──┐
                 │                                                     │                   │
                 ├──▶ P3 DB + REST + rule config ──────────────────────┤                   │
                 │                                                     ├──▶ P6 Documents & sample cases
                 ├──▶ P4 Simulated integrations ───────────────────────┘                   │
                 │                                                                         ▼
                 └──▶ P7a KB ingestion (needs P3) ──▶ P7b Assistant (needs P2 tools) ──▶ P8 Admin UI ──▶ P9 Hardening ──▶ P10 Deliverables

External critical path:  ✅ U, KP, R1316, R322, P received (v0.2): most parameters now VERIFIED-ZUS
                         ──▶ remaining: sample cases + Q-19/Q-20 (confidentiality, format)
                         ──▶ Q-29 external values (minimum wage, świadczenie rodzicielskie) entered via admin
                         ──▶ P6 golden tests
```

**Parallel tracks** (for a team of 3–5 people):

- **Track A (domain):** P1 → P2. Later, P6 golden tests.
- **Track B (platform):** P0 → P3 → P8.
- **Track C (experience):** P5 shell with a mocked engine, then real wiring.
- **Track D (integrations/AI):** P4 → P7.
- **Track E (PM):** mentor questions → P10.

## 2. MVP cut line

These must be demoable: everything that is **mandatory**.

**Above the line (must ship):**

- P0, P1, P2 (with INDETERMINATE for unresolved Qs), P3 (minimal), P4, P5 (core pages), P6 (picker + upload + confirm)
- P8 (parameter editing only)
- P9 (RWD, a11y basics, deploy)
- P10

**Below the line (competitive, ship if time allows, in this order):**

1. P7 assistant
2. Planner drag and drop
3. ICS/PDF export
4. Rerank and evals dashboard
5. Plain-language mode
6. A11y beyond AA

## 3. Ordered task checklist

Each task gives its ID, the task, its dependencies (*Deps*), and the requirements it serves (*Req*).

### P0: Foundations

- [ ] **P0-01** Batch the open questions to the ZUS mentors. *Deps:* none. *Req:* CON-05.
  - **P0:** Q-19 (confidentiality of the sample cases and sources), Q-20 (sample-case format), Q-29 (which official minimum-wage and *świadczenie rodzicielskie* values to use), Q-15 (rounding)
  - **P1:** Q-16, Q-30, Q-32
  - also: request the sample cases
  - ✅ Regulations extract and Poradnik received 2026-11-21.
- [ ] **P0-02** Decide the demo hosting (option A VPS+compose vs B Vercel+managed PG). Record it as an ADR in `docs/adr/0001-hosting.md`. *Req:* DEL-06.
- [ ] **P0-03** Create the workspace packages:
  - `@zpr/domain`, `@zpr/contracts`, `@zpr/db`, `@zpr/integrations-sim`, `@zpr/documents`, `@zpr/ai`, `@zpr/rag`
  - each with `tsconfig` extending `@workspace/typescript-config` (strict) and `transpilePackages` in `next.config.ts`

  *Req:* NFR-05.
- [ ] **P0-04** Add Vitest (workspace config) and Playwright (`apps/web/e2e`, desktop + mobile projects, `@axe-core/playwright`). Add turbo `test` and `e2e` tasks.
- [ ] **P0-05** Add boundary linting (`eslint-plugin-boundaries` or `dependency-cruiser`) according to the dependency graph in `architecture.md` §2.
- [ ] **P0-06** Docker:
  - `infra/docker/postgres` (pgvector + Polish ispell, `init.sql` with extensions `vector`, `unaccent`, `pgcrypto`, `btree_gist`)
  - `docker-compose.yml` (db, web, optional ollama profile)
  - `.env.example`
- [ ] **P0-07** CI pipeline (GitHub Actions): install, typecheck, lint, unit tests, build, e2e against the compose services. Licence check (DEL-10).
- [ ] **P0-08** `.gitignore` `fixtures/private/**`, plus a pre-commit guard that refuses committed PDFs under `fixtures/` (DEL-12).
- [ ] **P0-09** Set `lang="pl"` in the root layout, set up the `messages/pl` scaffold and the Polish metadata, and add a skip link. Replace the scaffold home page.

### P1: Domain core (`@zpr/domain`)

- [ ] **P1-01** `money` (grosze, Decimal rates, rounding strategy as a parameter) and `dates` (PlainDate, weeks/days arithmetic, "end of the year the child turns N", Europe/Warsaw). *Deps:* P0-03.
- [ ] **P1-02** `ruleset`:
  - the `RuleSet` and `Parameter` types
  - a Zod schema per parameter key in `@zpr/contracts/params`
  - `requireParam()`, which throws `Indeterminate(Q-xx)` for unverified parameters
- [ ] **P1-03** `rules-catalog.ts`: LR-01…LR-82 with the source refs (it feeds the trace and the LR→test CI check).
- [ ] **P1-04** `CaseFacts` model + Zod (`@zpr/contracts`) per `domain-model.md` §3.
- [ ] **P1-05** `trace` + `Determination` + `Reason` code enum; the Polish message catalogue for reasons (`apps/web/messages/pl/reasons.ts`).
- [ ] **P1-06** The seed rule sets `2026.11-Z1` and `2027.01-Z1` (the latter for U art. 9 ust. 4 and art. 17 ust. 1d–1e) as TS fixtures, per `domain-model.md` §3.3. Q-29 values stay blocking until entered by the admin.

### P2: Calculators and eligibility (`@zpr/domain`)

The *Req* for P2 is FR-CALC-*, FR-INF-01/02/03/06/08. Use TDD: write the LR tests first.

- [ ] **P2-01** `coverage`: coverage on a date; the 30/90-day waiting periods with gap tolerance and day-1 exceptions; after-title rights; the debt gate; coverage on the birth date (LR-10, LR-72, LR-100…102, LR-108, LR-120…122).
- [ ] **P2-01b** `basis`: employee and non-employee basis with a per-month trace (LR-112…119). Golden tests are hand-computed from the U articles.
- [ ] **P2-02** `routing`: payer vs ZUS (LR-01), forms and recipients per title and benefit (LR-03/04/05).
- [ ] **P2-03** `sickness`: employer sick pay (33/14 days, 100% in pregnancy), sickness benefit (100% with „B”), *okres zasiłkowy* aggregation (182/270, 60-day gap, pregnancy restart), transition to maternity, rehabilitation rates (LR-11…15, LR-103…107).
- [ ] **P2-04** `maternity-equivalent` (LR-121/122; D-07: unlawful termination → maternity after the birth).
- [ ] **P2-05** `leave` for a birth:
  - maternity for multiples, with the pre-birth start and the 14-week personal rule (LR-123)
  - parental pool 41/43/65/67, with simultaneous use and the 9 reserved weeks (LR-127)
  - paternity for employees and non-employees (LR-133)
  - supplementary leave in its 3 variants (LR-126)
- [ ] **P2-06** `leave` for losses (LR-36), with the "later of" logic and the surviving-children count.
- [ ] **P2-07** `leave`: the 7 takeover cases (LR-124), hospital deferral and abandonment (LR-125).
- [ ] **P2-08** `leave` for care-taking (LR-129): age caps, the 9-week guarantee (Q-30 caveat), the foster → adoption deduction, professional foster NOT_ELIGIBLE.
- [ ] **P2-09** `leave` with work combined with parental leave (LR-128): extension, caps, days rounding; the amount reduction (LR-131).
- [ ] **P2-10** `amounts`: rate × basis per segment; 100/70 vs 81.5 with the 9-week exclusion and the year-1 fallback; the minimum floor (LR-130…132). Gross output; rounding as a parameter (Q-15).
- [ ] **P2-11** `risks` (LR-70…72, debt warning) and `protection` (LR-80…82).
- [ ] **P2-12** `validation` for scenarios: the invariants in `domain-model.md` §6.
- [ ] **P2-13** `evaluate()` façade → `EngineResult`, with a timeline and a checklist-items generator.
- [ ] **P2-14** Property tests (fast-check) for the invariants. Golden tests for the synthetic personas S-01…S-33.

### P3: Database, REST and rule configuration

- [ ] **P3-01** Drizzle schemas for `rules`, `kb`, `app`, `docs`, `sim`, `content`, `ai`, `audit` (`database-design.md`). Generate the migrations. *Deps:* P0-06, P1-02.
- [ ] **P3-02** Repositories; a rule-set loader with an effective-date lookup and an immutability trigger.
- [ ] **P3-03** Idempotent seed: the rule set, the KB source placeholders, the official links and the sim personas.
- [ ] **P3-04** `server/http` helpers: Zod parsing, problem+json, request id, rate limit.
- [ ] **P3-05** REST: `/eligibility/evaluate`, `/calculations`, `/scenarios*`, `/checklists`, `/rulesets/active`, `/content/*`, `/health`.
- [ ] **P3-06** OpenAPI generation from Zod at `/api/v1/openapi.json`, plus a contract snapshot test.
- [ ] **P3-07** Sessions (guest + simulated mObywatel + admin), `proxy.ts` gating for `/admin`, consent records.
- [ ] **P3-08** A reproducibility test for `calculation_runs` (NFR-11) and the TTL purge job.

### P4: Simulated integrations (`@zpr/integrations-sim`)

The *Req* for P4 is FR-SIM-01…07 and NFR-10.

- [ ] **P4-01** Port interfaces: `IdentityProvider`, `InsuranceRegistry`, `DebtService`, `SickLeaveRegistry`, `PueGateway`, `ApplicationGateway`, `CivilRegistry`. Each simulated adapter returns `simulated: true`.
- [ ] **P4-02** Synthetic personas and data (around 12, mirroring the demo scenarios).
- [ ] **P4-03** The simulated mObywatel flow: an authorize screen, persona choice, consent, callback, and the session.
- [ ] **P4-04** Insurance import into the profile (with source = SIMULATION) and the debt certificate PDF (watermarked).
- [ ] **P4-05** The e-ZLA list; the PUE inbox (canned replies; an optional AI draft, labelled).
- [ ] **P4-06** Leave application templates following **R322** §2–§18 field lists, and the benefit applications (ZAM per R1316 annex 6; ZAS-53). PDF rendering with a watermark; simulated sending and acknowledgement.
- [ ] **P4-07** The simulated birth-certificate copy request, with a link to the real gov.pl service.
- [ ] **P4-08** The global `SimulationBanner` + E2E assertions.

### P5: Product UI (Polish, RWD, a11y)

The *Req* for P5 is FR-CALC-00, FR-INF-*, FR-PRD-01/05/09 and NFR-01/02/06/07.

- [ ] **P5-01** Design tokens (contrast-checked), layout shell, navigation, footer with the official links, and the glossary component.
- [ ] **P5-02** The onboarding wizard `/start`: who are you, which event, dates, insurance titles (manual or import), consent.
- [ ] **P5-03** The integrated calculator `/kalkulator`: a mode selector (ciąża / urodzenie / adopcja / rodzina zastępcza), options (number of children, „Za życiem”, premature birth, loss, work fraction, 81.5%), and results with a „Dlaczego?” trace.
- [ ] **P5-04** The eligibility summary `/uprawnienia` with warnings and the INDETERMINATE presentation (Q links to "Zapytaj ZUS").
- [ ] **P5-05** The planner `/planer`: two-parent lanes, with an accessible editing alternative (forms) and live validation.
- [ ] **P5-06** The scenario comparison (100/70 vs 81.5, mother-only vs shared).
- [ ] **P5-07** Checklist and deadlines `/lista-kontrolna`; ICS export (competitive).
- [ ] **P5-08** The info hub `/przewodnik/*` with citations to the T sections; `/sytuacje-szczegolne` in sensitive mode; `/wsparcie`.
- [ ] **P5-09** `/o-projekcie`: AI disclosure, simulation disclosure, sources, external solutions (DEL-08/09).

### P6: Documents and sample cases (`@zpr/documents`)

- [x] **P6-01** Upload endpoint and storage with the validation and TTL (`architecture.md` §7.1). `POST /documents` (consent `DOCUMENT_PROCESSING`, ≤ 10 MB, MIME + `%PDF-`), `LocalFileStorage` behind a `DocumentStorage` port (bucket-ready), `docs.uploads.delete_after` = 24 h, purge on upload and `POST /documents/cleanup`.
- [x] **P6-02** Form detection (ZAM, Z-3, Z-3a, ZAS-12, ZAS-53, poświadczenie, plus the legacy ZUR/ZAO/Z-3b) from AcroForm fields → headings → text → file name (hint only). Field templates follow the data scope of R1316 annexes 2, 3 and 6. *Open:* Q-20 — exact ZUS print layouts; labels are matched tolerantly.
- [x] **P6-03** Extractors:
  - [x] AcroForm → field map (pdf.js via `unpdf`)
  - [x] template/regex for flattened PDFs
  - [x] OCR (tesseract `pol` via `pdftoppm`) — optional, `DOCUMENT_OCR_ENABLED`, only without a text layer; not exercised by CI (no scans available)
  - [x] LLM-assisted fallback through the port — `DOCUMENT_LLM_FALLBACK` + per-request consent, PII scrubbed, proposals always reviewed
- [x] **P6-04** Validators (`docs.validation_findings`): deprecated forms (LR-05, by document date and rule set), missing fields, date consistency, attachments (R1316 § 3, § 13), ambiguous amounts.
- [x] **P6-05** Confirmation UI (side-by-side preview of the PDF page and the fields) → facts → engine → checklist/deadlines → calculator (basis as override).
- [~] **P6-06** Sample-case picker from the API (synthetic SC-SYN + private manifest) with the ✓/✗ comparison badge in demo mode. *Open:* real ZUS sample cases (Q-19).
- [~] **P6-07** Golden test harness: synthetic SC-SYN-01…04 run in CI; private `SC-xx` run automatically when `fixtures/private/sample-cases/manifest.json` exists. *Open:* the private cases themselves.

### P7: Knowledge base and assistant (`@zpr/rag`, `@zpr/ai`)

- [ ] **P7-01** Provider ports + AI SDK adapters, configured by env. *Deps:* P0-03.
- [ ] **P7-02** The ingestion pipeline: parse, legal-structure chunker, tagger, embeddings, upsert. Ingest T first. *Deps:* P3-01.
- [ ] **P7-03** Hybrid retrieval (FTS polish + HNSW + RRF + temporal filter) with integration tests.
- [ ] **P7-04** The assistant route: streaming, tools (`rag-architecture.md` §5), and the system prompt.
- [ ] **P7-05** Guards: numeric grounding, citation, eligibility language, scope, and the PII scrubber.
- [ ] **P7-06** The chat UI with citation chips, a source side panel, and tool-result cards.
- [ ] **P7-07** The eval set (about 60 items) and a CI gate.
- [ ] **P7-08** Ingest **U, KP, R1316, R322, P** (available now in `fixtures/private/sources/`) with the legal-structure chunker. Link each rule parameter to its source chunk (`rules.rule_parameter_sources`). Visibility depends on Q-19.

### P8: Admin UI

- [ ] **P8-01** Rule sets: list, clone to a draft, edit parameters with per-key forms (Zod-driven), source links, diff, publish or retire, audit. *Req:* FR-ADM-01.
- [ ] **P8-02** KB sources: upload a version, set effective dates, ingest, view reports, disable chunks, re-embed. *Req:* FR-PRD-08.
- [ ] **P8-03** Content: support organisations (with `verified_at`, charitable-only), links, info pages, checklist templates, feature flags. *Req:* FR-ADM-02.

### P9: Hardening

- [ ] **P9-01** An a11y pass (axe 0 serious; keyboard; NVDA), a RWD pass at 360–1440 px.
- [ ] **P9-02** Security: CSP, rate limits, upload fuzzing, dependency audit, licence audit.
- [ ] **P9-03** Performance budget (calculator p95 < 300 ms, LCP < 2.5 s on mobile 4G).
- [ ] **P9-04** Deploy the public demo, smoke-test the E2E against production, and set up the private sample-case mount.

### P10: Competition deliverables

- [ ] **P10-01** Project description and title (PL), including the AI usage scope and the external solutions (DEL-01/08/09).
- [ ] **P10-02** Slides ≤ 10 (DEL-02).
- [ ] **P10-03** Video ≤ 3:00 per the storyboard; uploaded to an open host; linked in the app (DEL-03).
- [ ] **P10-04** Automated screenshots (Playwright, desktop + mobile) (DEL-05).
- [ ] **P10-05** Final repo check: no private fixtures, README runbook, licence file, docs up to date (DEL-04/10/12).

## 4. Definition of done (per task)

- Typecheck, lint and tests are green, and boundaries are respected.
- The Polish copy is in `messages/pl`, and no English text is visible.
- The page is keyboard-navigable and axe reports no serious issues.
- The traceability matrix row has its status updated.
- Every new legal parameter or behaviour has an `LR-xx` or `Q-xx` reference and a test.
