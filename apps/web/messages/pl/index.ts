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
  { href: "/panel", label: "Panel" },
  { href: "/kalkulator", label: "Kalkulator" },
  { href: "/asystent", label: "Asystent" },
  { href: "/dokumenty", label: "Dokumenty" },
  { href: "/os-czasu", label: "Oś czasu" },
] as const

export const footerLinks = [
  { href: "/start", label: "Kreator startowy" },
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
} as const

export const home = {
  eyebrow: "HackNation · ZUS",
  title: "Sprawdź, co ci przysługuje — zanim urodzi się dziecko.",
  lead: "Jedno miejsce na uprawnienia, kwoty, dokumenty i terminy. Dla obojga rodziców, także w sytuacjach trudnych. Wynik zawsze z podstawą prawną i śladem obliczeń.",
  primaryCta: "Przetestuj przykładową sprawę",
  secondaryCta: "Policz swoje świadczenie",
  trust: [
    "Bez logowania — tryb gościa",
    "Deterministyczne kwoty, nie zgadywanie",
    "Źródła i wersja przepisów przy każdym wyniku",
  ],
  paths: [
    {
      href: "/start",
      title: "Kreator sytuacji",
      description:
        "Kilka pytań o twoją pracę, ubezpieczenie i rodzinę. Na końcu powstaje sprawa demonstracyjna z kompletem danych.",
    },
    {
      href: "/kalkulator",
      title: "Kalkulator zasiłków",
      description:
        "Macierzyński, rodzicielski i ojcowski dla obojga rodziców. Porównaj wariant 100%/70% z 81,5%.",
    },
    {
      href: "/asystent",
      title: "Asystent z cytatami",
      description:
        "Zadaj pytanie po polsku. Odpowiedź powstaje z bazy wiedzy i zawsze wskazuje źródło oraz zastrzeżenie AI.",
    },
  ],
  steps: [
    {
      number: "01",
      title: "Opisz sytuację",
      text: "Termin porodu, forma zatrudnienia, okres ubezpieczenia i dochód. Bez PESEL-u i bez danych zdrowotnych, jeśli ich nie potrzebujesz.",
    },
    {
      number: "02",
      title: "Sprawdź uprawnienia",
      text: "Moduł reguł pokazuje wynik: przysługuje, nie przysługuje albo brakuje danych. Każdy krok ma podstawę prawną.",
    },
    {
      number: "03",
      title: "Zaplanuj finanse i dokumenty",
      text: "Zobacz kwoty, terminy i listę dokumentów. Porównaj scenariusze i pobierz plan rozmowy z pracodawcą.",
    },
  ],
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
      note: "Brak ubezpieczenia chorobowego w dniu porodu — ryzyko widoczne przed decyzją.",
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
