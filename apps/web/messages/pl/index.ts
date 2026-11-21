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
  { href: "/wiedza", label: "Wiedza" },
  { href: "/asystent", label: "Asystent" },
  { href: "/dokumenty", label: "Dokumenty" },
  { href: "/os-czasu", label: "Oś czasu" },
] as const

export const footerLinks = [
  { href: "/wiedza", label: "Centrum wiedzy" },
  { href: "/start", label: "Kreator startowy" },
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
  PUBLISHED: "Opublikowany",
  ARCHIVED: "Zarchiwizowany",
  ELIGIBLE: "Wstępnie spełnia",
  NOT_ELIGIBLE: "Nie spełnia",
  NEEDS_INPUT: "Brakuje danych",
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
  documentBasisLabel: "Użyj podstawy wymiaru z potwierdzonego dokumentu",
  documentBasisHelp:
    "To podstawa ustalona przez płatnika (Z-3/Z-3a) — nie odliczamy od niej ponownie składek. Odznacz, aby liczyć z wynagrodzenia brutto.",
  documentPrefillTitle: "Dane z potwierdzonego dokumentu",
  documentPrefillText:
    "Wartości pochodzą z pól, które potwierdziłaś lub potwierdziłeś na stronie Dokumenty. Możesz je zmienić — kalkulator liczy deterministycznie.",
} as const

export const assistant = {
  title: "Asystent zasiłkowy",
  lead: "Rozmowa po polsku o zasiłku macierzyńskim, urlopach, dokumentach i terminach. Każda informacja prawna ma źródło, a kwoty i terminy pochodzą z deterministycznego modułu.",
} as const

export const documents = {
  title: "Analiza dokumentów",
  lead: "Wybierz przykładowy formularz ZUS albo wgraj PDF. Analiza jest deterministyczna, a pola zawsze wymagają potwierdzenia.",
  rules: [
    {
      title: "Deterministycznie najpierw",
      text: "Najpierw pola formularza (AcroForm), potem układ i etykiety tekstu. OCR i propozycje AI są opcjonalne i wyłączone w demo.",
    },
    {
      title: "Pola do potwierdzenia",
      text: "Każde pole ma źródło, stronę i pewność odczytu. Nic nie trafia do obliczeń bez Twojego potwierdzenia.",
    },
    {
      title: "Limit, typ i czas przechowywania",
      text: "Maks. 10 MB, tylko PDF sprawdzany po sygnaturze. Plik nie jest wykonywany i jest usuwany po 24 godzinach.",
    },
    {
      title: "Formularze po zmianach",
      text: "ZAM zastępuje ZUR i ZAO, a Z-3b jest zniesiony od 24 października 2026 r. Stare druki oznaczamy ostrzeżeniem.",
    },
  ],
  samplesTitle: "Przykładowe sprawy",
  samplesLead:
    "Syntetyczne dokumenty odwzorowujące zakres danych formularzy. Nie zawierają danych prawdziwych osób i nie są dokumentami ZUS.",
  samplesLoading: "Wczytuję listę przykładów…",
  samplesError: "Nie udało się pobrać listy przykładów.",
  sampleChoose: "Wczytaj przykład",
  uploadTitle: "Wgraj własny PDF",
  uploadLead:
    "Maks. 10 MB, tylko PDF. Plik trafia do prywatnego magazynu i jest usuwany po 24 godzinach albo od razu, gdy klikniesz „Usuń dokument”.",
  fileLabel: "Plik PDF",
  fileChosen: "Wybrano",
  consentLabel: "Zgadzam się na przetwarzanie dokumentu w celu odczytu pól",
  consentHelp:
    "Dokument może zawierać dane o zdrowiu (ciąża). Analizujemy go lokalnie, bez wysyłania do zewnętrznego dostawcy AI. Zgoda jest wymagana do analizy (RODO art. 9 ust. 2 lit. a).",
  aiAssistLabel: "Pozwól AI zaproponować brakujące pola (dane osobowe są usuwane przed wysłaniem)",
  analyze: "Analizuj dokument",
  analyzing: "Analizuję…",
  errorTitle: "Nie udało się przeanalizować",
  errors: {
    noFile: "Wybierz plik PDF.",
    tooLarge: "Maksymalny rozmiar pliku to 10 MB.",
    notPdf: "Obsługiwane są wyłącznie pliki PDF.",
    noConsent: "Zaznacz zgodę na przetwarzanie dokumentu.",
    generic: "Wystąpił nieoczekiwany błąd. Spróbuj ponownie.",
  },
  emptyTitle: "Wynik analizy pojawi się tutaj",
  emptyLead:
    "Wybierz przykład albo wgraj PDF. Zobaczysz podgląd dokumentu, rozpoznany formularz, pola z pewnością odczytu i ostrzeżenia.",
  previewTitle: "Podgląd dokumentu",
  previewFallback: "Twoja przeglądarka nie wyświetla PDF w ramce.",
  previewOpen: "Otwórz podgląd w nowej karcie",
  pagesLabel: "Liczba stron",
  formLabel: "Formularz",
  methodLabel: "Metoda odczytu",
  methods: {
    ACROFORM: "pola formularza (AcroForm)",
    TEMPLATE: "układ i etykiety tekstu",
    OCR: "OCR (skan)",
    LLM_ASSISTED: "propozycje AI do potwierdzenia",
    DEMO: "przykład demonstracyjny",
  },
  sources: {
    ACROFORM: "pole formularza",
    TEMPLATE: "tekst dokumentu",
    OCR: "OCR",
    LLM: "propozycja AI",
    USER: "wpisane przez Ciebie",
  },
  legacyTitle: "Formularz wycofany",
  legacyBadge: "Formularz wycofany",
  needsReviewBadge: "Wymaga potwierdzenia",
  confirmedBadge: "Potwierdzono",
  sampleBadge: "Przykład syntetyczny",
  fieldsCaption: "Pola odczytane z dokumentu. Popraw wartości i potwierdź każde pole wymagane.",
  colField: "Pole",
  colValue: "Wartość",
  colSource: "Źródło",
  colConfidence: "Pewność",
  colConfirm: "Potwierdź",
  requiredMark: "wymagane",
  editedMark: "zmienione przez Ciebie",
  reviewMark: "sprawdź",
  page: "str.",
  emptyValue: "nie odczytano",
  confirmAll: "Potwierdź wszystkie wypełnione pola",
  findingsTitle: "Ustalenia walidacji",
  severity: { ERROR: "Błąd", WARNING: "Ostrzeżenie", INFO: "Informacja" },
  legalBasis: "Podstawa",
  blockersTitle: "Zanim zastosujesz dane",
  blockerReasons: {
    MISSING: "uzupełnij",
    INVALID: "popraw format",
    NOT_CONFIRMED: "potwierdź",
  },
  apply: "Potwierdź i oblicz",
  applying: "Liczę…",
  toCalculator: "Otwórz kalkulator z tymi danymi",
  clear: "Wyczyść",
  delete: "Usuń dokument",
  deleted: "Dokument usunięto.",
  localNote:
    "Analiza jest deterministyczna i wykonywana na serwerze aplikacji. Plik nie jest wysyłany do zewnętrznego dostawcy AI.",
  aiNote: "Część pól zaproponowało AI na tekście bez danych osobowych. Sprawdź je szczególnie uważnie.",
  resultTitle: "Wynik dla potwierdzonych danych",
  verdict: "Uprawnienie",
  amount: "Kwota brutto",
  basis: "Podstawa wymiaru",
  payer: "Kto wypłaca",
  payers: { EMPLOYER: "pracodawca (płatnik)", ZUS: "ZUS", UNKNOWN: "do ustalenia", NONE: "—" },
  statuses: {
    ELIGIBLE: "przysługuje",
    CONDITIONAL: "przysługuje warunkowo",
    NOT_ELIGIBLE: "nie przysługuje",
    NEEDS_INPUT: "brakuje danych",
    MANUAL_REVIEW: "wymaga oceny ZUS",
  },
  amountUnknown: "nie wyliczono",
  missingTitle: "Brakuje danych do obliczenia",
  notesTitle: "Uwagi do mapowania",
  checklistTitle: "Wymagane dokumenty",
  checklistLead: "Lista zapisana dla tej sesji. Miejsce złożenia zależy od tego, kto wypłaca zasiłek.",
  checklistCols: { document: "Dokument", who: "Kto przygotowuje", where: "Gdzie złożyć", when: "Termin" },
  preparedBy: {
    YOU: "Ty",
    OTHER_PARENT: "drugi rodzic",
    EMPLOYER: "pracodawca",
    PAYER: "płatnik składek",
    DOCTOR: "lekarz",
    HOSPITAL: "szpital",
    COURT: "sąd",
    CIVIL_REGISTRY: "urząd stanu cywilnego",
    ZUS: "ZUS",
  } as Record<string, string>,
  submitTo: {
    EMPLOYER: "u pracodawcy",
    PAYER: "u płatnika",
    ZUS: "w ZUS (eZUS lub placówka)",
    PAYER_OR_ZUS: "u płatnika albo w ZUS — zależnie od tego, kto wypłaca",
    NONE: "nie składasz",
  } as Record<string, string>,
  deadlinesTitle: "Terminy",
  routingTitle: "Gdzie złożyć dokumenty",
  comparisonTitle: "Porównanie z oczekiwanym wynikiem (tryb demo)",
  comparisonOk: "Zgodne z oczekiwanym wynikiem",
  comparisonFail: "Niezgodne z oczekiwanym wynikiem",
  parents: { MOTHER: "matka", FATHER: "ojciec", BOTH: "oboje" } as Record<string, string>,
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
  pinLead:
    "W aplikacji mObywatel potwierdź logowanie kodem PIN lub biometrią.",
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

export const knowledge = {
  title: "Centrum wiedzy",
  lead: "Świadczenia, prawa rodziców, ubezpieczenia i formalności — po ludzku, z datą weryfikacji i odnośnikiem do oficjalnego źródła.",
} as const
