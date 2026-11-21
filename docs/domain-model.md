# Domain Model

Status: v0.2 · 2026-11-21 (parameters sourced from U, KP, R1316, R322, P)

## 1. Ubiquitous language (PL ↔ code)

| Polish term | Code identifier | Meaning |
|-------------|-----------------|---------|
| ubezpieczony / ubezpieczona | `InsuredPerson` | The person covered by sickness insurance |
| płatnik składek | `ContributionPayer` | The employer or contracting entity that reports the person to insurance |
| świadczeniobiorca | `Beneficiary` | The person who receives the benefit |
| tytuł ubezpieczenia | `InsuranceTitle` | The legal basis of coverage: `EMPLOYMENT` (umowa o pracę), `MANDATE` (umowa zlecenia), `SELF_EMPLOYMENT` (pozarolnicza działalność), `OTHER` |
| ubezpieczenie chorobowe obowiązkowe / dobrowolne | `SicknessCoverage.mode = COMPULSORY \| VOLUNTARY` | LR-10 |
| okres wyczekiwania | `WaitingPeriod` | 30 or 90 days (LR-10) |
| podstawa wymiaru zasiłku | `BenefitBasis` | The amount the percentage rates apply to (LR-112…119) |
| zasiłek chorobowy | `SICKNESS_BENEFIT` | |
| zasiłek w wysokości zasiłku macierzyńskiego | `MATERNITY_EQUIVALENT_BENEFIT` | LR-20 |
| świadczenie rehabilitacyjne | `REHABILITATION_BENEFIT` | Information only (A-10) |
| zasiłek macierzyński | `MATERNITY_BENEFIT` | Paid for a `LeavePeriod` |
| urlop macierzyński | `LeaveKind.MATERNITY` | |
| uzupełniający urlop macierzyński | `LeaveKind.SUPPLEMENTARY_MATERNITY` | |
| urlop na warunkach urlopu macierzyńskiego | `LeaveKind.MATERNITY_TERMS` | Adoption or foster care |
| urlop rodzicielski | `LeaveKind.PARENTAL` | |
| urlop ojcowski | `LeaveKind.PATERNITY` | |
| wynagrodzenie chorobowe | `EMPLOYER_SICK_PAY` | The first 33 or 14 days, paid by the employer (LR-11) |
| e-ZLA, kod „B” | `SickLeaveCertificate { code: 'B' }` | |
| zaświadczenie „Za życiem” | `ChildFlag.ZA_ZYCIEM` | |
| rodzina zastępcza niezawodowa | `CareArrangement.FOSTER_NON_PROFESSIONAL` | |
| przysposobienie (wniosek do sądu) | `CareArrangement.ADOPTION_PENDING` / `ADOPTION_FINAL` | |
| zadłużenie składkowe | `ContributionDebt` | Simulated (FR-SIM-03) |
| wniosek ZAM / ZAS-53 / Z-3 / Z-3a / ZAS-12 | `FormCode` | LR-03…05 |

## 2. Bounded contexts (modules)

```
┌────────────────────┐   facts   ┌──────────────────────┐  params  ┌────────────────────┐
│ Profile & Household│──────────▶│ Rules Engine (pure)  │◀─────────│ Rule Configuration │
│  (user data)       │           │ eligibility, leave,  │          │ (versioned rule    │
└─────────┬──────────┘           │ amounts, routing     │          │  sets, admin)      │
          │ imports              └──────────┬───────────┘          └────────────────────┘
┌─────────▼──────────┐                      │ Determination + Trace
│ Simulated Gov      │           ┌──────────▼───────────┐          ┌────────────────────┐
│ Integrations       │           │ Planner & Guidance   │─────────▶│ Checklists /        │
│ (mObywatel, ZUS,   │           │ (scenarios, timeline)│          │ Timelines           │
│  e-ZLA, PUE, USC)  │           └──────────┬───────────┘          └────────────────────┘
└─────────▲──────────┘                      │ tools (read-only)
┌─────────┴──────────┐           ┌──────────▼───────────┐          ┌────────────────────┐
│ Documents          │           │ Assistant (LLM)      │◀─────────│ Knowledge Base     │
│ (upload, extract,  │           │ explains, asks,      │  RAG     │ (sources, chunks,  │
│  validate)         │           │ calls tools          │          │  embeddings)       │
└────────────────────┘           └──────────────────────┘          └────────────────────┘
```

Rules for context boundaries:

- The **Rules Engine** is a pure TypeScript package: no I/O, no clock, no randomness. It receives `CaseFacts` and a `RuleSet` and returns a `Determination`.
- The **Knowledge Base** never stores personal data. **Profile** never stores legal text.
- The **Assistant** cannot write to Profile or Rules. It reads through tools, and proposes profile changes that the user must confirm in the UI.

## 3. Core aggregates

### 3.1 Household (Profile context)

```ts
Household {
  id
  parents: Parent[]                 // 1..2, roles MOTHER | FATHER | CAREGIVER
  familyEvent: FamilyEvent          // what we plan for
  consent: ConsentRecord[]          // RODO consents (health data!)
}

Parent {
  id, role, birthDate?              // birthDate is only needed for LR-11 (age 50+)
  insuranceTitles: InsuranceTitle[]
  debt?: ContributionDebt           // from the simulation
  sickLeaves: SickLeaveCertificate[]
}

InsuranceTitle {
  kind: EMPLOYMENT | MANDATE | SELF_EMPLOYMENT | OTHER
  payer?: ContributionPayer         // null for SELF_EMPLOYMENT (the person is their own payer)
  sicknessCoverage: { mode: COMPULSORY | VOLUNTARY, periods: DateRange[] }
  workingTimeFraction?: Decimal     // 1.0 = full time (for LR-55)
  endDate?: Date                    // a planned or actual end
  endReason?: BANKRUPTCY | LIQUIDATION | EMPLOYER_DEATH | UNLAWFUL_TERMINATION_FINAL_JUDGMENT | OTHER
  basisInputs: BasisInput[]         // monthly amounts from the user, the simulation or a Z-3/Z-3a (LR-112…118)
}

ContributionPayer { id, name, insuredCountOn30Nov?: number, firstReportMonth? }   // LR-01

FamilyEvent =
  | Pregnancy { expectedDueDate, plannedMaternityStart? }
  | Birth { date, children: Child[], premature?: boolean, hospitalisation?: DateRange[] }
  | CareTaking { date, arrangement: FOSTER_NON_PROFESSIONAL | ADOPTION_PENDING,
                 adoptionFinalDate?, children: Child[] }

Child {
  birthDate?, stillborn: boolean, deathDate?, flags: ZA_ZYCIEM?,
  schoolDeferred?: boolean          // for LR-51, the 10-year limit
}
```

### 3.2 Scenario (Planner context)

A user can hold several **scenarios** (e.g. "Mama 100/70" vs "81,5% + tata 9 tyg.").

```ts
Scenario {
  id, householdId, name
  paymentOption: STANDARD_100_70 | FLAT_81_5          // LR-60…62
  option81_5ApplicationDate?: Date                    // ≤ birth + 21 days
  segments: LeaveSegment[]
  ruleSetVersion: string                              // pinned when calculated, e.g. "2026.11-Z1"
}

LeaveSegment {
  parentId, kind: LeaveKind
  start: Date, end: Date
  partIndex?: number                                  // parental ≤ 5 parts (LR-35, LR-43)
  workFraction?: Decimal                              // ≤ 0.5, PARENTAL + EMPLOYEE only (LR-55)
  takeoverReason?: MOTHER_RESIGNED_AFTER_14W | MOTHER_INCAPABLE_AFTER_8W | MOTHER_HOSPITALISED_AFTER_8W
                 | MOTHER_DIED | CHILD_ABANDONED_AFTER_8W | UNINSURED_MOTHER_DIED_ABANDONED_INCAPABLE
                 | UNINSURED_MOTHER_EMPLOYED_HALF_TIME          // LR-124
}
```

### 3.3 RuleSet (Rule Configuration context)

```ts
RuleSet {
  id, version: "2026.11-1"           // semver-like, immutable once published
  status: DRAFT | PUBLISHED | RETIRED
  effectiveFrom: Date, effectiveTo?: Date
  parameters: Record<ParamKey, Parameter>
  publishedBy, publishedAt
}

Parameter {
  key: ParamKey                     // e.g. "maternity.weeks.byChildren"
  value: JsonValue                  // typed by a Zod schema per key
  verification: VERIFIED_T | VERIFIED_ZUS | UNVERIFIED
  sourceRefs: SourceRef[]           // e.g. { sourceId: "T", page: 9, quote: "…70% podstawy…" }
  openQuestion?: "Q-30"
}
```

**Invariant:** a `PUBLISHED` rule set may contain `UNVERIFIED` parameters only if they are marked `blocking: true`. When the engine needs such a parameter, it returns `INDETERMINATE` instead of using the value.

#### Initial parameter catalogue (seed rule set `2026.11-Z1`)

Status key: **T** = VERIFIED-T · **Z** = VERIFIED-ZUS (U, KP, R1316, R322, P) · **U** = UNVERIFIED and blocking.

**Coverage and payer**

| Key | Value | Status | Source |
|-----|-------|--------|--------|
| `payer.selfPayThreshold` | `> 20` insured on 30.11 of the previous year | Z | U art. 61 ust. 1–2 (LR-01, LR-109) |
| `payer.alwaysZus` | `SELF_EMPLOYMENT`, cooperating persons, clergy, after the title ends, foreign employer | Z | U art. 61 ust. 1 pkt 2 |
| `sickness.waitingDays` | compulsory 30 (uninterrupted); voluntary 90 | Z | U art. 4 ust. 1 |
| `sickness.waitingGapToleranceDays` | 30 (plus parental, unpaid and military leave) | Z | U art. 4 ust. 2 |
| `sickness.dayOneExceptions` | graduate ≤ 90 days, commuting accident, ≥ 10 years compulsory, MPs and senators, customs officers | Z | U art. 4 ust. 3 |

**Sickness, employer sick pay and rehabilitation**

| Key | Value | Status | Source |
|-----|-------|--------|--------|
| `sickness.employerPaidDays` | 33; 14 from the year after turning 50 | Z | KP art. 92 §1, §5 |
| `sickness.employerSickPayRate` | 0.80; **1.00 in pregnancy** | Z | KP art. 92 §1 |
| `sickness.rate` | 0.80; **1.00 in pregnancy (code B)** | Z | U art. 11 |
| `sickness.maxPeriodDays` | 182; **270 in pregnancy** | Z | U art. 8 ust. 1 |
| `sickness.aggregationGapDays` | 60 (no aggregation across a gap into pregnancy) | Z | U art. 9 ust. 2 |
| `sickness.afterTitle` | onset ≤ 14 days, ≥ 30 days of incapacity, max 91 days (not in pregnancy) | Z | U art. 7, 8 ust. 2 |
| `sickness.singlePeriodAcrossTitles` | false in `2026.11`; **true in `2027.01`** | Z | U art. 9 ust. 4 (from 2027-01-01) |
| `rehab.rates` | 0.90 for 3 months, then 0.75; 1.00 in pregnancy; max 12 months | Z | U art. 18–19 |
| `rehab.indexation` | quarterly index values | **U** (Q-29) | U art. 19 ust. 2–3 |

**Debt**

| Key | Value | Status | Source |
|-----|-------|--------|--------|
| `debt.thresholdShareOfMinWage` | 0.01 | Z | U art. 2a ust. 1 |
| `debt.expiryMonths` / `debt.payAfterRepaymentDays` | 6 / 60 | Z | U art. 2a ust. 2, 64 ust. 3 |
| `debt.appliesTo` | `SELF_EMPLOYMENT`, cooperating persons, clergy, seafarers | Z | U art. 2a ust. 1 |

**Benefit basis**

| Key | Value | Status | Source |
|-----|-------|--------|--------|
| `basis.referenceMonths` | 12 | Z | U art. 36, 48 |
| `basis.contributionDeduction` | 0.1371 | Z | U art. 3 pkt 4, 45; P p.24 |
| `basis.minHalfMonthRule` | exclude months < ½ of time worked; fill in months ≥ ½ | Z | U art. 38 ust. 2–3, 50 |
| `basis.noRecalcGapMonths` | 1 | Z | U art. 43 |
| `basis.dailyDivisor` | 30 | Z | U art. 36 ust. 3, 11 ust. 5 |
| `basis.minFullTime` | minimum wage × (1 − 0.1371) | Z (formula) / **U** (value, Q-29) | U art. 45 |
| `ext.minimumWage` | amount per year | **U** (Q-29) | — |
| `ext.parentalBenefitAmount` (*świadczenie rodzicielskie*) | amount | **U** (Q-29) | — |
| `ext.averageWage` | per quarter | **U** (Q-29) | — |

**Maternity, supplementary and parental leave**

| Key | Value | Status | Source |
|-----|-------|--------|--------|
| `maternity.weeks.byChildren` | `{1:20, 2:31, 3:33, 4:35, 5:37}` (5 = 5+) | Z | KP art. 180 §1 |
| `maternity.maxPreBirthWeeks` | 6 | Z | KP art. 180 §2 |
| `maternity.motherPersonalWeeks` | 14 (8 in the incapacity, hospital and abandonment cases) | Z | KP art. 180 §4–13 |
| `maternity.loss` | stillbirth or death < 8 weeks → 8 weeks after birth, ≥ 7 days after death; death ≥ 8 weeks → 7 days | Z | KP art. 180¹ |
| `maternity.abandonmentMinWeeks` | 8 | Z | KP art. 182 |
| `supplementary.rules` | variants (a), (b), (c) of LR-126; round up; multiples: lowest weight and longest stay | Z | KP art. 180² |
| `parental.pool.weeks` | `{single:41, multiple:43, zaZyciemSingle:65, zaZyciemMultiple:67}` | Z | KP art. 182¹a |
| `parental.nonTransferableWeeksPerParent` | 9 | Z | KP art. 182¹a §4 |
| `parental.maxParts` / `deadline` | 5 / end of the year the child turns 6 | Z | KP art. 182¹c |
| `parental.work` | maxFraction 0.5; caps `{single:82, multiple:86, zaZyciemSingle:130, zaZyciemMultiple:134}` weeks; extension = weeks × fraction; part days dropped | Z | KP art. 182¹e–f |

**Paternity, adoption and foster care**

| Key | Value | Status | Source |
|-----|-------|--------|--------|
| `paternity.days` / `maxParts` / `minPartDays` | 14 / 2 / 7 | Z | KP art. 182³ |
| `paternity.deadline` | 12 months of age; adoption: 12 months after the adoption is final, child ≤ 14 | Z | KP art. 182³ §1 |
| `paternity.nonEmployeeEligible` | true | Z | R1316 §33 |
| `maternityTerms.weeks.byChildren` | `{1:20, 2:31, 3:33, 4:35, 5:37}` | Z | KP art. 183 §1, §1¹ |
| `maternityTerms.ageCap` | foster 7 (10 if schooling deferred); adoption 14 | Z | KP art. 183; U art. 29 ust. 1 |
| `maternityTerms.minimumGuarantee` | 9 weeks; parental 38 (62 with *„Za życiem”*) | Z, with **Q-30 caveat** | KP art. 183 §3, §4 pkt 3, §4²–4⁵ |
| `foster.professionalEligible` | false | Z | KP art. 183 §1; U art. 29 ust. 1 pkt 3 |

**Rates and money**

| Key | Value | Status | Source |
|-----|-------|--------|--------|
| `rates.maternity` / `maternityTerms` / `supplementary` / `paternity` / `preBirth` | 1.00 | Z | U art. 31 ust. 1; P p.33 |
| `rates.parental` | 0.70 | Z | U art. 31 ust. 2 |
| `rates.flat81_5` | 0.815; deadline 21 days; excludes the other parent's 9 weeks (0.70) | Z | U art. 30a, 31 ust. 3, 3f |
| `rates.flat81_5.noParentalInYear1` | parental → 0.70; maternity top-up to 1.00 on request | Z | U art. 31 ust. 3g, 4 |
| `rates.workCombinationReduction` | amount × (1 − workFraction) | Z | U art. 31 ust. 4a |
| `maternityEquivalent.rate` / `eligibleEndReasons` | 1.00 / `EMPLOYER_DEATH`, `BANKRUPTCY`, `LIQUIDATION` (employees) | Z | U art. 30 ust. 3 |
| `maternity.afterInsuranceEnd.reasons` | `EMPLOYER_DEATH`, `BANKRUPTCY`, `LIQUIDATION`, `UNLAWFUL_TERMINATION_FINAL_JUDGMENT`, `FIXED_TERM_EXTENDED_TO_BIRTH` | Z | U art. 30 ust. 1, 4 |
| `money.rounding` | rounding of basis, daily amount and total | **U** (Q-15) | — |
| `money.output` | GROSS (before the PIT advance) | Z (P p.24 says PIT is deducted; we show gross) | A-03 |

**Deadlines, forms and other**

| Key | Value | Status | Source |
|-----|-------|--------|--------|
| `claims.expiryMonths` | 6 (3 years if the payer or ZUS erred) | Z | U art. 67 |
| `notice.days` | parental 21, work 21, supplementary 21 before the end, takeover 14, resignation 7, paternity 7, maternity-terms within 7 / start ≤ 21, pre-birth maternity 14 | Z | KP; P p.27 |
| `forms.mergedIntoZAM` | ZUR, ZAO since 2026-10-24; Z-3b abolished | T | LR-05 |
| `funeral.stillbirthAmount` | 7000 zł | Z | P p.34 |

## 4. Engine contract

```ts
evaluate(facts: CaseFacts, ruleSet: RuleSet, asOf: Date): EngineResult

EngineResult {
  ruleSetVersion: string
  inputHash: string                 // sha256 of the canonical facts, for reproducibility (NFR-11)
  determinations: Determination[]   // one per (person × benefit × title)
  timeline: TimelineItem[]          // ordered periods, deadlines, actions
  warnings: Warning[]               // LR-70…72, debt, "co do zasady" caveats
  routing: Routing[]                // where to file, which form (LR-01, LR-03, LR-04)
}

Determination {
  benefit: BenefitKind
  personId, titleId?
  status: ELIGIBLE | NOT_ELIGIBLE | NEEDS_INPUT | INDETERMINATE
  period?: { start, end, weeks, days }
  amount?: { basis: Money, rate: Decimal, monthly?: Money, total?: Money, verified: boolean }
  reasons: Reason[]                 // { code: "WAITING_PERIOD_NOT_MET", params, ruleId: "LR-10" }
  missingFacts?: FactKey[]
  openQuestions?: QuestionId[]
  trace: TraceStep[]                // the ordered rule evaluations, for the „Dlaczego?” UI
}
```

`Reason.code` is a stable enum. The UI and the assistant render the Polish text from a message catalogue (`messages/pl/reasons.ts`). Polish strings are never built inside the engine.

## 5. Engine sub-modules

| Module | Responsibility | Key rules |
|--------|----------------|-----------|
| `coverage` | Is the person covered on date X? Waiting periods, with gap tolerance and day-1 exceptions. Coverage on the birth date. After-title rights. Debt gate (art. 2a). | LR-10, LR-72, LR-100…102, LR-108, LR-120…122 |
| `routing` | Who pays (płatnik or ZUS, including always-ZUS cases), which forms and attachments go where (R1316 lists by case), notice periods and claim expiry | LR-01, LR-03…05, LR-109…111, LR-134…135 |
| `sickness` | Employer sick pay (33/14 days, 100% in pregnancy), sickness benefit (100% with „B”), *okres zasiłkowy* aggregation (182/270, 60-day gap, pregnancy reset), rehabilitation rates | LR-11…15, LR-103…107 |
| `maternityEquivalent` | Pre-birth benefit for employees after the employer's death, bankruptcy or liquidation; maternity benefit after insurance ended in pregnancy (incl. unlawful termination, D-07) | LR-121, LR-122 |
| `leave` | Leave duration calculus: maternity (multiples), supplementary (3 variants), parental pool (41/43/65/67), paternity, maternity-terms (age caps, Q-30 guarantee), loss scenarios, the 7 takeover cases, parts, work extension (82/86/130/134 caps) | LR-32…55, LR-123…129, LR-133 |
| `basis` | Benefit basis: employee (12 months, ½-month rule, 13.71%, minimum basis, bonuses at 1/12, no recomputation if the gap is < 1 month) and non-employee (*przychód*, declared-amount rule, first month). Produces a basis trace for each month. | LR-112…119, Q-29 |
| `amounts` | Rate × basis per segment: 100/70, 81.5% with the 9-week exclusion and year-1 fallback, work-fraction reduction, minimum floor at the *świadczenie rodzicielskie*. Gross output, rounding from params. | LR-60…62, LR-130…132, Q-15, Q-29 |
| `risks` | Produces warnings from facts (contribution-basis increases in pregnancy, a short insurance history, a planned end of the title before the due date, debt) | LR-70…72, FR-SIM-03 |
| `protection` | Informational employment-protection flags, e.g. fixed-term contract extension | LR-80…82 |
| `validation` | Scenario validity: mother's 14 weeks (8 in special cases), 9-week shares, simultaneous use within the pool, ≤ 5 parts, work ≤ ½, notice periods, 21-day deadline for 81.5% | LR-34, LR-43, LR-45, LR-55, LR-124, LR-127, LR-134 |

## 6. Domain invariants (enforced by tests)

1. The engine is deterministic: the same `(facts, ruleSet)` gives a byte-identical result.
2. An amount is never produced when the basis or a rate is `UNVERIFIED`. In that case `amount.verified = false` and the status is `INDETERMINATE`.
3. The mother's segments cover ≥ 14 weeks after the birth (≥ 8 weeks in the incapacity, hospitalisation and abandonment cases), unless a `takeoverReason` from LR-124 applies (e.g. death).
4. One parent can use at most (pool − 9) weeks of parental leave. The other parent's 9 reserved weeks cannot be transferred and lapse if unused (KP art. 182¹a §4–5).
5. Parental segments per child number ≤ 5 and end ≤ 31 Dec of the year the child turns 6.
6. Paternity: ≤ 14 days, ≤ 2 parts, each ≥ 7 days, within the deadline (LR-46).
7. Supplementary maternity: only one parent, one part, starting the day after the maternity leave ends.
8. 81.5% requires `option81_5ApplicationDate ≤ birthDate + 21 days`. The other parent's 9 weeks are always at 70%. If no parental day falls in the child's first year, parental is at 70% (LR-130).
9. When both parents use parental leave simultaneously, the **sum** of their segments must be ≤ the pool (LR-127).
10. Every maternity-leave takeover keeps the total ≤ the LR-123 dimension (KP art. 180 §14).
11. Every `Determination` has a `trace` whose steps reference `LR-xx` or `Q-xx`.

## 7. Domain events (for the audit log and timeline)

- `ProfileImportedFromSimulation`
- `DocumentExtracted`
- `ExtractionConfirmedByUser`
- `ScenarioCalculated`
- `RuleSetPublished`
- `SimulatedApplicationSubmitted`
- `AssistantToolInvoked`
