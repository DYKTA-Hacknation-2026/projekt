import { ARTICLE_SLUGS, CATEGORY_SLUGS, GUIDE_SLUGS } from "./slugs"
import { REVIEW_DATE } from "./meta"

export interface FaqSeed {
  slug: string
  categorySlug: string
  question: string
  shortAnswer: string
  explanation: string
  conditions?: string
  whatToDo?: string
  isImportant?: boolean
  popularity?: number
  articleSlug?: string
  guideSlug?: string
  calculatorHref?: string
  lastReviewedAt: string
}

export const CONTENT_FAQ: FaqSeed[] = [
  {
    slug: "ile-wynosi-zasilek-macierzynski",
    categorySlug: CATEGORY_SLUGS.benefits,
    question: "Ile wynosi zasiłek macierzyński?",
    shortAnswer:
      "Za urlop macierzyński 100% podstawy wymiaru, za rodzicielski 70%, a w wariancie z wnioskiem w 21 dni — 81,5% za całość.",
    explanation:
      "Zasiłek nie jest stałą kwotą. Zależy od podstawy wymiaru, czyli przeciętnego wynagrodzenia lub przychodu z okresu odniesienia, po potrąceniu 13,71%. Do tego dochodzi wybór wariantu: standardowo 100% za macierzyński i 70% za rodzicielski albo 81,5% za oba okresy, jeżeli wniosek zostanie złożony w ciągu 21 dni po porodzie. 9 tygodni drugiego rodzica zawsze wynosi 70%.",
    conditions:
      "Wariant 81,5% nie obejmuje 9 tygodni zarezerwowanych dla drugiego rodzica. Jeżeli zasiłek jest niższy od świadczenia rodzicielskiego, kwotę podwyższa się do jego wysokości — kwota tego świadczenia nie jest jeszcze zatwierdzona w tej wersji demo (Q-29).",
    whatToDo:
      "Porównaj oba warianty w kalkulatorze. Sprawdź podstawę wymiaru w zaświadczeniu Z-3 lub Z-3a. Ostateczną kwotę ustala ZUS lub płatnik.",
    isImportant: true,
    popularity: 100,
    articleSlug: ARTICLE_SLUGS.maternityBenefit,
    calculatorHref: "/kalkulator",
    lastReviewedAt: REVIEW_DATE,
  },
  {
    slug: "czy-moge-otrzymac-swiadczenie-po-zakonczeniu-umowy",
    categorySlug: CATEGORY_SLUGS.special,
    question: "Czy mogę otrzymać świadczenie po zakończeniu umowy?",
    shortAnswer:
      "Zasiłek chorobowy — tak, do 91 dni w pewnych sytuacjach. Zasiłek macierzyński — tylko jeśli w dniu porodu masz tytuł ubezpieczenia chorobowego.",
    explanation:
      "Po ustaniu umowy zasiłek chorobowy może być wypłacany za okres do 91 dni, jeżeli niezdolność powstała wcześniej i spełniasz warunki. Inaczej jest z zasiłkiem macierzyńskim: prawo powstaje w dniu porodu i wymaga ubezpieczenia chorobowego właśnie w tym dniu. Wcześniejsze lata pracy nie zastąpią brakującego tytułu.",
    conditions:
      "Ciąża jest objęta wyjątkiem od 91-dniowego limitu przy zasiłku chorobowym. Możliwość dobrowolnego ubezpieczenia po zakończeniu umowy zależy od sytuacji i terminów — potwierdź w ZUS.",
    whatToDo:
      "Sprawdź datę rozwiązania umowy i datę porodu. Skontaktuj się z ZUS przed porodem. Zabezpiecz świadectwo pracy, zaświadczenie o dochodach i e-ZLA.",
    isImportant: true,
    popularity: 91,
    articleSlug: ARTICLE_SLUGS.contractEnd,
    guideSlug: GUIDE_SLUGS.afterContractEnds,
    lastReviewedAt: REVIEW_DATE,
  },
  {
    slug: "jak-zglosic-urodzenie-dziecka",
    categorySlug: CATEGORY_SLUGS.documents,
    question: "Jak zgłosić urodzenie dziecka?",
    shortAnswer:
      "W ciągu 21 dni od wystawienia karty urodzenia — w urzędzie stanu cywilnego, online przez gov.pl lub w mObywatelu.",
    explanation:
      "Kartę urodzenia wystawia lekarz lub położna i przekazuje do USC najpóźniej 3 dni od wystawienia. Rodzic zgłasza urodzenie i wybiera imię. Kierownik USC sporządza akt urodzenia, nadaje PESEL i wydaje jeden bezpłatny odpis skrócony. Jeżeli termin 21 dni minie, USC zrobi to z urzędu i samo wybierze imię.",
    conditions:
      "Przy urodzeniu martwego dziecka termin wynosi 3 dni od wystawienia karty martwego urodzenia.",
    whatToDo:
      "Zaloguj się przez profil zaufany lub e-dowód na gov.pl, wypełnij zgłoszenie albo umów wizytę w USC. Zabierz dokument tożsamości.",
    popularity: 86,
    articleSlug: ARTICLE_SLUGS.documentsAfterBirth,
    guideSlug: GUIDE_SLUGS.documentsAfterBirth,
    lastReviewedAt: REVIEW_DATE,
  },
  {
    slug: "czym-jest-podstawa-wymiaru-skladek",
    categorySlug: CATEGORY_SLUGS.glossary,
    question: "Czym jest podstawa wymiaru składek?",
    shortAnswer:
      "To kwota, od której płatnik oblicza składki na ubezpieczenia społeczne, w tym chorobowe.",
    explanation:
      "Przy umowie o pracę podstawą jest wynagrodzenie za pracę i inne składniki wskazane w przepisach. Przy zleceniu — przychód. Przy działalności — zadeklarowana kwota, nie niższa niż ustawowe minimum. Podstawa składek nie jest tym samym co podstawa wymiaru zasiłku, choć są powiązane.",
    conditions:
      "Nie każdy składnik wynagrodzenia wchodzi do podstawy. Premie i dodatki mają różne zasady.",
    whatToDo:
      "Sprawdź dokumenty rozliczeniowe lub poproś kadry o wyjaśnienie, od jakiej podstawy opłacana jest składka chorobowa.",
    popularity: 64,
    articleSlug: ARTICLE_SLUGS.amountAndBasis,
    lastReviewedAt: REVIEW_DATE,
  },
  {
    slug: "jakie-dokumenty-musze-zlozyc-do-zus",
    categorySlug: CATEGORY_SLUGS.documents,
    question: "Jakie dokumenty muszę złożyć do ZUS?",
    shortAnswer:
      "Najczęściej e-ZLA, wniosek (ZAM, ZAS-53 lub Z-15) oraz Z-3 albo Z-3a. Po ustaniu ubezpieczenia dochodzi Z-10.",
    explanation:
      "Zakres zależy od świadczenia i tego, kto wypłaca zasiłek. Przy zasiłku macierzyńskim potrzebne są dane dziecka i drugiego rodzica, a gdy wypłaca ZUS — wniosek ZAM. Gdy wypłaca płatnik, wniosek składa się u pracodawcy, a do ZUS trafia zaświadczenie Z-3/Z-3a. Przy chorobowym podstawą jest e-ZLA; przedsiębiorcy składają ZAS-53, a przy kontynuacji — ZAS-12.",
    conditions:
      "Od 24 października 2026 r. Z-3b nie jest już wymagany. ZAM zastąpił ZUR i ZAO. Z-15 zastępuje Z-15A i Z-15B (na eZUS od połowy listopada 2026 r.).",
    whatToDo:
      "Sprawdź aktualny wzór na zus.pl i skorzystaj z listy dokumentów w przewodniku. Nie kopiuj starych formularzy z internetu.",
    isImportant: true,
    popularity: 95,
    articleSlug: ARTICLE_SLUGS.entitlementConditions,
    guideSlug: GUIDE_SLUGS.maternityApplication,
    lastReviewedAt: REVIEW_DATE,
  },
  {
    slug: "czy-zlecenie-daje-macierzynski",
    categorySlug: CATEGORY_SLUGS.insurance,
    question: "Czy umowa zlecenie daje prawo do zasiłku macierzyńskiego?",
    shortAnswer:
      "Tak, jeżeli zleceniobiorca przystąpił do dobrowolnego ubezpieczenia chorobowego i opłaca składkę.",
    explanation:
      "Sama umowa zlecenie nie uruchamia ubezpieczenia chorobowego. Potrzebne jest zgłoszenie i opłacanie składki. Po 90 dniach ubezpieczenia powstaje prawo do zasiłku chorobowego, a przy porodzie — do zasiłku macierzyńskiego, jeżeli ubezpieczenie trwa w dniu porodu.",
    conditions:
      "Jeżeli umowa kończy się przed porodem i nie ma innego tytułu, zasiłek macierzyński może nie przysługiwać. Przy kilku tytułach obowiązują zasady pierwszeństwa.",
    whatToDo:
      "Sprawdź w PUE/eZUS, czy jesteś zgłoszona do ubezpieczenia chorobowego. Poproś zleceniodawcę o potwierdzenie opłacania składki.",
    popularity: 78,
    articleSlug: ARTICLE_SLUGS.mandateAndBusiness,
    lastReviewedAt: REVIEW_DATE,
  },
  {
    slug: "czy-dzialalnosc-gospodarcza-daje-macierzynski",
    categorySlug: CATEGORY_SLUGS.insurance,
    question: "Czy działalność gospodarcza daje prawo do zasiłku macierzyńskiego?",
    shortAnswer:
      "Tak, jeżeli przedsiębiorca opłaca dobrowolną składkę chorobową i w dniu porodu podlega ubezpieczeniu.",
    explanation:
      "Składka chorobowa przy działalności jest dobrowolna. Po 90 dniach nieprzerwanego ubezpieczenia powstaje prawo do zasiłku chorobowego, a przy porodzie — do macierzyńskiego. ZUS zawsze wypłaca zasiłek przedsiębiorcy. Od 24 października 2026 r. nie składa się już Z-3b — wystarczy ZAM i pozostałe dokumenty.",
    conditions:
      "Zaległości w składkach mogą pozbawić prawa do zasiłku. Stan zadłużenia jest ustalany na dzień powstania prawa.",
    whatToDo:
      "Sprawdź konto w ZUS, ureguluj zaległości i złóż ZAM przez PUE/eZUS. Skonsultuj z księgową wysokość podstawy składki.",
    popularity: 71,
    articleSlug: ARTICLE_SLUGS.mandateAndBusiness,
    lastReviewedAt: REVIEW_DATE,
  },
  {
    slug: "czy-trzeba-czekac-30-dni-na-macierzynski",
    categorySlug: CATEGORY_SLUGS.benefits,
    question: "Czy trzeba czekać 30 dni na zasiłek macierzyński?",
    shortAnswer: "Nie. Zasiłek macierzyński nie ma okresu wyczekiwania.",
    explanation:
      "Okres wyczekiwania 30 dni (obowiązkowe) lub 90 dni (dobrowolne) dotyczy zasiłku chorobowego. Zasiłek macierzyński i opiekuńczy przysługują od pierwszego dnia, jeżeli spełniasz pozostałe warunki. Najważniejsze to mieć ubezpieczenie chorobowe w dniu porodu lub przyjęcia dziecka.",
    conditions:
      "Przy dobrowolnym ubezpieczeniu nadal trzeba mieć aktywny tytuł i opłaconą składkę.",
    whatToDo:
      "Sprawdź, czy w dniu porodu jesteś zgłoszona do ubezpieczenia chorobowego. Nie odkładaj wniosku z powodu „wyczekiwania”.",
    popularity: 83,
    articleSlug: ARTICLE_SLUGS.entitlementConditions,
    lastReviewedAt: REVIEW_DATE,
  },
  {
    slug: "czy-tata-moze-przejac-caly-urlop",
    categorySlug: CATEGORY_SLUGS.leaves,
    question: "Czy tata może przejąć cały urlop macierzyński?",
    shortAnswer:
      "Nie. Pierwsze 14 tygodni po porodzie jest zarezerwowane dla matki. Po tym okresie ojciec może przejąć pozostałą część.",
    explanation:
      "Matka musi wykorzystać co najmniej 14 tygodni urlopu macierzyńskiego po porodzie. Potem może zrezygnować z reszty, jeżeli ojciec przejmie pozostałą część lub osobistą opiekę. Wyjątkowo rezygnacja jest możliwa po 8 tygodniach — gdy matka ma orzeczenie o niezdolności do samodzielnej egzystencji albo przebywa w szpitalu.",
    conditions:
      "Ojciec składa wniosek o urlop co najmniej 14 dni przed rozpoczęciem. Matka składa rezygnację najpóźniej 7 dni przed powrotem do pracy.",
    whatToDo:
      "Zaplanuj daty z pracodawcą. Przygotuj oba wnioski: rezygnację matki i wniosek ojca.",
    popularity: 80,
    articleSlug: ARTICLE_SLUGS.maternityLeave,
    lastReviewedAt: REVIEW_DATE,
  },
  {
    slug: "ile-trwa-urlop-ojcowski",
    categorySlug: CATEGORY_SLUGS.leaves,
    question: "Ile trwa urlop ojcowski i do kiedy można go wziąć?",
    shortAnswer:
      "Do 2 tygodni, do ukończenia przez dziecko 12. miesiąca życia. Przy adopcji — do 12 miesięcy od uprawomocnienia przysposobienia, nie dłużej niż do 14. roku życia dziecka.",
    explanation:
      "Urlop można wykorzystać jednorazowo albo w dwóch częściach, każda co najmniej tydzień. Wniosek składa się najpóźniej 7 dni przed rozpoczęciem urlopu. Za ten okres przysługuje zasiłek macierzyński w wysokości 100% podstawy.",
    conditions:
      "Urlop ojcowski to odrębne uprawnienie od 9 tygodni urlopu rodzicielskiego. Można skorzystać z obu, jeżeli spełniasz warunki.",
    whatToDo:
      "Złóż wniosek u pracodawcy co najmniej 7 dni wcześniej. Sprawdź, czy zasiłek jest naliczany od właściwej podstawy.",
    popularity: 66,
    articleSlug: ARTICLE_SLUGS.paternityLeave,
    lastReviewedAt: REVIEW_DATE,
  },
  {
    slug: "czy-mozna-laczyc-urlop-rodzicielski-z-praca",
    categorySlug: CATEGORY_SLUGS.leaves,
    question: "Czy można łączyć urlop rodzicielski z pracą?",
    shortAnswer:
      "Tak, u tego samego pracodawcy, w wymiarze do połowy etatu. Urlop wtedy proporcjonalnie się wydłuża.",
    explanation:
      "Pracę podejmuje się na wniosek złożony co najmniej 21 dni wcześniej. Urlopu udziela się na pozostałą część etatu, a wymiar wydłuża się maksymalnie do 82 tygodni przy jednym dziecku i 86 tygodni przy ciąży mnogiej. Zasiłek macierzyński zmniejsza się proporcjonalnie do wymiaru pracy. Pracodawca może odmówić, jeżeli nie pozwala na to organizacja lub rodzaj pracy, i musi podać przyczynę w ciągu 7 dni.",
    conditions:
      "To dotyczy urlopu rodzicielskiego, nie macierzyńskiego. Przy „Za życiem” limity wydłużenia są wyższe.",
    whatToDo:
      "Poproś kadry o pisemne wyliczenie wydłużenia i wysokości zasiłku przed złożeniem wniosku.",
    popularity: 75,
    articleSlug: ARTICLE_SLUGS.parentalLeave,
    guideSlug: GUIDE_SLUGS.splitParentalLeave,
    lastReviewedAt: REVIEW_DATE,
  },
  {
    slug: "co-zrobic-gdy-urodzi-sie-wczesniak",
    categorySlug: CATEGORY_SLUGS.special,
    question: "Co zrobić, gdy urodzi się wcześniak?",
    shortAnswer:
      "Urlop macierzyński liczy się od porodu i nie jest krótszy. Jeżeli dziecko wymaga hospitalizacji, może przysługiwać uzupełniający urlop macierzyński do 8 tygodni.",
    explanation:
      "Przedwczesny poród nie zmienia wymiaru urlopu macierzyńskiego. Jeżeli przed porodem wykorzystałaś mniej niż 6 tygodni, pozostała część nie przepada. Dziecko może wymagać dłuższego pobytu w szpitalu — wtedy warto zapytać o uzupełniający urlop macierzyński i zasiłek opiekuńczy.",
    conditions:
      "Uzupełniający urlop wymaga wniosku i spełnienia warunków z Kodeksu pracy. Zasiłek opiekuńczy ma odrębne limity dni.",
    whatToDo:
      "Poproś szpital o dokumentację. Skontaktuj się z pracodawcą i ZUS, aby ustalić, które uprawnienie najlepiej wykorzystać.",
    popularity: 69,
    articleSlug: ARTICLE_SLUGS.prematureAndMultiple,
    lastReviewedAt: REVIEW_DATE,
  },
  {
    slug: "czy-ciaza-mnoga-wydluza-urlop",
    categorySlug: CATEGORY_SLUGS.pregnancy,
    question: "Czy ciąża mnoga wydłuża urlop?",
    shortAnswer:
      "Tak. Przy bliźniętach urlop macierzyński wynosi 31 tygodni, przy trojaczkach 33, a przy pięciorgu i więcej — 37 tygodni. Urlop rodzicielski to 43 tygodnie.",
    explanation:
      "Wymiar zależy od liczby dzieci urodzonych przy jednym porodzie. Przy ciąży mnogiej każdy z rodziców nadal ma 9 tygodni niezbywalnych urlopu rodzicielskiego. Z zaświadczeniem „Za życiem” urlop rodzicielski wynosi 67 tygodni.",
    conditions:
      "Liczba tygodni dotyczy porodu mnogiego, a nie kolejnych ciąż.",
    whatToDo:
      "Sprawdź wymiar w tabeli i zaplanuj podział urlopu między rodziców. Kalkulator pokaże skutki finansowe.",
    popularity: 62,
    articleSlug: ARTICLE_SLUGS.prematureAndMultiple,
    calculatorHref: "/kalkulator",
    lastReviewedAt: REVIEW_DATE,
  },
  {
    slug: "co-oznacza-kod-b-na-l4",
    categorySlug: CATEGORY_SLUGS.pregnancy,
    question: "Co oznacza kod B na zwolnieniu lekarskim?",
    shortAnswer:
      "Że niezdolność do pracy przypada na okres ciąży. Dzięki temu zasiłek chorobowy wynosi 100% podstawy, a okres może wynosić do 270 dni.",
    explanation:
      "Kod B wpisuje lekarz na e-ZLA, gdy niezdolność do pracy jest związana z ciążą. Nie wystarczy sama ciąża — potrzebna jest niezdolność do pracy. Jeżeli kod nie został wpisany, zasiłek może zostać obliczony jak standardowy (80%).",
    conditions:
      "Kod B nie dotyczy zwolnienia na badania lekarskie, które jest odrębnym uprawnieniem z Kodeksu pracy.",
    whatToDo:
      "Sprawdź e-ZLA. Jeżeli brakuje kodu B, poproś lekarza o korektę. Zachowaj dokumentację medyczną.",
    popularity: 85,
    articleSlug: ARTICLE_SLUGS.pregnancySickLeave,
    lastReviewedAt: REVIEW_DATE,
  },
  {
    slug: "czy-pracodawca-moze-zwolnic-w-ciazy",
    categorySlug: CATEGORY_SLUGS.pregnancy,
    question: "Czy pracodawca może zwolnić kobietę w ciąży?",
    shortAnswer:
      "Co do zasady nie. Ochrona obejmuje umowę o pracę, w tym umowę na czas określony, która przedłuża się do dnia porodu.",
    explanation:
      "Są wąskie wyjątki, m.in. rozwiązanie bez wypowiedzenia z winy pracownicy za zgodą organizacji związkowej. Porozumienie stron jest dobrowolne i nie jest objęte ochroną w taki sam sposób. Jeżeli otrzymasz wypowiedzenie, skonsultuj je szybko — terminy odwołania są krótkie.",
    conditions:
      "Ochrona nie obejmuje wszystkich form współpracy, np. niektórych umów cywilnoprawnych.",
    whatToDo:
      "Nie podpisuj pochopnie dokumentów. Skontaktuj się z prawnikiem lub PIP i zachowaj kopię wypowiedzenia.",
    popularity: 88,
    articleSlug: ARTICLE_SLUGS.pregnancyRights,
    lastReviewedAt: REVIEW_DATE,
  },
  {
    slug: "co-to-jest-okres-wyczekiwania",
    categorySlug: CATEGORY_SLUGS.glossary,
    question: "Co to jest okres wyczekiwania?",
    shortAnswer:
      "Okres ubezpieczenia, po którym powstaje prawo do zasiłku chorobowego: 30 dni obowiązkowego albo 90 dni dobrowolnego.",
    explanation:
      "Okres wyczekiwania nie dotyczy zasiłku macierzyńskiego ani opiekuńczego. Przy zasiłku chorobowym liczy się faktyczne podleganie ubezpieczeniu chorobowemu. Przerwy i zmiana tytułu mogą wpłynąć na jego doliczenie.",
    conditions:
      "Są wyjątki, np. niezdolność z wypadku przy pracy. Przy dobrowolnym ubezpieczeniu liczy się opłacanie składki.",
    whatToDo:
      "Sprawdź historię ubezpieczenia w PUE/eZUS. Przy krótkim okresie pracy zapytaj ZUS, czy wcześniejsze okresy się liczą.",
    popularity: 57,
    articleSlug: ARTICLE_SLUGS.entitlementConditions,
    lastReviewedAt: REVIEW_DATE,
  },
  {
    slug: "co-to-jest-tytul-ubezpieczenia",
    categorySlug: CATEGORY_SLUGS.glossary,
    question: "Co to jest tytuł ubezpieczenia?",
    shortAnswer:
      "Podstawa objęcia ubezpieczeniem, np. umowa o pracę, zlecenie, działalność gospodarcza.",
    explanation:
      "Tytuł decyduje o tym, czy ubezpieczenie chorobowe jest obowiązkowe czy dobrowolne, kto jest płatnikiem i jaka jest podstawa składek. W dniu porodu musisz mieć tytuł do ubezpieczenia chorobowego, aby otrzymać zasiłek macierzyński.",
    conditions:
      "Przy kilku tytułach obowiązują zasady pierwszeństwa. Nie każdy tytuł daje ubezpieczenie chorobowe.",
    whatToDo:
      "Sprawdź, jaki tytuł jest aktywny w dniu zdarzenia. Pomoże w tym historia na PUE/eZUS.",
    popularity: 54,
    articleSlug: ARTICLE_SLUGS.sicknessInsurance,
    lastReviewedAt: REVIEW_DATE,
  },
  {
    slug: "czy-dostane-zasilek-jesli-pracowalam-krotko",
    categorySlug: CATEGORY_SLUGS.benefits,
    question: "Czy dostanę zasiłek, jeśli pracowałam krótko?",
    shortAnswer:
      "Przy zasiłku macierzyńskim liczy się ubezpieczenie w dniu porodu, nie długość pracy. Przy chorobowym potrzebne jest 30 lub 90 dni ubezpieczenia.",
    explanation:
      "Krótki okres pracy nie przekreśla zasiłku macierzyńskiego, jeżeli w dniu porodu jesteś objęta ubezpieczeniem chorobowym. Podstawa wymiaru może być jednak niska, jeżeli ubezpieczenie trwało krótko. Przy zasiłku chorobowym musisz spełnić okres wyczekiwania, chyba że zachodzi wyjątek.",
    conditions:
      "Przy działalności i zleceniu liczy się faktyczne opłacanie składki, a nie sama umowa.",
    whatToDo:
      "Sprawdź datę rozpoczęcia ubezpieczenia i zaplanuj poród w okresie jego trwania. Poproś kadry o symulację podstawy.",
    popularity: 72,
    articleSlug: ARTICLE_SLUGS.entitlementConditions,
    calculatorHref: "/kalkulator",
    lastReviewedAt: REVIEW_DATE,
  },
  {
    slug: "jakie-dokumenty-przy-adopcji",
    categorySlug: CATEGORY_SLUGS.adoption,
    question: "Jakie dokumenty są potrzebne przy adopcji?",
    shortAnswer:
      "Zaświadczenie sądu o dacie wystąpienia o przysposobienie, odpis aktu urodzenia, dokumenty o wieku dziecka i wniosek ZAM.",
    explanation:
      "Przy rodzinie zastępczej potrzebne jest orzeczenie sądu o umieszczeniu dziecka w rodzinie zastępczej albo umowa z starostą. Przy odroczeniu obowiązku szkolnego dochodzi decyzja o odroczeniu. ZUS może poprosić o dodatkowe dokumenty, jeżeli dane nie są w rejestrach.",
    conditions:
      "Zakres zależy od tego, czy chodzi o przysposobienie, rodzinę zastępczą, czy rodzinę zastępczą zawodową (ta jest wyłączona z zasiłku macierzyńskiego).",
    whatToDo:
      "Poproś sąd o zaświadczenie o dacie wystąpienia z wnioskiem. Skorzystaj z przewodnika adopcyjnego i listy dokumentów.",
    popularity: 48,
    articleSlug: ARTICLE_SLUGS.adoption,
    guideSlug: GUIDE_SLUGS.adoptionStepByStep,
    lastReviewedAt: REVIEW_DATE,
  },
  {
    slug: "kiedy-przedawnia-sie-roszczenie-o-zasilek",
    categorySlug: CATEGORY_SLUGS.benefits,
    question: "Kiedy przedawnia się roszczenie o wypłatę zasiłku?",
    shortAnswer:
      "Po 6 miesiącach od ostatniego dnia okresu, za który zasiłek przysługuje. W razie błędu płatnika lub ZUS — po 3 latach.",
    explanation:
      "Jeżeli nie złożyłeś wniosku z przyczyn niezależnych, termin liczy się od dnia ustania przeszkody. Przedawnienie dotyczy zasiłku chorobowego, wyrównawczego, macierzyńskiego i opiekuńczego.",
    conditions:
      "Nie myl terminu przedawnienia z terminem na odwołanie od decyzji ZUS — ten jest znacznie krótszy.",
    whatToDo:
      "Złóż wniosek jak najszybciej, nawet jeśli brakuje dokumentów. Poproś o potwierdzenie daty złożenia.",
    popularity: 59,
    articleSlug: ARTICLE_SLUGS.entitlementConditions,
    lastReviewedAt: REVIEW_DATE,
  },
  {
    slug: "czy-zasilek-opiekunczy-na-chore-dziecko",
    categorySlug: CATEGORY_SLUGS.benefits,
    question: "Czy zasiłek opiekuńczy przysługuje na chore dziecko?",
    shortAnswer:
      "Tak, do 60 dni w roku na dziecko do 14 lat. Zasiłek wynosi 80% podstawy i wymaga wniosku Z-15.",
    explanation:
      "Zasiłek przysługuje, gdy musisz osobiście opiekować się chorym dzieckiem. Limit zależy od wieku i niepełnosprawności. Za ten sam okres zasiłek otrzymuje tylko jedno z rodziców. Zasiłek nie jest wypłacany automatycznie — trzeba złożyć wniosek i mieć e-ZLA.",
    conditions:
      "Limit 60 dni dotyczy łącznie wszystkich dzieci i innych członków rodziny. Wyjątkiem jest opieka nad dzieckiem do 2 lat, gdzie nie sprawdza się innych możliwości opieki.",
    whatToDo:
      "Sprawdź, ile dni wykorzystał drugi rodzic. Złóż Z-15 u pracodawcy i dołącz e-ZLA.",
    popularity: 67,
    articleSlug: ARTICLE_SLUGS.careBenefit,
    guideSlug: GUIDE_SLUGS.careAllowanceApplication,
    lastReviewedAt: REVIEW_DATE,
  },
  {
    slug: "czy-moge-dostac-zasilek-bez-ubezpieczenia",
    categorySlug: CATEGORY_SLUGS.insurance,
    question: "Czy mogę dostać zasiłek bez ubezpieczenia chorobowego?",
    shortAnswer:
      "Co do zasady nie. Zasiłki z ubezpieczenia chorobowego wymagają tytułu i opłacania składki.",
    explanation:
      "Zasiłek macierzyński, chorobowy i opiekuńczy są świadczeniami z ubezpieczenia chorobowego. Samo zamieszkanie w Polsce nie wystarczy. Istnieją odrębne świadczenia rodzinne, np. świadczenie rodzicielskie, ale mają inne zasady i nie są zasiłkami ZUS.",
    conditions:
      "Osoby nieubezpieczone mogą sprawdzić świadczenia rodzinne w gminie lub w ZUS, zależnie od programu.",
    whatToDo:
      "Sprawdź, czy możesz przystąpić do dobrowolnego ubezpieczenia chorobowego. Skontaktuj się z ZUS lub OPS.",
    popularity: 70,
    articleSlug: ARTICLE_SLUGS.sicknessInsurance,
    lastReviewedAt: REVIEW_DATE,
  },
  {
    slug: "kto-wyplaca-zasilek-pracodawca-czy-zus",
    categorySlug: CATEGORY_SLUGS.benefits,
    question: "Kto wypłaca zasiłek: pracodawca czy ZUS?",
    shortAnswer:
      "Zależy od liczby ubezpieczonych zgłoszonych przez płatnika. Przedsiębiorcom zasiłek zawsze wypłaca ZUS.",
    explanation:
      "Płatnik składek zgłaszający powyżej 20 ubezpieczonych co do zasady wypłaca zasiłki. Mniejszy płatnik przekazuje dokumenty do ZUS, który wypłaca świadczenie. Pracownikowi przez pierwsze 33 dni choroby wynagrodzenie chorobowe wypłaca pracodawca, niezależnie od liczby ubezpieczonych.",
    conditions:
      "Sposób wypłaty wpływa na to, gdzie składasz dokumenty i kto wydaje decyzję.",
    whatToDo:
      "Zapytaj kadry, czy firma wypłaca zasiłki, czy przekazuje je do ZUS. Sprawdź, jakie dokumenty masz złożyć.",
    popularity: 60,
    articleSlug: ARTICLE_SLUGS.sicknessBenefit,
    lastReviewedAt: REVIEW_DATE,
  },
  {
    slug: "czy-urlop-macierzynski-jest-obowiazkowy",
    categorySlug: CATEGORY_SLUGS.leaves,
    question: "Czy urlop macierzyński jest obowiązkowy?",
    shortAnswer:
      "Tak. Matka musi wykorzystać co najmniej 14 tygodni urlopu po porodzie, zanim będzie mogła wrócić do pracy.",
    explanation:
      "Urlop macierzyński jest obowiązkowy i nie można z niego zrezygnować w całości. Po 14 tygodniach matka może zrezygnować z pozostałej części, jeżeli ojciec przejmie opiekę. Inaczej wygląda urlop rodzicielski — jest dobrowolny.",
    conditions:
      "Po 8 tygodniach rezygnacja jest możliwa w wyjątkowych sytuacjach zdrowotnych matki.",
    whatToDo:
      "Zaplanuj powrót do pracy zgodnie z wymiarem urlopu. Jeśli chcesz wrócić wcześniej, sprawdź warunki przekazania urlopu ojcu.",
    popularity: 65,
    articleSlug: ARTICLE_SLUGS.maternityLeave,
    lastReviewedAt: REVIEW_DATE,
  },
  {
    slug: "co-zrobic-przy-poronieniu",
    categorySlug: CATEGORY_SLUGS.special,
    question: "Co zrobić po poronieniu?",
    shortAnswer:
      "Przede wszystkim zadbaj o zdrowie i wsparcie. Formalności zależą od sytuacji — poronienie nie zawsze oznacza prawo do urlopu macierzyńskiego.",
    explanation:
      "Jeżeli lekarz stwierdzi niezdolność do pracy, może wystawić e-ZLA. Prawo do urlopu macierzyńskiego i zasiłku zależy od tego, czy doszło do urodzenia dziecka w rozumieniu przepisów. Nie każde poronienie wiąże się z aktem urodzenia. W trudnej sytuacji poproś ZUS o wyjaśnienie, zamiast zgadywać.",
    conditions:
      "Sytuacje medyczne i prawne są różne. Nie porównuj swojego przypadku do cudzego — poproś o indywidualną informację.",
    whatToDo:
      "Skontaktuj się z lekarzem, ZUS i osobą bliską. Możesz poprosić o pomoc w formalnościach. Wsparcie psychologiczne jest ważne.",
    isImportant: true,
    popularity: 44,
    articleSlug: ARTICLE_SLUGS.stillbirthAndLoss,
    lastReviewedAt: REVIEW_DATE,
  },
  {
    slug: "czy-dostane-zasilek-przy-umowie-na-zastępstwo",
    categorySlug: CATEGORY_SLUGS.insurance,
    question: "Czy umowa na zastępstwo daje zasiłek macierzyński?",
    shortAnswer:
      "Tak, jeżeli w dniu porodu jesteś objęta ubezpieczeniem chorobowym. Umowa na zastępstwo jest umową o pracę.",
    explanation:
      "Umowa na zastępstwo to szczególny rodzaj umowy o pracę na czas określony. Ochrona przed zwolnieniem w ciąży i prawo do zasiłku działają na zasadach ogólnych, ale umowa może zakończyć się wcześniej, np. gdy wróci zastępowany pracownik. Wtedy kluczowa jest data porodu i ewentualne inne tytuły ubezpieczenia.",
    conditions:
      "Jeżeli umowa kończy się przed porodem, zasiłek macierzyński może nie przysługiwać. Sprawdź możliwość innego tytułu.",
    whatToDo:
      "Sprawdź datę zakończenia umowy i zgłoszenie do ZUS. Skonsultuj sytuację z kadrami przed porodem.",
    popularity: 41,
    articleSlug: ARTICLE_SLUGS.contractEnd,
    lastReviewedAt: REVIEW_DATE,
  },
]
