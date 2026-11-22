# Zasiłkowy Przewodnik Przyszłego Rodzica (ZPR)

Polska aplikacja demonstracyjna, która pomaga rodzicom przejść od pytania „co mi
przysługuje?” do konkretnego planu: uprawnień, szacunkowych kwot, terminów,
dokumentów i kolejnych kroków. Łączy deterministyczny kalkulator świadczeń,
planer urlopów, analizę dokumentów, centrum wiedzy i asystenta rozmownego.

> **Status demo.** Wszystkie dane rządowe, dokumenty i integracje są
> symulowane. Kalkulator zwraca status `INDETERMINATE` („Wymaga danych”) dla
> wyników zależnych od niezatwierdzonych parametrów: minimalnej podstawy,
> świadczenia rodzicielskiego (Q-29) i polityki zaokrągleń (Q-15). Asystent
> odpowiada wyłącznie na podstawie pobranych źródeł i deterministycznych usług —
> nigdy nie wymyśla kwot, terminów ani decyzji o uprawnieniach.

## Spis treści

- **[Instrukcja uruchomienia demo](#jak-obejrzeć-system-w-działaniu)**
- [Czym jest ten projekt](#czym-jest-ten-projekt)
- [Co jest prawdziwe, a co symulowane](#co-jest-prawdziwe-a-co-symulowane)
- [Najważniejsze funkcje](#najważniejsze-funkcje)
- [Bezpieczeństwo i prywatność](#bezpieczeństwo-i-prywatność)
- [Stos technologiczny](#stos-technologiczny)
- [Szybki start](#szybki-start)
- [Trasy](#trasy)
- [REST API](#rest-api)
- [Architektura](#architektura)
- [Skrypty](#skrypty)
- [Dane demonstracyjne](#dane-demonstracyjne)
- [Testy i akceptacja](#testy-i-akceptacja)
- [Znane ograniczenia](#znane-ograniczenia)
- [Dokumentacja w repozytorium](#dokumentacja-w-repozytorium)

## Czym jest ten projekt

Zasiłkowy Przewodnik Przyszłego Rodzica (ZPR) to kompletny, działający lokalnie
prototyp serwisu dla rodziców. Zamiast kolejnego artykułu „wszystko zależy”,
aplikacja prowadzi użytkownika przez konkretny proces:

1. **Opisz sytuację** — terminy, forma zatrudnienia, dochód, ubezpieczenie.
2. **Poznaj uprawnienia** — zasiłki, urlopy i świadczenia dla obojga rodziców.
3. **Zobacz kwoty** — wyliczone deterministycznie, z podstawą prawną i jawnymi
   założeniami.
4. **Ułóż plan** — terminy, dokumenty, miejsce złożenia i kolejne kroki.

Aplikacja składa się z dwóch projektów Next.js (web i REST API) oraz wspólnych
pakietów domenowych. Reguły prawne są kodem, a ich parametry — wersjonowanymi
danymi. Dzięki temu ten sam zestaw danych zawsze daje ten sam wynik, a każdą
zmianę parametrów można prześledzić w historii.

## Jak obejrzeć system w działaniu

Najszybsze do włączenia demo znajduje się na stronie https://zpr.makonew.com/. <br />
Dla uruchomienia lokalnego: [Szybki start](#szybki-start). <br />
Ścieżka testowa pokazująca najwięcej funkcjonalności to logowanie symulujące na [/mobywatel](#2-symulacja-mobywatela-i-pobranie-danych).

### Szybka ściąga

| #   | Gdzie zacząć                               | Co zobaczysz                                                                 | Czas   |
| --- | ------------------------------------------ | ---------------------------------------------------------------------------- | ------ |
| 1   | Strona główna → „Różne rodziny. Różne potrzeby.” | Trzy przykładowe sytuacje prowadzące do kreatora, asystenta i planera urlopów | 2–5 min |
| 2   | `/mobywatel` → `/dane`                     | Symulowane logowanie, zgody, pobranie danych z ZUS/e-ZLA/USC/PUE i weryfikację | 5–10 min |
| 3   | `/dokumenty`                               | Cztery przykładowe skany dokumentów, odczyt pól i import danych do kalkulatora | 3–5 min |
| 4   | `/asystent`                                | Rozmowę ze źródłami, cytatami i deterministycznymi odpowiedziami              | 2–5 min |
| 5   | `/kalkulator`                              | Gotowe przykłady spraw, tryb szybki i zaawansowany oraz ślad obliczeń        | 3–5 min |
| 6   | `/os-czasu`                                | Przykładowy plan urlopów obojga rodziców na wspólnej osi czasu                | 2–3 min |

Jeśli masz tylko kilka minut, zacznij od strony głównej i sekcji **„Różne
rodziny. Różne potrzeby.”**, a potem otwórz `/dokumenty` i wczytaj sprawę
**SC-SYN-01**. Zobaczysz cały przepływ: wybór sytuacji → dokument → potwierdzenie
pól → kwota i uprawnienia → kalkulator z wypełnionymi danymi.

### 1. Strona główna — trzy przykładowe sytuacje

Otwórz <http://localhost:3000> i zjedź niżej, do sekcji **„Różne rodziny. Różne
potrzeby.”**. Znajdziesz tam trzy karty — wybierz jedną, żeby zobaczyć system od
praktycznej strony:

| Karta                       | Prowadzi do | Co pokazuje                                                        |
| --------------------------- | ----------- | ------------------------------------------------------------------ |
| **Spodziewamy się dziecka** | `/start`    | Kreator sytuacji: pytania o rodzinę, pracę i ubezpieczenie         |
| **Kończy mi się umowa**     | `/asystent` | Rozmowę o tym, co zmienia koniec zatrudnienia i jakie są opcje      |
| **Dzielimy się opieką**     | `/os-czasu` | Planer urlopów obojga rodziców; kliknij „Wczytaj przykład”         |

Nieco wyżej, w sekcji **„Od pytań do konkretów.”**, są dodatkowo trzy skróty do
najważniejszych narzędzi:

- **Oblicz wysokość świadczeń** → `/kalkulator`
- **Zaplanuj urlopy rodzicielskie** → `/os-czasu`
- **Sprawdź i przygotuj dokumenty** → `/dokumenty`

Na stronie głównej znajdziesz też gotowy podgląd planu rodzicielstwa
(„Urlopy i ważne terminy”) — przykładowe dane pokazują układ osi czasu bez
wchodzenia w żadne narzędzie.

### 2. Symulacja mObywatela i pobranie danych

To najpełniejsza ścieżka: pokazuje logowanie, zgodę na zakres danych, pobranie
informacji z wielu instytucji, podsumowanie rozbieżności i weryfikację przed
przekazaniem danych do kalkulatora.

1. Wejdź na `/mobywatel` i wybierz **Aplikację mObywatel**.
2. Wybierz jeden z profili testowych:
   - **Anna Kowalska** — ciąża, jedno dziecko, umowa o pracę.
   - **Kasia Nowak** — umowa zlecenia zakończona przed porodem.
   - **Tomasz Kowalski** — ojciec, umowa o pracę, drugi rodzic.
   - **Marek Wiśniewski** — działalność gospodarcza, dobrowolne ubezpieczenie
     chorobowe, jedno dziecko.
3. Zaakceptuj zakres danych. Symulacja nie prosi o PESEL — udostępnia tylko
   imię, nazwisko, datę urodzenia, miejscowość i e-mail.
4. Potwierdź tożsamość kodem PIN (w demo dowolne 4 cyfry, np. `1234`) albo
   biometrią.
5. Kliknij **„Przejdź do kreatora”** — `/start` otworzy się z uzupełnionymi
   danymi osobowymi.
6. Wybierz **„Pobierz dane z symulowanych źródeł”** i przejdź do `/dane`.
7. Zaznacz zakresy danych dla instytucji (historia ubezpieczenia, podstawy
   składek, zatrudnienie, zwolnienia, dane dziecka, sprawy zasiłkowe) i
   potwierdź zgodę.
8. Pobierz dane źródło po źródle: ZUS, pracodawca/płatnik, e-ZLA, USC oraz
   PUE/eZUS. Każde źródło ma własny postęp i własne stany błędów.
9. Zobacz podsumowanie: co pobrano, co było niedostępne, co trzeba uzupełnić
   ręcznie i jakie wykryto niespójności między źródłami.
10. Zweryfikuj pola. Każde pole pokazuje pochodzenie, a ręczne zmiany są
    oznaczone. Podgląd uruchamia deterministyczne reguły uprawnień i kalkulator,
    zanim cokolwiek zaakceptujesz.
11. Zaakceptuj dane — kreator i kalkulator dostaną to samo wstępne wypełnienie,
    a panel sprawy pokaże raport pobrania i wynik uprawnień.

Warto zobaczyć różnicę między profilami: Anna ma pełną historię zatrudnienia,
Marek — działalność i zaległości składkowe, a Kasia — lukę w ubezpieczeniu,
awarię e-ZLA i puste USC/PUE, więc część danych trzeba uzupełnić ręcznie.

### 3. Dokumenty — przykładowe skany i import do kalkulatora

Wejdź na `/dokumenty`. W sekcji **„Przykładowe sprawy”** znajdziesz cztery
syntetyczne dokumenty (bez danych prawdziwych osób, z wyraźnym znakiem wodnym):

| Kod        | Dokument                              | Co pokazuje                                                                 |
| ---------- | ------------------------------------- | --------------------------------------------------------------------------- |
| SC-SYN-01  | ZAM + Z-3 — Anna Kowalska             | Pracownica, płatnik do 20 osób, wynagrodzenie brutto 8000 zł                 |
| SC-SYN-02  | Z-3 (formularz wypełnialny) — Tomasz Kowalski | Pola AcroForm, podstawa 6000 zł, zasiłek za urlop ojcowski            |
| SC-SYN-03  | Z-3a — Kasia Nowak                    | Umowa zlecenia, ubezpieczenie ustało przed porodem — brak prawa do zasiłku  |
| SC-SYN-04  | ZUR (formularz wycofany) — Ewa Wiśniewska | Ostrzeżenie o wycofonym druku (LR-05)                                   |

Jak to sprawdzić:

1. Kliknij jedną z przykładowych spraw.
2. Zobacz podgląd PDF obok tabeli pól. Każde pole ma wartość, źródło, stronę i
   pewność odczytu.
3. Popraw lub potwierdź pola. Przycisk **„Potwierdź wszystkie wypełnione pola”**
   zaznacza komplet, ale nadal możesz edytować wartości.
4. Kliknij **„Potwierdź i oblicz”** — zobaczysz uprawnienia, kwoty, listę
   wymaganych dokumentów, miejsce złożenia i terminy.
5. Kliknij **„Otwórz kalkulator z tymi danymi”** — `/kalkulator` otworzy się z
   podstawą wymiaru z dokumentu. Podstawa z Z-3/Z-3a jest używana bez ponownego
   odliczania składek; wynagrodzenie brutto jest przeliczane przez silnik.

Możesz też wgrać własny PDF (maks. 10 MB, tylko PDF sprawdzany po sygnaturze
`%PDF-`, wymagana zgoda na przetwarzanie). Plik trafia do prywatnego magazynu i
jest usuwany po 24 godzinach albo od razu po kliknięciu „Usuń dokument”.

### 4. Rozmowa z asystentem

Wejdź na `/asystent` i zadaj pytanie własnymi słowami albo kliknij jedną z
podpowiedzi. Przykłady:

- „Czy przysługuje mi zasiłek macierzyński?”
- „Jestem na B2B i jestem w ciąży. Co powinnam zrobić?”
- „Jak długo mogę pobierać zasiłek?”
- „Czy tata może przejąć część urlopu?”
- „Jak podzielić urlop rodzicielski?”
- „Jakie dokumenty muszę złożyć?”
- „Gdzie mam wysłać formularz?”

Asystent pokaże źródła oznaczone `S1`, `S2`… z odnośnikiem do fragmentu, datą
obowiązywania i lokalizacją. Kwoty, terminy i uprawnienia pochodzą z
deterministycznych narzędzi, nie z modelu językowego. Jeśli brakuje danych,
asystent zada jedno pytanie uzupełniające zamiast zgadywać. Rozmowy są
przypisane do sesji i można je usuwać.

Domyślnie (`AI_PROVIDER=none`) asystent działa w trybie offline na modelu reguł:
odpowiedzi są poprawne merytorycznie i oparte na źródłach, ale mają bardziej
szablonową formę. Po skonfigurowaniu dostawcy AI brzmienie staje się naturalne,
a zasady bezpieczeństwa pozostają te same.

### 5. Kalkulator i planer rodzicielstwa

W `/kalkulator` możesz zacząć od trybu szybkiego (cztery kroki) albo przejść do
trybu zaawansowanego. W trybie zaawansowanym dostępne są m.in. gotowe przykłady:

- Anna — pracownik, ZAM.
- Tomasz — pracownik, Z-3.
- Kasia — zleceniobiorca, Z-3a.
- Marta — adopcja 5-latka.
- Piotr — wcześniak z 27. tygodnia.
- Oliwia — rodzina zastępcza niezawodowa.
- Ewa — praca łączona z urlopem rodzicielskim.

W `/os-czasu` zobaczysz przykład planu dla obojga rodziców. Kliknij „Wczytaj
przykład”, żeby przywrócić dane demonstracyjne, albo zmień założenia — plan
przelicza się od razu. Widok można przełączyć na tabelę i przejść z niego do
szczegółów dokumentów.

## Co jest prawdziwe, a co symulowane

| Obszar                            | Status                                                                                                 |
| --------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Reguły prawne i wersjonowanie     | Oparte na wskazanych źródłach; parametry niezatwierdzone są jawnie oznaczone                            |
| Kalkulator                        | Deterministyczny, dokładna arytmetyka; wynik jest szacunkiem, nie decyzją ZUS                           |
| Baza wiedzy                       | Kuratorowane, redystrybuowalne źródła z wersjami i cytatami; zbiór jest celowo mały                     |
| Asystent                          | AI jest opcjonalne; bez klucza działa tryb reguł; asystent nie wymyśla kwot ani terminów                |
| mObywatel, ZUS, e-ZLA, USC, PUE   | Symulacja; aplikacja nie łączy się z systemami państwowymi i nie wysyła tam żadnych danych              |
| Dokumenty                         | Syntetyczne skany; ekstrakcja deterministyczna; OCR i propozycje AI są opcjonalne i domyślnie wyłączone |
| Logowanie i sesje                 | Poziom demo; brak prawdziwego uwierzytelniania i trwałego konta użytkownika                             |
| Panel administratora              | Demo logowania, edytor parametrów prawnych i historia wersji; bez kont użytkowników i audytu per osoba  |
| Wnioski i integracje rządowe      | Nie są implementowane; część przepływów jest tylko symulowana w interfejsie                             |

## Najważniejsze funkcje

- **Kalkulator świadczeń** — poród, adopcja i rodzina zastępcza; oboje rodzice,
  praca łączona z urlopem, wariant 81,5%, wcześniactwo, utrata dziecka,
  indywidualna podstawa wymiaru i import zestawu ZUS.
- **Silnik reguł** — dokładna arytmetyka (BigInt/rational), wersjonowane reguły
  i parametry, ślad obliczeń oraz jawnie oznaczone braki danych.
- **Planer urlopów** — trzy ścieżki (mama, tata, wspólne), etapy, szczegóły,
  terminy i widok tabeli.
- **Analiza dokumentów** — odczyt PDF, detekcja formularza, mapowanie pól,
  walidacja, potwierdzanie i import do kalkulatora.
- **Symulowany import danych** — zgody, pobieranie z wielu instytucji,
  proweniencja, wykrywanie niespójności i weryfikacja przed akceptacją.
- **Asystent rozmowny** — źródła, cytaty, narzędzia deterministyczne, historia,
  usuwanie rozmów i tryb offline bez klucza AI.
- **Centrum wiedzy** — artykuły, FAQ, dokumenty, przewodniki, słownik, źródła
  i daty przeglądu; treści są w bazie, a nie zaszyte w kodzie.
- **Panel sprawy i panel admina** — status danych demo, ostatnie obliczenia,
  inwentarz wiedzy, edytor parametrów prawnych i historia wersji.

## Bezpieczeństwo i prywatność

- **Minimalizacja danych** — do wstępnej analizy nie potrzeba numeru PESEL;
  symulowany mObywatel również go nie przekazuje.
- **Rozdzielone zgody** — osobno przetwarzanie dokumentu, dane zdrowotne i
  opcjonalne wsparcie AI.
- **Czyszczenie danych osobowych** — asystent usuwa PESEL, numery kont,
  dokumentów, e-mail i telefon przed wysłaniem treści do modelu i zapisaniem w
  bazie. Nazwy plików i ich treść nie trafiają do logów.
- **Własność sesji** — rozmowy i dokumenty są przypisane do podpisanej sesji, a
  każde odczytywanie i usuwanie jest filtrowane po właścicielu w SQL.
- **TTL dokumentów** — uploady są usuwane po 24 godzinach (konfigurowalne przez
  `DOCUMENT_TTL_HOURS`) przy następnym uploadzie lub przez
  `POST /api/v1/documents/cleanup`.
- **Limity i brama admina** — limity zapytań na adres i sesję; panel admina
  można zamknąć przez `ADMIN_GATE_ENABLED=true`.
- **Sekrety** — trzymaj je w `.env` / `.env.local`; nigdy nie commituj
  prawdziwych kluczy ani produkcyjnych haseł.

## Stos technologiczny

- **Next.js 16** App Router, React 19, Turbopack, `proxy.ts` do bramy admina
- **TypeScript** w trybie strict, kontrakty Zod, wspólne UI z `@workspace/ui`
- **Tailwind CSS v4** + prymitywy shadcn/ui
- **PostgreSQL 17 + pgvector 0.8** — jedna baza dla danych aplikacji i wektorów
- **Drizzle ORM** z generowanymi migracjami SQL
- **Vitest** — testy jednostkowe; **Playwright** — testy e2e i dostępności
- **pnpm workspaces + Turborepo**
- **Docker Compose** dla PostgreSQL i obu aplikacji

## Szybki start

Wymagania: Node.js 22+ (AI SDK 7) oraz pnpm przez Corepack.

```bash
corepack enable pnpm
pnpm install

# Uruchom tylko PostgreSQL + pgvector (port hosta 5435)
docker compose up -d db

# Zastosuj schemat, zasiej syntetyczne dane demo, zbuduj i zweryfikuj bazę wiedzy
pnpm --filter @zpr/db db:migrate
pnpm --filter @zpr/db db:seed
pnpm kb:seed            # wczytanie źródeł z repozytorium + kb:verify (idempotentne)

# Uruchom aplikacje web i API
pnpm dev
```

Otwórz <http://localhost:3000>. Health check API jest pod
<http://localhost:3000/api/health>.

Domyślne wartości w `.env.example` pasują do bazy z Compose, więc do
standardowego uruchomienia lokalnego nie jest potrzebny plik `.env`. Aby
nadpisać wartości, utwórz:

- `apps/web/.env.local` — `API_URL` i ustawienia sesji web,
- `apps/api/.env.local` — baza, embeddingi, limity i ustawienia admina,
- `packages/db/.env` — skrypty migracji, zasiewania danych i testów wstępnych,
- `packages/rag/.env` — skrypty bazy wiedzy (`kb:*`).

`.env.example` zawiera wszystkie obsługiwane zmienne. Nigdy nie commituj
prawdziwego `.env` ani produkcyjnego sekretu. Obie aplikacje muszą mieć te same
wartości `SESSION_SECRET` i `ADMIN_GATE_ENABLED`. API domyślnie działa lokalnie
pod `http://127.0.0.1:3001`.

### Pełny Docker Compose

```bash
docker compose up --build -d
```

API czeka na PostgreSQL, stosuje migracje, zasiewa dane demo i bazę wiedzy, a
następnie obsługuje żądania w sieci Compose. Usługa web czeka na kontrolę stanu
API i serwuje <http://localhost:3000>. Baza jest wystawiona na porcie
`${POSTGRES_PORT:-5435}`.

### Port hosta jest zajęty?

PostgreSQL jest domyślnie mapowany na **5435**, ponieważ porty 5432–5434 są
często zajęte. Możesz go zmienić bez edycji Compose:

```bash
POSTGRES_PORT=5540 docker compose up -d db
DATABASE_URL=postgresql://zpr:zpr_local_password@localhost:5540/zpr pnpm --filter @zpr/db db:migrate
```

## Trasy

| Trasa                    | Przeznaczenie                                                                                     |
| ------------------------ | ------------------------------------------------------------------------------------------------- |
| `/`                      | Strona główna, plan demonstracyjny, informacje o bezpieczeństwie i symulacjach                     |
| `/panel`                 | Panel sprawy: sprawa, najbliższe terminy, obliczenia, status bazy wiedzy                           |
| `/start`                 | Kreator sytuacji, który tworzy syntetyczne gospodarstwo domowe i sprawę                            |
| `/dane`                  | Zgody, pobieranie, podsumowanie i weryfikacja symulowanych danych ZUS/e-ZLA/USC                     |
| `/mobywatel`             | Symulacja mObywatel / login.gov.pl, która wstępnie wypełnia kreator                                |
| `/kalkulator`            | Kalkulator porodu/adopcji/rodziny zastępczej: oboje rodzice, praca + urlop rodzicielski, szczegółowa/znana podstawa, import JSON sprawy ZUS, ślad i zapisany wynik |
| `/asystent`              | Rozmowa strumieniowa: narzędzia, cytaty, historia, usuwanie                                        |
| `/dokumenty`             | Analiza dokumentów: przykładowa sprawa lub PDF → ekstrakcja → potwierdzenie pól → uprawnienia, kwota, lista dokumentów i terminy |
| `/os-czasu`              | Plan Rodzicielstwa: interaktywna oś czasu trzech ścieżek, etapy, szczegóły i widok tabeli          |
| `/wiedza`                | Centrum wiedzy: wyszukiwanie, kategorie, FAQ, artykuły, dokumenty, przewodniki, słownik            |
| `/wiedza/faq`            | FAQ z filtrem kategorii i wyszukiwaniem pełnotekstowym                                             |
| `/wiedza/artykul/[slug]` | Artykuł z sekcjami, kluczowymi punktami, powiązanym FAQ, dokumentami, przewodnikami, źródłami i podstawą prawną |
| `/wiedza/dokumenty`      | Karty dokumentów i formularzy z oficjalnymi linkami i datami przeglądu                             |
| `/wiedza/przewodniki`    | Przewodniki krok po kroku                                                                          |
| `/wiedza/slownik`        | Słownik z filtrem alfabetycznym                                                                    |
| `/wiedza/zrodla`         | Rejestr oficjalnych źródeł i dat weryfikacji                                                       |
| `/admin/wiedza`          | Inwentarz treści, kontrola statusu i daty przeglądu                                                |
| `/admin/reguly`          | Edytor parametrów prawnych: nowe niezmienne wersje, walidacja i historia                           |
| `/o-projekcie`           | Co jest prawdziwe, co symulowane, zastrzeżenia prawne i architektura                                |
| `/admin`                 | Szkielet panelu admina: liczby, reguły, źródła, zadania indeksowania                                |
| `/admin/login`           | Demonstracyjne logowanie admina (egzekwowane tylko gdy `ADMIN_GATE_ENABLED=true`)                   |

### Tryby kalkulatora

- **Poród** — oboje rodzice, osobne dochody, przejęcie macierzyńskiego,
  ojcowski, wariant 81,5%, praca łączona z urlopem rodzicielskim, przypadki
  wcześniactwa i utraty dziecka.
- **Adopcja / rodzina zastępcza** — niezawodowe rodziny zastępcze, limity wieku
  7/10/14, gwarancja 9 + 38/62 tygodni, wykluczenie zawodowych rodzin
  zastępczych.
- **Zestawy ZUS** — poglądowe przykłady oraz import prywatnego pliku
  `SC-xx.json` po stronie przeglądarki. Plik jest parsowany lokalnie i nigdy nie
  jest wysyłany; formularz pokazuje, które pola zmapowano, a które trzeba
  uzupełnić.
- **Indywidualna podstawa** — prosta kwota miesięczna, historia 12 miesięcy z
  absencją/dodatkiem albo ustalona już podstawa ZUS/płatnika (Z-3/Z-3a). Wynik
  pozostaje `verified: false`, dopóki Q-29/Q-15 nie zostaną potwierdzone.

## REST API

Serwer web przekazuje istniejące ścieżki `/api/*` do usługi API. Wszystkie
endpointy JSON używają `application/json`; błędy używają RFC 9457 problem+json
ze stabilnym `code` i nagłówkiem `x-request-id`. Kontrakt maszynowy znajdziesz w
`/api/v1/openapi.json`.

| Endpoint                                             | Metoda     | Opis                                                                                               |
| ---------------------------------------------------- | ---------- | -------------------------------------------------------------------------------------------------- |
| `/api/health`                                        | GET        | Sprawdzenie żywotności oraz stanu bazy, pgvector i migracji                                          |
| `/api/v1/health`                                     | GET        | Wersjonowana kontrola stanu, sprawdzenie tabel i liczby wierszy demo                                 |
| `/api/v1/knowledge/search`                           | GET        | Wyszukiwanie hybrydowe (`q`, `limit`, `asOf`, `source`, `sourceType`, `tag`, `minRelevance`)         |
| `/api/v1/assistant/chat`                             | POST       | Rozmowa strumieniowa (AI SDK UI message stream, SSE)                                                |
| `/api/v1/assistant/messages`                         | POST       | Ta sama orkiestracja, pojedyncza odpowiedź JSON (integracja REST)                                   |
| `/api/v1/assistant/conversations`                    | GET/DELETE | Lista / usunięcie wszystkich rozmów tej sesji                                                       |
| `/api/v1/assistant/conversations/{id}`               | GET/DELETE | Historia z wynikami narzędzi i źródłami / usunięcie                                                 |
| `/api/v1/assistant/session`                          | GET        | Dostępność profilu i tryb odpowiedzi (bez danych osobowych)                                          |
| `/api/v1/onboarding`                                 | POST       | Utworzenie gospodarstwa domowego, profilu użytkownika i sprawy zasiłkowej                            |
| `/api/v1/calculations`                               | GET        | Ostatnie obliczenia                                                                                 |
| `/api/v1/calculations`                               | POST       | Obliczenie deterministyczne; zapisuje dane wejściowe i ślad                                         |
| `/api/v1/eligibility/evaluate`                       | POST       | Deterministyczne uprawnienia per rodzic i świadczenie (silnik)                                       |
| `/api/v1/benefits/calculate`                         | POST       | Pełna ocena: okresy, rozbicie, sumy, alokacja, źródła                                               |
| `/api/v1/scenarios/compare`                          | POST       | Jedno gospodarstwo, do 5 planów urlopowych, różnica względem pierwszego                             |
| `/api/v1/timeline`                                   | POST       | Okresy świadczeń i terminy z datami                                                                 |
| `/api/v1/documents/required`                         | POST       | Wymagane dokumenty, formularze i miejsca złożenia                                                   |
| `/api/v1/rulesets`                                   | GET        | Wersje zestawów reguł, parametry ze statusem weryfikacji, reguły, założenia i nieobsługiwane scenariusze |
| `/api/v1/documents`                                  | POST       | Upload PDF (multipart `file` + `consent=DOCUMENT_PROCESSING`) → `documentId`, status, TTL            |
| `/api/v1/documents/{id}`                             | GET/DELETE | Metadane i status / natychmiastowe usunięcie pliku, ekstrakcji i ustaleń                             |
| `/api/v1/documents/{id}/file`                        | GET        | PDF właściciela do podglądu (powiązany z sesją, `no-store`, nigdy publiczny URL)                    |
| `/api/v1/documents/{id}/extract`                     | POST       | Ekstrakcja (AcroForm → szablon/regex → opcjonalny OCR → opcjonalne propozycje LLM)                  |
| `/api/v1/documents/{id}/extraction`                  | GET        | Ostatnia ekstrakcja, mapowanie faktów i zapisana checklista                                         |
| `/api/v1/documents/{id}/fields`                      | PUT        | Potwierdzenie/poprawienie pól; po kompletności: uprawnienia, kwoty, dokumenty, oś czasu, checklista |
| `/api/v1/documents/cleanup`                          | POST       | Czyszczenie po TTL dla crona (token usługi); uploady również je uruchamiają                         |
| `/api/v1/sample-cases`                               | GET        | Syntetyczne przykładowe sprawy (+ prywatne z manifestu poza gitem)                                  |
| `/api/v1/sample-cases/{id}/load`                     | POST       | Wczytanie przykładowej sprawy jako dokument tej sesji i jej ekstrakcja                             |
| `/api/v1/documents/analyze`                          | GET/POST   | **Przestarzałe** — jednokrokowy alias powyższego (stary kształt odpowiedzi + `extraction`)          |
| `/api/v1/admin/login`                                | POST       | Demo logowania admina, ustawia podpisane HMAC-em ciasteczko HttpOnly                                |
| `/api/v1/admin/logout`                               | POST       | Czyści ciasteczko admina                                                                            |
| `/api/v1/data-import/sources`                        | GET        | Symulowane instytucje, zakresy zgód i kroki postępu                                                 |
| `/api/v1/data-import/sessions`                       | POST       | Rozpoczęcie sesji pobierania z zgodą                                                                |
| `/api/v1/data-import/sessions/{id}`                  | GET        | Stan sesji, wyniki źródeł i podsumowanie                                                            |
| `/api/v1/data-import/sessions/{id}/summary`          | GET        | Raport pobranych / niedostępnych / ręcznych / niespójnych danych                                    |
| `/api/v1/data-import/sessions/{id}/sources/{source}` | POST       | Pobranie jednego symulowanego źródła                                                                |
| `/api/v1/data-import/sessions/{id}/preview`          | POST       | Mapowanie danych, reguły uprawnień i podgląd kalkulatora                                            |
| `/api/v1/data-import/sessions/{id}/accept`           | POST       | Zapis zaakceptowanych danych i zwrot wstępnie wypełnionego formularza                               |
| `/api/v1/data-import/sessions/{id}/skip`             | POST       | Porzucenie pobierania bez blokowania ręcznego wpisywania                                            |
| `/api/v1/sim/mobywatel/personas`                     | GET        | Syntetyczne profile do symulowanego logowania                                                       |
| `/api/v1/sim/mobywatel/authorize`                    | POST       | Ustawienie krótkotrwałej podpisanej sesji wstępnego wypełnienia                                     |
| `/api/v1/sim/mobywatel/logout`                       | POST       | Wyczyszczenie symulowanej sesji mObywatel                                                            |

### Dokumenty (`/dokumenty`)

```text
PDF ─▶ POST /documents        rozmiar ≤ 10 MB, zadeklarowany typ + magic bytes %PDF-, zgoda DOCUMENT_PROCESSING,
                              prywatny magazyn (var/uploads lub adapter zasobnika), docs.uploads, delete_after = teraz + 24 h
    ─▶ POST /{id}/extract     @zpr/documents: tekst pdf.js + AcroForm → detekcja formularza (pola → nagłówki → tekst → nazwa pliku)
                              → szablony załączników 2/3/6 R1316 → [OCR jeśli skan i DOCUMENT_OCR_ENABLED]
                              → [propozycje LLM jeśli DOCUMENT_LLM_FALLBACK + zgoda per żądanie, dane osobowe usunięte]
                              → walidatory (wycofane formularze LR-05, brakujące pola, daty, załączniki) → docs.extractions
    ─▶ UI                     podgląd PDF obok pól: wartość, źródło, strona, pewność, „zmienione przez Ciebie”
    ─▶ PUT /{id}/fields       użytkownik potwierdza/poprawia; userEdited zostaje, oryginalna pewność zostaje
    ─▶ silnik                 evaluateEligibility, calculateParentalBenefits, identifyRequiredDocuments, generateBenefitTimeline
    ─▶ app.checklist_items    dokumenty, gdzie złożyć (płatnik vs ZUS) i terminy
    ─▶ /kalkulator            wstępne wypełnienie { monthlyBasisGrosze | grossMonthlyGrosze } — podstawa płatnika jest używana bez zmian
```

- **Najpierw deterministycznie.** Żadnego zewnętrznego AI, chyba że
  `DOCUMENT_LLM_FALLBACK=true`, skonfigurowano `AI_PROVIDER` *i* użytkownik
  zaznaczy zgodę AI dla tego uploadu. Propozycje mają `source: LLM`, niską
  pewność i nigdy nie są automatycznie potwierdzane.
- **Potwierdzenie jest obowiązkowe.** „Potwierdź i oblicz” pozostaje wyłączone,
  dopóki każde wymagane pole nie jest wypełnione, poprawne i potwierdzone;
  placeholder „Do uzupełnienia” nigdy nie jest poprawną kwotą.
- **Podstawa vs brutto.** „Podstawa wymiaru zasiłku” (Z-3/Z-3a) →
  `KNOWN_BASIS`; wynagrodzenie brutto → `GROSS_MONTHLY` (13,71% odlicza silnik);
  kwota o niejasnym charakterze jest pokazywana, ale nigdy nie przenoszona.
- **Prywatność.** Nazwy plików i treść nigdy nie trafiają do logów;
  przechowywany jest tylko hint kodu formularza wyprowadzony z nazwy. Pliki i
  wiersze są czyszczone po TTL (`DOCUMENT_TTL_HOURS`, domyślnie 24) przy
  następnym uploadzie lub przez `POST /documents/cleanup`.
- **Przykładowe sprawy.** Cztery syntetyczne sprawy (SC-SYN-01…04) są generowane
  w kodzie (`packages/documents/src/samples`). Prawdziwe sprawy ZUS nigdy nie są
  commitowane: umieść je w `fixtures/private/sample-cases/` (poza gitem) z
  `manifest.json` (`{"cases":[{"id","code","label","formCode","file","expected":{…}}]}`)
  i ustaw `SAMPLE_CASES_DIR`; zestaw testów referencyjnych uruchomi je również.

### Symulowane logowanie przez mObywatel

`/mobywatel` imituje prawdziwy przepływ login.gov.pl → mObywatel: wybór metody,
potwierdzenie syntetycznej osoby, przegląd zakresu danych i potwierdzenie PIN-em
lub biometrią. API przechowuje tylko identyfikator osoby w podpisanym ciasteczku
HttpOnly (`zpr_mobywatel`, 10 minut); `/start` je odczytuje i wstępnie wypełnia
kreator. PESEL nie jest wymagany ani przechowywany, a każdy ekran jest oznaczony
**SYMULACJA**.

### Przykłady `curl`

```bash
curl -s http://localhost:3000/api/v1/health | jq

curl -s 'http://localhost:3000/api/v1/knowledge/search?q=zasi%C5%82ek%20macierzy%C5%84ski&limit=3' | jq

# Dokładny kod formularza, ważny w danej dacie, tylko źródła prawne
curl -s 'http://localhost:3000/api/v1/knowledge/search?q=Z-3a&asOf=2027-02-01&sourceType=FORM_INSTRUCTION,LEGAL_ACT' | jq

curl -s -X POST http://localhost:3000/api/v1/calculations \
  -H 'content-type: application/json' \
  -d '{"input":{"grossMonthlyIncomeGrosze":800000,"childrenCount":1,"secondParentParentalWeeks":9,"paternityDays":14}}' | jq

# Dokumenty: upload (wymagana zgoda), ekstrakcja, potwierdzenie (cookie jar trzyma sesję)
curl -s -c /tmp/zpr -b /tmp/zpr -X POST http://localhost:3000/api/v1/documents \
  -F 'file=@zaswiadczenie.pdf;type=application/pdf' -F 'consent=DOCUMENT_PROCESSING' | jq
curl -s -c /tmp/zpr -b /tmp/zpr -X POST http://localhost:3000/api/v1/documents/<id>/extract | jq
curl -s -c /tmp/zpr -b /tmp/zpr -X POST http://localhost:3000/api/v1/sample-cases/anna-zam/load | jq

curl -s -X POST http://localhost:3000/api/v1/assistant/messages \
  -H 'content-type: application/json' \
  -d '{"message":"Jestem na B2B i jestem w ciąży. Co powinnam zrobić?"}' | jq
```

## Architektura

```text
apps/web                 # UI Next.js, brama panelu admina i przekazywanie API same-origin
├── app/                 # polskie strony, centrum wiedzy i przekazywanie /api/*
├── components/          # kalkulator, asystent, oś czasu, onboarding, shell
├── server/              # klient REST dla danych stron i czytnik sesji
└── e2e/                 # testy Playwright UI, dostępności i REST

apps/api                 # usługa REST Next.js
├── app/api/             # publiczne handlery API
├── app/internal/        # uwierzytelnione endpointy odczytu panelu i admina
├── server/              # repozytoria, usługi biznesowe, parsowanie i limity
└── tests/               # testy jednostkowe backendu

packages/
├── domain/              # @zpr/domain — czysty kalkulator, uprawnienia, dokumenty, terminy, scenariusze, oś czasu, analiza e-ZLA
├── ai/                  # @zpr/ai — orkiestracja asystenta, narzędzia, strażnicy, fabryka dostawców, model reguł
├── contracts/           # @zpr/contracts — schematy Zod env, API, onboarding, kalkulator, import danych
├── data-sources/        # @zpr/data-sources — scenariusze demo, dostawcy instytucji, silnik mapowania
├── documents/           # @zpr/documents — odczyt PDF, detekcja formularzy, szablony R1316, walidatory, mapowanie faktów, syntetyczne próbki
├── db/                  # @zpr/db — schemat Drizzle, repozytoria, dane startowe, migracje, kontrola stanu
├── rag/                 # @zpr/rag — potok przetwarzania, embeddingi, hybrydowe wyszukiwanie
│   ├── knowledge/       #   wersjonowane w repozytorium (redystrybuowalne) kuratorowane źródła
│   └── evals/           #   zestaw ewaluacji wyszukiwania używany przez kb:verify
└── ui/                  # @workspace/ui — prymitywy shadcn/ui i motyw
```

Aplikacja web komunikuje się z API przez HTTP. API jest właścicielem połączenia
z bazą i usług biznesowych. Obie aplikacje współdzielą typy żądań i odpowiedzi
przez `@zpr/contracts`. Odczyt panelu i admina odbywa się przez uwierzytelnione
żądania serwer-serwer. Po włączeniu bramy admina API sprawdza również sesję
administratora.

Kierunek zależności: `apps/api → @zpr/contracts → @zpr/domain`,
`apps/api → @zpr/rag → @zpr/db`, `apps/api → @zpr/ai → @zpr/contracts, @zpr/domain`.
`apps/api → @zpr/data-sources → @zpr/contracts, @zpr/domain`.
`@zpr/domain` jest czysty i nie wykonuje I/O; `@zpr/ai` nie ma dostępu do bazy —
API wstrzykuje usługi aplikacji przez port `AssistantServices`.

### OpenRouter

Ustaw te wartości w głównym `.env` (wybierz identyfikator modelu w OpenRouter):

```dotenv
AI_PROVIDER=openrouter
AI_MODEL=provider/model-id
AI_API_KEY=your-openrouter-api-key
```

Następnie uruchom `docker compose up --build -d api`. OpenRouter domyślnie
używa `https://openrouter.ai/api/v1`; można to nadpisać przez `AI_BASE_URL`.
Model musi obsługiwać wywoływanie narzędzi, ponieważ asystent korzysta z
wyszukiwania i obliczeń.

### Symulowane pobieranie danych

`/dane` startuje po istniejącej symulacji mObywatel. Nic nie jest pobierane,
dopóki użytkownik nie wybierze zakresów danych i nie potwierdzi:

1. **Zgoda** — każda instytucja pokazuje swoje zakresy (historia ubezpieczenia,
   podstawy składek, zatrudnienie, zwolnienia, dane dziecka, sprawy zasiłkowe).
2. **Pobieranie per źródło** — ZUS, pracodawca/płatnik, e-ZLA, USC i PUE/eZUS
   działają jako osobni dostawcy z własnym postępem i stanami błędów.
3. **Podsumowanie** — pobrane, niedostępne, wymagane ręcznie pola i
   niespójności między źródłami, każde z proweniencją.
4. **Weryfikacja** — każde pole pokazuje pochodzenie; zmiany są oznaczane jako
   ręczne. Podgląd uruchamia deterministyczne reguły uprawnień i kalkulator,
   zanim cokolwiek zostanie zaakceptowane.

Zaakceptowane dane trafiają do `app.data_import_sessions` i
`app.data_import_snapshots`, a następnie są rzutowane na znormalizowane tabele
(`contribution_bases`, `sick_leave_periods`, `children`, `benefit_applications`,
`contribution_payers`, `payroll_components`, `payroll_absences`) i wiązane z
gospodarstwem przez `importSessionId` podczas onboardingu. Kreator i kalkulator
czytają to samo zaakceptowane wstępne wypełnienie; panel pokazuje ostatni raport
pobrania i wynik uprawnień.

Scenariusze demo (syntetyczne, deterministyczne, bez losowości):

| Scenariusz              | Osoba           | Cel                                                                                                  |
| ----------------------- | --------------- | ---------------------------------------------------------------------------------------------------- |
| `anna-employment`       | Anna Kowalska   | Umowa o pracę, ciągłe obowiązkowe ubezpieczenie, e-ZLA ciążowe, USC nie ma jeszcze aktu urodzenia     |
| `marek-self-employment` | Marek Wiśniewski | Jednoosobowa działalność, dobrowolne ubezpieczenie chorobowe, otwarte zaległości składkowe, dziecko z USC, sprawy PUE |
| `kasia-incomplete`      | Kasia Nowak     | Umowa zlecenia zakończona przed porodem, luka w ubezpieczeniu, awaria e-ZLA, puste USC/PUE — wymagane uzupełnienie ręczne |

Silnik scenariuszy jest czysty i deterministyczny. Dostawcy implementują jeden
interfejs (`DataSourceProvider`), więc prawdziwa integracja może zastąpić
dostawcę bez zmiany przepływu, kontraktów ani mapowania.

### Centrum wiedzy

Czytelne dla człowieka centrum wiedzy to warstwa redakcyjna oparta na bazie, w
schemacie `kb` (tabele `content_*`), oddzielona od korpusu RAG. Kategorie,
artykuły (strukturalne bloki JSON), FAQ, karty dokumentów, procedury, terminy
słownika, oficjalne źródła, odniesienia prawne i ogólne powiązania są zasiewane
z `packages/db/src/content/` i można je edytować bez zmian w kodzie. Strony
artykułów i przewodników renderują źródła, podstawę prawną i `lastReviewedAt`;
`/admin/wiedza` jest za istniejącą bramą admina i pozwala ukryć lub opublikować
rekord. Wyszukiwanie jest odporne na polskie znaki diakrytyczne i działa po
stronie serwera; szczegóły w [docs/knowledge-center.md](docs/knowledge-center.md).

### Asystent rozmowny

Jedna tura: **czyszczenie PII → klasyfikacja intencji → polityka narzędzi →
pętla narzędzi (`streamText`) → odpowiedź strumieniowa → strażnicy →
persystencja.**

- **Niezależny od dostawcy** (Vercel AI SDK 7): `AI_PROVIDER=anthropic | openai |
  openrouter | ollama | openai-compatible`. Przy `none` (domyślnie) model reguł
  offline wpina się w tę samą pętlę `streamText`: te same narzędzia, prawdziwe
  wyszukiwanie, strażnicy, strumieniowanie i zapis; odpowiedź jest składana
  wyłącznie z wyników narzędzi i pobranych fragmentów.
- **Narzędzia** (Zod, strict, tylko do odczytu): `searchKnowledgeBase`,
  `getUserInsuranceProfile`, `checkBenefitEligibility`, `calculateBenefit`,
  `compareLeaveScenarios`, `getRequiredDocuments`, `getRelevantDeadlines`,
  `getBenefitTimeline`. Żadne nie przyjmuje SQL, nazw tabel ani identyfikatorów
  użytkownika; żadne nie zapisuje. Zmiany profilu lub planu odbywają się tylko w
  kreatorze, kalkulatorze i planerze.
- **Polityka narzędzi**: klasyfikator intencji wskazuje wymagane narzędzia
  (wyszukiwanie przy każdym pytaniu prawnym; uprawnienia →
  `checkBenefitEligibility`, kwoty → `calculateBenefit`, plany →
  `compareLeaveScenarios`, dokumenty → `getRequiredDocuments`, terminy →
  `getRelevantDeadlines`). `prepareStep` wymusza każde z nich (`toolChoice`),
  maksymalnie dwie próby, ostatni krok odpowiada.
- **RAG**: fragmenty są filtrowane po dacie ważności (`asOf`), oznaczane
  `S1…` w obrębie tury, wysyłane do modelu jako dane `<untrusted_source>`
  (neutralizowane) i pokazywane jako klikalne cytaty z lokalizacją, stroną i
  okresem ważności. Źródła tylko cytowane nigdy nie są cytowane dosłownie.
  Wcześniejsze tury trafiają do modelu jako zwykły tekst, bez starych cytatów i
  wyników narzędzi.
- **Strażnicy** (`data-grounding`): nieznane etykiety `[S#]`, liczby
  nieobecne w wynikach narzędzi/źródłach/wiadomościach użytkownika, treści o
  uprawnieniach bez narzędzia uprawnień, odpowiedzi prawne bez cytatów.
- **Prywatność i bezpieczeństwo**: PESEL, numery kont, dokumentów, e-mail i
  telefon są usuwane, zanim zobaczy je model i baza; logi zawierają tylko
  identyfikatory i liczby; podpisane ciasteczko `zpr_sid` jest właścicielem
  rozmów (każdy odczyt i usunięcie jest filtrowane po właścicielu w SQL);
  użycie profilu wymaga przełącznika per żądanie, sesji powiązanej z
  onboardingiem i zgody AI; limity działają na adres i sesję.

### Układ bazy danych

Jedna baza PostgreSQL, pięć schematów:

| Schemat | Zawartość                                                                                     |
| ------- | --------------------------------------------------------------------------------------------- |
| `app`   | użytkownicy, profile, ubezpieczenie/zatrudnienie, zdarzenia rodzinne, sprawy, scenariusze, obliczenia, szkice |
| `legal` | reguły prawne i wersjonowane zestawy reguł                                                     |
| `kb`    | źródła/dokumenty/fragmenty wiedzy, zadania indeksowania, modele embeddingów, treści Centrum wiedzy (`content_*`) |
| `chat`  | rozmowy, wiadomości, wywołania narzędzi, pobrane dowody                                        |
| `docs`  | uploady (TTL 24 h), ekstrakcje (pola jako jeden snapshot JSON), ustalenia walidacji; `app.checklist_items` przechowuje wygenerowaną checklistę |

`kb.knowledge_chunks` przechowuje niezależny od modelu tekst i metadane
(`content`, zakres stron, `section_identifier`, `heading_path`,
`legal_reference`, `valid_from`/`valid_to`, `content_hash`, tagi świadczeń) oraz
dwie kolumny wyszukiwania liczone przez aplikację (`search_text`, `stem_text`) z
generowanymi `tsvector`. Wektory żyją w `kb.chunk_embeddings`, po jednym wierszu
na (fragment, model embeddingów).

Indeksy:

- **częściowy indeks HNSW per model embeddingów** (`kb.ensure_embedding_index`),
  tworzony przez potok przetwarzania dla wymiaru tego modelu,
- indeksy GIN na `search_tsv` (dokładne kody, np. `Z-3a`) i `stem_tsv`
  (odporne na polską fleksję słowa kluczowe),
- GIN `jsonb_path_ops` na metadanych fragmentów; B-tree na ważności i
  odniesieniach.

### Baza wiedzy (RAG)

`@zpr/rag` implementuje potok przetwarzania i wyszukiwanie hybrydowe. Przeczytaj
[docs/knowledge-sources.md](docs/knowledge-sources.md), zanim dodasz lub
zaktualizujesz źródło.

- **Przetwarzanie (ingestion)** — rejestracja → ekstrakcja (PDF/HTML/Markdown, z podziałem na
  strony) → granice → normalizacja → chunking świadomy sekcji (polska gramatyka
  prawnicza: Rozdział/Art./§/ust./pkt/lit.; nagłówki przewodników ze spisu
  treści) → embedding → zapis → indeks → weryfikacja. Idempotentne (klucz
  źródła + hash treści), z ponowieniami i weryfikacją w transakcji zapisu.
- **Wersje** — wersje dokumentów mają daty obowiązywania; daty na poziomie
  przepisu pochodzą z notek o zmianach (np. art. 9 ust. 4 od 2027-01-01).
- **Wyszukiwanie** — pgvector + pełnotekstowe rankingiem BM25 + dokładne terminy
  domenowe (ZAM, e-ZLA, Z-3/Z-3a, „Za życiem”) + dopasowania fraz, łączone przez
  RRF, z filtrami dostępu/metadanych/dat, priorem autorytetu, skalibrowanym
  progiem trafności i jawnym wynikiem `NO_EVIDENCE`.
- **Dostęp** — PUBLIC / INTERNAL / RESTRICTED per źródło i dokument. PDF-y
  konkursowe są INTERNAL i tylko do cytowania; przykładowe sprawy ZUS są
  RESTRICTED i pipeline je odrzuca.

| Komenda                                    | Cel                                                          |
| ------------------------------------------ | ------------------------------------------------------------ |
| `pnpm kb:seed`                             | Odtwarzalna baza wiedzy ze źródeł wersjonowanych w repozytorium, potem `kb:verify` |
| `pnpm kb:seed -- --with-local`             | Dodatkowo wczytaj lokalne PDF-y konkursowe (`KB_LOCAL_SOURCES_DIR`) |
| `pnpm kb:verify`                           | Kontrole integralności + zestaw ewaluacji wyszukiwania (brama czułości) |
| `pnpm --filter @zpr/rag kb:ingest …`       | Wczytaj / ponownie wczytaj jeden dokument lub źródło z manifestu |
| `pnpm --filter @zpr/rag kb:inspect <file>` | Próba ekstrakcji i chunkingu bez bazy                        |
| `pnpm --filter @zpr/rag kb:search "<q>"`   | Debugowanie rankingu (rangi per lista, trafność, daty)       |
| `pnpm --filter @zpr/rag kb:reembed`        | Ponowny embedding z nową konfiguracją `EMBEDDING_*`          |

### Embeddingi

`EmbeddingProvider` (`embedDocument()`, `embedQuery()`) ma dwa adaptery:

- `local-demo` — deterministyczne offline hashowanie cech (domyślnie, 1024
  wymiary). Jest leksykalne, nie semantyczne; utrzymuje demo i testy
  odtwarzalnymi.
- OpenAI-compatible `/embeddings` (`openai`, `ollama`, `openai-compatible`) do
  produkcji, np. model wielojęzyczny `bge-m3`.

Ta sama konfiguracja `EMBEDDING_*` steruje przetwarzaniem i wyszukiwaniem. Każda
konfiguracja ma własny, odciskany wiersz `kb.embedding_models` i indeks, więc
zmiana dostawcy, modelu, wymiarów lub prefiksów nigdy nie miesza wektorów — po
zmianie uruchom `pnpm --filter @zpr/rag kb:reembed`.

### Role w bazie danych

Migracja tworzy role grupowe NOLOGIN:

| Rola           | Dostęp                                         |
| -------------- | ---------------------------------------------- |
| `zpr_app`      | odczyt `legal`/`kb`; odczyt/zapis `app` i `chat` |
| `zpr_ingest`   | odczyt `legal`; odczyt/zapis `kb`              |
| `zpr_readonly` | tylko odczyt we wszystkich schematach          |

Lokalny development łączy się jako właściciel (`zpr`). Wdrożenie przypina role
logowania do tych grup zamiast używać konta właściciela.

### Brama administratora

`ADMIN_GATE_ENABLED=false` domyślnie, więc strony admina szkieletu są dostępne w
demo. Ustaw `true`, aby chronić `/admin` demonstracyjnym logowaniem:

- e-mail `admin@zpr.local`
- hasło `demo-admin` (z `ADMIN_DEMO_PASSWORD`)

Sesja to podpisane HMAC-em ciasteczko HttpOnly `zpr_admin`. Przed jakimkolwiek
prawdziwym wdrożeniem zastąp demonstracyjny przepływ logowania.

### Parametry reguł

Kalkulator, planer osi czasu i wskazówki terminowe w UI pobierają wspólne
parametry prawne z `legal.legal_rule_versions.parameters` w `apps/api`.
Aplikacja web czyta zwalidowany zestaw przez uwierzytelniony widok
`/internal/rule-set`. Zmiana tych procentów, liczby tygodni i terminów jest
zmianą danych. Rozszerzone endpointy oceny i narzędzia silnika asystenta
zachowują wersjonowany katalog reguł oceny opisany w
[calculation-engine.md](docs/calculation-engine.md); nowe przypadki adopcji,
utraty i hospitalizacji zachowują swoje reguły ustawowe.

Aktywny zestaw jest rozwiązywany dla daty (`getRuleParameters(asOf)`), mapowany
po stabilnych kodach reguł (`LR-123`, `LR-127`, `LR-130`, `LR-112`, `LR-133`,
`LR-100`, `LR-132`, `LR-134`, `LR-101`, `LR-102`) i walidowany przed użyciem.
Brakujący lub błędny parametr zwraca odpowiedź problem `503` zamiast po cichu
użyć starej wartości.

Zmienisz wartość w `/admin/reguly` (FR-ADM-01). Wybierz regułę, edytuj pola,
dodaj datę obowiązywania i źródło, a następnie zapisz: panel dopisuje nową
niezmienną wersję i zamyka poprzednią dzień wcześniej. API waliduje każdą
wartość względem wspólnego katalogu pól
(`packages/contracts/src/rules-admin.ts`) i przepuszcza kandydata przez
`buildRuleSet` przed zapisem, więc zapis nie może opublikować niespójnego
zestawu. Obliczenia przypinają wersję reguł i nadal czytają stare wartości dla
starych dat. Ponowne uruchomienie `pnpm --filter @zpr/db db:seed` nie nadpisuje
już istniejących wersji, więc zmiany admina przetrwają ponowne zasiewanie.
Wyniki zapisują wersję zestawu reguł i przypinają `rule_version_id` reguły
kwotowej (`LR-130`).

## Skrypty

| Komenda                                                                    | Opis                                                                                         |
| -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `pnpm dev`                                                                 | Uruchom wszystkie projekty w trybie obserwacji zmian                                         |
| `pnpm build`                                                               | Zbuduj wszystkie projekty                                                                     |
| `pnpm typecheck`                                                           | Sprawdź typy we wszystkich projektach                                                         |
| `pnpm lint`                                                                | Sprawdź jakość kodu we wszystkich projektach                                                  |
| `pnpm test`                                                                | Uruchom Vitest we wszystkich projektach (ustaw `TEST_DATABASE_URL`, by włączyć testy integracyjne pgvector) |
| `pnpm e2e`                                                                 | Uruchom Playwright (najpierw build przez Turbo)                                              |
| `pnpm --filter @zpr/db db:migrate`                                         | Zastosuj migracje Drizzle                                                                     |
| `pnpm --filter @zpr/db db:seed`                                            | Zasiej syntetyczne dane demo (idempotentnie)                                                  |
| `pnpm kb:seed` / `pnpm kb:verify`                                          | Zbuduj / zweryfikuj bazę wiedzy                                                               |
| `pnpm db:setup`                                                            | migracje + dane demo + baza wiedzy                                                            |
| `pnpm --filter @zpr/db db:generate`                                        | Wygeneruj migrację po zmianie schematu                                                        |
| `pnpm --filter @zpr/db db:studio`                                          | Otwórz Drizzle Studio                                                                         |
| `pnpm --filter web e2e`                                                    | Uruchom Playwright przeciw działającemu serwerowi                                             |

Testy Playwright domyślnie używają PostgreSQL wypełnionej danymi startowymi i
startują obie aplikacje. Ustaw `PLAYWRIGHT_BASE_URL`, aby testować już działającą
parę web + API.

Playwright potrzebuje jednorazowej instalacji przeglądarek:

```bash
pnpm --filter web exec playwright install chromium
```

## Dane demonstracyjne

Skrypty zasiewające wstawiają wyłącznie syntetyczne osoby i redystrybuowalną
wiedzę — bez prawdziwych spraw ZUS i danych osobowych:

- **Anna Kowalska** — zatrudniona, jedno dziecko, standardowy wariant 100%/70%
- **Tomasz Kowalski** — zatrudniony ojciec, podział ojcowskiego/rodzicielskiego
- **Kasia Nowak** — umowa zlecenia kończąca się przed porodem
- **Marek Wiśniewski** — jednoosobowa działalność z dobrowolnym ubezpieczeniem
  chorobowym
- Scenariusze pobierania danych: Anna (zatrudnienie), Marek (działalność), Kasia
  (niepełna historia), spójne w ZUS, pracodawcy, e-ZLA, USC i PUE
- `kb:seed`: kuratorowane źródła w `packages/rag/knowledge/` (fragmenty ustaw w
  dwóch wersjach dat, Kodeks pracy, instrukcje formularzy, tabela świadczeń,
  „Za życiem”, podsumowanie przewodnika, organizacje wsparcia), podzielone na
  fragmenty i zembeddingowane; PDF-y konkursowe są dodawane tylko z
  `--with-local` i pozostają INTERNAL
- Wersjonowane reguły prawne, demonstracyjny zestaw reguł i przykładowe
  obliczenie

Dane logowania w demo i wszystkie nazwiska są fikcyjne. Linki rządowe prowadzą
do oficjalnych stron publicznych, ale aplikacja nigdy nie wywołuje rządowego
API.

## Testy i akceptacja

```bash
pnpm typecheck
pnpm lint
pnpm test
TEST_DATABASE_URL=postgresql://zpr:zpr_local_password@localhost:5435/zpr pnpm test   # + pgvector i integracja dokumentów
pnpm kb:verify
pnpm build
pnpm --filter web e2e
```

Testy bazy wiedzy (`packages/rag`): testy jednostkowe normalizacji, detekcji
struktury prawnej i przewodników, chunkingu, kompatybilności embeddingów, fuzji,
redakcji PII i BM25; testy integracyjne (każdy we własnej jednorazowej bazie)
dla etapów przetwarzania, idempotencji, aktualizacji, deduplikacji, ponowień,
wycofywania transakcji, odrzucania źródeł RESTRICTED, wyszukiwania wektorowego, dokładnego
wyszukiwania słów kluczowych (ZAM, e-ZLA, Z-3 vs Z-3a, „Za życiem”, urlop
rodzicielski, zasiłek macierzyński), filtrów metadanych i dostępu, wersjonowanych
źródeł prawnych i wyników bez trafień.

Zestaw obejmuje też normalizację i kwoty kalkulatora, zaokrąglanie pieniędzy,
walidację env (w tym odrzucanie produkcyjnych sekretów), kamienie milowe osi
czasu, ostrzeżenia dokumentów, odpowiedzi problem API, nagłówki wszystkich tras,
przepływy kalkulatora i asystenta oraz testy dostępności axe na `/`,
`/kalkulator`, `/asystent`, `/mobywatel` i `/dane` w rozmiarach desktop i mobile.

Testy dokumentów (`packages/documents`, `apps/api/tests/documents*.test.ts`,
`apps/web/tests/document-prefill.test.ts`, `apps/web/e2e/documents.spec.ts`):
detekcja formularzy (kody cało-tokenowe, `ZAMOWIENIE.pdf`, Z-3b/ZUR/ZAO/ZAS-53),
ekstrakcja AcroForm i szablonów na syntetycznych PDF-ach, walidatory, czyszczenie
mechanizmu awaryjnego LLM, przypadki referencyjne SC-SYN przez silnik, kody statusów API
(400/403/404/413/415/429), zgody, czyszczenie TTL na PostgreSQL, regresja
podstawa-vs-brutto oraz przepływy E2E z axe.

Testy pobierania danych (`packages/data-sources`): spójność scenariuszy
(płatnik, daty zatrudnienia i ubezpieczenia, podstawy składek vs podstawa
zasiłku, data urodzenia z USC vs PUE), deterministyczność wyniku, filtrowanie
zakresów zgód, puste/błędne źródła, samozatrudnienie i zaległości, niepełna
historia ubezpieczenia, mapowanie do kalkulatora i reguł uprawnień oraz analiza
e-ZLA. Przepływ API pokrywa `apps/web/e2e/data-import.spec.ts` (zgoda →
pobieranie → podsumowanie → weryfikacja → wstępne wypełnienie onboardingu) oraz
ścieżka ręcznego pominięcia.

Testy asystenta (`packages/ai`, `apps/web/tests/assistant-security.test.ts`,
`apps/web/e2e/assistant.spec.ts`): wybór narzędzi dla wszystkich obsługiwanych
typów pytań, wymuszanie narzędzi przez politykę przy niekooperującym LLM (mock
model), odpowiedzi oparte na źródłach i części dowodowe, zmyślone cytaty i
liczby, brak dowodów i awarie wyszukiwania, brakujące fakty o użytkowniku
(jedno pytanie uzupełniające, bez wymyślania dochodu), wstrzyknięcie polecenia
(prompt injection) w tekście użytkownika, historia i pobrane fragmenty,
niepoprawne argumenty narzędzi (schema + walidacja w narzędziu, limit pętli),
autoryzacja i minimalizacja profilu, fałszowane ciasteczka sesji, własność i
usuwanie rozmów, usuwanie PII, kolejność strumieniowania, awaria dostawcy i
przerwanie oraz ciągłość wielu tur.

### Silnik obliczeń

`@zpr/domain/engine` decyduje o uprawnieniach i wylicza świadczenia rodzicielskie
bez LLM: dokładna arytmetyka pieniężna BigInt/rational, reguły i stawki
wersjonowane po dacie obowiązywania (`2026.07-Z1`, `2026.10-Z1`, `2027.01-Z1`),
ocena z uprawnieniami, przysługującymi świadczeniami, rozbiciem, sumami,
okresami, alokacją per rodzic, zastosowanymi regułami, źródłami, założeniami,
brakującymi dowodami, ostrzeżeniami i kolejnymi krokami. Endpointy REST powyżej i
narzędzia asystenta są adapterami nad tym samym `evaluate`. Szczegóły w
[docs/calculation-engine.md](docs/calculation-engine.md).

## Znane ograniczenia

- Kwoty są szacunkami, nigdy decyzjami ZUS. Deterministyczny silnik
  (`docs/calculation-engine.md`) używa dokładnej arytmetyki i wersjonowanych
  reguł, ale Q-29 (minimalne wynagrodzenie, świadczenie rodzicielskie,
  przeciętne wynagrodzenie) nie występuje w dostarczonych źródłach, więc
  dotknięte wyniki są oznaczane jako dolne/górne granice, a zaokrąglanie (Q-15)
  jest udokumentowanym założeniem. 20 nieobsługiwanych scenariuszy prawnych jest
  wymienionych w tym dokumencie. Oficjalne przykładowe sprawy ZUS nie były
  dostępne, więc nie twierdzimy, że wyniki się z nimi zgadzają.
- Bez `AI_PROVIDER` asystent działa w trybie offline na regułach: odpowiedzi są
  oparte na źródłach i ustrukturyzowane, ale sformułowania są szablonowe.
  Skonfiguruj LLM, aby uzyskać naturalne odpowiedzi.
- Kuratorowana baza wiedzy jest mała (np. brak tekstu KP art. 182¹e o łączeniu
  urlopu z pracą), więc część pytań uczciwie kończy się „brak dowodów”.
- Sesje są na poziomie demo: onboarding z e-mailem wiąże syntetycznego
  użytkownika z przeglądarką; nie ma prawdziwego uwierzytelniania.
- Szablony dokumentów podążają za zakresem danych załączników 2, 3 i 6 R1316,
  ale dokładne układy wydruków ZUS (Q-20) i prawdziwe przykładowe sprawy (Q-19)
  nie były dostępne: ekstrakcja jest weryfikowana tylko na syntetycznych PDF-ach.
  OCR wymaga `pdftoppm` + `tesseract -l pol` i jest domyślnie wyłączony;
  parsowanie działa w procesie z limitem czasu (brak osobnego workera).
- Panel admina ma demo logowania, edytor parametrów prawnych i inwentarz wiedzy;
  zmiany są audytowane przez historię wersji, a nie przez konta użytkowników.
- Integracje rządowe, wnioski i przepływy PZ/eZUS nie są zaimplementowane.
  `/dane` symuluje je lokalnie; żadne żądanie nie opuszcza aplikacji.
- Sesja pobierania danych jest na poziomie demo: zgody i proweniencja są
  zapisywane, ale nie ma produkcyjnego potwierdzenia tożsamości ani śladu
  audytowego.
- Offline'owy model embeddingów nie nadaje się do produkcyjnej jakości
  wyszukiwania.

## Dokumentacja w repozytorium

- [docs/architecture.md](docs/architecture.md) — architektura systemu
- [docs/domain-model.md](docs/domain-model.md) — model domenowy
- [docs/requirements.md](docs/requirements.md) — wymagania
- [docs/requirements-traceability.md](docs/requirements-traceability.md) — mapowanie wymagań
- [docs/calculation-engine.md](docs/calculation-engine.md) — silnik obliczeń i reguły
- [docs/calculator-ux.md](docs/calculator-ux.md) — UX kalkulatora
- [docs/database-design.md](docs/database-design.md) — projekt bazy danych
- [docs/knowledge-sources.md](docs/knowledge-sources.md) — źródła wiedzy
- [docs/knowledge-center.md](docs/knowledge-center.md) — centrum wiedzy
- [docs/rag-architecture.md](docs/rag-architecture.md) — architektura RAG
- [docs/demo-scenarios.md](docs/demo-scenarios.md) — scenariusze demo
- [docs/legal-assumptions.md](docs/legal-assumptions.md) — założenia prawne
- [docs/implementation-roadmap.md](docs/implementation-roadmap.md) — roadmapa
- [docs/start-pipeline.md](docs/start-pipeline.md) — pipeline startowy
- [docs/start-pipeline-audit.md](docs/start-pipeline-audit.md) — audyt pipeline'u startowego
- [docs/design/app-restyle.md](docs/design/app-restyle.md) — kierunek wizualny aplikacji

Projekt jest demonstracją hackathonową. Przed użyciem produkcyjnym trzeba
zastąpić symulacje prawdziwymi integracjami, dodać uwierzytelnianie i audyt,
zatwierdzić nieuregulowane parametry prawne oraz przeprowadzić przegląd
bezpieczeństwa i zgodności.
