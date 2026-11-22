# Dopracowanie strony głównej

Zachowano paletę zieleni, Source Sans 3, zdjęcia, główne sekcje i istniejące narzędzia. Skrócono powtarzające się opisy i zastąpiono rozbudowane historie syntetycznych osób krótkimi sytuacjami prowadzącymi do odpowiednich narzędzi. Centrum wiedzy ma wspólny układ zdjęcia, tekstu i odnośników.

Kierunek ze skilla: **Colour chapters**, seed **1298868112**. Zachowane kolory i typografia. Bez ponownego losowania. Prośba o pozostanie blisko obecnej strony miała pierwszeństwo przed zmianą hero i całej kompozycji na pełnoekranowe rozdziały. Fragment narzędzia: **Framed sheet**, seed **146983691**.

Pomysł: Plan Rodzicielstwa staje się konkretnym przykładem tego, jak czas obojga rodziców i formalności układają się w całość. Interakcja: wybór okresu urlopu lub terminu otwiera jego daty i opis. Podgląd wylicza daty przez silnik domenowy, z demonstracyjnym terminem porodu 10 marca 2027 i domyślnym podziałem jak w planerze. Na telefonie oś zmienia się w listę okresów. Przykład jest podpisany jako poglądowy; nie ocenia indywidualnych uprawnień.

| Pomiar przy 1440 px | Przed | Po |
| --- | ---: | ---: |
| Słowa według inspektora | 656 | 490 |
| Długość strony w ekranach | 6,8 | 5,8 |
| Zdjęcia | 4 | 4 |
| Błędy inspektora przy 1440, 768 i 390 px | 1 | 0 |
| Przewijanie poziome | 0 | 0 |

Inspektor uruchomiony na końcowej wersji produkcyjnej (`next build` i `next start`, port 3022). Obejrzano wszystkie 8 wygenerowanych zrzutów. Lint skilla: 0 FAIL, 0 WARN. Końcowa inspekcja: 0 FAIL, 3 WARN. Uzasadnienia ostrzeżeń:

- Brak filmu: zachowano cztery istniejące zdjęcia rodzinne i powolny ruch zdjęcia w hero; nie dodawano niepowiązanego materiału do istniejącej marki.
- Marginesy: ostrzeżenie dotyczy granic tekstu, a nie kontenerów. Kontenery strony mają równe zewnętrzne marginesy; potwierdzono na zrzutach i w CSS. Krótkie odnośniki po prawej nie dochodzą literami do samej krawędzi kontenera.
- Kontrast 5,6:1: inspektor wybiera biały tekst na firmowej zieleni w hero jako tekst dominujący na małych ekranach. Zachowany kontrast przekracza WCAG AA; zwykłe akapity na jasnym tle są w pełnym kolorze tekstu.

`next build` i kontrola TypeScript zakończone pomyślnie. Playwright: 14 testów strony głównej na desktopie i telefonie, w tym szczegóły planu, terminy, linki, FAQ z klawiatury, zdjęcia i brak poziomego overflow. Standardowa konfiguracja ESLint repozytorium pomija TS/TSX; wymuszenie rozszerzeń ujawnia istniejący problem parsera Babel z TSX. Nie zmieniano konfiguracji lintowania w ramach zadania wizualnego.

Testowa instancja API otrzymała osobną bazę `zpr_c8449d45_preview`, z migracjami, danymi demonstracyjnymi i indeksem wiedzy. Stara współdzielona baza nie zawierała wymaganych kolumn i reguł. Próba standardowego seeda na starej bazie wycofała transakcję; dalsza konfiguracja odbyła się w osobnej bazie.

## Ocena końcowa

ROUND 3
Seen in one second: duże hasło i rodzice z noworodkiem; widoczne rozpoczęcie formularza lub rozmowy.
Idea (one sentence): wspólny plan rodzicielstwa jest pokazany przez rzeczywiste daty i okresy z silnika aplikacji.
Live thing: wybór urlopu lub terminu pokazuje szczegóły i prowadzi do właściwego narzędzia.
Layout words by section: hero=split / methods=text columns / tools=index / plan=wide workspace / scenarios=photo and links / FAQ=side heading and disclosures / knowledge=photo and reading links / close=action band
Scores: design 7.5 · usability 8 · creativity 7 · content 8 → overall 7.6
Caps applied: creativity ≤7, bo sam motyw przewodnika i osi czasu jest znaną konwencją; zachowano go świadomie.
Top three problems (most visible first), each with the screenshot it shows in and the fix:
1. Podgląd na telefonie pozostaje dłuższy od pozostałych bloków (mobile-page-01); terminy i szczegóły zachowano dla czytelności i obsługi klawiaturą.
2. Krótki urlop ojcowski wymaga etykiety obok paska (desktop-page-01); dodano etykietę i rozszerzono obszar kliknięcia bez fałszowania czasu trwania.
3. Zdjęcia pozostają materiałami stockowymi (desktop-fold, desktop-page-01); zachowano je zgodnie z zakresem, można później zastąpić własnymi.

## Zachowane zdjęcia

Nie dodano nowych zdjęć, rysunków ani filmu. Wszystkie podpisy i odnośniki licencyjne są już w stopce, w „Zdjęcia i licencje”.

| Tytuł | Autor | Licencja | Źródło |
| --- | --- | --- | --- |
| Couple Standing by Window Holding Newborn | Dasha Halepova | Pexels | https://www.pexels.com/photo/couple-standing-by-window-holding-newborn-16852493/ |
| Father and Mother Holding Baby Son | Gisele Seidel | Pexels | https://www.pexels.com/photo/father-and-mother-holding-baby-son-20729677/ |
| Heart shape on a pregnant belly | freestocks.org | CC0 | https://www.flickr.com/photos/135396164@N05/32152969191 |
| Father Baby Child | rawpixel | CC0 | https://www.rawpixel.com/image/5917055/image-public-domain-hand-people |

Przed prawdziwą publikacją należy potwierdzić aktualność parametrów prawnych i świadomie zachować albo zaktualizować podpisany przykład 10 marca 2027. Informacja o demonstracyjnym charakterze serwisu pozostaje widoczna.
