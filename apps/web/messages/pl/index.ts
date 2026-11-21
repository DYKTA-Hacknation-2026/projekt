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
  { href: "/panel", label: "Moja sytuacja" },
  { href: "/kalkulator", label: "Świadczenia" },
  { href: "/asystent", label: "Asystent" },
  { href: "/dokumenty", label: "Dokumenty" },
  { href: "/os-czasu", label: "Plan urlopów" },
] as const

export const footerLinks = [
  { href: "/start", label: "Kreator analizy" },
  { href: "/dane", label: "Pobierz dane (symulacja)" },
  { href: "/mobywatel", label: "Logowanie mObywatel (symulacja)" },
  { href: "/o-projekcie", label: "O projekcie i AI" },
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
  ELIGIBLE: "Wstępnie spełnia",
  NOT_ELIGIBLE: "Nie spełnia",
  NEEDS_INPUT: "Brakuje danych",
} as const

export const home = {
  eyebrow: "Przewodnik dla rodziców",
  title: "Spokojnie zaplanuj czas po narodzinach dziecka.",
  lead: "Sprawdź świadczenia, poznaj swoje prawa i uporządkuj formalności związane z rodzicielstwem w jednym miejscu.",
  primaryCta: "Rozpocznij analizę",
  secondaryCta: "Zobacz przykładowe sprawy",
  trust: ["Bez logowania", "Bez numeru PESEL", "Źródła przy każdym wyniku"],
  benefits: [
    {
      title: "Jeden plan dla obojga rodziców",
      text: "Uprawnienia i urlopy mamy oraz taty w jednym miejscu, bez porównywania kilku serwisów.",
    },
    {
      title: "Kwoty z podstawą prawną",
      text: "Każdy wynik pokazuje reguły, wersję przepisów i założenia, na których powstał.",
    },
    {
      title: "Formalności krok po kroku",
      text: "Lista dokumentów, terminy i gotowy plan rozmowy z pracodawcą.",
    },
  ],
  paths: [
    {
      href: "/panel",
      tone: "featured",
      title: "Sprawdź swoje prawa",
      description:
        "Zobacz, do jakich świadczeń i urlopów wstępnie kwalifikujesz się — dla obojga rodziców.",
    },
    {
      href: "/kalkulator",
      tone: "default",
      title: "Oblicz świadczenia",
      description:
        "Policz macierzyński, rodzicielski i ojcowski wraz z wariantami, założeniami i źródłami.",
    },
    {
      href: "/os-czasu",
      tone: "default",
      title: "Zaplanuj urlopy",
      description:
        "Ułóż plan dla dwojga rodziców i sprawdź, jak zmienia go inny termin porodu.",
    },
    {
      href: "/dokumenty",
      tone: "default",
      title: "Przygotuj dokumenty",
      description:
        "Poznaj potrzebne formularze i przeanalizuj dokumenty ZUS bez zgadywania.",
    },
    {
      href: "/asystent",
      tone: "dark",
      title: "Zapytaj asystenta",
      description:
        "Zadaj pytanie po polsku. Każda odpowiedź wskazuje źródło i jasno mówi, gdy brakuje danych.",
    },
  ],
  steps: [
    {
      number: "01",
      title: "Opisz swoją sytuację",
      text: "Termin porodu, forma zatrudnienia i dochód. Bez PESEL-u i bez danych, których nie potrzebujesz.",
    },
    {
      number: "02",
      title: "Poznaj uprawnienia",
      text: "Zobacz, co przysługuje obojgu rodzicom. Każdy wynik ma podstawę prawną i jawne założenia.",
    },
    {
      number: "03",
      title: "Ułóż plan działania",
      text: "Dostajesz kwoty, terminy i listę dokumentów. Możesz porównać warianty i wrócić do nich później.",
    },
  ],
  principles: [
    {
      title: "Reguły, nie domysły",
      text: "Kwoty liczy deterministyczny moduł na podstawie wersjonowanych przepisów. Ten sam zestaw danych zawsze daje ten sam wynik.",
    },
    {
      title: "Źródło przy każdej odpowiedzi",
      text: "Asystent cytuje bazę wiedzy, a kalkulator pokazuje reguły i ślad obliczeń. Wiesz, na czym opiera się wynik.",
    },
    {
      title: "Mniej danych, więcej spokoju",
      text: "Do wstępnej analizy nie potrzebujesz numeru PESEL. Zgody na dane zdrowotne i dokumenty są rozdzielone.",
    },
  ],
  honesty: {
    title: "Uczciwie o brakach",
    text: "Minimalna podstawa i kwota świadczenia rodzicielskiego (Q-29) oraz polityka zaokrągleń (Q-15) czekają na zatwierdzenie. Dlatego kalkulator pokazuje status „Wymaga danych”, a nie wymyśloną kwotę.",
    cta: "Zobacz, co jest prawdziwe",
  },
  finalCta: {
    eyebrow: "Start w 3 minuty",
    title: "Zobacz, jak wygląda twoja sprawa po wpisaniu kilku danych.",
    text: "Bez konta i bez PESEL-u. W każdej chwili możesz wrócić do kalkulatora i porównać warianty.",
    primary: "Rozpocznij analizę",
    secondary: "O projekcie",
  },
  personas: [
    {
      name: "Anna",
      role: "Umowa o pracę, 8 000 zł brutto",
      scenario: "S-01 / S-10",
      note: "Poród w terminie, jedno dziecko, 2 tygodnie macierzyńskiego przed porodem.",
    },
    {
      name: "Kasia",
      role: "Zlecenie zakończone przed porodem",
      scenario: "S-18",
      note: "Brak ubezpieczenia chorobowego w dniu porodu — ryzyko widoczne, zanim podejmiesz decyzję.",
    },
    {
      name: "Tomasz",
      role: "Umowa o pracę, 6 000 zł brutto",
      scenario: "S-10 / S-12",
      note: "9 tygodni urlopu rodzicielskiego zarezerwowanych dla drugiego rodzica.",
    },
  ],
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
  title: "Asystent zasiłkowy",
  lead: "Rozmowa po polsku o zasiłku macierzyńskim, urlopach, dokumentach i terminach. Każda informacja prawna ma źródło, a kwoty i terminy pochodzą z deterministycznego modułu.",
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
