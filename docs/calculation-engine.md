# Deterministic Calculation Engine

Status: v1.0 · 2026-11-21 · Package: `@zpr/domain/engine` · Related: [legal-assumptions.md](legal-assumptions.md), [domain-model.md](domain-model.md), [architecture.md](architecture.md)

The engine decides **eligibility** and calculates **duration, amounts and allocation** of ZUS parental benefits. It is pure TypeScript with no LLM, I/O, clock or randomness. The REST endpoints and the assistant tools are thin adapters over the same function (`evaluate`), so every channel gives identical answers for identical input.

> **An assessment is an estimate, never a ZUS decision.** Every response carries `kind: "ESTIMATE"` and a disclaimer. The right to a benefit and its amount are decided by ZUS or the authorised payer.

## 1. Guarantees

| Guarantee | How it is enforced |
|-----------|--------------------|
| Only rules from official sources | Sources are the documents ZUS provided (T, U, KP, R1316, R322, P). Every rule in `sources.ts` names its provision; a unit test fails if a non-assumption rule has none. |
| No floating point in money | `Ratio` (BigInt rational). Binary `number` fractions are rejected. Amounts leave the engine as integer grosze. |
| Explicit rounding | One rounding per calculation line, half up, to full grosze (A-20). The exact value is returned as `exactAmount` (e.g. `"301/2"`). |
| No fabricated estimates | Unknown basis ⇒ `amountGrosze: null`, `totals.totalGrosze: null`, `amountStatus: BASIS_UNKNOWN`. No lines ⇒ no total (never `0`). |
| No invented external values | Minimum wage, świadczenie rodzicielskie amount, average wage and the rehabilitation index are `null` in every published rule set (Q-29). Results that could only change in one direction are labelled `CALCULATED_LOWER_BOUND` / `CALCULATED_UPPER_BOUND`. |
| Versioned and reproducible | Rule sets are immutable and selected by effective date. Each assessment returns `ruleSet.version`, `engineVersion` and `inputHash` (SHA-256 of the canonical input). |
| Honest about what it did not decide | `unsupported`, `assumptions`, `missingEvidence`, `warnings`, `manualReviewReasons`, `planAdjustments`. |

## 2. Layout

```
packages/domain/src/engine/
  decimal.ts     exact rationals, rounding modes, grosze formatting
  calendar.ts    inclusive periods, age/anniversary conventions, deadlines
  sources.ts     source documents + rule catalogue (id → title, provisions, verification)
  rulesets.ts    versioned parameters (rates, durations, limits, deadlines) + external values
  context.ts     assumptions, unsupported scenarios, per-run collector
  validation.ts  structural errors (422) and logical consistency (manual review)
  coverage.ts    insurance on the day the right arises, waiting period, debt gate, payer
  basis.ts       benefit basis (employee, non-employee, declared short insurance)
  leave.ts       durations: maternity, supplementary, maternity-terms, parental pool
  schedule.ts    periods per parent: takeover, parental parts, work extension, paternity
  amounts.ts     rate decisions (100/70/81.5), lines, floors, top-ups
  sickness.ts    pregnancy sickness, employer sick pay, rehabilitation
  documents.ts   required documents and routing
  evaluate.ts    orchestration → Assessment
  services.ts    evaluateEligibility / calculateParentalBenefits / compare / timeline / documents
```

Dependency direction: `contracts` (Zod) → `domain/engine` ← `apps/web` (REST), `packages/ai` (tools). The engine imports nothing from them.

## 3. Money and dates

- **Basis** (`podstawa wymiaru`): employee `round(gross × (1 − 0.1371))` (U art. 3 pkt 3, art. 36; P s. 24), non-employee `round(contribution basis × (1 − 0.1371))` (U art. 3 pkt 4, art. 48). The 12-month history method excludes months with less than half of the required time (U art. 38 ust. 2, art. 50) and months outside the 12 months before the month the right arises.
- **Amount of a line**: `basis × rate × paidFraction × days / 30` is computed exactly and rounded once (U art. 36 ust. 3, art. 11 ust. 4–5, art. 31 ust. 5). The daily value is never rounded in between.
- **Output** is gross (before the PIT advance, A-03); the PIT computation is not in the sources.
- **Periods** are inclusive on both ends; a week is 7 calendar days (KP art. 183¹ § 1); the birth date is day 1 of maternity leave (KP art. 183¹ § 2).
- Conventions the sources leave open are named assumptions: "completing N years" (A-22), "N days after an event" (A-23), day numbering after birth (A-21).

## 4. Rule sets and effective dates

| Version | From | To | Change |
|---------|------|----|--------|
| `2026.07-Z1` | 2026-07-01 | 2026-10-23 | Ustawa zasiłkowa w brzmieniu Dz.U. 2026 poz. 854, w tym art. 61b od 1.07.2026 r. Formularze sprzed 24.10.2026 r.: wnioski ZUR/ZAO, zaświadczenie Z-3b (Poradnik ZUS, stan na 1.04.2026 r.). Wykaz dokumentów z rozporządzenia Dz.U. 2026 poz. 1316 stosowany pomocniczo (rozporządzenie weszło w życie później). |
| `2026.10-Z1` | 2026-10-24 | 2026-12-31 | ZUR i ZAO połączone w ZAM; zaświadczenie Z-3b zniesione (treść zadania, przyp. 3–5). Wykaz dokumentów według rozporządzenia Dz.U. 2026 poz. 1316. |
| `2027.01-Z1` | 2027-01-01 | obowiązuje | Art. 9 ust. 4 ustawy zasiłkowej: jeden okres zasiłkowy niezależnie od liczby tytułów ubezpieczenia. Art. 17 ust. 1d–1e: możliwość niewystawienia zwolnienia z tytułu, w którym praca może być wykonywana. |

The version in force on the day the right arises (birth, taking the child in, or the first day of incapacity if there is no due date) applies to the whole period (A-12). A request may pin a version to re-check an old calculation (`ruleSetVersion`). Dates before 2026-07-01 are returned as `MANUAL_REVIEW` (`U-01`): the provided sources do not contain that legal text.

Parameters are data (`rulesets.ts`); rule logic is code (AD-01). `GET /api/v1/rulesets` publishes all versions with `parameterMeta` (verification status and sources per parameter). To add a version, append a `RuleSet` with its own `effectiveFrom`, close the previous `effectiveTo`, update `rules`/`parameters`, and add boundary tests on both sides of the date; the contiguity test in `primitives.test.ts` enforces the windows.

External values that the sources lack (Q-29) can be supplied per request with a cited `sourceNote` (`externalParameters`). The result then carries a derived version `<version>+ext` and the note in `ruleSet.changes`.

### 4.1 Rates, exactly

| Benefit period | Rate | Condition | Source |
|----------------|------|-----------|--------|
| Maternity leave, leave on the terms of maternity leave, supplementary leave, paternity leave | 100% | — | U art. 31 ust. 1 |
| Maternity leave before the birth | 100% | also under the 81.5% variant (A-26) | P s. 27, s. 33 |
| Parental leave | 70% | — | U art. 31 ust. 2 |
| Whole maternity (or maternity-terms) + parental period | 81.5% | the insured mother (adoption/foster: the insured person) files a **written application no later than 21 days after the birth** (taking the child in) for the whole period | U art. 30a, art. 31 ust. 3 |
| The other parent's 9 reserved weeks | 70% **always**, also under 81.5% | — | U art. 31 ust. 3f |
| Parental part shared with the mother | stays 81.5% | application under U art. 30a | U art. 30a ust. 3 |
| Parental leave when no parental day falls in the child's first year | 70%, plus a one-off top-up of maternity to 100% on request (line `…-topup`) | 81.5% variant only | U art. 31 ust. 3g, ust. 4 |
| Paternity under the 81.5% variant | 100% | paternity is not part of the 81.5% period | U art. 31 ust. 1 |
| Work during parental leave | benefit × (1 − work fraction) | employee, same employer, ≤ ½ time | U art. 31 ust. 4a |
| Sickness benefit in pregnancy (e-ZLA code „B”) | 100%, else 80% | — | U art. 11 |
| Rehabilitation benefit | 90% for 3 months then 75%; 100% in pregnancy | information and rates only (`U-05`) | U art. 19 |

An application filed after the deadline, or a deadline that has passed without a filing, falls back to 100% + 70% and raises a `RISK` warning.

## 5. Eligibility coverage

| Situation required by ZUS | Engine behaviour | Sources |
|---------------------------|------------------|---------|
| Pregnancy sickness benefit | waiting period 30/90 days (gaps ≤ 30 days, day-one exceptions), 270-day period, employer pay 33/14 days, 100% with „B”, after-title right (≤ 14 days, ≥ 30 days of incapacity) | U art. 4, 7–9, 11; KP art. 92 |
| Rehabilitation benefit | determination + rates when the 270 days are exhausted; amount not calculated (`U-05`) | U art. 18–19; R1316 § 11 |
| Special benefit equal to maternity (`MATERNITY_EQUIVALENT`) | employees whose job ended in pregnancy by employer death, bankruptcy or liquidation without other work; until the birth; 100%; ZUS pays. Unlawful termination follows the statute (maternity after birth), not the task text (D-07) | U art. 30 ust. 1, 3; R1316 § 15, 17 |
| Maternity benefit | insurance on the birth day (no waiting period), 20/31/33/35/37 weeks, up to 6 weeks before the birth, first 14 weeks personal | U art. 29; KP art. 180 |
| Parental leave benefit | pool 41/43 (65/67 „Za życiem”), 9 non-transferable weeks per parent, ≤ 5 parts, until the end of the year the child turns 6 | KP art. 182¹a–c; U art. 29a |
| Paternity leave benefit | ≤ 14 days in ≤ 2 parts ≥ 7 days, until the day before the child's first birthday; insured non-employee fathers; father who started work after the birth; adoption: 12 months from the final order, max until the 14th birthday | KP art. 182³; R1316 § 33 |
| Supplementary maternity leave | three variants (< 28 weeks or ≤ 1000 g; 28–37 weeks; ≥ 37 weeks with ≥ 2 consecutive days starting day 5–28); stays summed, part week rounded up; multiples: lowest weight and longest stay; one parent, directly after maternity leave | KP art. 180², 183 § 3¹ |
| Adoption and foster care | leave on the terms of maternity leave by number of children, age caps 14 / 7 / 10, court application, professional families excluded, deduction when adoption follows foster care, 9-week guarantee near the age cap (Q-30 → manual review) | KP art. 183; U art. 29 ust. 1 pkt 2–3 |
| Mandatory / voluntary sickness insurance | compulsory for employees; mandate and self-employment need explicit voluntary insurance; continuity to the birth is a stated condition for forecasts | U art. 4, 29 |
| Employment termination | after-title rights, fixed-term extension to the birth (KP art. 177 § 3, not for replacement contracts), `RISK` warnings, protection scope (not for non-employees) | KP art. 177; U art. 30 |
| Stillbirth, child death | 8 weeks after the birth but ≥ 7 days after the death; after the 8th week 7 days; surviving children set the dimension; no parental leave; funeral allowance 7000 zł | KP art. 180¹; P s. 34–35 |
| Premature birth, hospitalisation | supplementary leave as above | KP art. 180² |
| Serious illness, incapacity, death or abandonment by the mother | father takes over the rest (≥ 14 weeks; ≥ 8 weeks in the special cases), total never above the dimension, rest stays with the mother when the father has no right | KP art. 180 § 4–17; U art. 29 ust. 3–10 |
| Self-employed contribution debt | gate at 1% of the minimum wage on the day the right arises, 6 months to repay, payment ≤ 60 days after repayment | U art. 2a, 64 ust. 3 |

## 6. Output contract (`Assessment`)

| Field | Content |
|-------|---------|
| `status` | `COMPLETE`, `PARTIAL` (missing evidence or unknown basis), `MANUAL_REVIEW` (inconsistent data, unsupported period, Q-30) |
| `eligibility` | `status` and `determinations[]` per parent and benefit: `ELIGIBLE`, `CONDITIONAL` (e.g. forecast, debt, insurance must last), `NOT_ELIGIBLE`, `NEEDS_INPUT`, `MANUAL_REVIEW`, with `reasons[]` (rule id), `conditions[]`, `payer` |
| `applicableBenefits` | non-rejected benefits with days, rates and amount |
| `basis` | per parent: method, monthly and daily basis, step-by-step trace, minimum-basis status |
| `breakdown` | lines with period, days, rate, `paidFraction`, `exactAmount`, `amountGrosze`, formula, rule ids |
| `totals` | gross total, per parent, per benefit, `amountStatus` |
| `periods`, `timeline` | benefit periods; dated periods and deadlines with `PASSED/TODAY/UPCOMING` |
| `allocation` | per parent: maternity, takeover, supplementary, parental, extension, paternity days; reserved nine weeks used/unused; total |
| `ruleSet`, `appliedRules`, `sources` | version and selection reason; applied rules with provisions and verification; flat list of provisions |
| `assumptions`, `missingEvidence`, `warnings`, `nextSteps`, `unsupported`, `manualReviewReasons`, `planAdjustments` | see §8 |

`planAdjustments` lists every place where the engine corrected the requested plan to the law (e.g. a parent asking for more than pool − 9 weeks), so a plan is never silently changed.

## 7. API and assistant integration

| Endpoint | Purpose |
|----------|---------|
| `POST /api/v1/eligibility/evaluate` | determinations, missing evidence, risks |
| `POST /api/v1/benefits/calculate` | full assessment |
| `POST /api/v1/scenarios/compare` | one household, up to 5 plans, difference against the first |
| `POST /api/v1/timeline` | periods, deadlines, allocation |
| `POST /api/v1/documents/required` | documents, forms, where to submit, due dates |
| `GET /api/v1/rulesets` | versions, parameters with verification, rules, assumptions, unsupported scenarios |

Requests are validated by `@zpr/contracts/engine` (strict Zod; ISO dates; integer grosze; fractions as decimal strings). Errors are RFC 9457 `application/problem+json` (`422 VALIDATION_ERROR`, `400 BAD_REQUEST`, `429`). The engine additionally rejects impossible calendar dates anywhere in the input (the format check alone accepts `2027-02-30`). The OpenAPI document (`/api/v1/openapi.json`) is generated from the same schemas. Nothing is persisted; requests are rate limited (60/min per client address).

Example:

```bash
curl -s -X POST localhost:3000/api/v1/benefits/calculate -H 'content-type: application/json' -d '{
  "asOf": "2027-04-01",
  "event": { "kind": "BIRTH", "birthDate": "2027-03-10", "childrenCount": 1 },
  "parents": [{
    "role": "MOTHER",
    "insurance": { "title": "EMPLOYMENT", "payerSize": "OVER_20" },
    "basis": { "method": "GROSS_MONTHLY", "grossMonthlyGrosze": 800000 }
  }]
}'
# → COMPLETE, maternity 140 days 100% = 3 221 493 gr, parental 224 days 70% = 3 608 073 gr, total 6 829 566 gr
```

The assistant reaches the engine only through the `AssistantServices.engine` port (`packages/ai`). `checkBenefitEligibility`, `calculateBenefit`, `compareLeaveScenarios`, `getRequiredDocuments` and `getBenefitTimeline` map the conversation facts onto an `AssessmentInput` (`tools/household.ts`, translation only) and return engine output, including the rule set version, applied rules and assumptions. The model never computes eligibility, periods or amounts. When the user gave no due date, the tools place the plan on a disclosed nominal date; when no income is known, `calculateBenefit` answers `NEEDS_INPUT`. When the user has not said which parent is asking, the paternity row asks instead of assuming.

The simplified integrated calculator (`calculateBenefits`) and the planner (`buildTimeline`) are adapters over the same engine and therefore changed: one parent may use at most pool − 9 weeks of parental leave (KP art. 182¹a § 4), so a mother alone gets 32 of 41 weeks, and the part-time extension is computed from that.

## 8. Tests

| File | Covers |
|------|--------|
| `engine/primitives.test.ts` | exact arithmetic, rounding modes, calendar conventions, rule-set windows and immutability, SHA-256 vectors |
| `engine/acceptance.test.ts` | scenarios: insured employee; self-employed (debt gate); civil-law contract worker; uninsured parent; both parents sharing leave (including 81.5% and its fallbacks, takeover); part-time work during parental leave; adoptive and foster parents; premature child; stillbirth and child death; employer bankruptcy, unlawful termination, fixed-term extension; pregnancy sickness; incomplete and inconsistent evidence; services; determinism |
| `engine/boundaries.test.ts` | one day/unit either side of: waiting periods (30/90, gap 30/31, day one), 270-day period, 33/14 employer days, after-title window, insurance on the birth day, 81.5% deadline (day 21/22), 6-week pre-birth limit, 14/8-week takeover, 5 parts, end of the year the child turns 6, paternity 14 days / parts / first birthday / leap day, adoption 14 and foster 7/10 age limits, supplementary variants, minimum-basis and debt thresholds, basis history rules, rounding tie, rule-set change dates, invalid dates |
| `contracts/src/engine.test.ts` | request schemas |
| `ai/src/tools/engine-tools.test.ts` | assistant tools against the real engine |
| `apps/web/tests/engine-api.test.ts` | route handlers: status codes, headers, problem+json, endpoint agreement |

**Expected values are not produced by the engine.** Amounts and dates were computed outside it with exact fractions (Python `Fraction`, independent date arithmetic) and pinned. Example: gross 8 000,00 zł → basis 690 320 gr; 100% × 140 days = 3 221 493 gr; 70% × 224 days = 3 608 073 gr.

**Official ZUS sample cases (T p.11, p.15) were not delivered** to the team (legal-assumptions SC, Q-20), so there are no golden cases from ZUS and no claim of agreement with them (`U-19`). When they arrive, add each as an `acceptance` case with its recorded outcome; do not copy the documents into the repository (T p.12).

## 9. Unsupported legal scenarios

Every scenario the engine does not decide. "Detected" means the engine adds the code to `unsupported` in the response when the situation occurs.

| Code | Scenario | Detected |
|------|----------|----------|
| U-01 | Zdarzenia sprzed 1.07.2026 r. — brak tekstu przepisów w tej wersji w udostępnionych źródłach. | tak — w polu `unsupported` odpowiedzi |
| U-02 | Kilka tytułów ubezpieczenia jednocześnie (np. etat i zlecenie) — zasiłek ustala się odrębnie z każdego tytułu; silnik ocenia jeden tytuł na rodzica. | nie (ograniczenie modelu) |
| U-03 | Przejęcie urlopu przez „innego członka najbliższej rodziny” — ustawa odsyła do definicji, której brak w wyciągu (Q-31). | nie (ograniczenie modelu) |
| U-04 | Kwoty netto (po zaliczce na PIT) — sposób obliczenia zaliczki nie wynika ze źródeł. | tak — w polu `unsupported` odpowiedzi |
| U-05 | Kwota świadczenia rehabilitacyjnego — wymaga wskaźnika waloryzacji ogłaszanego przez Prezesa ZUS i orzeczenia lekarza orzecznika. | tak — w polu `unsupported` odpowiedzi |
| U-06 | Składniki wynagrodzenia kwartalne, roczne i zachowywane w czasie zasiłku (U art. 41–42) — podaj kwoty miesięczne po ich uwzględnieniu albo podstawę z zaświadczenia płatnika. | tak — w polu `unsupported` odpowiedzi |
| U-07 | Poród lub zdarzenia za granicą i dokumenty zagraniczne (R1316 § 7–9, § 14) — wymagana weryfikacja przez ZUS. | nie (ograniczenie modelu) |
| U-08 | Urlop wychowawczy, zasiłek opiekuńczy i świadczenie rodzicielskie z ustawy o świadczeniach rodzinnych — poza zakresem silnika. | nie (ograniczenie modelu) |
| U-09 | Rozliczenie wariantu 81,5%, gdy po wniosku nie wykorzystano całego urlopu rodzicielskiego (poza przypadkiem z U art. 31 ust. 3g) — źródła nie opisują rozliczenia. | nie (ograniczenie modelu) |
| U-10 | Przeniesienie 9 tygodni urlopu rodzicielskiego, gdy drugi rodzic zmarł, nie ma prawa do urlopu albo jest nieubezpieczony — źródła tego nie przewidują (A-25). | tak — w polu `unsupported` odpowiedzi |
| U-11 | Urlop rodzicielski rodziny zastępczej dla dziecka, które ukończyło 6 lat — termin z KP art. 182¹c koliduje z art. 183. | tak — w polu `unsupported` odpowiedzi |
| U-12 | Ubezpieczenie rolnicze (KRUS) i służby mundurowe — inne przepisy. | tak — w polu `unsupported` odpowiedzi |
| U-13 | Sumowanie wcześniejszych niezdolności do pracy w okresie zasiłkowym (U art. 9) — silnik przyjmuje podaną liczbę dni już wykorzystanych. | tak — w polu `unsupported` odpowiedzi |
| U-14 | Późny poród po urlopie wykorzystanym przed porodem, gdy po porodzie zostaje mniej niż 14 tygodni (Q-26). | tak — w polu `unsupported` odpowiedzi |
| U-15 | Górny limit podstawy zasiłku chorobowego po ustaniu ubezpieczenia (U art. 46) — wymaga kwoty przeciętnego wynagrodzenia, której brak w źródłach. | tak — w polu `unsupported` odpowiedzi |
| U-16 | Wyższe wynagrodzenie chorobowe z przepisów zakładowych (KP art. 92 § 1) — przyjmujemy stawki ustawowe. | nie (ograniczenie modelu) |
| U-17 | Urlop ojcowski ojca w rodzinie zastępczej — KP art. 182³ obejmuje ojca dziecka i ojca adopcyjnego. | tak — w polu `unsupported` odpowiedzi |
| U-18 | Weryfikacja danych w systemach ZUS (okresy ubezpieczenia, zadłużenie) — dane pochodzą od użytkownika lub z symulacji. | nie (ograniczenie modelu) |
| U-19 | Oficjalne przykładowe sprawy ZUS — nie zostały udostępnione zespołowi, więc nie służą jako przypadki wzorcowe. | tak — w polu `unsupported` odpowiedzi |
| U-20 | Zasiłek macierzyński przy umieszczeniu dziecka w pieczy lub placówce i powrocie dziecka — silnik kończy urlop zgodnie z KP art. 182, bez wznowienia. | tak — w polu `unsupported` odpowiedzi |

## 10. Assumptions

Listed in a response only when they affected it.

| Id | Assumption |
|----|------------|
| A-03 | Kwoty są brutto, przed zaliczką na podatek dochodowy (PIT). Sposób obliczenia zaliczki nie wynika z udostępnionych źródeł. |
| A-12 | Stosujemy wersję przepisów obowiązującą w dniu powstania prawa (poród, przyjęcie dziecka, początek niezdolności) do całego okresu świadczenia. |
| A-17 | Przy adopcji i rodzinie zastępczej, gdy limit wieku dziecka skróciłby urlop na warunkach urlopu macierzyńskiego poniżej 9 tygodni, stosujemy 9 tygodni oraz 38 (62 przy „Za życiem”) tygodni urlopu rodzicielskiego (KP art. 183 § 3, § 4 pkt 3; kwestia Q-30). |
| A-19 | Zasiłek za okres odpowiadający uzupełniającemu urlopowi macierzyńskiemu liczymy także ubezpieczonym niebędącym pracownikami (U art. 29a ust. 1, R1316 § 26), mimo że Poradnik wymienia tylko pracowników (kwestia Q-32). |
| A-20 | Obliczenia pieniężne są dokładne (ułamki zwykłe). Podstawę wymiaru zaokrąglamy do pełnych groszy, a kwotę każdej pozycji — raz, na końcu — do pełnych groszy, połówki w górę. Źródła nie określają zasad zaokrąglania (Q-15). |
| A-21 | Dzień porodu jest 1. dniem urlopu macierzyńskiego (KP art. 183¹ § 2); „N-ty dzień po porodzie” to N-ty dzień licząc dzień porodu jako pierwszy, a „upływ N-tego tygodnia po porodzie” to koniec dnia poród + 7·N − 1. |
| A-22 | Uprawnienie trwające „do ukończenia przez dziecko N lat (miesięcy)” kończy się w dniu poprzedzającym odpowiednią rocznicę urodzin; dziecko „w wieku do N lat” to dziecko, które nie ukończyło N lat. |
| A-23 | Termin „N dni po zdarzeniu” upływa w dniu zdarzenie + N (dnia zdarzenia nie liczymy); „7 dni od dnia zgonu” to 7 dni następujących po dniu zgonu. Reguła liczenia terminów nie jest zawarta w udostępnionych źródłach. |
| A-24 | Gdy dziecko jeszcze się nie urodziło, okresy i terminy liczymy od przewidywanej daty porodu; przesuną się, jeśli poród nastąpi w innym dniu. |
| A-25 | Każdy z rodziców ma wyłączne prawo do 9 tygodni urlopu rodzicielskiego (KP art. 182¹a § 4). Jeden rodzic może więc wykorzystać najwyżej pulę pomniejszoną o 9 tygodni — także wtedy, gdy drugi rodzic nie ma prawa do zasiłku. Źródła nie przewidują przeniesienia tych 9 tygodni. |
| A-26 | W wariancie 81,5% zasiłek za urlop macierzyński wykorzystany przed porodem wynosi 100% (Poradnik ZUS s. 33); źródła nie opisują rozliczenia tej różnicy, więc jej nie potrącamy. |
| A-27 | Część urlopu macierzyńskiego przejęta przez ojca jest płatna według stawki obowiązującej za urlop macierzyński (100% albo 81,5% przy wniosku matki), bo U art. 31 ust. 3 obejmuje „cały okres” urlopu macierzyńskiego, a R1316 § 20 wymaga informacji o stawce wypłaconej matce. Podstawą jest podstawa wymiaru ojca. |
| A-28 | Limit 5 części urlopu rodzicielskiego liczymy łącznie dla obojga rodziców (KP art. 182¹c, art. 182¹d § 2). |
| A-30 | Zasiłek w wysokości zasiłku macierzyńskiego przysługuje od dnia następującego po ustaniu zatrudnienia do dnia poprzedzającego poród; od dnia porodu przysługuje zasiłek macierzyński (U art. 30 ust. 1 i 3). |
| A-31 | Przy porodzie mnogim, w którym część dzieci zmarła, wymiar urlopu rodzicielskiego ustalamy według liczby dzieci urodzonych przy jednym porodzie (KP art. 182¹a § 1 odsyła do art. 180 § 1, czyli do porodu). |
| A-32 | W historii miesięcznej uwzględniamy tylko 12 miesięcy kalendarzowych poprzedzających miesiąc powstania prawa (U art. 36 ust. 1, art. 48 ust. 1); inne miesiące pomijamy. |
| A-33 | Dla pracowników odliczamy od wynagrodzenia brutto 13,71% (Poradnik ZUS s. 24). Ustawa (art. 3 pkt 3) mówi o faktycznie potrąconych składkach — przy przekroczeniu rocznego limitu składek podstawa może być wyższa. |
| A-34 | Podwyższenie do kwoty świadczenia rodzicielskiego (U art. 31 ust. 3a–3c) liczymy proporcjonalnie: (kwota świadczenia − miesięczny zasiłek) × dni / 30. |
| A-35 | Wydłużenie urlopu rodzicielskiego przy łączeniu z pracą liczymy dokładnie (dni × wymiar pracy, a przy pracy w części wydłużonej — podzielone przez 1 − wymiar), a niepełny dzień pomijamy raz, na końcu (KP art. 182¹f § 2, § 4, § 7). |
| A-36 | Przy adopcji i rodzinie zastępczej rolę „MOTHER” ma rodzic korzystający z urlopu na warunkach urlopu macierzyńskiego, a „FATHER” — drugi rodzic. |

## 11. Source conflicts resolved in code

| Id | Conflict | Decision |
|----|----------|----------|
| D-07 | T p.4: unlawful termination gives *zasiłek w wysokości zasiłku macierzyńskiego* before the birth. U art. 30 ust. 3 and R1316 § 17 limit it to employer death, bankruptcy, liquidation. | Statute applies; unlawful termination gives maternity benefit after the birth (U art. 30 ust. 1 pkt 2). Warning `D07_UNLAWFUL_TERMINATION`. |
| D-08 | T p.8 says paternity leave is for employees. R1316 § 33 covers insured non-employees. | Non-employees are included. |
| D-09 / Q-32 | P p.30 limits supplementary leave to employees. U art. 29a ust. 1 and R1316 § 26 do not. | Statute applies (A-19), warning `Q32_SUPPLEMENTARY_NON_EMPLOYEE`. |
| D-10 / Q-33 | P (2026-04-01) uses Z-3b for the self-employed; T says abolished 2026-10-24 and names ZAS-53 / ZAM. | The form follows the rule set version (`2026.07-Z1` legacy, `2026.10-Z1` onwards ZAM / ZAS-53). |
| A-25 | KP art. 182¹a § 4 gives each parent 9 exclusive weeks; the sources do not say what happens to an uninsured or absent parent's share. | One parent never exceeds pool − 9 weeks; reported as `U-10` when the father uses leave after an uninsured mother. |

## 12. Known limitations

- One insurance title per parent (`U-02`); simultaneous titles are not summed.
- The rule set is chosen by the date the right arises; in a pregnancy assessment that includes a sick leave, the sick leave is evaluated under the rule set of the due date (A-12). Between today's versions only the form set (`forms`) and `sickness.singlePeriodAcrossTitles` differ.
- Deadlines counted in days (e.g. the 21 days for 81.5%) are computed with the usual civil-law convention (A-23); the provided sources contain no counting rule.
- Quarterly/annual pay components and components kept during benefit (U art. 41–42) must be supplied as monthly amounts or a known basis (`U-06`).

## 13. Appendix: rule catalogue

Rule ids follow `requirements.md` §6 (`LR-xx`). `ASSUMPTION` marks a rule that is our documented reading, not a quotation.

| Rule | Title | Provisions | Status |
|------|-------|------------|--------|
| LR-100 | Okres wyczekiwania na zasiłek chorobowy (30/90 dni, przerwy do 30 dni) | U art. 4 ust. 1–2 | VERIFIED_ZUS |
| LR-101 | Prawo do zasiłku chorobowego od pierwszego dnia ubezpieczenia | U art. 4 ust. 3 | VERIFIED_ZUS |
| LR-102 | Zasiłek chorobowy po ustaniu tytułu ubezpieczenia | U art. 7; U art. 8 ust. 2 | VERIFIED_ZUS |
| LR-103 | Okres zasiłkowy: 182 dni, 270 dni w ciąży | U art. 8 ust. 1; U art. 9 ust. 1–3 | VERIFIED_ZUS |
| LR-103A | Jeden okres zasiłkowy niezależnie od liczby tytułów | U art. 9 ust. 4 | VERIFIED_ZUS od 2027-01-01 |
| LR-104 | Zasiłek chorobowy w ciąży: 100% podstawy za każdy dzień | U art. 11 ust. 2 pkt 1, ust. 4–5; T s. 4 | VERIFIED_ZUS |
| LR-106 | Wynagrodzenie chorobowe pracownika: 33 dni (14 dni po 50. roku życia), 100% w ciąży | KP art. 92 § 1–5 | VERIFIED_ZUS |
| LR-107 | Świadczenie rehabilitacyjne: do 12 miesięcy, 90%/75%, 100% w ciąży | U art. 18–19 | VERIFIED_ZUS |
| LR-108 | Zadłużenie składkowe przedsiębiorcy powyżej 1% minimalnego wynagrodzenia wstrzymuje świadczenia | U art. 2a; U art. 64 ust. 3 | VERIFIED_ZUS |
| LR-109 | Kto wypłaca zasiłek: płatnik powyżej 20 ubezpieczonych albo ZUS | U art. 61 ust. 1–2; P s. 23 | VERIFIED_ZUS |
| LR-110 | Przedawnienie roszczenia: 6 miesięcy od końca okresu (3 lata przy błędzie) | U art. 67 | VERIFIED_ZUS |
| LR-111 | Wszczęcie postępowania i forma wniosków do ZUS | U art. 61b | VERIFIED_ZUS od 2026-07-01 |
| LR-05 | Formularze: ZUR i ZAO połączone w ZAM, zniesienie Z-3b | T s. 12 przyp. 3–5 | VERIFIED_T (Q-33) od 2026-10-24 |
| LR-112 | Podstawa wymiaru pracownika: przeciętne wynagrodzenie z 12 miesięcy po odliczeniu składek | U art. 3 pkt 3; U art. 36; U art. 38; P s. 24 | VERIFIED_ZUS |
| LR-113 | Podstawa przy ubezpieczeniu krótszym niż pełny miesiąc | U art. 37; U art. 49 | VERIFIED_ZUS |
| LR-115 | Minimalna podstawa przy pełnym etacie: minimalne wynagrodzenie po odliczeniu 13,71% | U art. 45 | VERIFIED_ZUS (Q-29) |
| LR-116 | Podstawa wymiaru niepracownika: przeciętny przychód z 12 miesięcy (podstawa składek − 13,71%) | U art. 3 pkt 4; U art. 48; P s. 25 | VERIFIED_ZUS |
| LR-117 | Zadeklarowana podstawa przy ubezpieczeniu krótszym niż 12 miesięcy | U art. 48a | VERIFIED_ZUS |
| LR-119 | Zasady podstawy stosuje się do zasiłku macierzyńskiego i świadczeń pokrewnych; brak ponownego ustalania przy przerwie krótszej niż miesiąc | U art. 43; U art. 47; U art. 52; P s. 28 | VERIFIED_ZUS |
| LR-120 | Zasiłek macierzyński wymaga ubezpieczenia chorobowego w dniu porodu lub przyjęcia dziecka | U art. 29 ust. 1–2; P s. 29 | VERIFIED_ZUS |
| LR-120A | Zawodowa rodzina zastępcza nie ma prawa do zasiłku macierzyńskiego | U art. 29 ust. 1 pkt 3; KP art. 183 § 1 | VERIFIED_ZUS |
| LR-121 | Zasiłek macierzyński po ustaniu ubezpieczenia w ciąży (śmierć, upadłość, likwidacja pracodawcy, bezprawne rozwiązanie) | U art. 30 ust. 1; R1316 § 15 | VERIFIED_ZUS |
| LR-121A | Zasiłek w wysokości zasiłku macierzyńskiego do dnia porodu | U art. 30 ust. 3; R1316 § 17; T s. 4 | VERIFIED_ZUS |
| LR-122 | Umowa terminowa przedłużona do dnia porodu daje zasiłek macierzyński po ustaniu ubezpieczenia | KP art. 177 § 3–3¹; U art. 30 ust. 4 | VERIFIED_ZUS |
| LR-123 | Urlop macierzyński: 20/31/33/35/37 tygodni; do 6 tygodni przed porodem | KP art. 180 § 1–3; KP art. 183¹ | VERIFIED_ZUS |
| LR-123A | Matka wykorzystuje osobiście 14 tygodni; rezygnacja na rzecz ojca | KP art. 180 § 4–5, § 8–9; U art. 29 ust. 3; T s. 7 | VERIFIED_ZUS |
| LR-124 | Przejęcie urlopu macierzyńskiego przez ojca w sytuacjach szczególnych | KP art. 180 § 6–17; U art. 29 ust. 5–10; U art. 29a ust. 2 | VERIFIED_ZUS |
| LR-125 | Urodzenie martwego dziecka lub zgon dziecka | KP art. 180¹; KP art. 182¹g; T s. 6; P s. 33 | VERIFIED_ZUS |
| LR-125A | Porzucenie dziecka lub umieszczenie w pieczy — urlop nie krótszy niż 8 tygodni | KP art. 182; R1316 § 19 | VERIFIED_ZUS |
| LR-125B | Dziecko wymagające opieki szpitalnej — reszta urlopu po wypisie | KP art. 181 | VERIFIED_ZUS |
| LR-126 | Uzupełniający urlop macierzyński (wcześniak, hospitalizacja) | KP art. 180²; KP art. 183 § 3¹; T s. 8 | VERIFIED_ZUS |
| LR-127 | Urlop rodzicielski: 41/43 (65/67) tygodni, 9 tygodni nieprzenoszalnych, do 5 części | KP art. 182¹a; KP art. 182¹c; KP art. 182¹d; U art. 29a ust. 3 | VERIFIED_ZUS |
| LR-128 | Łączenie urlopu rodzicielskiego z pracą (do ½ etatu) i proporcjonalne wydłużenie | KP art. 182¹e; KP art. 182¹f | VERIFIED_ZUS |
| LR-129 | Urlop na warunkach urlopu macierzyńskiego i rodzicielski przy adopcji i rodzinie zastępczej | KP art. 183 § 1–1¹, § 4–4⁶, § 6–8; U art. 29 ust. 1 pkt 2–3 | VERIFIED_ZUS |
| LR-129A | Gwarantowane 9 tygodni urlopu na warunkach urlopu macierzyńskiego i 38 (62) tygodni rodzicielskiego | KP art. 183 § 3, § 4 pkt 3, § 4², § 4³ pkt 3, § 4⁵ | ASSUMPTION (Q-30) |
| LR-130 | Stawki: 100% (macierzyński, na warunkach macierzyńskiego, uzupełniający, ojcowski), 70% (rodzicielski) | U art. 31 ust. 1–2; T s. 9 | VERIFIED_ZUS |
| LR-130A | 81,5% za cały okres na wniosek matki złożony do 21 dni po porodzie (przyjęciu dziecka) | U art. 30a ust. 1–4; U art. 31 ust. 3; T s. 9 | VERIFIED_ZUS |
| LR-130B | 9 tygodni drugiego rodzica zawsze 70% | U art. 31 ust. 3f; P s. 34 | VERIFIED_ZUS |
| LR-130C | Brak urlopu rodzicielskiego w 1. roku życia: 70% i wyrównanie macierzyńskiego do 100% | U art. 31 ust. 3g, ust. 4 | VERIFIED_ZUS |
| LR-130D | Zasiłek za urlop macierzyński przed porodem: 100% | P s. 27, s. 33 | VERIFIED_ZUS |
| LR-131 | Praca w trakcie urlopu rodzicielskiego proporcjonalnie obniża zasiłek | U art. 31 ust. 4a | VERIFIED_ZUS |
| LR-132 | Podwyższenie zasiłku do kwoty świadczenia rodzicielskiego | U art. 31 ust. 3a–3c; R1316 § 28 | VERIFIED_ZUS (Q-29) |
| LR-MONEY | Zasiłek miesięczny = stawka × podstawa; za dzień 1/30; kwota brutto przed zaliczką PIT | U art. 36 ust. 3; U art. 11 ust. 4–5; U art. 31 ust. 5; P s. 24 | VERIFIED_ZUS |
| LR-ROUND | Zaokrąglenie do pełnych groszy (połówki w górę) raz na pozycję wyliczenia | — | ASSUMPTION (Q-15) |
| LR-133 | Urlop ojcowski: do 2 tygodni, w 1–2 częściach po min. tydzień, do 12. miesiąca życia dziecka | KP art. 182³; R1316 § 33; T s. 8 | VERIFIED_ZUS |
| LR-134 | Terminy wniosków pracowniczych | KP art. 180 § 8–9; KP art. 180² § 4; KP art. 182¹d § 1; KP art. 182¹e § 2; KP art. 182³ § 2; KP art. 183 § 6; R322 § 2–18 | VERIFIED_ZUS |
| LR-135 | Dokumenty niezbędne do przyznania i wypłaty zasiłku | R1316 § 2–33 | VERIFIED_ZUS |
| LR-136 | Zasiłek pogrzebowy 7000 zł przy urodzeniu martwego dziecka | P s. 35 | VERIFIED_ZUS |
| LR-137 | Wyrejestrowanie z dobrowolnego ubezpieczenia chorobowego z chwilą pobierania zasiłku macierzyńskiego | P s. 35 | VERIFIED_ZUS |
| LR-70 | Umowa lub działalność dla pozoru — decyzja o niepodleganiu ubezpieczeniu | T s. 9–10 | VERIFIED_T |
| LR-71 | Podwyższenie podstawy składek w ciąży — możliwa decyzja o niższej podstawie | T s. 10 | VERIFIED_T |
| LR-72 | Brak ubezpieczenia chorobowego w dniu porodu | T s. 10; U art. 29 ust. 1 | VERIFIED_ZUS |
| LR-80 | Szczególna ochrona stosunku pracy w ciąży i w czasie urlopów | KP art. 177 § 1, § 1¹, § 4 | VERIFIED_ZUS |
| LR-82 | Ochrona z Kodeksu pracy nie dotyczy osób, które nie są pracownikami | T s. 10 | VERIFIED_T |
