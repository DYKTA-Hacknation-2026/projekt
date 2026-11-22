# Kreator `/start` — przebudowany pipeline

Uzupełnienie audytu (`docs/start-pipeline-audit.md`) o stan po przebudowie.

## Przepływ

1. **Twoja sytuacja** — scenariusz: planowanie, ciąża, narodziny, trwający
   urlop/świadczenie, adopcja/rodzina zastępcza, sprawdzenie wniosku.
2. **Sytuacja rodzinna** — pytania warunkowe: termin porodu albo data
   urodzenia, liczba dzieci, daty adopcji, „Za życiem”, wcześniactwo, drugi
   rodzic.
3. **Praca i ubezpieczenie** — forma zatrudnienia (etat, zlecenie, działalność,
   inna, brak tytułu), chorobowe tylko tam, gdzie jest dobrowolne, daty, płatnik,
   zaległości, koniec tytułu, dochód albo znana podstawa.
4. **Dodatkowe informacje** — wariant wypłaty, tygodnie przed porodem, plan
   drugiego rodzica, ryzyka (nowy tytuł w ciąży, podniesiona podstawa).
5. **Analiza i wyniki** — podsumowanie, deterministyczny silnik, status,
   uprawnienia, kwoty, braki, plan, dokumenty, zapis sprawy i przejście do
   analizy wniosku.

Bez zapisywania sprawy cały proces działa. Zapis jest osobnym, opcjonalnym
krokiem i tworzy numer sprawy w bazie demonstracyjnej.

## Gdzie jest logika

- `packages/domain/src/situation/types.ts` — odpowiedzi (tylko stringi, łatwe do
  zapisania w `sessionStorage`) i metadane pytań.
- `packages/domain/src/situation/questions.ts` — deklaratywne pytania z
  `visible`, `required`, `why`, `engineField`; brak logiki prawnej w React.
- `packages/domain/src/situation/mapping.ts` — jedyne mapowanie odpowiedzi na
  `AssessmentInput` silnika. Wymiar urlopu do planu pochodzi z wersjonowanego
  zestawu reguł obowiązującego w dniu zdarzenia (`ruleSetFor`).
- `packages/domain/src/situation/summary.ts` — czytelne podsumowanie faktów.
- `apps/web/components/situation-wizard.tsx` — renderer, walidacja kroków,
  wywołania API, zapis opcjonalny.
- `apps/web/components/situation/situation-results.tsx` — wyniki bez
  duplikowania reguł; etykiety statusów, kwoty tylko przy znanej podstawie,
  `PARTIAL` nigdy nie jest pokazywany jako pełne potwierdzenie.
- `packages/contracts/src/case-profile.ts` — profil sprawy w `sessionStorage`
  (wersja, scenariusz, request silnika, numer sprawy).
- `packages/documents/src/profile.ts` — uzupełnianie brakujących faktów z
  profilu i porównanie dokumentu z profilem.
- `apps/api/server/services/documents.ts` — `PUT /documents/:id/fields` przyjmuje
  opcjonalny `profile`; dokument ma pierwszeństwo, a odpowiedź zawiera
  `profileComparison`.

## Zmiany modelu danych

Bez zmian schematu bazy i bez migracji. Profil sprawy jest kontraktem
przeglądarkowym (`packages/contracts/src/case-profile.ts`, `sessionStorage`) i
służy tylko do przekazania faktów do analizy dokumentu. Zapis sprawy nadal
korzysta z istniejącego `POST /api/v1/onboarding`.

## Mapowanie na silnik

| Pytanie                                                | Fakt silnika                                                         |
| ------------------------------------------------------ | -------------------------------------------------------------------- |
| scenariusz                                             | `event.kind`                                                         |
| rola użytkownika                                       | `parents[].role` (matka albo ojciec/drugi rodzic)                    |
| termin porodu / data urodzenia / przyjęcie dziecka     | `event.expectedDueDate` / `event.birthDate` / `event.careTakingDate` |
| liczba dzieci                                          | `event.childrenCount`                                                |
| „Za życiem”                                            | `event.zaZyciem`                                                     |
| wcześniactwo                                           | `event.gestationalWeeksCompleted`, `event.lowestBirthWeightGrams`    |
| forma zatrudnienia                                     | `parents[*].insurance.title`                                         |
| ubezpieczenie chorobowe                                | `parents[*].insurance.sicknessInsurance`                             |
| dochód / znana podstawa                                | `parents[*].basis`                                                   |
| płatnik, dług, koniec tytułu                           | `parents[*].insurance.*`                                             |
| wariant wypłaty, tygodnie przed porodem, części urlopu | `plan.*`                                                             |
| drugi rodzic                                           | `parents[FATHER]`, `plan.parentalSegments`, `plan.paternity`         |

## Wyniki

Sekcje: podsumowanie sytuacji, możliwe uprawnienia, szacunkowe kwoty, plan
działania i terminy, dokumenty, brakujące informacje, sygnały ryzyka,
podstawy prawne i zastrzeżenia, „Masz już wypełniony wniosek?”.

Planer `/os-czasu` czyta ten sam profil sprawy (`zpr:case-profile`) i wstępnie
ustawia termin porodu, datę urodzenia, liczbę dzieci i „Za życiem”, więc
przejście z wyników do osi czasu nie wymaga ponownego wpisywania dat.

Zasady prezentacji:

- `COMPLETE` / `PARTIAL` / `MANUAL_REVIEW` pochodzą z silnika;
- `ELIGIBLE` przy wyniku `PARTIAL` jest opisane jako „wstępnie potwierdzone —
  wynik częściowy”;
- kwota pojawia się tylko przy `CALCULATED`, `CALCULATED_LOWER_BOUND` lub
  `CALCULATED_UPPER_BOUND`; przy `BASIS_UNKNOWN` / `NOT_CALCULATED` jest
  „Kwota nieustalona”;
- każda determinacja ma status, warunki, okres, stawkę, kwotę, podstawę prawną
  i identyfikator reguły;
- brakujące dane mają pytanie, wyjaśnienie wpływu i listę świadczeń, których
  dotyczą.

## Analiza dokumentu

Po analizie profil jest zapisywany w `sessionStorage` jako `zpr:case-profile`.
`/dokumenty` pokazuje, z jaką sprawą porównuje dokument. Po potwierdzeniu pól
`PUT /documents/:id/fields` dostaje profil:

1. wartości odczytane z dokumentu zawsze wygrywają;
2. brakujące fakty są uzupełniane z profilu (data, liczba dzieci, podstawa,
   ubezpieczenie, plan);
3. odpowiedź zawiera raport: zgodne, brakujące w dokumencie, rozbieżności,
   ręczna weryfikacja, sugerowane działania i zastrzeżenie, że nie jest to
   decyzja ZUS;
4. ekstrakcja i LLM (jeśli włączony) nadal wymagają potwierdzenia pól, a
   walidacja i obliczenia pozostają deterministyczne.

## Zgody i prywatność

- Wszystkie trzy zgody w zapisie sprawy są domyślnie **odznaczone** i opisane
  osobno: dane zdrowotne, asystent AI, analiza dokumentów.
- Podstawowe funkcje działają bez zapisu sprawy i bez tych zgód.
- Analiza dokumentu nadal wymaga własnej zgody `DOCUMENT_PROCESSING`; plik jest
  przetwarzany lokalnie.
- Kreator nie wymaga PESEL-u, numeru konta ani miejscowości.
- Prefill z mObywatela/importu jest widoczny i edytowalny, nie jest ukrytym
  założeniem.

## Testy

- `packages/domain/src/situation/situation.test.ts` — scenariusze, pytania
  warunkowe, brak zbędnych pól, mapowanie, brak podstawy, ręczna weryfikacja,
  adopcja, trwający urlop rodzicielski, drugi rodzic, zmiana odpowiedzi.
- `packages/documents/src/profile.test.ts` — scalanie profilu, pierwszeństwo
  dokumentu, rozbieżności, niska pewność i formularz wycofany.
- `apps/api/tests/documents.test.ts` — profil w `PUT /documents/:id/fields`.
- `apps/web/e2e/start.spec.ts` — planowanie, ciąża, narodziny, trwający urlop,
  zlecenie, brak danych, ręczna weryfikacja, cofanie i zmiana odpowiedzi,
  analiza bez zapisu, zapis sprawy, przejście do dokumentu, axe na wynikach.
- `apps/web/e2e/a11y.spec.ts` — `/start` objęty testem axe.
- `apps/web/e2e/mobywatel.spec.ts`, `data-import.spec.ts`, `routes.spec.ts`,
  `documents.spec.ts` — istniejące przepływy pozostały sprawne.

Uruchomienie:

```bash
pnpm --filter @zpr/domain test
pnpm --filter @zpr/documents test
pnpm --filter api test
pnpm --filter web e2e e2e/start.spec.ts
```
