import type { DocumentDefinition, SourceDefinition } from "./types"

/**
 * Registry of knowledge sources. Adding or updating an official source is a
 * change to this file (see docs/knowledge-sources.md).
 *
 * Access policy:
 * - Statutes and regulations are public law (art. 4 of the Polish copyright
 *   act) → PUBLIC / ALLOWED for our curated excerpts.
 * - Copies provided by ZUS for HackNation (Legalis extracts, the 2026
 *   guide, the task document) may only be used inside the project
 *   ("nie wolno kopiować ani rozpowszechniać") → INTERNAL / CITATION_ONLY.
 *   They are never committed; they are read from KB_LOCAL_SOURCES_DIR.
 * - ZUS sample cases are RESTRICTED: the pipeline refuses to index them.
 */
export const SOURCES: SourceDefinition[] = [
  {
    slug: "ustawa-zasilkowa",
    title:
      "Ustawa o świadczeniach pieniężnych z ubezpieczenia społecznego w razie choroby i macierzyństwa",
    publisher: "Sejm RP",
    sourceType: "LEGAL_ACT",
    url: "https://isap.sejm.gov.pl/isap.nsf/DocDetails.xsp?id=WDU19990600636",
    description:
      "Ustawa z dnia 25 czerwca 1999 r. (ustawa zasiłkowa), tekst jedn. Dz.U. z 2026 r. poz. 854.",
    accessLevel: "PUBLIC",
    redistribution: "ALLOWED",
    authorityRank: 100,
  },
  {
    slug: "kodeks-pracy",
    title: "Kodeks pracy — uprawnienia związane z rodzicielstwem",
    publisher: "Sejm RP",
    sourceType: "LEGAL_ACT",
    url: "https://isap.sejm.gov.pl/isap.nsf/DocDetails.xsp?id=WDU19740240141",
    description: "Ustawa z dnia 26 czerwca 1974 r. — Kodeks pracy, Dział ósmy.",
    accessLevel: "PUBLIC",
    redistribution: "ALLOWED",
    authorityRank: 100,
  },
  {
    slug: "rozp-2026-1316",
    title:
      "Rozporządzenie MRPiPS w sprawie dokumentów niezbędnych do przyznania i wypłaty zasiłków",
    publisher: "Minister Rodziny, Pracy i Polityki Społecznej",
    sourceType: "LEGAL_ACT",
    url: "https://dziennikustaw.gov.pl/DU/2026/1316",
    description:
      "Rozporządzenie z dnia 27 września 2026 r. (Dz.U. z 2026 r. poz. 1316).",
    accessLevel: "PUBLIC",
    redistribution: "ALLOWED",
    authorityRank: 90,
  },
  {
    slug: "rozp-2025-322",
    title:
      "Rozporządzenie MRPiPS w sprawie wniosków dotyczących uprawnień pracowników związanych z rodzicielstwem",
    publisher: "Minister Rodziny, Pracy i Polityki Społecznej",
    sourceType: "LEGAL_ACT",
    url: "https://dziennikustaw.gov.pl/DU/2025/322",
    description:
      "Rozporządzenie z dnia 11 marca 2025 r. (Dz.U. z 2025 r. poz. 322).",
    accessLevel: "PUBLIC",
    redistribution: "ALLOWED",
    authorityRank: 90,
  },
  {
    slug: "zus-poradnik-rodzice",
    title: "Poradnik ZUS dla rodziców i opiekunów dzieci",
    publisher: "Zakład Ubezpieczeń Społecznych",
    sourceType: "GUIDE",
    url: "https://www.zus.pl/",
    description:
      "Poradnik ZUS 2026 (stan prawny 2026-04-01). Niższe pierwszeństwo niż ustawy; część treści nieaktualna (D-10, Z-3b).",
    accessLevel: "PUBLIC",
    redistribution: "ATTRIBUTION",
    authorityRank: 60,
  },
  {
    slug: "zus-formularze",
    title: "Formularze i zaświadczenia ZUS — instrukcje",
    publisher: "Zakład Ubezpieczeń Społecznych",
    sourceType: "FORM_INSTRUCTION",
    url: "https://www.zus.pl/baza-wiedzy/wzory-formularzy/zasilki",
    description:
      "ZAM, ZUR, ZAO, Z-3, Z-3a, Z-3b, e-ZLA, Z-15A/B — do czego służą i kto je składa.",
    accessLevel: "PUBLIC",
    redistribution: "ATTRIBUTION",
    authorityRank: 70,
  },
  {
    slug: "tabela-swiadczen",
    title: "Tabela świadczeń związanych z rodzicielstwem",
    publisher:
      "Zasiłkowy Przewodnik (opracowanie na podstawie KP i ustawy zasiłkowej)",
    sourceType: "BENEFIT_TABLE",
    description:
      "Wymiar urlopów i wysokość zasiłku macierzyńskiego z odesłaniem do przepisów.",
    accessLevel: "PUBLIC",
    redistribution: "ALLOWED",
    authorityRank: 80,
  },
  {
    slug: "gov-za-zyciem",
    title: "Program „Za życiem” — informacje rządowe",
    publisher: "gov.pl",
    sourceType: "GOVERNMENT_PAGE",
    url: "https://www.gov.pl/web/rodzina/za-zyciem",
    accessLevel: "PUBLIC",
    redistribution: "ATTRIBUTION",
    authorityRank: 60,
  },
  {
    slug: "organizacje-wsparcia",
    title: "Organizacje wspierające rodziców",
    publisher: "Zasiłkowy Przewodnik (lista kuratorowana)",
    sourceType: "CHARITY_RESOURCE",
    description:
      "Wyłącznie podmioty charytatywne i publiczne; dane kontaktowe wymagają weryfikacji przed publikacją.",
    accessLevel: "PUBLIC",
    redistribution: "ATTRIBUTION",
    authorityRank: 20,
    metadata: { verificationStatus: "UNVERIFIED" },
  },
  {
    slug: "hacknation-zadanie",
    title:
      "HackNation 2026 — opis zadania „Zasiłkowy Przewodnik Przyszłego Rodzica”",
    publisher: "Zakład Ubezpieczeń Społecznych",
    sourceType: "TASK_DOCUMENT",
    description: "Dokument zadania konkursowego. Wyłącznie na użytek projektu.",
    accessLevel: "INTERNAL",
    redistribution: "CITATION_ONLY",
    authorityRank: 40,
  },
  {
    slug: "zus-przykladowe-sprawy",
    title: "Przykładowe sprawy ZUS (zestawy dokumentów)",
    publisher: "Zakład Ubezpieczeń Społecznych",
    sourceType: "INTERNAL",
    description:
      "Poufne. Przeznaczone wyłącznie na użytek HackNation; nie wolno kopiować ani rozpowszechniać. Nigdy nie są indeksowane.",
    accessLevel: "RESTRICTED",
    redistribution: "PROHIBITED",
    authorityRank: 0,
  },
]

const COMPETITION_COPY = {
  accessLevel: "INTERNAL",
  redistribution: "CITATION_ONLY",
  metadata: {
    provenance: "HackNation 2026 — materiały udostępnione przez ZUS",
  },
} as const

export const DOCUMENTS: DocumentDefinition[] = [
  // ---------------------------------------------------------------- curated
  {
    sourceSlug: "ustawa-zasilkowa",
    documentKey: "wybrane-przepisy",
    title: "Ustawa zasiłkowa — wybrane przepisy (brzmienie od 1 lipca 2026 r.)",
    version: "2026-07-01",
    documentType: "LEGAL_EXTRACT",
    externalId: "Dz.U. 2026 poz. 854",
    effectiveFrom: "2026-07-01",
    effectiveTo: "2027-01-01",
    parser: "legal",
    legal: { citationPrefix: "U" },
    origin: { kind: "curated", path: "curated/ustawa-zasilkowa-2026-07.md" },
  },
  {
    sourceSlug: "ustawa-zasilkowa",
    documentKey: "wybrane-przepisy",
    title:
      "Ustawa zasiłkowa — wybrane przepisy (brzmienie od 1 stycznia 2027 r.)",
    version: "2027-01-01",
    documentType: "LEGAL_EXTRACT",
    externalId: "Dz.U. 2026 poz. 854 (zm. Dz.U. 2026 poz. 26)",
    effectiveFrom: "2027-01-01",
    parser: "legal",
    legal: { citationPrefix: "U" },
    origin: { kind: "curated", path: "curated/ustawa-zasilkowa-2027-01.md" },
    metadata: {
      amendment:
        "Art. 9 ust. 4 dodany ustawą z dnia 18.12.2025 r. (Dz.U. z 2026 r. poz. 26)",
    },
  },
  {
    sourceSlug: "kodeks-pracy",
    documentKey: "dzial-osmy",
    title: "Kodeks pracy — urlopy macierzyński, rodzicielski i ojcowski",
    version: "2026",
    documentType: "LEGAL_EXTRACT",
    parser: "legal",
    legal: { citationPrefix: "KP", superscripts: true },
    origin: { kind: "curated", path: "curated/kodeks-pracy-rodzicielstwo.md" },
  },
  {
    sourceSlug: "zus-formularze",
    documentKey: "wnioski-zasilki",
    title: "Wnioski i zaświadczenia ZUS w sprawach zasiłków rodzicielskich",
    version: "2026-11",
    documentType: "FORM_INSTRUCTION",
    effectiveFrom: "2026-10-24",
    parser: "guide",
    origin: { kind: "curated", path: "curated/zus-formularze.md" },
  },
  {
    sourceSlug: "tabela-swiadczen",
    documentKey: "tabela",
    title: "Tabela świadczeń związanych z rodzicielstwem",
    version: "2026-11",
    documentType: "BENEFIT_TABLE",
    effectiveFrom: "2026-07-01",
    parser: "guide",
    origin: { kind: "curated", path: "curated/tabela-swiadczen.md" },
  },
  {
    sourceSlug: "gov-za-zyciem",
    documentKey: "urlop-rodzicielski",
    title: "Program „Za życiem” — wydłużony urlop rodzicielski",
    version: "2026-11",
    documentType: "WEB_PAGE",
    parser: "guide",
    origin: { kind: "curated", path: "curated/za-zyciem.md" },
  },
  {
    sourceSlug: "zus-poradnik-rodzice",
    documentKey: "streszczenie-zasilek-macierzynski",
    title:
      "Zasiłek macierzyński — przewodnik dla rodziców (streszczenie poradnika ZUS)",
    version: "2026-04",
    documentType: "GUIDE_SUMMARY",
    effectiveFrom: "2026-04-01",
    parser: "guide",
    origin: {
      kind: "curated",
      path: "curated/poradnik-zasilek-macierzynski.md",
    },
  },
  {
    sourceSlug: "organizacje-wsparcia",
    documentKey: "lista",
    title: "Organizacje wspierające rodziców",
    version: "2026-11",
    documentType: "CHARITY_LIST",
    parser: "guide",
    origin: { kind: "curated", path: "curated/organizacje-wsparcia.md" },
    tags: ["SUPPORT"],
  },

  // ------------------------------------------- competition copies (local only)
  {
    sourceSlug: "ustawa-zasilkowa",
    documentKey: "wyciag-zus-2026",
    title: "Ustawa zasiłkowa — wyciąg ZUS (Dz.U. 2026 poz. 854)",
    version: "2026-854",
    documentType: "LEGAL_EXTRACT",
    externalId: "Dz.U. 2026 poz. 854",
    effectiveFrom: "2026-07-01",
    parser: "legal",
    legal: { citationPrefix: "U", footnotes: true },
    format: "pdf",
    origin: {
      kind: "local",
      fileName: "ustawa-zasilkowa-2026-854.pdf",
      detect: [
        "swiadczeniach pienieznych z ubezpieczenia spolecznego",
        "dz u z 2026 r poz 854",
      ],
    },
    ...COMPETITION_COPY,
  },
  {
    sourceSlug: "kodeks-pracy",
    documentKey: "wyciag-zus-2026",
    title: "Kodeks pracy — wyciąg ZUS (art. 1–3, 92, 175¹–189¹)",
    version: "2026",
    documentType: "LEGAL_EXTRACT",
    parser: "legal",
    legal: { citationPrefix: "KP", superscripts: true, footnotes: true },
    format: "pdf",
    origin: {
      kind: "local",
      fileName: "kodeks-pracy-wyciag-2026.pdf",
      detect: ["kodeks pracy", "z dnia 26 czerwca 1974 r"],
    },
    ...COMPETITION_COPY,
  },
  {
    sourceSlug: "rozp-2026-1316",
    documentKey: "tekst",
    title:
      "Rozporządzenie w sprawie dokumentów niezbędnych do przyznania i wypłaty zasiłków (Dz.U. 2026 poz. 1316)",
    version: "2026-1316",
    documentType: "REGULATION",
    externalId: "Dz.U. 2026 poz. 1316",
    effectiveFrom: "2026-10-24",
    parser: "legal",
    legal: { citationPrefix: "R1316", footnotes: true },
    format: "pdf",
    origin: {
      kind: "local",
      fileName: "rozporzadzenie-2026-1316.pdf",
      detect: ["dz u z 2026 r poz 1316"],
    },
    ...COMPETITION_COPY,
    metadata: {
      ...COMPETITION_COPY.metadata,
      effectiveDateNote:
        "Wchodzi w życie po 14 dniach od ogłoszenia; data 2026-10-24 przyjęta za docs/rag-architecture.md — do weryfikacji.",
    },
  },
  {
    sourceSlug: "rozp-2025-322",
    documentKey: "tekst",
    title:
      "Rozporządzenie w sprawie wniosków dotyczących uprawnień rodzicielskich (Dz.U. 2025 poz. 322)",
    version: "2025-322",
    documentType: "REGULATION",
    externalId: "Dz.U. 2025 poz. 322",
    effectiveFrom: "2025-03-19",
    parser: "legal",
    legal: { citationPrefix: "R322", footnotes: true },
    format: "pdf",
    origin: {
      kind: "local",
      fileName: "rozporzadzenie-2025-322.pdf",
      detect: ["dz u z 2025 r poz 322"],
    },
    ...COMPETITION_COPY,
  },
  {
    sourceSlug: "zus-poradnik-rodzice",
    documentKey: "poradnik-2026",
    title: "Poradnik dla rodziców i opiekunów dzieci (ZUS, 2026)",
    version: "2026-04",
    documentType: "GUIDE",
    effectiveFrom: "2026-04-01",
    parser: "guide",
    format: "pdf",
    origin: {
      kind: "local",
      fileName: "poradnik-zus-rodzice-2026.pdf",
      detect: ["poradnik dla rodzicow i opiekunow dzieci"],
    },
    ...COMPETITION_COPY,
  },
  {
    sourceSlug: "hacknation-zadanie",
    documentKey: "opis-zadania",
    title: "Opis zadania „Zasiłkowy Przewodnik Przyszłego Rodzica”",
    version: "2026",
    documentType: "TASK_DOCUMENT",
    parser: "guide",
    format: "pdf",
    origin: {
      kind: "local",
      fileName: "hacknation-zadanie.pdf",
      detect: [
        "zasilkowy przewodnik przyszlego rodzica",
        "krotki opis wyzwania",
      ],
    },
    ...COMPETITION_COPY,
  },
]

export function findSource(slug: string): SourceDefinition | undefined {
  return SOURCES.find((source) => source.slug === slug)
}
