import type { KnowledgeBlock, KnowledgeKeyPoint } from "@zpr/contracts/content"

import { ARTICLE_SLUGS, CATEGORY_SLUGS } from "./slugs"
import { REVIEW_DATE } from "./meta"

export interface ArticleSourceSeed {
  sourceSlug: string
  locator?: string
  isPrimary?: boolean
}

export interface ArticleLegalReferenceSeed {
  citation: string
  locator?: string
}

export interface ArticleSeed {
  slug: string
  categorySlug: string
  title: string
  summary: string
  blocks: KnowledgeBlock[]
  keyPoints: KnowledgeKeyPoint[]
  practicalTips: string[]
  keywords: string[]
  readingMinutes: number
  isFeatured?: boolean
  popularity?: number
  lastReviewedAt: string
  publishedAt: string
  sources: ArticleSourceSeed[]
  legalReferences: ArticleLegalReferenceSeed[]
}

export const CONTENT_ARTICLES: ArticleSeed[] = [
  {
    slug: ARTICLE_SLUGS.pregnancyRights,
    categorySlug: CATEGORY_SLUGS.pregnancy,
    title: "Prawa kobiety w ciąży w pracy",
    summary:
      "Ochrona przed zwolnieniem, czas na badania, przeniesienie z pracy szkodliwej i to, co warto ustalić z pracodawcą od razu.",
    readingMinutes: 5,
    popularity: 92,
    lastReviewedAt: REVIEW_DATE,
    publishedAt: "2026-10-01",
    keyPoints: [
      {
        label: "Ochrona zatrudnienia",
        value:
          "W okresie ciąży pracodawca co do zasady nie może rozwiązać umowy. Umowa na czas określony, która miałaby się rozwiązać po upływie 3. miesiąca ciąży, przedłuża się do dnia porodu.",
      },
      {
        label: "Badania lekarskie",
        value:
          "Na badania, których nie da się wykonać poza godzinami pracy, przysługuje zwolnienie z zachowaniem wynagrodzenia.",
      },
      {
        label: "Praca szkodliwa",
        value:
          "Jeżeli praca jest uciążliwa lub szkodliwa dla ciąży, pracodawca musi przenieść pracownicę do innej pracy.",
      },
    ],
    blocks: [
      {
        kind: "heading",
        text: "Czy trzeba od razu powiedzieć pracodawcy o ciąży?",
      },
      {
        kind: "paragraph",
        text: "Przepisy nie nakazują natychmiastowego informowania pracodawcy o ciąży. Warto jednak pamiętać, że część ochrony działa dopiero wtedy, gdy pracodawca o ciąży wie — na przykład ochrona przed wypowiedzeniem. Informacja jest też potrzebna, aby dostać zwolnienie na badania, przeniesienie z pracy szkodliwej albo urlop macierzyński.",
      },
      {
        kind: "callout",
        tone: "info",
        title: "Praktycznie",
        text: "Jeżeli chcesz skorzystać z ochrony, przekaż informację w formie, którą można udokumentować: e-mailem, pismem lub podczas spotkania z potwierdzeniem w dokumentacji kadrowej. Nie musisz podawać danych medycznych — wystarczy zaświadczenie o ciąży, gdy jest potrzebne.",
      },
      {
        kind: "heading",
        text: "Ochrona przed rozwiązaniem umowy",
      },
      {
        kind: "paragraph",
        text: "Co do zasady pracodawca nie może wypowiedzieć ani rozwiązać umowy z pracownicą w ciąży. Dotyczy to także umowy na czas określony, która miałaby się rozwiązać po upływie 3. miesiąca ciąży — w takim przypadku umowa przedłuża się do dnia porodu. Są wyjątki, m.in. gdy zachodzą przyczyny uzasadniające rozwiązanie bez wypowiedzenia z winy pracownicy, a zakładowa organizacja związkowa reprezentująca pracownicę wyrazi zgodę. To nie jest decyzja „na skróty” — pracodawca musi zachować tryb z przepisów.",
      },
      {
        kind: "paragraph",
        text: "Szczególną ostrożność warto zachować przy tzw. porozumieniu stron. Podpisanie porozumienia o rozwiązaniu umowy jest dobrowolne i co do zasady nie jest objęte ochroną przed wypowiedzeniem. Jeżeli masz wątpliwości, skonsultuj treść z prawnikiem lub inspekcją pracy, zanim podpiszesz.",
      },
      {
        kind: "heading",
        text: "Badania lekarskie i zwolnienia",
      },
      {
        kind: "list",
        items: [
          "Na badania lekarskie związane z ciążą, których nie można wykonać poza godzinami pracy, przysługuje zwolnienie z pracy z zachowaniem prawa do wynagrodzenia.",
          "Zwolnienie na badania nie jest tym samym co zwolnienie lekarskie z powodu choroby. Nie wymaga e-ZLA i nie obniża wynagrodzenia.",
          "Jeżeli lekarz stwierdzi niezdolność do pracy, wystawi e-ZLA. W ciąży zwolnienie ma zwykle kod B i jest płatne według korzystniejszych zasad.",
        ],
      },
      {
        kind: "heading",
        text: "Praca szczególnie uciążliwa lub szkodliwa",
      },
      {
        kind: "paragraph",
        text: "Jeżeli pracownica w ciąży wykonuje pracę, która jest szczególnie uciążliwa lub szkodliwa dla jej zdrowia, pracodawca ma obowiązek przenieść ją do innej pracy. Jeżeli przeniesienie powoduje obniżenie wynagrodzenia, przysługuje dodatek wyrównawczy. Nie każda zmiana stanowiska musi być „przeniesieniem” w rozumieniu przepisów — warto poprosić o podstawę decyzji na piśmie.",
      },
      {
        kind: "heading",
        text: "Co zrobić, gdy pracodawca narusza prawa",
      },
      {
        kind: "list",
        ordered: true,
        items: [
          "Zbierz dokumenty: umowę, harmonogramy, e-maile, opis stanowiska i zaświadczenia lekarskie.",
          "Poproś pracodawcę o wyjaśnienie na piśmie — to porządkuje sprawę i tworzy ślad.",
          "Zgłoś sprawę do Państwowej Inspekcji Pracy lub skonsultuj się z prawnikiem. W sprawach związanych z rozwiązaniem umowy liczą się krótkie terminy.",
        ],
      },
    ],
    practicalTips: [
      "Poproś o potwierdzenie przyjęcia zaświadczenia o ciąży.",
      "Sprawdź, czy Twoje stanowisko nie znajduje się na liście prac wzbronionych kobietom w ciąży.",
      "Zachowaj kopie wszystkich wniosków i odpowiedzi pracodawcy.",
    ],
    keywords: [
      "ciąża",
      "praca",
      "ochrona przed zwolnieniem",
      "badania",
      "praca szkodliwa",
    ],
    sources: [
      { sourceSlug: "kodeks-pracy", locator: "art. 176–179", isPrimary: true },
      { sourceSlug: "zus-poradnik-rodzice", locator: "rozdział o uprawnieniach pracowniczych" },
    ],
    legalReferences: [
      { citation: "KP art. 177", locator: "ochrona przed rozwiązaniem umowy" },
      { citation: "KP art. 178", locator: "zwolnienie na badania" },
      { citation: "KP art. 179", locator: "przeniesienie z pracy szkodliwej" },
    ],
  },
  {
    slug: ARTICLE_SLUGS.pregnancySickLeave,
    categorySlug: CATEGORY_SLUGS.pregnancy,
    title: "Zwolnienie lekarskie w ciąży (e-ZLA z kodem B)",
    summary:
      "Kiedy lekarz wystawia zwolnienie, co oznacza kod B, ile trwa zasiłek i dlaczego ciąża sama w sobie nie jest „chorobą”.",
    readingMinutes: 6,
    popularity: 96,
    isFeatured: true,
    lastReviewedAt: REVIEW_DATE,
    publishedAt: "2026-10-01",
    keyPoints: [
      {
        label: "Kod B",
        value:
          "Zwolnienie związane z ciążą oznacza się kodem B. Dzięki temu zasiłek chorobowy wynosi 100% podstawy wymiaru.",
      },
      {
        label: "Okres",
        value:
          "Zasiłek chorobowy w ciąży może być wypłacany do 270 dni, a nie standardowo do 182 dni.",
      },
      {
        label: "Podstawa",
        value:
          "Zwolnienie wystawia lekarz, gdy stwierdzi niezdolność do pracy. Sama ciąża nie jest automatycznym powodem L4.",
      },
    ],
    blocks: [
      {
        kind: "heading",
        text: "Kiedy przysługuje zwolnienie w ciąży",
      },
      {
        kind: "paragraph",
        text: "Zwolnienie lekarskie (e-ZLA, potocznie L4) wystawia lekarz, gdy stwierdzi, że nie możesz wykonywać pracy z powodu choroby lub innej niezdolności do pracy. W ciąży nie chodzi o sam fakt bycia w ciąży, ale o stan zdrowia, który uniemożliwia pracę — na przykład zagrożenie ciąży, silne dolegliwości albo inne schorzenie.",
      },
      {
        kind: "paragraph",
        text: "Lekarz może wpisać na zwolnieniu kod B. Kod B oznacza, że niezdolność do pracy przypada na okres ciąży. To ważne, bo zmienia wysokość świadczenia i okres jego wypłaty.",
      },
      {
        kind: "heading",
        text: "Ile wynosi zasiłek chorobowy w ciąży",
      },
      {
        kind: "paragraph",
        text: "Zasiłek chorobowy w ciąży wynosi 100% podstawy wymiaru. Standardowo zasiłek chorobowy to 80%, więc kod B ma realne znaczenie finansowe. Podstawa wymiaru jest liczona z wynagrodzenia z okresu poprzedzającego chorobę — więcej o tym w artykule o podstawie wymiaru.",
      },
      {
        kind: "callout",
        tone: "warning",
        title: "Okres wyczekiwania",
        text: "Do zasiłku chorobowego co do zasady trzeba mieć 30 dni ubezpieczenia obowiązkowego albo 90 dni dobrowolnego. Jeżeli ubezpieczenie trwa krócej, ZUS może nie wypłacić zasiłku za pierwszy okres. Nie dotyczy to zasiłku macierzyńskiego, który nie ma okresu wyczekiwania.",
      },
      {
        kind: "heading",
        text: "Jak długo można pobierać zasiłek",
      },
      {
        kind: "paragraph",
        text: "Okres zasiłkowy wynosi standardowo 182 dni. Jeżeli niezdolność do pracy jest spowodowana gruźlicą lub występuje w trakcie ciąży, wydłuża się do 270 dni. Do okresu zasiłkowego wlicza się okresy nieprzerwanej niezdolności do pracy oraz wcześniejsze zwolnienia, jeżeli przerwa między nimi nie przekraczała 60 dni — z wyjątkami opisanymi w ustawie.",
      },
      {
        kind: "heading",
        text: "Kto wypłaca i jakie dokumenty są potrzebne",
      },
      {
        kind: "list",
        items: [
          "Pracownikowi przez pierwsze 33 dni choroby w roku kalendarzowym wynagrodzenie chorobowe wypłaca pracodawca, a od 34. dnia zasiłek chorobowy wypłaca płatnik lub ZUS — zależnie od liczby ubezpieczonych.",
          "Lekarz przesyła e-ZLA elektronicznie do ZUS i pracodawcy. Nie musisz dostarczać papierowego wydruku, chyba że zwolnienie zostało wystawione w trybie alternatywnym.",
          "Gdy zasiłek wypłaca ZUS, potrzebne jest zaświadczenie płatnika składek Z-3 (pracownik) lub Z-3a (inny tytuł). Przedsiębiorcy i osoby współpracujące składają wniosek ZAS-53.",
          "Po ustaniu ubezpieczenia do wniosku dołącza się oświadczenie Z-10.",
        ],
      },
      {
        kind: "heading",
        text: "Co zrobić, gdy zwolnienie jest wystawione błędnie",
      },
      {
        kind: "paragraph",
        text: "Sprawdź dane na e-ZLA: okres, kod, Twoje dane i dane płatnika. Błędy prostuje lekarz, który wystawił zwolnienie. Jeżeli pracodawca lub ZUS kwestionuje zwolnienie, możesz zostać wezwany do kontroli — wtedy warto mieć dokumentację medyczną i stosować się do zaleceń lekarza.",
      },
    ],
    practicalTips: [
      "Sprawdź, czy na e-ZLA jest kod B — to on daje 100% podstawy.",
      "Jeżeli pracodawca nie widzi zwolnienia, poproś lekarza o wyjaśnienie i skontaktuj się z kadrami.",
      "Zachowaj kopię wniosku o zasiłek i potwierdzenie jego złożenia.",
    ],
    keywords: ["L4", "e-ZLA", "ciąża", "kod B", "zasiłek chorobowy", "270 dni"],
    sources: [
      { sourceSlug: "zus-chorobowy", isPrimary: true },
      { sourceSlug: "zus-chorobowy-dokumenty", isPrimary: true },
      { sourceSlug: "zus-ezla" },
      { sourceSlug: "ustawa-zasilkowa", locator: "art. 8–9, 11" },
    ],
    legalReferences: [
      { citation: "U art. 8", locator: "182 dni / 270 dni" },
      { citation: "U art. 11", locator: "100% w ciąży" },
      { citation: "U art. 4", locator: "okres wyczekiwania" },
    ],
  },
  {
    slug: ARTICLE_SLUGS.prematureAndMultiple,
    categorySlug: CATEGORY_SLUGS.pregnancy,
    title: "Przedwczesny poród i ciąża mnoga: co się zmienia",
    summary:
      "Więcej dzieci oznacza dłuższy urlop macierzyński i rodzicielski. Przedwczesny poród nie skraca urlopu, a pobyt dziecka w szpitalu może dać dodatkowy urlop.",
    readingMinutes: 6,
    popularity: 74,
    lastReviewedAt: REVIEW_DATE,
    publishedAt: "2026-10-08",
    keyPoints: [
      {
        label: "Ciąża mnoga",
        value:
          "Przy bliźniętach urlop macierzyński wynosi 31 tygodni, przy trojaczkach 33, a przy pięciorgu i więcej — 37 tygodni.",
      },
      {
        label: "Przedwczesny poród",
        value:
          "Urlop macierzyński liczy się od porodu. Niewykorzystana część sprzed porodu nie przepada.",
      },
      {
        label: "Szpital dziecka",
        value:
          "Jeżeli dziecko po urodzeniu wymaga hospitalizacji, może przysługiwać uzupełniający urlop macierzyński do 8 tygodni.",
      },
    ],
    blocks: [
      {
        kind: "heading",
        text: "Ciąża mnoga: dłuższe urlopy",
      },
      {
        kind: "table",
        caption: "Wymiar urlopu w zależności od liczby dzieci urodzonych przy jednym porodzie",
        headers: ["Liczba dzieci", "Urlop macierzyński", "Urlop rodzicielski"],
        rows: [
          ["1", "20 tygodni", "41 tygodni"],
          ["2", "31 tygodni", "43 tygodnie"],
          ["3", "33 tygodnie", "43 tygodnie"],
          ["4", "35 tygodni", "43 tygodnie"],
          ["5 i więcej", "37 tygodni", "43 tygodnie"],
        ],
      },
      {
        kind: "paragraph",
        text: "Urlop rodzicielski przysługuje łącznie obojgu rodzicom. Każdy z rodziców ma 9 tygodni, których nie można przenieść na drugiego rodzica. Przy dziecku z zaświadczeniem „Za życiem” wymiar urlopu rodzicielskiego wydłuża się do 65 tygodni (jedno dziecko) lub 67 tygodni (ciąża mnoga).",
      },
      {
        kind: "heading",
        text: "Przedwczesny poród",
      },
      {
        kind: "paragraph",
        text: "Jeżeli dziecko urodzi się przed przewidywanym terminem, urlop macierzyński rozpoczyna się w dniu porodu. Jeżeli przed porodem wykorzystałaś mniej niż 6 tygodni urlopu, pozostała część nie przepada — urlop trwa po porodzie do wyczerpania pełnego wymiaru. Wcześniactwo samo w sobie nie zmienia wymiaru urlopu, ale może wiązać się z dodatkowymi świadczeniami i opieką.",
      },
      {
        kind: "heading",
        text: "Dodatkowy urlop, gdy dziecko jest w szpitalu",
      },
      {
        kind: "paragraph",
        text: "Uzupełniający urlop macierzyński przysługuje, gdy dziecko po urodzeniu wymaga hospitalizacji. Wynosi do 8 tygodni i jest udzielany na wniosek. To uprawnienie dotyczy zarówno matek, jak i rodziców adopcyjnych oraz rodzin zastępczych w sytuacjach opisanych w Kodeksie pracy. Nie jest to automat — trzeba złożyć wniosek i spełnić warunki.",
      },
      {
        kind: "callout",
        tone: "important",
        title: "„Za życiem”",
        text: "Zaświadczenie „Za życiem” potwierdza ciężkie i nieodwracalne upośledzenie albo nieuleczalną chorobę zagrażającą życiu, które powstały w prenatalnym okresie rozwoju dziecka lub w czasie porodu. Zaświadczenie wystawia lekarz specjalista. Daje ono m.in. prawo do wydłużonego urlopu rodzicielskiego.",
      },
      {
        kind: "heading",
        text: "Co przygotować",
      },
      {
        kind: "list",
        items: [
          "Dane dziecka lub dzieci: imiona, nazwiska, numery PESEL, daty i miejsca urodzenia.",
          "Dane drugiego rodzica, jeżeli będzie korzystał z urlopu lub zasiłku.",
          "Zaświadczenie „Za życiem”, jeżeli dziecko je posiada.",
          "Dokumenty potwierdzające hospitalizację, jeżeli ubiegasz się o uzupełniający urlop macierzyński.",
        ],
      },
    ],
    practicalTips: [
      "Sprawdź, ile tygodni urlopu macierzyńskiego wykorzystałaś przed porodem — to wpływa na koniec urlopu po porodzie.",
      "Zapytaj pracodawcę, czy w Twojej firmie wniosek o uzupełniający urlop macierzyński składa się przez eZUS czy papierowo.",
      "Przy ciąży mnogiej od razu zaplanuj podział 9 tygodni dla drugiego rodzica.",
    ],
    keywords: [
      "ciąża mnoga",
      "bliźnięta",
      "wcześniak",
      "przedwczesny poród",
      "uzupełniający urlop macierzyński",
      "Za życiem",
    ],
    sources: [
      { sourceSlug: "kodeks-pracy", locator: "art. 180, 180¹, 180², 182¹a", isPrimary: true },
      { sourceSlug: "gov-za-zyciem", isPrimary: true },
      { sourceSlug: "zus-poradnik-rodzice" },
    ],
    legalReferences: [
      { citation: "KP art. 180", locator: "wymiar urlopu macierzyńskiego" },
      { citation: "KP art. 182¹a", locator: "urlop rodzicielski" },
    ],
  },
  {
    slug: ARTICLE_SLUGS.maternityBenefit,
    categorySlug: CATEGORY_SLUGS.benefits,
    title: "Zasiłek macierzyński: komu przysługuje i ile trwa",
    summary:
      "Prawo do zasiłku, wymiar urlopu, stawki 100%, 70% i 81,5%, dokumenty oraz to, co zmieniło się w formularzach w 2026 r.",
    readingMinutes: 8,
    popularity: 100,
    isFeatured: true,
    lastReviewedAt: REVIEW_DATE,
    publishedAt: "2026-10-01",
    keyPoints: [
      {
        label: "Warunek podstawowy",
        value:
          "W dniu porodu lub przyjęcia dziecka na wychowanie trzeba podlegać ubezpieczeniu chorobowemu.",
      },
      {
        label: "Wymiar",
        value:
          "20 tygodni za urlop macierzyński przy jednym dziecku, 31–37 przy ciąży mnogiej. Urlop rodzicielski to 41/43 tygodnie.",
      },
      {
        label: "Stawki",
        value:
          "100% za macierzyński i ojcowski, 70% za rodzicielski, 81,5% za całość w wariancie z wnioskiem w 21 dni.",
      },
    ],
    blocks: [
      {
        kind: "heading",
        text: "Kto ma prawo do zasiłku macierzyńskiego",
      },
      {
        kind: "paragraph",
        text: "Zasiłek macierzyński przysługuje ubezpieczonej, która w okresie ubezpieczenia chorobowego urodziła dziecko, przyjęła dziecko na wychowanie i wystąpiła do sądu o przysposobienie albo przyjęła dziecko w ramach rodziny zastępczej (z wyjątkiem rodziny zastępczej zawodowej). Przepisy stosuje się odpowiednio do ubezpieczonego ojca i innych ubezpieczonych osób, które przyjęły dziecko na wychowanie.",
      },
      {
        kind: "paragraph",
        text: "Kluczowy moment to dzień powstania prawa: poród albo przyjęcie dziecka. W tym dniu trzeba mieć tytuł do ubezpieczenia chorobowego. Sama umowa o pracę, która skończyła się wcześniej, nie wystarczy. Zasiłek macierzyński nie ma okresu wyczekiwania — nie trzeba „przepracować” 30 dni, jak przy zasiłku chorobowym.",
      },
      {
        kind: "heading",
        text: "Jak długo trwa zasiłek",
      },
      {
        kind: "list",
        items: [
          "Urlop macierzyński: 20 tygodni przy jednym dziecku; 31, 33, 35 lub 37 tygodni przy odpowiednio dwojgu, trojgu, czworgu lub pięciorgu i więcej dzieci.",
          "Urlop na warunkach urlopu macierzyńskiego: dla adopcji i rodziny zastępczej — wymiar zależy od liczby dzieci i wieku dziecka.",
          "Urlop rodzicielski: 41 tygodni przy jednym dziecku, 43 tygodnie przy ciąży mnogiej; 65/67 tygodni z zaświadczeniem „Za życiem”.",
          "Urlop ojcowski: do 2 tygodni, do ukończenia przez dziecko 12. miesiąca życia.",
        ],
      },
      {
        kind: "heading",
        text: "Wysokość zasiłku",
      },
      {
        kind: "table",
        caption: "Stawki zasiłku macierzyńskiego",
        headers: ["Okres", "Wariant standardowy", "Wariant 81,5%"],
        rows: [
          ["Urlop macierzyński", "100% podstawy", "81,5% podstawy"],
          ["Urlop rodzicielski", "70% podstawy", "81,5% podstawy"],
          ["9 tygodni drugiego rodzica", "70% podstawy", "70% podstawy"],
          ["Urlop ojcowski", "100% podstawy", "100% podstawy"],
        ],
      },
      {
        kind: "paragraph",
        text: "Wariant 81,5% wymaga złożenia wniosku nie później niż 21 dni po porodzie. Wniosek obejmuje urlop macierzyński i rodzicielski w pełnym wymiarze, ale nie obejmuje 9 tygodni zarezerwowanych dla drugiego rodzica — za tę część zawsze przysługuje 70% podstawy. Jeżeli matka nie wykorzysta ani jednego dnia zasiłku za urlop rodzicielski w pierwszym roku życia dziecka, co do zasady zasiłek za ten urlop wynosi 70%, a pobrany zasiłek macierzyński może zostać wyrównany do 100% na wniosek.",
      },
      {
        kind: "callout",
        tone: "warning",
        title: "Minimalna kwota",
        text: "Jeżeli miesięczny zasiłek macierzyński jest niższy niż świadczenie rodzicielskie, kwotę podwyższa się do wysokości tego świadczenia. W tej wersji demonstracyjnej kwota świadczenia rodzicielskiego nie jest jeszcze zatwierdzona (Q-29), dlatego kalkulator pokazuje wynik „Wymaga danych”, a nie wymyśloną kwotę.",
      },
      {
        kind: "heading",
        text: "Jak złożyć wniosek",
      },
      {
        kind: "list",
        ordered: true,
        items: [
          "Pracownik składa u pracodawcy wniosek o urlop i zasiłek. Jeżeli zasiłek wypłaca ZUS, potrzebne jest zaświadczenie Z-3 (pracownik) lub Z-3a (inny tytuł).",
          "Osoba prowadząca działalność gospodarczą lub współpracująca składa wniosek ZAM bezpośrednio do ZUS — najwygodniej przez PUE/eZUS.",
          "Do wniosku dołącz dane dziecka i drugiego rodzica. Gdy zasiłek wypłaca ZUS, skrócony odpis aktu urodzenia nie jest już wymagany — ZUS pozyskuje dane z rejestru. Gdy wypłaca płatnik, odpis nadal jest potrzebny.",
          "Zachowaj potwierdzenie złożenia. Roszczenie o wypłatę zasiłku przedawnia się po 6 miesiącach od ostatniego dnia okresu, za który zasiłek przysługuje.",
        ],
      },
      {
        kind: "callout",
        tone: "info",
        title: "Zmiany od 24 października 2026 r.",
        text: "Jeden formularz ZAM zastąpił ZUR i ZAO. Z-3b został wycofany — osoby prowadzące działalność nie składają już zaświadczenia płatnika. Sprawdź aktualny wzór na zus.pl przed wysłaniem wniosku.",
      },
    ],
    practicalTips: [
      "Policz oba warianty — 100%/70% i 81,5% — zanim zdecydujesz się na wniosek w 21 dni.",
      "Sprawdź, czy w dniu porodu masz aktywne ubezpieczenie chorobowe.",
      "Nie odkładaj wniosku: 6-miesięczny termin przedawnienia liczy się od końca okresu zasiłkowego.",
      "Użyj kalkulatora, aby porównać scenariusze, ale pamiętaj, że nie zastępuje decyzji ZUS.",
    ],
    keywords: [
      "zasiłek macierzyński",
      "urlop macierzyński",
      "81,5%",
      "ZAM",
      "podstawa wymiaru",
    ],
    sources: [
      { sourceSlug: "zus-macierzynski", isPrimary: true },
      { sourceSlug: "zus-macierzynski-dokumenty", isPrimary: true },
      { sourceSlug: "zus-uproszczenia-2026" },
      { sourceSlug: "ustawa-zasilkowa", locator: "art. 29–31" },
      { sourceSlug: "kodeks-pracy", locator: "art. 180, 182¹a, 182³" },
    ],
    legalReferences: [
      { citation: "U art. 29", locator: "prawo do zasiłku" },
      { citation: "U art. 30a", locator: "wniosek 81,5%" },
      { citation: "U art. 31", locator: "stawki" },
      { citation: "KP art. 180", locator: "wymiar urlopu" },
    ],
  },
  {
    slug: ARTICLE_SLUGS.sicknessBenefit,
    categorySlug: CATEGORY_SLUGS.benefits,
    title: "Zasiłek chorobowy: 182 dni, 270 dni i 91 dni",
    summary:
      "Kiedy przysługuje zasiłek chorobowy, ile wynosi, kto go wypłaca i co się dzieje po zakończeniu umowy.",
    readingMinutes: 7,
    popularity: 88,
    lastReviewedAt: REVIEW_DATE,
    publishedAt: "2026-10-08",
    keyPoints: [
      {
        label: "Standard",
        value: "Zasiłek chorobowy przysługuje do 182 dni niezdolności do pracy.",
      },
      {
        label: "Ciąża i gruźlica",
        value: "Okres wydłuża się do 270 dni, a stawka w ciąży wynosi 100% podstawy.",
      },
      {
        label: "Po ustaniu ubezpieczenia",
        value:
          "Zasiłek może być wypłacany do 91 dni, ale są wyjątki — m.in. dla niezdolności w ciąży.",
      },
    ],
    blocks: [
      {
        kind: "heading",
        text: "Kiedy przysługuje",
      },
      {
        kind: "paragraph",
        text: "Zasiłek chorobowy przysługuje osobie objętej ubezpieczeniem chorobowym, która stała się niezdolna do pracy z powodu choroby lub nie może wykonywać pracy z przyczyn określonych w ustawie. Prawo powstaje po spełnieniu okresu wyczekiwania: 30 dni ubezpieczenia obowiązkowego albo 90 dni dobrowolnego. Są wyjątki, np. gdy niezdolność wynika z wypadku przy pracy.",
      },
      {
        kind: "heading",
        text: "Jak długo",
      },
      {
        kind: "table",
        caption: "Okresy zasiłkowe",
        headers: ["Sytuacja", "Maksymalny okres"],
        rows: [
          ["Zwykła niezdolność do pracy", "182 dni"],
          ["Gruźlica lub niezdolność w trakcie ciąży", "270 dni"],
          ["Niezdolność po ustaniu tytułu ubezpieczenia", "91 dni, z wyjątkami"],
        ],
      },
      {
        kind: "paragraph",
        text: "Do okresu zasiłkowego wlicza się wszystkie okresy nieprzerwanej niezdolności do pracy. Wlicza się też poprzednie niezdolności, jeżeli przerwa między nimi nie przekraczała 60 dni. Jeżeli po przerwie niezdolność wystąpiła w trakcie ciąży, okresy przed przerwą nie są wliczane — to ważne przy zagrożeniu ciąży.",
      },
      {
        kind: "heading",
        text: "Wysokość",
      },
      {
        kind: "paragraph",
        text: "Co do zasady zasiłek chorobowy wynosi 80% podstawy wymiaru. W ciąży oraz przy niezdolności spowodowanej wypadkiem przy pracy lub chorobą zawodową stawka wynosi 100%. Podstawa wymiaru to przeciętne miesięczne wynagrodzenie lub przychód z 12 miesięcy poprzedzających, po potrąceniu składek finansowanych przez ubezpieczonego.",
      },
      {
        kind: "heading",
        text: "Kto wypłaca",
      },
      {
        kind: "paragraph",
        text: "Pracownikowi przez pierwsze 33 dni choroby w roku kalendarzowym wynagrodzenie chorobowe wypłaca pracodawca. Od 34. dnia zasiłek wypłaca płatnik składek lub ZUS — zależnie od liczby osób zgłoszonych do ubezpieczenia. Osobie prowadzącej działalność gospodarczą zasiłek zawsze wypłaca ZUS.",
      },
      {
        kind: "heading",
        text: "Po zakończeniu umowy",
      },
      {
        kind: "paragraph",
        text: "Zasiłek chorobowy za okres po ustaniu tytułu ubezpieczenia przysługuje nie dłużej niż przez 91 dni. Nie dotyczy to m.in. niezdolności spowodowanej gruźlicą lub występującej w trakcie ciąży. Konieczne jest złożenie oświadczenia Z-10 i zaświadczenia od byłego płatnika. Sprawdź, czy w dniu zachorowania miałeś jeszcze ubezpieczenie — to decyduje o prawie do zasiłku.",
      },
      {
        kind: "callout",
        tone: "info",
        title: "Dokumenty",
        text: "e-ZLA jest podstawowym dokumentem. Gdy zasiłek wypłaca ZUS, dochodzą Z-3 lub Z-3a. Przedsiębiorcy składają ZAS-53, a przy kontynuacji nieprzerwanej choroby — ZAS-12. Po ustaniu ubezpieczenia potrzebne jest Z-10.",
      },
    ],
    practicalTips: [
      "Sprawdź, czy lekarz wpisał kod B, jeśli niezdolność jest związana z ciążą.",
      "Pilnuj 60-dniowych przerw między zwolnieniami — wpływają na okres zasiłkowy.",
      "Po rozwiązaniu umowy nie zwlekaj z Z-10 i wnioskiem o zasiłek.",
    ],
    keywords: ["zasiłek chorobowy", "182 dni", "270 dni", "91 dni", "e-ZLA", "ZAS-53"],
    sources: [
      { sourceSlug: "zus-chorobowy", isPrimary: true },
      { sourceSlug: "zus-chorobowy-dokumenty", isPrimary: true },
      { sourceSlug: "ustawa-zasilkowa", locator: "art. 4, 8, 9, 11" },
    ],
    legalReferences: [
      { citation: "U art. 4", locator: "okres wyczekiwania" },
      { citation: "U art. 8", locator: "okresy zasiłkowe" },
      { citation: "U art. 9", locator: "wliczanie okresów" },
      { citation: "U art. 11", locator: "wysokość" },
    ],
  },
  {
    slug: ARTICLE_SLUGS.careBenefit,
    categorySlug: CATEGORY_SLUGS.benefits,
    title: "Zasiłek opiekuńczy: 60, 30 i 14 dni",
    summary:
      "Kiedy można zostać z chorym dzieckiem, ile dni przysługuje, dlaczego zasiłek dostaje tylko jedno z rodziców i jaki wniosek złożyć.",
    readingMinutes: 6,
    popularity: 79,
    lastReviewedAt: REVIEW_DATE,
    publishedAt: "2026-10-15",
    keyPoints: [
      {
        label: "Stawka",
        value: "Zasiłek opiekuńczy wynosi 80% podstawy wymiaru.",
      },
      {
        label: "Limity",
        value:
          "60 dni na dzieci do 14 lat, 30 dni na dziecko z niepełnosprawnością 14–18 lat, 14 dni na innych członków rodziny. Łącznie maks. 60 dni w roku.",
      },
      {
        label: "Jedno świadczenie",
        value:
          "Za ten sam okres zasiłek otrzymuje tylko jedno z rodziców — to, które złoży wniosek.",
      },
    ],
    blocks: [
      {
        kind: "heading",
        text: "Kiedy przysługuje",
      },
      {
        kind: "paragraph",
        text: "Zasiłek opiekuńczy przysługuje osobie objętej ubezpieczeniem chorobowym, która musi osobiście sprawować opiekę nad chorym dzieckiem lub innym chorym członkiem rodziny. Przysługuje też w określonych sytuacjach przy zdrowym dziecku do 8 lat — np. gdy żłobek lub szkoła zostaną zamknięte, dziecko wymaga izolacji albo opiekun (niania, dzienny opiekun) zachoruje.",
      },
      {
        kind: "paragraph",
        text: "Zasiłek przysługuje od pierwszego dnia ubezpieczenia chorobowego — nie ma okresu wyczekiwania. Warunkiem jest brak innych osób w gospodarstwie domowym, które mogą zapewnić opiekę. Wyjątek: chore dziecko do 2 lat — wtedy zasiłek przysługuje nawet, jeśli ktoś inny mógłby się nim zająć.",
      },
      {
        kind: "heading",
        text: "Ile dni",
      },
      {
        kind: "table",
        caption: "Limity zasiłku opiekuńczego w roku kalendarzowym",
        headers: ["Kogo dotyczy opieka", "Limit"],
        rows: [
          ["Chore dziecko do 14 lat", "60 dni"],
          ["Chore dziecko z niepełnosprawnością 14–18 lat", "30 dni"],
          ["Inny chory członek rodziny, w tym dziecko powyżej 14 lat", "14 dni"],
          ["Łącznie na dzieci i innych członków rodziny", "maks. 60 dni"],
        ],
      },
      {
        kind: "paragraph",
        text: "Limit nie zależy od liczby dzieci ani liczby osób uprawnionych. Jeżeli jedno z rodziców wykorzystało już część dni, drugiemu zostaje reszta wspólnego limitu. We wniosku podaje się liczbę dni wykorzystanych przez drugiego rodzica.",
      },
      {
        kind: "heading",
        text: "Szczególna sytuacja: matka w szpitalu",
      },
      {
        kind: "paragraph",
        text: "Jeżeli matka po urodzeniu dziecka wymaga opieki szpitalnej, a stan zdrowia uniemożliwia jej sprawowanie opieki nad dzieckiem, ubezpieczonemu ojcu lub innemu ubezpieczonemu członkowi rodziny przysługuje zasiłek opiekuńczy do 8 tygodni. Okresu tego nie wlicza się do limitu 60 dni.",
      },
      {
        kind: "heading",
        text: "Wniosek i dokumenty",
      },
      {
        kind: "list",
        items: [
          "Wniosek o zasiłek opiekuńczy składa się u pracodawcy. Od 24 października 2026 r. obowiązuje jeden formularz Z-15 — zastąpił Z-15A i Z-15B (na eZUS dostępny od połowy listopada).",
          "Podstawą jest e-ZLA wystawione na opiekę nad chorym dzieckiem lub członkiem rodziny.",
          "Pracodawca wypłaca zasiłek lub przekazuje dokumenty do ZUS, zależnie od liczby ubezpieczonych.",
          "Zasiłek nie jest wypłacany automatycznie — trzeba złożyć wniosek.",
        ],
      },
      {
        kind: "callout",
        tone: "warning",
        title: "Nie myl z urlopem na żądanie",
        text: "Urlop na żądanie to uprawnienie pracownicze z Kodeksu pracy (4 dni w roku). Zasiłek opiekuńczy to świadczenie z ubezpieczenia chorobowego. To dwa różne mechanizmy — można z nich korzystać w różnych sytuacjach, ale nie zamiast siebie bez sprawdzenia zasad.",
      },
    ],
    practicalTips: [
      "Sprawdź, ile dni limitu wykorzystał drugi rodzic, zanim złożysz wniosek.",
      "Zachowaj e-ZLA i potwierdzenie złożenia wniosku Z-15.",
      "Przy dłuższej hospitalizacji dziecka zapytaj o zasiłek opiekuńczy i urlop rodzicielski — to różne uprawnienia.",
    ],
    keywords: ["zasiłek opiekuńczy", "chore dziecko", "60 dni", "Z-15", "e-ZLA"],
    sources: [
      { sourceSlug: "zus-opiekunczy", isPrimary: true },
      { sourceSlug: "zus-opiekunczy-prawo", isPrimary: true },
      { sourceSlug: "zus-formularze-opiekunczy" },
      { sourceSlug: "ustawa-zasilkowa", locator: "art. 32–35" },
    ],
    legalReferences: [
      { citation: "U art. 33", locator: "limity dni" },
    ],
  },
  {
    slug: ARTICLE_SLUGS.amountAndBasis,
    categorySlug: CATEGORY_SLUGS.benefits,
    title: "Wysokość zasiłku i podstawa wymiaru bez tajemnic",
    summary:
      "Skąd bierze się kwota zasiłku, dlaczego 13,71% ma znaczenie, jak liczy się podstawę dzienną i czego nie obejmuje kalkulator.",
    readingMinutes: 7,
    popularity: 84,
    lastReviewedAt: REVIEW_DATE,
    publishedAt: "2026-10-15",
    keyPoints: [
      {
        label: "Okres odniesienia",
        value:
          "Co do zasady bierze się wynagrodzenie z 12 miesięcy poprzedzających miesiąc, w którym powstało prawo do zasiłku.",
      },
      {
        label: "Potrącenie",
        value:
          "Podstawę pomniejsza się o 13,71% — składki na ubezpieczenia społeczne finansowane przez ubezpieczonego.",
      },
      {
        label: "Dzień",
        value:
          "Podstawa dzienna to 1/30 podstawy miesięcznej. Zasiłek za część miesiąca liczy się za dni.",
      },
    ],
    blocks: [
      {
        kind: "heading",
        text: "Podstawa wymiaru składek a podstawa zasiłku",
      },
      {
        kind: "paragraph",
        text: "Podstawa wymiaru składek to kwota, od której płatnik oblicza składki. Podstawa wymiaru zasiłku to przeciętne miesięczne wynagrodzenie lub przychód z okresu odniesienia, po potrąceniach. To nie zawsze ta sama liczba. Do zasiłku nie wlicza się wszystkich składników wynagrodzenia — część premii i dodatków może być uwzględniona tylko wtedy, gdy stanowi podstawę wymiaru składek na ubezpieczenie chorobowe.",
      },
      {
        kind: "heading",
        text: "Jak liczy się podstawę",
      },
      {
        kind: "list",
        ordered: true,
        items: [
          "Ustal wynagrodzenie z 12 miesięcy kalendarzowych poprzedzających miesiąc powstania prawa do zasiłku.",
          "Odejmij 13,71% — część składek finansowanych przez ubezpieczonego.",
          "Podziel przez liczbę miesięcy, za które przysługiwało wynagrodzenie, aby otrzymać przeciętną miesięczną podstawę.",
          "Podziel podstawę miesięczną przez 30, aby otrzymać podstawę dzienną.",
          "Pomnóż podstawę dzienną przez stawkę (80%, 100%, 70% lub 81,5%) i liczbę dni zasiłku.",
        ],
      },
      {
        kind: "callout",
        tone: "info",
        title: "Przykład rachunkowy",
        text: "Wynagrodzenie 6 000 zł brutto przez 12 miesięcy. Po odjęciu 13,71% podstawa miesięczna wynosi 5 177,40 zł, a dzienna 172,58 zł. Przy zasiłku 80% to 138,06 zł za dzień. To przykład arytmetyczny, a nie gwarancja kwoty dla konkretnej osoby.",
      },
      {
        kind: "heading",
        text: "Krótszy okres ubezpieczenia",
      },
      {
        kind: "paragraph",
        text: "Jeżeli ubezpieczenie trwało krócej niż 12 miesięcy, podstawę ustala się z pełnych miesięcy kalendarzowych ubezpieczenia. Przy działalności gospodarczej i niektórych innych tytułach obowiązują zasady szczególne. W skrajnym przypadku podstawa może być bardzo niska — dlatego warto sprawdzić, czy składka była opłacana od realnego przychodu.",
      },
      {
        kind: "heading",
        text: "Czego nie obejmuje kalkulator",
      },
      {
        kind: "paragraph",
        text: "Kalkulator w tej aplikacji pokazuje mechanizm i porównuje warianty, ale nie zna Twojej pełnej historii zatrudnienia, przerw w ubezpieczeniu ani wszystkich składników wynagrodzenia. Minimalna podstawa i kwota świadczenia rodzicielskiego (Q-29) nie są jeszcze zatwierdzone, dlatego wynik może mieć status „Wymaga danych”. Ostateczną kwotę ustala płatnik składek lub ZUS.",
      },
      {
        kind: "callout",
        tone: "warning",
        title: "Nie zakładaj „ostatniej pensji”",
        text: "Zasiłek liczy się z okresu odniesienia, a nie z ostatniego miesiąca. Premia wypłacona raz w roku może zmienić podstawę, ale nie każda. Sprawdź zaświadczenie płatnika (Z-3/Z-3a), jeśli chcesz samodzielnie zweryfikować kwotę.",
      },
    ],
    practicalTips: [
      "Poproś kadry o zaświadczenie Z-3/Z-3a i sprawdź składniki uwzględnione w podstawie.",
      "Porównaj warianty w kalkulatorze, ale traktuj wynik jako szacunek.",
      "Jeżeli prowadzisz działalność, sprawdź, od jakiej podstawy opłacasz składkę chorobową.",
    ],
    keywords: ["podstawa wymiaru", "13,71%", "1/30", "wynagrodzenie", "zasiłek"],
    sources: [
      { sourceSlug: "ustawa-zasilkowa", locator: "art. 36–38", isPrimary: true },
      { sourceSlug: "zus-poradnik-rodzice" },
      { sourceSlug: "zus-chorobowy" },
    ],
    legalReferences: [
      { citation: "U art. 36", locator: "podstawa wymiaru" },
      { citation: "U art. 38", locator: "zasady szczególne" },
    ],
  },
  {
    slug: ARTICLE_SLUGS.entitlementConditions,
    categorySlug: CATEGORY_SLUGS.benefits,
    title: "Warunki prawa do zasiłku: checklista przed wnioskiem",
    summary:
      "Ubezpieczenie w dniu zdarzenia, okres wyczekiwania, dokumenty i terminy. Prosty test, który warto przejść przed złożeniem wniosku.",
    readingMinutes: 6,
    popularity: 82,
    lastReviewedAt: REVIEW_DATE,
    publishedAt: "2026-10-22",
    keyPoints: [
      {
        label: "Dzień zdarzenia",
        value:
          "Dla zasiłku macierzyńskiego liczy się ubezpieczenie chorobowe w dniu porodu lub przyjęcia dziecka.",
      },
      {
        label: "Wyczekiwanie",
        value:
          "Zasiłek chorobowy: 30 dni obowiązkowego lub 90 dni dobrowolnego ubezpieczenia. Macierzyński i opiekuńczy — bez wyczekiwania.",
      },
      {
        label: "Termin",
        value:
          "Roszczenie przedawnia się po 6 miesiącach od ostatniego dnia okresu, za który zasiłek przysługuje.",
      },
    ],
    blocks: [
      {
        kind: "heading",
        text: "Cztery pytania przed wnioskiem",
      },
      {
        kind: "list",
        ordered: true,
        items: [
          "Czy w dniu zdarzenia (poród, choroba, opieka) miałeś tytuł do ubezpieczenia chorobowego?",
          "Czy minął okres wyczekiwania, jeżeli dotyczy?",
          "Czy masz dokumenty: e-ZLA, dane dziecka, zaświadczenie płatnika, wniosek?",
          "Czy nie upłynął termin przedawnienia?",
        ],
      },
      {
        kind: "heading",
        text: "Ubezpieczenie w dniu zdarzenia",
      },
      {
        kind: "paragraph",
        text: "Najczęstszy problem to przerwa w ubezpieczeniu. Umowa o pracę rozwiązana przed porodem, zlecenie zakończone miesiąc wcześniej albo działalność zawieszona — to sytuacje, w których w dniu porodu możesz nie mieć ubezpieczenia chorobowego. Wtedy zasiłek macierzyński co do zasady nie przysługuje, nawet jeśli wcześniej pracowałaś wiele lat. Nie zakładaj, że „składki się liczą” — liczy się tytuł w dniu zdarzenia.",
      },
      {
        kind: "heading",
        text: "Okres wyczekiwania",
      },
      {
        kind: "paragraph",
        text: "Zasiłek chorobowy wymaga 30 dni ubezpieczenia obowiązkowego albo 90 dni dobrowolnego. Zasiłek macierzyński i opiekuńczy nie mają okresu wyczekiwania. Przy dobrowolnym ubezpieczeniu chorobowym (zlecenie, działalność) liczy się faktyczny okres opłacania składki — sama deklaracja nie wystarczy.",
      },
      {
        kind: "heading",
        text: "Dokumenty, które warto skompletować",
      },
      {
        kind: "list",
        items: [
          "e-ZLA lub zaświadczenie o przewidywanej dacie porodu.",
          "Dane dziecka: imię, nazwisko, PESEL, data i miejsce urodzenia.",
          "Dane drugiego rodzica, jeżeli dzielicie urlop lub zasiłek.",
          "Z-3 lub Z-3a, jeżeli zasiłek wypłaca ZUS.",
          "ZAM dla zasiłku macierzyńskiego, ZAS-53 dla chorobowego przedsiębiorcy, Z-15 dla opiekuńczego.",
          "Z-10 po ustaniu ubezpieczenia.",
        ],
      },
      {
        kind: "heading",
        text: "Terminy",
      },
      {
        kind: "paragraph",
        text: "Roszczenie o wypłatę zasiłku przedawnia się po 6 miesiącach od ostatniego dnia okresu, za który zasiłek przysługuje. Jeżeli nie złożyłeś wniosku z przyczyn niezależnych, termin liczy się od ustania przeszkody. Gdy niewypłacenie było błędem płatnika lub ZUS, roszczenie przedawnia się po 3 latach. Nie czekaj do ostatniej chwili — ZUS może potrzebować uzupełnienia dokumentów.",
      },
    ],
    practicalTips: [
      "Zrób sobie listę dokumentów i odhaczaj ją przed wizytą w ZUS.",
      "Sprawdź na PUE/eZUS, czy pracodawca zgłosił Cię do ubezpieczenia chorobowego.",
      "Zachowaj kopię każdego wniosku i potwierdzenie daty złożenia.",
    ],
    keywords: ["warunki", "ubezpieczenie", "okres wyczekiwania", "przedawnienie"],
    sources: [
      { sourceSlug: "ustawa-zasilkowa", isPrimary: true },
      { sourceSlug: "zus-przedawnienie", isPrimary: true },
      { sourceSlug: "zus-chorobowy" },
    ],
    legalReferences: [
      { citation: "U art. 4", locator: "okres wyczekiwania" },
      { citation: "U art. 67", locator: "przedawnienie" },
    ],
  },
  {
    slug: ARTICLE_SLUGS.sicknessInsurance,
    categorySlug: CATEGORY_SLUGS.insurance,
    title: "Ubezpieczenie chorobowe: obowiązkowe i dobrowolne",
    summary:
      "Kto jest ubezpieczony automatycznie, kto musi złożyć wniosek i dlaczego 30 albo 90 dni może zdecydować o prawie do zasiłku.",
    readingMinutes: 6,
    popularity: 76,
    lastReviewedAt: REVIEW_DATE,
    publishedAt: "2026-10-22",
    keyPoints: [
      {
        label: "Obowiązkowe",
        value:
          "Pracownicy są objęci ubezpieczeniem chorobowym obowiązkowo — składka jest potrącana z wynagrodzenia.",
      },
      {
        label: "Dobrowolne",
        value:
          "Zleceniobiorcy i osoby prowadzące działalność mogą przystąpić dobrowolnie. Wtedy obowiązuje 90-dniowy okres wyczekiwania.",
      },
      {
        label: "Ciągłość",
        value:
          "Przerwa w tytule ubezpieczenia może pozbawić prawa do zasiłku macierzyńskiego, jeśli wypada w dniu porodu.",
      },
    ],
    blocks: [
      {
        kind: "heading",
        text: "Kto jest objęty obowiązkowo",
      },
      {
        kind: "paragraph",
        text: "Ubezpieczenie chorobowe jest obowiązkowe dla pracowników, osób na niektórych innych tytułach wskazanych w ustawie systemowej oraz osób współpracujących. Składkę finansuje ubezpieczony, a płatnik odprowadza ją do ZUS. Pracownik nie musi składać wniosku o objęcie — dzieje się to z mocy prawa od dnia zatrudnienia.",
      },
      {
        kind: "heading",
        text: "Kiedy ubezpieczenie jest dobrowolne",
      },
      {
        kind: "paragraph",
        text: "Osoby wykonujące pracę na podstawie umowy zlecenia lub innej umowy o świadczenie usług, osoby prowadzące pozarolniczą działalność oraz osoby z nimi współpracujące mogą podlegać ubezpieczeniu chorobowemu dobrowolnie. Warunkiem jest złożenie zgłoszenia i opłacanie składki w terminie. Dla tych osób obowiązuje 90-dniowy okres wyczekiwania na zasiłek chorobowy.",
      },
      {
        kind: "callout",
        tone: "warning",
        title: "Dobrowolne nie znaczy automatyczne",
        text: "Samo zawarcie umowy zlecenia nie daje prawa do zasiłku macierzyńskiego. Trzeba złożyć zgłoszenie do ubezpieczenia chorobowego i opłacać składkę. Sprawdź w ZUS, czy ubezpieczenie jest aktywne — szczególnie przed planowaną ciążą.",
      },
      {
        kind: "heading",
        text: "Składka i podstawa",
      },
      {
        kind: "paragraph",
        text: "Składka chorobowa wynosi 2,45% podstawy wymiaru. Przy działalności gospodarczej podstawą może być zadeklarowana kwota, ale nie niższa niż ustawowe minimum. Od podstawy zależy późniejszy zasiłek — oszczędzanie na składce może oznaczać niższe świadczenie. Przy zleceniu podstawą jest przychód, od którego opłacana jest składka.",
      },
      {
        kind: "heading",
        text: "Przerwy i zbieg tytułów",
      },
      {
        kind: "paragraph",
        text: "Jeżeli masz kilka tytułów jednocześnie, co do zasady ubezpieczenie chorobowe jest obowiązkowe z jednego z nich, a z pozostałych może być dobrowolne. Przerwa w ubezpieczeniu może oznaczać brak prawa do zasiłku w dniu porodu. Warto sprawdzić historię na koncie PUE/eZUS i ewentualne zaległości — przy działalności zaległości mogą wpłynąć na prawo do świadczeń.",
      },
    ],
    practicalTips: [
      "Sprawdź na PUE/eZUS, czy pracodawca zgłosił Cię do ubezpieczenia chorobowego.",
      "Przy zleceniu poproś o potwierdzenie zgłoszenia do dobrowolnego ubezpieczenia.",
      "Nie zakładaj ciągłości ubezpieczenia przy zmianie pracy — sprawdź daty przejścia.",
    ],
    keywords: ["ubezpieczenie chorobowe", "składka", "zlecenie", "działalność", "30 dni", "90 dni"],
    sources: [
      { sourceSlug: "zus-poradnik-rodzice", isPrimary: true },
      { sourceSlug: "ustawa-zasilkowa", locator: "art. 4" },
      { sourceSlug: "zus-chorobowy" },
    ],
    legalReferences: [
      { citation: "U art. 4", locator: "okres wyczekiwania" },
    ],
  },
  {
    slug: ARTICLE_SLUGS.mandateAndBusiness,
    categorySlug: CATEGORY_SLUGS.insurance,
    title: "Umowa zlecenie i działalność gospodarcza a zasiłek",
    summary:
      "Dobrowolne ubezpieczenie chorobowe, 90 dni wyczekiwania, składka od podstawy i ryzyko, gdy umowa kończy się przed porodem.",
    readingMinutes: 7,
    popularity: 81,
    lastReviewedAt: REVIEW_DATE,
    publishedAt: "2026-10-29",
    keyPoints: [
      {
        label: "Zlecenie",
        value:
          "Ubezpieczenie chorobowe jest dobrowolne. Bez zgłoszenia i składki nie ma zasiłku macierzyńskiego.",
      },
      {
        label: "Działalność",
        value:
          "Składka chorobowa jest dobrowolna. Zasiłki zawsze wypłaca ZUS, ale prawo zależy od opłacania składki i braku zaległości.",
      },
      {
        label: "90 dni",
        value:
          "Dla dobrowolnego ubezpieczenia obowiązuje 90-dniowy okres wyczekiwania na zasiłek chorobowy.",
      },
    ],
    blocks: [
      {
        kind: "heading",
        text: "Umowa zlecenie",
      },
      {
        kind: "paragraph",
        text: "Zleceniobiorca może przystąpić do dobrowolnego ubezpieczenia chorobowego. Zgłoszenia dokonuje płatnik składek. Po 90 dniach nieprzerwanego ubezpieczenia powstaje prawo do zasiłku chorobowego, a po spełnieniu warunków — także do zasiłku macierzyńskiego. Jeżeli umowa kończy się przed porodem i nie ma innego tytułu, w dniu porodu możesz nie być ubezpieczona.",
      },
      {
        kind: "paragraph",
        text: "Przy zleceniu podstawą wymiaru składki jest przychód. Zleceniodawca może opłacać składkę od niższej kwoty w granicach przepisów — to wpływa na wysokość przyszłego zasiłku. Warto poprosić o zaświadczenie Z-3a, gdy zbliża się poród.",
      },
      {
        kind: "heading",
        text: "Działalność gospodarcza",
      },
      {
        kind: "paragraph",
        text: "Przedsiębiorca opłaca składkę chorobową dobrowolnie. Prawo do zasiłku zależy od opłacania składki i od tego, czy w dniu zdarzenia podlega ubezpieczeniu. ZUS zawsze wypłaca zasiłek osobie prowadzącej działalność — nie ma tu płatnika, który wypłaca świadczenie. Od 24 października 2026 r. nie składa się już zaświadczenia Z-3b; wystarczy wniosek ZAM i pozostałe dokumenty.",
      },
      {
        kind: "callout",
        tone: "important",
        title: "Zaległości mogą pozbawić świadczenia",
        text: "Osoby, które same opłacają składki, mogą nie otrzymać zasiłku, jeżeli mają zaległości przekraczające ustawowy próg. Stan zadłużenia jest ustalany na dzień powstania prawa do świadczenia. Przed porodem sprawdź konto w ZUS i ureguluj zaległości.",
      },
      {
        kind: "heading",
        text: "Jak zwiększyć bezpieczeństwo",
      },
      {
        kind: "list",
        ordered: true,
        items: [
          "Sprawdź, czy dobrowolne ubezpieczenie chorobowe jest aktywne i czy składki są opłacane.",
          "Zaplanuj przejście na inny tytuł bez przerwy — nawet krótka luka może zablokować zasiłek macierzyński.",
          "Jeżeli prowadzisz działalność, porównaj deklarowaną podstawę składki z planowanym zasiłkiem.",
          "Zbierz dokumenty: ZAM, dane dziecka, zaświadczenie o okresie ubezpieczenia, ewentualne zaświadczenie „Za życiem”.",
        ],
      },
      {
        kind: "heading",
        text: "Kiedy umowa kończy się przed porodem",
      },
      {
        kind: "paragraph",
        text: "Zasiłek macierzyński nie przysługuje tylko dlatego, że wcześniej opłacałaś składki. Potrzebny jest tytuł w dniu porodu. Po zakończeniu zlecenia możesz rozważyć dobrowolne ubezpieczenie, jeżeli przepisy na to pozwalają — skonsultuj się z ZUS, bo terminy i warunki zależą od sytuacji. Zasiłek chorobowy po ustaniu ubezpieczenia może być wypłacany do 91 dni, ale ciąża jest tu objęta wyjątkiem.",
      },
    ],
    practicalTips: [
      "Nie czekaj z ubezpieczeniem do momentu, gdy starasz się o dziecko — 90 dni to długo.",
      "Poproś księgową o symulację podstawy zasiłku przed zmianą formy zatrudnienia.",
      "Sprawdź, czy umowa zlecenie nie kończy się przypadkiem w miesiącu porodu.",
    ],
    keywords: ["umowa zlecenie", "działalność gospodarcza", "B2B", "dobrowolne ubezpieczenie", "90 dni"],
    sources: [
      { sourceSlug: "zus-poradnik-rodzice", isPrimary: true },
      { sourceSlug: "zus-macierzynski" },
      { sourceSlug: "zus-uproszczenia-2026" },
      { sourceSlug: "ustawa-zasilkowa", locator: "art. 4, 29" },
    ],
    legalReferences: [
      { citation: "U art. 4", locator: "90 dni dla dobrowolnego" },
      { citation: "U art. 29", locator: "prawo do zasiłku macierzyńskiego" },
    ],
  },
  {
    slug: ARTICLE_SLUGS.insuranceGaps,
    categorySlug: CATEGORY_SLUGS.insurance,
    title: "Przerwy w ubezpieczeniu i zmiana pracy",
    summary:
      "Co robić, gdy między umowami jest luka, jak zmiana pracodawcy wpływa na zasiłek i kiedy warto działać przed porodem.",
    readingMinutes: 6,
    popularity: 72,
    lastReviewedAt: REVIEW_DATE,
    publishedAt: "2026-11-05",
    keyPoints: [
      {
        label: "Dzień porodu",
        value:
          "Najważniejsze jest ubezpieczenie chorobowe w dniu porodu, a nie łączna długość pracy.",
      },
      {
        label: "Zmiana pracy",
        value:
          "Nowy pracodawca zgłasza Cię do ubezpieczenia. Luka choćby jednego dnia może mieć skutki.",
      },
      {
        label: "Po ustaniu umowy",
        value:
          "Zasiłek chorobowy może być wypłacany do 91 dni, ale zasiłek macierzyński wymaga tytułu w dniu porodu.",
      },
    ],
    blocks: [
      {
        kind: "heading",
        text: "Dlaczego data ma znaczenie",
      },
      {
        kind: "paragraph",
        text: "System zasiłków opiera się na tytule ubezpieczenia w dniu zdarzenia. Jeżeli poród nastąpi w dniu, w którym nie jesteś objęta ubezpieczeniem chorobowym, zasiłek macierzyński co do zasady nie przysługuje — nawet jeśli wcześniej pracowałaś wiele lat. To dlatego zmiana pracy w ciąży wymaga szczególnej uwagi.",
      },
      {
        kind: "heading",
        text: "Zmiana pracodawcy w ciąży",
      },
      {
        kind: "paragraph",
        text: "Możesz zmienić pracę w ciąży. Nowy pracodawca obejmuje Cię ubezpieczeniem od dnia rozpoczęcia zatrudnienia. Ważne, aby między rozwiązaniem starej umowy a rozpoczęciem nowej nie było luki. Jeżeli nowa umowa zaczyna się następnego dnia po zakończeniu poprzedniej, ubezpieczenie jest ciągłe. Przy umowie o pracę okres wypowiedzenia i data rozpoczęcia powinny być zaplanowane na piśmie.",
      },
      {
        kind: "callout",
        tone: "warning",
        title: "Luka a zasiłek chorobowy",
        text: "Przy zmianie pracy może zabraknąć 30 dni ubezpieczenia obowiązkowego wymaganych do zasiłku chorobowego. Jeżeli wcześniej miałaś inny tytuł, okresy mogą się sumować — ale nie zawsze. Sprawdź to przed podpisaniem nowej umowy.",
      },
      {
        kind: "heading",
        text: "Zakończenie umowy przed porodem",
      },
      {
        kind: "paragraph",
        text: "Po ustaniu umowy możesz mieć prawo do zasiłku chorobowego za okres do 91 dni, jeżeli niezdolność powstała wcześniej i spełniasz warunki. Zasiłek macierzyński nie działa w ten sam sposób — potrzebny jest tytuł w dniu porodu. W niektórych sytuacjach możliwe jest dobrowolne ubezpieczenie chorobowe, ale trzeba sprawdzić terminy i warunki w ZUS. Nie zakładaj, że „samo się przedłuży”.",
      },
      {
        kind: "heading",
        text: "Co przygotować przy zmianie pracy",
      },
      {
        kind: "list",
        items: [
          "Świadectwo pracy i informację o okresie ubezpieczenia.",
          "Potwierdzenie zgłoszenia do ubezpieczenia przez nowego pracodawcę.",
          "Zaświadczenie Z-3 od poprzedniego pracodawcy, jeżeli ubiegasz się o zasiłek za okres przed zmianą.",
          "Dokumenty o dochodach, jeżeli ZUS będzie ustalał podstawę wymiaru z kilku tytułów.",
        ],
      },
      {
        kind: "heading",
        text: "Kilka tytułów jednocześnie",
      },
      {
        kind: "paragraph",
        text: "Jeżeli masz umowę o pracę i dodatkowo zlecenie, ubezpieczenie chorobowe z jednego tytułu jest obowiązkowe, a z drugiego może być dobrowolne. Zasiłek jest ustalany z jednego tytułu, co do zasady korzystniejszego, ale zasady są szczegółowe. Przy skomplikowanej historii poproś ZUS o interpretację lub skorzystaj z pomocy doradcy.",
      },
    ],
    practicalTips: [
      "Zaplanuj datę rozpoczęcia nowej pracy tak, aby nie było luki.",
      "Sprawdź w PUE/eZUS, czy nowy pracodawca zgłosił Cię w pierwszym dniu.",
      "Zachowaj świadectwo pracy i zaświadczenia o dochodach.",
    ],
    keywords: ["zmiana pracy", "przerwa w ubezpieczeniu", "luka", "ciągłość", "91 dni"],
    sources: [
      { sourceSlug: "ustawa-zasilkowa", locator: "art. 8, 29", isPrimary: true },
      { sourceSlug: "zus-poradnik-rodzice" },
      { sourceSlug: "zus-przedawnienie" },
    ],
    legalReferences: [
      { citation: "U art. 8", locator: "zasiłek po ustaniu ubezpieczenia" },
      { citation: "U art. 29", locator: "ubezpieczenie w dniu porodu" },
    ],
  },
  {
    slug: ARTICLE_SLUGS.maternityLeave,
    categorySlug: CATEGORY_SLUGS.leaves,
    title: "Urlop macierzyński: wymiar, podział i pierwsze 14 tygodni",
    summary:
      "Ile tygodni przysługuje, co można wykorzystać przed porodem, kiedy ojciec przejmuje część urlopu i jak złożyć wniosek.",
    readingMinutes: 7,
    popularity: 94,
    isFeatured: true,
    lastReviewedAt: REVIEW_DATE,
    publishedAt: "2026-10-01",
    keyPoints: [
      {
        label: "Wymiar",
        value:
          "20 tygodni przy jednym dziecku; 31, 33, 35 lub 37 tygodni przy ciąży mnogiej.",
      },
      {
        label: "Przed porodem",
        value: "Można wykorzystać maksymalnie 6 tygodni urlopu przed przewidywaną datą porodu.",
      },
      {
        label: "Pierwsze 14 tygodni",
        value:
          "Po porodzie pierwsze 14 tygodni urlopu jest zarezerwowane dla matki. Dopiero potem można przekazać resztę ojcu.",
      },
    ],
    blocks: [
      {
        kind: "heading",
        text: "Ile trwa urlop macierzyński",
      },
      {
        kind: "table",
        caption: "Wymiar urlopu macierzyńskiego",
        headers: ["Liczba dzieci przy jednym porodzie", "Wymiar"],
        rows: [
          ["1", "20 tygodni"],
          ["2", "31 tygodni"],
          ["3", "33 tygodnie"],
          ["4", "35 tygodni"],
          ["5 i więcej", "37 tygodni"],
        ],
      },
      {
        kind: "paragraph",
        text: "Urlop macierzyński jest obowiązkowy. Przysługuje pracownicy, która urodziła dziecko, bez względu na rodzaj umowy o pracę. Tydzień urlopu to 7 dni kalendarzowych. Przed porodem można wykorzystać nie więcej niż 6 tygodni. Jeżeli nie skorzystasz z urlopu przed porodem, rozpoczyna się on w dniu porodu.",
      },
      {
        kind: "heading",
        text: "Podział między rodziców",
      },
      {
        kind: "paragraph",
        text: "Po porodzie matka musi wykorzystać co najmniej 14 tygodni urlopu macierzyńskiego. Po tym okresie może zrezygnować z pozostałej części i wrócić do pracy, jeżeli pozostałą część wykorzysta ojciec wychowujący dziecko albo ojciec przejmie osobistą opiekę nad dzieckiem, przerywając działalność zarobkową. Matka składa wniosek o rezygnację najpóźniej 7 dni przed powrotem do pracy, a ojciec składa wniosek o urlop najpóźniej 14 dni przed jego rozpoczęciem.",
      },
      {
        kind: "callout",
        tone: "warning",
        title: "Wyjątek: 8 tygodni",
        text: "Matka może zrezygnować z dalszej części urlopu już po 8 tygodniach, jeżeli ma orzeczenie o niezdolności do samodzielnej egzystencji albo przebywa w szpitalu z powodu stanu zdrowia uniemożliwiającego opiekę. Wtedy pozostałą część może przejąć ojciec lub inny członek najbliższej rodziny.",
      },
      {
        kind: "heading",
        text: "Wniosek i dokumenty",
      },
      {
        kind: "list",
        ordered: true,
        items: [
          "Złóż pracodawcy wniosek o urlop macierzyński. Wniosek może być papierowy lub elektroniczny.",
          "Dołącz skrócony odpis aktu urodzenia dziecka, jeżeli wymaga go pracodawca lub płatnik.",
          "Jeżeli zasiłek wypłaca ZUS, potrzebne są Z-3 lub Z-3a oraz wniosek ZAM.",
          "Sprawdź, czy pracodawca przekazał dokumenty do ZUS i czy zasiłek jest wypłacany.",
        ],
      },
      {
        kind: "heading",
        text: "Czy można pracować na urlopie macierzyńskim",
      },
      {
        kind: "paragraph",
        text: "Urlop macierzyński jest urlopem obowiązkowym i co do zasady nie łączy się z pracą. Inaczej jest z urlopem rodzicielskim, który można łączyć z pracą u tego samego pracodawcy w wymiarze do połowy etatu. Jeżeli zastanawiasz się nad powrotem do pracy, sprawdź, czy chodzi o koniec macierzyńskiego, czy o rodzicielski — to zmienia zasady.",
      },
    ],
    practicalTips: [
      "Zaplanuj datę rozpoczęcia urlopu przed porodem, ale pamiętaj o limicie 6 tygodni.",
      "Jeżeli ojciec ma przejąć resztę urlopu, przygotuj oba wnioski równolegle.",
      "Sprawdź, czy pracodawca prawidłowo obliczył koniec urlopu — tydzień to 7 dni kalendarzowych.",
    ],
    keywords: ["urlop macierzyński", "20 tygodni", "14 tygodni", "podział urlopu", "ojciec"],
    sources: [
      { sourceSlug: "kodeks-pracy", locator: "art. 180", isPrimary: true },
      { sourceSlug: "zus-macierzynski" },
      { sourceSlug: "zus-macierzynski-dokumenty" },
    ],
    legalReferences: [
      { citation: "KP art. 180", locator: "wymiar i podział" },
      { citation: "U art. 29a", locator: "okres zasiłku" },
    ],
  },
  {
    slug: ARTICLE_SLUGS.parentalLeave,
    categorySlug: CATEGORY_SLUGS.leaves,
    title: "Urlop rodzicielski: 41 tygodni, 9 tygodni dla każdego i praca na część etatu",
    summary:
      "Jak dzielić urlop, dlaczego 9 tygodni nie da się przenieść, jak łączyć go z pracą i kiedy złożyć wniosek.",
    readingMinutes: 8,
    popularity: 90,
    isFeatured: true,
    lastReviewedAt: REVIEW_DATE,
    publishedAt: "2026-10-08",
    keyPoints: [
      {
        label: "Wymiar",
        value:
          "41 tygodni przy jednym dziecku i 43 tygodnie przy ciąży mnogiej; 65/67 tygodni z „Za życiem”.",
      },
      {
        label: "9 tygodni",
        value:
          "Każdy z rodziców ma 9 tygodni, których nie można przenieść na drugiego rodzica. Niewykorzystane tygodnie przepadają.",
      },
      {
        label: "Praca",
        value:
          "Urlop można łączyć z pracą u tego samego pracodawcy w wymiarze do połowy etatu. Wtedy urlop się wydłuża.",
      },
    ],
    blocks: [
      {
        kind: "heading",
        text: "Ile urlopu i dla kogo",
      },
      {
        kind: "paragraph",
        text: "Urlop rodzicielski przysługuje obojgu rodzicom łącznie. Przy jednym dziecku to 41 tygodni, przy ciąży mnogiej 43 tygodnie. Z zaświadczeniem „Za życiem” wymiar wynosi 65 tygodni (jedno dziecko) lub 67 tygodni (ciąża mnoga). Urlop jest udzielany na wniosek i co do zasady można go wykorzystać w maksymalnie 5 częściach, nie później niż do końca roku kalendarzowego, w którym dziecko kończy 6 lat.",
      },
      {
        kind: "heading",
        text: "9 tygodni, których nie można oddać",
      },
      {
        kind: "paragraph",
        text: "Każdemu z rodziców przysługuje wyłączne prawo do 9 tygodni urlopu rodzicielskiego. Jeżeli ojciec nie skorzysta ze swoich 9 tygodni, matka nie może ich przejąć — te tygodnie po prostu przepadają. To celowa zachęta do dzielenia opieki. Wniosek o urlop powinien wskazywać, ile urlopu wykorzystał już drugi rodzic, aby pracodawca mógł sprawdzić limit.",
      },
      {
        kind: "callout",
        tone: "important",
        title: "Oświadczenie drugiego rodzica",
        text: "Przy każdym wniosku warto mieć oświadczenie drugiego rodzica o wykorzystanym urlopie i zasiłku. Bez tego łatwo o pomyłkę w limicie, a później o korektę zasiłku.",
      },
      {
        kind: "heading",
        text: "Terminy",
      },
      {
        kind: "list",
        items: [
          "Wniosek o urlop rodzicielski składa się co najmniej 21 dni przed rozpoczęciem urlopu.",
          "Wniosek o łączenie urlopu z pracą również składa się co najmniej 21 dni przed rozpoczęciem pracy.",
          "Pracodawca co do zasady musi uwzględnić wniosek o urlop. Przy łączeniu z pracą może odmówić, jeżeli nie pozwala na to organizacja lub rodzaj pracy, i musi podać przyczynę w ciągu 7 dni.",
        ],
      },
      {
        kind: "heading",
        text: "Łączenie z pracą",
      },
      {
        kind: "paragraph",
        text: "Możesz pracować u pracodawcy udzielającego urlopu w wymiarze nie większym niż połowa etatu. Urlopu udziela się wtedy na pozostałą część etatu, a jego wymiar proporcjonalnie się wydłuża — maksymalnie do 82 tygodni przy jednym dziecku i 86 tygodni przy ciąży mnogiej. Zasiłek macierzyński zmniejsza się proporcjonalnie do wymiaru pracy. To elastyczne rozwiązanie, ale obliczenia bywają skomplikowane — poproś kadry o pisemne wyliczenie.",
      },
      {
        kind: "heading",
        text: "Jak podzielić urlop — przykład",
      },
      {
        kind: "paragraph",
        text: "Rodzice jednego dziecka mają 41 tygodni. Matka bierze 20 tygodni macierzyńskiego, a następnie np. 20 tygodni rodzicielskiego, ojciec 9 tygodni swojej części, a pozostałe 12 tygodni matka. Suma musi wynosić 41 tygodni. Jeżeli ojciec nie wykorzysta swoich 9 tygodni, pula maleje — nie można ich przesunąć na matkę. Dokładny plan warto rozpisać przed złożeniem pierwszego wniosku.",
      },
    ],
    practicalTips: [
      "Zapisz, ile tygodni wykorzystał każdy z rodziców — to podstawa kolejnych wniosków.",
      "Nie planuj całego urlopu bez 9 tygodni drugiego rodzica.",
      "Przy łączeniu z pracą poproś o wyliczenie wydłużenia na piśmie.",
    ],
    keywords: ["urlop rodzicielski", "41 tygodni", "9 tygodni", "łączenie z pracą", "podział"],
    sources: [
      { sourceSlug: "kodeks-pracy", locator: "art. 182¹a–182¹f", isPrimary: true },
      { sourceSlug: "zus-macierzynski" },
      { sourceSlug: "gov-za-zyciem" },
    ],
    legalReferences: [
      { citation: "KP art. 182¹a", locator: "wymiar i 9 tygodni" },
      { citation: "U art. 31", locator: "stawki za rodzicielski" },
    ],
  },
  {
    slug: ARTICLE_SLUGS.paternityLeave,
    categorySlug: CATEGORY_SLUGS.leaves,
    title: "Urlop ojcowski: 2 tygodnie i ważne terminy",
    summary:
      "Kiedy ojciec może wziąć urlop, jak go podzielić, do kiedy złożyć wniosek i jak łączy się on z urlopem macierzyńskim.",
    readingMinutes: 5,
    popularity: 77,
    lastReviewedAt: REVIEW_DATE,
    publishedAt: "2026-10-15",
    keyPoints: [
      {
        label: "Wymiar",
        value: "Do 2 tygodni urlopu ojcowskiego.",
      },
      {
        label: "Termin",
        value:
          "Do ukończenia przez dziecko 12. miesiąca życia, a przy adopcji — do 12 miesięcy od uprawomocnienia przysposobienia, nie dłużej niż do 14. roku życia dziecka.",
      },
      {
        label: "Podział",
        value: "Jednorazowo albo w dwóch częściach, każda co najmniej tydzień.",
      },
    ],
    blocks: [
      {
        kind: "heading",
        text: "Kto i kiedy",
      },
      {
        kind: "paragraph",
        text: "Urlop ojcowski przysługuje pracownikowi-ojcu wychowującemu dziecko. Można go wykorzystać do ukończenia przez dziecko 12. miesiąca życia. Przy adopcji termin liczy się od uprawomocnienia postanowienia o przysposobieniu i nie może przekroczyć 14. roku życia dziecka. Urlop można wziąć jednorazowo albo w dwóch częściach, z których żadna nie może być krótsza niż tydzień.",
      },
      {
        kind: "heading",
        text: "Wniosek",
      },
      {
        kind: "paragraph",
        text: "Wniosek składa się pracodawcy w formie papierowej lub elektronicznej najpóźniej 7 dni przed rozpoczęciem urlopu. Pracodawca udziela urlopu w terminie wskazanym we wniosku. Za okres urlopu ojcowskiego przysługuje zasiłek macierzyński w wysokości 100% podstawy wymiaru.",
      },
      {
        kind: "heading",
        text: "Urlop ojcowski a macierzyński",
      },
      {
        kind: "paragraph",
        text: "Urlop ojcowski to odrębne uprawnienie od części urlopu macierzyńskiego, którą ojciec może przejąć po matce. Ojcowski przysługuje niezależnie od tego, czy matka wróciła do pracy. Wymiar i zasiłek są liczone odrębnie od urlopu macierzyńskiego i rodzicielskiego. Termin i sposób wykorzystania urlopu ustal z pracodawcą, aby uniknąć kolizji z innymi nieobecnościami.",
      },
      {
        kind: "callout",
        tone: "info",
        title: "Nie myl z 9 tygodniami",
        text: "9 tygodni to niezbywalna część urlopu rodzicielskiego. Urlop ojcowski to osobne 2 tygodnie. Ojciec może skorzystać z obu uprawnień, jeżeli spełnia warunki.",
      },
    ],
    practicalTips: [
      "Złóż wniosek co najmniej 7 dni przed planowanym startem.",
      "Zaplanuj urlop tak, aby nie kolidował z kluczowymi terminami w pracy.",
      "Sprawdź, czy pracodawca prawidłowo nalicza zasiłek 100%.",
    ],
    keywords: ["urlop ojcowski", "2 tygodnie", "ojciec", "adopcja"],
    sources: [
      { sourceSlug: "kodeks-pracy", locator: "art. 182³", isPrimary: true },
      { sourceSlug: "zus-macierzynski" },
    ],
    legalReferences: [
      { citation: "KP art. 182³", locator: "wymiar i termin" },
      { citation: "U art. 31", locator: "100% podstawy" },
    ],
  },
  {
    slug: ARTICLE_SLUGS.documentsAfterBirth,
    categorySlug: CATEGORY_SLUGS.documents,
    title: "Dokumenty po urodzeniu dziecka: co, gdzie i kiedy",
    summary:
      "Zgłoszenie urodzenia w 21 dni, akt urodzenia, PESEL, wniosek o zasiłek i dokumenty, które naprawdę są potrzebne.",
    readingMinutes: 7,
    popularity: 87,
    isFeatured: true,
    lastReviewedAt: REVIEW_DATE,
    publishedAt: "2026-10-22",
    keyPoints: [
      {
        label: "21 dni",
        value:
          "Urodzenie zgłasza się w ciągu 21 dni od wystawienia karty urodzenia — w USC, online lub w mObywatelu.",
      },
      {
        label: "Akt urodzenia",
        value:
          "Kierownik USC sporządza akt urodzenia i wydaje jeden bezpłatny odpis skrócony.",
      },
      {
        label: "Zasiłek",
        value:
          "Gdy zasiłek wypłaca ZUS, odpisu aktu nie trzeba już dołączać — ZUS pozyskuje dane z rejestru.",
      },
    ],
    blocks: [
      {
        kind: "heading",
        text: "1. Zgłoszenie urodzenia",
      },
      {
        kind: "paragraph",
        text: "Kartę urodzenia wystawia osoba, która przyjęła poród — lekarz lub położna — i przekazuje ją do urzędu stanu cywilnego najpóźniej 3 dni od wystawienia. Rodzic ma 21 dni od wystawienia karty na zgłoszenie urodzenia i wybór imienia. Można to zrobić osobiście w USC, online przez gov.pl lub w aplikacji mObywatel. Jeżeli termin minie, kierownik USC zarejestruje dziecko i sam wybierze imię.",
      },
      {
        kind: "callout",
        tone: "warning",
        title: "Dziecko urodzone martwe",
        text: "Zgłoszenie następuje w ciągu 3 dni od wystawienia karty martwego urodzenia. Jeżeli płeć dziecka nie została ustalona, karta nie trafia do USC — lekarz może wystawić kartę zgonu na wniosek osoby uprawnionej do pochówku.",
      },
      {
        kind: "heading",
        text: "2. Akt urodzenia i PESEL",
      },
      {
        kind: "paragraph",
        text: "Po zgłoszeniu kierownik USC sporządza akt urodzenia, nadaje dziecku PESEL i wydaje odpis skrócony. To ten dokument potwierdza imię, nazwisko i datę urodzenia. Dziecko jest zameldowane, jeżeli zostały podane dane adresowe. Odpis skrócony jest bezpłatny — nie trzeba kupować dodatkowych dokumentów, chyba że potrzebujesz ich więcej.",
      },
      {
        kind: "heading",
        text: "3. Wniosek o zasiłek macierzyński",
      },
      {
        kind: "list",
        ordered: true,
        items: [
          "Pracownik składa u pracodawcy wniosek o urlop macierzyński i zasiłek.",
          "Gdy zasiłek wypłaca ZUS, potrzebne są dane dziecka (imię, nazwisko, PESEL, data i miejsce urodzenia) oraz dane drugiego rodzica. Odpis aktu nie jest już wymagany — ZUS pobiera dane z rejestru.",
          "Gdy zasiłek wypłaca płatnik składek, skrócony odpis aktu urodzenia nadal trzeba dołączyć.",
          "Osoba prowadząca działalność składa ZAM do ZUS, najwygodniej przez PUE/eZUS.",
        ],
      },
      {
        kind: "heading",
        text: "4. Dokumenty, które warto mieć pod ręką",
      },
      {
        kind: "list",
        items: [
          "Odpis skrócony aktu urodzenia.",
          "Numer PESEL dziecka i dane drugiego rodzica.",
          "e-ZLA, jeżeli była niezdolność do pracy przed porodem.",
          "Zaświadczenie „Za życiem”, jeżeli dziecko je posiada.",
          "Zaświadczenie Z-3 lub Z-3a, jeżeli zasiłek wypłaca ZUS.",
          "Numer rachunku bankowego do wypłaty zasiłku.",
        ],
      },
      {
        kind: "heading",
        text: "5. Co zrobić po złożeniu",
      },
      {
        kind: "paragraph",
        text: "Zachowaj potwierdzenie złożenia wniosku. Sprawdź, czy ZUS lub pracodawca nie prosi o uzupełnienie dokumentów. Jeżeli decyzja nie przyjdzie w rozsądnym terminie, skontaktuj się z ZUS przez PUE/eZUS lub infolinię. Roszczenie o wypłatę zasiłku przedawnia się po 6 miesiącach od ostatniego dnia okresu, za który zasiłek przysługuje — nie odkładaj sprawy.",
      },
    ],
    practicalTips: [
      "Zgłoś urodzenie online, jeśli masz profil zaufany — oszczędzisz wizytę w USC.",
      "Zapisz numer PESEL dziecka od razu po otrzymaniu dokumentów.",
      "Sprawdź, kto wypłaca zasiłek: pracodawca czy ZUS — od tego zależą dokumenty.",
    ],
    keywords: ["urodzenie", "akt urodzenia", "PESEL", "USC", "ZAM", "dokumenty"],
    sources: [
      { sourceSlug: "gov-urodzenie", isPrimary: true },
      { sourceSlug: "zus-macierzynski-dokumenty", isPrimary: true },
      { sourceSlug: "zus-uproszczenia-2026" },
    ],
    legalReferences: [
      { citation: "U art. 29", locator: "prawo do zasiłku" },
    ],
  },
  {
    slug: ARTICLE_SLUGS.adoption,
    categorySlug: CATEGORY_SLUGS.adoption,
    title: "Adopcja: urlopy, zasiłek i dokumenty",
    summary:
      "Urlop na warunkach urlopu macierzyńskiego, urlop rodzicielski, zasiłek i dokumenty sądowe — krok po kroku.",
    readingMinutes: 8,
    popularity: 68,
    isFeatured: true,
    lastReviewedAt: REVIEW_DATE,
    publishedAt: "2026-10-29",
    keyPoints: [
      {
        label: "Wymiar",
        value:
          "20 tygodni przy jednym dziecku, 31/33/35/37 przy większej liczbie dzieci przyjętych jednocześnie.",
      },
      {
        label: "Wiek dziecka",
        value:
          "Przy przysposobieniu urlop przysługuje do ukończenia przez dziecko 14. roku życia; przy rodzinie zastępczej zwykle do 7/10 lat.",
      },
      {
        label: "Termin",
        value:
          "Wniosek o urlop na warunkach macierzyńskiego składa się w ciągu 7 dni od przyjęcia dziecka, a urlop zaczyna się najpóźniej 21 dni później.",
      },
    ],
    blocks: [
      {
        kind: "heading",
        text: "Jakie uprawnienia ma rodzic adopcyjny",
      },
      {
        kind: "paragraph",
        text: "Pracownik, który przyjął dziecko na wychowanie i wystąpił do sądu opiekuńczego o wszczęcie postępowania w sprawie przysposobienia, ma prawo do urlopu na warunkach urlopu macierzyńskiego. Wymiar zależy od liczby dzieci przyjętych jednocześnie: 20 tygodni przy jednym, 31 przy dwojgu, 33 przy trojgu, 35 przy czworgu i 37 przy pięciorgu lub więcej. Urlop przysługuje nie dłużej niż do ukończenia przez dziecko 14. roku życia.",
      },
      {
        kind: "paragraph",
        text: "Po urlopie na warunkach macierzyńskiego przysługuje urlop rodzicielski — 41 tygodni przy jednym dziecku i 43 tygodnie przy większej liczbie dzieci, nie dłużej niż do 14. roku życia dziecka. Każdemu z rodziców przysługuje 9 tygodni niezbywalnych. Zasiłek macierzyński przysługuje na zasadach ogólnych, jeżeli w dniu przyjęcia dziecka było się objętym ubezpieczeniem chorobowym.",
      },
      {
        kind: "heading",
        text: "Rodzina zastępcza",
      },
      {
        kind: "paragraph",
        text: "Pracownik, który przyjął dziecko na wychowanie jako rodzina zastępcza (z wyjątkiem rodziny zastępczej zawodowej), ma prawo do urlopu na warunkach urlopu macierzyńskiego w wymiarze 20–37 tygodni, nie dłużej niż do ukończenia przez dziecko 7. roku życia, a przy odroczeniu obowiązku szkolnego — do 10. roku życia. Urlop rodzicielski wynosi odpowiednio 41/43 tygodnie. Zasiłek macierzyński przysługuje, jeżeli w dniu przyjęcia dziecka była ubezpieczona.",
      },
      {
        kind: "heading",
        text: "Wniosek i terminy",
      },
      {
        kind: "list",
        ordered: true,
        items: [
          "Złóż wniosek o urlop na warunkach urlopu macierzyńskiego w ciągu 7 dni od przyjęcia dziecka na wychowanie lub wystąpienia do sądu o przysposobienie.",
          "Urlop rozpoczyna się w terminie wskazanym we wniosku, ale nie później niż 21 dni od przyjęcia dziecka.",
          "Do wniosku dołącz dokumenty określone w rozporządzeniu: zaświadczenie sądu o dacie wystąpienia o przysposobienie, odpis aktu urodzenia, decyzję o odroczeniu obowiązku szkolnego, a przy rodzinie zastępczej — orzeczenie sądu lub umowę z starostą.",
          "Wniosek o urlop rodzicielski złóż co najmniej 21 dni przed rozpoczęciem urlopu.",
        ],
      },
      {
        kind: "callout",
        tone: "info",
        title: "Zasiłek i dokumenty",
        text: "Gdy zasiłek wypłaca ZUS, potrzebny jest wniosek ZAM oraz dokumenty potwierdzające przyjęcie dziecka na wychowanie. Od 24 października 2026 r. nie składa się Z-3b. ZUS może samodzielnie pozyskać część danych, ale dokumenty sądowe i tak trzeba przedstawić.",
      },
      {
        kind: "heading",
        text: "Co jeszcze warto załatwić",
      },
      {
        kind: "list",
        items: [
          "Zgłoszenie dziecka do ubezpieczenia zdrowotnego u pracodawcy lub w ZUS.",
          "Wniosek o PESEL, jeżeli dziecko go nie ma.",
          "Urlop ojcowski — ojciec adopcyjny ma do 2 tygodni do 12 miesięcy od uprawomocnienia przysposobienia, nie dłużej niż do 14. roku życia dziecka.",
          "Sprawdzenie, czy pracodawca prawidłowo nalicza zasiłek i czy nie trzeba złożyć korekty.",
        ],
      },
    ],
    practicalTips: [
      "Nie czekaj z wnioskiem do uprawomocnienia przysposobienia — urlop przysługuje już po wystąpieniu do sądu.",
      "Poproś sąd o zaświadczenie o dacie wystąpienia z wnioskiem.",
      "Zapytaj pracodawcę, czy stosuje ZAM i czy przekazuje dokumenty do ZUS.",
    ],
    keywords: ["adopcja", "przysposobienie", "urlop adopcyjny", "rodzina zastępcza", "ZAM"],
    sources: [
      { sourceSlug: "kodeks-pracy", locator: "art. 183", isPrimary: true },
      { sourceSlug: "ustawa-zasilkowa", locator: "art. 29", isPrimary: true },
      { sourceSlug: "zus-macierzynski" },
    ],
    legalReferences: [
      { citation: "KP art. 183", locator: "urlop adopcyjny" },
      { citation: "U art. 29", locator: "prawo do zasiłku" },
    ],
  },
  {
    slug: ARTICLE_SLUGS.fosterCare,
    categorySlug: CATEGORY_SLUGS.adoption,
    title: "Rodzicielstwo zastępcze a zasiłek macierzyński",
    summary:
      "Kto może skorzystać, jakie są limity wieku, czego nie obejmuje zasiłek i jakie dokumenty przygotować.",
    readingMinutes: 6,
    popularity: 55,
    lastReviewedAt: REVIEW_DATE,
    publishedAt: "2026-11-05",
    keyPoints: [
      {
        label: "Kto",
        value:
          "Osoba, która przyjęła dziecko w ramach rodziny zastępczej — z wyjątkiem rodziny zastępczej zawodowej.",
      },
      {
        label: "Wiek",
        value:
          "Do 7. roku życia, a przy odroczeniu obowiązku szkolnego — do 10. roku życia.",
      },
      {
        label: "Urlop",
        value:
          "20–37 tygodni urlopu na warunkach macierzyńskiego i 41/43 tygodnie urlopu rodzicielskiego.",
      },
    ],
    blocks: [
      {
        kind: "heading",
        text: "Kto jest uprawniony",
      },
      {
        kind: "paragraph",
        text: "Zasiłek macierzyński przysługuje ubezpieczonej, która przyjęła na wychowanie dziecko w ramach rodziny zastępczej, z wyjątkiem rodziny zastępczej zawodowej. Dziecko musi mieć do 7 lat, a jeżeli podjęto decyzję o odroczeniu obowiązku szkolnego — do 10 lat. Warunkiem jest ubezpieczenie chorobowe w dniu przyjęcia dziecka.",
      },
      {
        kind: "paragraph",
        text: "Rodzina zastępcza zawodowa jest wyłączona z tego uprawnienia. Jej sytuacja może być regulowana odrębnie — warto zapytać w ośrodku pomocy społecznej lub w ZUS, jakie świadczenia przysługują w konkretnym modelu.",
      },
      {
        kind: "heading",
        text: "Urlopy",
      },
      {
        kind: "paragraph",
        text: "Urlop na warunkach urlopu macierzyńskiego wynosi 20 tygodni przy jednym dziecku, 31 tygodni przy dwojgu, 33 przy trojgu, 35 przy czworgu i 37 przy pięciorgu lub więcej. Urlop rodzicielski to 41/43 tygodnie. Urlop na warunkach macierzyńskiego jest udzielany na wniosek w ciągu 7 dni od przyjęcia dziecka i zaczyna się nie później niż 21 dni później. Urlop rodzicielski wymaga wniosku co najmniej 21 dni przed startem.",
      },
      {
        kind: "heading",
        text: "Dokumenty",
      },
      {
        kind: "list",
        items: [
          "Prawomocne orzeczenie sądu o umieszczeniu dziecka w rodzinie zastępczej albo umowa cywilnoprawna między rodziną zastępczą a starostą.",
          "Decyzja o odroczeniu obowiązku szkolnego, jeżeli dotyczy.",
          "Dokument potwierdzający wiek dziecka.",
          "Wniosek ZAM i dane dziecka.",
          "Zaświadczenie Z-3 lub Z-3a, jeżeli zasiłek wypłaca ZUS.",
        ],
      },
      {
        kind: "callout",
        tone: "warning",
        title: "Zasiłek nie jest automatyczny",
        text: "Samo umieszczenie dziecka w rodzinie zastępczej nie uruchamia wypłaty. Trzeba złożyć wniosek i mieć ubezpieczenie chorobowe. Sprawdź też, czy nie upłynął termin na złożenie wniosku o urlop — przy rodzinie zastępczej jest on krótki.",
      },
    ],
    practicalTips: [
      "Poproś ośrodek pomocy społecznej o komplet dokumentów od razu po umieszczeniu dziecka.",
      "Sprawdź, czy jesteś objęta ubezpieczeniem chorobowym w dniu przyjęcia dziecka.",
      "Złóż wniosek o urlop w ciągu 7 dni — nie odkładaj.",
    ],
    keywords: ["rodzina zastępcza", "zasiłek macierzyński", "urlop", "dziecko"],
    sources: [
      { sourceSlug: "kodeks-pracy", locator: "art. 183", isPrimary: true },
      { sourceSlug: "ustawa-zasilkowa", locator: "art. 29", isPrimary: true },
      { sourceSlug: "zus-macierzynski" },
    ],
    legalReferences: [
      { citation: "KP art. 183", locator: "rodzina zastępcza" },
      { citation: "U art. 29", locator: "prawo do zasiłku" },
    ],
  },
  {
    slug: ARTICLE_SLUGS.stillbirthAndLoss,
    categorySlug: CATEGORY_SLUGS.special,
    title: "Urodzenie martwego dziecka i śmierć dziecka",
    summary:
      "Jakie uprawnienia przysługują, jakie dokumenty są potrzebne i gdzie szukać wsparcia. Napisane z troską i bez urzędowego chłodu.",
    readingMinutes: 6,
    popularity: 61,
    isFeatured: true,
    lastReviewedAt: REVIEW_DATE,
    publishedAt: "2026-11-12",
    keyPoints: [
      {
        label: "Urlop",
        value:
          "Po urodzeniu martwego dziecka przysługuje 8 tygodni urlopu macierzyńskiego, nie krócej niż 7 dni od zgonu.",
      },
      {
        label: "Zgłoszenie",
        value:
          "Urodzenie martwego dziecka zgłasza się w ciągu 3 dni od wystawienia karty martwego urodzenia.",
      },
      {
        label: "Wsparcie",
        value:
          "Masz prawo do informacji, dokumentów i wsparcia psychologicznego. Nie musisz przechodzić tego sama.",
      },
    ],
    blocks: [
      {
        kind: "heading",
        text: "Urlop macierzyński",
      },
      {
        kind: "paragraph",
        text: "W razie urodzenia martwego dziecka pracownicy przysługuje urlop macierzyński w wymiarze 8 tygodni po porodzie, nie krócej jednak niż przez 7 dni od dnia zgonu dziecka. Jeżeli dziecko zmarło przed upływem 8 tygodni życia, urlop również wynosi 8 tygodni po porodzie, z zastrzeżeniem 7 dni od zgonu. Jeżeli dziecko zmarło po upływie 8 tygodni życia, pracownica zachowuje prawo do urlopu macierzyńskiego przez 7 dni od dnia zgonu.",
      },
      {
        kind: "paragraph",
        text: "Zasiłek macierzyński przysługuje na zasadach ogólnych, jeżeli w dniu porodu była ubezpieczona. Wymiar urlopu jest krótszy niż przy urodzeniu żywego dziecka, ale prawo do zasiłku i ochrona zatrudnienia nadal mają znaczenie. Jeżeli masz wątpliwości, poproś ZUS o pisemne wyjaśnienie Twojej sytuacji.",
      },
      {
        kind: "heading",
        text: "Zgłoszenie w urzędzie stanu cywilnego",
      },
      {
        kind: "paragraph",
        text: "Urodzenie martwego dziecka zgłasza się w ciągu 3 dni od wystawienia karty martwego urodzenia. Kartę wystawia lekarz lub położna i przekazuje do USC w ciągu 1 dnia, jeżeli płeć dziecka została ustalona. Wtedy powstaje akt urodzenia z adnotacją, że dziecko urodziło się martwe; nie sporządza się aktu zgonu. Jeżeli płeć nie została ustalona, karta nie trafia do USC — lekarz może wystawić kartę zgonu na wniosek osoby uprawnionej do pochówku.",
      },
      {
        kind: "callout",
        tone: "info",
        title: "Dokumenty i wsparcie",
        text: "USC wydaje odpis skrócony aktu urodzenia. ZUS może potrzebować odpisu z adnotacją o martwym urodzeniu. Wsparcie psychologiczne oferują szpitale, organizacje rodziców po stracie i poradnie. Nie musisz załatwiać wszystkiego w jeden dzień — poproś bliską osobę o pomoc w formalnościach.",
      },
      {
        kind: "heading",
        text: "Śmierć starszego dziecka",
      },
      {
        kind: "paragraph",
        text: "Jeżeli dziecko zmarło po 8. tygodniu życia, urlop macierzyński przysługuje jeszcze przez 7 dni od zgonu. Rodzic może skorzystać z urlopu wychowawczego lub innych uprawnień zależnie od sytuacji. Zasiłek pogrzebowy i inne świadczenia mają odrębne zasady — zapytaj w ZUS lub na stronie gov.pl. Nie musisz znać wszystkich przepisów od razu; ważne, aby nie zostać bez wsparcia.",
      },
    ],
    practicalTips: [
      "Poproś szpital o komplet dokumentów i wyjaśnienie, co zostanie przekazane do USC.",
      "Zgłoś urodzenie w ciągu 3 dni — możesz poprosić bliską osobę o pomoc.",
      "Skontaktuj się z ZUS, gdy będziesz gotowa — masz 6 miesięcy na złożenie wniosku o zasiłek.",
    ],
    keywords: ["martwe urodzenie", "śmierć dziecka", "8 tygodni", "akt urodzenia", "wsparcie"],
    sources: [
      { sourceSlug: "kodeks-pracy", locator: "art. 180¹", isPrimary: true },
      { sourceSlug: "gov-urodzenie", isPrimary: true },
      { sourceSlug: "ustawa-zasilkowa" },
    ],
    legalReferences: [
      { citation: "KP art. 180¹", locator: "urlop po stracie" },
      { citation: "U art. 29", locator: "zasiłek macierzyński" },
    ],
  },
  {
    slug: ARTICLE_SLUGS.contractEnd,
    categorySlug: CATEGORY_SLUGS.special,
    title: "Koniec umowy w ciąży lub na urlopie",
    summary:
      "Kiedy umowa jest chroniona, co dzieje się po jej zakończeniu i jak nie stracić prawa do zasiłku macierzyńskiego.",
    readingMinutes: 6,
    popularity: 73,
    lastReviewedAt: REVIEW_DATE,
    publishedAt: "2026-11-12",
    keyPoints: [
      {
        label: "Ochrona",
        value:
          "W ciąży pracodawca co do zasady nie może wypowiedzieć umowy. Umowa na czas określony przedłuża się do dnia porodu.",
      },
      {
        label: "Po zakończeniu",
        value:
          "Zasiłek macierzyński wymaga ubezpieczenia w dniu porodu. Zasiłek chorobowy może być wypłacany do 91 dni.",
      },
      {
        label: "Działanie",
        value:
          "Sprawdź datę rozwiązania umowy, zgłoszenie do ZUS i możliwość dobrowolnego ubezpieczenia.",
      },
    ],
    blocks: [
      {
        kind: "heading",
        text: "Ochrona przed zwolnieniem",
      },
      {
        kind: "paragraph",
        text: "Pracodawca co do zasady nie może wypowiedzieć ani rozwiązać umowy z pracownicą w ciąży. Umowa na czas określony, która miałaby się rozwiązać po upływie 3. miesiąca ciąży, przedłuża się do dnia porodu. Są wyjątki, np. rozwiązanie bez wypowiedzenia z winy pracownicy za zgodą organizacji związkowej. Jeżeli otrzymasz wypowiedzenie, nie podpisuj pochopnie żadnych dokumentów — skonsultuj się z prawnikiem lub PIP.",
      },
      {
        kind: "callout",
        tone: "warning",
        title: "Porozumienie stron",
        text: "Porozumienie o rozwiązaniu umowy jest dobrowolne. Ochrona przed wypowiedzeniem nie działa tu automatycznie. Jeżeli pracodawca proponuje porozumienie, masz prawo się zastanowić i skonsultować treść.",
      },
      {
        kind: "heading",
        text: "Umowa kończy się w trakcie urlopu",
      },
      {
        kind: "paragraph",
        text: "Jeżeli umowa o pracę kończy się w trakcie urlopu macierzyńskiego lub rodzicielskiego, prawo do zasiłku co do zasady nie znika — zasiłek macierzyński może być wypłacany za okres, za który powstało prawo. Sytuacja zależy jednak od tytułu ubezpieczenia i dokumentów. Zgłoś się do ZUS, aby potwierdzić, kto będzie wypłacał zasiłek po zakończeniu umowy.",
      },
      {
        kind: "heading",
        text: "Umowa kończy się przed porodem",
      },
      {
        kind: "paragraph",
        text: "To najtrudniejsza sytuacja. Zasiłek macierzyński wymaga ubezpieczenia chorobowego w dniu porodu. Jeżeli umowa skończyła się wcześniej i nie masz innego tytułu, zasiłek co do zasady nie przysługuje. Możesz sprawdzić, czy możesz kontynuować dobrowolne ubezpieczenie chorobowe — terminy i warunki zależą od sytuacji. Zasiłek chorobowy po ustaniu ubezpieczenia może być wypłacany do 91 dni, ale ciąża jest objęta wyjątkiem od tego limitu.",
      },
      {
        kind: "heading",
        text: "Co zrobić w pierwszej kolejności",
      },
      {
        kind: "list",
        ordered: true,
        items: [
          "Sprawdź dokładną datę rozwiązania umowy i datę porodu.",
          "Zapytaj pracodawcę, do kiedy będzie opłacał składki i czy zgłosił zmianę do ZUS.",
          "Skontaktuj się z ZUS w sprawie dobrowolnego ubezpieczenia lub zasiłku po ustaniu umowy.",
          "Zabezpiecz dokumenty: umowę, świadectwo pracy, zaświadczenie o dochodach, e-ZLA.",
        ],
      },
    ],
    practicalTips: [
      "Nie zakładaj, że „umowa sama się przedłuży” — sprawdź daty na piśmie.",
      "Poproś ZUS o potwierdzenie okresu ubezpieczenia przed porodem.",
      "Skonsultuj wypowiedzenie z prawnikiem, zanim upłynie termin odwołania.",
    ],
    keywords: ["koniec umowy", "ciąża", "zwolnienie", "zasiłek macierzyński", "91 dni"],
    sources: [
      { sourceSlug: "kodeks-pracy", locator: "art. 177", isPrimary: true },
      { sourceSlug: "ustawa-zasilkowa", locator: "art. 8, 29", isPrimary: true },
      { sourceSlug: "zus-macierzynski-dokumenty" },
    ],
    legalReferences: [
      { citation: "KP art. 177", locator: "ochrona przed rozwiązaniem" },
      { citation: "U art. 8", locator: "zasiłek po ustaniu ubezpieczenia" },
      { citation: "U art. 29", locator: "ubezpieczenie w dniu porodu" },
    ],
  },
  {
    slug: ARTICLE_SLUGS.multipleTitles,
    categorySlug: CATEGORY_SLUGS.special,
    title: "Kilka tytułów ubezpieczenia i niepełna historia",
    summary:
      "Praca i zlecenie, działalność i etat, krótkie okresy składkowe. Jak sprawdzić, który tytuł daje zasiłek i co zrobić z lukami.",
    readingMinutes: 6,
    popularity: 58,
    lastReviewedAt: REVIEW_DATE,
    publishedAt: "2026-11-19",
    keyPoints: [
      {
        label: "Zbieg tytułów",
        value:
          "Przy kilku tytułach ubezpieczenie chorobowe jest zwykle obowiązkowe z jednego, a z pozostałych dobrowolne.",
      },
      {
        label: "Podstawa",
        value:
          "Zasiłek ustala się z jednego tytułu, co do zasady korzystniejszego, ale zasady są szczegółowe.",
      },
      {
        label: "Historia",
        value:
          "Krótkie okresy i luki nie muszą przekreślać prawa, ale trzeba je udokumentować.",
      },
    ],
    blocks: [
      {
        kind: "heading",
        text: "Jak działa zbieg tytułów",
      },
      {
        kind: "paragraph",
        text: "Jeżeli jednocześnie pracujesz na etacie i wykonujesz zlecenie, ubezpieczenie chorobowe z etatu jest obowiązkowe. Ze zlecenia może być dobrowolne. Przy działalności gospodarczej i etacie sytuacja również zależy od pierwszeństwa tytułów. Nie można po prostu „wybrać sobie” najkorzystniejszego tytułu — decydują przepisy o podleganiu ubezpieczeniom.",
      },
      {
        kind: "paragraph",
        text: "Zasiłek jest ustalany z tytułu, który daje do niego prawo. Jeżeli masz kilka tytułów, ZUS może ustalić podstawę z jednego z nich. Przy skomplikowanym układzie warto poprosić o pisemną interpretację lub spotkanie z doradcą w ZUS.",
      },
      {
        kind: "heading",
        text: "Niepełna historia ubezpieczenia",
      },
      {
        kind: "paragraph",
        text: "Krótki okres ubezpieczenia nie zawsze oznacza brak prawa. Przy zasiłku chorobowym liczy się 30 dni obowiązkowego lub 90 dni dobrowolnego ubezpieczenia. Przy macierzyńskim nie ma okresu wyczekiwania, ale musi być tytuł w dniu porodu. Jeżeli pracowałaś krótko, sprawdź, czy wcześniejsze okresy się sumują i czy nie ma luki.",
      },
      {
        kind: "callout",
        tone: "info",
        title: "Gdzie sprawdzić historię",
        text: "Na PUE/eZUS znajdziesz informacje o okresach ubezpieczenia i składkach. Jeżeli widzisz braki, zgłoś to płatnikowi lub ZUS. Dokumenty, takie jak świadectwo pracy i zaświadczenia o dochodach, pomagają wyjaśnić rozbieżności.",
      },
      {
        kind: "heading",
        text: "Co przygotować do ZUS",
      },
      {
        kind: "list",
        items: [
          "Wszystkie umowy i świadectwa pracy.",
          "Zaświadczenia o dochodach i opłaconych składkach.",
          "Potwierdzenia zgłoszenia do dobrowolnego ubezpieczenia.",
          "Dokumenty o przerwach, urlopach bezpłatnych i działalności.",
          "Wniosek ZAM lub inny właściwy formularz.",
        ],
      },
    ],
    practicalTips: [
      "Zrób zrzut ekranu historii ubezpieczenia z PUE/eZUS.",
      "Poproś księgowość o zestawienie podstawy wymiaru składek.",
      "Nie ukrywaj przerw — lepiej wyjaśnić je wcześniej niż dostać decyzję odmowną.",
    ],
    keywords: ["kilka tytułów", "zbieg", "zlecenie", "działalność", "historia ubezpieczenia"],
    sources: [
      { sourceSlug: "ustawa-zasilkowa", locator: "art. 4, 29" },
      { sourceSlug: "zus-poradnik-rodzice" },
      { sourceSlug: "zus-macierzynski" },
    ],
    legalReferences: [
      { citation: "U art. 4", locator: "okres wyczekiwania" },
      { citation: "U art. 29", locator: "prawo do zasiłku" },
    ],
  },
  {
    slug: ARTICLE_SLUGS.hospitalisation,
    categorySlug: CATEGORY_SLUGS.special,
    title: "Hospitalizacja dziecka lub matki",
    summary:
      "Co przysługuje, gdy dziecko jest w szpitalu, a co gdy matka nie może sprawować opieki. Zasiłek opiekuńczy, uzupełniający urlop i organizacja opieki.",
    readingMinutes: 6,
    popularity: 63,
    lastReviewedAt: REVIEW_DATE,
    publishedAt: "2026-11-19",
    keyPoints: [
      {
        label: "Dziecko w szpitalu",
        value:
          "Może przysługiwać zasiłek opiekuńczy lub uzupełniający urlop macierzyński — zależnie od sytuacji.",
      },
      {
        label: "Matka w szpitalu",
        value:
          "Ojciec lub inny ubezpieczony członek rodziny może dostać zasiłek opiekuńczy do 8 tygodni, poza limitem 60 dni.",
      },
      {
        label: "Dokumenty",
        value:
          "Potrzebne jest e-ZLA lub zaświadczenie o hospitalizacji oraz wniosek Z-15 albo wniosek o urlop.",
      },
    ],
    blocks: [
      {
        kind: "heading",
        text: "Dziecko wymaga hospitalizacji po urodzeniu",
      },
      {
        kind: "paragraph",
        text: "Jeżeli dziecko po urodzeniu wymaga hospitalizacji, rodzic może ubiegać się o uzupełniający urlop macierzyński w wymiarze do 8 tygodni. To uprawnienie z Kodeksu pracy, powiązane z urlopem macierzyńskim. Trzeba złożyć wniosek i spełnić warunki. Nie jest to automatyczne przedłużenie urlopu — sprawdź dokumenty i termin u pracodawcy.",
      },
      {
        kind: "heading",
        text: "Chore dziecko w szpitalu",
      },
      {
        kind: "paragraph",
        text: "Gdy dziecko jest chore i wymaga opieki, rodzic objęty ubezpieczeniem chorobowym może skorzystać z zasiłku opiekuńczego. Limit zależy od wieku dziecka: do 14 lat — 60 dni w roku, dziecko z niepełnosprawnością 14–18 lat — 30 dni, inne przypadki — 14 dni. Łączny limit to 60 dni. Zasiłek wynosi 80% podstawy i przysługuje od pierwszego dnia ubezpieczenia.",
      },
      {
        kind: "callout",
        tone: "info",
        title: "Matka w szpitalu",
        text: "Jeżeli matka po porodzie wymaga opieki szpitalnej i nie może sprawować opieki nad dzieckiem, ubezpieczonemu ojcu lub innemu ubezpieczonemu członkowi rodziny przysługuje zasiłek opiekuńczy do 8 tygodni. Okresu tego nie wlicza się do limitu 60 dni.",
      },
      {
        kind: "heading",
        text: "Co przygotować",
      },
      {
        kind: "list",
        items: [
          "e-ZLA na opiekę nad chorym dzieckiem lub członkiem rodziny.",
          "Wniosek Z-15 (od 24 października 2026 r. zastępuje Z-15A i Z-15B; na eZUS od połowy listopada).",
          "Zaświadczenie o hospitalizacji, jeżeli jest wymagane.",
          "Wniosek o uzupełniający urlop macierzyński — u pracodawcy.",
          "Dane drugiego rodzica i informację o wykorzystanych dniach opieki.",
        ],
      },
      {
        kind: "heading",
        text: "Jak zorganizować opiekę",
      },
      {
        kind: "paragraph",
        text: "Rodzice mogą podzielić się opieką, ale zasiłek za ten sam okres otrzymuje tylko jedna osoba. Warto ustalić, kto bierze e-ZLA i kto składa wniosek, aby nie zdublować dokumentów. Przy dłuższym pobycie w szpitalu zapytaj pracodawcę o urlop wypoczynkowy, urlop bezpłatny lub inne formy wsparcia. Pamiętaj też o prawie do informacji i wsparcia psychologicznego.",
      },
    ],
    practicalTips: [
      "Poproś szpital o zaświadczenie o hospitalizacji od razu przy przyjęciu.",
      "Ustal z drugim rodzicem, kto bierze e-ZLA — nie da się dostać dwóch zasiłków za ten sam okres.",
      "Sprawdź, czy przysługuje uzupełniający urlop macierzyński, a nie tylko zasiłek opiekuńczy.",
    ],
    keywords: ["hospitalizacja", "szpital", "zasiłek opiekuńczy", "uzupełniający urlop", "matka"],
    sources: [
      { sourceSlug: "zus-opiekunczy", isPrimary: true },
      { sourceSlug: "kodeks-pracy", locator: "art. 180²" },
      { sourceSlug: "zus-opiekunczy-prawo" },
    ],
    legalReferences: [
      { citation: "U art. 33", locator: "limity zasiłku opiekuńczego" },
      { citation: "KP art. 180¹", locator: "urlop po porodzie" },
    ],
  },
]
