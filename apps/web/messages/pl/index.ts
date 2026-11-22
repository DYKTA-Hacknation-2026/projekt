/**
 * The single Polish copy catalogue. Every user-facing string that is shared
 * across pages lives here; page-specific editorial copy may stay next to the
 * page for readability, but never in English.
 */

export const APP_NAME = "Przewodnik Zasiłkowy"
export const APP_SHORT_NAME = "ZPR"

export const AI_DISCLOSURE =
  "Asystent AI podpowiada, ale nie decyduje. Uprawnienia i kwoty wylicza deterministyczny moduł na podstawie wersjonowanych przepisów."

export const SIMULATION_DISCLOSURE =
  "To symulacja. Dane, dokumenty i integracje rządowe są demonstracyjne. Serwis nie jest oficjalnym serwisem ZUS."

export const LEGAL_DISCLOSURE =
  "Materiał informacyjny. Ostateczna decyzja należy do ZUS lub płatnika składek. Przed złożeniem wniosku sprawdź aktualne przepisy."

export const navItems = [
  { href: "/start", label: "Formularz" },
  { href: "/asystent", label: "Rozmowa" },
  { href: "/kalkulator", label: "Kalkulator" },
  { href: "/os-czasu", label: "Planer" },
  { href: "/dokumenty", label: "Dokumenty" },
  { href: "/panel", label: "Panel" },
] as const

export const footerLinks = [
  { href: "/start", label: "Formularz sprawdzenia" },
  { href: "/asystent", label: "Rozmowa z asystentem" },
  { href: "/kalkulator", label: "Kalkulator zasiłków" },
  { href: "/os-czasu", label: "Planer urlopów" },
  { href: "/dokumenty", label: "Analiza dokumentów" },
  { href: "/o-projekcie", label: "O projekcie i AI" },
  { href: "/mobywatel", label: "mObywatel (symulacja)" },
  { href: "/admin", label: "Panel administratora" },
] as const

export const statusLabels = {
  DRAFT: "Szkic",
  IN_REVIEW: "W analizie",
  READY: "Gotowa",
  CLOSED: "Zamknięta",
  OK: "Wyliczona",
  INDETERMINATE: "Wymaga danych",
  ERROR: "Błąd",
  VERIFIED: "Zweryfikowana",
  UNVERIFIED: "Niezweryfikowana",
  PROPOSED: "Propozycja",
  PENDING: "Oczekuje",
  INDEXED: "Zaindeksowany",
  FAILED: "Błąd",
  QUEUED: "W kolejce",
  RUNNING: "W toku",
  SUCCEEDED: "Zakończone",
} as const

export const home = {
  eyebrow: "Dla rodziców i osób planujących rodzinę",
  title: "Więcej czasu dla rodziny.",
  lead: "Sprawdź, jakie świadczenia i urlopy mogą Ci przysługiwać. Przeanalizuj swoją sytuację krok po kroku lub porozmawiaj z naszym asystentem.",
  heroPoints: [
    {
      title: "Możliwe świadczenia i urlopy",
      text: "Macierzyński, rodzicielski, ojcowski i sytuacje niestandardowe.",
    },
    {
      title: "Terminy i dokumenty",
      text: "Wnioski, terminy i lista dokumentów bez szukania po całym internecie.",
    },
    {
      title: "Kwoty i warianty",
      text: "Deterministyczny kalkulator pokazuje założenia i ślad obliczeń.",
    },
    {
      title: "Źródła i braki danych",
      text: "Cytaty, wersje reguł i jasne oznaczenie niepewności.",
    },
  ],
  methods: {
    eyebrow: "Dwie drogi, jeden cel",
    title: "Wybierz sposób, który Ci odpowiada",
    lead: "Nie musisz znać przepisów ani wiedzieć, od czego zacząć. Obie ścieżki prowadzą do konkretnych kolejnych kroków. Formularz porządkuje Twoje dane, a rozmowa pomaga zrozumieć przepisy i źródła.",
    equalityNote:
      "Obie metody pomagają przeanalizować Twoją sytuację i potencjalne uprawnienia. Różni się forma: uporządkowane pytania albo swobodna rozmowa.",
    form: {
      label: "Formularz",
      title: "Sprawdź przez formularz",
      shortDescription:
        "Odpowiedz na kilka uporządkowanych pytań i poznaj swoją sytuację.",
      description:
        "Uporządkowany proces krok po kroku. Zbieramy tylko dane potrzebne do sprawdzenia sytuacji, a na końcu powstaje sprawa demo z listą kolejnych kroków.",
      bullets: [
        "Pytania o sytuację rodzinną, pracę i ubezpieczenie.",
        "Podsumowanie danych przed zapisaniem sprawy.",
        "Lista kolejnych kroków i przejście do kalkulatora.",
      ],
      cta: "Sprawdź przez formularz",
      href: "/start",
      meta: "4 kroki · bez PESEL-u · bez konta",
    },
    chat: {
      label: "Rozmowa",
      title: "Sprawdź w rozmowie",
      shortDescription:
        "Opowiedz asystentowi o swojej sytuacji i przejdź przez analizę w formie rozmowy.",
      description:
        "Naturalna rozmowa własnymi słowami. Asystent odpowie na podstawie źródeł i podpowie, co sprawdzić dalej, a do wyliczeń skieruje do tego samego kalkulatora.",
      bullets: [
        "Opisujesz sytuację tak, jak jest Ci wygodnie.",
        "Każda odpowiedź ma źródło i zastrzeżenie AI.",
        "Asystent wskazuje, czego jeszcze brakuje i co zrobić dalej.",
      ],
      cta: "Sprawdź w rozmowie",
      href: "/asystent",
      meta: "Rozmowa po polsku · źródła przy odpowiedzi",
    },
    shared: [
      {
        title: "Ten sam cel",
        text: "Obie ścieżki pomagają zrozumieć, jakie masz możliwości i co zrobić dalej.",
      },
      {
        title: "Ten sam kalkulator",
        text: "Kwoty zawsze liczy deterministyczny moduł — nie model językowy.",
      },
      {
        title: "Te same zastrzeżenia",
        text: "Wynik jest demonstracyjny i nie zastępuje decyzji ZUS.",
      },
    ],
    note: "Asystent nie wydaje decyzji o uprawnieniach i nie wylicza kwot samodzielnie. Konkretne wyliczenie powstaje w kalkulatorze, który korzysta z wersjonowanych reguł.",
  },
  tools: {
    eyebrow: "Pozostałe narzędzia",
    title: "Kalkulator, planer i dokumenty",
    lead: "Masz już ogólny obraz? Przejdź do konkretów — bez tworzenia nowego konta i bez powtarzania tych samych danych.",
    items: [
      {
        href: "/kalkulator",
        title: "Oblicz wysokość świadczeń",
        description:
          "Macierzyński, rodzicielski i ojcowski. Porównaj warianty i zobacz założenia, braki danych oraz ślad reguł.",
        cta: "Otwórz kalkulator",
      },
      {
        href: "/os-czasu",
        title: "Zaplanuj urlopy rodzicielskie",
        description:
          "Terminy urlopów, wniosków i wypłat dla mamy i drugiego rodzica na wspólnej osi czasu.",
        cta: "Otwórz planer",
      },
      {
        href: "/dokumenty",
        title: "Sprawdź i przygotuj dokumenty",
        description:
          "Przeanalizuj przykładowy formularz ZUS lub wgraj PDF. Pola zawsze wymagają potwierdzenia.",
        cta: "Otwórz dokumenty",
      },
    ],
  },
  leave: {
    eyebrow: "Planer urlopów",
    title: "Zobacz, jak urlopy układają się w czasie",
    lead: "Wspólna oś czasu dla mamy i drugiego rodzica. Przełącz widok, aby zobaczyć, kto kiedy korzysta z urlopu i jak łączą się terminy.",
    note: "Przykład: poród 10 marca 2027, jedno dziecko, 2 tygodnie urlopu przed porodem i 9 tygodni zarezerwowanych dla drugiego rodzica.",
    cta: "Otwórz pełny planer",
  },
  personas: [
    {
      name: "Anna",
      story: "Pracuję na etacie i spodziewam się dziecka.",
      role: "Umowa o pracę · 8 000 zł brutto",
      scenario: "S-01 / S-10",
      note: "Poród w terminie, jedno dziecko, 2 tygodnie macierzyńskiego przed porodem.",
    },
    {
      name: "Kasia",
      story: "Moja umowa zakończyła się przed porodem.",
      role: "Zlecenie zakończone przed porodem",
      scenario: "S-18",
      note: "Brak ubezpieczenia chorobowego w dniu porodu — ryzyko widoczne przed decyzją.",
    },
    {
      name: "Tomasz",
      story: "Chcę zaplanować urlop razem z partnerką.",
      role: "Umowa o pracę · 6 000 zł brutto",
      scenario: "S-10 / S-12",
      note: "9 tygodni urlopu rodzicielskiego zarezerwowanych dla drugiego rodzica.",
    },
  ],
  trust: {
    eyebrow: "Zaufanie i przejrzystość",
    title: "Dlaczego możesz nam zaufać?",
    lead: "Nie obiecujemy decyzji ani kwot, których nie potrafimy uzasadnić. Pokazujemy, skąd pochodzi informacja i czego jeszcze brakuje.",
    items: [
      {
        title: "Obliczenia oparte na przepisach",
        text: "Uprawnienia i kwoty analizuje deterministyczny mechanizm wykorzystujący wersjonowane reguły prawne. Model językowy nie decyduje o wyniku.",
      },
      {
        title: "Źródła informacji",
        text: "Przy odpowiedziach asystenta i w śladzie obliczeń sprawdzisz podstawę prawną oraz źródło, z którego pochodzi informacja.",
      },
      {
        title: "Jasne oznaczanie niepewności",
        text: "System wskazuje brakujące informacje i sytuacje wymagające dodatkowej weryfikacji. Wynik „Wymaga danych” jest celowy.",
      },
    ],
    note: "To projekt demonstracyjny, a nie oficjalny serwis ZUS. Ostateczna decyzja należy do ZUS lub płatnika składek. Nie gwarantujemy przyznania świadczenia.",
  },
  faq: {
    eyebrow: "Najczęstsze pytania",
    title: "Dobrze wiedzieć przed startem",
    items: [
      {
        question: "Czy to oficjalny serwis ZUS?",
        answer:
          "Nie. To demonstracyjny projekt edukacyjny. Nie łączy się z ZUS, mObywatel ani innymi systemami państwowymi. Ostateczną decyzję podejmuje ZUS lub płatnik składek.",
      },
      {
        question: "Czym różni się formularz od rozmowy z asystentem?",
        answer:
          "To dwa sposoby rozpoczęcia tej samej analizy. Formularz prowadzi krok po kroku i porządkuje dane. Rozmowa pozwala opisać sytuację własnymi słowami i od razu dopytać o przepisy. Obie ścieżki prowadzą do tego samego kalkulatora i tych samych zastrzeżeń.",
      },
      {
        question: "Czy asystent decyduje o uprawnieniach?",
        answer:
          "Nie. Asystent odpowiada na podstawie zaindeksowanych źródeł i wskazuje dalsze kroki. Uprawnienia i kwoty wylicza deterministyczny moduł, a wynik zawsze wymaga potwierdzenia.",
      },
      {
        question: "Dlaczego wynik może być oznaczony jako „Wymaga danych”?",
        answer:
          "Część parametrów prawnych, m.in. minimalna podstawa i kwota świadczenia rodzicielskiego, wymaga zatwierdzenia. Zamiast zgadywać, system pokazuje brak i wyjaśnia, czego potrzebuje.",
      },
      {
        question: "Czy muszę podawać PESEL albo zakładać konto?",
        answer:
          "Nie. Do wstępnego sprawdzenia wystarczą daty, forma zatrudnienia i dochód. Wersja demo nie wymaga konta ani numeru PESEL.",
      },
      {
        question: "Czy mogę skorzystać bez znajomości przepisów?",
        answer:
          "Tak. Formularz i asystent prowadzą Cię przez pytania. Nie musisz wiedzieć, który urlop czy dokument jest właściwy — wyjaśnimy to w trakcie.",
      },
    ],
  },
  knowledge: {
    eyebrow: "Centrum wiedzy",
    title: "Chcesz najpierw poczytać?",
    lead: "Wyjaśnienia, źródła i oficjalne materiały, z których korzysta projekt.",
    links: [
      {
        href: "/asystent",
        label: "Zapytaj asystenta o przepisy",
        description: "Odpowiedzi z cytatami i odesłaniem do dokumentów.",
        external: false,
      },
      {
        href: "/o-projekcie",
        label: "Jak powstają wyniki",
        description: "Co jest prawdziwe, co symulowane i gdzie pomaga AI.",
        external: false,
      },
      {
        href: "https://www.zus.pl/",
        label: "Oficjalny serwis ZUS",
        description: "Materiały i poradniki ZUS dla rodziców.",
        external: true,
      },
      {
        href: "https://www.gov.pl/web/rodzina/urlop-rodzicielski",
        label: "Urlop rodzicielski na gov.pl",
        description: "Oficjalne informacje o urlopie i świadczeniach.",
        external: true,
      },
    ],
  },
  finalCta: {
    eyebrow: "Zacznij od jednego pytania",
    title: "Nie musisz wiedzieć, od czego zacząć.",
    lead: "Wybierz formularz lub rozmowę. Opowiedz nam o swojej sytuacji, a pomożemy Ci zrozumieć dostępne możliwości i przejść przez formalności.",
    form: "Sprawdź przez formularz",
    chat: "Sprawdź w rozmowie",
    note: "Obie drogi prowadzą do tego samego kalkulatora i tych samych zastrzeżeń. Wybierz tę, która jest dla Ciebie wygodniejsza.",
  },
} as const

export const dashboard = {
  title: "Panel sprawy",
  lead: "Stan danych demonstracyjnych, ostatnie obliczenia i źródła, na których pracuje aplikacja.",
} as const

export const calculator = {
  title: "Kalkulator zasiłków",
  lead: "Jeden kalkulator, wiele wariantów. Wynik jest deterministyczny i pokazuje założenia, braki danych oraz podstawę prawną.",
} as const

export const assistant = {
  title: "Asystent wiedzy",
  lead: "Opowiedz o swojej sytuacji własnymi słowami. Asystent pomoże ją uporządkować, wskaże przepisy i podpowie kolejne kroki. Kwoty wyliczy ten sam kalkulator, co w formularzu.",
} as const

export const documents = {
  title: "Analiza dokumentów",
  lead: "Wybierz przykładowy formularz ZUS albo wgraj PDF. Analiza jest deterministyczna, a pola zawsze wymagają potwierdzenia.",
} as const

export const timeline = {
  title: "Oś czasu",
  lead: "Terminy urlopów, wniosków i wypłat dla obojga rodziców. Zmień termin porodu, aby zobaczyć plan od nowa.",
} as const

export const mobywatel = {
  title: "Logowanie przez mObywatel",
  lead: "Symulacja logowania przez login.gov.pl. Wybierz profil testowy, zaakceptuj zakres danych i potwierdź tożsamość — kreator wypełni się automatycznie.",
  simulationTitle: "To jest symulacja",
  simulationText:
    "Ten ekran nie łączy się z login.gov.pl ani aplikacją mObywatel. Dane są syntetyczne, a logowanie nie ma mocy prawnej.",
  providerStep: "Wybierz sposób logowania",
  providerLead: "W symulacji dostępna jest tylko metoda mObywatel.",
  providerName: "Aplikacja mObywatel",
  providerRecommended: "Polecany",
  providerDescription: "Potwierdź tożsamość w aplikacji mObywatel.",
  providerUnavailable: "Niedostępne w symulacji",
  personaStep: "Wybierz profil testowy",
  personaLead:
    "W prawdziwym mObywatelu dane pochodzą z aplikacji na telefonie. Tutaj wybierasz osobę, którą symulujesz.",
  personaBirth: "Data urodzenia",
  personaCity: "Miejscowość",
  consentStep: "Zgoda na przekazanie danych",
  consentLead:
    "Zasiłkowy Przewodnik (projekt demonstracyjny) prosi o następujące dane:",
  consentCheckbox:
    "Wyrażam zgodę na przekazanie powyższych danych do Zasiłkowego Przewodnika.",
  consentNote:
    "W symulacji nie przekazujemy numeru PESEL. Aplikacja go nie potrzebuje — zbieramy tylko dane potrzebne do wypełnienia formularza.",
  consentSubmit: "Udostępnij dane",
  pinStep: "Potwierdź tożsamość",
  pinLead: "W aplikacji mObywatel potwierdź logowanie kodem PIN lub biometrią.",
  pinLabel: "Kod PIN",
  pinHint: "Demo: dowolne 4 cyfry, np. 1234.",
  pinSubmit: "Potwierdź w aplikacji",
  biometrics: "Użyj biometrii",
  successTitle: "Dane zostały przekazane",
  successText:
    "Kreator otworzy się z uzupełnionymi danymi. Możesz je poprawić przed zapisaniem sprawy.",
  successCta: "Przejdź do kreatora",
  back: "Wróć",
  cancel: "Anuluj",
  next: "Dalej",
  stepLabel: "Krok",
  of: "z",
  scopeLabels: {
    firstName: "Imię",
    lastName: "Nazwisko",
    birthDate: "Data urodzenia",
    city: "Miejscowość",
    email: "Adres e-mail",
  },
  providers: [
    {
      id: "mobywatel",
      label: "Aplikacja mObywatel",
      description: "Potwierdź tożsamość w aplikacji mObywatel.",
      enabled: true,
    },
    {
      id: "bank",
      label: "Bankowość elektroniczna",
      description: "Zaloguj się przez swój bank.",
      enabled: false,
    },
    {
      id: "edowod",
      label: "e-Dowód",
      description: "Użyj dowodu osobistego z warstwą elektroniczną.",
      enabled: false,
    },
    {
      id: "profil-zaufany",
      label: "Profil zaufany",
      description: "Użyj loginu i hasła lub bankowości elektronicznej.",
      enabled: false,
    },
  ],
  startCalloutTitle: "Masz mObywatel?",
  startCalloutText:
    "Zaloguj się w symulacji, a imię, nazwisko, data urodzenia, e-mail i miejscowość uzupełnią się same.",
  startCalloutCta: "Zaloguj się przez mObywatel",
  sessionTitle: "Zalogowano przez mObywatel (symulacja)",
  sessionText:
    "Dane osobowe zostały wstępnie uzupełnione. Sprawdź je i możesz poprawić przed zapisaniem sprawy.",
  sessionChange: "Zmień profil",
} as const
