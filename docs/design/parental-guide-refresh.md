# Kierunek wizualny: przewodnik blisko rodziny

Brief: dominująca paleta ZUS, duże autentyczne fotografie z darmowego stocka,
przystępny charakter, żadnych generowanych zdjęć. Poprzedni projekt był zbyt
pusty, zbyt granatowy i zbyt typograficzny.

## Inwentarz i idea

Rodzice, ciąża, narodziny, wspólna opieka, etat, działalność gospodarcza,
urlop macierzyński, urlop drugiego rodzica, formularze ZUS, podstawy prawne,
syntetyczne przykłady, jawne braki danych.

Na tej stronie wspólny czas rodziców staje się osią rodzinnego magazynu:
zdjęcia pokazują ludzi, a planer i narzędzia porządkują sprawy wokół ich życia.

Odbiorca: przyszli i obecni rodzice bez znajomości przepisów.
Główne działanie: rozpocząć kreator /start.

## System

- Zieleń ZUS #007834 (potwierdzona w https://www.zus.pl/o/portal-theme/css/main.css).
- Ciemna zieleń #025a28, biel #ffffff, jasna zieleń #edf5ee,
  tekst #22372b, ciepły akcent #fab856 (także używany przez ZUS).
- Source Sans 3: nagłówki 600, tekst 400, kontrolki 600. Bez szeryfów.
- Jeden rytm marginesów, zielony blok i duża fotografia w otwarciu;
  dalej lista narzędzi ze zdjęciem, działający przykład planu, historie i FAQ.
- Zdjęcia lokalne, naturalne światło, bez tekstu na twarzach i bez udawanych rekomendacji.

## Argument i treści

1. Przewodnik pomaga przygotować sprawy rodzicielskie → rodzina i kreator.
2. Można wybrać konkretne narzędzie → prawdziwe odnośniki do pięciu funkcji.
3. Opiekę można zaplanować wspólnie → działający, jawnie przykładowy planer.
4. Sytuacje rodzin są różne → syntetyczne scenariusze opisane jako demo.
5. Użytkownik wie, co oznacza demonstracja → FAQ i odnośnik do ograniczeń.
6. Następny krok jest jasny → kreator.

## Losowanie

Skill design-taste-frontend, kierunek borrowed-category / Dressed as something else,
seed 2061965047. Zapożyczona kategoria: magazyn rodzinny.
Paleta i typografia zachowane jako jawne wymagania briefu.
Hero z fashion-drop odrzucony: 27% szerokości na zdjęcie i tekst poza pierwszym
widokiem kolidowały z wymaganiem dominującej fotografii oraz widocznego opisu.
Geometria dostosowana do magazynu: zielony tekstowy blok i duży kadr rodziny.
Sekcje o abstrakcyjnych diagramach zastąpione rzeczywistą listą funkcji i istniejącym
planerem, bo diagramy nie były dowodem działania przewodnika.

## Przed zmianą

1440: headline 67px / 2 linie, 1 zdjęcie, 2 kroje pisma, 4.8 ekranów.
768: wybrany nagłówek rozbijał się na 3 linie.
390: hero pozbawiony zdjęcia; fotografia dopiero daleko poniżej.
Inspektor: 7 FAIL (m.in. brak zdjęć, powtarzalne panele z ikonami, mały tekst).
Zrzuty i raport początkowy: /tmp/zpr-v2-before.

## ROUND 1

Seen in one second: zielone otwarcie i rodzice z noworodkiem.
Idea (one sentence): wspólny czas rodziny prowadzi do uporządkowanych formalności.
Live thing: przełączany widok urlopu dla mamy, drugiego rodzica i obojga.
Layout words by section: hero=kolor+foto / tools=lista+foto / plan=demo+foto /
scenarios=portret+historie / faq=pytania / close=zielone pole.
Scores: design 7.8 · usability 8.0 · creativity 7.0 · content 8.0 → overall 7.7.
Caps applied: brak (4 fotografie, działający fragment, nagłówki do 2 linii).
Top three problems (most visible first), each with the screenshot it shows in and the fix:
1. desktop-fold.jpg: za wysoko przycięta głowa ojca → przesunąć kadr w górę źródła.
2. tablet/mobile: drugorzędny tekst bywa zbyt szary → przyciemnić token tekstu pomocniczego.
3. Brak wideo → pozostawić 4 fotografie i powolny ruch głównego zdjęcia. Klip
   nie pokazuje żadnego rzeczywistego procesu ani produktu, a brief wymaga zdjęć.
WARN off-centre: widoczne ramy treści mają równe 84px, nagłówek i fotografia
zamykają siatkę. Pomiar tekstu ostatniego odnośnika w nagłówku nie uwzględnia
pełnej szerokości przycisku; nie przesuwać całej strony pod ten pomiar.

## ROUND 2

Seen in one second: rodzina i dominująca zieleń #007834.
Idea (one sentence): rodzinne fotografie prowadzą do konkretnych narzędzi.
Live thing: przełączany planer oraz natywne pytania FAQ dostępne z klawiatury.
Layout words by section: hero=kolor+foto / tools=lista+foto / plan=demo+foto /
scenarios=portret+historie / faq=pytania / close=zielone pole.
Scores: design 8.0 · usability 8.2 · creativity 7.0 · content 8.0 → overall 7.9.
Caps applied: brak.
Top three problems (most visible first), each with the screenshot it shows in and the fix:
1. Test axe w telefonie uchwycił animację opacity tekstu na zieleni: usunięto
   przygaszanie tekstu z animacji, zachowując zmianę położenia.
2. WARN grey-body: dotyczy białego tekstu na firmowej zieleni (5.6:1), nie szarego
   tekstu na bieli. Kontrast spełnia WCAG AA; zachowana zieleń zgodna z briefem.
3. Zdjęcia są stockowe, nie przedstawiają użytkowników aplikacji. Nie dodano
   rekomendacji ani informacji sugerujących współpracę fotografowanych osób.

## ROUND 3 — final, production build

Seen in one second: duże zdjęcie rodziców obok białego hasła na zieleni ZUS.
Idea (one sentence): wspólny czas rodziców staje się osią przewodnika po formalnościach.
Live thing: przełączany planer i otwierane z klawiatury FAQ.
Layout words by section: hero=kolor+foto / tools=lista+foto / plan=demo+foto /
scenarios=portret+historie / faq=pytania / close=zielone pole.
Scores: design 8.0 · usability 8.2 · creativity 7.0 · content 8.0 → overall 7.9.
Caps applied: brak.
Top three problems (most visible first), each with the screenshot it shows in and the fix:
1. Brak krytycznych kolizji, przepełnień i niewidocznej treści po końcowej kontroli
   wszystkich siedmiu arkuszy desktop/tablet/mobile.
2. Pozostaje WARN no-footage: celowo fotografie i powolny ruch zdjęcia zamiast
   klipu niezwiązanego z rzeczywistym działaniem aplikacji.
3. Pozostają WARN off-centre i grey-body: ramy zdjęcia/sekcji są równe, a mierzone
   5.6:1 to biały tekst na zieleni marki; uzasadnienia powyżej.

### Wyniki

- Produkcyjne next build: sukces (kompilacja i TypeScript).
- ESLint: sukces. Skill lint: 0 FAIL, 0 WARN.
- Skill inspect, wersja produkcyjna na 1440/768/390: 0 FAIL, 3 uzasadnione WARN.
- 12 testów Playwright desktop/mobile: sukces (nawigacja, kreator, 4 zdjęcia,
  przełączanie rodziców, FAQ z klawiatury i axe WCAG A/AA strony głównej).
- Osobny axe w trybie ciemnym: 0 naruszeń.
- Reduced motion: animationName none; treść widoczna.
- Telefon 320px: brak poziomego przepełnienia.
- Menu mobilne: otwiera się, przechodzi do /kalkulator i zamyka po nawigacji.
- Lokalna wersja na :3002: /, /start i /api/health zwracają HTTP 200.

Porównanie: 1 → 4 prawdziwe fotografie; 2 → 1 krój pisma; 7 → 0 FAIL.
Nagłówki mieszczą się w dwóch liniach na wszystkich trzech szerokościach.
Pliki końcowe inspektora: /tmp/zpr-v2-final.

Wszystkie cztery fotografie: szczegóły autorów, tytułów i licencji w
apps/web/public/images/CREDITS.md. Kredyty dostępne również w stopce strony,
w sekcji „Zdjęcia i licencje”. Brak zdjęć generowanych oraz rysunków udających zdjęcia.
Scenariusze i oś czasu pozostają demonstracyjne; nie są dowodem uprawnień.
