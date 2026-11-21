import { deadlineAfter, deadlineBefore } from "./calendar"
import type { EvaluationContext } from "./context"
import type { Schedule } from "./schedule"
import type { BenefitType, Determination, ParentRole } from "./types"

export interface EngineDocument {
  code: string
  name: string
  parent: ParentRole | "BOTH"
  benefits: BenefitType[]
  preparedBy: "YOU" | "OTHER_PARENT" | "EMPLOYER" | "PAYER" | "DOCTOR" | "HOSPITAL" | "COURT" | "CIVIL_REGISTRY" | "ZUS"
  submitTo: "EMPLOYER" | "PAYER" | "ZUS" | "PAYER_OR_ZUS" | "NONE"
  when: string
  dueDate?: string
  legalBasis: string
  provided: boolean
  note?: string
}

export interface DocumentReport {
  formsVersion: string
  documents: EngineDocument[]
  routing: { parent: ParentRole; payer: Determination["payer"]; explanation: string }[]
  notes: string[]
}

const ELIGIBLE = new Set(["ELIGIBLE", "CONDITIONAL", "NEEDS_INPUT", "MANUAL_REVIEW"])

/**
 * Documents needed to claim each applicable benefit (R1316 § 2–33; leave
 * applications per KP and R322). Forms follow the rule set version
 * (ZAM since 24.10.2026, ZUR/ZAO/Z-3b before — T fn. 3–5, A-14).
 */
export function identifyDocuments(
  ctx: EvaluationContext,
  determinations: readonly Determination[],
  schedule: Schedule | null
): DocumentReport {
  ctx.use("LR-135", "LR-134")
  const event = ctx.input.event
  const provided = new Set((ctx.input.providedDocuments ?? []).map((code) => code.toUpperCase()))
  const merged = ctx.p.forms.zamMerged
  if (merged) ctx.use("LR-05")
  const documents: EngineDocument[] = []
  const add = (doc: Omit<EngineDocument, "provided">) => {
    const existing = documents.find((item) => item.code === doc.code && item.parent === doc.parent)
    if (existing) {
      for (const benefit of doc.benefits) if (!existing.benefits.includes(benefit)) existing.benefits.push(benefit)
      return
    }
    documents.push({ ...doc, provided: provided.has(doc.code.toUpperCase()) })
  }

  const active = (benefit: BenefitType, parent: ParentRole) =>
    determinations.some((d) => d.benefit === benefit && d.parent === parent && ELIGIBLE.has(d.status))
  const titleOf = (parent: ParentRole) => ctx.parent(parent)?.insurance?.title
  const payerOf = (parent: ParentRole, benefit: BenefitType) =>
    determinations.find((d) => d.parent === parent && d.benefit === benefit)?.payer ?? "UNKNOWN"

  const birthCertificate = (parent: ParentRole, benefits: BenefitType[], zusPays: boolean) => {
    if (event.kind === "ADOPTION" || event.kind === "FOSTER_CARE") return
    add({
      code: "ODPIS-AU",
      name: zusPays
        ? "Odpis skrócony aktu urodzenia — nie składasz go, gdy zasiłek wypłaca ZUS (ZUS pobiera go z rejestru stanu cywilnego)"
        : "Odpis skrócony aktu urodzenia dziecka (do wglądu płatnikowi)",
      parent,
      benefits,
      preparedBy: "CIVIL_REGISTRY",
      submitTo: zusPays ? "NONE" : "PAYER",
      when: "Po rejestracji urodzenia w urzędzie stanu cywilnego.",
      legalBasis: "R1316 § 13 ust. 1 pkt 2, ust. 2–4",
    })
  }

  const benefitApplication = (parent: ParentRole, benefit: BenefitType, legacy: string, when: string, dueDate?: string) => {
    const title = titleOf(parent)
    if (title === "EMPLOYMENT") return
    add({
      code: merged ? "ZAM" : legacy,
      name: merged
        ? `Wniosek o zasiłek macierzyński ZAM${legacy !== "ZAM" ? ` (dawniej ${legacy})` : ""}`
        : `Wniosek ${legacy}`,
      parent,
      benefits: [benefit],
      preparedBy: "YOU",
      submitTo: title === "SELF_EMPLOYMENT" ? "ZUS" : "PAYER_OR_ZUS",
      when,
      dueDate,
      legalBasis: merged ? "T s. 6, s. 12 przyp. 3–4; R1316 § 12" : "P s. 35; R1316 § 12",
      note: merged ? undefined : "Przed 24.10.2026 r. obowiązywały osobne druki (Poradnik ZUS).",
    })
  }

  const payerCertificate = (parent: ParentRole, benefits: BenefitType[]) => {
    const title = titleOf(parent)
    const zus = benefits.some((benefit) => payerOf(parent, benefit) !== "EMPLOYER")
    if (!zus) return
    if (title === "EMPLOYMENT") {
      add({ code: "Z-3", name: "Zaświadczenie płatnika składek Z-3", parent, benefits, preparedBy: "EMPLOYER", submitTo: "ZUS", when: "Wystawia pracodawca, gdy zasiłek wypłaca ZUS; przekazuje do ZUS w ciągu 7 dni.", legalBasis: "R1316 § 3 ust. 1 pkt 1, ust. 2; T s. 6" })
    } else if (title === "MANDATE") {
      add({ code: "Z-3A", name: "Zaświadczenie płatnika składek Z-3a", parent, benefits, preparedBy: "PAYER", submitTo: "ZUS", when: "Wystawia zleceniodawca, gdy zasiłek wypłaca ZUS.", legalBasis: "R1316 § 3 ust. 1 pkt 2; T s. 6" })
    } else if (title === "SELF_EMPLOYMENT" && !merged) {
      add({ code: "Z-3B", name: "Zaświadczenie płatnika składek Z-3b", parent, benefits, preparedBy: "YOU", submitTo: "ZUS", when: "Razem z wnioskiem.", legalBasis: "P s. 28, s. 35", note: "Druk zniesiony 24.10.2026 r. (T przyp. 5; Q-33)." })
    }
  }

  // ---- Sickness in pregnancy
  if (active("SICKNESS_IN_PREGNANCY", "MOTHER")) {
    add({ code: "E-ZLA", name: "Zwolnienie lekarskie e-ZLA z kodem „B” (ciąża)", parent: "MOTHER", benefits: ["SICKNESS_IN_PREGNANCY", "EMPLOYER_SICK_PAY"], preparedBy: "DOCTOR", submitTo: "NONE", when: "Lekarz wystawia elektronicznie; trafia do ZUS i płatnika.", legalBasis: "U art. 55, art. 57; R1316 § 2; T s. 3" })
    const title = titleOf("MOTHER")
    if (title === "SELF_EMPLOYMENT") {
      const form = ctx.p.forms.selfEmployedSicknessForm
      add({ code: form, name: form === "ZAS-53" ? "Wniosek o zasiłek chorobowy ZAS-53" : "Zaświadczenie płatnika składek Z-3b", parent: "MOTHER", benefits: ["SICKNESS_IN_PREGNANCY"], preparedBy: "YOU", submitTo: "ZUS", when: "Po otrzymaniu zwolnienia lekarskiego.", legalBasis: form === "ZAS-53" ? "T s. 3" : "P s. 26", note: "Poradnik (stan na 1.04.2026) i treść zadania wskazują różne druki (Q-33)." })
    } else {
      payerCertificate("MOTHER", ["SICKNESS_IN_PREGNANCY"])
    }
    if (ctx.parent("MOTHER")?.insurance?.endDate && ctx.input.sickLeave && ctx.input.sickLeave.start > (ctx.parent("MOTHER")?.insurance?.endDate ?? "")) {
      add({ code: "OSW-PO-USTANIU", name: "Oświadczenie do zasiłku za okres po ustaniu tytułu ubezpieczenia (załącznik nr 4)", parent: "MOTHER", benefits: ["SICKNESS_IN_PREGNANCY"], preparedBy: "YOU", submitTo: "ZUS", when: "Razem z wnioskiem o zasiłek.", legalBasis: "R1316 § 4" })
    }
  }
  if (active("REHABILITATION", "MOTHER")) {
    add({ code: "WNIOSEK-REHAB", name: "Wniosek o świadczenie rehabilitacyjne (załącznik nr 5)", parent: "MOTHER", benefits: ["REHABILITATION"], preparedBy: "YOU", submitTo: "ZUS", when: "Przed wyczerpaniem okresu zasiłkowego.", legalBasis: "R1316 § 11 ust. 1 pkt 1" })
    add({ code: "ZASW-STAN-ZDROWIA", name: "Zaświadczenie o stanie zdrowia od lekarza prowadzącego (nie starsze niż miesiąc)", parent: "MOTHER", benefits: ["REHABILITATION"], preparedBy: "DOCTOR", submitTo: "ZUS", when: "Razem z wnioskiem.", legalBasis: "R1316 § 11 ust. 1 pkt 2" })
  }

  // ---- Maternity-equivalent before the birth
  if (active("MATERNITY_EQUIVALENT", "MOTHER")) {
    add({ code: "ZASW-CIAZA-ZATRUDNIENIE", name: "Zaświadczenie lekarskie o stanie ciąży w okresie zatrudnienia", parent: "MOTHER", benefits: ["MATERNITY_EQUIVALENT", "MATERNITY"], preparedBy: "DOCTOR", submitTo: "ZUS", when: "Razem z wnioskiem do ZUS.", legalBasis: "R1316 § 17 pkt 1, § 15 ust. 1 pkt 1" })
    add({ code: "SWIADECTWO-PRACY", name: "Świadectwo pracy lub inny dokument o rozwiązaniu umowy z powodu upadłości, likwidacji albo śmierci pracodawcy", parent: "MOTHER", benefits: ["MATERNITY_EQUIVALENT", "MATERNITY"], preparedBy: "EMPLOYER", submitTo: "ZUS", when: "Razem z wnioskiem do ZUS.", legalBasis: "R1316 § 17 pkt 2, § 15 ust. 1 pkt 2" })
    add({ code: "OSW-BRAK-ZATRUDNIENIA", name: "Oświadczenie, że nie zapewniono innego zatrudnienia", parent: "MOTHER", benefits: ["MATERNITY_EQUIVALENT"], preparedBy: "YOU", submitTo: "ZUS", when: "Razem z wnioskiem do ZUS.", legalBasis: "R1316 § 17 pkt 3" })
  }

  const mother = ctx.parent("MOTHER")
  if (mother?.insurance?.endReason === "UNLAWFUL_TERMINATION_FINAL_JUDGMENT" && active("MATERNITY", "MOTHER")) {
    add({ code: "WYROK-SADU", name: "Prawomocne orzeczenie sądu o rozwiązaniu stosunku pracy z naruszeniem prawa", parent: "MOTHER", benefits: ["MATERNITY"], preparedBy: "COURT", submitTo: "ZUS", when: "Razem z wnioskiem do ZUS.", legalBasis: "R1316 § 15 ust. 2 pkt 2" })
    add({ code: "ZASW-CIAZA-ZATRUDNIENIE", name: "Zaświadczenie lekarskie o stanie ciąży w okresie zatrudnienia", parent: "MOTHER", benefits: ["MATERNITY"], preparedBy: "DOCTOR", submitTo: "ZUS", when: "Razem z wnioskiem do ZUS.", legalBasis: "R1316 § 15 ust. 2 pkt 1" })
  }

  // ---- Maternity (birth)
  for (const parent of ["MOTHER", "FATHER"] as const) {
    if (!active("MATERNITY", parent)) continue
    const title = titleOf(parent)
    const zusPays = payerOf(parent, "MATERNITY") === "ZUS"
    const pre = schedule?.periods.find((period) => period.parent === parent && period.id === "maternity-pre")
    if (parent === "MOTHER") {
      if (title === "EMPLOYMENT") {
        add({ code: "WNIOSEK-URLOP-MACIERZYNSKI", name: "Wniosek o urlop macierzyński (można od razu z urlopem rodzicielskim)", parent, benefits: ["MATERNITY", "PARENTAL"], preparedBy: "YOU", submitTo: "EMPLOYER", when: pre ? "Najpóźniej 14 dni przed rozpoczęciem urlopu przed porodem." : "Po porodzie (urlop zaczyna się w dniu porodu).", dueDate: pre ? deadlineBefore(pre.start, ctx.p.deadlines.preBirthRequestDays) : undefined, legalBasis: "T s. 6; P s. 27; R322" })
      } else {
        benefitApplication(parent, "MATERNITY", "ZAM", "Po porodzie (przed porodem — z zaświadczeniem o przewidywanej dacie porodu).", pre ? deadlineBefore(pre.start, ctx.p.deadlines.preBirthRequestDays) : undefined)
      }
      if (pre) {
        add({ code: "ZASW-TERMIN-PORODU", name: "Zaświadczenie lekarskie o przewidywanej dacie porodu", parent, benefits: ["MATERNITY"], preparedBy: "DOCTOR", submitTo: "PAYER_OR_ZUS", when: "Za okres przed porodem.", legalBasis: "R1316 § 13 ust. 1 pkt 1; KP art. 180 § 2" })
      }
      if (event.stillbirth) {
        add({ code: "ZASW-MARTWE-URODZENIE", name: "Odpis aktu urodzenia z adnotacją o martwym urodzeniu albo zaświadczenie lekarza (położnej) o martwym urodzeniu", parent, benefits: ["MATERNITY"], preparedBy: "DOCTOR", submitTo: "PAYER_OR_ZUS", when: "Za okres od dnia porodu.", legalBasis: "R1316 § 13 ust. 1 pkt 2; P s. 34" })
      } else {
        birthCertificate(parent, ["MATERNITY"], zusPays)
      }
      payerCertificate(parent, ["MATERNITY"])
    } else {
      const takeover = ctx.input.plan?.maternityTakeover
      if (title === "EMPLOYMENT") {
        const fatherStart = schedule?.periods.find((period) => period.id === "maternity-father")?.start
        add({ code: "WNIOSEK-CZESC-URLOPU-MACIERZYNSKIEGO", name: "Wniosek ojca o część urlopu macierzyńskiego", parent, benefits: ["MATERNITY"], preparedBy: "YOU", submitTo: "EMPLOYER", when: "Co najmniej 14 dni przed rozpoczęciem części urlopu.", dueDate: fatherStart ? deadlineBefore(fatherStart, ctx.p.deadlines.takeoverNoticeDays) : undefined, legalBasis: "KP art. 180 § 9, § 16; R322" })
      } else {
        benefitApplication(parent, "MATERNITY", "ZAM", "Przed rozpoczęciem pobierania zasiłku.")
      }
      add({ code: "ZASW-PLATNIKA-MATKA", name: "Zaświadczenie płatnika zasiłku matki o okresie wypłaconego jej zasiłku i stawce", parent, benefits: ["MATERNITY"], preparedBy: "PAYER", submitTo: "PAYER_OR_ZUS", when: "Razem z wnioskiem ojca.", legalBasis: "R1316 § 20 ust. 1 pkt 2" })
      birthCertificate(parent, ["MATERNITY"], zusPays)
      if (takeover?.reason === "MOTHER_DIED" || takeover?.reason === "UNINSURED_MOTHER_DIED") {
        add({ code: "OSW-ZGON-MATKI", name: "Oświadczenie o dniu zgonu matki dziecka", parent, benefits: ["MATERNITY"], preparedBy: "YOU", submitTo: "PAYER_OR_ZUS", when: "Razem z wnioskiem.", legalBasis: "R1316 § 20 ust. 3–4" })
      }
      if (takeover?.reason === "MOTHER_ABANDONED_CHILD" || takeover?.reason === "UNINSURED_MOTHER_ABANDONED_CHILD") {
        add({ code: "OSW-PORZUCENIE", name: "Oświadczenie o porzuceniu dziecka przez matkę", parent, benefits: ["MATERNITY"], preparedBy: "YOU", submitTo: "PAYER_OR_ZUS", when: "Razem z wnioskiem.", legalBasis: "R1316 § 20 ust. 3–4" })
      }
      if (takeover?.reason === "MOTHER_INCAPACITY" || takeover?.reason === "UNINSURED_MOTHER_INCAPACITY") {
        add({ code: "ORZECZENIE-NIEZDOLNOSC", name: "Orzeczenie o niezdolności matki do samodzielnej egzystencji", parent, benefits: ["MATERNITY"], preparedBy: "ZUS", submitTo: "PAYER_OR_ZUS", when: "Razem z wnioskiem.", legalBasis: "R1316 § 21 pkt 4, § 22" })
      }
      if (takeover?.reason === "MOTHER_HOSPITALIZED") {
        add({ code: "ZASW-SZPITAL-MATKA", name: "Zaświadczenia o dacie przyjęcia matki do szpitala i o dacie wypisu", parent, benefits: ["MATERNITY"], preparedBy: "HOSPITAL", submitTo: "PAYER_OR_ZUS", when: "Razem z wnioskiem.", legalBasis: "R1316 § 23 ust. 1 pkt 3–4, § 24" })
      }
      if (takeover?.reason === "UNINSURED_MOTHER_EMPLOYED") {
        add({ code: "OSW-ZATRUDNIENIE-MATKI", name: "Oświadczenie matki o dacie podjęcia zatrudnienia (co najmniej ½ etatu) i oświadczenie ojca o terminie pobierania zasiłku", parent, benefits: ["MATERNITY"], preparedBy: "OTHER_PARENT", submitTo: "PAYER_OR_ZUS", when: "Razem z wnioskiem.", legalBasis: "R1316 § 25" })
      }
      if (takeover?.reason === "MOTHER_RESIGNS_AFTER_14_WEEKS" && mother?.insurance?.title === "EMPLOYMENT") {
        const fatherStart = schedule?.periods.find((period) => period.id === "maternity-father")?.start
        add({ code: "WNIOSEK-REZYGNACJA", name: "Wniosek matki o rezygnację z pozostałej części urlopu macierzyńskiego", parent: "MOTHER", benefits: ["MATERNITY"], preparedBy: "YOU", submitTo: "EMPLOYER", when: "Co najmniej 7 dni przed powrotem do pracy.", dueDate: fatherStart ? deadlineBefore(fatherStart, ctx.p.deadlines.resignationNoticeDays) : undefined, legalBasis: "KP art. 180 § 8; R1316 § 18" })
      }
    }
  }

  // ---- Adoption and foster care
  for (const parent of ["MOTHER", "FATHER"] as const) {
    if (!active("MATERNITY_TERMS", parent)) continue
    const careTaking = event.careTakingDate
    if (titleOf(parent) === "EMPLOYMENT") {
      add({ code: "WNIOSEK-URLOP-NA-WARUNKACH", name: "Wniosek o urlop na warunkach urlopu macierzyńskiego", parent, benefits: ["MATERNITY_TERMS"], preparedBy: "YOU", submitTo: "EMPLOYER", when: "W ciągu 7 dni od przyjęcia dziecka; urlop zaczyna się najpóźniej 21 dni od przyjęcia.", dueDate: careTaking ? deadlineAfter(careTaking, ctx.p.deadlines.maternityTermsRequestDays) : undefined, legalBasis: "KP art. 183 § 6; R322" })
    } else {
      benefitApplication(parent, "MATERNITY_TERMS", "ZAM", "Po przyjęciu dziecka na wychowanie.")
    }
    if (event.kind === "ADOPTION") {
      add({ code: "OSW-DATA-PRZYJECIA", name: "Oświadczenie o dacie przyjęcia dziecka na wychowanie", parent, benefits: ["MATERNITY_TERMS", "PARENTAL"], preparedBy: "YOU", submitTo: "PAYER_OR_ZUS", when: "Razem z wnioskiem.", legalBasis: "R1316 § 16 ust. 1 pkt 1" })
      add({ code: "ZASW-SAD-PRZYSPOSOBIENIE", name: "Zaświadczenie sądu opiekuńczego o dacie wystąpienia o przysposobienie (z datą urodzenia dziecka) albo kopia wniosku z poświadczeniem sądu", parent, benefits: ["MATERNITY_TERMS", "PARENTAL"], preparedBy: "COURT", submitTo: "PAYER_OR_ZUS", when: "Razem z wnioskiem.", legalBasis: "R1316 § 16 ust. 1 pkt 2" })
    } else {
      add({ code: "ORZECZENIE-PIECZA", name: "Orzeczenie sądu o umieszczeniu dziecka w rodzinie zastępczej albo umowa ze starostą", parent, benefits: ["MATERNITY_TERMS", "PARENTAL"], preparedBy: "COURT", submitTo: "PAYER_OR_ZUS", when: "Razem z wnioskiem.", legalBasis: "R1316 § 16 ust. 2 pkt 1" })
      add({ code: "DOKUMENT-WIEK-DZIECKA", name: "Dokument potwierdzający wiek dziecka", parent, benefits: ["MATERNITY_TERMS", "PARENTAL"], preparedBy: "CIVIL_REGISTRY", submitTo: "PAYER_OR_ZUS", when: "Razem z wnioskiem.", legalBasis: "R1316 § 16 ust. 2 pkt 2" })
      if (event.schoolDeferred) {
        add({ code: "DECYZJA-ODROCZENIE", name: "Kopia prawomocnej decyzji o odroczeniu obowiązku szkolnego", parent, benefits: ["MATERNITY_TERMS", "PARENTAL"], preparedBy: "YOU", submitTo: "PAYER_OR_ZUS", when: "Razem z wnioskiem.", legalBasis: "R1316 § 16 ust. 2 pkt 3" })
      }
    }
    payerCertificate(parent, ["MATERNITY_TERMS"])
  }

  // ---- Supplementary
  for (const parent of ["MOTHER", "FATHER"] as const) {
    const period = schedule?.periods.find((item) => item.benefit === "SUPPLEMENTARY_MATERNITY" && item.parent === parent)
    if (!period) continue
    const maternityEnd = schedule?.maternityEnd
    add({ code: "ZASW-SZPITAL-DZIECKO", name: "Zaświadczenie ze szpitala o okresie pobytu dziecka i tygodniu ciąży (masie urodzeniowej)", parent, benefits: ["SUPPLEMENTARY_MATERNITY"], preparedBy: "HOSPITAL", submitTo: "PAYER_OR_ZUS", when: "Razem z wnioskiem.", legalBasis: "KP art. 180² § 5; R1316 § 26 pkt 4" })
    add({ code: "OSW-DRUGI-RODZIC-UZUPELNIAJACY", name: "Oświadczenie drugiego rodzica, że nie zamierza korzystać z uzupełniającego urlopu macierzyńskiego", parent, benefits: ["SUPPLEMENTARY_MATERNITY"], preparedBy: "OTHER_PARENT", submitTo: "PAYER_OR_ZUS", when: "Razem z wnioskiem.", legalBasis: "R1316 § 26 pkt 1; P s. 31" })
    if (titleOf(parent) === "EMPLOYMENT") {
      add({ code: "WNIOSEK-URLOP-UZUPELNIAJACY", name: "Wniosek o uzupełniający urlop macierzyński", parent, benefits: ["SUPPLEMENTARY_MATERNITY"], preparedBy: "YOU", submitTo: "EMPLOYER", when: "Co najmniej 21 dni przed końcem urlopu macierzyńskiego.", dueDate: maternityEnd ? deadlineBefore(maternityEnd, ctx.p.deadlines.supplementaryNoticeDays) : undefined, legalBasis: "KP art. 180² § 4; R322" })
    } else {
      benefitApplication(parent, "SUPPLEMENTARY_MATERNITY", "ZAM", "Przed końcem pobierania zasiłku za urlop macierzyński (R1316 § 26 pkt 3).", maternityEnd ?? undefined)
    }
  }

  // ---- Parental
  for (const parent of ["MOTHER", "FATHER"] as const) {
    const segments = schedule?.periods.filter((item) => item.benefit === "PARENTAL" && item.parent === parent && !item.id.endsWith("extension")) ?? []
    if (segments.length === 0) continue
    const first = segments[0]!
    const title = titleOf(parent)
    if (title === "EMPLOYMENT") {
      add({ code: "WNIOSEK-URLOP-RODZICIELSKI", name: "Wniosek o urlop rodzicielski (osobno dla każdej części)", parent, benefits: ["PARENTAL"], preparedBy: "YOU", submitTo: "EMPLOYER", when: "Co najmniej 21 dni przed rozpoczęciem każdej części.", dueDate: deadlineBefore(first.start, ctx.p.deadlines.parentalNoticeDays), legalBasis: "KP art. 182¹d § 1; R322" })
      if (segments.some((segment) => segment.workFraction)) {
        add({ code: "WNIOSEK-PRACA-W-URLOPIE", name: "Wniosek o łączenie urlopu rodzicielskiego z pracą (z określeniem wykorzystania wydłużenia)", parent, benefits: ["PARENTAL"], preparedBy: "YOU", submitTo: "EMPLOYER", when: "Co najmniej 21 dni przed podjęciem pracy; pracodawca odpowiada w 7 dni.", dueDate: deadlineBefore(segments.find((segment) => segment.workFraction)!.start, ctx.p.deadlines.workCombinationNoticeDays), legalBasis: "KP art. 182¹e § 2, art. 182¹f § 6; R322 § 16" })
      }
    } else {
      benefitApplication(parent, "PARENTAL", "ZUR", "Przed rozpoczęciem korzystania z zasiłku (R1316 § 29 pkt 3).", first.start)
    }
    add({ code: "OSW-DRUGI-RODZIC-RODZICIELSKI", name: "Oświadczenie o okresie, w którym drugi rodzic korzysta (albo nie) z urlopu rodzicielskiego", parent, benefits: ["PARENTAL"], preparedBy: "YOU", submitTo: "PAYER_OR_ZUS", when: "Razem z wnioskiem.", legalBasis: "R1316 § 29 pkt 1, § 30 ust. 1 pkt 1" })
    if (parent === "FATHER" && !active("MATERNITY", "MOTHER") && !active("MATERNITY_TERMS", "MOTHER")) {
      add({ code: "OSW-MATKA-BEZ-TYTULU", name: "Oświadczenie, że matka dziecka nie ma tytułu do ubezpieczenia chorobowego", parent, benefits: ["PARENTAL"], preparedBy: "YOU", submitTo: "PAYER_OR_ZUS", when: "Razem z wnioskiem.", legalBasis: "R1316 § 32 ust. 1 pkt 4" })
    }
    birthCertificate(parent, ["PARENTAL"], payerOf(parent, "PARENTAL") === "ZUS")
    payerCertificate(parent, ["PARENTAL"])
  }

  if (event.zaZyciem) {
    add({ code: "OSW-ZA-ZYCIEM", name: "Oświadczenie, że dziecko ma zaświadczenie „Za życiem”", parent: "BOTH", benefits: ["PARENTAL"], preparedBy: "YOU", submitTo: "PAYER_OR_ZUS", when: "Razem z wnioskiem o zasiłek za wydłużony urlop rodzicielski.", legalBasis: "U art. 61b; T s. 6" })
  }

  const flat = ctx.input.plan?.paymentOption === "FLAT_81_5"
  if (flat && (active("MATERNITY", "MOTHER") || active("MATERNITY_TERMS", "MOTHER"))) {
    const anchor = event.kind === "ADOPTION" || event.kind === "FOSTER_CARE" ? event.careTakingDate : event.birthDate ?? event.expectedDueDate
    add({ code: "WNIOSEK-81,5", name: "Pisemny wniosek o zasiłek macierzyński za urlop macierzyński i rodzicielski w pełnym wymiarze (81,5%)", parent: "MOTHER", benefits: ["MATERNITY", "PARENTAL"], preparedBy: "YOU", submitTo: "PAYER_OR_ZUS", when: "Nie później niż 21 dni po porodzie (przyjęciu dziecka).", dueDate: anchor ? deadlineAfter(anchor, ctx.p.rates.flatApplicationDays) : undefined, legalBasis: "U art. 30a ust. 1–2", note: "Poradnik dopuszcza także deklarację (Q-34)." })
  }

  // ---- Paternity
  if (active("PATERNITY", "FATHER")) {
    const first = schedule?.periods.find((item) => item.benefit === "PATERNITY")
    if (titleOf("FATHER") === "EMPLOYMENT") {
      add({ code: "WNIOSEK-URLOP-OJCOWSKI", name: "Wniosek o urlop ojcowski", parent: "FATHER", benefits: ["PATERNITY"], preparedBy: "YOU", submitTo: "EMPLOYER", when: "Co najmniej 7 dni przed rozpoczęciem urlopu.", dueDate: first ? deadlineBefore(first.start, ctx.p.deadlines.paternityNoticeDays) : undefined, legalBasis: "KP art. 182³ § 2; R322" })
    } else {
      benefitApplication("FATHER", "PATERNITY", "ZAO", "Przed rozpoczęciem okresu, za który ma być wypłacany zasiłek (R1316 § 33 ust. 1 pkt 3).", first?.start)
    }
    add({ code: "OSW-OJCOWSKI-INNY-TYTUL", name: "Oświadczenie, czy zasiłek za urlop ojcowski pobrano z innego tytułu", parent: "FATHER", benefits: ["PATERNITY"], preparedBy: "YOU", submitTo: "PAYER_OR_ZUS", when: "Razem z wnioskiem.", legalBasis: "R1316 § 33 ust. 1 pkt 2" })
    if (event.kind === "ADOPTION") {
      add({ code: "POSTANOWIENIE-PRZYSPOSOBIENIE", name: "Prawomocne postanowienie sądu o przysposobieniu dziecka", parent: "FATHER", benefits: ["PATERNITY"], preparedBy: "COURT", submitTo: "PAYER_OR_ZUS", when: "Razem z wnioskiem.", legalBasis: "R1316 § 33 ust. 1 pkt 1" })
    } else {
      birthCertificate("FATHER", ["PATERNITY"], payerOf("FATHER", "PATERNITY") === "ZUS")
    }
    payerCertificate("FATHER", ["PATERNITY"])
  }

  if (active("STILLBIRTH_FUNERAL_ALLOWANCE", "MOTHER")) {
    add({ code: "Z-12", name: "Wniosek o zasiłek pogrzebowy Z-12 z dokumentami kosztów pogrzebu", parent: "BOTH", benefits: ["STILLBIRTH_FUNERAL_ALLOWANCE"], preparedBy: "YOU", submitTo: "ZUS", when: "W ciągu 12 miesięcy od dnia pochówku; składa osoba, która pokryła koszty pogrzebu.", legalBasis: "P s. 35" })
  }

  const routing = (["MOTHER", "FATHER"] as const)
    .filter((parent) => ctx.parent(parent))
    .map((parent) => {
      const payer =
        determinations.find((d) => d.parent === parent && d.payer !== "NONE" && ELIGIBLE.has(d.status))?.payer ?? "NONE"
      const explanation =
        payer === "EMPLOYER"
          ? "Płatnik zgłaszający do ubezpieczenia chorobowego ponad 20 osób (stan na 30 listopada poprzedniego roku) sam ustala i wypłaca zasiłek — dokumenty składasz u niego."
          : payer === "ZUS"
            ? titleOf(parent) === "SELF_EMPLOYMENT"
              ? "Przedsiębiorcom zasiłek zawsze wypłaca ZUS — dokumenty składasz w ZUS, najwygodniej przez eZUS."
              : "Zasiłek wypłaca ZUS. Wnioski o urlop składasz u pracodawcy, który przekazuje dokumenty do ZUS w ciągu 7 dni."
            : payer === "UNKNOWN"
              ? "Zasiłek wypłaca płatnik, jeśli zgłasza do ubezpieczenia chorobowego ponad 20 osób; w przeciwnym razie ZUS."
              : "Brak świadczenia do wypłaty."
      return { parent, payer, explanation }
    })

  return {
    formsVersion: merged ? "ZAM (od 24.10.2026)" : "ZUR/ZAO/Z-3b (przed 24.10.2026)",
    documents,
    routing,
    notes: [
      "Aktualne wzory formularzy publikuje ZUS na www.zus.pl. Przed złożeniem sprawdź wersję druku.",
      "Wnioski do ZUS można składać papierowo lub elektronicznie (PUE/eZUS, podpis kwalifikowany, profil zaufany lub osobisty) — U art. 61b.",
    ],
  }
}
