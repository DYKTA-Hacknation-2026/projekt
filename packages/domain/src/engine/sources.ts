/**
 * Official source documents and the catalogue of rules the engine applies.
 *
 * Only documents provided by ZUS for the competition are sources (assumption
 * A-01). Every rule names the exact provision it implements; a rule without a
 * provision does not exist in the engine. Rule IDs follow
 * docs/requirements.md §6 (LR-xx) so the traceability matrix stays valid.
 */

export type SourceCode = "T" | "U" | "KP" | "R1316" | "R322" | "P"

export interface SourceDocument {
  code: SourceCode
  title: string
  citation: string
  /** Legal state described by the document. */
  stateAsOf?: string
}

export const SOURCE_DOCUMENTS: Record<SourceCode, SourceDocument> = {
  T: {
    code: "T",
    title: "ZUS — Pełna treść zadania konkursowego „Zasiłkowy Przewodnik Przyszłego Rodzica”",
    citation: "HackNation 2026, materiał ZUS",
  },
  U: {
    code: "U",
    title:
      "Ustawa z dnia 25 czerwca 1999 r. o świadczeniach pieniężnych z ubezpieczenia społecznego w razie choroby i macierzyństwa",
    citation: "Dz.U. z 2026 r. poz. 854 (wyciąg ZUS)",
  },
  KP: {
    code: "KP",
    title: "Ustawa z dnia 26 czerwca 1974 r. — Kodeks pracy",
    citation: "Dz.U. z 2026 r. poz. 1245 (wyciąg ZUS)",
  },
  R1316: {
    code: "R1316",
    title:
      "Rozporządzenie MRPiPS z dnia 27 września 2026 r. w sprawie zakresu informacji o okolicznościach mających wpływ na prawo do zasiłków … oraz dokumentów niezbędnych do przyznania i wypłaty zasiłków",
    citation: "Dz.U. z 2026 r. poz. 1316",
  },
  R322: {
    code: "R322",
    title:
      "Rozporządzenie MRPiPS z dnia 11 marca 2025 r. w sprawie wniosków dotyczących uprawnień pracowników związanych z rodzicielstwem",
    citation: "Dz.U. z 2025 r. poz. 322",
  },
  P: {
    code: "P",
    title: "ZUS — Poradnik dla rodziców i opiekunów dzieci (2026)",
    citation: "ZUS 2026",
    stateAsOf: "2026-04-01",
  },
}

export interface SourceRef {
  code: SourceCode
  /** Provision or page, e.g. "art. 31 ust. 3" or "s. 33". */
  locator: string
}

/** "U art. 31 ust. 3" */
export function formatSourceRef(ref: SourceRef): string {
  return `${ref.code} ${ref.locator}`
}

export function src(code: SourceCode, locator: string): SourceRef {
  return { code, locator }
}

export type Verification =
  /** Backed by statute, regulation or the ZUS guide. */
  | "VERIFIED_ZUS"
  /** Backed by the task text only. */
  | "VERIFIED_T"
  /** Our documented reading or convention; see assumptions. */
  | "ASSUMPTION"

export interface RuleDefinition {
  id: string
  title: string
  sources: SourceRef[]
  verification: Verification
  /** First day the rule applies (inclusive), when narrower than the rule set. */
  validFrom?: string
  /** Last day the rule applies (inclusive). */
  validTo?: string
  /** Open question or assumption id from docs/legal-assumptions.md. */
  openQuestion?: string
}

function rule(
  id: string,
  title: string,
  sources: SourceRef[],
  extra: Partial<Omit<RuleDefinition, "id" | "title" | "sources">> = {}
): RuleDefinition {
  return { id, title, sources, verification: "VERIFIED_ZUS", ...extra }
}

export const RULES = {
  // Coverage, routing, sickness
  "LR-100": rule("LR-100", "Okres wyczekiwania na zasiłek chorobowy (30/90 dni, przerwy do 30 dni)", [src("U", "art. 4 ust. 1–2")]),
  "LR-101": rule("LR-101", "Prawo do zasiłku chorobowego od pierwszego dnia ubezpieczenia", [src("U", "art. 4 ust. 3")]),
  "LR-102": rule("LR-102", "Zasiłek chorobowy po ustaniu tytułu ubezpieczenia", [src("U", "art. 7"), src("U", "art. 8 ust. 2")]),
  "LR-103": rule("LR-103", "Okres zasiłkowy: 182 dni, 270 dni w ciąży", [src("U", "art. 8 ust. 1"), src("U", "art. 9 ust. 1–3")]),
  "LR-103A": rule("LR-103A", "Jeden okres zasiłkowy niezależnie od liczby tytułów", [src("U", "art. 9 ust. 4")], { validFrom: "2027-01-01" }),
  "LR-104": rule("LR-104", "Zasiłek chorobowy w ciąży: 100% podstawy za każdy dzień", [src("U", "art. 11 ust. 2 pkt 1, ust. 4–5"), src("T", "s. 4")]),
  "LR-106": rule("LR-106", "Wynagrodzenie chorobowe pracownika: 33 dni (14 dni po 50. roku życia), 100% w ciąży", [src("KP", "art. 92 § 1–5")]),
  "LR-107": rule("LR-107", "Świadczenie rehabilitacyjne: do 12 miesięcy, 90%/75%, 100% w ciąży", [src("U", "art. 18–19")]),
  "LR-108": rule("LR-108", "Zadłużenie składkowe przedsiębiorcy powyżej 1% minimalnego wynagrodzenia wstrzymuje świadczenia", [src("U", "art. 2a"), src("U", "art. 64 ust. 3")]),
  "LR-109": rule("LR-109", "Kto wypłaca zasiłek: płatnik powyżej 20 ubezpieczonych albo ZUS", [src("U", "art. 61 ust. 1–2"), src("P", "s. 23")]),
  "LR-110": rule("LR-110", "Przedawnienie roszczenia: 6 miesięcy od końca okresu (3 lata przy błędzie)", [src("U", "art. 67")]),
  "LR-111": rule("LR-111", "Wszczęcie postępowania i forma wniosków do ZUS", [src("U", "art. 61b")], { validFrom: "2026-07-01" }),
  "LR-05": rule("LR-05", "Formularze: ZUR i ZAO połączone w ZAM, zniesienie Z-3b", [src("T", "s. 12 przyp. 3–5")], { verification: "VERIFIED_T", validFrom: "2026-10-24", openQuestion: "Q-33" }),

  // Basis
  "LR-112": rule("LR-112", "Podstawa wymiaru pracownika: przeciętne wynagrodzenie z 12 miesięcy po odliczeniu składek", [src("U", "art. 3 pkt 3"), src("U", "art. 36"), src("U", "art. 38"), src("P", "s. 24")]),
  "LR-113": rule("LR-113", "Podstawa przy ubezpieczeniu krótszym niż pełny miesiąc", [src("U", "art. 37"), src("U", "art. 49")]),
  "LR-115": rule("LR-115", "Minimalna podstawa przy pełnym etacie: minimalne wynagrodzenie po odliczeniu 13,71%", [src("U", "art. 45")], { openQuestion: "Q-29" }),
  "LR-116": rule("LR-116", "Podstawa wymiaru niepracownika: przeciętny przychód z 12 miesięcy (podstawa składek − 13,71%)", [src("U", "art. 3 pkt 4"), src("U", "art. 48"), src("P", "s. 25")]),
  "LR-117": rule("LR-117", "Zadeklarowana podstawa przy ubezpieczeniu krótszym niż 12 miesięcy", [src("U", "art. 48a")]),
  "LR-119": rule("LR-119", "Zasady podstawy stosuje się do zasiłku macierzyńskiego i świadczeń pokrewnych; brak ponownego ustalania przy przerwie krótszej niż miesiąc", [src("U", "art. 43"), src("U", "art. 47"), src("U", "art. 52"), src("P", "s. 28")]),

  // Maternity entitlement
  "LR-120": rule("LR-120", "Zasiłek macierzyński wymaga ubezpieczenia chorobowego w dniu porodu lub przyjęcia dziecka", [src("U", "art. 29 ust. 1–2"), src("P", "s. 29")]),
  "LR-120A": rule("LR-120A", "Zawodowa rodzina zastępcza nie ma prawa do zasiłku macierzyńskiego", [src("U", "art. 29 ust. 1 pkt 3"), src("KP", "art. 183 § 1")]),
  "LR-121": rule("LR-121", "Zasiłek macierzyński po ustaniu ubezpieczenia w ciąży (śmierć, upadłość, likwidacja pracodawcy, bezprawne rozwiązanie)", [src("U", "art. 30 ust. 1"), src("R1316", "§ 15")]),
  "LR-121A": rule("LR-121A", "Zasiłek w wysokości zasiłku macierzyńskiego do dnia porodu", [src("U", "art. 30 ust. 3"), src("R1316", "§ 17"), src("T", "s. 4")]),
  "LR-122": rule("LR-122", "Umowa terminowa przedłużona do dnia porodu daje zasiłek macierzyński po ustaniu ubezpieczenia", [src("KP", "art. 177 § 3–3¹"), src("U", "art. 30 ust. 4")]),

  // Durations
  "LR-123": rule("LR-123", "Urlop macierzyński: 20/31/33/35/37 tygodni; do 6 tygodni przed porodem", [src("KP", "art. 180 § 1–3"), src("KP", "art. 183¹")]),
  "LR-123A": rule("LR-123A", "Matka wykorzystuje osobiście 14 tygodni; rezygnacja na rzecz ojca", [src("KP", "art. 180 § 4–5, § 8–9"), src("U", "art. 29 ust. 3"), src("T", "s. 7")]),
  "LR-124": rule("LR-124", "Przejęcie urlopu macierzyńskiego przez ojca w sytuacjach szczególnych", [src("KP", "art. 180 § 6–17"), src("U", "art. 29 ust. 5–10"), src("U", "art. 29a ust. 2")]),
  "LR-125": rule("LR-125", "Urodzenie martwego dziecka lub zgon dziecka", [src("KP", "art. 180¹"), src("KP", "art. 182¹g"), src("T", "s. 6"), src("P", "s. 33")]),
  "LR-125A": rule("LR-125A", "Porzucenie dziecka lub umieszczenie w pieczy — urlop nie krótszy niż 8 tygodni", [src("KP", "art. 182"), src("R1316", "§ 19")]),
  "LR-125B": rule("LR-125B", "Dziecko wymagające opieki szpitalnej — reszta urlopu po wypisie", [src("KP", "art. 181")]),
  "LR-126": rule("LR-126", "Uzupełniający urlop macierzyński (wcześniak, hospitalizacja)", [src("KP", "art. 180²"), src("KP", "art. 183 § 3¹"), src("T", "s. 8")]),
  "LR-127": rule("LR-127", "Urlop rodzicielski: 41/43 (65/67) tygodni, 9 tygodni nieprzenoszalnych, do 5 części", [src("KP", "art. 182¹a"), src("KP", "art. 182¹c"), src("KP", "art. 182¹d"), src("U", "art. 29a ust. 3")]),
  "LR-128": rule("LR-128", "Łączenie urlopu rodzicielskiego z pracą (do ½ etatu) i proporcjonalne wydłużenie", [src("KP", "art. 182¹e"), src("KP", "art. 182¹f")]),
  "LR-129": rule("LR-129", "Urlop na warunkach urlopu macierzyńskiego i rodzicielski przy adopcji i rodzinie zastępczej", [src("KP", "art. 183 § 1–1¹, § 4–4⁶, § 6–8"), src("U", "art. 29 ust. 1 pkt 2–3")]),
  "LR-129A": rule("LR-129A", "Gwarantowane 9 tygodni urlopu na warunkach urlopu macierzyńskiego i 38 (62) tygodni rodzicielskiego", [src("KP", "art. 183 § 3, § 4 pkt 3, § 4², § 4³ pkt 3, § 4⁵")], { verification: "ASSUMPTION", openQuestion: "Q-30" }),

  // Rates and amounts
  "LR-130": rule("LR-130", "Stawki: 100% (macierzyński, na warunkach macierzyńskiego, uzupełniający, ojcowski), 70% (rodzicielski)", [src("U", "art. 31 ust. 1–2"), src("T", "s. 9")]),
  "LR-130A": rule("LR-130A", "81,5% za cały okres na wniosek matki złożony do 21 dni po porodzie (przyjęciu dziecka)", [src("U", "art. 30a ust. 1–4"), src("U", "art. 31 ust. 3"), src("T", "s. 9")]),
  "LR-130B": rule("LR-130B", "9 tygodni drugiego rodzica zawsze 70%", [src("U", "art. 31 ust. 3f"), src("P", "s. 34")]),
  "LR-130C": rule("LR-130C", "Brak urlopu rodzicielskiego w 1. roku życia: 70% i wyrównanie macierzyńskiego do 100%", [src("U", "art. 31 ust. 3g, ust. 4")]),
  "LR-130D": rule("LR-130D", "Zasiłek za urlop macierzyński przed porodem: 100%", [src("P", "s. 27, s. 33")]),
  "LR-131": rule("LR-131", "Praca w trakcie urlopu rodzicielskiego proporcjonalnie obniża zasiłek", [src("U", "art. 31 ust. 4a")]),
  "LR-132": rule("LR-132", "Podwyższenie zasiłku do kwoty świadczenia rodzicielskiego", [src("U", "art. 31 ust. 3a–3c"), src("R1316", "§ 28")], { openQuestion: "Q-29" }),
  "LR-MONEY": rule("LR-MONEY", "Zasiłek miesięczny = stawka × podstawa; za dzień 1/30; kwota brutto przed zaliczką PIT", [src("U", "art. 36 ust. 3"), src("U", "art. 11 ust. 4–5"), src("U", "art. 31 ust. 5"), src("P", "s. 24")]),
  "LR-ROUND": rule("LR-ROUND", "Zaokrąglenie do pełnych groszy (połówki w górę) raz na pozycję wyliczenia", [], { verification: "ASSUMPTION", openQuestion: "Q-15" }),

  // Paternity
  "LR-133": rule("LR-133", "Urlop ojcowski: do 2 tygodni, w 1–2 częściach po min. tydzień, do 12. miesiąca życia dziecka", [src("KP", "art. 182³"), src("R1316", "§ 33"), src("T", "s. 8")]),

  // Procedure, documents and deadlines
  "LR-134": rule("LR-134", "Terminy wniosków pracowniczych", [src("KP", "art. 180 § 8–9"), src("KP", "art. 180² § 4"), src("KP", "art. 182¹d § 1"), src("KP", "art. 182¹e § 2"), src("KP", "art. 182³ § 2"), src("KP", "art. 183 § 6"), src("R322", "§ 2–18")]),
  "LR-135": rule("LR-135", "Dokumenty niezbędne do przyznania i wypłaty zasiłku", [src("R1316", "§ 2–33")]),
  "LR-136": rule("LR-136", "Zasiłek pogrzebowy 7000 zł przy urodzeniu martwego dziecka", [src("P", "s. 35")]),
  "LR-137": rule("LR-137", "Wyrejestrowanie z dobrowolnego ubezpieczenia chorobowego z chwilą pobierania zasiłku macierzyńskiego", [src("P", "s. 35")]),

  // Risks and protection
  "LR-70": rule("LR-70", "Umowa lub działalność dla pozoru — decyzja o niepodleganiu ubezpieczeniu", [src("T", "s. 9–10")], { verification: "VERIFIED_T" }),
  "LR-71": rule("LR-71", "Podwyższenie podstawy składek w ciąży — możliwa decyzja o niższej podstawie", [src("T", "s. 10")], { verification: "VERIFIED_T" }),
  "LR-72": rule("LR-72", "Brak ubezpieczenia chorobowego w dniu porodu", [src("T", "s. 10"), src("U", "art. 29 ust. 1")]),
  "LR-80": rule("LR-80", "Szczególna ochrona stosunku pracy w ciąży i w czasie urlopów", [src("KP", "art. 177 § 1, § 1¹, § 4")]),
  "LR-82": rule("LR-82", "Ochrona z Kodeksu pracy nie dotyczy osób, które nie są pracownikami", [src("T", "s. 10")], { verification: "VERIFIED_T" }),
} as const satisfies Record<string, RuleDefinition>

export type RuleId = keyof typeof RULES

export function ruleSources(id: RuleId): SourceRef[] {
  return RULES[id].sources
}

export function ruleCitation(id: RuleId): string {
  return RULES[id].sources.map(formatSourceRef).join("; ")
}
