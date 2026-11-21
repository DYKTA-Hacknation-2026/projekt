import { calculateLines, flatRateStatus, sumGrosze } from "./amounts"
import { computeBasis, type ComputedBasis } from "./basis"
import { addMonths, ageInYears, dayAfter, deadlineAfter, deadlineBefore, isIsoDate } from "./calendar"
import { DISCLAIMER, EvaluationContext, ZUS_CONTACT } from "./context"
import { maternityEntitlement, payerFor, type Entitlement } from "./coverage"
import { ZERO } from "./decimal"
import { identifyDocuments, type DocumentReport } from "./documents"
import { canonicalJson, sha256Hex } from "./hash"
import { buildSchedule, type DerivedEvent, type Schedule, type ScheduleEligibility } from "./schedule"
import {
  EARLIEST_SUPPORTED_DATE,
  ruleSetByVersion,
  ruleSetFor,
  withExternalParameters,
  type RuleSet,
} from "./rulesets"
import { assessSickness } from "./sickness"
import { RULES, formatSourceRef, type RuleId } from "./sources"
import type {
  AmountStatus,
  ApplicableBenefit,
  AppliedRule,
  Assessment,
  AssessmentInput,
  BenefitType,
  CalculationLine,
  Determination,
  EligibilityStatus,
  NextStep,
  ParentAllocation,
  ParentRole,
  Reason,
  TimelineEntry,
  Totals,
} from "./types"
import { assertStructurallyValid, checkConsistency } from "./validation"

export const ENGINE_VERSION = "1.0.0"

export const BENEFIT_LABELS: Record<BenefitType, string> = {
  SICKNESS_IN_PREGNANCY: "Zasiłek chorobowy w okresie ciąży",
  EMPLOYER_SICK_PAY: "Wynagrodzenie chorobowe (pracodawca)",
  REHABILITATION: "Świadczenie rehabilitacyjne",
  MATERNITY_EQUIVALENT: "Zasiłek w wysokości zasiłku macierzyńskiego (do porodu)",
  MATERNITY: "Zasiłek macierzyński za urlop macierzyński",
  MATERNITY_TERMS: "Zasiłek macierzyński za urlop na warunkach urlopu macierzyńskiego",
  SUPPLEMENTARY_MATERNITY: "Zasiłek macierzyński za uzupełniający urlop macierzyński",
  PARENTAL: "Zasiłek macierzyński za urlop rodzicielski",
  PATERNITY: "Zasiłek macierzyński za urlop ojcowski",
  STILLBIRTH_FUNERAL_ALLOWANCE: "Zasiłek pogrzebowy (martwe urodzenie)",
}

const OK = new Set<EligibilityStatus>(["ELIGIBLE", "CONDITIONAL"])

export interface EvaluationResult {
  assessment: Assessment
  documents: DocumentReport
  schedule: Schedule | null
}

function deriveEvent(ctx: EvaluationContext): DerivedEvent {
  const event = ctx.input.event
  const adoption = event.kind === "ADOPTION" || event.kind === "FOSTER_CARE"
  const children = Math.max(1, Math.round(event.childrenCount ?? 1))
  if (event.childrenCount === undefined && event.kind !== "ADOPTION" && event.kind !== "FOSTER_CARE") {
    ctx.need({
      key: "event.childrenCount",
      question: "Ile dzieci urodzi się (urodziło się) przy jednym porodzie?",
      why: "Od liczby dzieci zależy wymiar urlopu macierzyńskiego i rodzicielskiego. Do czasu odpowiedzi przyjmujemy jedno dziecko.",
      affects: ["MATERNITY", "PARENTAL"],
    })
  }
  const deaths = (event.childDeaths ?? []).filter((death) => isIsoDate(death.date))
  const lastDeath = deaths.reduce<string | null>((latest, death) => (!latest || death.date > latest ? death.date : latest), null)
  const survivors = event.stillbirth ? 0 : Math.max(0, children - deaths.length)
  if (adoption) {
    return {
      adoption,
      anchorKind: event.careTakingDate ? "CARE_TAKING" : "NONE",
      anchorDate: event.careTakingDate ?? null,
      estimated: false,
      childBirthDate: event.childBirthDate ?? null,
      dueDate: null,
      children,
      zaZyciem: Boolean(event.zaZyciem),
      stillbirth: false,
      survivors,
      lastDeath,
    }
  }
  const birth = event.kind === "BIRTH" ? event.birthDate : undefined
  const anchorDate = birth ?? event.expectedDueDate ?? null
  if (!anchorDate) {
    ctx.need({
      key: event.kind === "BIRTH" ? "event.birthDate" : "event.expectedDueDate",
      question: event.kind === "BIRTH" ? "Kiedy urodziło się dziecko?" : "Jaki jest przewidywany termin porodu?",
      why: "Prawo do zasiłku macierzyńskiego ocenia się na dzień porodu; od tej daty liczą się okresy i terminy.",
      affects: ["MATERNITY", "PARENTAL", "PATERNITY"],
    })
  }
  if (!birth && anchorDate) ctx.assume("A-24")
  return {
    adoption,
    anchorKind: birth ? "BIRTH" : anchorDate ? "DUE_DATE" : "NONE",
    anchorDate,
    estimated: !birth,
    childBirthDate: anchorDate,
    dueDate: event.expectedDueDate ?? null,
    children,
    zaZyciem: Boolean(event.zaZyciem),
    stillbirth: Boolean(event.stillbirth),
    survivors,
    lastDeath,
  }
}

function selectRuleSet(input: AssessmentInput, rightDate: string | null): { ruleSet: RuleSet | null; selectedBy: string } {
  if (input.ruleSetVersion) {
    const pinned = ruleSetByVersion(input.ruleSetVersion)
    if (!pinned) return { ruleSet: null, selectedBy: `nieznana wersja ${input.ruleSetVersion}` }
    return { ruleSet: pinned, selectedBy: "wersja wskazana w żądaniu" }
  }
  const date = rightDate ?? input.sickLeave?.start ?? input.asOf
  return {
    ruleSet: ruleSetFor(date),
    selectedBy: rightDate ? `dzień powstania prawa (${date})` : `data oceny (${date})`,
  }
}

function determination(
  benefit: BenefitType,
  parent: ParentRole,
  entitlement: Pick<Entitlement, "status" | "reasons" | "conditions" | "missingEvidence">,
  payer: Determination["payer"],
  extraReasons: Reason[] = []
): Determination {
  return {
    benefit,
    parent,
    label: BENEFIT_LABELS[benefit],
    status: entitlement.status,
    reasons: [...entitlement.reasons, ...extraReasons],
    conditions: [...entitlement.conditions],
    missingEvidence: [...entitlement.missingEvidence],
    payer: OK.has(entitlement.status) ? payer : entitlement.status === "NOT_ELIGIBLE" ? "NONE" : payer,
  }
}

function reasonOf(ctx: EvaluationContext, ruleId: RuleId, code: string, text: string): Reason {
  ctx.use(ruleId)
  return { ruleId, code, text }
}

function unsupportedPeriodAssessment(input: AssessmentInput, selectedBy: string): EvaluationResult {
  const reason =
    selectedBy.startsWith("nieznana")
      ? `Nie istnieje wersja reguł ${input.ruleSetVersion}.`
      : `Zdarzenie przypada przed ${EARLIEST_SUPPORTED_DATE} — udostępnione źródła nie zawierają przepisów w brzmieniu z tego okresu (U-01).`
  const assessment: Assessment = {
    kind: "ESTIMATE",
    disclaimer: DISCLAIMER,
    engineVersion: ENGINE_VERSION,
    inputHash: sha256Hex(canonicalJson(input)),
    asOf: input.asOf,
    ruleSet: { version: "—", label: "Brak obsługiwanej wersji reguł", effectiveFrom: EARLIEST_SUPPORTED_DATE, effectiveTo: null, selectedBy },
    anchor: { kind: "NONE", date: null, estimated: false },
    status: "MANUAL_REVIEW",
    eligibility: { status: "MANUAL_REVIEW", determinations: [] },
    applicableBenefits: [],
    basis: [],
    breakdown: [],
    totals: { currency: "PLN", gross: true, totalGrosze: null, amountStatus: "NOT_CALCULATED", byParent: [], byBenefit: [] },
    periods: [],
    allocation: [],
    timeline: [],
    appliedRules: [],
    sources: [],
    assumptions: [],
    missingEvidence: [],
    warnings: [{ code: "UNSUPPORTED_PERIOD", severity: "RISK", text: reason }],
    nextSteps: [{ id: "contact-zus", text: `Sprawdź uprawnienia bezpośrednio w ZUS: ${ZUS_CONTACT}.` }],
    unsupported: [{ code: "U-01", text: reason }],
    manualReviewReasons: [reason],
    planAdjustments: [],
  }
  return { assessment, documents: { formsVersion: "—", documents: [], routing: [], notes: [] }, schedule: null }
}

/**
 * Deterministic assessment of eligibility and parental benefits.
 * Pure: no I/O, no clock (`asOf` comes from the caller), no randomness.
 */
export function evaluate(input: AssessmentInput, suppliedRuleSet?: RuleSet): EvaluationResult {
  assertStructurallyValid(input)
  const kind = input.event.kind
  const adoption = kind === "ADOPTION" || kind === "FOSTER_CARE"
  const provisionalRightDate = adoption
    ? (input.event.careTakingDate ?? null)
    : ((kind === "BIRTH" ? input.event.birthDate : undefined) ?? input.event.expectedDueDate ?? null)
  const { ruleSet: baseRuleSet, selectedBy } = selectRuleSet(input, provisionalRightDate)
  if (!baseRuleSet) return unsupportedPeriodAssessment(input, selectedBy)
  const ruleSet = withExternalParameters(suppliedRuleSet ?? baseRuleSet, input.externalParameters)
  const ctx = new EvaluationContext(input, ruleSet)
  ctx.assume("A-12")

  checkConsistency(ctx)
  const ev = deriveEvent(ctx)
  const mother = ctx.parent("MOTHER")
  const father = ctx.parent("FATHER")
  const determinations: Determination[] = []
  const rightDate = ev.anchorDate
  const rightLabel = adoption ? "dzień przyjęcia dziecka" : ev.estimated ? "przewidywany dzień porodu" : "dzień porodu"

  // ---------------------------------------------------------------- entitlements
  let motherEnt: Entitlement | null = null
  let fatherEnt: Entitlement | null = null
  const main: BenefitType = adoption ? "MATERNITY_TERMS" : "MATERNITY"
  // Without the birth (care-taking) date the right is assessed provisionally as of today:
  // the person can learn whether the conditions are met now, without invented periods or amounts.
  const entitlementDate = rightDate ?? input.asOf
  const entitlementLabel = rightDate ? rightLabel : "dzień oceny (data porodu lub przyjęcia dziecka nieznana)"
  if (mother) motherEnt = maternityEntitlement(ctx, mother, entitlementDate, main, { allowAfterTitle: !adoption && Boolean(rightDate), role: "MOTHER", dateLabel: entitlementLabel })
  if (father) fatherEnt = maternityEntitlement(ctx, father, entitlementDate, "PARENTAL", { allowAfterTitle: false, role: "FATHER", dateLabel: entitlementLabel })
  if (!rightDate) {
    for (const ent of [motherEnt, fatherEnt]) {
      if (ent?.status === "ELIGIBLE") ent.status = "CONDITIONAL"
      ent?.conditions.push(`Prawo ocenia się na ${adoption ? "dzień przyjęcia dziecka" : "dzień porodu"} — wtedy trzeba podlegać ubezpieczeniu chorobowemu. Podaj tę datę, aby wyliczyć okresy i kwoty.`)
    }
  }

  // Adoption and foster care: court application and child's age (U art. 29 ust. 1 pkt 2–3).
  let ageOk = true
  if (adoption) {
    const event = input.event
    ctx.use("LR-129")
    if (!event.childBirthDate) {
      ctx.need({ key: "event.childBirthDate", question: "Jaka jest data urodzenia dziecka?", why: "Prawo i wymiar urlopu zależą od wieku dziecka (7, 10 albo 14 lat).", affects: ["MATERNITY_TERMS", "PARENTAL"] })
    }
    if (!event.careTakingDate) {
      ctx.need({ key: "event.careTakingDate", question: "Kiedy przyjęliście dziecko na wychowanie?", why: "Od tej daty liczą się okresy i terminy (KP art. 183 § 6).", affects: ["MATERNITY_TERMS", "PARENTAL"] })
    }
    if (event.childBirthDate && event.careTakingDate) {
      const age = ageInYears(event.childBirthDate, event.careTakingDate)
      const cap = kind === "ADOPTION" ? ctx.p.maternityTerms.adoptionMaxChildAgeYears : event.schoolDeferred ? ctx.p.maternityTerms.fosterDeferredSchoolMaxChildAgeYears : ctx.p.maternityTerms.fosterMaxChildAgeYears
      ageOk = age < cap
      ctx.assume("A-22")
      if (!ageOk) {
        for (const ent of [motherEnt, fatherEnt]) {
          if (!ent) continue
          ent.status = "NOT_ELIGIBLE"
          ent.reasons.push(reasonOf(ctx, "LR-129", "CHILD_TOO_OLD", `Dziecko miało ${age} lat w dniu przyjęcia — prawo dotyczy dzieci, które nie ukończyły ${cap} lat.`))
        }
      }
    }
    if (kind === "ADOPTION" && ageOk) {
      for (const ent of [motherEnt, fatherEnt]) {
        if (!ent || !OK.has(ent.status)) continue
        if (!event.courtApplicationDate) {
          ent.status = "CONDITIONAL"
          ent.conditions.push("Wystąpienie do sądu opiekuńczego z wnioskiem o wszczęcie postępowania w sprawie przysposobienia (U art. 29 ust. 1 pkt 2).")
          ctx.need({ key: "event.courtApplicationDate", question: "Kiedy wystąpiliście do sądu opiekuńczego o przysposobienie dziecka?", why: "Prawo przy adopcji wymaga przyjęcia dziecka i wystąpienia do sądu (U art. 29 ust. 1 pkt 2).", affects: ["MATERNITY_TERMS", "PARENTAL"] })
        }
      }
    }
  }

  // T s. 8: a father who started work after the birth is also entitled to paternity leave,
  // while the child is under 12 months — his entitlement is assessed on the first leave day.
  let paternityEnt: Entitlement | null = fatherEnt
  let paternityLateStart = false
  const firstPaternityStart = input.plan?.paternity?.[0]?.startDate
  if (father && fatherEnt && !OK.has(fatherEnt.status) && firstPaternityStart && !adoption && rightDate) {
    const later = maternityEntitlement(ctx, father, firstPaternityStart, "PATERNITY", { allowAfterTitle: false, role: "FATHER", dateLabel: "pierwszy dzień urlopu ojcowskiego" })
    if (OK.has(later.status)) {
      paternityEnt = later
      paternityLateStart = true
    }
  }

  // ---------------------------------------------------------------- schedule
  const okMother = Boolean(motherEnt && OK.has(motherEnt.status))
  const okFather = Boolean(fatherEnt && OK.has(fatherEnt.status))
  const fosterNoPaternity = kind === "FOSTER_CARE"
  const eligibility: ScheduleEligibility = {
    motherMaternity: okMother && ageOk,
    fatherTakeover: okFather && ageOk,
    parental: { MOTHER: okMother && ageOk, FATHER: okFather && ageOk },
    employee: { MOTHER: mother?.insurance?.title === "EMPLOYMENT", FATHER: father?.insurance?.title === "EMPLOYMENT" },
    paternity: Boolean(paternityEnt && OK.has(paternityEnt.status)) && !fosterNoPaternity && !ev.stillbirth,
    supplementary: { MOTHER: okMother, FATHER: okFather },
    motherEquivalentFrom:
      motherEnt?.maternityEquivalent && OK.has(motherEnt.status) && mother?.insurance?.endDate ? dayAfter(mother.insurance.endDate) : null,
  }
  const schedule = rightDate ? buildSchedule(ctx, ev, eligibility) : null

  // ---------------------------------------------------------------- bases
  const bases = new Map<ParentRole, ComputedBasis>()
  for (const parent of input.parents) {
    const affects = [...new Set(schedule?.periods.filter((p) => p.parent === parent.role).map((p) => p.benefit) ?? [])]
    const needsSickness = parent.role === "MOTHER" && input.sickLeave
    if (affects.length === 0 && !needsSickness) continue
    const basisDate = parent.role === "MOTHER" && input.sickLeave ? input.sickLeave.start : (rightDate ?? input.asOf)
    const basis = computeBasis(ctx, parent, basisDate, affects.length ? affects : ["SICKNESS_IN_PREGNANCY"])
    if (parent.role === "MOTHER" && input.sickLeave && affects.length) {
      basis.steps.push("Podstawę zasiłku chorobowego w ciąży przyjęto także dla zasiłku macierzyńskiego — nie ustala się jej na nowo, jeśli przerwa między zasiłkami była krótsza niż miesiąc (U art. 43; Poradnik s. 28).")
    }
    bases.set(parent.role, basis)
  }

  // ---------------------------------------------------------------- amounts
  const flat = schedule ? flatRateStatus(ctx, ev, schedule) : null
  const amounts = schedule && flat ? calculateLines(ctx, schedule, flat, bases) : { lines: [], status: { MOTHER: "NOT_APPLICABLE", FATHER: "NOT_APPLICABLE" } as Record<ParentRole, AmountStatus> }
  const lines: CalculationLine[] = [...amounts.lines]

  // ---------------------------------------------------------------- sickness in pregnancy
  if (mother && !adoption && (kind === "PREGNANCY" || input.sickLeave)) {
    const sickness = assessSickness(ctx, bases.get("MOTHER") ?? null)
    determinations.push(...sickness.determinations)
    lines.unshift(...sickness.lines)
    schedule?.periods.push(...sickness.periods.map((period) => ({ ...period, rateKey: "MATERNITY" as const, work: ZERO })))
    if (sickness.amountStatus !== "NOT_APPLICABLE") {
      amounts.status.MOTHER = worse(amounts.status.MOTHER, sickness.amountStatus)
    }
  }

  // ---------------------------------------------------------------- determinations
  const motherPayer = mother ? payerFor(ctx, mother, Boolean(motherEnt?.afterTitle)) : "NONE"
  const fatherPayer = father ? payerFor(ctx, father, false) : "NONE"
  const periodsOf = (parent: ParentRole, benefit: BenefitType) => schedule?.periods.filter((p) => p.parent === parent && p.benefit === benefit) ?? []

  if (mother && motherEnt) {
    const durationReasons: Reason[] = []
    const matPeriods = periodsOf("MOTHER", main)
    const days = matPeriods.reduce((sum, p) => sum + p.days, 0)
    if (ev.stillbirth) {
      durationReasons.push(reasonOf(ctx, "LR-125", "STILLBIRTH_8_WEEKS", "Po urodzeniu martwego dziecka zasiłek macierzyński przysługuje za 8 tygodni po porodzie (KP art. 180¹ § 1); wynosi 100% podstawy."))
    } else if (ev.lastDeath && ev.survivors === 0) {
      durationReasons.push(reasonOf(ctx, "LR-125", "CHILD_DEATH", schedule?.lossCutoff ? `Po zgonie dziecka po 8. tygodniu życia prawo do zasiłku zachowuje się przez 7 dni od zgonu (do ${schedule.lossCutoff}).` : "Po zgonie dziecka przed upływem 8 tygodni życia zasiłek przysługuje za 8 tygodni po porodzie, nie krócej niż 7 dni od zgonu."))
    } else if (ev.lastDeath && ev.survivors > 0) {
      durationReasons.push(reasonOf(ctx, "LR-125", "PARTIAL_LOSS", `Wymiar urlopu macierzyńskiego ustalono według liczby dzieci pozostałych przy życiu (${ev.survivors}).`))
      ctx.assume("A-31")
    } else if (!adoption && days > 0) {
      durationReasons.push(reasonOf(ctx, "LR-123", "MATERNITY_DIMENSION", `Wymiar urlopu macierzyńskiego: ${ctx.p.maternity.weeksByChildren[Math.min(5, ev.children) as 1 | 2 | 3 | 4 | 5]} tygodni (dzieci przy jednym porodzie: ${ev.children}); pierwsze 14 tygodni po porodzie matka wykorzystuje osobiście.`))
    }
    if (adoption && schedule?.terms) {
      durationReasons.push(reasonOf(ctx, "LR-129", "MATERNITY_TERMS_DIMENSION", schedule.terms.explanation))
    }
    if (motherEnt.afterTitle && !adoption) {
      ctx.warn({ code: "PAID_BY_ZUS_AFTER_TITLE", severity: "INFO", parent: "MOTHER", text: "Zasiłek za okres po ustaniu ubezpieczenia wypłaca ZUS.", ruleId: "LR-109" })
    }
    const status = !ageOk ? "NOT_ELIGIBLE" : motherEnt.status
    determinations.push(determination(main, "MOTHER", { ...motherEnt, status }, motherPayer, durationReasons))

    if (!adoption && motherEnt.maternityEquivalent && mother.insurance?.endDate && rightDate && mother.insurance.endDate < rightDate) {
      const conditions = [...motherEnt.conditions]
      if (mother.insurance.otherEmploymentProvided === undefined) {
        conditions.push("Pracodawca nie zapewnił innego zatrudnienia (oświadczenie, R1316 § 17 pkt 3).")
      }
      determinations.push({
        benefit: "MATERNITY_EQUIVALENT",
        parent: "MOTHER",
        label: BENEFIT_LABELS.MATERNITY_EQUIVALENT,
        status: motherEnt.status === "ELIGIBLE" && mother.insurance.otherEmploymentProvided === undefined ? "CONDITIONAL" : motherEnt.status,
        reasons: [reasonOf(ctx, "LR-121A", "MATERNITY_EQUIVALENT", "Pracownicy, z którą w ciąży rozwiązano umowę z powodu upadłości lub likwidacji pracodawcy (albo umowa wygasła z powodu jego śmierci) i której nie zapewniono innego zatrudnienia, przysługuje do dnia porodu zasiłek w wysokości zasiłku macierzyńskiego — 100% podstawy; wypłaca ZUS.")],
        conditions,
        missingEvidence: [],
        payer: "ZUS",
      })
    }
  }

  if (father && input.plan?.maternityTakeover && !ev.stillbirth) {
    const fatherMaternity = periodsOf("FATHER", main)
    const status: EligibilityStatus = !fatherEnt ? "NEEDS_INPUT" : !OK.has(fatherEnt.status) ? fatherEnt.status : fatherMaternity.length ? fatherEnt.status : "NOT_ELIGIBLE"
    determinations.push({
      benefit: main,
      parent: "FATHER",
      label: `${BENEFIT_LABELS[main]} (przejęcie przez ojca)`,
      status,
      reasons: [
        ...(fatherEnt?.reasons ?? []),
        reasonOf(ctx, input.plan.maternityTakeover.reason === "MOTHER_RESIGNS_AFTER_14_WEEKS" ? "LR-123A" : "LR-124", "TAKEOVER", fatherMaternity.length ? "Ojciec przejmuje część urlopu macierzyńskiego; łączny wymiar nie przekracza wymiaru urlopu macierzyńskiego (KP art. 180 § 14)." : "Warunki przejęcia części urlopu macierzyńskiego nie są spełnione."),
      ],
      conditions: fatherEnt?.conditions ?? [],
      missingEvidence: fatherEnt?.missingEvidence ?? [],
      payer: fatherPayer,
    })
  }

  // Supplementary maternity leave.
  if (schedule && schedule.supplementary.status !== "NOT_APPLICABLE") {
    const holderPeriod = schedule.periods.find((p) => p.benefit === "SUPPLEMENTARY_MATERNITY")
    const holder: ParentRole = holderPeriod?.parent ?? input.plan?.supplementaryParent ?? "MOTHER"
    const ent = holder === "MOTHER" ? motherEnt : fatherEnt
    const supp = schedule.supplementary
    const status: EligibilityStatus =
      supp.status === "NEEDS_INPUT" ? "NEEDS_INPUT" : supp.status === "NOT_ELIGIBLE" ? "NOT_ELIGIBLE" : holderPeriod && ent ? ent.status : "NOT_ELIGIBLE"
    determinations.push({
      benefit: "SUPPLEMENTARY_MATERNITY",
      parent: holder,
      label: BENEFIT_LABELS.SUPPLEMENTARY_MATERNITY,
      status,
      reasons: [reasonOf(ctx, "LR-126", `SUPPLEMENTARY_${supp.variant ?? "NA"}`, supp.explanation)],
      conditions: status === "ELIGIBLE" || status === "CONDITIONAL" ? ["Udzielany jednorazowo, bezpośrednio po urlopie macierzyńskim, tylko jednemu z rodziców (KP art. 180² § 1, § 4)."] : [],
      missingEvidence: [],
      payer: holder === "MOTHER" ? motherPayer : fatherPayer,
    })
  }

  // Parental leave.
  const noChild = Boolean(schedule && schedule.poolWeeks === 0 && rightDate)
  for (const [role, parent, ent, payer] of [
    ["MOTHER", mother, motherEnt, motherPayer],
    ["FATHER", father, fatherEnt, fatherPayer],
  ] as const) {
    if (!parent || !ent) continue
    if (noChild) {
      determinations.push({ benefit: "PARENTAL", parent: role, label: BENEFIT_LABELS.PARENTAL, status: "NOT_ELIGIBLE", reasons: [reasonOf(ctx, "LR-125", "NO_PARENTAL_AFTER_LOSS", "Urlop rodzicielski służy opiece nad dzieckiem — po urodzeniu martwego dziecka lub jego zgonie nie przysługuje (poza 7 dniami od zgonu w czasie urlopu).")], conditions: [], missingEvidence: [], payer: "NONE" })
      continue
    }
    const pool = schedule?.poolWeeks ?? 0
    const extra: Reason[] = [
      reasonOf(ctx, "LR-127", "PARENTAL_POOL", `Wspólna pula urlopu rodzicielskiego: ${pool} tygodni; każde z rodziców ma wyłączne, nieprzenoszalne 9 tygodni, więc jedno może wykorzystać najwyżej ${pool - ctx.p.parental.nonTransferableWeeks} tygodni. Do 5 części, do ${schedule?.parentalLastDay ?? "końca roku, w którym dziecko kończy 6 lat"}.`),
    ]
    if (role === "FATHER" && motherEnt && !OK.has(motherEnt.status) && OK.has(ent.status)) {
      extra.push(reasonOf(ctx, "LR-127", "FATHER_WHEN_MOTHER_UNINSURED", "Ojcu przysługuje zasiłek za urlop rodzicielski także wtedy, gdy matka nie była ubezpieczona w dniu porodu (T s. 7; U art. 31 ust. 3h)."))
      ctx.unsupported("U-10")
    }
    determinations.push(determination("PARENTAL", role, { ...ent, status: !ageOk ? "NOT_ELIGIBLE" : ent.status }, payer, extra))
  }

  // Paternity.
  if (father) {
    const reasons: Reason[] = []
    let status: EligibilityStatus = paternityEnt?.status ?? "NEEDS_INPUT"
    const conditions = [...(paternityEnt?.conditions ?? [])]
    if (paternityLateStart) {
      reasons.push(reasonOf(ctx, "LR-133", "STARTED_WORK_AFTER_BIRTH", "Urlop ojcowski przysługuje także ojcu, który podjął pracę po narodzinach dziecka, do ukończenia przez nie 12 miesięcy (T s. 8)."))
    }
    if (kind === "FOSTER_CARE") {
      status = "NOT_ELIGIBLE"
      ctx.unsupported("U-17")
      reasons.push(reasonOf(ctx, "LR-133", "FOSTER_NO_PATERNITY", "Urlop ojcowski przysługuje ojcu dziecka i ojcu adopcyjnemu (KP art. 182³ § 1); przepisy nie obejmują rodziny zastępczej."))
    } else if (ev.stillbirth) {
      status = "NOT_ELIGIBLE"
      reasons.push(reasonOf(ctx, "LR-133", "PATERNITY_STILLBIRTH", "Urlop ojcowski służy opiece nad dzieckiem."))
    } else {
      reasons.push(reasonOf(ctx, "LR-133", "PATERNITY_RULES", `Do 14 dni (liczba dzieci go nie wydłuża), jednorazowo albo w 2 częściach po co najmniej 7 dni${schedule?.paternityDeadline ? `, do ${schedule.paternityDeadline}` : ""}.${father.insurance?.title !== "EMPLOYMENT" ? " Ubezpieczony ojciec, który nie jest pracownikiem, otrzymuje zasiłek za okres odpowiadający urlopowi ojcowskiemu (R1316 § 33)." : ""}`))
      if (kind === "ADOPTION" && !input.event.adoptionFinalDate) {
        if (OK.has(status)) status = "CONDITIONAL"
        conditions.push("Termin liczy się od uprawomocnienia postanowienia o przysposobieniu (12 miesięcy, nie dłużej niż do 14. urodzin dziecka).")
        ctx.need({ key: "event.adoptionFinalDate", question: "Kiedy uprawomocniło się (uprawomocni) postanowienie o przysposobieniu?", why: "Od tej daty liczy się 12-miesięczny termin na urlop ojcowski (KP art. 182³ § 1 pkt 2).", affects: "PATERNITY" })
      }
      if (schedule?.paternityDeadline && ctx.asOf > schedule.paternityDeadline && !periodsOf("FATHER", "PATERNITY").length) {
        status = "NOT_ELIGIBLE"
        reasons.push(reasonOf(ctx, "LR-133", "PATERNITY_EXPIRED", `Termin na urlop ojcowski upłynął ${schedule.paternityDeadline} — prawo wygasło.`))
      }
    }
    determinations.push({ benefit: "PATERNITY", parent: "FATHER", label: BENEFIT_LABELS.PATERNITY, status, reasons: [...(paternityEnt?.reasons ?? []), ...reasons], conditions, missingEvidence: paternityEnt?.missingEvidence ?? [], payer: OK.has(status) ? fatherPayer : "NONE" })
  }

  // Funeral allowance for a stillbirth.
  if (ev.stillbirth) {
    ctx.use("LR-136")
    determinations.push({
      benefit: "STILLBIRTH_FUNERAL_ALLOWANCE",
      parent: "MOTHER",
      label: BENEFIT_LABELS.STILLBIRTH_FUNERAL_ALLOWANCE,
      status: "CONDITIONAL",
      reasons: [{ ruleId: "LR-136", code: "FUNERAL_ALLOWANCE", text: "Przy urodzeniu martwego dziecka — bez względu na czas trwania ciąży — przysługuje zasiłek pogrzebowy 7000 zł osobie, która zorganizowała pogrzeb i pokryła jego koszty." }],
      conditions: ["Wniosek z dokumentami w ciągu 12 miesięcy od dnia pochówku."],
      missingEvidence: [],
      payer: "ZUS",
    })
    lines.push({
      id: "funeral",
      parent: "MOTHER",
      benefit: "STILLBIRTH_FUNERAL_ALLOWANCE",
      label: BENEFIT_LABELS.STILLBIRTH_FUNERAL_ALLOWANCE,
      period: null,
      days: 0,
      rate: "1",
      ratePercent: "—",
      paidFraction: "1.00",
      monthlyBasisGrosze: null,
      exactAmount: String(ctx.p.amounts.stillbirthFuneralGrosze),
      amountGrosze: ctx.p.amounts.stillbirthFuneralGrosze,
      formula: "Kwota stała 7000 zł (Poradnik ZUS s. 35)",
      ruleIds: ["LR-136"],
      note: "Otrzymuje osoba, która pokryła koszty pogrzebu.",
    })
  }

  // ---------------------------------------------------------------- employment protection and risks
  addRisks(ctx, ev, motherEnt, fatherEnt)
  ctx.unsupported("U-04")
  ctx.unsupported("U-19")
  if (input.parents.some((parent) => parent.basis?.method === "MONTHLY_HISTORY")) ctx.unsupported("U-06")

  // ---------------------------------------------------------------- outputs
  const documents = identifyDocuments(ctx, determinations, schedule)
  const periods = (schedule?.periods ?? []).map(({ rateKey: _rateKey, work: _work, extension: _extension, ...period }) => period).sort((a, b) => (a.start === b.start ? a.id.localeCompare(b.id) : a.start.localeCompare(b.start)))
  const totals = buildTotals(lines, amounts.status, input.parents.map((parent) => parent.role))
  const allocation = buildAllocation(ctx, schedule, determinations, lines, amounts.status)
  const timeline = buildTimeline(ctx, ev, schedule, periods, flat)
  const appliedRules = buildAppliedRules(ctx, ruleSet)
  const eligibilityStatus = overallEligibility(determinations, ctx.manualReview.length > 0)
  const applicableBenefits = buildApplicable(determinations, periods, lines)
  const status = overallStatus(ctx, determinations, totals, rightDate)
  const nextSteps = buildNextSteps(ctx, determinations, timeline, flat, status)

  const assessment: Assessment = {
    kind: "ESTIMATE",
    disclaimer: DISCLAIMER,
    engineVersion: ENGINE_VERSION,
    inputHash: sha256Hex(canonicalJson({ input, ruleSet: ruleSet.version, engine: ENGINE_VERSION })),
    asOf: input.asOf,
    ruleSet: { version: ruleSet.version, label: ruleSet.label, effectiveFrom: ruleSet.effectiveFrom, effectiveTo: ruleSet.effectiveTo, selectedBy },
    anchor: { kind: ev.anchorKind, date: ev.anchorDate, estimated: ev.estimated },
    status,
    eligibility: { status: eligibilityStatus, determinations },
    applicableBenefits,
    basis: [...bases.values()].map(({ monthly: _monthly, ...basis }) => basis),
    breakdown: lines,
    totals,
    periods,
    allocation,
    timeline,
    appliedRules,
    sources: [...new Set(appliedRules.flatMap((rule) => rule.sources))].sort(),
    assumptions: ctx.assumptions,
    missingEvidence: ctx.missingEvidence,
    warnings: ctx.warnings,
    nextSteps,
    unsupported: ctx.unsupportedList,
    manualReviewReasons: ctx.manualReview,
    planAdjustments: ctx.planAdjustments,
  }
  return { assessment, documents, schedule }
}

const AMOUNT_ORDER: AmountStatus[] = ["NOT_APPLICABLE", "CALCULATED", "CALCULATED_UPPER_BOUND", "CALCULATED_LOWER_BOUND", "NOT_CALCULATED", "BASIS_UNKNOWN"]
function worse(a: AmountStatus, b: AmountStatus): AmountStatus {
  return AMOUNT_ORDER.indexOf(b) > AMOUNT_ORDER.indexOf(a) ? b : a
}

function addRisks(ctx: EvaluationContext, ev: DerivedEvent, motherEnt: Entitlement | null, fatherEnt: Entitlement | null): void {
  for (const [role, ent] of [["MOTHER", motherEnt], ["FATHER", fatherEnt]] as const) {
    const parent = ctx.parent(role)
    if (!parent?.insurance) continue
    const title = parent.insurance.title
    const planEnd = parent.insurance.endDate
    if (role === "MOTHER" && ev.anchorDate && planEnd && planEnd < ev.anchorDate && ent && !ent.afterTitle) {
      ctx.warn({ code: "INSURANCE_ENDS_BEFORE_BIRTH", severity: "RISK", parent: role, text: `Tytuł ubezpieczenia kończy się ${planEnd}, przed ${ev.adoption ? "przyjęciem dziecka" : "porodem"} (${ev.anchorDate}). Bez ubezpieczenia chorobowego w dniu ${ev.adoption ? "przyjęcia dziecka" : "porodu"} zasiłek macierzyński nie przysługuje.`, ruleId: "LR-72" })
    }
    if ((title === "MANDATE" || title === "SELF_EMPLOYMENT") && role === "MOTHER") {
      ctx.warn({ code: "NO_KP_PROTECTION", severity: "INFO", parent: role, text: "Ochrona z Kodeksu pracy (zakaz wypowiedzenia, przedłużenie umowy do porodu) nie dotyczy zleceniobiorców ani przedsiębiorców.", ruleId: "LR-82" })
    }
    if (title === "EMPLOYMENT" && role === "MOTHER" && !ev.adoption) {
      ctx.use("LR-80")
    }
    if (parent.insurance.sicknessInsurance === "VOLUNTARY" && ent && OK.has(ent.status)) {
      ctx.warn({ code: "VOLUNTARY_DEREGISTRATION", severity: "INFO", parent: role, text: "Z chwilą pobierania zasiłku macierzyńskiego następuje wyrejestrowanie z dobrowolnego ubezpieczenia chorobowego. Po zakończeniu zasiłku trzeba ponownie zgłosić się do tego ubezpieczenia.", ruleId: "LR-137" })
    }
    if (ent && ent.status === "NOT_ELIGIBLE" && (title === "MANDATE" || title === "SELF_EMPLOYMENT") && parent.insurance.sicknessInsurance !== "VOLUNTARY" && ev.anchorDate && ev.anchorDate > ctx.asOf) {
      ctx.warn({ code: "VOLUNTARY_INSURANCE_OPTION", severity: "WARNING", parent: role, text: "Prawo do zasiłku macierzyńskiego wymaga ubezpieczenia chorobowego w dniu porodu (bez okresu wyczekiwania, U art. 29). Przystąpienie do dobrowolnego ubezpieczenia tylko po to, by uzyskać zasiłek, ZUS może zbadać pod kątem pozorności (T s. 9–10).", ruleId: "LR-70" })
    }
  }
}

function buildTotals(lines: CalculationLine[], status: Record<ParentRole, AmountStatus>, roles: ParentRole[]): Totals {
  const byParent = roles.map((parent) => {
    const own = lines.filter((line) => line.parent === parent)
    // No calculation lines means no amount at all — never a fabricated 0.
    const total = own.length ? sumGrosze(own) : null
    return { parent, totalGrosze: total, amountStatus: own.length ? status[parent] : ("NOT_APPLICABLE" as AmountStatus) }
  })
  const byBenefitMap = new Map<string, { benefit: BenefitType; parent: ParentRole; totalGrosze: number | null }>()
  for (const line of lines) {
    const key = `${line.parent}:${line.benefit}`
    const entry = byBenefitMap.get(key) ?? { benefit: line.benefit, parent: line.parent, totalGrosze: 0 }
    entry.totalGrosze = entry.totalGrosze === null || line.amountGrosze === null ? null : entry.totalGrosze + line.amountGrosze
    byBenefitMap.set(key, entry)
  }
  const withLines = byParent.filter((entry) => entry.amountStatus !== "NOT_APPLICABLE" || entry.totalGrosze !== null)
  const totalGrosze =
    lines.length === 0 || withLines.length === 0 || withLines.some((entry) => entry.totalGrosze === null)
      ? null
      : withLines.reduce((sum, entry) => sum + (entry.totalGrosze ?? 0), 0)
  const amountStatus = lines.length === 0 ? "NOT_APPLICABLE" : byParent.reduce<AmountStatus>((acc, entry) => worse(acc, entry.amountStatus), "NOT_APPLICABLE")
  return { currency: "PLN", gross: true, totalGrosze, amountStatus, byParent, byBenefit: [...byBenefitMap.values()] }
}

function buildAllocation(
  ctx: EvaluationContext,
  schedule: Schedule | null,
  determinations: Determination[],
  lines: CalculationLine[],
  status: Record<ParentRole, AmountStatus>
): ParentAllocation[] {
  const reservedWeeks = schedule && schedule.poolWeeks > 0 ? ctx.p.parental.nonTransferableWeeks : 0
  return ctx.input.parents.map((parent) => {
    const role = parent.role
    const own = schedule?.periods.filter((p) => p.parent === role) ?? []
    const sum = (filter: (p: (typeof own)[number]) => boolean) => own.filter(filter).reduce((acc, p) => acc + p.days, 0)
    const parentalBase = sum((p) => p.benefit === "PARENTAL" && !p.extension)
    const reservedUsed = Math.min(parentalBase, reservedWeeks * 7)
    const parentLines = lines.filter((line) => line.parent === role)
    const parental = determinations.find((d) => d.parent === role && d.benefit === "PARENTAL")
    const main = determinations.find((d) => d.parent === role && (d.benefit === "MATERNITY" || d.benefit === "MATERNITY_TERMS" || d.benefit === "PARENTAL"))
    return {
      parent: role,
      eligibleForMaternityBenefits: main?.status ?? "NEEDS_INPUT",
      maternityDays: sum((p) => (p.benefit === "MATERNITY" || p.benefit === "MATERNITY_TERMS") && p.rateKey !== "MATERNITY_TAKEOVER"),
      maternityTakeoverDays: sum((p) => p.rateKey === "MATERNITY_TAKEOVER"),
      supplementaryDays: sum((p) => p.benefit === "SUPPLEMENTARY_MATERNITY"),
      parentalDays: parentalBase,
      parentalExtensionDays: sum((p) => p.benefit === "PARENTAL" && Boolean(p.extension)),
      reservedParentalWeeks: reservedWeeks,
      reservedParentalDaysUsed: reservedUsed,
      reservedParentalDaysUnused: parental && OK.has(parental.status) ? reservedWeeks * 7 - reservedUsed : 0,
      maxOwnParentalWeeks: schedule ? schedule.ownLimitDays / 7 : 0,
      paternityDays: sum((p) => p.benefit === "PATERNITY"),
      totalBenefitDays: own.filter((p) => p.benefit !== "EMPLOYER_SICK_PAY").reduce((acc, p) => acc + p.days, 0),
      totalGrosze: parentLines.length ? sumGrosze(parentLines) : null,
      amountStatus: parentLines.length ? status[role] : "NOT_APPLICABLE",
    }
  })
}

function buildApplicable(determinations: Determination[], periods: Assessment["periods"], lines: CalculationLine[]): ApplicableBenefit[] {
  return determinations
    .filter((d) => d.status !== "NOT_ELIGIBLE")
    .map((d) => {
      const own = lines.filter((line) => line.parent === d.parent && line.benefit === d.benefit)
      const days = periods.filter((p) => p.parent === d.parent && p.benefit === d.benefit).reduce((acc, p) => acc + p.days, 0)
      const amount = own.length ? sumGrosze(own) : null
      const amountStatus: AmountStatus = own.length === 0 ? "NOT_CALCULATED" : amount === null ? "BASIS_UNKNOWN" : "CALCULATED"
      return {
        benefit: d.benefit,
        parent: d.parent,
        label: d.label,
        status: d.status,
        days,
        rates: [...new Set(own.filter((line) => line.ratePercent !== "—").map((line) => line.ratePercent))],
        amountGrosze: amount,
        amountStatus,
      }
    })
}

function timelineStatus(asOf: string, date: string): TimelineEntry["status"] {
  return date < asOf ? "PASSED" : date === asOf ? "TODAY" : "UPCOMING"
}

function buildTimeline(
  ctx: EvaluationContext,
  ev: DerivedEvent,
  schedule: Schedule | null,
  periods: Assessment["periods"],
  flat: ReturnType<typeof flatRateStatus> | null
): TimelineEntry[] {
  const entries: TimelineEntry[] = []
  const d = ctx.p.deadlines
  const add = (entry: Omit<TimelineEntry, "status">) => entries.push({ ...entry, status: timelineStatus(ctx.asOf, entry.date) })
  if (ev.anchorDate) {
    add({ id: "anchor", date: ev.anchorDate, kind: "EVENT", parent: "BOTH", title: ev.adoption ? "Przyjęcie dziecka na wychowanie" : ev.estimated ? "Przewidywany termin porodu" : "Poród", detail: ev.estimated ? "Daty liczone od przewidywanego terminu porodu przesuną się, jeśli poród nastąpi w innym dniu." : "Dzień powstania prawa do zasiłku macierzyńskiego.", estimated: ev.estimated })
  }
  for (const period of periods) {
    add({ id: `period-${period.id}`, date: period.start, endDate: period.end, kind: "PERIOD", parent: period.parent, title: period.label, detail: `${period.days} dni${period.workFraction ? `, praca ${period.workFraction} etatu` : ""}`, estimated: period.estimated })
  }
  const motherMaternity = periods.find((p) => p.parent === "MOTHER" && (p.benefit === "MATERNITY" || p.benefit === "MATERNITY_TERMS"))
  const employee = (role: ParentRole) => ctx.parent(role)?.insurance?.title === "EMPLOYMENT"
  const pre = periods.find((p) => p.id === "maternity-pre")
  if (pre) add({ id: "deadline-pre-birth", date: deadlineBefore(pre.start, d.preBirthRequestDays), kind: "DEADLINE", parent: "MOTHER", title: "Wniosek o urlop macierzyński przed porodem", detail: "Najpóźniej 14 dni przed rozpoczęciem urlopu (Poradnik ZUS s. 27), z zaświadczeniem o przewidywanej dacie porodu.", estimated: pre.estimated, ruleId: "LR-134" })
  if (motherMaternity && ev.anchorDate && schedule && schedule.poolWeeks > 0) {
    add({ id: "deadline-81-5", date: deadlineAfter(ev.anchorDate, ctx.p.rates.flatApplicationDays), kind: "DEADLINE", parent: "MOTHER", title: "Ostatni dzień na wniosek o zasiłek 81,5%", detail: flat?.applies ? "Pisemny wniosek o zasiłek za urlop macierzyński i rodzicielski w pełnym wymiarze (U art. 30a)." : "Opcjonalnie: pisemny wniosek o 81,5% za cały okres (U art. 30a).", estimated: ev.estimated, ruleId: "LR-130A" })
  }
  const supp = periods.find((p) => p.benefit === "SUPPLEMENTARY_MATERNITY")
  if (supp && schedule?.maternityEnd && employee(supp.parent)) {
    add({ id: "deadline-supplementary", date: deadlineBefore(schedule.maternityEnd, d.supplementaryNoticeDays), kind: "DEADLINE", parent: supp.parent, title: "Wniosek o uzupełniający urlop macierzyński", detail: "Co najmniej 21 dni przed końcem urlopu macierzyńskiego (KP art. 180² § 4).", estimated: supp.estimated, ruleId: "LR-134" })
  }
  for (const period of periods.filter((p) => p.benefit === "PARENTAL" && !p.id.endsWith("extension") && !/-2$/.test(p.id))) {
    add({ id: `deadline-${period.id}`, date: employee(period.parent) ? deadlineBefore(period.start, d.parentalNoticeDays) : dayBeforeDate(period.start), kind: "DEADLINE", parent: period.parent, title: `Wniosek o ${period.part ?? ""}. część urlopu rodzicielskiego`, detail: employee(period.parent) ? `Co najmniej 21 dni przed rozpoczęciem (KP art. 182¹d § 1)${period.workFraction ? "; wniosek o łączenie z pracą także 21 dni wcześniej" : ""}.` : "Wniosek do płatnika zasiłku przed rozpoczęciem (R1316 § 29 pkt 3).", estimated: period.estimated, ruleId: "LR-134" })
  }
  const fatherMaternity = periods.find((p) => p.id === "maternity-father")
  if (fatherMaternity && employee("FATHER")) {
    add({ id: "deadline-takeover", date: deadlineBefore(fatherMaternity.start, d.takeoverNoticeDays), kind: "DEADLINE", parent: "FATHER", title: "Wniosek ojca o część urlopu macierzyńskiego", detail: "Co najmniej 14 dni przed rozpoczęciem (KP art. 180 § 9).", estimated: fatherMaternity.estimated, ruleId: "LR-134" })
  }
  const paternity = periods.find((p) => p.benefit === "PATERNITY")
  if (paternity) {
    add({ id: "deadline-paternity-request", date: employee("FATHER") ? deadlineBefore(paternity.start, d.paternityNoticeDays) : dayBeforeDate(paternity.start), kind: "DEADLINE", parent: "FATHER", title: "Wniosek o urlop ojcowski", detail: employee("FATHER") ? "Co najmniej 7 dni przed rozpoczęciem (KP art. 182³ § 2)." : "Wniosek o zasiłek przed rozpoczęciem okresu (R1316 § 33).", estimated: paternity.estimated, ruleId: "LR-134" })
  }
  if (schedule?.paternityDeadline) {
    add({ id: "deadline-paternity", date: schedule.paternityDeadline, kind: "DEADLINE", parent: "FATHER", title: "Ostatni dzień urlopu ojcowskiego", detail: "Po tym dniu prawo do urlopu ojcowskiego wygasa (KP art. 182³ § 1).", estimated: ev.estimated, ruleId: "LR-133" })
  }
  if (ev.adoption && ev.anchorDate) {
    add({ id: "deadline-maternity-terms", date: deadlineAfter(ev.anchorDate, d.maternityTermsRequestDays), kind: "DEADLINE", parent: "MOTHER", title: "Wniosek o urlop na warunkach urlopu macierzyńskiego", detail: "W ciągu 7 dni od przyjęcia dziecka; urlop zaczyna się najpóźniej 21 dni od przyjęcia (KP art. 183 § 6).", estimated: false, ruleId: "LR-134" })
  }
  if (schedule?.parentalLastDay && schedule.poolWeeks > 0) {
    add({ id: "deadline-parental-last", date: schedule.parentalLastDay, kind: "DEADLINE", parent: "BOTH", title: "Ostatni dzień na wykorzystanie urlopu rodzicielskiego", detail: ev.adoption && ctx.input.event.kind === "ADOPTION" ? "Do ukończenia przez dziecko 14 lat (KP art. 183 § 4¹)." : "Do końca roku kalendarzowego, w którym dziecko kończy 6 lat (KP art. 182¹c).", estimated: ev.estimated, ruleId: "LR-127" })
  }
  if (flat?.applies && schedule?.firstYearLastDay) {
    add({ id: "first-year", date: schedule.firstYearLastDay, kind: "DEADLINE", parent: "BOTH", title: "Koniec 1. roku życia dziecka (wariant 81,5%)", detail: "Jeśli do tego dnia nie wykorzystacie ani jednego dnia urlopu rodzicielskiego, zasiłek za ten urlop wyniesie 70% (U art. 31 ust. 3g).", estimated: ev.estimated, ruleId: "LR-130C" })
  }
  const lastEnd = periods.reduce<string | null>((latest, p) => (!latest || p.end > latest ? p.end : latest), null)
  if (lastEnd) {
    add({ id: "claim-expiry", date: addMonths(lastEnd, d.claimExpiryMonths), kind: "DEADLINE", parent: "BOTH", title: "Przedawnienie roszczenia o zasiłek za ostatni okres", detail: "6 miesięcy od ostatniego dnia okresu, za który przysługuje zasiłek (U art. 67); 3 lata, gdy niewypłacenie wynikło z błędu płatnika lub ZUS.", estimated: ev.estimated, ruleId: "LR-110" })
  }
  return entries.sort((a, b) => (a.date === b.date ? a.id.localeCompare(b.id) : a.date.localeCompare(b.date)))
}

function dayBeforeDate(date: string): string {
  return deadlineBefore(date, 1)
}

function buildAppliedRules(ctx: EvaluationContext, ruleSet: RuleSet): AppliedRule[] {
  return ctx.rulesUsed
    .filter((id) => ruleSet.rules.includes(id))
    .map((id) => {
      const rule = RULES[id]
      return {
        ruleId: id,
        title: rule.title,
        ruleSetVersion: ruleSet.version,
        sources: rule.sources.map(formatSourceRef),
        verification: rule.verification,
        openQuestion: "openQuestion" in rule ? rule.openQuestion : undefined,
      }
    })
}

function overallEligibility(determinations: Determination[], manual: boolean): EligibilityStatus {
  if (manual || determinations.some((d) => d.status === "MANUAL_REVIEW")) return "MANUAL_REVIEW"
  const core = determinations.filter((d) => d.benefit !== "EMPLOYER_SICK_PAY" && d.benefit !== "STILLBIRTH_FUNERAL_ALLOWANCE")
  if (core.length === 0) return "NEEDS_INPUT"
  for (const status of ["ELIGIBLE", "CONDITIONAL", "NEEDS_INPUT"] as const) {
    if (core.some((d) => d.status === status)) return status
  }
  return "NOT_ELIGIBLE"
}

function overallStatus(ctx: EvaluationContext, determinations: Determination[], totals: Totals, rightDate: string | null): Assessment["status"] {
  if (ctx.manualReview.length > 0 || determinations.some((d) => d.status === "MANUAL_REVIEW")) return "MANUAL_REVIEW"
  if (!rightDate || determinations.some((d) => d.status === "NEEDS_INPUT")) return "PARTIAL"
  if (totals.amountStatus === "BASIS_UNKNOWN" || totals.amountStatus === "NOT_CALCULATED") return "PARTIAL"
  return "COMPLETE"
}

function buildNextSteps(
  ctx: EvaluationContext,
  determinations: Determination[],
  timeline: TimelineEntry[],
  flat: ReturnType<typeof flatRateStatus> | null,
  status: Assessment["status"]
): NextStep[] {
  const steps: NextStep[] = []
  for (const missing of ctx.missingEvidence.slice(0, 6)) {
    steps.push({ id: `answer-${missing.parent ?? "all"}-${missing.key}`, parent: missing.parent, text: `Uzupełnij informację: ${missing.question}` })
  }
  for (const d of determinations) {
    for (const condition of d.conditions) {
      if (/Spłać/.test(condition)) steps.push({ id: `debt-${d.parent}`, parent: d.parent, text: condition, ruleId: "LR-108" })
    }
  }
  if (flat?.requested && flat.applies && flat.deadline && !ctx.input.plan?.flatRateApplicationDate) {
    steps.push({ id: "file-81-5", parent: "MOTHER", text: "Złóż pisemny wniosek o zasiłek macierzyński w wysokości 81,5% za cały okres.", dueDate: flat.deadline, ruleId: "LR-130A" })
  }
  for (const entry of timeline) {
    if (entry.kind !== "DEADLINE" || entry.status === "PASSED" || entry.id === "deadline-81-5" || entry.id === "claim-expiry" || entry.id === "deadline-parental-last" || entry.id === "first-year" || entry.id === "deadline-paternity") continue
    steps.push({ id: `do-${entry.id}`, parent: entry.parent, text: `${entry.title}${entry.estimated ? " (termin szacunkowy)" : ""}.`, dueDate: entry.date, ruleId: entry.ruleId })
  }
  if (ctx.warnings.some((warning) => warning.code === "INSURANCE_ENDS_BEFORE_BIRTH")) {
    steps.push({ id: "keep-insurance", parent: "MOTHER", text: "Zadbaj o ciągłość ubezpieczenia chorobowego do dnia porodu albo sprawdź, czy przysługuje ci zasiłek po ustaniu ubezpieczenia (U art. 30).", ruleId: "LR-72" })
  }
  if (determinations.some((d) => d.payer === "UNKNOWN" && OK.has(d.status))) {
    steps.push({ id: "ask-payer", text: "Zapytaj pracodawcę (zleceniodawcę), czy zgłasza do ubezpieczenia chorobowego ponad 20 osób — od tego zależy, czy zasiłek wypłaci on, czy ZUS.", ruleId: "LR-109" })
  }
  if (status === "MANUAL_REVIEW") {
    steps.push({ id: "contact-zus", text: `Twoja sytuacja wymaga indywidualnej oceny — skontaktuj się z ZUS: ${ZUS_CONTACT}.` })
  }
  steps.push({ id: "verify", text: "Traktuj wynik jako szacunek. Ostateczne prawo i kwotę ustala ZUS albo płatnik zasiłku po złożeniu dokumentów." })
  return steps.sort((a, b) => {
    if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate)
    if (a.dueDate) return -1
    if (b.dueDate) return 1
    return 0
  })
}
