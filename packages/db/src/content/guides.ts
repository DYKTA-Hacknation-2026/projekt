import type {
  GuideDocumentRef,
  GuideProblem,
  GuideStep,
} from "@zpr/contracts/content"

import { CATEGORY_SLUGS } from "./slugs"
import { REVIEW_DATE } from "./meta"

export interface GuideSeed {
  slug: string
  categorySlug: string
  title: string
  summary: string
  audience: string
  conditions: string[]
  documents: GuideDocumentRef[]
  steps: GuideStep[]
  deadlines: string[]
  places: string[]
  problems: GuideProblem[]
  calculatorHref?: string
  sortOrder: number
  lastReviewedAt: string
}

export const CONTENT_GUIDES: GuideSeed[] = [
  {
    slug: "jak-ubiegac-sie-o-zasilek-macierzynski",
    categorySlug: CATEGORY_SLUGS.procedures,
    title: "Jak ubiegać się o zasiłek macierzyński",
    summary:
      "Od wniosku o urlop po wypłatę. Sprawdź, czy jesteś pracownikiem, zleceniobiorcą czy przedsiębiorcą — od tego zależą dokumenty.",
    audience:
      "Rodzice, którzy w dniu porodu lub przyjęcia dziecka są objęci ubezpieczeniem chorobowym.",
    conditions: [
      "Ubezpieczenie chorobowe w dniu porodu lub przyjęcia dziecka na wychowanie.",
      "Urodzenie dziecka, przysposobienie albo przyjęcie dziecka w ramach rodziny zastępczej (z wyjątkiem zawodowej).",
      "Złożenie wniosku o urlop lub zasiłek w wymaganym terminie.",
    ],
    documents: [
      { label: "Wniosek urlopowy do pracodawcy", slug: "wniosek-urlopowy-pracodawca" },
      { label: "Wniosek ZAM", slug: "wniosek-zam" },
      { label: "Zaświadczenie Z-3 lub Z-3a", slug: "zaswiadczenie-z-3" },
      { label: "Skrócony odpis aktu urodzenia", slug: "skrocony-odpis-aktu-urodzenia" },
      { label: "Zaświadczenie „Za życiem”", slug: "zaswiadczenie-za-zyciem" },
    ],
    steps: [
      {
        title: "Ustal, kto wypłaca zasiłek",
        description:
          "Pracownik u dużego płatnika zwykle otrzymuje zasiłek od pracodawcy. U małego płatnika dokumenty trafiają do ZUS. Przedsiębiorcy zawsze składają do ZUS. Zapytaj kadry, gdzie masz złożyć papiery.",
      },
      {
        title: "Złóż wniosek o urlop",
        description:
          "Pracownik składa pracodawcy wniosek o urlop macierzyński. Dołącz dokumenty wymagane przez pracodawcę, m.in. odpis aktu urodzenia, jeżeli jest potrzebny.",
        tip: "Wniosek złóż w formie papierowej lub elektronicznej. Zachowaj potwierdzenie.",
      },
      {
        title: "Przygotuj dane dziecka i drugiego rodzica",
        description:
          "Potrzebne są imię, nazwisko, PESEL, data i miejsce urodzenia dziecka oraz dane drugiego rodzica, jeżeli będzie korzystał z urlopu lub zasiłku.",
      },
      {
        title: "Złóż ZAM, jeżeli zasiłek wypłaca ZUS",
        description:
          "Wypełnij wniosek ZAM i wyślij go przez PUE/eZUS lub złóż w placówce. Gdy wypłaca płatnik, ZAM może nie być potrzebny — wystarczy wniosek urlopowy i Z-3/Z-3a.",
        tip: "Od 24 października 2026 r. ZAM zastępuje ZUR i ZAO. Nie używaj starych druków.",
      },
      {
        title: "Wybierz wariant 100%/70% albo 81,5%",
        description:
          "Jeśli chcesz 81,5% za całość, złóż wniosek nie później niż 21 dni po porodzie. Pamiętaj, że 9 tygodni drugiego rodzica zawsze wynosi 70%.",
      },
      {
        title: "Sprawdź decyzję i wypłatę",
        description:
          "Po złożeniu wniosku sprawdzaj PUE/eZUS lub kontaktuj się z kadrami. Jeżeli ZUS prosi o uzupełnienie, odpowiedz w terminie. Roszczenie przedawnia się po 6 miesiącach od końca okresu zasiłkowego.",
      },
    ],
    deadlines: [
      "Wniosek o 81,5% — nie później niż 21 dni po porodzie.",
      "Wniosek o urlop rodzicielski — co najmniej 21 dni przed rozpoczęciem.",
      "Wniosek o urlop ojcowski — co najmniej 7 dni przed rozpoczęciem.",
      "Przedawnienie roszczenia — 6 miesięcy od ostatniego dnia okresu zasiłkowego.",
    ],
    places: [
      "Pracodawca — wniosek o urlop i dokumenty kadrowe.",
      "PUE/eZUS — wniosek ZAM i dokumenty, gdy zasiłek wypłaca ZUS.",
      "Placówka ZUS — forma papierowa.",
    ],
    problems: [
      {
        problem: "Pracodawca twierdzi, że nie ma formularza ZAM.",
        solution:
          "ZAM jest formularzem ZUS. Pobierz aktualny wzór ze strony zus.pl lub złóż wniosek przez PUE/eZUS. Pracodawca nie musi mieć własnego druku.",
      },
      {
        problem: "Umowa kończy się przed porodem.",
        solution:
          "Sprawdź, czy masz inny tytuł ubezpieczenia. Skontaktuj się z ZUS przed porodem — zasiłek macierzyński wymaga ubezpieczenia w dniu porodu.",
      },
      {
        problem: "ZUS prosi o odpis aktu urodzenia mimo zmiany przepisów.",
        solution:
          "Od 24 października 2026 r. ZUS co do zasady pozyskuje dane z rejestru. Jeżeli nie może, może poprosić o dokument. Zapytaj, dlaczego dane nie zostały pobrane.",
      },
    ],
    calculatorHref: "/kalkulator",
    sortOrder: 10,
    lastReviewedAt: REVIEW_DATE,
  },
  {
    slug: "jak-uzyskac-zasilek-chorobowy-w-ciazy",
    categorySlug: CATEGORY_SLUGS.procedures,
    title: "Jak uzyskać zasiłek chorobowy w ciąży",
    summary:
      "e-ZLA z kodem B, wniosek, dokumenty i terminy. Sprawdź, co zrobić, gdy zwolnienie nie pojawia się u pracodawcy.",
    audience:
      "Osoby w ciąży, którym lekarz stwierdził niezdolność do pracy.",
    conditions: [
      "Ubezpieczenie chorobowe i spełnienie okresu wyczekiwania (30 lub 90 dni), chyba że zachodzi wyjątek.",
      "e-ZLA wystawione przez lekarza, najlepiej z kodem B.",
      "Złożenie wniosku, jeżeli zasiłek wypłaca ZUS.",
    ],
    documents: [
      { label: "e-ZLA", slug: "e-zla" },
      { label: "Wniosek ZAS-53 (przedsiębiorcy)", slug: "wniosek-zas-53" },
      { label: "Zaświadczenie Z-3 lub Z-3a", slug: "zaswiadczenie-z-3" },
      { label: "Oświadczenie Z-10", slug: "oswiadczenie-z-10" },
    ],
    steps: [
      {
        title: "Poproś lekarza o e-ZLA",
        description:
          "Zwolnienie wystawia lekarz, gdy stwierdzi niezdolność do pracy. W ciąży poproś o kod B, jeżeli niezdolność jest związana z ciążą. Kod B daje 100% podstawy.",
      },
      {
        title: "Sprawdź e-ZLA",
        description:
          "Lekarz przesyła zwolnienie elektronicznie do ZUS i pracodawcy. Sprawdź okres i kod. Jeżeli pracodawca nie widzi zwolnienia, skontaktuj się z lekarzem i kadrami.",
      },
      {
        title: "Ustal, kto wypłaca",
        description:
          "Przez pierwsze 33 dni choroby w roku pracodawca wypłaca wynagrodzenie chorobowe. Od 34. dnia zasiłek wypłaca płatnik lub ZUS. Przedsiębiorcom zawsze ZUS.",
      },
      {
        title: "Złóż wniosek, jeśli jest wymagany",
        description:
          "Przedsiębiorcy składają ZAS-53. Pracownicy u dużego płatnika zwykle nie składają odrębnego wniosku, jeżeli e-ZLA jest widoczne. Przy wypłacie przez ZUS potrzebne jest Z-3/Z-3a.",
      },
      {
        title: "Pilnuj okresu zasiłkowego",
        description:
          "Standardowo 182 dni, w ciąży do 270 dni. Przerwy do 60 dni wliczają się do okresu zasiłkowego. Po ustaniu ubezpieczenia zasiłek może być wypłacany do 91 dni, z wyjątkami.",
      },
    ],
    deadlines: [
      "Płatnik ma zwykle 7 dni na przekazanie Z-3/Z-3a po otrzymaniu zwolnienia.",
      "Zasiłek chorobowy w ciąży — do 270 dni.",
      "Roszczenie przedawnia się po 6 miesiącach od końca okresu zasiłkowego.",
    ],
    places: [
      "Pracodawca — wynagrodzenie chorobowe i dokumenty.",
      "PUE/eZUS — wniosek ZAS-53, Z-3, Z-3a.",
      "Placówka ZUS — forma papierowa.",
    ],
    problems: [
      {
        problem: "Lekarz nie wpisał kodu B.",
        solution:
          "Poproś o korektę e-ZLA. Bez kodu B zasiłek może być obliczony jak standardowy (80%).",
      },
      {
        problem: "Zwolnienie nie pojawia się u pracodawcy.",
        solution:
          "Sprawdź, czy lekarz wysłał e-ZLA. Jeżeli system nie działał, może być potrzebny wydruk lub zaświadczenie alternatywne. Skontaktuj się z kadrami.",
      },
      {
        problem: "Pracodawca nie wypłaca zasiłku.",
        solution:
          "Sprawdź, czy firma wypłaca zasiłki, czy przekazuje dokumenty do ZUS. Jeżeli minął termin, zapytaj o przyczynę na piśmie i skontaktuj się z ZUS.",
      },
    ],
    sortOrder: 20,
    lastReviewedAt: REVIEW_DATE,
  },
  {
    slug: "dokumenty-po-narodzinach-krok-po-kroku",
    categorySlug: CATEGORY_SLUGS.procedures,
    title: "Dokumenty po narodzinach — krok po kroku",
    summary:
      "Zgłoszenie urodzenia, akt urodzenia, PESEL, wniosek o zasiłek i ubezpieczenie zdrowotne dziecka. W jednej kolejności.",
    audience: "Rodzice po urodzeniu dziecka, także osoby prowadzące działalność i rodziny adopcyjne.",
    conditions: [
      "Urodzenie dziecka w Polsce.",
      "Karta urodzenia przekazana do urzędu stanu cywilnego.",
    ],
    documents: [
      { label: "Karta urodzenia — od szpitala", slug: "skrocony-odpis-aktu-urodzenia" },
      { label: "Wniosek ZAM", slug: "wniosek-zam" },
      { label: "Wniosek urlopowy", slug: "wniosek-urlopowy-pracodawca" },
      { label: "Zaświadczenie Z-3 lub Z-3a", slug: "zaswiadczenie-z-3" },
      { label: "Dokument tożsamości i numer rachunku", slug: "dokument-tozsamosci-i-rachunek" },
    ],
    steps: [
      {
        title: "Odbierz kartę urodzenia ze szpitala",
        description:
          "Kartę wystawia lekarz lub położna i przekazuje do USC w ciągu 3 dni. Sprawdź, czy dane są poprawne.",
      },
      {
        title: "Zgłoś urodzenie w ciągu 21 dni",
        description:
          "Zgłoś urodzenie w USC, online przez gov.pl lub w mObywatelu. Wybierz imię dziecka i sposób odbioru dokumentów.",
        tip: "Jeżeli nie zgłosisz w terminie, USC zrobi to z urzędu i samo wybierze imię.",
      },
      {
        title: "Odbierz akt urodzenia i PESEL",
        description:
          "Kierownik USC sporządza akt urodzenia i wydaje jeden bezpłatny odpis skrócony. Sprawdź dane dziecka i numer PESEL.",
      },
      {
        title: "Zgłoś dziecko do ubezpieczenia zdrowotnego",
        description:
          "Pracownik zgłasza dziecko u pracodawcy. Osoba prowadząca działalność — w ZUS. Dziecko może być zgłoszone do ubezpieczenia rodzica.",
      },
      {
        title: "Złóż wniosek o zasiłek macierzyński",
        description:
          "Pracownik składa wniosek u pracodawcy, przedsiębiorca — ZAM w ZUS. Dołącz dane dziecka i drugiego rodzica. Odpis aktu nie jest wymagany, gdy zasiłek wypłaca ZUS.",
      },
      {
        title: "Zaplanuj urlop i powrót do pracy",
        description:
          "Ustal, kto wykorzysta urlop macierzyński i rodzicielski, w tym 9 tygodni dla każdego rodzica. Złóż wnioski w terminach.",
      },
    ],
    deadlines: [
      "Zgłoszenie urodzenia — 21 dni od wystawienia karty urodzenia.",
      "Zgłoszenie martwego urodzenia — 3 dni.",
      "Wniosek o 81,5% — 21 dni po porodzie.",
      "Wniosek o urlop rodzicielski — 21 dni przed rozpoczęciem.",
    ],
    places: [
      "Urząd stanu cywilnego właściwy dla miejsca urodzenia.",
      "Gov.pl / mObywatel — zgłoszenie online.",
      "Pracodawca — ubezpieczenie zdrowotne i wniosek o urlop.",
      "PUE/eZUS — wniosek ZAM i dokumenty.",
    ],
    problems: [
      {
        problem: "Nie wiem, czy dziecko ma PESEL.",
        solution:
          "Sprawdź odpis skrócony aktu urodzenia lub powiadomienie z USC. Jeżeli PESEL nie został nadany, zapytaj w USC.",
      },
      {
        problem: "Pracodawca prosi o odpis aktu, choć zasiłek wypłaca ZUS.",
        solution:
          "Odpis nie jest już wymagany, gdy ZUS wypłaca zasiłek. Jeżeli pracodawca go potrzebuje do celów kadrowych, przekaż kopię, ale nie musi trafiać do ZUS.",
      },
      {
        problem: "Nie wiem, gdzie złożyć wniosek o zasiłek.",
        solution:
          "Pracownik — u pracodawcy. Przedsiębiorca i zleceniobiorca — w ZUS przez PUE/eZUS. Sprawdź, kto wypłaca zasiłek w Twojej firmie.",
      },
    ],
    calculatorHref: "/kalkulator",
    sortOrder: 30,
    lastReviewedAt: REVIEW_DATE,
  },
  {
    slug: "jak-podzielic-urlop-rodzicielski",
    categorySlug: CATEGORY_SLUGS.procedures,
    title: "Jak podzielić urlop rodzicielski między rodziców",
    summary:
      "Policz 41/43 tygodnie, zaplanuj 9 tygodni dla każdego rodzica i sprawdź, czy łączenie z pracą się opłaca.",
    audience: "Rodzice pracujący, którzy planują urlop rodzicielski po macierzyńskim.",
    conditions: [
      "Wykorzystany urlop macierzyński albo zasiłek macierzyński za odpowiadający mu okres.",
      "Złożenie wniosku co najmniej 21 dni przed rozpoczęciem urlopu.",
      "Ustalenie, ile urlopu wykorzystał drugi rodzic.",
    ],
    documents: [
      { label: "Wniosek urlopowy do pracodawcy", slug: "wniosek-urlopowy-pracodawca" },
      { label: "Wniosek ZAM", slug: "wniosek-zam" },
      { label: "Zaświadczenie Z-3 lub Z-3a", slug: "zaswiadczenie-z-3" },
      { label: "Zaświadczenie „Za życiem”", slug: "zaswiadczenie-za-zyciem" },
    ],
    steps: [
      {
        title: "Ustal wymiar",
        description:
          "41 tygodni przy jednym dziecku, 43 tygodnie przy ciąży mnogiej. Z „Za życiem” odpowiednio 65/67 tygodni. To pula łączna dla obojga rodziców.",
      },
      {
        title: "Zarezerwuj 9 tygodni dla każdego rodzica",
        description:
          "Każdy rodzic ma 9 tygodni, których nie można przenieść. Jeżeli jeden rodzic nie skorzysta, te tygodnie przepadają. Zaplanuj je na początku, a nie na końcu.",
      },
      {
        title: "Wybierz części urlopu",
        description:
          "Urlop można wykorzystać jednorazowo albo w maksymalnie 5 częściach, do końca roku kalendarzowego, w którym dziecko kończy 6 lat. Wniosek składa się co najmniej 21 dni przed każdą częścią.",
      },
      {
        title: "Zdecyduj, czy łączyć z pracą",
        description:
          "Praca u tego samego pracodawcy do połowy etatu wydłuża urlop proporcjonalnie — maks. do 82/86 tygodni. Zasiłek zmniejsza się proporcjonalnie. Poproś kadry o wyliczenie.",
        tip: "Łączenie z pracą wymaga odrębnego wniosku, również 21 dni wcześniej.",
      },
      {
        title: "Złóż wnioski i oświadczenia",
        description:
          "Każdy rodzic składa własny wniosek. Dołącz oświadczenie o urlopie wykorzystanym przez drugiego rodzica. Pracodawca ma obowiązek uwzględnić poprawny wniosek o urlop.",
      },
      {
        title: "Sprawdź zasiłek",
        description:
          "Za okres rodzicielski zasiłek wynosi 70% podstawy, a w wariancie 81,5% — 81,5%, z wyjątkiem 9 tygodni drugiego rodzica. Porównaj warianty w kalkulatorze.",
      },
    ],
    deadlines: [
      "21 dni przed każdą częścią urlopu rodzicielskiego.",
      "21 dni przed rozpoczęciem pracy w trakcie urlopu.",
      "Do końca roku kalendarzowego, w którym dziecko kończy 6 lat — wykorzystanie urlopu.",
    ],
    places: [
      "Pracodawca — wnioski urlopowe.",
      "PUE/eZUS — dokumenty do zasiłku, jeżeli wypłaca ZUS.",
      "Kalkulator — porównanie wariantów.",
    ],
    problems: [
      {
        problem: "Drugi rodzic nie chce korzystać z 9 tygodni.",
        solution:
          "Te tygodnie przepadają — nie można ich przenieść. Zaplanuj je mimo wszystko, bo to płatny czas z dzieckiem i część wspólnej puli.",
      },
      {
        problem: "Pracodawca odmawia łączenia urlopu z pracą.",
        solution:
          "Może odmówić tylko z powodu organizacji lub rodzaju pracy i musi podać przyczynę w ciągu 7 dni. Poproś o odmowę na piśmie.",
      },
      {
        problem: "Nie wiem, ile urlopu już wykorzystaliśmy.",
        solution:
          "Poproś pracodawców obojga rodziców o zaświadczenie o wykorzystanym urlopie i zasiłku. ZUS może także potwierdzić okresy wypłaty.",
      },
    ],
    calculatorHref: "/kalkulator",
    sortOrder: 40,
    lastReviewedAt: REVIEW_DATE,
  },
  {
    slug: "co-zrobic-po-zakonczeniu-umowy",
    categorySlug: CATEGORY_SLUGS.procedures,
    title: "Co zrobić po zakończeniu umowy o pracę",
    summary:
      "Sprawdź ubezpieczenie, zabezpiecz dokumenty i zdecyduj, czy możesz kontynuować ubezpieczenie chorobowe. Krótka lista działań.",
    audience:
      "Osoby, którym kończy się umowa o pracę, zlecenie lub działalność, zwłaszcza w ciąży lub przed porodem.",
    conditions: [
      "Zakończenie tytułu ubezpieczenia.",
      "Brak nowego tytułu w dniu zdarzenia albo przerwa między tytułami.",
    ],
    documents: [
      { label: "Świadectwo pracy", slug: "wniosek-urlopowy-pracodawca" },
      { label: "Zaświadczenie Z-3 lub Z-3a", slug: "zaswiadczenie-z-3" },
      { label: "Oświadczenie Z-10", slug: "oswiadczenie-z-10" },
      { label: "e-ZLA", slug: "e-zla" },
    ],
    steps: [
      {
        title: "Zapisz daty",
        description:
          "Ustal datę rozwiązania umowy, datę porodu i datę rozpoczęcia nowej pracy. Każdy dzień luki ma znaczenie.",
      },
      {
        title: "Sprawdź zgłoszenie w ZUS",
        description:
          "Wejdź na PUE/eZUS i sprawdź, do kiedy trwało ubezpieczenie chorobowe. Jeżeli dane się nie zgadzają, zgłoś to płatnikowi.",
      },
      {
        title: "Zabezpiecz dokumenty",
        description:
          "Poproś o świadectwo pracy, zaświadczenie o dochodach i Z-3/Z-3a. Zachowaj e-ZLA i korespondencję z pracodawcą.",
      },
      {
        title: "Zapytaj ZUS o dobrowolne ubezpieczenie",
        description:
          "W niektórych sytuacjach można kontynuować ubezpieczenie chorobowe. Terminy i warunki zależą od tytułu. Nie czekaj do porodu — zapytaj wcześniej.",
      },
      {
        title: "Złóż wniosek o zasiłek, jeśli przysługuje",
        description:
          "Zasiłek chorobowy po ustaniu ubezpieczenia — do 91 dni, z wyjątkami. Zasiłek macierzyński wymaga tytułu w dniu porodu. Do wniosku dołącz Z-10.",
      },
      {
        title: "Rozważ konsultację",
        description:
          "Przy wypowiedzeniu w ciąży, sporze z pracodawcą lub skomplikowanej historii ubezpieczenia skonsultuj się z prawnikiem, PIP lub doradcą ZUS.",
      },
    ],
    deadlines: [
      "Z-10 przy pierwszym e-ZLA po ustaniu ubezpieczenia.",
      "Zasiłek chorobowy po ustaniu ubezpieczenia — do 91 dni.",
      "Roszczenie o zasiłek — 6 miesięcy od końca okresu.",
    ],
    places: [
      "PUE/eZUS — historia ubezpieczenia i wnioski.",
      "Placówka ZUS — wyjaśnienia i dokumenty papierowe.",
      "PIP / prawnik — spory pracownicze.",
    ],
    problems: [
      {
        problem: "Umowa kończy się tydzień przed porodem.",
        solution:
          "Skontaktuj się z ZUS natychmiast. Sprawdź, czy możesz kontynuować ubezpieczenie chorobowe lub czy masz inny tytuł. Zasiłek macierzyński wymaga ubezpieczenia w dniu porodu.",
      },
      {
        problem: "Pracodawca nie chce wydać świadectwa pracy.",
        solution:
          "Poproś pisemnie o wydanie dokumentu. Jeżeli nie dostaniesz go w terminie, zgłoś sprawę do PIP.",
      },
      {
        problem: "Nie wiem, czy mogę dostać zasiłek po ustaniu umowy.",
        solution:
          "Złóż wniosek i Z-10 — ZUS oceni prawo. Nie zakładaj odmowy na podstawie internetowych porad.",
      },
    ],
    sortOrder: 50,
    lastReviewedAt: REVIEW_DATE,
  },
  {
    slug: "wniosek-o-zasilek-opiekunczy",
    categorySlug: CATEGORY_SLUGS.procedures,
    title: "Wniosek o zasiłek opiekuńczy krok po kroku",
    summary:
      "Kiedy złożyć Z-15, jak sprawdzić limit dni i co zrobić, gdy drugi rodzic już korzystał z opieki.",
    audience: "Rodzice i opiekunowie objęci ubezpieczeniem chorobowym, którzy muszą zostać z chorym dzieckiem.",
    conditions: [
      "Ubezpieczenie chorobowe — bez okresu wyczekiwania.",
      "Konieczność osobistej opieki nad chorym dzieckiem lub członkiem rodziny.",
      "Brak innych osób, które mogą zapewnić opiekę — z wyjątkiem dziecka do 2 lat.",
    ],
    documents: [
      { label: "Wniosek Z-15", slug: "wniosek-z-15" },
      { label: "e-ZLA", slug: "e-zla" },
    ],
    steps: [
      {
        title: "Sprawdź limit dni",
        description:
          "60 dni na dziecko do 14 lat, 30 dni na dziecko z niepełnosprawnością 14–18 lat, 14 dni na innych członków rodziny. Łącznie maks. 60 dni w roku.",
      },
      {
        title: "Ustal, kto bierze opiekę",
        description:
          "Za ten sam okres zasiłek otrzymuje tylko jedno z rodziców. Sprawdź, ile dni wykorzystał drugi rodzic — limit jest wspólny.",
      },
      {
        title: "Poproś lekarza o e-ZLA",
        description:
          "Lekarz wystawia e-ZLA na opiekę. To nie jest zwolnienie z powodu Twojej choroby — kod i tryb są inne.",
      },
      {
        title: "Złóż Z-15",
        description:
          "Pracownik składa wniosek pracodawcy, osoba prowadząca działalność — do ZUS. Od 24 października 2026 r. Z-15 zastępuje Z-15A i Z-15B (na eZUS od połowy listopada).",
      },
      {
        title: "Sprawdź wypłatę",
        description:
          "Zasiłek wynosi 80% podstawy. Pracodawca wypłaca go lub przekazuje dokumenty do ZUS, zależnie od liczby ubezpieczonych.",
      },
    ],
    deadlines: [
      "Wniosek składa się niezwłocznie — zasiłek nie jest wypłacany automatycznie.",
      "Limit 60 dni w roku kalendarzowym.",
    ],
    places: ["Pracodawca", "PUE/eZUS", "Placówka ZUS"],
    problems: [
      {
        problem: "Limit dni został wyczerpany.",
        solution:
          "Sprawdź, czy nie przysługuje inne uprawnienie, np. urlop wypoczynkowy, opieka z art. 188 Kodeksu pracy lub wsparcie rodziny. Zasiłek opiekuńczy ma sztywny limit.",
      },
      {
        problem: "Drugi rodzic też chce wziąć opiekę.",
        solution:
          "Za ten sam okres zasiłek może otrzymać tylko jedna osoba. Podzielcie okresy tak, aby nie dublować wniosków.",
      },
    ],
    sortOrder: 60,
    lastReviewedAt: REVIEW_DATE,
  },
  {
    slug: "adopcja-krok-po-kroku",
    categorySlug: CATEGORY_SLUGS.procedures,
    title: "Adopcja krok po kroku: urlop, zasiłek i dokumenty",
    summary:
      "Od wniosku do sądu po pierwszy dzień urlopu. Sprawdź terminy 7 i 21 dni oraz dokumenty, które trzeba zebrać.",
    audience: "Osoby, które przyjęły dziecko na wychowanie i starają się o przysposobienie lub są rodziną zastępczą.",
    conditions: [
      "Przyjęcie dziecka na wychowanie i wystąpienie do sądu o przysposobienie albo umieszczenie w rodzinie zastępczej (z wyjątkiem zawodowej).",
      "Ubezpieczenie chorobowe w dniu przyjęcia dziecka.",
      "Wiek dziecka w granicach ustawowych: do 14 lat przy przysposobieniu, do 7/10 lat przy rodzinie zastępczej.",
    ],
    documents: [
      { label: "Dokumenty adopcyjne", slug: "dokumenty-adopcyjne" },
      { label: "Wniosek urlopowy", slug: "wniosek-urlopowy-pracodawca" },
      { label: "Wniosek ZAM", slug: "wniosek-zam" },
      { label: "Skrócony odpis aktu urodzenia", slug: "skrocony-odpis-aktu-urodzenia" },
    ],
    steps: [
      {
        title: "Uzyskaj dokumenty z sądu lub od starosty",
        description:
          "Przy przysposobieniu potrzebne jest zaświadczenie sądu o dacie wystąpienia z wnioskiem. Przy rodzinie zastępczej — orzeczenie sądu o umieszczeniu dziecka albo umowa z starostą.",
      },
      {
        title: "Złóż wniosek o urlop w ciągu 7 dni",
        description:
          "Wniosek o urlop na warunkach urlopu macierzyńskiego składa się w ciągu 7 dni od przyjęcia dziecka lub wystąpienia do sądu. Urlop zaczyna się najpóźniej 21 dni później.",
        tip: "Nie czekaj na prawomocne przysposobienie — urlop przysługuje już po wystąpieniu do sądu.",
      },
      {
        title: "Zdecyduj o urlopie rodzicielskim",
        description:
          "Po urlopie na warunkach macierzyńskiego przysługuje 41/43 tygodnie urlopu rodzicielskiego, nie dłużej niż do 14. roku życia dziecka. Wniosek złóż 21 dni wcześniej.",
      },
      {
        title: "Złóż wniosek o zasiłek",
        description:
          "Gdy zasiłek wypłaca ZUS, złóż ZAM i dokumenty. Od 24 października 2026 r. nie składa się Z-3b. Pracownik składa wniosek urlopowy u pracodawcy, a ZUS otrzymuje Z-3/Z-3a.",
      },
      {
        title: "Zgłoś dziecko do ubezpieczenia zdrowotnego",
        description:
          "Zgłoś dziecko u pracodawcy lub w ZUS. Sprawdź, czy dziecko ma PESEL i czy dane w dokumentach są spójne.",
      },
    ],
    deadlines: [
      "Wniosek o urlop na warunkach macierzyńskiego — 7 dni od przyjęcia dziecka.",
      "Rozpoczęcie urlopu — najpóźniej 21 dni od przyjęcia dziecka.",
      "Wniosek o urlop rodzicielski — 21 dni przed rozpoczęciem.",
      "Urlop ojcowski — do 12 miesięcy od uprawomocnienia przysposobienia.",
    ],
    places: [
      "Sąd opiekuńczy — zaświadczenie o dacie wniosku.",
      "Pracodawca — wniosek urlopowy.",
      "PUE/eZUS — ZAM i dokumenty.",
      "Placówka ZUS — forma papierowa.",
    ],
    problems: [
      {
        problem: "Sąd nie chce wydać zaświadczenia o dacie wniosku.",
        solution:
          "Poproś o kopię wniosku z poświadczeniem daty wpływu. To dokument wymagany przez pracodawcę i ZUS.",
      },
      {
        problem: "Dziecko ma więcej niż 14 lat.",
        solution:
          "Urlop na warunkach macierzyńskiego przy przysposobieniu przysługuje do 14. roku życia. Sprawdź inne uprawnienia, np. urlop wychowawczy.",
      },
      {
        problem: "Jesteśmy rodziną zastępczą zawodową.",
        solution:
          "Zasiłek macierzyński z tytułu rodziny zastępczej zawodowej nie przysługuje. Sprawdź odrębne świadczenia dla rodzin zastępczych zawodowych.",
      },
    ],
    sortOrder: 70,
    lastReviewedAt: REVIEW_DATE,
  },
]
