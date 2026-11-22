# Audyt pipeline'u `/start` i propozycja przebudowy

Dokument etapu 1 (audyt). Opisuje stan zastany, wykorzystanie danych przez silnik
deterministyczny oraz zakres przebudowy. Nie zmienia zasad obliczeń ani
wersjonowanych zestawów reguł.

## 1. Co się dzieje dzisiaj

`/start` (`apps/web/app/start/page.tsx` + `apps/web/components/onboarding-wizard.tsx`)
to czteroetapowy formularz, który **nie liczy uprawnień**. Po kliknięciu
„Utwórz sprawę" wysyła dane do `POST /api/v1/onboarding`, zapisuje użytkownika,
profil, zatrudnienie, ubezpieczenie, zdarzenie rodzinne i sprawę w bazie, a
następnie pokazuje numer sprawy i odnośniki do kalkulatora, osi czasu i panelu.

Analiza uprawnień żyje w osobnym module:

- `/kalkulator` → `POST /api/v1/calculations` (uproszczony adapter `CalculatorInput`),
- `/api/v1/eligibility/evaluate`, `/benefits/calculate`, `/timeline`,
  `/documents/required` → pełny silnik `@zpr/domain/engine`,
- `/os-czasu` → planer z danymi z ostatniego zaakceptowanego importu,
- `/dokumenty` → analiza PDF, mapowanie potwierdzonych pól i silnik,
- `/panel` → podgląd spraw i obliczeń.

Skutek: użytkownik przechodzi przez formularz, dostaje „sprawę utworzoną", a
potem **drugi raz** wpisuje te same dane w kalkulatorze lub analizie dokumentu.

## 2. Aktualne pytania i zbierane dane

| Krok                     | Pola                                                                                            | Wymagane                  | Trafia do bazy                            | Używa silnik?                                                                                                       |
| ------------------------ | ----------------------------------------------------------------------------------------------- | ------------------------- | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| 1. Dane podstawowe       | `firstName`, `lastName`, `email`, `birthDate`, `city`                                           | imię, nazwisko, e-mail    | `users`, `user_profiles`                  | tylko `birthDate` jako potencjalny `birthYear` (dziś nie mapowany)                                                  |
| 2. Sytuacja rodzinna     | `eventType`, `childrenCount`, `expectedDueDate`, `eventDate`, `hasZaZyciem`, `isPremature`      | brak (poza liczbą dzieci) | `family_events`                           | `eventType`, daty, `childrenCount`, `hasZaZyciem`; `isPremature` **nie jest mapowany**                              |
| 3. Praca i ubezpieczenie | `employmentType`, `coverageMode`, `employerName`, `grossMonthlyIncomePln`, `insuranceStartDate` | dochód                    | `employment_records`, `insurance_periods` | `employmentType`, `coverageMode`, `grossMonthlyIncomePln`, `insuranceStartDate`; `employerName` tylko informacyjnie |
| 4. Zgody i podsumowanie  | `healthData`, `aiAssistant`, `documentProcessing`                                               | brak                      | `user_profiles` (zgody)                   | nie dotyczy                                                                                                         |

Uwagi:

- Wszystkie trzy zgody są domyślnie **zaznaczone** (`initialState`), mimo że
  dotyczy to danych zdrowotnych, asystenta AI i dokumentów. To niezgodne z
  zasadą rozdzielonych, świadomych zgód.
- Kreator zakłada domyślnie `EMPLOYMENT` i dochód `8000 zł` — osoba na zleceniu,
  działalności lub bez tytułu musi sama poprawić założenie.
- Brak pytań o drugiego rodzica, o zakończenie ubezpieczenia przed porodem,
  o podział urlopu, o „Za życiem” w zależności od scenariusza.
- `isPremature` jest zbierane, ale nigdzie nieużywane.
- Zgody nie są sprawdzane przy późniejszym użyciu asystenta/dokumentów w tym
  przepływie (asystent ma własną bramkę zgody; dokumenty mają własną).
- Numer sprawy jest jedynym sposobem powrotu; nie ma ekranu wyników ani
  profilu sprawy do porównania dokumentu.

## 3. Co realnie potrzebuje silnik

Pełny kontrakt to `assessmentInputSchema` (`packages/contracts/src/engine.ts`):

- `event`: `kind`, `expectedDueDate` / `birthDate` / `careTakingDate`,
  `childrenCount`, `zaZyciem`, `gestationalWeeksCompleted`,
  `lowestBirthWeightGrams`, `stillbirth`, daty adopcji/rodziny zastępczej;
- `parents[]`: rola, `insurance` (tytuł, chorobowe, daty, płatnik, dług,
  zakończenie tytułu, ryzyka), `basis` (`GROSS_MONTHLY`, `KNOWN_BASIS`,
  `MONTHLY_HISTORY`, `DECLARED_SHORT_INSURANCE`), `birthYear`;
- `plan`: opcja wypłaty, tygodnie przed porodem, części urlopu rodzicielskiego,
  urlop ojcowski;
- `providedDocuments`: kody już posiadanych dokumentów.

Silnik zwraca `COMPLETE` / `PARTIAL` / `MANUAL_REVIEW`, determinacje
`ELIGIBLE` / `CONDITIONAL` / `NEEDS_INPUT` / `NOT_ELIGIBLE` / `MANUAL_REVIEW`,
`missingEvidence`, `nextSteps`, `periods`, `timeline`, `totals`, `sources`,
`appliedRules`, `warnings`, `assumptions` i `unsupported`. To wystarcza do
zrealizowania ekranu wyników bez nowego silnika.

## 4. Pola zbędne, powtarzane lub mylące

- `city` — nie wpływa na uprawnienia; można je pominąć w kreatorze.
- `employerName` — nie jest potrzebne do obliczeń; zostaje jako opcjonalna
  informacja porządkowa.
- `isPremature` — zbierane bez mapowania; zastąpić pytaniem o tydzień ciąży i
  masę urodzeniową (fakty, których używa silnik).
- `coverageMode` — przy umowie o pracę jest zawsze obowiązkowe; pytać tylko przy
  zleceniu, działalności i „innej” formie.
- `grossMonthlyIncomePln` — niezbędne do kwot, ale może być nieznane; wtedy
  wynik ma być `PARTIAL`, a nie sztucznie wyliczony.
- `email` — potrzebny tylko do zapisania sprawy; nie może być wymagany do
  samej analizy.
- Zgody — nie mogą być jedną zbiorczą zgodą ani domyślnie zaznaczone.

## 5. Proponowana struktura

1. **Twoja sytuacja** — scenariusz: planowanie, ciąża, narodziny, trwający
   urlop/świadczenie, adopcja/rodzina zastępcza, sprawdzenie wniosku.
2. **Sytuacja rodzinna** — tylko pytania wynikające ze scenariusza: termin
   porodu, data urodzenia, liczba dzieci, daty adopcji, „Za życiem”,
   wcześniactwo, drugi rodzic.
3. **Praca i ubezpieczenie** — forma zatrudnienia bez założenia etatu; pytania o
   chorobowe tylko tam, gdzie jest dobrowolne; daty, płatnik, dług, koniec
   tytułu; dochód albo znana podstawa.
4. **Dodatkowe informacje** — wyłącznie fakty z mapowaniem na regułę: podział
   urlopu, opcja 81,5%, ryzyka (nowy tytuł w ciąży, podniesiona podstawa),
   dokumenty już posiadane.
5. **Analiza i wyniki** — podsumowanie odpowiedzi, deterministyczny silnik,
   status, uprawnienia, kwoty, braki, plan działania, dokumenty i przejście do
   analizy wniosku.

Zasady:

- odpowiedzi są zapamiętywane między krokami i w `sessionStorage`;
- prefill z mObywatela (symulacja) i z zaakceptowanego importu jest widoczny i
  edytowalny;
- każde pytanie ma `why` (dlaczego pytamy) i `engineField` (co zasila w silniku);
- warunki widoczności pytania są czystymi funkcjami w
  `packages/domain/src/situation`, testowalnymi bez Reacta;
- mapa odpowiedzi → `AssessmentRequest` również jest czystą funkcją domenową;
- analiza bez zapisywania sprawy; zapis jest osobnym, opcjonalnym krokiem;
- profil sprawy (`zpr:case-profile`) jest przekazywany do analizy dokumentu, aby
  nie pytać drugi raz o to samo i aby pokazać zgodności/rozbieżności.

## 6. Czego nie zmieniamy

- silnika `@zpr/domain/engine`, reguł, stawek, zaokrągleń i wersjonowanych
  rulesetów;
- statusów `COMPLETE` / `PARTIAL` / `MANUAL_REVIEW` i determinacji silnika;
- istniejących endpointów silnika (tylko z nich korzystamy);
- symulacji mObywatel/ZUS/e-ZLA/USC/PUE — pozostają oznaczone jako symulacja;
- rozdzielenia zgód na dane zdrowotne, asystenta i dokumenty.
