# Requirements Traceability Matrix

Status: v0.2 · 2026-11-21. Blockers were re-evaluated after the ZUS sources arrived (U, KP, R1316, R322, P).

Column meanings:

- **Pri**: M = mandatory, R = recommended, C = competitive.
- **Module** refers to the packages and routes in `architecture.md`.
- **Phase** refers to `implementation-roadmap.md`.
- **Status**: ⬜ not started · 🟨 in progress · ✅ done · ⛔ blocked (open question).

## 1. Functional

| Req        | Pri               | Source                        | Module / Package                                                             | UI route                                        | API                                              | Tests                                                                  | Phase  | Blocked by                                      | Status |
| ---------- | ----------------- | ----------------------------- | ---------------------------------------------------------------------------- | ----------------------------------------------- | ------------------------------------------------ | ---------------------------------------------------------------------- | ------ | ----------------------------------------------- | ------ |
| FR-INF-01  | M                 | T p.12 a), p.2–4              | `domain/sickness`, `domain/maternity-equivalent`, `domain/coverage`; content | `/przewodnik/ciaza`, `/uprawnienia`             | `POST /eligibility/evaluate`                     | unit LR-10…20; e2e S-01…06                                             | P2, P5 | — (Q-09, Q-18 resolved)                         | ⬜     |
| FR-INF-02  | M                 | T p.13 g), p.1 fn.1, p.3, p.6 | `domain/routing`, `content.checklist_templates`                              | `/lista-kontrolna`                              | `GET /checklists`                                | unit LR-01/03/04, LR-109…111, LR-134/135; e2e S-02                     | P2, P5 | — (Q-28 resolved; Q-33 minor)                   | ⬜     |
| FR-INF-03  | M                 | T p.13 h), p.9–10             | `domain/risks`                                                               | `/uprawnienia` (warnings), `/przewodnik/ryzyka` | in `EngineResult.warnings`                       | unit LR-70…72, LR-108; e2e S-07, S-18                                  | P2, P5 | Q-29 (debt threshold value)                     | ⬜     |
| FR-INF-04  | M                 | T p.13 i), p.14               | `content.support_organizations`                                              | `/wsparcie`                                     | `GET /content/support-organizations`             | e2e S-20                                                               | P5     | Q-23 (list content)                             | ⬜     |
| FR-INF-05  | M                 | T p.14                        | `content.external_links`                                                     | footer, `/wsparcie`                             | `GET /content/links`                             | e2e link check                                                         | P5     | —                                               | ⬜     |
| FR-INF-06  | M                 | T p.10 §I                     | `domain/protection`, content                                                 | `/przewodnik/ochrona`                           | in `EngineResult`                                | unit LR-80…82; e2e S-05                                                | P2, P5 | —                                               | ⬜     |
| FR-INF-07  | M                 | T p.1, p.12                   | content, `documents` (form codes)                                            | `/przewodnik/dokumenty`                         | —                                                | unit LR-05                                                             | P5     | —                                               | ⬜     |
| FR-INF-08  | M                 | T p.2, p.6–7, p.11            | `domain/leave` (loss, takeover) + sensitive-mode UI                          | `/sytuacje-szczegolne`                          | `/calculations`                                  | unit LR-36, LR-124…126, LR-136; e2e S-14, S-17, S-20…23                | P2, P5 | — (Q-11 resolved; Q-31 edge)                    | ⬜     |
| FR-CALC-00 | R                 | T p.13                        | UI composition                                                               | `/kalkulator`                                   | `POST /calculations`                             | e2e all S-1x                                                           | P5     | —                                               | ⬜     |
| FR-CALC-01 | M                 | T p.13 b)                     | `domain/leave`, `domain/amounts`                                             | `/kalkulator`                                   | `POST /calculations`                             | unit LR-123…127, LR-130; golden                                        | P2     | Q-15 (rounding), Q-29 (min/max values)          | ⬜     |
| FR-CALC-02 | M                 | T p.13 c), p.9 §E             | `domain/leave` (work fraction)                                               | `/kalkulator`, `/planer`                        | `POST /calculations`                             | unit LR-128, LR-131; e2e S-12                                          | P2     | — (Q-08 resolved)                               | ⬜     |
| FR-CALC-03 | M                 | T p.13 d), p.7                | `domain/leave`, `domain/validation`                                          | `/planer`                                       | `POST /scenarios/{id}/validate`, `/calculations` | unit LR-124, LR-127, LR-130, LR-133; property tests; e2e S-12/13/18/19 | P2, P5 | — (Q-07, Q-10, Q-21, Q-27 resolved)             | ⬜     |
| FR-CALC-04 | M                 | T p.13 e), p.8–9              | `domain/leave` (care-taking)                                                 | `/kalkulator?tryb=adopcja`                      | `POST /calculations`                             | unit LR-129; e2e S-30…34                                               | P2     | Q-30 (edge near the age cap)                    | ⬜     |
| FR-CALC-05 | M                 | T p.13 f)                     | `domain/amounts` + `documents`                                               | `/dokumenty` → `/kalkulator`                    | `/sample-cases/{id}/load`, `/calculations`       | unit LR-112…119; golden SC-xx                                          | P2, P6 | Q-15, Q-20, **sample cases missing**            | ⛔     |
| FR-CALC-06 | M                 | T p.13 j)                     | same as FR-CALC-04                                                           | same                                            | same                                             | same                                                                   | P2     | — (Q-17 resolved: professional foster excluded) | ⬜     |
| FR-CALC-07 | M                 | T p.12 a), p.3–4              | `domain/sickness`, `domain/maternity-equivalent`                             | `/kalkulator?tryb=ciaza`                        | `POST /calculations`                             | unit LR-100…107, LR-121                                                | P2     | Q-15, Q-29                                      | ⬜     |
| FR-CALC-08 | M                 | T p.9 §G                      | `domain/amounts`                                                             | `/kalkulator` (comparison)                      | `POST /scenarios/compare`                        | unit LR-130; e2e S-11                                                  | P2, P5 | Q-34 (copy only)                                | ⬜     |
| FR-CALC-09 | M                 | T p.1–2, p.12                 | `domain/trace`, UI „Dlaczego?”                                               | all results                                     | `GET /calculations/{id}`                         | contract snapshot                                                      | P2, P5 | —                                               | ⬜     |
| FR-SIM-01  | M                 | T p.13                        | `integrations-sim/mobywatel`, `server/auth`                                  | `/(sim)/mobywatel`                              | `/sim/mobywatel/*`                               | e2e S-40                                                               | P4     | —                                               | ⬜     |
| FR-SIM-02  | M                 | T p.13                        | `integrations-sim/zus-insurance`                                             | `/konto-zus`, `/start`                          | `GET /sim/zus/insurance`                         | e2e S-40                                                               | P4     | —                                               | ⬜     |
| FR-SIM-03  | M                 | T p.13                        | `integrations-sim/zus-debt`                                                  | `/konto-zus`                                    | `POST /sim/zus/debt-certificates`                | e2e S-04                                                               | P4     | Q-29 (threshold value)                          | ⬜     |
| FR-SIM-04  | M                 | T p.13                        | `integrations-sim/ezla`                                                      | `/konto-zus`                                    | `GET /sim/zus/ezla`                              | e2e S-40                                                               | P4     | —                                               | ⬜     |
| FR-SIM-05  | M                 | T p.13                        | `integrations-sim/pue`                                                       | `/konto-zus`                                    | `/sim/pue/*`                                     | e2e S-40                                                               | P4     | —                                               | ⬜     |
| FR-SIM-06  | M                 | T p.13                        | `integrations-sim/applications`, PDF render                                  | `/wnioski`                                      | `/sim/applications`                              | e2e S-40                                                               | P4     | — (Q-22 resolved: R322)                         | ⬜     |
| FR-SIM-07  | M                 | T p.14                        | `integrations-sim/civil-registry`                                            | `/wnioski/akt-urodzenia`                        | `/sim/civil-registry/*`                          | e2e S-40                                                               | P4     | —                                               | ⬜     |
| FR-ADM-01  | M                 | T p.14                        | `db rules.*`, admin UI                                                       | `/admin/reguly`                                 | `/admin/rulesets/*`                              | integration + e2e S-60                                                 | P3, P8 | —                                               | 🟨     |
| FR-ADM-02  | M                 | T p.14                        | admin for KB, content, flags                                                 | `/admin/*`                                      | `/admin/*`                                       | e2e                                                                    | P8     | —                                               | ⬜     |
| FR-DEMO-01 | M                 | T p.14                        | `documents`, `docs.sample_cases`                                             | `/dokumenty`                                    | `/sample-cases/*`                                | e2e S-00                                                               | P6     | Q-19, Q-20                                      | ⛔     |
| FR-DEMO-02 | M                 | T p.15 §6                     | `documents` upload                                                           | `/dokumenty`                                    | `POST /documents`                                | e2e S-00                                                               | P6     | Q-20                                            | ⬜     |
| FR-DEMO-03 | M                 | T p.11, p.15                  | golden test harness                                                          | —                                               | —                                                | golden SC-xx                                                           | P2, P6 | sample cases                                    | ⛔     |
| FR-PRD-01  | C/M               | §3                            | `app.households…`, wizard                                                    | `/start`                                        | `/scenarios`                                     | e2e                                                                    | P5     | —                                               | ⬜     |
| FR-PRD-05  | C                 | T p.11                        | planner UI                                                                   | `/planer`                                       | `/scenarios/*`                                   | e2e S-12/13                                                            | P5     | —                                               | ⬜     |
| FR-PRD-07  | C                 | T §9                          | `ai`, `rag`                                                                  | `/asystent`                                     | `/assistant/chat`                                | RAG evals; e2e S-50…55                                                 | P7     | KB sources                                      | ⬜     |
| FR-PRD-08  | C/M               | T p.14                        | `rag` ingestion, admin                                                       | `/admin/wiedza`                                 | `/admin/kb/*`                                    | integration                                                            | P7, P8 | —                                               | ⬜     |
| FR-PRD-09  | M (via FR-INF-02) | T p.13 g)                     | checklists, ICS export                                                       | `/lista-kontrolna`                              | `/checklists`                                    | e2e                                                                    | P5     | —                                               | ⬜     |

## 2. Non-functional

| Req                         | Verification                                                                                                            | Phase  | Status |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------- | ------ | ------ |
| NFR-01/02 RWD               | Playwright projects: desktop 1440, tablet 768, mobile 375/360; visual review; no horizontal scroll                      | P5, P9 | ⬜     |
| NFR-03 Production potential | Docker image, migrations, env config, health endpoint, README runbook                                                   | P0, P9 | ⬜     |
| NFR-04 REST                 | OpenAPI document generated; contract tests                                                                              | P3     | ⬜     |
| NFR-05 Code structure       | Boundaries lint, typecheck strict, CI green, ADRs in docs                                                               | P0+    | ⬜     |
| NFR-06 Polish UI            | Lint rule: no string literals in JSX outside `messages/pl` (custom ESLint rule or review)                               | P5     | ⬜     |
| NFR-07 WCAG 2.2 AA          | axe in E2E (0 serious/critical), keyboard pass, NVDA pass, contrast tokens                                              | P5, P9 | ⬜     |
| NFR-08 Deterministic rules  | Domain package has no I/O; AI guard tests; numeric grounding = 0                                                        | P2, P7 | ⬜     |
| NFR-09 Privacy              | Consent screens, encryption tests, TTL purge test, PII scrubber tests                                                   | P3, P7 | ⬜     |
| NFR-10 Simulation honesty   | E2E asserts the banner + watermark on all `/konto-zus`, `/wnioski`, `/(sim)` pages; DTO `simulated: true` contract test | P4     | ⬜     |
| NFR-11 Reproducibility      | Test: re-run `calculation_runs.input_snapshot` with the pinned rule set → identical result                              | P3     | ⬜     |

## 3. Delivery

| Req       | Artefact                                                                           | Owner  | Phase   | Status  |
| --------- | ---------------------------------------------------------------------------------- | ------ | ------- | ------- |
| DEL-01    | `docs/project-description.md` (PL) + title                                         | PM     | P10     | ⬜      |
| DEL-02    | Slides ≤ 10                                                                        | PM     | P10     | ⬜      |
| DEL-03    | Video ≤ 3:00, public link (storyboard in `demo-scenarios.md` §9)                   | PM     | P10     | ⬜      |
| DEL-04    | Repository (public or accessible) without `fixtures/private`                       | Eng    | P10     | ⬜      |
| DEL-05    | Screenshots (desktop + mobile) via a Playwright script                             | Eng    | P10     | ⬜      |
| DEL-06    | Public demo URL with the sample-case picker                                        | Eng    | P9      | ⛔ Q-19 |
| DEL-07    | Graphics (logo, diagrams) — our own or properly licensed                           | Design | P10     | ⬜      |
| DEL-08    | AI disclosure page `/o-projekcie` + a section in the description                   | Eng/PM | P7, P10 | ⬜      |
| DEL-09    | External solutions list (libraries, models, services) in the slides                | Eng    | P10     | ⬜      |
| DEL-10/11 | Licence audit (`pnpm licenses list`), only permissive licences; no copied ZUS docs | Eng    | P9      | ⬜      |
| DEL-12    | Sample-case confidentiality: `.gitignore`, private storage, no public URLs         | Eng    | P0, P6  | ⬜      |

## 4. Legal rules → tests

Every `LR-xx` in `requirements.md` §6, including LR-100…136, must map to at least one Vitest case named `LR-xx: <behaviour>`. CI fails if an LR id has no test. The check is a script that greps the test names against the LR list in `packages/domain/src/rules-catalog.ts`.

## 4. Calculation engine coverage (v0.3)

Engine = `@zpr/domain/engine`, endpoints `POST /eligibility/evaluate`, `/benefits/calculate`, `/scenarios/compare`, `/timeline`, `/documents/required`. ✅ = implemented and tested in the engine and its API/assistant adapters; the UI still uses the simplified calculator and planner (both now adapters over the engine).

| Requirement | Engine status | Notes |
|-------------|---------------|-------|
| FR-INF-01, FR-CALC-07 | ✅ | sickness in pregnancy, employer sick pay, rehabilitation (rates only, `U-05`), maternity-equivalent |
| FR-INF-02 | ✅ | `documents.ts`: documents, forms by rule set version, payer routing, due dates |
| FR-INF-03 | ✅ | `warnings` (LR-70…72, LR-108, D-07), `RISK` severity |
| FR-INF-06 | ✅ | KP art. 177 fixed-term extension and protection scope; non-employees |
| FR-INF-08 | ✅ | stillbirth, child death, premature birth, takeover cases; `U-03` (other family members) not supported |
| FR-CALC-01 | ✅ | durations and amounts; Q-29 values lower/upper bound |
| FR-CALC-02 | ✅ | KP art. 182¹e–f extension, U art. 31 ust. 4a |
| FR-CALC-03 | ✅ | two-parent allocation, reserved nine weeks, pool, parts; `U-10` |
| FR-CALC-04, FR-CALC-06 | ✅ | age caps, court application, professional foster excluded, Q-30 → manual review |
| FR-CALC-05 | 🟨 | basis methods (U art. 36–38, 48a, 50) done; **ZUS sample cases not available** |
| FR-CALC-08 | ✅ | exact 81.5% conditions, deadline, 9 reserved weeks at 70%, first-year fallback |
| FR-CALC-09 | ✅ | rule set version, sources, assumptions, missing evidence on every result |
| FR-ADM-01 | 🟨 | rule sets are versioned data and published by `GET /rulesets`; admin editing UI not part of the engine |
| NFR-08, NFR-11 | ✅ | no LLM in the engine; `inputHash` + rule set version reproduce a result |
