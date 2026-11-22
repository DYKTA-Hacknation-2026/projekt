# Kalkulator ZPR — audyt i projekt UX

Status: wdrożone 2026-11-22 · Powiązane: [calculation-engine.md](calculation-engine.md), [legal-assumptions.md](legal-assumptions.md)

## 1. Audyt istniejącego rozwiązania

### 1.1 Co było

`/kalkulator` renderował pojedynczy formularz (`apps/web/components/calculator-form.tsx`, ok. 2 200 linii) z trzema zakładkami: narodziny, adopcja/rodzina zastępcza, przykłady ZUS. Wszystkie parametry były widoczne jednocześnie: 12 miesięcy historii, Z-3/Z-3a, daty ubezpieczenia, wielkość płatnika, zaległości, wymiar etatu, przejęcie macierzyńskiego, praca w czasie rodzicielskiego i sytuacje szczególne.

Formularz wysyłał `CalculatorInput` do `POST /api/v1/calculations`. Serwis (`apps/api/server/services/calculations.ts`) wywołuje `calculateBenefits` z `@zpr/domain`, czyli adapter nad `@zpr/domain/engine` (`packages/domain/src/calculator-engine.ts`). Silnik pozostaje jedynym miejscem decyzji o uprawnieniach, wymiarach i kwotach.

### 1.2 Mapa pól i zależności od silnika

| Grupa | Pola | Rola w silniku | Tryb szybki |
|-------|------|----------------|-------------|
| Sytuacja rodzinna | `mode`, `birthDate`, `placementDate`, `childrenCount`, `hasZaZyciem`, `childAgeYears`, `childBirthDate`, `isDeferredSchooling`, `isProfessionalFosterFamily` | wymiar macierzyńskiego/rodzicielskiego, limit wieku, wyłączenie rodzin zawodowych | `mode`, data, liczba dzieci, „Za życiem”; adopcja/rodzina w rozwijanej sekcji |
| Praca i ubezpieczenie | `mother/fatherEmploymentType`, `mother/fatherSicknessInsurance`, daty początku/końca, `mother/fatherPayerSize`, `mother/fatherContributionDebt`, `employmentFraction` | prawo do zasiłku, płatnik, próg zadłużenia, minimalna podstawa | forma zatrudnienia i ubezpieczenie; „nie wiem” = `UNKNOWN` |
| Podstawa | `incomeMode`, `grossMonthlyIncomeGrosze`, `secondParentMonthlyIncomeGrosze`, `monthlyIncomes[]`, `knownBasisGrosze`, `secondParentKnownBasisGrosze`, `monthlyBasisOverrideGrosze`, `employmentFraction` | podstawa wymiaru (U art. 36–38, 43, 45, 48–50) | jedna przybliżona kwota brutto lub „nie znam” |
| Plan urlopów | `paymentOption`, `flatRateApplicationDate`, `maternityWeeksBeforeBirth`, `motherParentalWeeks`, `secondParentParentalWeeks`, `parentalWorkFraction`, `workCombinedWeeks`, `combineWorkInExtension`, `paternityDays`, `fatherMaternityTakeoverWeeks`, `fatherMaternityTakeoverReason` | wymiary, stawki 100/70/81,5%, przedłużenie, przejęcie | udział mamy/taty, 9 tygodni, 81,5%, urlop ojcowski, warianty |
| Sytuacje szczególne | `birthWeekOfPregnancy`, `birthWeightGrams`, `childHospitalWeeks`, `childHospitalDaysDay5To28`, `specialCase`, `childDeathDay`, `courtApplicationDate`, `adoptionFinalDate`, `previouslyUsedMaternityTermsWeeks`, `previouslyUsedParentalWeeks` | uzupełniający urlop, zgon/martwe urodzenie, adopcja po pieczy | tylko komunikat z kreatora; pełna edycja w trybie zaawansowanym |

Pola opcjonalne to m.in. daty ubezpieczenia, wielkość płatnika, zaległości, wymiar etatu, praca w czasie urlopu i historia 12 miesięcy. Silnik traktuje ich brak jako brak dowodu (`missingEvidence`) albo ograniczenie kwoty, nie jako zero.

### 1.3 Co można było zachować

- Determinizm, wersjonowany `RuleSet` z bazy, dokładna arytmetyka i `BigInt` w silniku.
- Wszystkie istniejące przypadki: adopcja, rodzina zastępcza, martwe urodzenie, zgon dziecka, poród przedwczesny, przejęcie macierzyńskiego, praca w czasie rodzicielskiego, płatnik, zadłużenie, Z-3/Z-3a.
- Zapis wyniku do bazy z wersją silnika i wejściem.
- Handoff z importu danych i z analizy dokumentów (`sessionStorage`, jednorazowy).
- Testy regresyjne domeny i API.

### 1.4 Co wymagało uproszczenia lub wyjaśnienia

- Nazwy pól bez kontekstu („podstawa wymiaru”, „płatnik”, „Z-3/Z-3a”, „zaległości składkowe”).
- Brak rozróżnienia „nie wiem” od „brak” — szczególnie przy ubezpieczeniu chorobowym.
- Wynik pokazywał `OK/INDETERMINATE/NOT_ELIGIBLE`, ale gubił statusy silnika `COMPLETE/PARTIAL/MANUAL_REVIEW`, listę braków, założenia i sytuacje nieobsługiwane.
- Brak porównania wariantów w UI, mimo że domena miała już deterministyczne porównanie.
- Brak przenoszenia danych z kreatora do kalkulatora (poza importem i dokumentami).

### 1.5 Nierozwiązane parametry prawne

- **Q-15** — reguła zaokrąglania kwot zasiłków. Silnik przyjmuje zaokrąglenie do pełnych groszy (A-20); nadal `PARTIAL`.
- **Q-29** — minimalne wynagrodzenie, kwota świadczenia rodzicielskiego, przeciętne wynagrodzenie i waloryzacja rehabilitacji. Adapter kalkulatora **nie podstawia własnych stałych**: brak wartości w aktywnym zestawie reguł daje dolną/górną granicę albo brak kwoty, a wynik pozostaje `verified: false`.
- **Q-30** — interpretacja 9 tygodni przy adopcji/rodzinie zastępczej blisko limitu wieku; silnik kieruje sprawę do `MANUAL_REVIEW`.

## 2. Projekt UX

### 2.1 Szybkie wyliczenie (domyślne)

Cztery kroki, pasek postępu, jedna decyzja na ekranie:

1. **Sytuacja rodzinna** — ciąża/poród, data, liczba dzieci, oboje rodzice lub jeden, „Za życiem”. Adopcja i rodzina zastępcza są w rozwijanej sekcji, żeby nie sugerować ich jako typowej ścieżki.
2. **Sytuacja zawodowa** — dla każdego rodzica: forma zatrudnienia, ubezpieczenie chorobowe, przybliżony dochód brutto lub „nie znam dokładnej kwoty”. Przy umowie o pracę ubezpieczenie jest automatycznie obowiązkowe. Przy zleceniu/działalności dostępne jest „Nie wiem”, które silnik zamienia na `PARTIAL` zamiast założenia.
3. **Plan urlopów** — mama bierze większość, tata bierze 9 tygodni, podział po połowie; sposób wypłaty 100/70 albo 81,5%; urlop przed porodem i ojcowski; opcjonalne porównanie wariantów.
4. **Wynik** — podsumowanie danych, kwoty, status analizy, braki, założenia, ostrzeżenia, ślad reguł, porównanie wariantów i przejścia do asystenta, planera, dokumentów i kreatora.

### 2.2 Zaawansowane wyliczenie

Zachowuje wszystkie dotychczasowe pola i dodaje:

- krótkie opisy pod polami oraz rozwijane „Więcej informacji”,
- wybór „Nie wiem” przy ubezpieczeniu chorobowym,
- wspólny widok wyniku ze statusami silnika,
- powrót do szybkiego trybu i przeniesienie danych z szybkiego trybu.

Nie usunięto żadnego pola ani przypadku obliczeniowego.

### 2.3 Zasady pokazywania pól

- Drugi rodzic znika w kroku 2 i 3, gdy wybrano „tylko jeden rodzic”.
- Pola ubezpieczenia są zależne od formy zatrudnienia (pracownik = obowiązkowe, bez pytania).
- Adopcja/rodzina zastępcza pokazuje datę przyjęcia, nie datę porodu.
- Pytania o 81,5%, urlop przed porodem i ojcowski pojawiają się tylko wtedy, gdy mają zastosowanie.
- „Nie znam” nie jest zamieniane na wartość zastępczą; wynik dostaje `PARTIAL` i listę braków.

## 3. Uczciwe wyniki

Wynik pokazuje równolegle:

- `analysis.status`: `COMPLETE`, `PARTIAL` albo `MANUAL_REVIEW` — bezpośrednio z silnika,
- status uprawnienia (`ELIGIBLE`, `CONDITIONAL`, `NOT_ELIGIBLE`, `NEEDS_INPUT`, `MANUAL_REVIEW`) w szczegółach,
- `analysis.missingEvidence` — pytanie, dlaczego jest ważne i czego dotyczy,
- `analysis.manualReviewReasons` i `analysis.unsupported` (U-xx),
- `analysis.assumptions` (A-xx),
- ostrzeżenie o Q-15/Q-29, dopóki `ruleSetVerified` jest fałszywe.

`totalGrosze` w dotychczasowym kształcie pozostaje dla kompatybilności, ale UI używa `analysis.totalGrosze`. Gdy silnik nie ma podstawy, jest `null` i UI pokazuje „Nie wyliczono kwoty” zamiast `0 zł`.

## 4. Integracje

- **Kreator → kalkulator**: kreator zapisuje jednorazowy `zpr:onboarding-prefill`; kalkulator mapuje sytuację, datę, liczbę dzieci, formę zatrudnienia, ubezpieczenie i dochód.
- **Import/dokumenty → kalkulator**: istniejące `zpr:import-prefill` i `zpr:document-prefill` są czytane przez wspólny `readCalculatorPrefill`, z zachowaniem pierwszeństwa: kalkulator → kreator → import → dokument. Handoff dokumentu (podstawa Z-3/Z-3a) otwiera tryb zaawansowany, żeby użytkownik mógł sprawdzić podstawę i pozostałe dowody; import i kreator trafiają do szybkiego trybu.
- **Kalkulator → kreator**: przycisk „Przekaż dane do kreatora” zapisuje `zpr:calculator-prefill`; kreator wypełnia pola, które rozumie, i zostawia resztę do sprawdzenia.
- **Kalkulator → asystent**: link `/asystent?q=...` przekazuje zwięzły opis wyniku, statusu i braków. Asystent nie dostaje prawa zmiany wyniku; istniejące API przyjmuje tylko treść wiadomości i opcjonalny profil.
- **Kalkulator → planer**: link do `/os-czasu`; planer nadal korzysta z własnego, deterministycznego `buildTimeline`.

## 5. Porównanie wariantów

`compareCalculatorScenarios` (`packages/domain/src/scenarios.ts`) buduje trzy warianty z aktywnego `RuleSet`:

- mama bierze większość, 9 tygodni taty niewykorzystane,
- mama bierze większość, tata 9 tygodni,
- podział po połowie.

Każdy wariant przechodzi przez `calculateBenefits`, więc silnik może skrócić plan i zgłosić `planAdjustments`. Endpoint `POST /api/v1/calculations/compare` nie zapisuje wyników. UI pokazuje kwoty, różnice, statusy i zastrzeżenia; nie twierdzi, że wariant jest prawnie dostępny.

## 6. Ograniczenia

- Nadal jeden tytuł ubezpieczenia na rodzica (U-02).
- Brak pełnego modelowania zbiegu tytułów, wszystkich przyczyn zakończenia zatrudnienia i układania urlopu w konkretnych częściach/datach — to nadal zadanie planera i modułu uprawnień.
- Q-15/Q-29 pozostają niezatwierdzone; kwoty są szacunkiem.
- Asystent nie otrzymuje ustrukturyzowanego obiektu wyniku, tylko tekstowe podsumowanie w pytaniu; nie zmienia obliczeń.
- Porównanie wariantów obejmuje podział urlopu rodzicielskiego, nie każde możliwe przetasowanie macierzyńskiego, ojcowskiego i pracy łączonej.
