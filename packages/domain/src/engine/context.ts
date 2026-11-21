import type { RuleSet, RuleSetParameters } from "./rulesets"
import type { RuleId } from "./sources"
import type {
  AssessmentInput,
  BenefitType,
  MissingEvidence,
  ParentRole,
  UnsupportedScenario,
  Warning,
} from "./types"

/**
 * Assumptions the engine relies on. Each one is either a documented reading
 * of the sources or a convention the sources leave open. They are listed in
 * every assessment that depends on them and in docs/legal-assumptions.md.
 */
export const ASSUMPTIONS = {
  "A-03": "Kwoty są brutto, przed zaliczką na podatek dochodowy (PIT). Sposób obliczenia zaliczki nie wynika z udostępnionych źródeł.",
  "A-12": "Stosujemy wersję przepisów obowiązującą w dniu powstania prawa (poród, przyjęcie dziecka, początek niezdolności) do całego okresu świadczenia.",
  "A-17": "Przy adopcji i rodzinie zastępczej, gdy limit wieku dziecka skróciłby urlop na warunkach urlopu macierzyńskiego poniżej 9 tygodni, stosujemy 9 tygodni oraz 38 (62 przy „Za życiem”) tygodni urlopu rodzicielskiego (KP art. 183 § 3, § 4 pkt 3; kwestia Q-30).",
  "A-19": "Zasiłek za okres odpowiadający uzupełniającemu urlopowi macierzyńskiemu liczymy także ubezpieczonym niebędącym pracownikami (U art. 29a ust. 1, R1316 § 26), mimo że Poradnik wymienia tylko pracowników (kwestia Q-32).",
  "A-20": "Obliczenia pieniężne są dokładne (ułamki zwykłe). Podstawę wymiaru zaokrąglamy do pełnych groszy, a kwotę każdej pozycji — raz, na końcu — do pełnych groszy, połówki w górę. Źródła nie określają zasad zaokrąglania (Q-15).",
  "A-21": "Dzień porodu jest 1. dniem urlopu macierzyńskiego (KP art. 183¹ § 2); „N-ty dzień po porodzie” to N-ty dzień licząc dzień porodu jako pierwszy, a „upływ N-tego tygodnia po porodzie” to koniec dnia poród + 7·N − 1.",
  "A-22": "Uprawnienie trwające „do ukończenia przez dziecko N lat (miesięcy)” kończy się w dniu poprzedzającym odpowiednią rocznicę urodzin; dziecko „w wieku do N lat” to dziecko, które nie ukończyło N lat.",
  "A-23": "Termin „N dni po zdarzeniu” upływa w dniu zdarzenie + N (dnia zdarzenia nie liczymy); „7 dni od dnia zgonu” to 7 dni następujących po dniu zgonu. Reguła liczenia terminów nie jest zawarta w udostępnionych źródłach.",
  "A-24": "Gdy dziecko jeszcze się nie urodziło, okresy i terminy liczymy od przewidywanej daty porodu; przesuną się, jeśli poród nastąpi w innym dniu.",
  "A-25": "Każdy z rodziców ma wyłączne prawo do 9 tygodni urlopu rodzicielskiego (KP art. 182¹a § 4). Jeden rodzic może więc wykorzystać najwyżej pulę pomniejszoną o 9 tygodni — także wtedy, gdy drugi rodzic nie ma prawa do zasiłku. Źródła nie przewidują przeniesienia tych 9 tygodni.",
  "A-26": "W wariancie 81,5% zasiłek za urlop macierzyński wykorzystany przed porodem wynosi 100% (Poradnik ZUS s. 33); źródła nie opisują rozliczenia tej różnicy, więc jej nie potrącamy.",
  "A-27": "Część urlopu macierzyńskiego przejęta przez ojca jest płatna według stawki obowiązującej za urlop macierzyński (100% albo 81,5% przy wniosku matki), bo U art. 31 ust. 3 obejmuje „cały okres” urlopu macierzyńskiego, a R1316 § 20 wymaga informacji o stawce wypłaconej matce. Podstawą jest podstawa wymiaru ojca.",
  "A-28": "Limit 5 części urlopu rodzicielskiego liczymy łącznie dla obojga rodziców (KP art. 182¹c, art. 182¹d § 2).",
  "A-30": "Zasiłek w wysokości zasiłku macierzyńskiego przysługuje od dnia następującego po ustaniu zatrudnienia do dnia poprzedzającego poród; od dnia porodu przysługuje zasiłek macierzyński (U art. 30 ust. 1 i 3).",
  "A-31": "Przy porodzie mnogim, w którym część dzieci zmarła, wymiar urlopu rodzicielskiego ustalamy według liczby dzieci urodzonych przy jednym porodzie (KP art. 182¹a § 1 odsyła do art. 180 § 1, czyli do porodu).",
  "A-32": "W historii miesięcznej uwzględniamy tylko 12 miesięcy kalendarzowych poprzedzających miesiąc powstania prawa (U art. 36 ust. 1, art. 48 ust. 1); inne miesiące pomijamy.",
  "A-33": "Dla pracowników odliczamy od wynagrodzenia brutto 13,71% (Poradnik ZUS s. 24). Ustawa (art. 3 pkt 3) mówi o faktycznie potrąconych składkach — przy przekroczeniu rocznego limitu składek podstawa może być wyższa.",
  "A-34": "Podwyższenie do kwoty świadczenia rodzicielskiego (U art. 31 ust. 3a–3c) liczymy proporcjonalnie: (kwota świadczenia − miesięczny zasiłek) × dni / 30.",
  "A-35": "Wydłużenie urlopu rodzicielskiego przy łączeniu z pracą liczymy dokładnie (dni × wymiar pracy, a przy pracy w części wydłużonej — podzielone przez 1 − wymiar), a niepełny dzień pomijamy raz, na końcu (KP art. 182¹f § 2, § 4, § 7).",
  "A-36": "Przy adopcji i rodzinie zastępczej rolę „MOTHER” ma rodzic korzystający z urlopu na warunkach urlopu macierzyńskiego, a „FATHER” — drugi rodzic.",
} as const

export type AssumptionId = keyof typeof ASSUMPTIONS

/** Scenarios the engine does not decide. Detected ones also appear in the assessment. */
export const UNSUPPORTED_SCENARIOS = {
  "U-01": "Zdarzenia sprzed 1.07.2026 r. — brak tekstu przepisów w tej wersji w udostępnionych źródłach.",
  "U-02": "Kilka tytułów ubezpieczenia jednocześnie (np. etat i zlecenie) — zasiłek ustala się odrębnie z każdego tytułu; silnik ocenia jeden tytuł na rodzica.",
  "U-03": "Przejęcie urlopu przez „innego członka najbliższej rodziny” — ustawa odsyła do definicji, której brak w wyciągu (Q-31).",
  "U-04": "Kwoty netto (po zaliczce na PIT) — sposób obliczenia zaliczki nie wynika ze źródeł.",
  "U-05": "Kwota świadczenia rehabilitacyjnego — wymaga wskaźnika waloryzacji ogłaszanego przez Prezesa ZUS i orzeczenia lekarza orzecznika.",
  "U-06": "Składniki wynagrodzenia kwartalne, roczne i zachowywane w czasie zasiłku (U art. 41–42) — podaj kwoty miesięczne po ich uwzględnieniu albo podstawę z zaświadczenia płatnika.",
  "U-07": "Poród lub zdarzenia za granicą i dokumenty zagraniczne (R1316 § 7–9, § 14) — wymagana weryfikacja przez ZUS.",
  "U-08": "Urlop wychowawczy, zasiłek opiekuńczy i świadczenie rodzicielskie z ustawy o świadczeniach rodzinnych — poza zakresem silnika.",
  "U-09": "Rozliczenie wariantu 81,5%, gdy po wniosku nie wykorzystano całego urlopu rodzicielskiego (poza przypadkiem z U art. 31 ust. 3g) — źródła nie opisują rozliczenia.",
  "U-10": "Przeniesienie 9 tygodni urlopu rodzicielskiego, gdy drugi rodzic zmarł, nie ma prawa do urlopu albo jest nieubezpieczony — źródła tego nie przewidują (A-25).",
  "U-11": "Urlop rodzicielski rodziny zastępczej dla dziecka, które ukończyło 6 lat — termin z KP art. 182¹c koliduje z art. 183.",
  "U-12": "Ubezpieczenie rolnicze (KRUS) i służby mundurowe — inne przepisy.",
  "U-13": "Sumowanie wcześniejszych niezdolności do pracy w okresie zasiłkowym (U art. 9) — silnik przyjmuje podaną liczbę dni już wykorzystanych.",
  "U-14": "Późny poród po urlopie wykorzystanym przed porodem, gdy po porodzie zostaje mniej niż 14 tygodni (Q-26).",
  "U-15": "Górny limit podstawy zasiłku chorobowego po ustaniu ubezpieczenia (U art. 46) — wymaga kwoty przeciętnego wynagrodzenia, której brak w źródłach.",
  "U-16": "Wyższe wynagrodzenie chorobowe z przepisów zakładowych (KP art. 92 § 1) — przyjmujemy stawki ustawowe.",
  "U-17": "Urlop ojcowski ojca w rodzinie zastępczej — KP art. 182³ obejmuje ojca dziecka i ojca adopcyjnego.",
  "U-18": "Weryfikacja danych w systemach ZUS (okresy ubezpieczenia, zadłużenie) — dane pochodzą od użytkownika lub z symulacji.",
  "U-19": "Oficjalne przykładowe sprawy ZUS — nie zostały udostępnione zespołowi, więc nie służą jako przypadki wzorcowe.",
  "U-20": "Zasiłek macierzyński przy umieszczeniu dziecka w pieczy lub placówce i powrocie dziecka — silnik kończy urlop zgodnie z KP art. 182, bez wznowienia.",
} as const

export type UnsupportedId = keyof typeof UNSUPPORTED_SCENARIOS

export const DISCLAIMER =
  "Szacunek informacyjny na podstawie podanych danych i wersjonowanych reguł z przepisów udostępnionych przez ZUS. To nie jest decyzja ZUS ani płatnika składek. Prawo do zasiłku i jego wysokość ustala ZUS albo uprawniony płatnik."

export const ZUS_CONTACT = "infolinia ZUS 22 560 16 00, e-mail cot@zus.pl (Poradnik ZUS)"

export class EvaluationContext {
  readonly input: AssessmentInput
  readonly ruleSet: RuleSet
  readonly p: RuleSetParameters
  readonly asOf: string

  private readonly usedRules = new Set<RuleId>()
  private readonly assumptionIds = new Set<AssumptionId>()
  private readonly unsupportedIds = new Set<UnsupportedId>()
  readonly warnings: Warning[] = []
  readonly manualReview: string[] = []
  readonly planAdjustments: string[] = []
  private readonly missing = new Map<string, MissingEvidence>()

  constructor(input: AssessmentInput, ruleSet: RuleSet) {
    this.input = input
    this.ruleSet = ruleSet
    this.p = ruleSet.parameters
    this.asOf = input.asOf
  }

  use(...ids: RuleId[]): void {
    for (const id of ids) this.usedRules.add(id)
  }

  assume(...ids: AssumptionId[]): void {
    for (const id of ids) this.assumptionIds.add(id)
  }

  unsupported(id: UnsupportedId): void {
    this.unsupportedIds.add(id)
  }

  warn(warning: Warning): void {
    const duplicate = this.warnings.some(
      (existing) => existing.code === warning.code && existing.parent === warning.parent
    )
    if (!duplicate) {
      this.warnings.push(warning)
      if (warning.ruleId) this.use(warning.ruleId)
    }
  }

  review(reason: string): void {
    if (!this.manualReview.includes(reason)) this.manualReview.push(reason)
  }

  adjust(note: string): void {
    if (!this.planAdjustments.includes(note)) this.planAdjustments.push(note)
  }

  need(entry: Omit<MissingEvidence, "affects"> & { affects: BenefitType | BenefitType[] }): void {
    const affects = Array.isArray(entry.affects) ? entry.affects : [entry.affects]
    const key = `${entry.parent ?? "-"}:${entry.key}`
    const existing = this.missing.get(key)
    if (existing) {
      for (const benefit of affects) {
        if (!existing.affects.includes(benefit)) existing.affects.push(benefit)
      }
      return
    }
    this.missing.set(key, { ...entry, affects: [...affects] })
  }

  parent(role: ParentRole) {
    return this.input.parents.find((parent) => parent.role === role)
  }

  get rulesUsed(): RuleId[] {
    return [...this.usedRules].sort()
  }

  get assumptions(): string[] {
    return [...this.assumptionIds].sort().map((id) => `${id}: ${ASSUMPTIONS[id]}`)
  }

  get unsupportedList(): UnsupportedScenario[] {
    return [...this.unsupportedIds].sort().map((code) => ({ code, text: UNSUPPORTED_SCENARIOS[code] }))
  }

  get missingEvidence(): MissingEvidence[] {
    return [...this.missing.values()]
  }
}
