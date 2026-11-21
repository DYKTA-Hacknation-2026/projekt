# Centrum wiedzy — model treści i utrzymanie

Status: v1.0 · 2026-11-21 · Powiązane: [knowledge-sources.md](knowledge-sources.md), [architecture.md](architecture.md)

Centrum wiedzy to redakcyjna warstwa aplikacji: artykuły, FAQ, karty dokumentów,
przewodniki i słownik. Jest **osobne od bazy RAG** (`kb.knowledge_sources` /
`kb.knowledge_chunks`). RAG dostarcza fragmenty do asystenta; Centrum wiedzy
publikuje materiał dla człowieka, z datą weryfikacji, źródłami i podstawą prawną.

## 1. Gdzie to jest

| Ścieżka | Zawartość |
|---------|-----------|
| `/wiedza` | strona główna: wyszukiwarka, 9 kategorii, polecane, popularne FAQ, ostatnie zmiany |
| `/wiedza/kategoria/[slug]` | artykuły, FAQ, przewodniki, dokumenty i pojęcia w dziale |
| `/wiedza/artykul/[slug]` | artykuł z sekcjami, najważniejszymi informacjami, wskazówkami, FAQ, dokumentami, źródłami i podstawą prawną |
| `/wiedza/faq` | FAQ z filtrem kategorii i wyszukiwaniem po pytaniu, krótkiej odpowiedzi i wyjaśnieniu |
| `/wiedza/artykuly` | indeks artykułów z filtrem i wyszukiwaniem |
| `/wiedza/dokumenty` | karty dokumentów i formularzy |
| `/wiedza/dokumenty/[slug]` | karta dokumentu: cel, kiedy, kto wypełnia, gdzie złożyć, oficjalny link |
| `/wiedza/przewodniki` | lista procedur krok po kroku |
| `/wiedza/przewodniki/[slug]` | warunki, dokumenty, kroki, terminy, miejsca, typowe problemy, źródła |
| `/wiedza/slownik` | słownik z filtrem alfabetycznym i wyszukiwaniem |
| `/wiedza/slownik/[slug]` | definicja, wyjaśnienie, przykład, powiązane artykuły |
| `/wiedza/szukaj?q=` | wyszukiwanie po całym centrum, grupowane po typie |
| `/wiedza/zrodla` | rejestr źródeł oficjalnych z datą weryfikacji |
| `/admin/wiedza` | inwentarz treści, statusy, daty przeglądu, ukrywanie/publikowanie |

Wszystkie trasy publiczne działają bez logowania. `/admin/wiedza` jest objęte
istniejącym proxy `/admin/:path*` i tą samą sesją administratora co reszta panelu.

## 2. Model danych

Schemat `kb`, tabele `content_*`:

| Tabela | Rola |
|--------|------|
| `content_categories` | 9 kategorii: slug, tytuł, opis, ikona Lucide, kolejność, status |
| `content_articles` | artykuł: slug, kategoria, tytuł, lead, `blocks` (JSONB), `key_points`, `practical_tips`, słowa kluczowe, czas czytania, wyróżnienie, popularność, status, data weryfikacji i publikacji |
| `content_faq_items` | pytanie, krótka odpowiedź, wyjaśnienie, warunki, „co zrobić”, wyróżnienie, popularność, powiązany artykuł, opcjonalny link do kalkulatora i przewodnika, status, data weryfikacji |
| `content_documents` | karta dokumentu: kod (np. ZAM), nazwa, rodzaj, cel, kiedy wymagany, kto wypełnia/składa, potrzebne informacje, dokumenty dodatkowe, kanały złożenia, oficjalny URL, opcjonalny link do generatora/kalkulatora, status, data weryfikacji |
| `content_guides` | przewodnik: cel, odbiorca, warunki, dokumenty, kroki, terminy, miejsca, problemy, opcjonalny kalkulator, status, data weryfikacji |
| `content_glossary_terms` | pojęcie, litera, definicja, wyjaśnienie, przykład, status, data weryfikacji |
| `content_sources` | rejestr źródeł: wydawca, typ, URL, data dostępu i weryfikacji |
| `content_legal_references` | cytat (np. `KP art. 180 § 1`), tytuł, akt, URL, data obowiązywania, notatka |
| `content_article_sources` | wiele źródeł na artykuł + locator (np. „s. 30”) + oznaczenie źródła głównego |
| `content_article_legal_references` | wiele podstaw prawnych na artykuł + locator |
| `content_relations` | ogólne powiązania między typami treści (`ARTICLE`, `FAQ`, `DOCUMENT`, `GUIDE`, `GLOSSARY`), z etykietą i kolejnością |

`ContentStatus`: `DRAFT`, `IN_REVIEW`, `PUBLISHED`, `ARCHIVED`. Publiczne zapytania
filtrują po `PUBLISHED`. Data `last_reviewed_at` jest wymagana i wyświetlana w UI.
Powiązania są pobierane w obu kierunkach, więc artykuł pokazuje powiązane
dokumenty, przewodniki i pojęcia bez duplikowania wpisów.

Bloki artykułu mają typy: `paragraph`, `heading`, `list`, `callout`, `table`.
Renderowanie odbywa się bez `dangerouslySetInnerHTML`. Dzięki temu treść jest
edytowalna w bazie, a aplikacja nie wykonuje kodu z treści.

## 3. Seed i aktualizacja treści

Treść startowa (MVP) leży w `packages/db/src/content/` i jest wczytywana przez
`pnpm --filter @zpr/db db:seed` (wywołanie `seedKnowledgeCenter`).

- `slugs.ts` — stabilne adresy; nie zmieniaj po publikacji.
- `categories.ts`, `sources.ts` — kategorie, źródła, podstawy prawne.
- `articles.ts`, `faq.ts`, `documents.ts`, `guides.ts`, `glossary.ts` — treści.
- `relations.ts` — powiązania między typami.

Seed jest idempotentny: rekordy są kluczowane po `slug` (źródła po `slug`,
podstawy prawne po `citation`), a powiązania są przebudowywane. Zmiana treści nie
wymaga zmiany kodu aplikacji — można też edytować rekordy bezpośrednio w bazie
lub w Drizzle Studio (`pnpm --filter @zpr/db db:studio`). Po edycji w bazie
należy odświeżyć strony (są dynamiczne).

Aby dodać artykuł:

1. Dodaj wpis do `CONTENT_ARTICLES` (unikalny `slug`, kategoria, bloki, źródła,
   podstawy prawne, data weryfikacji).
2. Dodaj powiązania w `relations.ts` (dokumenty, przewodniki, FAQ przez
   `articleSlug` w FAQ).
3. Uruchom `pnpm --filter @zpr/db db:migrate` (jeśli zmienił się schemat) i
   `pnpm --filter @zpr/db db:seed`.
4. Sprawdź `/wiedza/artykul/<slug>`, `/wiedza/szukaj?q=<fraza>` i a11y.

## 4. Zasady wiarygodności

- Informacje o prawach, terminach i obowiązkach mają źródło i datę weryfikacji.
- Rozróżniamy **oficjalny formularz** od **karty informacyjnej** i **materiału
  demonstracyjnego** (`DOCUMENT_KIND`: `FORM`, `CERTIFICATE`, `ATTACHMENT`, `DEMO`).
- Nie kopiujemy nieaktualnych druków. Karta Z-3b jest celowo oznaczona jako
  wycofana; ZAM zastępuje ZUR i ZAO; Z-15 zastępuje Z-15A/B.
- Kwoty, których nie da się rzetelnie potwierdzić (np. minimalna podstawa i
  świadczenie rodzicielskie — Q-29), nie są podawane jako fakt. Kalkulator
  pokazuje `INDETERMINATE`.
- Linki do źródeł są sprawdzane okresowo. Ostatnia weryfikacja seedu:
  2026-11-21. Rejestr: `/wiedza/zrodla`.

## 5. Wyszukiwanie

Wyszukiwanie jest po stronie bazy (bez zewnętrznego indeksu): `translate(lower(...))`
usuwa polskie znaki diakrytyczne, a zapytanie trafia w tytuł, lead, treść bloków
(JSONB jako tekst), pytania/odpowiedzi, karty dokumentów, przewodniki i słownik.
Wyniki są grupowane po typie i sortowane prostym scoringiem (dokładny tytuł >
prefiks > zawieranie > trafienie w opis). To wystarcza dla korpusu MVP; przy
większym wolumenie warto dodać `tsvector` i indeks GIN, tak jak w RAG.

## 6. Testy

```bash
pnpm --filter @zpr/db typecheck
pnpm --filter web typecheck
pnpm --filter web lint
pnpm --filter web build
pnpm --filter web e2e            # routes, knowledge, a11y, mobile
```

Testy e2e zakładają działającą bazę z `db:seed`. Publiczne trasy nie wymagają
logowania; `/admin/wiedza` wymaga sesji tylko przy `ADMIN_GATE_ENABLED=true`.

## 7. Znane ograniczenia

- Brak pełnego edytora WYSIWYG. Treść edytuje się w bazie/seedzie; panel
  administracyjny pozwala publikować i ukrywać materiały oraz pokazuje przegląd
  weryfikacji.
- Brak generatora wniosków w repozytorium. Karty dokumentów linkują do
  oficjalnego wzoru ZUS oraz do istniejącego analizatora `/dokumenty` i
  kalkulatora `/kalkulator`; pole `generator_href` jest przygotowane na przyszły
  generator.
- Część treści ma charakter redakcyjny i wymaga okresowego przeglądu prawnego
  (szczególnie zmiany formularzy i kwoty progowe).
- Linki ISAP mogą zwracać 403 dla botów; w przeglądarce działają. ZUS może
  blokować automatyczne requesty — status linku trzeba sprawdzać ręcznie.
