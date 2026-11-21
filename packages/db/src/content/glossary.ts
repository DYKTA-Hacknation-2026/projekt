import { ARTICLE_SLUGS } from "./slugs"
import { REVIEW_DATE } from "./meta"

export interface GlossarySeed {
  slug: string
  term: string
  letter: string
  definition: string
  explanation?: string
  example?: string
  relatedArticleSlugs: string[]
  lastReviewedAt: string
}

export const CONTENT_GLOSSARY: GlossarySeed[] = [
  {
    slug: "ubezpieczony",
    term: "Ubezpieczony",
    letter: "U",
    definition:
      "Osoba objęta ubezpieczeniem społecznym, która może korzystać ze świadczeń, w tym z zasiłków.",
    explanation:
      "W sprawach zasiłków chodzi najczęściej o osobę objętą ubezpieczeniem chorobowym: pracownika, zleceniobiorcę, przedsiębiorcę lub inną osobę z tytułem ubezpieczenia. Ubezpieczony ma prawa i obowiązki — musi m.in. zgłaszać zmiany i dostarczać dokumenty.",
    example:
      "Pracownica na umowie o pracę jest ubezpieczona obowiązkowo. Zleceniobiorca może być ubezpieczony dobrowolnie, jeżeli przystąpi do ubezpieczenia chorobowego.",
    relatedArticleSlugs: [ARTICLE_SLUGS.sicknessInsurance, ARTICLE_SLUGS.entitlementConditions],
    lastReviewedAt: REVIEW_DATE,
  },
  {
    slug: "platnik-skladek",
    term: "Płatnik składek",
    letter: "P",
    definition:
      "Podmiot, który oblicza, potrąca i odprowadza składki do ZUS oraz często wypłaca zasiłki.",
    explanation:
      "Płatnikiem jest zwykle pracodawca, zleceniodawca, a w przypadku działalności gospodarczej — sam przedsiębiorca. Płatnik nie zawsze wypłaca zasiłek: mniejsze firmy przekazują dokumenty do ZUS. Płatnik wystawia też zaświadczenia Z-3 i Z-3a.",
    example:
      "Pracodawca zatrudniający 5 osób zwykle przekazuje dokumenty do ZUS. Pracodawca zatrudniający 30 osób może wypłacać zasiłki sam.",
    relatedArticleSlugs: [ARTICLE_SLUGS.maternityBenefit, ARTICLE_SLUGS.sicknessBenefit],
    lastReviewedAt: REVIEW_DATE,
  },
  {
    slug: "tytul-ubezpieczenia",
    term: "Tytuł ubezpieczenia",
    letter: "T",
    definition:
      "Podstawa prawna objęcia ubezpieczeniem, np. umowa o pracę, zlecenie, działalność gospodarcza.",
    explanation:
      "Tytuł decyduje o tym, czy ubezpieczenie chorobowe jest obowiązkowe czy dobrowolne, kto jest płatnikiem i jaka jest podstawa składek. W dniu porodu musisz mieć tytuł do ubezpieczenia chorobowego, aby otrzymać zasiłek macierzyński.",
    example:
      "Umowa o pracę to tytuł obowiązkowy. Umowa zlecenie daje możliwość dobrowolnego ubezpieczenia chorobowego — trzeba złożyć zgłoszenie.",
    relatedArticleSlugs: [ARTICLE_SLUGS.sicknessInsurance, ARTICLE_SLUGS.multipleTitles],
    lastReviewedAt: REVIEW_DATE,
  },
  {
    slug: "ubezpieczenie-chorobowe",
    term: "Ubezpieczenie chorobowe",
    letter: "U",
    definition:
      "Rodzaj ubezpieczenia społecznego, z którego finansowane są zasiłki: chorobowy, macierzyński i opiekuńczy.",
    explanation:
      "Składka chorobowa wynosi 2,45% podstawy. U pracowników ubezpieczenie jest obowiązkowe, u zleceniobiorców i przedsiębiorców — dobrowolne. Prawo do zasiłku zależy od tytułu i opłacania składki.",
    example:
      "Pracownik ma ubezpieczenie chorobowe od pierwszego dnia pracy. Przedsiębiorca musi zdecydować, czy opłaca składkę chorobową — bez niej nie dostanie zasiłku.",
    relatedArticleSlugs: [ARTICLE_SLUGS.sicknessInsurance, ARTICLE_SLUGS.mandateAndBusiness],
    lastReviewedAt: REVIEW_DATE,
  },
  {
    slug: "podstawa-wymiaru-skladek",
    term: "Podstawa wymiaru składek",
    letter: "P",
    definition:
      "Kwota, od której płatnik oblicza składki na ubezpieczenia społeczne.",
    explanation:
      "Przy umowie o pracę to wynagrodzenie i inne składniki wskazane w przepisach. Przy zleceniu — przychód. Przy działalności — zadeklarowana kwota, nie niższa niż ustawowe minimum. Od tej kwoty zależy wysokość składki, a pośrednio także przyszłego zasiłku.",
    example:
      "Jeżeli przedsiębiorca deklaruje niższą podstawę składki chorobowej, jego zasiłek będzie niższy — mimo że składka jest proporcjonalnie mniejsza.",
    relatedArticleSlugs: [ARTICLE_SLUGS.amountAndBasis],
    lastReviewedAt: REVIEW_DATE,
  },
  {
    slug: "podstawa-wymiaru-zasilku",
    term: "Podstawa wymiaru zasiłku",
    letter: "P",
    definition:
      "Przeciętne miesięczne wynagrodzenie lub przychód z okresu odniesienia, po potrąceniach, od którego liczy się zasiłek.",
    explanation:
      "Co do zasady bierze się 12 miesięcy kalendarzowych poprzedzających miesiąc powstania prawa do zasiłku. Podstawę pomniejsza się o 13,71%. Podstawa dzienna to 1/30 podstawy miesięcznej. Przy krótszym okresie ubezpieczenia obowiązują zasady szczególne.",
    example:
      "Wynagrodzenie 6 000 zł przez 12 miesięcy daje podstawę 5 177,40 zł po odjęciu 13,71%, a dzienną 172,58 zł.",
    relatedArticleSlugs: [ARTICLE_SLUGS.amountAndBasis],
    lastReviewedAt: REVIEW_DATE,
  },
  {
    slug: "okres-wyczekiwania",
    term: "Okres wyczekiwania",
    letter: "O",
    definition:
      "Okres ubezpieczenia, po którym powstaje prawo do zasiłku chorobowego.",
    explanation:
      "Wynosi 30 dni dla ubezpieczenia obowiązkowego i 90 dni dla dobrowolnego. Nie dotyczy zasiłku macierzyńskiego ani opiekuńczego. Są wyjątki, np. niezdolność z wypadku przy pracy.",
    example:
      "Zleceniobiorca, który przystąpił do dobrowolnego ubezpieczenia chorobowego, musi odczekać 90 dni, zanim otrzyma zasiłek chorobowy.",
    relatedArticleSlugs: [ARTICLE_SLUGS.entitlementConditions, ARTICLE_SLUGS.sicknessInsurance],
    lastReviewedAt: REVIEW_DATE,
  },
  {
    slug: "zasilek-chorobowy",
    term: "Zasiłek chorobowy",
    letter: "Z",
    definition:
      "Świadczenie pieniężne za okres niezdolności do pracy z powodu choroby lub innych przyczyn określonych w ustawie.",
    explanation:
      "Przysługuje do 182 dni, a w ciąży lub przy gruźlicy do 270 dni. Standardowo wynosi 80% podstawy, w ciąży 100%. Po ustaniu ubezpieczenia może być wypłacany do 91 dni, z wyjątkami.",
    example:
      "Pracownik na e-ZLA otrzymuje wynagrodzenie chorobowe od pracodawcy przez pierwsze 33 dni, a następnie zasiłek chorobowy.",
    relatedArticleSlugs: [ARTICLE_SLUGS.sicknessBenefit, ARTICLE_SLUGS.pregnancySickLeave],
    lastReviewedAt: REVIEW_DATE,
  },
  {
    slug: "zasilek-macierzynski",
    term: "Zasiłek macierzyński",
    letter: "Z",
    definition:
      "Świadczenie za okres urlopu macierzyńskiego, na warunkach macierzyńskiego, rodzicielskiego i ojcowskiego.",
    explanation:
      "Wymaga ubezpieczenia chorobowego w dniu porodu lub przyjęcia dziecka. Stawki: 100% za macierzyński i ojcowski, 70% za rodzicielski, 81,5% w wariancie z wnioskiem w 21 dni. 9 tygodni drugiego rodzica zawsze 70%.",
    example:
      "Matka, która złoży wniosek o 81,5% w ciągu 21 dni po porodzie, otrzyma 81,5% podstawy za macierzyński i rodzicielski, z wyjątkiem 9 tygodni ojca.",
    relatedArticleSlugs: [ARTICLE_SLUGS.maternityBenefit, ARTICLE_SLUGS.maternityLeave],
    lastReviewedAt: REVIEW_DATE,
  },
  {
    slug: "okres-zasilkowy",
    term: "Okres zasiłkowy",
    letter: "O",
    definition:
      "Okres, przez który przysługuje zasiłek chorobowy — standardowo 182 dni.",
    explanation:
      "Wlicza się do niego okresy nieprzerwanej niezdolności do pracy oraz wcześniejsze zwolnienia, jeżeli przerwa nie przekraczała 60 dni. W ciąży i przy gruźlicy okres wynosi 270 dni. Po ustaniu ubezpieczenia obowiązuje limit 91 dni, z wyjątkami.",
    example:
      "Dwa zwolnienia przedzielone 30-dniową przerwą wliczają się do tego samego okresu zasiłkowego, co może skrócić wypłatę.",
    relatedArticleSlugs: [ARTICLE_SLUGS.sicknessBenefit],
    lastReviewedAt: REVIEW_DATE,
  },
  {
    slug: "niezdolnosc-do-pracy",
    term: "Niezdolność do pracy",
    letter: "N",
    definition:
      "Stan zdrowia uniemożliwiający wykonywanie pracy, stwierdzony przez lekarza.",
    explanation:
      "Niezdolność do pracy nie jest tym samym co niepełnosprawność orzeczona przez ZUS. W ciąży sama ciąża nie wystarcza — potrzebne jest stwierdzenie niezdolności do pracy. Lekarz wystawia wtedy e-ZLA, a w ciąży zwykle z kodem B.",
    example:
      "Lekarz stwierdza zagrożenie ciąży i wystawia e-ZLA z kodem B. To podstawa do zasiłku chorobowego w wysokości 100%.",
    relatedArticleSlugs: [ARTICLE_SLUGS.pregnancySickLeave],
    lastReviewedAt: REVIEW_DATE,
  },
  {
    slug: "e-zla",
    term: "e-ZLA",
    letter: "E",
    definition:
      "Elektroniczne zaświadczenie lekarskie o czasowej niezdolności do pracy, potocznie L4.",
    explanation:
      "Lekarz wystawia je elektronicznie i przesyła do ZUS oraz płatnika. Pacjent nie musi dostarczać wydruku, chyba że zwolnienie wystawiono w trybie alternatywnym. Kod B oznacza niezdolność w ciąży.",
    example:
      "Lekarz wpisuje kod B na e-ZLA. Dzięki temu zasiłek chorobowy wynosi 100% podstawy, a nie 80%.",
    relatedArticleSlugs: [ARTICLE_SLUGS.pregnancySickLeave, ARTICLE_SLUGS.sicknessBenefit],
    lastReviewedAt: REVIEW_DATE,
  },
  {
    slug: "zasilek-opiekunczy",
    term: "Zasiłek opiekuńczy",
    letter: "Z",
    definition:
      "Świadczenie za czas, w którym ubezpieczony musi osobiście opiekować się chorym dzieckiem lub członkiem rodziny.",
    explanation:
      "Wynosi 80% podstawy i przysługuje od pierwszego dnia ubezpieczenia. Limity: 60 dni na dzieci do 14 lat, 30 dni na dziecko z niepełnosprawnością 14–18 lat, 14 dni na innych członków rodziny; łącznie maks. 60 dni. Za ten sam okres zasiłek otrzymuje tylko jedno z rodziców.",
    example:
      "Rodzice mają wspólny limit 60 dni. Jeżeli matka wykorzystała 40 dni, ojcu pozostaje 20 dni w tym roku.",
    relatedArticleSlugs: [ARTICLE_SLUGS.careBenefit, ARTICLE_SLUGS.hospitalisation],
    lastReviewedAt: REVIEW_DATE,
  },
  {
    slug: "urlop-rodzicielski",
    term: "Urlop rodzicielski",
    letter: "U",
    definition:
      "Urlop przysługujący obojgu rodzicom łącznie w wymiarze 41 lub 43 tygodni.",
    explanation:
      "Każdy z rodziców ma 9 tygodni niezbywalnych. Urlop można wykorzystać w maksymalnie 5 częściach do końca roku, w którym dziecko kończy 6 lat. Można go łączyć z pracą do połowy etatu, co wydłuża urlop. Za okres urlopu przysługuje zasiłek macierzyński.",
    example:
      "Rodzice jednego dziecka mają 41 tygodni. Matka bierze 32 tygodnie, ojciec 9 — tylko wtedy cała pula zostaje wykorzystana.",
    relatedArticleSlugs: [ARTICLE_SLUGS.parentalLeave],
    lastReviewedAt: REVIEW_DATE,
  },
  {
    slug: "urlop-na-warunkach-urlopu-macierzynskiego",
    term: "Urlop na warunkach urlopu macierzyńskiego",
    letter: "U",
    definition:
      "Urlop dla rodzica adopcyjnego lub rodziny zastępczej, odpowiednik urlopu macierzyńskiego.",
    explanation:
      "Wymiar wynosi 20–37 tygodni w zależności od liczby dzieci. Przy przysposobieniu przysługuje do 14. roku życia dziecka, przy rodzinie zastępczej zwykle do 7/10 lat. Wniosek składa się w ciągu 7 dni od przyjęcia dziecka.",
    example:
      "Rodzic, który przyjął jedno dziecko i wystąpił o przysposobienie, może skorzystać z 20 tygodni urlopu na warunkach urlopu macierzyńskiego.",
    relatedArticleSlugs: [ARTICLE_SLUGS.adoption, ARTICLE_SLUGS.fosterCare],
    lastReviewedAt: REVIEW_DATE,
  },
]
