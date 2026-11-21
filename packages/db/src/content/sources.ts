import type { ContentSourceKind } from "@zpr/contracts/content"

export interface SourceSeed {
  slug: string
  title: string
  publisher: string
  kind: ContentSourceKind
  url: string
  description: string
  accessedAt: string
  lastVerifiedAt: string
}

/** Official sources used by the seeded articles. */
export const CONTENT_SOURCES: SourceSeed[] = [
  {
    slug: "zus-macierzynski",
    title: "Zasiłek macierzyński — informacje ZUS",
    publisher: "Zakład Ubezpieczeń Społecznych",
    kind: "OFFICIAL_GUIDANCE",
    url: "https://www.zus.pl/swiadczenia/zasilki/zasilek-macierzynski",
    description:
      "Prawo do zasiłku, okres wypłaty, wysokość i dokumenty wymagane przez ZUS.",
    accessedAt: "2026-11-21",
    lastVerifiedAt: "2026-11-21",
  },
  {
    slug: "zus-macierzynski-dokumenty",
    title: "Niezbędne dokumenty — zasiłek macierzyński",
    publisher: "Zakład Ubezpieczeń Społecznych",
    kind: "OFFICIAL_GUIDANCE",
    url: "https://www.zus.pl/swiadczenia/zasilki/zasilek-macierzynski/niezbedne-dokumenty",
    description:
      "Aktualny wykaz dokumentów i informacji dla wniosków o zasiłek macierzyński.",
    accessedAt: "2026-11-21",
    lastVerifiedAt: "2026-11-21",
  },
  {
    slug: "zus-chorobowy",
    title: "Zasiłek chorobowy — informacje ZUS",
    publisher: "Zakład Ubezpieczeń Społecznych",
    kind: "OFFICIAL_GUIDANCE",
    url: "https://www.zus.pl/swiadczenia/zasilki/zasilek-chorobowy",
    description:
      "Prawo do zasiłku, okres zasiłkowy, wysokość oraz dokumenty dla zasiłku chorobowego.",
    accessedAt: "2026-11-21",
    lastVerifiedAt: "2026-11-21",
  },
  {
    slug: "zus-chorobowy-dokumenty",
    title: "Niezbędne dokumenty — zasiłek chorobowy",
    publisher: "Zakład Ubezpieczeń Społecznych",
    kind: "OFFICIAL_GUIDANCE",
    url: "https://www.zus.pl/swiadczenia/zasilki/zasilek-chorobowy/z-ubezpieczenia-chorobowego/niezbedne-dokumenty",
    description:
      "e-ZLA, kod B, Z-3/Z-3a, ZAS-53 i Z-10 — kiedy są potrzebne.",
    accessedAt: "2026-11-21",
    lastVerifiedAt: "2026-11-21",
  },
  {
    slug: "zus-opiekunczy",
    title: "Zasiłek opiekuńczy — informacje ZUS",
    publisher: "Zakład Ubezpieczeń Społecznych",
    kind: "OFFICIAL_GUIDANCE",
    url: "https://www.zus.pl/swiadczenia/zasilki/zasilek-opiekunczy",
    description:
      "Kto może skorzystać, limity dni, wysokość i wniosek o zasiłek opiekuńczy.",
    accessedAt: "2026-11-21",
    lastVerifiedAt: "2026-11-21",
  },
  {
    slug: "zus-opiekunczy-prawo",
    title: "Prawo do zasiłku i okres przysługiwania — zasiłek opiekuńczy",
    publisher: "Zakład Ubezpieczeń Społecznych",
    kind: "OFFICIAL_GUIDANCE",
    url: "https://www.zus.pl/swiadczenia/zasilki/zasilek-opiekunczy/prawo-do-zasilku-i-okres-przyslugiwania",
    description:
      "Limity 60, 30 i 14 dni oraz zasada, że zasiłek otrzymuje tylko jedno z rodziców.",
    accessedAt: "2026-11-21",
    lastVerifiedAt: "2026-11-21",
  },
  {
    slug: "zus-formularze",
    title: "Wzory formularzy — zasiłki",
    publisher: "Zakład Ubezpieczeń Społecznych",
    kind: "OFFICIAL_FORM",
    url: "https://www.zus.pl/wzory-formularzy/zasilki",
    description:
      "Oficjalne, aktualne wzory wniosków i zaświadczeń. Zawsze sprawdź wersję druku.",
    accessedAt: "2026-11-21",
    lastVerifiedAt: "2026-11-21",
  },
  {
    slug: "zus-formularze-macierzynski",
    title: "Formularze — zasiłek macierzyński",
    publisher: "Zakład Ubezpieczeń Społecznych",
    kind: "OFFICIAL_FORM",
    url: "https://www.zus.pl/wzory-formularzy/zasilki/zasilek-macierzynski",
    description:
      "ZAM, Z-3 i Z-3a w wersjach obowiązujących od 24 października 2026 r.",
    accessedAt: "2026-11-21",
    lastVerifiedAt: "2026-11-21",
  },
  {
    slug: "zus-formularze-chorobowy",
    title: "Formularze — zasiłek chorobowy",
    publisher: "Zakład Ubezpieczeń Społecznych",
    kind: "OFFICIAL_FORM",
    url: "https://www.zus.pl/wzory-formularzy/zasilki/zasilek-chorobowy",
    description:
      "ZAS-53, ZAS-12, Z-3, Z-3a i Z-10 — aktualne wersje i zastosowanie.",
    accessedAt: "2026-11-21",
    lastVerifiedAt: "2026-11-21",
  },
  {
    slug: "zus-formularze-opiekunczy",
    title: "Formularze — zasiłek opiekuńczy",
    publisher: "Zakład Ubezpieczeń Społecznych",
    kind: "OFFICIAL_FORM",
    url: "https://www.zus.pl/wzory-formularzy/zasilki/zasilek-opiekunczy",
    description:
      "Z-15 — jeden wniosek o zasiłek opiekuńczy obowiązujący od listopada 2026 r.",
    accessedAt: "2026-11-21",
    lastVerifiedAt: "2026-11-21",
  },
  {
    slug: "zus-uproszczenia-2026",
    title: "Kolejne uproszczenia w zasiłkach — zmiany od 24 października 2026 r.",
    publisher: "Zakład Ubezpieczeń Społecznych",
    kind: "OFFICIAL_GUIDANCE",
    url: "https://www.zus.pl/-/kolejne-uproszczenia-w-zasi%C5%82kach",
    description:
      "ZAM zastępuje ZUR i ZAO, Z-15 zastępuje Z-15A/B, Z-3b zostaje wycofany.",
    accessedAt: "2026-11-21",
    lastVerifiedAt: "2026-11-21",
  },
  {
    slug: "zus-ezla",
    title: "Elektroniczne zwolnienia lekarskie (e-ZLA)",
    publisher: "Zakład Ubezpieczeń Społecznych",
    kind: "OFFICIAL_GUIDANCE",
    url: "https://www.zus.pl/ezla",
    description:
      "Jak działa e-ZLA, kto je wystawia i jak trafia do ZUS oraz pracodawcy.",
    accessedAt: "2026-11-21",
    lastVerifiedAt: "2026-11-21",
  },
  {
    slug: "zus-przedawnienie",
    title: "Przedawnienie roszczenia o wypłatę zasiłku",
    publisher: "Zakład Ubezpieczeń Społecznych",
    kind: "OFFICIAL_GUIDANCE",
    url: "https://www.zus.pl/swiadczenia/zasilki/zasilek-chorobowy/postepowanie-w-sprawie-zasilkow/przedawnienie-roszczenia-o-wyplate-zasilku",
    description:
      "Sześć miesięcy od ostatniego dnia okresu, za który zasiłek przysługuje; 3 lata w razie błędu płatnika.",
    accessedAt: "2026-11-21",
    lastVerifiedAt: "2026-11-21",
  },
  {
    slug: "zus-ezus",
    title: "PUE/eZUS — portal ZUS",
    publisher: "Zakład Ubezpieczeń Społecznych",
    kind: "OFFICIAL_GUIDANCE",
    url: "https://www.zus.pl/ezus/logowanie?jezyk=pl",
    description:
      "Elektroniczne wnioski, zwolnienia i dokumenty. Wymaga profilu na PUE/eZUS.",
    accessedAt: "2026-11-21",
    lastVerifiedAt: "2026-11-21",
  },
  {
    slug: "gov-urodzenie",
    title: "Zgłoś urodzenie dziecka",
    publisher: "Gov.pl / Ministerstwo Cyfryzacji",
    kind: "GOVERNMENT_PAGE",
    url: "https://www.gov.pl/web/gov/zglos-urodzenie-dziecka",
    description:
      "Termin 21 dni od wystawienia karty urodzenia, zgłoszenie online, w USC lub w mObywatelu.",
    accessedAt: "2026-11-21",
    lastVerifiedAt: "2026-11-21",
  },
  {
    slug: "gov-za-zyciem",
    title: "Program „Za życiem” — informacje rządowe",
    publisher: "Gov.pl / Ministerstwo Rodziny, Pracy i Polityki Społecznej",
    kind: "GOVERNMENT_PAGE",
    url: "https://www.gov.pl/web/rodzina/program-za-zyciem1",
    description:
      "Zaświadczenie „Za życiem” i wydłużony urlop rodzicielski.",
    accessedAt: "2026-11-21",
    lastVerifiedAt: "2026-11-21",
  },
  {
    slug: "kodeks-pracy",
    title: "Kodeks pracy — uprawnienia związane z rodzicielstwem",
    publisher: "Sejm RP",
    kind: "LEGAL_ACT",
    url: "https://isap.sejm.gov.pl/isap.nsf/DocDetails.xsp?id=WDU19740240141",
    description:
      "Dział ósmy Kodeksu pracy: urlopy macierzyński, rodzicielski, ojcowski i adopcyjny.",
    accessedAt: "2026-11-21",
    lastVerifiedAt: "2026-11-21",
  },
  {
    slug: "ustawa-zasilkowa",
    title:
      "Ustawa o świadczeniach pieniężnych z ubezpieczenia społecznego w razie choroby i macierzyństwa",
    publisher: "Sejm RP",
    kind: "LEGAL_ACT",
    url: "https://isap.sejm.gov.pl/isap.nsf/DocDetails.xsp?id=WDU19990600636",
    description:
      "Ustawa zasiłkowa — prawo do zasiłków, okresy, wysokość, podstawa wymiaru i przedawnienie.",
    accessedAt: "2026-11-21",
    lastVerifiedAt: "2026-11-21",
  },
  {
    slug: "rozp-2026-1316",
    title:
      "Rozporządzenie w sprawie dokumentów niezbędnych do przyznania i wypłaty zasiłków",
    publisher: "Minister Rodziny, Pracy i Polityki Społecznej",
    kind: "LEGAL_ACT",
    url: "https://dziennikustaw.gov.pl/DU/2026/1316",
    description:
      "Dz.U. 2026 poz. 1316. Obowiązuje od 24 października 2026 r.",
    accessedAt: "2026-11-21",
    lastVerifiedAt: "2026-11-21",
  },
  {
    slug: "rozp-2025-322",
    title:
      "Rozporządzenie w sprawie wniosków dotyczących uprawnień pracowników związanych z rodzicielstwem",
    publisher: "Minister Rodziny, Pracy i Polityki Społecznej",
    kind: "LEGAL_ACT",
    url: "https://dziennikustaw.gov.pl/DU/2025/322",
    description:
      "Dz.U. 2025 poz. 322 — dokumenty dołączane do wniosków urlopowych.",
    accessedAt: "2026-11-21",
    lastVerifiedAt: "2026-11-21",
  },
  {
    slug: "zus-poradnik-rodzice",
    title: "Poradnik dla rodziców i opiekunów dzieci (ZUS, 2026)",
    publisher: "Zakład Ubezpieczeń Społecznych",
    kind: "OFFICIAL_GUIDANCE",
    url: "https://www.zus.pl/documents/10182/167567/1184_26+Poradnik+dla+rodzic%C3%B3w.pdf/9378de60-151e-9b9f-ba65-abdf41d9f5b4",
    description:
      "Stan prawny na 1 kwietnia 2026 r. Praktyczne objaśnienia ZUS dla rodziców.",
    accessedAt: "2026-11-21",
    lastVerifiedAt: "2026-11-21",
  },
]

export interface LegalReferenceSeed {
  citation: string
  title: string
  actTitle: string
  url: string
  effectiveFrom?: string
  notes?: string
}

const KP_URL =
  "https://isap.sejm.gov.pl/isap.nsf/DocDetails.xsp?id=WDU19740240141"
const U_URL =
  "https://isap.sejm.gov.pl/isap.nsf/DocDetails.xsp?id=WDU19990600636"
const KP_ACT = "Ustawa z dnia 26 czerwca 1974 r. — Kodeks pracy"
const U_ACT =
  "Ustawa z dnia 25 czerwca 1999 r. o świadczeniach pieniężnych z ubezpieczenia społecznego w razie choroby i macierzyństwa"

export const CONTENT_LEGAL_REFERENCES: LegalReferenceSeed[] = [
  {
    citation: "KP art. 177",
    title: "Ochrona przed rozwiązaniem umowy w okresie ciąży",
    actTitle: KP_ACT,
    url: KP_URL,
    notes:
      "Rozwiązanie umowy w ciąży jest co do zasady niedopuszczalne; wyjątki i tryb konsultacji z organizacją związkową określa przepis.",
  },
  {
    citation: "KP art. 178",
    title: "Zwolnienie na badania lekarskie i inne uprawnienia pracownicy w ciąży",
    actTitle: KP_ACT,
    url: KP_URL,
    notes:
      "Zwolnienie na badania, których nie można wykonać poza godzinami pracy, z zachowaniem prawa do wynagrodzenia.",
  },
  {
    citation: "KP art. 179",
    title: "Przeniesienie do innej pracy w okresie ciąży",
    actTitle: KP_ACT,
    url: KP_URL,
    notes:
      "Praca szczególnie uciążliwa lub szkodliwa: obowiązek przeniesienia i dodatek wyrównawczy, gdy wynagrodzenie się obniża.",
  },
  {
    citation: "KP art. 180",
    title: "Wymiar urlopu macierzyńskiego",
    actTitle: KP_ACT,
    url: KP_URL,
    notes:
      "20/31/33/35/37 tygodni; do 6 tygodni przed porodem; niewykorzystany urlop po porodzie.",
  },
  {
    citation: "KP art. 180¹",
    title: "Urlop macierzyński po urodzeniu martwego dziecka lub po zgonie dziecka",
    actTitle: KP_ACT,
    url: KP_URL,
    notes:
      "8 tygodni po porodzie, nie krócej niż 7 dni od zgonu dziecka; po zgonie po 8. tygodniu życia — 7 dni.",
  },
  {
    citation: "KP art. 182¹a",
    title: "Urlop rodzicielski — wymiar, podział i 9 tygodni niezbywalnych",
    actTitle: KP_ACT,
    url: KP_URL,
    notes:
      "41/43 tygodnie, 65/67 tygodni z zaświadczeniem „Za życiem”, 9 tygodni wyłącznie dla każdego rodzica.",
  },
  {
    citation: "KP art. 182³",
    title: "Urlop ojcowski",
    actTitle: KP_ACT,
    url: KP_URL,
    notes:
      "Do 2 tygodni, do ukończenia przez dziecko 12. miesiąca życia; jedna lub dwie części, min. tydzień każda.",
  },
  {
    citation: "KP art. 183",
    title: "Urlop na warunkach urlopu macierzyńskiego — adopcja i rodzina zastępcza",
    actTitle: KP_ACT,
    url: KP_URL,
    notes:
      "20/31/33/35/37 tygodni, limit wieku dziecka, 9 tygodni niezbywalnych, wniosek w 7 dni.",
  },
  {
    citation: "KP art. 180²",
    title: "Uzupełniający urlop macierzyński",
    actTitle: KP_ACT,
    url: KP_URL,
    notes:
      "Do 8 tygodni, gdy dziecko po urodzeniu wymaga hospitalizacji; wniosek i warunki określa przepis.",
  },
  {
    citation: "U art. 4",
    title: "Okres wyczekiwania na zasiłek chorobowy",
    actTitle: U_ACT,
    url: U_URL,
    notes:
      "30 dni ubezpieczenia obowiązkowego albo 90 dni dobrowolnego. Nie dotyczy zasiłku macierzyńskiego i opiekuńczego.",
  },
  {
    citation: "U art. 8",
    title: "Okres zasiłkowy — 182 dni, 270 dni w ciąży lub przy gruźlicy",
    actTitle: U_ACT,
    url: U_URL,
    notes:
      "Po ustaniu tytułu ubezpieczenia zasiłek chorobowy do 91 dni, z wyjątkami.",
  },
  {
    citation: "U art. 9",
    title: "Okres zasiłkowy — wliczanie okresów nieprzerwanej niezdolności",
    actTitle: U_ACT,
    url: U_URL,
    notes:
      "Do okresu zasiłkowego wlicza się poprzednie niezdolności, jeżeli przerwa nie przekraczała 60 dni; wyjątki m.in. dla ciąży.",
  },
  {
    citation: "U art. 11",
    title: "Wysokość zasiłku chorobowego",
    actTitle: U_ACT,
    url: U_URL,
    notes:
      "Co do zasady 80% podstawy; 100% m.in. gdy niezdolność do pracy powstała w ciąży.",
  },
  {
    citation: "U art. 29",
    title: "Prawo do zasiłku macierzyńskiego",
    actTitle: U_ACT,
    url: U_URL,
    notes:
      "Urodzenie dziecka, przyjęcie na wychowanie w celu przysposobienia, rodzina zastępcza (z wyjątkiem zawodowej).",
  },
  {
    citation: "U art. 29a",
    title: "Okres wypłaty zasiłku macierzyńskiego",
    actTitle: U_ACT,
    url: U_URL,
    notes:
      "Okres urlopu macierzyńskiego, na warunkach macierzyńskiego, uzupełniającego, rodzicielskiego i ojcowskiego.",
  },
  {
    citation: "U art. 30a",
    title: "Wniosek o zasiłek macierzyński w wariancie 81,5%",
    actTitle: U_ACT,
    url: U_URL,
    notes:
      "Wniosek matki nie później niż 21 dni po porodzie; nie obejmuje 9 tygodni drugiego rodzica.",
  },
  {
    citation: "U art. 31",
    title: "Wysokość zasiłku macierzyńskiego",
    actTitle: U_ACT,
    url: U_URL,
    notes:
      "100% za macierzyński i ojcowski, 70% za rodzicielski, 81,5% w wariancie z wnioskiem; 9 tygodni drugiego rodzica — 70%.",
  },
  {
    citation: "U art. 33",
    title: "Zasiłek opiekuńczy — limity dni",
    actTitle: U_ACT,
    url: U_URL,
    notes:
      "60 dni na dzieci do 14 lat, 30 dni na dziecko z niepełnosprawnością 14–18 lat, 14 dni na innych członków rodziny; łącznie 60 dni.",
  },
  {
    citation: "U art. 36",
    title: "Podstawa wymiaru zasiłku",
    actTitle: U_ACT,
    url: U_URL,
    notes:
      "Przeciętne miesięczne wynagrodzenie/przychód z 12 miesięcy poprzedzających, po potrąceniach.",
  },
  {
    citation: "U art. 38",
    title: "Podstawa wymiaru zasiłku — zasady szczególne",
    actTitle: U_ACT,
    url: U_URL,
    notes:
      "Uzupełnianie podstawy, krótszy okres ubezpieczenia i inne przypadki.",
  },
  {
    citation: "U art. 67",
    title: "Przedawnienie roszczenia o wypłatę zasiłku",
    actTitle: U_ACT,
    url: U_URL,
    notes:
      "6 miesięcy od ostatniego dnia okresu, za który zasiłek przysługuje; 3 lata w razie błędu płatnika lub ZUS.",
  },
]
