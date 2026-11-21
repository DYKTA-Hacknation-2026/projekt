# Requirements — Zasiłkowy Przewodnik Przyszłego Rodzica

Status: **v0.2** (stage 1 analysis + ZUS legal sources) · Date: 2026-11-21

## 0. Sources and conventions

| Code | Document | Notes |
|------|----------|-------|
| **T** | *ZUS – Pełna treść zadania konkursowego.pdf* (16 pages) | Cited as `T p.N` (page) and `T §N` (section 1–10 of the task) |
| **R** | *ZUS – Regulamin zadania konkursowego.pdf* (4 pages) | Cited as `R §N ust. M` |
| **U** | Ustawa zasiłkowa, Dz.U. 2026 poz. 854 (ZUS extract) | `U art. N ust. M` (added in v0.2) |
| **KP** | Kodeks pracy (ZUS extract) | `KP art. N §M` |
| **R1316** | Rozporządzenie of 27.09.2026 (Dz.U. 2026 poz. 1316), benefit documents | `R1316 §N` |
| **R322** | Rozporządzenie of 11.03.2025 (Dz.U. 2025 poz. 322), leave applications | `R322 §N` |
| **P** | ZUS *Poradnik dla rodziców i opiekunów dzieci* 2026 (legal status as of 2026-04-01) | `P p.N` (page of the guide) |

The precedence of the sources and the conflicts between them are covered in `legal-assumptions.md` §1 and §5.

Rules for this document:

- Every requirement has an ID and at least one source reference. A requirement with no source is labelled **[PROPOZYCJA]** (our own product proposal) and never counts as mandatory.
- Priority:
  - **M**: mandatory. The task says the tool "powinno zapewnić" or "powinien zawierać", or the requirement is formal or technical.
  - **R**: recommended. The task uses "rekomendujemy" or "preferowane".
  - **C**: competitive. This is an addition that is not required but supports the evaluation criteria.
- Legal rules are listed as **LR-xx** in §6:
  - LR-01…LR-82 come from the task text.
  - LR-100+ (§6.11) come from the statutes and regulations received in v0.2.
  - Where T and statute differ, the statute wins and the conflict is recorded (`legal-assumptions.md` §5).
- All user-facing content is in **Polish**. Engineering documents are in English and keep Polish legal terms verbatim.

## 1. Problem statement (T §2, p.10–11)

Pregnant women, people planning to become parents, and parents of newborns or newly adopted children have trouble getting complete, individualised information about their social-insurance entitlements. The root causes listed by ZUS are:

1. They don't know which rights they have, or how those rights can be lost or reduced.
2. Entitlements are hard to determine in special situations: stillbirth, premature birth, the mother's serious illness or death.
3. The benefit amount is hard to determine.
4. Procedures and documentation are complex.
5. Changes to employment conditions during pregnancy affect both the right to a benefit and its amount.
6. Parents don't use the flexibility to combine work and parenting, out of fear or ignorance.

ZUS currently learns about a birth only after it happens, so it cannot verify rights or amounts in advance (T p.2). The tool should move that verification **before** the birth.

**Target users** (T p.1, p.11):

- people planning parenthood
- pregnant women
- parents of a newborn
- adoptive parents
- non-professional foster families (*rodziny zastępcze niezawodowe*)

**Secondary stakeholders:** ZUS staff and contribution payers (*płatnicy składek*) who pay benefits.

**Key distinctions the product must keep clear** (T p.1):

- *płatnik*: the employing institution
- *ubezpieczony*: the person whose contributions are paid
- *świadczeniobiorca*: the person receiving the benefit

## 2. Expected result (T §3, p.12)

The tool must:

- Deliver relevant information about entitlements **simply and accessibly**.
- Support **informed decisions** about parenthood-related leave and the benefits attached to it.
- **Determine entitlements concretely**, based on the person's individual situation. That data can come from ZUS systems (simulated) or be entered by the user, for example the expected due date or the end date of employment.

## 3. Functional requirements

### 3.1 Information (T §3 a, g, h, i; p.12–14)

| ID | Requirement | Pri | Source |
|----|-------------|-----|--------|
| FR-INF-01 | Information on benefits during pregnancy: **zasiłek chorobowy**, **świadczenie rehabilitacyjne**, **zasiłek w wysokości zasiłku macierzyńskiego**. It must also state explicitly when the person has **no** right to a benefit. | M | T p.12 a) |
| FR-INF-02 | Information on **documents, deadlines and how to file** benefit applications. It must tell the user **where** to file (employer as *płatnik* vs ZUS), depending on the payer's status. | M | T p.13 g); T p.1 fn.1; T p.3, p.6 |
| FR-INF-03 | Information on **threats and risks**: losing the right to a benefit, or a change in its duration or amount. | M | T p.13 h); T p.9–10 §H |
| FR-INF-04 | Information on **charitable-only organisations** that support parents in special situations: death of a child, premature birth, miscarriage, birth of a seriously ill child. | M | T p.13 i); T p.14 |
| FR-INF-05 | **Redirects** to the official pages: www.zus.pl, gov.pl/web/rodzina/urlop-rodzicielski, pip.gov.pl/dla-pracodawcow/porady-prawne/rodzicielstwo. | M | T p.14 |
| FR-INF-06 | Explain the **special employment protection** (Kodeks pracy): pregnancy and parenthood leave, extension of fixed-term contracts to the birth date, and that this protection does not apply to non-employees. | M (part of h) | T p.10 §I |
| FR-INF-07 | Explain the roles *płatnik*, *ubezpieczony* and *świadczeniobiorca*, and the forms (ZAM, Z-3, Z-3a, ZAS-12, ZAS-53, e-ZLA). The explanation must account for the **ZUR/ZAO → ZAM merger and the Z-3b abolition from 2026-10-24**. | M (part of g) | T p.1, p.12 fn.3–5 |
| FR-INF-08 | Guidance must cover **complex situations**: stillbirth, death of a child, premature birth, hospitalisation, the mother's serious illness or death, abandonment of the child, and the mother being uninsured. | M | T p.2, p.6–7, p.11 |

### 3.2 Calculators (T §3 b–f, j; p.13)

ZUS **recommends** exposing all calculators as **one integrated calculator with selectable options** (T p.13). That recommendation is adopted as requirement FR-CALC-00.

| ID | Requirement | Pri | Source |
|----|-------------|-----|--------|
| FR-CALC-00 | One **integrated calculator** with selectable options that covers FR-CALC-01…07. | R → adopted | T p.13 |
| FR-CALC-01 | **Maternity benefit for both parents**: duration and amount. It must consider every circumstance that affects the duration (number of children, their age, the *„Za życiem”* certificate). | M | T p.13 b) |
| FR-CALC-02 | Maternity benefit when **parental leave is combined with work** (up to ½ FTE): duration (proportional extension) and amount. | M | T p.13 c); T p.9 §E |
| FR-CALC-03 | Simulation when **both parents** use childcare entitlements: split of parental leave, the 9-week non-transferable part, simultaneous or alternating use, transfer of maternity leave. Shows duration and amount. | M | T p.13 d); T p.7 |
| FR-CALC-04 | Maternity benefit for **adoptive parents** and **non-professional foster families**: duration and amount. | M | T p.13 e); T p.8–9 §D |
| FR-CALC-05 | Benefit amount from an **individual contribution basis** (*indywidualna podstawa wymiaru*): a simulation for a specific case from the ZUS sample sets. | M | T p.13 f) |
| FR-CALC-06 | Maternity benefit for **adoptive parents and foster families** (task item j). This duplicates e) but drops the word *niezawodowej*. **Resolved (Q-17):** professional foster families are excluded by statute (LR-120), so j) ≡ e). | M | T p.13 j) |
| FR-CALC-07 | **Sickness benefit in pregnancy** and **zasiłek w wysokości zasiłku macierzyńskiego**. The task does not list these as calculators explicitly, but a) asks for information on them, and amounts are needed to make that information concrete. | M (derived from a) | T p.12 a); T p.3–4 |
| FR-CALC-08 | The **payment option**: 100% + 70% vs **81.5%** for the whole period (the mother's application within 21 days of birth). | M (part of b) | T p.9 §G |
| FR-CALC-09 | Every calculation result shows: the duration as dates and weeks, the amount, the legal basis, the rule-set version, and its assumptions and missing data. | M (follows from "rzetelne informacje") | T p.1–2, p.12 |

### 3.3 Simulated integrations (T p.13–14 "Narzędzie powinno zapewnić możliwość")

All of these must be **simulated**. The UI must never present them as real government transactions.

| ID | Requirement | Pri | Source |
|----|-------------|-----|--------|
| FR-SIM-01 | **mObywatel login**, simulated. | M | T p.13 |
| FR-SIM-02 | **Fetching data from ZUS systems** (insurance periods, or no insurance), simulated, **or** the user entering the data themselves. | M | T p.13 |
| FR-SIM-03 | Displaying **contribution debt** (*zadłużenie z tytułu składek*) on the date the right to a benefit arises. This matters especially for self-employed people. A simulated certificate shows the debt amount. | M | T p.13 |
| FR-SIM-04 | A simulated **preview of e-ZLA** sick-leave certificates. | M | T p.13 |
| FR-SIM-05 | A simulated **PUE/eZUS** connection: asking ZUS a question, and checking the data on the insured person's account. | M | T p.13 |
| FR-SIM-06 | Simulated **filling-in of leave and benefit applications**, with optional simulated sending to the employer or ZUS. **Leave applications must be designed by us.** Benefit application templates come from zus.pl. | M | T p.13 |
| FR-SIM-07 | A simulated application for a **full or abridged birth-certificate copy** (*odpis zupełny/skrócony aktu urodzenia*). | M | T p.14 |

### 3.4 Administration (T p.14)

| ID | Requirement | Pri | Source |
|----|-------------|-----|--------|
| FR-ADM-01 | An **admin panel** for changing parameters (e.g. the maternity benefit percentage, the maximum duration) when the law changes. | M | T p.14 |
| FR-ADM-02 | The system is designed so new functions can be added or improved through configuration. We interpret this as versioned rule sets, content management (knowledge base, charities, links, checklists), and feature flags. | M | T p.14 |

### 3.5 Demo and testability (T §4–6, p.14–15)

| ID | Requirement | Pri | Source |
|----|-------------|-----|--------|
| FR-DEMO-01 | The public demo site lets users **test selected attached sample cases (PDF forms)**: verify whether a person is insured, and check the calculator. | M | T p.14 |
| FR-DEMO-02 | The site supports **upload or selection** of selected sample applications. The jury will check that calculations based on them are correct. | M | T p.15 §6 |
| FR-DEMO-03 | Calculations reproduce the outcome recorded in each ZUS sample case: granted or not, and the amount. These cases become our golden tests. | M (implied) | T p.11, p.15 |

### 3.6 Product modules requested by the team [PROPOZYCJA unless mapped above]

| ID | Module | Maps to |
|----|--------|---------|
| FR-PRD-01 | User onboarding and profile: household, parents, pregnancy or child, employment titles | FR-SIM-01/02, §3 "indywidualna sytuacja" |
| FR-PRD-02 | Insurance status and eligibility assessment | FR-INF-01, FR-DEMO-01 |
| FR-PRD-03 | Deterministic benefit calculation engine | FR-CALC-* |
| FR-PRD-04 | Unified parental benefits calculator | FR-CALC-00 |
| FR-PRD-05 | Parental leave scenario planner (timeline, both parents, return to work) | FR-CALC-02/03, T p.11 "planowania powrotu do pracy" |
| FR-PRD-06 | Document upload, extraction and validation | FR-DEMO-01/02 |
| FR-PRD-07 | AI conversational assistant with RAG | C (AI allowed, T §9; must be disclosed) |
| FR-PRD-08 | Knowledge base management | FR-ADM-02, FR-PRD-07 |
| FR-PRD-09 | Personalised checklists and timelines | FR-INF-02 |
| FR-PRD-10 | Simulated government integrations | FR-SIM-* |
| FR-PRD-11 | Administrative rule configuration | FR-ADM-01 |

## 4. Non-functional and technical requirements

| ID | Requirement | Pri | Source |
|----|-------------|-----|--------|
| NFR-01 | A modern, functional web application suitable for real-world use, built with **Responsive Web Design (RWD)** | M | T §5 p.15 |
| NFR-02 | **Fully responsive** UI on desktop and mobile | M | T §4 p.14 |
| NFR-03 | Works in a test environment and has **production deployment potential** | M | T §5 |
| NFR-04 | Frontend: React/Next.js (preferred). Backend: JS/Python/C# (preferred). **REST API** between backend and presentation (recommended). | R → adopted | T §5 |
| NFR-05 | **Code structure** will be reviewed by the jury. A clean modular repository is required. | M | T §6 |
| NFR-06 | All user-facing content is in Polish | M (team) | brief |
| NFR-07 | **WCAG 2.2 AA** | M (team) | brief. Also supports "przystępny sposób" (T p.12) and R §4 ust.7 d) |
| NFR-08 | Deterministic, versioned rules for eligibility and money. AI never decides eligibility or amounts. | M (team) | brief; T p.12 "rzetelne" |
| NFR-09 | Privacy: minimal storage of personal data. Pregnancy and e-ZLA data are **health data** (RODO art. 9). | M (team) | brief |
| NFR-10 | Every simulated operation is labelled **„Symulacja”** in the UI and in API payloads | M | T p.13–14 |
| NFR-11 | Calculations are reproducible: input snapshot + rule-set version → identical output | M (team) | FR-DEMO-03 |
| NFR-12 | Performance: calculator response p95 < 300 ms; assistant first token < 3 s (target) | C | [PROPOZYCJA] |

## 5. Formal delivery requirements (T §4 p.14; R)

| ID | Deliverable | Pri | Source |
|----|-------------|-----|--------|
| DEL-01 | Detailed **project description and title** | M | T §4 |
| DEL-02 | **Presentation of at most 10 slides** | M | T §4 |
| DEL-03 | **Video of at most 3 minutes**, in an open, accessible repository (link), showing the project and its use. It may be part of the application. | M | T §4 |
| DEL-04 | **Code repository** | M | T §4 |
| DEL-05 | **Screenshots** | M | T §4 |
| DEL-06 | **Links to the live demo website** that supports testing the sample cases (see FR-DEMO-01) | M | T §4 |
| DEL-07 | Graphic materials and other project elements | M | T §4 |
| DEL-08 | **Disclosure of which functions use AI** (in the app and the description) | M | T §4, T §9 |
| DEL-09 | **Disclosure of external solutions** (third-party libraries, services, models) in the presentation | M | R §4 ust.1 |
| DEL-10 | The solution must be **free of legal defects** and must not infringe third-party rights. This covers dependency licences, fonts, images and model terms. | M | R §4 ust.2 |
| DEL-11 | The winner must be able to **transfer economic copyright**, including source code and documentation, under a written agreement. All co-authors sign. Licences must therefore allow that transfer and further modification. | M | R §4 ust.3–8, §3 ust.5 |
| DEL-12 | The **ZUS sample-case documents must not be copied or distributed**. They are for HackNation use only. | M (constraint) | T p.12 |

## 6. Legal rules stated in the task (verified source = T)

These are the **only** legal facts that the rule engine may treat as `verified`. Any other parameter is `unverified` until it is backed by a ZUS-provided source (see `legal-assumptions.md`).

### 6.1 Payer and routing

| ID | Rule | Source |
|----|------|--------|
| LR-01 | The **płatnik** (employer) determines the right to and amount of benefits, and pays them, if it reports **more than 20 insured persons** to sickness insurance. The count is taken on **30 November of the previous year**. If it reported nobody on that date, the count is taken for the first month in which it did report. Otherwise **ZUS** pays. Legal basis: art. 61 ust. 1 pkt 1 ustawy zasiłkowej. | T p.1 fn.1 |
| LR-02 | e-ZLA is electronic and goes directly to ZUS and to the employer's PUE/eZUS profile. Pregnancy is marked with letter code **„B”**. | T p.3 |
| LR-03 | Sickness-benefit routing. **Employee:** inform the employer. An authorised payer pays based on the e-ZLA. A non-authorised payer sends **Z-3** (or **ZAS-12** for a further period) to ZUS. **Umowa zlecenia:** refrain from work and file the documents with ZUS or the payer. A non-authorised payer sends **Z-3a**. **Non-employee (e.g. self-employed):** file **ZAS-53** with ZUS. | T p.3 |
| LR-04 | Maternity-benefit routing. **Employee:** apply to the employer for maternity leave. A single application can cover maternity and parental leave. An authorised employer pays; otherwise it sends **Z-3** to ZUS. **Non-employee:** file **ZAM** with ZUS. **Zlecenie:** file ZAM with the authorised payer or with ZUS; the payer sends **Z-3a** to ZUS. Attach documents that are necessary (e.g. a stillbirth certificate) or that affect the duration (a *„Za życiem”* certificate, or a hospital certificate for supplementary leave). | T p.6 |
| LR-05 | Forms: since **2026-10-24**, **ZUR** and **ZAO** are merged into **ZAM**, and **Z-3b** is abolished. | T p.12 fn.3–5 |

### 6.2 Sickness benefit in pregnancy

| ID | Rule | Source |
|----|------|--------|
| LR-10 | The person must be covered by sickness insurance. **Compulsory** insurance (e.g. an employment contract) gives the right after **30 days of uninterrupted insurance**, *co do zasady*. **Voluntary** insurance (e.g. zlecenie, business activity) gives the right after **90 days of insurance**, *co do zasady*. | T p.3 |
| LR-11 | For an **employee**, the employer pays *wynagrodzenie chorobowe* for the first **33 days** of incapacity in a calendar year (**14 days** for employees aged 50+). The *zasiłek chorobowy* is paid from the next day. | T p.3–4 |
| LR-12 | For a **non-employee**, the benefit is paid from the **first day** of incapacity. | T p.4 |
| LR-13 | The sickness benefit in pregnancy is **100% of the basis** when the e-ZLA carries code **„B”**. | T p.4 |
| LR-14 | It is paid for the incapacity period stated in the e-ZLA, up to a maximum *okres zasiłkowy* of **270 days**. | T p.4 |
| LR-15 | If the incapacity lasts until the birth, the maternity leave or maternity benefit starts **after the birth**. | T p.4 |

### 6.3 Zasiłek w wysokości zasiłku macierzyńskiego

| ID | Rule | Source |
|----|------|--------|
| LR-20 | Applies when a **pregnant** woman's employment contract was terminated during pregnancy because of the employer's **bankruptcy, liquidation or death**, and no other employment was provided. It also applies when the termination **violated the law**, confirmed by a **final court judgment** (*prawomocny wyrok*). It is paid **until the birth**, after insurance has ended, at **100% of the basis**. **⚠ Superseded by LR-121 (conflict D-07):** under the statute, unlawful termination gives maternity benefit *after* the birth, not this pre-birth benefit. | T p.4 |

### 6.4 Maternity benefit (*zasiłek macierzyński*)

| ID | Rule | Source |
|----|------|--------|
| LR-30 | **Employees** receive it for the period of leave granted. **Non-employees** receive it for the period corresponding to the leave; no leave is granted to them. Duration and amount follow the same rules for both groups. | T p.4–5 |
| LR-31 | Periods covered. **Birth:** maternity, supplementary maternity, parental and paternity leave. **Taking a child into care:** leave on the terms of maternity leave, and parental leave. | T p.5 |
| LR-32 | Maternity leave may start up to **6 weeks before the expected due date**. This needs a medical certificate of the due date. Alternatively, the mother can work until the birth. | T p.5 |
| LR-33 | The maternity-leave duration depends on the **number of children born in one birth**: **20 weeks for one child**. **Resolved:** see LR-123 (20/31/33/35/37). | T p.5 |
| LR-34 | The **first 14 weeks after birth** must be used by the mother personally (exceptions in LR-41). | T p.5 |
| LR-35 | Parental leave depends on the **number of children** and on the ***„Za życiem”*** certificate, which extends it. It is used in one go or in **at most 5 parts**, and no later than the **end of the calendar year in which the child turns 6**. | T p.5–7 |
| LR-36 | **Stillbirth, or the child's death before 8 weeks of age:** maternity benefit for **8 weeks after birth**, but **not shorter than 7 days from the death**. **Death after 8 weeks of age:** the right is kept for **7 days from the death**. With multiple births, the duration follows the **number of surviving children**. | T p.6 |
| LR-37 | **Supplementary maternity leave** (*uzupełniający urlop macierzyński*): for the mother **or** the father, never both. It applies to a **premature birth**, or a term birth where the child **needs hospitalisation**. It is granted in one go, cannot be split, and starts **directly after maternity leave**. A hospital certificate is required (LR-04). **Resolved:** length rules in LR-126. | T p.8, p.6 |

### 6.5 Father

| ID | Rule | Source |
|----|------|--------|
| LR-40 | The father may take over part of the maternity leave after the mother has used at least **14 weeks**. The mother resigns from the rest, or applies for 14 weeks only. The father's leave starts **immediately after** the mother's. | T p.7 |
| LR-41 | The father may take over **before 14 weeks** in situations defined in the Kodeks pracy and the ustawa zasiłkowa. The task gives a non-exhaustive list (*„m.in.”*): the mother has a ruling of incapacity for independent existence; the mother is in a hospital or medical facility that prevents her from caring for the child; the mother died or abandoned the child. The father takes over for the hospitalisation period or for the remaining part. | T p.7 |
| LR-42 | Parents may use parental leave **simultaneously or alternately**, or the father after the mother. The father is also entitled to parental benefit when the mother was **not insured on the birth date** and did not draw maternity benefit. | T p.7 |
| LR-43 | Each parent has an **exclusive, non-transferable 9-week** share of the common parental pool of **41 or 43 weeks**. It can be split into **at most 5 parts**, until the end of the year the child turns 6. | T p.7 |
| LR-44 | **Paternity leave** is the father's exclusive right as an *employee*, for a biological or adoptive child. It is also available if he started work after the birth (child under 12 months), and when the mother is not covered by sickness insurance. **Extended by LR-133:** insured non-employee fathers also receive the benefit (conflict D-08). | T p.8 |
| LR-45 | Paternity leave is at most **14 calendar days**, weekends included. It is used in one go or in **two parts of at least 7 days**. Twins do **not** extend it. | T p.8 |
| LR-46 | Deadline: until the child is **12 months** old. **Adoption:** within **12 months of the adoption becoming final**, and no later than the child's **14th birthday**. After that the right **lapses**. | T p.8 |

### 6.6 Adoption and foster care

| ID | Rule | Source |
|----|------|--------|
| LR-50 | Entitled: an insured person who took a child into care as a **non-professional foster family**, or who took a child and **applied to the court** for adoption. | T p.8 |
| LR-51 | **Leave on the terms of maternity leave**: **foster family** — child up to **7 years**, or up to **10** with deferred schooling. **Adoption application** — child up to **14 years**. | T p.8–9 |
| LR-52 | Parental leave applies as for a birth, taking the child's age into account. | T p.9 |

### 6.7 Combining work with parental leave

| ID | Rule | Source |
|----|------|--------|
| LR-55 | An **employee** may work for the employer that granted the leave, for **no more than ½ of full time**. The leave is granted for the remaining part, and is **extended proportionally**. Maximum limits are set in the Kodeks pracy. Benefit is paid for the extended period. **Resolved:** formula in LR-128; amount reduction in LR-131. | T p.9 |

### 6.8 Amounts

| ID | Rule | Source |
|----|------|--------|
| LR-60 | **100%** of the basis: maternity leave, leave on the terms of maternity leave, supplementary maternity leave, and paternity leave. | T p.9 |
| LR-61 | **70%** of the basis: parental leave. | T p.9 |
| LR-62 | **81.5%** for the **whole** period of maternity leave, leave on the terms of maternity leave, and parental leave, if the insured mother files a **written application within 21 days after the birth** for the full duration. | T p.9 |
| LR-63 | The duration of the maternity benefit follows from the leave lengths in the Kodeks pracy. **Resolved:** durations are in LR-123…129. | T p.9 §F |

### 6.9 Risks (to surface as warnings)

| ID | Rule | Source |
|----|------|--------|
| LR-70 | A **sham contract or business activity** (*dla pozoru*) may lead to a ZUS decision on non-coverage, which means no benefits. | T p.9–10 |
| LR-71 | **Raising the contribution basis during pregnancy** solely to obtain higher benefits may lead to a ZUS decision setting a lower basis. | T p.10 |
| LR-72 | **No sickness insurance on the birth date**: for example, not registering for voluntary insurance, or ending employment, business activity or a zlecenie before the birth (deregistration). | T p.10 |

### 6.10 Employment protection

| ID | Rule | Source |
|----|------|--------|
| LR-80 | **Employment protection** (KP) applies during pregnancy and maternity leave, and from the date an application for any parenthood leave is filed until that leave ends. During this time the employer may not prepare or carry out termination, except dismissal without notice for the employee's fault with trade-union consent. | T p.10 |
| LR-81 | A **fixed-term** or **probation contract longer than 1 month** that would end after the **3rd month of pregnancy** is extended to the birth date. | T p.10 |
| LR-82 | This protection does **not** apply to non-employees (e.g. self-employed). | T p.10 |

### 6.11 Rules from the statutes and regulations (v0.2, status VERIFIED-ZUS)

These rules refine or complete LR-01…82. Where an LR-1xx rule conflicts with an earlier LR, it is marked ⚠.

#### Coverage and sickness

| ID | Rule | Source |
|----|------|--------|
| LR-100 | Waiting period: 30 days of **uninterrupted** compulsory insurance, or 90 days of voluntary insurance. Earlier periods count if the break was ≤ 30 days, or caused by parental leave (*wychowawczy*), unpaid leave or military service. | U art. 4 ust. 1–2 |
| LR-101 | Day-1 right (no waiting period) for:<br>• graduates insured within 90 days of finishing school, university or doctoral school<br>• a commuting accident<br>• compulsory insured with ≥ 10 years of earlier compulsory insurance<br>• MPs and senators<br>• certain customs officers | U art. 4 ust. 3 |
| LR-102 | Sickness benefit after the title ends: incapacity of ≥ 30 days without a break, starting ≤ 14 days after the title ended (3 months for some diseases). It is paid for at most 91 days, **except in pregnancy**. | U art. 7, art. 8 ust. 2 |
| LR-103 | *Okres zasiłkowy*: 182 days in general, **270 days if the incapacity falls in pregnancy**. Periods with breaks ≤ 60 days aggregate, but pre-break periods are not counted if the post-break incapacity falls in pregnancy. Waiting periods are not counted. **From 2027-01-01**, one period applies across all insurance titles. | U art. 8–9; P p.24 |
| LR-104 | Sickness benefit rates: 80% in general; **100% in pregnancy** (e-ZLA code „B”). It is paid for every calendar day. A month counts as 30 days. Code „B” is omitted from the e-ZLA at the insured person's written request. | U art. 11, art. 57 |
| LR-105 | No sickness benefit during unpaid leave, parental leave (*wychowawczy*), custody, or a justified absence under KP art. 63² §8. It is lost for the whole leave if the person does paid work or activity inconsistent with the leave. It is lost if the certificate is forged. | U art. 12, 17 |
| LR-106 | *Wynagrodzenie chorobowe* (employee): the first 33 days per calendar year (14 days from the year after the employee turns 50). **100% in pregnancy**, otherwise 80%. Same basis rules as the sickness benefit. Not due when there is no right to sickness benefit. Not paid to the voluntary insured. | KP art. 92; P p.23 |
| LR-107 | *Świadczenie rehabilitacyjne*: after the sickness benefit is exhausted and recovery is likely; at most 12 months; ZUS doctor's decision. 90% of the basis for 3 months, then 75%, or **100% if in pregnancy**. The basis is indexed quarterly. | U art. 18–19 |

#### Debt and payment

| ID | Rule | Source |
|----|------|--------|
| LR-108 | **Debt rule** (self-employed, cooperating persons, clergy, seafarers): debt over **1% of the minimum wage** on the date the right arises means no sickness, rehabilitation, maternity or care benefit until it is fully repaid. If it is not repaid within **6 months**, the right expires. Payment comes ≤ 60 days after repayment. | U art. 2a, 64 ust. 3; P p.24 |
| LR-109 | Who pays:<br>• the payer, if it reports > 20 insured (as of 30.11 of the previous year)<br>• otherwise ZUS<br>• **always ZUS** for the self-employed and cooperating persons, clergy, benefits after the title ends, and foreign employers<br>ZUS continues a payment it started past 31.12. | U art. 61 |
| LR-110 | The claim **expires 6 months** after the last day of the benefit period. It is 3 years if the payer or ZUS erred. Obstacles beyond the person's control suspend the clock. A small payer forwards documents to ZUS ≤ 7 days after receiving them. Payment ≤ 30 days after the last fact is clarified. | U art. 61b ust. 5, 64, 67 |
| LR-111 | Applications to ZUS are filed on paper or electronically: PUE/eZUS, qualified signature, trusted profile (*podpis zaufany*) or personal signature. For a child with a *„Za życiem”* certificate, a statement that the child holds it is attached. | U art. 61b (in force from 2026-07-01) |

#### Benefit basis

| ID | Rule | Source |
|----|------|--------|
| LR-112 | **Basis for an employee:** the average monthly *wynagrodzenie* (gross, minus the employee's social contributions; **13.71%** per P) for the **12 calendar months** before the month the right arises. If insured for less than that, use the full months of insurance. Exclude months with < ½ of the required time worked (justified absence) and fill in the months with ≥ ½. The daily basis is 1/30. | U art. 3 pkt 3, 36, 38; P p.24 |
| LR-113 | Employee started less than a month ago: use the contractual or hypothetical full-month pay. A change of working time in the reference period: use the pay for the new working time. Bonuses: monthly as paid; quarterly or annual at 1/12. | U art. 37, 40, 42 |
| LR-114 | The basis is **not recomputed** if the break between benefits is < 1 calendar month. | U art. 43; P p.24 |
| LR-115 | **Minimum basis** (full-time employee): the minimum wage minus 13.71%. **Maximum** after the title ends: 100% of the average wage. That cap applies only to sickness and rehabilitation benefits. | U art. 45–47 |
| LR-116 | **Basis for a non-employee:** the average monthly *przychód* = the sickness contribution basis minus 13.71%, over 12 months. Consecutive titles of the same kind count as uninterrupted. | U art. 3 pkt 4, 48; P p.25 |
| LR-117 | Non-employee on a **declared** basis, insured < 12 months: the average of the lowest contribution basis (after the deduction) plus 1/12 × the average excess declared × the number of full months. Earlier titles count if the break was ≤ 30 days (max 12 months). | U art. 48a |
| LR-118 | Non-employee whose incapacity started in the first month: the lowest contribution basis (declared payers), or the contract amount (zlecenie). Months with < ½ of the month worked because of a benefit are excluded. | U art. 49–50 |
| LR-119 | The basis rules apply to maternity benefit, *zasiłek w wysokości zasiłku macierzyńskiego* and rehabilitation benefit. The maternity basis before birth is the same as that of a preceding sickness benefit. | U art. 47, 52; P p.27 |

#### Maternity benefit: entitlement

| ID | Rule | Source |
|----|------|--------|
| LR-120 | Maternity benefit needs sickness insurance **on the day the right arises**: the birth, or the date the child is taken in. Periods of parental leave (*wychowawczy*) also count. Adoption: child up to age 14 with a court application. **Non-professional** foster family: child up to age 7 (10 with deferred schooling). **Professional foster families are excluded.** | U art. 29 ust. 1–2; KP art. 183 §1; P p.29 |
| LR-121 | **⚠ Maternity benefit after insurance ended in pregnancy** applies if the end was due to the employer's death, bankruptcy or liquidation, **or** an unlawful termination confirmed by a final judgment. **Zasiłek w wysokości zasiłku macierzyńskiego until the birth** applies **only** to employees whose job ended for the employer's death, bankruptcy or liquidation and who were not given other work (overrides LR-20, conflict D-07). Paid by ZUS. | U art. 30 ust. 1, 3; R1316 §15, §17 |
| LR-122 | A fixed-term contract extended to the birth date (LR-81) gives maternity benefit after insurance ends. | U art. 30 ust. 4 |

#### Maternity benefit: duration

| ID | Rule | Source |
|----|------|--------|
| LR-123 | **Maternity leave:** 20 / 31 / 33 / 35 / 37 weeks for 1 / 2 / 3 / 4 / ≥ 5 children. Up to 6 weeks may be used before the due date. If none is used before, day 1 is the birth date. 1 week = 7 calendar days. | KP art. 180 §1–3, 183¹ |
| LR-124 | **Father or other family member taking over maternity leave.** The total may never exceed the LR-123 dimension:<br>• the mother resigns after ≥ 14 weeks (≥ 7 days' notice)<br>• the mother has an incapacity ruling (after ≥ 8 weeks)<br>• the mother is hospitalised after ≥ 8 weeks (for the duration of the stay)<br>• the mother dies<br>• the mother abandons the child (after ≥ 8 weeks)<br>• an uninsured mother dies, abandons the child or has an incapacity ruling<br>• an uninsured mother takes a job of ≥ ½ time (while it lasts) | KP art. 180 §4–17; U art. 29 ust. 3–10, 29a ust. 2 |
| LR-125 | If the child needs hospital care, the mother who used 8 weeks may use the rest after the child leaves hospital. If the child is abandoned or placed in care, maternity leave ends but is at least 8 weeks after the birth. | KP art. 181–182 |
| LR-126 | **Supplementary maternity leave:** one week per week of the child's hospital stay:<br>(a) born < 28 weeks of pregnancy or ≤ 1000 g → stays until the end of week 15<br>(b) born 28–37 weeks and > 1000 g → until the end of week 8<br>(c) born ≥ 37 weeks → stays from day 5 to the end of week 8, if ≥ 2 consecutive days with the first in days 5–28<br>Stays are summed and part weeks round up. Multiples: the lowest weight and the longest stay. Applies to adoption or foster care if the stay was after the child was taken in. | KP art. 180², 183 §3¹ |
| LR-127 | **Parental pool:** 41 weeks (1 child) or 43 weeks (2+). With *„Za życiem”*: 65 / 67. Each parent has 9 non-transferable weeks; using ≥ 9 weeks consumes them. It can be used simultaneously, but the combined total is ≤ the pool. At most 5 parts, until the end of the year the child turns 6. Parts are counted by applications, including ZUS applications. | KP art. 182¹a, 182¹c, 182¹d; U art. 29a ust. 3 |
| LR-128 | **Work + parental leave** (employee, at the granting employer, ≤ ½ time): the leave extends by weeks × fraction, capped at 82 / 86 weeks (130 / 134 with *„Za życiem”*). A non-whole week is granted in days, dropping part days. If the extension is also combined with work: extension / (1 − fraction). The employer may refuse for organisational reasons (7 days to answer). | KP art. 182¹e–f |
| LR-129 | **Adoption and foster:** leave on the terms of maternity leave is 20 / 31 / 33 / 35 / 37 weeks by the number of children, capped at the child's age (foster 7 or 10; adoption 14). Parental leave is 41 / 43 weeks, or **38** in the §3 case; with *„Za życiem”* 65 / 67, or 62. The §3 case guarantees 9 weeks (Q-30). If adoption follows foster care, the leave already used is deducted. | KP art. 183 |

#### Maternity benefit: amount

| ID | Rule | Source |
|----|------|--------|
| LR-130 | **Rates:**<br>• 100%: maternity, maternity-terms, supplementary, paternity<br>• 70%: parental<br>• **81.5%** for the whole maternity (or maternity-terms) + parental period if the mother applies in writing ≤ 21 days after the birth (adoption or foster: ≤ 21 days after taking the child)<br>• the other parent's 9 weeks are **always 70%**<br>• shared parental keeps 81.5%<br>• no parental day in the child's first year → parental at 70% + a one-off top-up of maternity to 100% on request<br>Pre-birth maternity is always 100%. | U art. 30a, 31 ust. 1–4; P p.33 |
| LR-131 | **Combining work:** the maternity benefit is **reduced proportionally to the working time**. | U art. 31 ust. 4a |
| LR-132 | **Minimum amount:** if the monthly maternity benefit is below the *świadczenie rodzicielskie* amount, it is raised to that amount. Per P, the comparison is made after the PIT advance. With several titles, the person picks the payer of the top-up (ZUS if one of the payers is ZUS). The amount value comes from Q-29. | U art. 31 ust. 3a–3c, 62 ust. 4–6; P p.19; R1316 §28 |

#### Paternity

| ID | Rule | Source |
|----|------|--------|
| LR-133 | **Paternity:** up to 2 weeks, in one go or 2 parts of ≥ 1 week each. It must be used by the time the child is 12 months old, or within 12 months of the adoption becoming final (child ≤ 14). Employees apply ≥ 7 days before. **Insured non-employee fathers** receive the benefit for the corresponding period and file a request before the start. | KP art. 182³; R1316 §33 |

#### Applications and documents

| ID | Rule | Source |
|----|------|--------|
| LR-134 | **Employee applications to the employer:**<br>• takeover of part of maternity leave: ≥ 14 days before<br>• parental leave: ≥ 21 days before<br>• supplementary leave: ≥ 21 days before maternity leave ends<br>• paternity: ≥ 7 days<br>• maternity-terms leave: within 7 days of taking the child (starts ≤ 21 days after)<br>• resignation: ≥ 7 days before returning<br>• work combination: ≥ 21 days<br>The content of each application is set by R322. | KP art. 180 §8–9, 180² §4, 182¹d, 182¹e, 182³ §2, 183 §6; R322 |
| LR-135 | **Documents (benefit side).** By case: due-date certificate, birth-certificate copy, stillbirth certificate, court documents for adoption or foster care, deferred-schooling decision, hospital certificate, statement from the other parent, statement on the *„Za życiem”* certificate, payer certificates (Z-3 / Z-3a field lists).<br>When ZUS pays, **no birth-certificate copy is needed**: ZUS fetches it from the civil registry. | R1316 §12–33, annexes 2, 3, 6 |
| LR-136 | **Stillbirth:** funeral allowance of **7000 zł** (form Z-12, ≤ 12 months after the burial), regardless of the length of the pregnancy. | P p.34–35 |

## 7. Evaluation criteria (T §8 p.16)

| Criterion | Weight | Primary levers |
|-----------|--------|----------------|
| Związek z wyzwaniem (relevance to the challenge) | 25% | Full coverage of a)–j), simulations, special cases, correct sample-case calculations |
| Pomysł (idea) | 20% | Pre-birth verification, planner, "dlaczego?" explanations, assistant |
| Oryginalność (originality) | 15% | Two-parent timeline planner, explainable rules, sensitive mode for loss |
| Kompletność projektu i UX | 25% | Integrated calculator, RWD, a11y, polished demo, all deliverables |
| Potencjał wdrożeniowy (deployment potential) | 15% | Clean architecture, versioned rules, admin panel, REST, Docker, tests |

How judging works:

- The jury may shortlist **up to 3 teams to present**, and the winner is chosen from them (R §2 ust.7).
- The jury's decisions are final (R §2 ust.6).
- The prize is 30 000 zł gross (R §3).

## 8. Constraints and context

| ID | Constraint | Source |
|----|------------|--------|
| CON-01 | AI may be used both in building the app and in the app itself, but its scope must be stated in the description | T §9 |
| CON-02 | The winning project is the inspiration for the final deployment, so prefer production-viable patterns over demo hacks | T §9 |
| CON-03 | The sample cases are anonymised and confidential (no copying or distribution). They conflict with the requirements for a public repository and demo; see Q-19. | T p.12, p.14–15 |
| CON-04 | The legal acts cited are the consolidated texts of 2026 (Dz.U. 2026 poz. 854, 1245, 1316; Dz.U. 2025 poz. 322). Engineers must not import rule details from memory of older law versions. | T p.2 |
| CON-05 | ZUS materials. **Received (v0.2):** the regulations extract (U, KP, R1316, R322) and the *Poradnik* 2026 (P), stored git-ignored in `fixtures/private/sources/`. **Still missing:** the *załącznik* table (largely covered by KP/U) and the **sample cases**. | T p.11, p.15 §7 |
| CON-07 | The legal text changes over time. U amendments take effect on 2026-07-01 (art. 61b) and **2027-01-01** (art. 9 ust. 4, art. 17 ust. 1d–1e). Rule sets must be versioned by effective date (FR-ADM-01). | U footnotes 3–11 |
| CON-06 | Contact: ZUS mentors at the stand or on Discord; in an emergency, dr Wojciech Janek | T §10 |

## 9. Mandatory vs. competitive scope

**Mandatory (MVP must ship):**

- FR-INF-01…08
- FR-CALC-00…09
- FR-SIM-01…07
- FR-ADM-01…02
- FR-DEMO-01…03
- NFR-01…11
- DEL-01…12

**Competitive additions (ranked by expected score impact ÷ effort):**

1. **Two-parent leave timeline planner** with drag/adjust and live recalculation. It strengthens FR-CALC-03 and "planowanie powrotu do pracy".
2. **"Dlaczego?" explanation trace** on every result: rule ID, legal basis and source quote.
3. **RAG assistant** with citations and tool calls into the deterministic engine. It is disclosed as AI (DEL-08).
4. **Pre-birth readiness check**: a risk scan (LR-70…72, insurance on the due date, waiting periods, debt) with a personalised checklist and deadlines (e.g. 21 days for 81.5%, 12 months for paternity leave).
5. **Sensitive mode** for loss scenarios: tone, hidden promotional UI, direct links to charities.
6. **Calendar export (.ics)** of deadlines, and a **PDF summary** of the plan.
7. **Comparison view**: 100%/70% vs 81.5%, and mother-only vs shared.
8. **Plain-language mode** with a glossary of terms.
