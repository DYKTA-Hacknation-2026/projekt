# Legal Assumptions and Open Questions

Status: **v0.2** · 2026-11-21 · Owner: domain lead
Change log: v0.2 adds the ZUS legal sources (U, KP, R1316, R322, P). It resolves 19 of the 28 questions, partially resolves 6, adds 6 new questions and records 7 new document conflicts.

This document is the **single register of legal uncertainty**. The rule engine must not encode any legal parameter that lacks a source in §1. Without a source, the engine returns `INDETERMINATE` instead of guessing.

## 1. Sources and precedence

| Code | Source | Status | Repo location |
|------|--------|--------|---------------|
| **T** | *ZUS – Pełna treść zadania konkursowego* (16 pages) | Competition requirements + legal summary | not committed |
| **R** | *ZUS – Regulamin zadania konkursowego* | Competition rules | not committed |
| **U** | Ustawa zasiłkowa, Dz.U. 2026 poz. 854 (ZUS extract: Rozdz. 1–3, 6, 8–11) | **Received** | `fixtures/private/sources/ustawa-zasilkowa-wyciag.md` |
| **KP** | Kodeks pracy (ZUS extract: art. 1–3, 92, Dział VIII art. 175¹–189¹) | **Received** | `fixtures/private/sources/kodeks-pracy-wyciag.md` |
| **R1316** | Rozporządzenie MRPiPS of 27.09.2026 (Dz.U. 2026 poz. 1316), documents and information needed for benefits | **Received** | `fixtures/private/sources/rozporzadzenie-2026-poz-1316.md` |
| **R322** | Rozporządzenie MRPiPS of 11.03.2025 (Dz.U. 2025 poz. 322), content of employee leave applications | **Received** | `fixtures/private/sources/rozporzadzenie-2025-poz-322.md` |
| **P** | *Poradnik dla rodziców i opiekunów dzieci*, ZUS 2026 (**legal status as of 2026-04-01**) | **Received** | `fixtures/private/sources/poradnik-zus-2026.md` |
| ZAL | Task *załącznik* (durations, amounts, basis table) | **Not received.** Its content is now largely covered by KP and U. | — |
| SC | Sample cases | **Not received** | `fixtures/private/` (planned) |

The whole `fixtures/private/` folder is git-ignored until Q-19 is answered. The legal acts are public law, but T p.12 forbids distributing "udostępnione przez ZUS dokumenty", and the scope of that ban is unclear.

**Precedence for the rule engine:**

1. Statute text: **U, KP**.
2. Implementing regulations: **R1316, R322**.
3. **T**, the task's legal summary.
4. **P**, the explanatory guide, which is older (status as of 2026-04-01).

Rules for applying it:

- T remains the primary source for **competition requirements** (what to build). For **legal rules** (how to calculate), statute text wins.
- Every conflict is logged in §5 and never resolved silently.
- Verification statuses:
  - `VERIFIED-T`: from T only.
  - `VERIFIED-ZUS`: from U, KP, R1316, R322 or P. The `sourceRef` always names the exact article or paragraph.
  - `UNVERIFIED`: no source yet.

## 2. Policy for gaps (unchanged)

| Situation | Engine | UI |
|-----------|--------|----|
| Parameter missing or unverified | `INDETERMINATE` + `openQuestion` | „Nie możemy jeszcze tego wyliczyć…” + a link to ZUS (infolinia 22 560 16 00, cot@zus.pl; source: P p.6) |
| User fact missing | `NEEDS_INPUT` | A follow-up question |
| Rule says „co do zasady” or „m.in.” | Base rule + `caveat` | „Istnieją wyjątki — sprawdź w ZUS” |
| Sources conflict | Statute wins; conflict logged (§5) | Show the statutory reading; cite it |

## 3. Open questions

Priorities:

- **P0**: blocks a mandatory feature.
- **P1**: affects correctness in a common case.
- **P2**: edge case.

| ID | Question | Status | Blocks | Pri |
|----|----------|--------|--------|-----|
| Q-15 | **Money mechanics, remaining part.** These are settled:<br>• daily basis = 1/30 of the monthly basis (U art. 36 ust. 3)<br>• the benefit is due for every calendar day (U art. 11 ust. 4, art. 31 ust. 5)<br>• P p.24–25 says the benefit is reduced by the **PIT advance**<br>Still open: the **rounding** of the basis, the daily rate and the totals, and the PIT advance computation. P only states the rounding rule for *contributions* (half-up to grosze). | PARTIAL | Amount precision vs sample cases | P0 |
| Q-16 | **Temporal applicability:** U has amendments with different effective dates: art. 61b on 2026-07-01, and art. 9 ust. 4 and art. 17 ust. 1d–1e on **2027-01-01**. Which version applies to a period that spans a change? Transitional provisions are not in the extract. | PARTIAL | Rule-set selection (A-12) | P1 |
| Q-19 | **Confidentiality** of the sample cases and the ZUS-provided materials, versus the public demo and repo (T p.12 vs T p.14–15). May we publish the statutory extracts or the Poradnik in the demo knowledge base? | OPEN | FR-DEMO-01/02, RAG visibility | **P0** |
| Q-20 | **Format of the sample cases** (AcroForm, flat or scanned), and the expected outputs per case. | OPEN | FR-PRD-06 | **P0** |
| Q-23 | **Charitable organisations:** P gives none. Does ZUS provide or endorse a list? | OPEN | FR-INF-04 content | P1 |
| Q-26 | **Late birth after pre-birth maternity leave:** KP art. 180 §2–3 and art. 183¹ §2 cover the normal case. What if a late birth plus pre-birth use leaves fewer than 14 weeks after the birth? | PARTIAL | Planner edge case | P2 |
| **Q-29** | **External numeric parameters that are not in any source:**<br>• minimum wage (*minimalne wynagrodzenie*) for the year, used by the 1% debt threshold (U art. 2a), the minimum basis (U art. 45), and the lowest contribution basis (U art. 48a, art. 49)<br>• the **świadczenie rodzicielskie** amount, the floor for the maternity benefit (U art. 31 ust. 3a)<br>• the **przeciętne wynagrodzenie**, the cap after the insurance title ends (U art. 46)<br>• the rehabilitation indexation (U art. 19 ust. 2)<br>These must be admin-entered with an official source. | **NEW** | Minimum basis, debt verdict, minimum maternity | **P0** |
| **Q-30** | **Interpretation of KP art. 183 §3 and §4 pkt 3:** "9 weeks of leave on the terms of maternity leave" and "38 weeks parental" for a child taken in "up to 7 (10 or 14) years". Our reading: a guaranteed minimum when the age cap would cut the standard 20/31/… weeks. Needs confirmation. | **NEW** | FR-CALC-04 near the age limit | P1 |
| **Q-31** | **"Inny członek najbliższej rodziny":** KP art. 175¹ refers to U art. 29 ust. 5 for the definition, but the extract's art. 29 ust. 5 contains no definition. Who qualifies? | **NEW** | Takeover by a family member other than the father | P2 |
| **Q-32** | **Supplementary maternity leave for non-employees.** P p.30 says it is only for parents "zatrudnionym na podstawie umowy o pracę". U art. 29a ust. 1, art. 29 ust. 5–7 and R1316 §26 suggest insured non-employees also receive the benefit for the corresponding period. | **NEW** (conflict D-09) | FR-CALC-01 premature birth, non-employee | P1 |
| **Q-33** | **Sickness benefit form for the self-employed after 2026-10-24:** P (2026-04-01) says Z-3b, which T says was abolished. T says ZAS-53. Which form, and what about cases from before the abolition? | **NEW** (conflict D-10) | Routing checklist | P2 |
| **Q-34** | **81.5% election form:** U art. 30a says a "pisemny wniosek" within 21 days. P p.33 also accepts a "deklaracja". Do both count? | **NEW** | FR-CALC-08 UX copy | P2 |

## 4. Working assumptions

| ID | Assumption | Rationale | Revisit |
|----|------------|-----------|---------|
| A-01 | Only T, R, U, KP, R1316, R322 and P are legal sources. Nothing is filled in from memory. | The brief | Never |
| A-02 | Durations are in calendar days. 1 week = 7 calendar days (KP art. 183¹ §1). If maternity leave is not used before the birth, day 1 = the birth date (KP art. 183¹ §2). | Sourced now | — |
| A-03 | Money is in grosze. The daily basis = basis / 30 (U art. 36 ust. 3). The engine outputs **gross** amounts („kwota brutto, przed zaliczką na PIT”) because the PIT computation is not in the sources (Q-15). Rounding is a parameter, currently unverified. | Q-15 | Q-15 |
| A-04 | Payer routing: the payer pays if it reported **≥ 21** (i.e. > 20) insured persons on 30 November of the previous year. Otherwise, and **always for the self-employed** and for benefits after the title ends, ZUS pays. ZUS continues a payment it started even if the payer becomes eligible on 1 January. | U art. 61 ust. 1–4; P p.23 | — |
| A-05 | Benefits are computed **per insurance title**. A single *okres zasiłkowy* across titles applies only from 2027-01-01 (U art. 9 ust. 4), and is modelled in rule set `2027.01`. | Sourced now | Q-16 |
| A-06 | 81.5% is modelled per U art. 30a and art. 31 ust. 3–4:<br>• it covers maternity (or leave on the terms of maternity leave) + parental leave, **excluding** the other parent's 9-week share, which is always paid at 70% (art. 31 ust. 3f)<br>• the parental part the mother shares with the father keeps 81.5% (art. 30a ust. 3)<br>• if no parental day is used in the child's first year, parental is paid at 70% and the maternity part can be topped up to 100% on request (art. 31 ust. 3g, ust. 4) | Q-07 resolved | — |
| A-07 | Paternity leave benefit is available to employee fathers (KP art. 182³) **and** to insured non-employee fathers, who apply before the start (R1316 §33 ust. 1 pkt 3). | Q-10 resolved | — |
| A-08 | Simulated integrations use synthetic personas. The sample cases are only in private storage. | T p.12 | Q-19 |
| A-09 | Debt (FR-SIM-03), for the self-employed, cooperating persons, clergy and seafarers only (U art. 2a ust. 1):<br>• debt **> 1% of the minimum wage** on the date the right arises → no benefit until the full debt is repaid<br>• no repayment within **6 months** → the right expires (art. 2a ust. 2)<br>• after repayment, the benefit is paid within 60 days (art. 64 ust. 3)<br>The threshold amount depends on Q-29. | Q-14 resolved | Q-29 |
| A-10 | *Świadczenie rehabilitacyjne* is shown as information **plus rate logic**: 90% for 3 months, then 75%, and **100% in pregnancy**, for at most 12 months, decided by a ZUS doctor (U art. 18–19). It is not a full calculator, because indexation (Q-29) and the medical decision are out of scope. | Q-09 resolved | — |
| A-11 | Charities come only from a curated or ZUS list. The seed is empty. | Q-23 | Q-23 |
| A-12 | The rule set effective on the **date the right arises** applies to the whole period. Rule set `2027.01` exists for the U amendments effective 2027-01-01. | Simplest consistent model | Q-16 |
| A-13 | Leave application templates follow **R322** (§2–§18) field by field, and are watermarked „Wzór przygotowany na potrzeby demonstracji — symulacja”. | Q-22 resolved | — |
| A-14 | Forms follow T (post-2026-10-24): ZUR, ZAO → ZAM; Z-3b abolished. The extractor still recognises the legacy ZUR, ZAO and Z-3b, because P and older sample cases use them. | T fn.3–5 over P | Q-33 |
| A-15 | *Wynagrodzenie chorobowe* (employee, compulsory insurance): the first 33 days per calendar year, or 14 days from the year after the employee turns 50. Paid at **100%** if the illness falls during pregnancy (KP art. 92 §1 pkt 2), using the same basis rules as the sickness benefit (KP art. 92 §2). There is no wynagrodzenie chorobowe for voluntary insurance (P p.23). **It can now be computed.** | Q-24 resolved | — |
| A-16 | **Professional foster families** (*rodzina zastępcza zawodowa*) are **NOT_ELIGIBLE** for maternity-related leave and benefit (KP art. 183 §1, U art. 29 ust. 1 pkt 3). FR-CALC-06 (task item j) is therefore treated as identical to item e). | Q-17 resolved | — |
| A-17 | **KP art. 183 §3 reading** (Q-30):<br>• the engine computes the standard dimension (20/31/33/35/37 weeks) capped at the age limit<br>• if the cap would leave fewer than 9 weeks, the engine applies 9 weeks and parental leave of 38 weeks (62 with „Za życiem”), with `caveat: Q-30` | Our reading of the text | Q-30 |
| A-18 | **Basis computation, MVP scope:**<br>• employees: U art. 36–38, 40, 42, 45 (12 months; exclude months with < ½ of the required time worked; the 13.71% deduction per P p.24; minimum basis for full time)<br>• non-employees: U art. 48, 48a, 49 (12 months of *przychód* = contribution basis − 13.71%; the declared-amount rule for less than 12 months)<br>Not in the MVP: art. 41 (components kept during the benefit) and art. 42 quarterly or annual components beyond 1/12 averaging. These are flagged `caveat`. | Scope control | Sample cases |
| A-19 | **Supplementary leave for non-employees** is computed, with `caveat: Q-32`, following U over P. | Statute precedence | Q-32 |

## 5. Known document issues and conflicts

| ID | Issue | Location | Resolution |
|----|-------|----------|------------|
| D-01 | A duplicated paragraph (employee sickness routing) | T p.3 | Editorial; ignore |
| D-02 | A duplicated sentence on the father's early takeover | T p.7 | Editorial; ignore |
| D-03 | Items e) and j) overlap | T p.13 | Resolved by A-16 |
| D-04 | A typo, "URLOPÓWURLOPÓW" | T p.10 | Cosmetic |
| D-05 | Missing *załącznik*, regulations extract and *Poradnik* | T p.9, 11, 15 | **Mostly resolved.** U, KP, R1316, R322 and P were received; ZAL and SC are still missing. |
| D-06 | The jury criteria are consistent between R and T | R, T p.16 | — |
| **D-07** | T p.4 lists **unlawful termination (final judgment)** as a ground for *zasiłek w wysokości zasiłku macierzyńskiego*. U art. 30 ust. 3 and R1316 §17 limit that benefit to the employer's **death, bankruptcy or liquidation**, for **employees** only. Unlawful termination instead gives the **zasiłek macierzyński after the birth** although insurance has ended (U art. 30 ust. 1 pkt 2; R1316 §15 ust. 2). | T p.4 vs U, R1316 | **Statute applies.** Calculator and copy follow U. The divergence is noted in the „Dlaczego?” trace. |
| **D-08** | T p.8 says paternity leave applies to a "pracownik". Non-employee insured fathers also get the benefit (R1316 §33 ust. 1 pkt 3). | T p.8 vs R1316 | A-07 |
| **D-09** | P p.30 says supplementary leave is for employees only, and simplifies the eligibility to "at least 5 days in hospital". KP art. 180² has three precise variants (< 28 weeks or ≤ 1000 g; 28–37 weeks and > 1000 g; ≥ 37 weeks with ≥ 2 consecutive days starting between day 5 and day 28). | P p.30 vs KP, U | KP wins; Q-32 for non-employees |
| **D-10** | P (status as of 2026-04-01) instructs the self-employed to use **Z-3b**, which was abolished on 2026-10-24 (T fn.5). | P p.25, 28, 35 vs T | A-14, Q-33 |
| **D-11** | The P table lists "37 tygodni – >5 dzieci". KP says "pięciorga **i więcej**" (≥ 5). | P p.30 | KP wins |
| **D-12** | P p.31 says the 9-week right is "każdemu z zatrudnionych na podstawie umowy o pracę rodziców". U art. 30a and art. 31 ust. 3f apply the 9-week share to the insured "drugi rodzic" in general. | P p.31 vs U | U wins (applies to insured parents) |
| **D-13** | P p.23 defines a "big payer" as **≥ 21** reported persons. This is consistent with U art. 61 ("powyżej 20"). | — | No conflict; recorded for clarity |

## 6. Resolved questions

| ID | Question (short) | Answer | Source |
|----|------------------|--------|--------|
| Q-01 | Maternity weeks for multiples | 20 / 31 / 33 / 35 / 37 weeks for 1 / 2 / 3 / 4 / ≥ 5 children | KP art. 180 §1; P p.30 |
| Q-02 | Basis computation | **Employee:** the average monthly *wynagrodzenie* (after the employee's social contributions) for the 12 calendar months before the month the right arises. If the person has been insured for less than 12 months, use the full months. Exclude months with < ½ of the time worked (for justified reasons). Basis for a new job under a month: art. 37. Change of working time: art. 40. Bonuses: art. 42. The basis is not recomputed if the break is < 1 month (art. 43). Minimum basis for full time = minimum wage − 13.71% (art. 45). The same rules apply to maternity benefit and *zasiłek w wysokości zasiłku macierzyńskiego* (art. 47).<br>**Non-employee:** the average monthly *przychód* = contribution basis − 13.71%, over 12 months (art. 3 pkt 4, art. 48). Declared-amount rule for < 12 months: art. 48a. Less than one month: art. 49. Reduced months: art. 50. Maternity: art. 52.<br>**Deduction:** P states 13.71% for employees as well. | U art. 3, 36–50, 52; P p.24–25 |
| Q-03 | 41 vs 43 weeks | 41 for one child, 43 for two or more (birth or simultaneous care-taking) | KP art. 182¹a §1, 183 §4–4¹ |
| Q-04 | „Za życiem” extension | 65 weeks (one child) / 67 weeks (2+); 62 weeks in the KP art. 183 §3 case | KP art. 182¹a §2, 183 §4³–4⁵; P p.31 |
| Q-05 | Supplementary maternity length | One week per week of the child's hospital stay:<br>(1) born < 28 weeks of pregnancy or ≤ 1000 g → stays up to the end of week 15 after birth<br>(2) born 28–37 weeks and > 1000 g → up to the end of week 8<br>(3) born ≥ 37 weeks → stays from day 5 to the end of week 8, if the stay is ≥ 2 consecutive days and the first falls between day 5 and day 28<br>Stays are summed and part weeks round **up**. Multiple births: the lowest birth weight and the longest stay. One parent only, granted in one go, directly after maternity leave. Apply ≥ 21 days before maternity leave ends. Attach a hospital certificate and a statement from the other parent. | KP art. 180²; R322 §14; P p.30–31 |
| Q-06 | Adoption and foster lengths | Leave on the terms of maternity leave: 20 / 31 / 33 / 35 / 37 weeks by the number of children taken in at once.<br>Age caps: **foster family** (non-professional) until the child turns 7, or 10 with deferred schooling; **adoption** (court application) until 14.<br>Parental: 41 / 43 weeks (38 in the §3 case; „Za życiem” 65 / 67 / 62).<br>Apply within 7 days of taking the child; the leave starts ≤ 21 days after. Supplementary leave applies if the hospital stay was after the child was taken in. A foster family that then applies to adopt gets the adoption dimension minus the leave already used. | KP art. 183; U art. 29 ust. 1 pkt 2–3 |
| Q-07 | 81.5% with the father | The father's non-transferable 9 weeks are excluded from 81.5% and always paid at 70%. Shared parental time keeps 81.5%. No parental day in the first year → 70% for parental, plus a one-off top-up of maternity to 100% on request. The mother must apply within 21 days of the birth; for adoption or foster care, within 21 days of taking the child. | U art. 30a, 31 ust. 3, 3f, 3g, 4; P p.33 |
| Q-08 | Work + parental | **Extension** = (weeks combined) × (work fraction), with the fraction ≤ ½. Caps: 82 / 86 weeks (130 / 134 with „Za życiem”). A remainder that is not a whole week is granted in days, dropping part days. If the extension part is also combined with work: length = extension / (1 − fraction). **Benefit amount** is reduced proportionally to the working time: rate × basis × (1 − fraction). Apply ≥ 21 days before; the employer may refuse for organisational reasons (answer within 7 days). | KP art. 182¹e–182¹f; U art. 31 ust. 4a; R322 §16 |
| Q-09 | Świadczenie rehabilitacyjne | After the sickness benefit is exhausted and recovery is likely; ≤ 12 months; ZUS doctor's decision; 90% for 3 months then 75%, **100% in pregnancy**; basis indexed quarterly | U art. 18–19, 22; R1316 §11 |
| Q-10 | Paternity for non-employees | Yes: maternity benefit for the paternity period. The non-employee files a request with the start date before the start. | R1316 §33; U art. 29a ust. 1 |
| Q-11 | Father's early takeover, full list | (a) the mother resigns after ≥ 14 weeks (employee or insured)<br>(b) a mother with an incapacity-for-independent-existence ruling resigns after ≥ 8 weeks<br>(c) the mother is hospitalised after ≥ 8 weeks (for the stay)<br>(d) the mother dies<br>(e) the mother abandons the child (after ≥ 8 weeks)<br>(f) an **uninsured** mother dies, abandons the child, or has an incapacity ruling<br>(g) an **uninsured** mother takes a job of ≥ ½ time<br>Rights also extend to "inny członek najbliższej rodziny" (Q-31). The total may not exceed the KP art. 180 §1 dimension. | KP art. 180 §4–17; U art. 29 ust. 3–10, 29a ust. 2 |
| Q-12 | Waiting-period exceptions | Earlier periods count if the break was ≤ 30 days, or due to parental, unpaid or military leave. Day-1 right applies to: school or university graduates insured within 90 days; a commuting accident; compulsory insured with ≥ 10 years of earlier compulsory insurance; MPs and senators; customs officers. | U art. 4 ust. 2–3 |
| Q-13 | 270 days, aggregation | 182 days in general, **270 in pregnancy**. Periods with a break ≤ 60 days aggregate, **except** that pre-break periods do not count if the incapacity after the break falls in pregnancy. The waiting period does not count. After the title ends: max 91 days, **but not for pregnancy**. Sickness after the title ends requires ≥ 30 days of incapacity, starting ≤ 14 days after it ended (art. 7). From 2027-01-01: one period across titles. | U art. 7–9; P p.24 |
| Q-14 | Debt consequence | See A-09 | U art. 2a, 64 ust. 3; P p.24 |
| Q-17 | Professional foster families | Excluded | KP art. 183 §1; U art. 29 ust. 1 pkt 3 |
| Q-18 | *Zasiłek w wysokości zasiłku macierzyńskiego* | **Employees** only; the employer's death, bankruptcy or liquidation during pregnancy; no other job; paid until the birth; 100%; normal basis rules (art. 47); paid by ZUS (after the title ends). Documents: a medical certificate of pregnancy during employment, an *świadectwo pracy* or equivalent, and a statement that no other job was provided. See D-07 for unlawful termination. | U art. 30 ust. 3, 47, 61 ust. 1 pkt 2 lit. d; R1316 §17 |
| Q-21 | Father when the mother was uninsured | Maternity-period rights only in cases (f) and (g) of Q-11. The father's parental benefit is budget-financed if the mother is not insured. Paternity leave applies regardless. | KP art. 180 §15, §17; U art. 29 ust. 9–10, 31 ust. 3h; P p.32 |
| Q-22 | Leave application content | Field lists per application type | R322 §2–§18, §21–§23 |
| Q-24 | Employer sick pay | See A-15 | KP art. 92 |
| Q-25 | Parental parts, notice periods | No minimum part length. Parts are counted by the number of applications, including the insured parent's benefit applications. Notice periods:<br>• parental: ≥ 21 days<br>• work combination: ≥ 21 days<br>• supplementary: ≥ 21 days before maternity leave ends<br>• takeover of part of maternity leave: ≥ 14 days<br>• mother's resignation: ≥ 7 days before returning to work<br>• paternity: ≥ 7 days<br>• maternity-terms leave: within 7 days of taking the child<br>• pre-birth maternity: ≥ 14 days (P) | KP art. 180 §8–9, 180² §4, 182¹d, 182¹e §2, 182³ §2, 183 §6; P p.27 |
| Q-27 | Simultaneous parental use | Allowed. The **combined total** may not exceed the dimension, so simultaneous use consumes the pool at double rate. | KP art. 182¹a §6–7; U art. 29a ust. 3 |
| Q-28 | Filing deadlines and limitation | A benefit claim lapses **6 months** after the last day of the period it covers (3 years if the payer or ZUS made an error; the clock is suspended for obstacles beyond the person's control). A small payer forwards documents to ZUS within 7 days. ZUS pays within 30 days of the last clarified fact. Funeral allowance for a stillbirth: 7000 zł, apply within 12 months of the burial. | U art. 61b ust. 5, 64, 67; P p.26, 34–35 |

## 7. Calculation engine (v0.3)

The deterministic engine (`@zpr/domain/engine`, see [calculation-engine.md](calculation-engine.md)) was implemented against the full provided texts of U, KP, R1316, R322, P and T, and re-checked against §6 above. Effects on this register:

- **Q-15 (rounding): still PARTIAL.** The engine rounds the basis to full grosze and each calculation line once, half up, from exact fractions (A-20). The sources do not state a rule for benefits; if ZUS confirms another rule, change `money` in the rule sets only.
- **Q-16 (temporal applicability): modelled.** Rule sets `2026.07-Z1`, `2026.10-Z1`, `2027.01-Z1` are selected by the day the right arises and applied to the whole period (A-12). Transitional provisions are still not in the extract.
- **Q-29 (external values): unchanged and enforced.** All four values are `null`; results that depend on them are `CALCULATED_LOWER_BOUND` / `CALCULATED_UPPER_BOUND` and carry a warning. They can be supplied per request with a cited source (`externalParameters`).
- **Q-30, Q-32, Q-33, Q-34:** implemented as stated in A-17, A-19 and the form versioning; Q-30 sends the case to manual review.
- **New engine assumptions A-20 … A-36** and **20 unsupported scenarios U-01 … U-20** are listed in [calculation-engine.md](calculation-engine.md) §9–10 and returned by `GET /api/v1/rulesets`. A test verifies that every one is documented.
- **A-25 (new, open):** the sources give each parent 9 exclusive weeks (KP art. 182¹a § 4) but do not say whether an uninsured or absent parent's share can be used by the other parent. The engine never lets one parent exceed pool − 9 weeks. Needs a ZUS answer before use with such families.
- **SC (sample cases): still not received.** The engine has no golden cases from ZUS; its tests use independently computed values (calculation-engine.md §8).
