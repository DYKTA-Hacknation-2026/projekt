import { formatRatePercent } from "./money"
import type { RuleSet } from "./rule-set"
import { addDays } from "./dates"
import { evaluate } from "./engine/evaluate"
import { latestRuleSet, ruleSetFor } from "./engine/rulesets"
import { RULES, formatSourceRef, type RuleId } from "./engine/sources"
import type { AssessmentInput, BenefitType, ParentInput } from "./engine/types"
import type { EngineDocument } from "./engine/documents"

export type TimelineOwner = "MAMA" | "TATA" | "OBOJE"
export type TimelineCategory = "LEAVE" | "BENEFIT" | "DOCUMENT" | "DEADLINE"

/**
 * How sure we are about a date:
 * - STATUTORY — a date fixed by law (it may still move with the birth date),
 * - RECOMMENDED — an action date derived from a statutory notice period,
 * - PLAN — a date that follows from the parent's own choices.
 */
export type TimelineBasis = "STATUTORY" | "RECOMMENDED" | "PLAN"

export interface TimelineDocument {
  code: string
  name: string
  preparedBy: EngineDocument["preparedBy"]
  submitTo: EngineDocument["submitTo"]
  when: string
  legalBasis: string
  caveat?: string
}

/** A parental leave / benefit period shown as a bar on the timeline. */
export interface TimelinePeriod {
  id: string
  owner: Exclude<TimelineOwner, "OBOJE">
  title: string
  start: string
  end: string
  days: number
  weeks: string
  benefit: BenefitType
  category: "LEAVE" | "BENEFIT"
  /** Dates are based on the expected due date rather than an actual birth. */
  estimated: boolean
  ratePercent: string
  description: string
  legalReference: string
  ruleIds: RuleId[]
  documents: TimelineDocument[]
}

export interface TimelineMilestone {
  id: string
  date: string
  endDate?: string
  title: string
  description: string
  owner: TimelineOwner
  category: TimelineCategory
  legalReference: string
  /** Defaults to STATUTORY for backwards compatibility with older consumers. */
  basis?: TimelineBasis
  /** The date moves if the birth happens on a different day. */
  estimated?: boolean
  /** A fact is missing, so the date or scope still needs confirmation. */
  needsVerification?: boolean
  /** Who should act, in plain Polish. */
  actionOwner?: string
  documents?: TimelineDocument[]
  ruleIds?: RuleId[]
}

export interface TimelineStage {
  id: string
  number: number
  title: string
  description: string
  start: string | null
  end: string | null
  periodIds: string[]
  milestoneIds: string[]
  tasks: string[]
}

export interface TimelinePlan {
  input: TimelineInput
  anchor: {
    kind: "BIRTH" | "DUE_DATE"
    date: string
    estimated: boolean
  }
  maternityWeeks: number
  postBirthWeeks: number
  parentalPoolWeeks: number
  secondParentWeeks: number
  motherParentalWeeks: number
  periods: TimelinePeriod[]
  stages: TimelineStage[]
  milestones: TimelineMilestone[]
  ruleSetVersion: string
  /** True when every rule used by the plan is verified. */
  verified: boolean
  /** Unknown facts that can change the plan; never guessed. */
  missing: string[]
}

export interface TimelineInput {
  dueDate: string
  /** Actual birth date, when the child is already born. */
  birthDate?: string
  maternityWeeksBeforeBirth: number
  childrenCount: number
  secondParentParentalWeeks: number
  paternityDays: number
  hasZaZyciem: boolean
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function citation(ids: readonly RuleId[]): string {
  const parts = ids.map((id) => {
    const refs = RULES[id].sources.map(formatSourceRef).join("; ")
    return refs ? `${refs} (${id})` : id
  })
  return [...new Set(parts)].join(" • ")
}

function documentsFor(
  benefit: BenefitType,
  documents: EngineDocument[],
  parent: ParentInput["role"] = "MOTHER"
): TimelineDocument[] {
  return documents
    .filter(
      (document) =>
        document.benefits.includes(benefit) &&
        (document.parent === parent || document.parent === "BOTH")
    )
    .map((document) => ({
      code: document.code,
      name: document.name,
      preparedBy: document.preparedBy,
      submitTo: document.submitTo,
      when: document.when,
      legalBasis: document.legalBasis,
      caveat: document.note,
    }))
}

interface PeriodMeta {
  title: string
  description: string
  rate: number
  ruleIds: RuleId[]
}

function periodMeta(
  benefit: BenefitType,
  label: string,
  ruleSet: RuleSet
): PeriodMeta {
  const parentalRate = ruleSet.parental.rate
  switch (benefit) {
    case "PARENTAL":
      return {
        title: label.includes("wydłużenie")
          ? "Wydłużony urlop rodzicielski"
          : "Urlop rodzicielski",
        description:
          "Część wspólnej puli urlopu rodzicielskiego. Urlop można dzielić między rodziców i łączyć z pracą na część etatu.",
        rate: parentalRate,
        ruleIds: ["LR-127", "LR-130"],
      }
    case "PATERNITY":
      return {
        title: "Urlop ojcowski",
        description:
          "Urlop dla drugiego rodzica. Można go wykorzystać jednorazowo lub w częściach, do ukończenia przez dziecko 12. miesiąca życia.",
        rate: ruleSet.maternity.rate,
        ruleIds: ["LR-133", "LR-130"],
      }
    case "SUPPLEMENTARY_MATERNITY":
      return {
        title: "Uzupełniający urlop macierzyński",
        description:
          "Dodatkowy okres po urlopie macierzyńskim, gdy dziecko urodziło się przedwcześnie albo wymagało hospitalizacji.",
        rate: ruleSet.maternity.rate,
        ruleIds: ["LR-126", "LR-130"],
      }
    case "MATERNITY_EQUIVALENT":
      return {
        title: "Zasiłek w wysokości macierzyńskiego",
        description:
          "Świadczenie do dnia porodu, gdy ubezpieczenie ustało w okresie ciąży z przyczyn niezależnych od mamy.",
        rate: ruleSet.maternity.rate,
        ruleIds: ["LR-121A", "LR-130"],
      }
    case "MATERNITY_TERMS":
      return {
        title: "Urlop na warunkach macierzyńskiego",
        description:
          "Urlop przysługujący przy adopcji lub przyjęciu dziecka na wychowanie.",
        rate: ruleSet.maternity.rate,
        ruleIds: ["LR-129", "LR-130"],
      }
    default:
      return {
        title: label.includes("przed porodem")
          ? "Urlop macierzyński — przed porodem"
          : "Urlop macierzyński",
        description:
          "Podstawowy urlop po urodzeniu dziecka. Zasiłek macierzyński przysługuje za cały okres urlopu.",
        rate: ruleSet.maternity.rate,
        ruleIds: ["LR-123", "LR-120", "LR-130"],
      }
  }
}

function isDate(value: string | null | undefined): value is string {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value))
}

function minDate(values: Array<string | null | undefined>): string | null {
  const dates = values.filter(isDate)
  return dates.length > 0 ? dates.sort()[0]! : null
}

function maxDate(values: Array<string | null | undefined>): string | null {
  const dates = values.filter(isDate)
  return dates.length > 0 ? dates.sort().at(-1)! : null
}

/**
 * Two-parent leave planner for the UI. An adapter over the engine schedule
 * (`./engine`), so periods and deadlines follow the same rules as the
 * calculator; both parents are assumed to be insured employees.
 *
 * The result is presentation-ready but never invents a date: dates based on
 * the expected due date are flagged as `estimated`, and unknown facts are
 * returned in `missing` instead of being defaulted to a favourable value.
 */
export function buildTimeline(
  input: TimelineInput,
  ruleSet: RuleSet
): TimelinePlan {
  const children = clamp(
    Math.round(input.childrenCount),
    1,
    ruleSet.maternity.maxChildren
  )
  const preBirthWeeks = clamp(
    Math.round(input.maternityWeeksBeforeBirth),
    0,
    ruleSet.maternity.maxPreBirthWeeks
  )
  const secondParentWeeks = clamp(
    Math.round(input.secondParentParentalWeeks),
    0,
    ruleSet.parental.nonTransferableWeeks
  )
  const paternityDays = clamp(
    Math.round(input.paternityDays),
    0,
    ruleSet.paternity.days
  )
  const insured: ParentInput["insurance"] = { title: "EMPLOYMENT" }
  // Keep the engine's calendar and allocation logic, with the same active
  // database parameters as the calculator and the planner's controls.
  const engineRules = structuredClone(
    ruleSetFor(input.dueDate) ?? latestRuleSet()
  )
  Object.assign(engineRules.parameters.maternity, {
    weeksByChildren: ruleSet.maternity.weeksByChildren,
    maxPreBirthWeeks: ruleSet.maternity.maxPreBirthWeeks,
    motherPersonalWeeks: ruleSet.maternity.motherPersonalWeeks,
  })
  Object.assign(engineRules.parameters.parental, {
    poolWeeks: ruleSet.parental.poolWeeks,
    nonTransferableWeeks: ruleSet.parental.nonTransferableWeeks,
    maxParts: ruleSet.parental.maxParts,
    lastYearChildAge: ruleSet.parental.deadlineChildAgeYears,
    maxWorkFraction: String(ruleSet.parental.maxWorkFraction),
  })
  Object.assign(engineRules.parameters.paternity, {
    maxDays: ruleSet.paternity.days,
    maxParts: ruleSet.paternity.maxParts,
    minPartDays: ruleSet.paternity.minPartDays,
    deadlineChildAgeMonths: ruleSet.paternity.deadlineMonths,
  })
  Object.assign(engineRules.parameters.deadlines, {
    parentalNoticeDays: ruleSet.deadlines.parentalRequestNoticeDays,
    paternityNoticeDays: ruleSet.deadlines.paternityRequestNoticeDays,
  })
  const parameters = engineRules.parameters.parental
  const pool = input.hasZaZyciem
    ? children > 1
      ? parameters.poolWeeks.zaZyciemMultiple
      : parameters.poolWeeks.zaZyciemSingle
    : children > 1
      ? parameters.poolWeeks.multiple
      : parameters.poolWeeks.single
  const birth = input.birthDate ?? input.dueDate
  const actualBirth = isDate(input.birthDate)
  const request: AssessmentInput = {
    asOf: birth,
    // The planner is a what-if tool: dates outside the supported versions use the current rules.
    ruleSetVersion: ruleSetFor(input.dueDate)
      ? undefined
      : latestRuleSet().version,
    event: actualBirth
      ? {
          kind: "BIRTH",
          birthDate: birth,
          childrenCount: children,
          zaZyciem: input.hasZaZyciem,
        }
      : {
          kind: "PREGNANCY",
          expectedDueDate: input.dueDate,
          childrenCount: children,
          zaZyciem: input.hasZaZyciem,
        },
    parents: [
      { role: "MOTHER", insurance: insured },
      { role: "FATHER", insurance: insured },
    ],
    plan: {
      maternityWeeksBeforeBirth: actualBirth ? 0 : preBirthWeeks,
      parentalSegments: [
        // One parent may use at most the pool minus the other parent's 9 weeks (KP art. 182¹a § 4).
        { parent: "MOTHER", weeks: pool - parameters.nonTransferableWeeks },
        ...(secondParentWeeks > 0
          ? [{ parent: "FATHER" as const, weeks: secondParentWeeks }]
          : []),
      ],
      paternity: paternityDays > 0 ? [{ days: paternityDays }] : [],
    },
  }
  const { schedule, documents: documentReport } = evaluate(request, engineRules)
  const periods = schedule?.periods ?? []
  const find = (predicate: (period: (typeof periods)[number]) => boolean) =>
    periods.find(predicate)
  const maternity = periods.filter(
    (period) => period.benefit === "MATERNITY" && period.parent === "MOTHER"
  )
  const maternityStart = maternity[0]?.start ?? birth
  const maternityEnd = schedule?.maternityEnd ?? birth
  const motherParental = periods.filter(
    (period) => period.benefit === "PARENTAL" && period.parent === "MOTHER"
  )
  const fatherParental = periods.filter(
    (period) => period.benefit === "PARENTAL" && period.parent === "FATHER"
  )
  const paternity = find((period) => period.benefit === "PATERNITY")
  const maternityWeeks = (schedule?.maternityDimensionDays ?? 0) / 7
  const poolWeeks = schedule?.poolWeeks ?? 0
  const motherParentalWeeks =
    motherParental.reduce((sum, period) => sum + period.days, 0) / 7
  const estimated = !actualBirth
  const missing: string[] = []
  if (!actualBirth) {
    missing.push(
      "Daty zależą od przewidywanego terminu porodu. Po urodzeniu dziecka zaktualizuj plan — część terminów się przesunie."
    )
  }
  missing.push(
    "Plan zakłada umowę o pracę u obojga rodziców. Przy zleceniu, działalności gospodarczej lub braku ubezpieczenia uprawnienia mogą się różnić."
  )
  missing.push(
    "Nie wiemy, ilu ubezpieczonych zgłasza płatnik. To decyduje, czy zasiłek wypłaca pracodawca, czy ZUS."
  )

  const timelinePeriods: TimelinePeriod[] = periods.map((period) => {
    const meta = periodMeta(period.benefit, period.label, ruleSet)
    return {
      id: period.id,
      owner: period.parent === "MOTHER" ? "MAMA" : "TATA",
      title: meta.title,
      start: period.start,
      end: period.end,
      days: period.days,
      weeks: period.weeks,
      benefit: period.benefit,
      category: period.benefit === "MATERNITY_EQUIVALENT" ? "BENEFIT" : "LEAVE",
      estimated: period.estimated,
      ratePercent: formatRatePercent(meta.rate),
      description: meta.description,
      legalReference: citation(meta.ruleIds),
      ruleIds: meta.ruleIds,
      documents: documentsFor(
        period.benefit,
        documentReport.documents,
        period.parent
      ),
    }
  })

  const milestones: TimelineMilestone[] = [
    {
      id: "maternity-start",
      date: maternityStart,
      title: "Start urlopu macierzyńskiego",
      description:
        preBirthWeeks > 0 && !actualBirth
          ? `Mama może rozpocząć urlop do ${preBirthWeeks} tyg. przed porodem. Potrzebne zaświadczenie o przewidywanym terminie porodu.`
          : "Mama pracuje do porodu; urlop macierzyński zaczyna się w dniu porodu.",
      owner: "MAMA",
      category: "LEAVE",
      legalReference: citation(["LR-123", "LR-134"]),
      basis: "PLAN",
      estimated,
      actionOwner: "Mama",
      documents: documentsFor("MATERNITY", documentReport.documents),
      ruleIds: ["LR-123", "LR-134"],
    },
    {
      id: "birth",
      date: birth,
      title: actualBirth ? "Data porodu" : "Przewidywany termin porodu",
      description: actualBirth
        ? "Rzeczywista data porodu. Od tej daty liczy się większość terminów."
        : "W dniu porodu powstaje prawo do zasiłku macierzyńskiego; od tej daty liczy się większość terminów.",
      owner: "OBOJE",
      category: "DEADLINE",
      legalReference: citation(["LR-120"]),
      basis: "STATUTORY",
      estimated,
      actionOwner: "Oboje rodzice",
      ruleIds: ["LR-120"],
    },
    {
      id: "maternity-end",
      date: maternityEnd,
      title: "Koniec urlopu macierzyńskiego",
      description: `Po porodzie pozostaje ${maternityWeeks - preBirthWeeks} tygodni urlopu (łącznie ${maternityWeeks} tyg.).`,
      owner: "MAMA",
      category: "LEAVE",
      legalReference: citation(["LR-123"]),
      basis: "PLAN",
      estimated,
      actionOwner: "Mama",
      ruleIds: ["LR-123"],
    },
  ]
  if (!actualBirth && preBirthWeeks > 0) {
    milestones.push({
      id: "maternity-pre-birth-request",
      date: addDays(
        maternityStart,
        -ruleSet.deadlines.maternityPreBirthRequestDays
      ),
      title: "Wniosek o urlop macierzyński przed porodem",
      description: `Złóż wniosek do pracodawcy co najmniej ${ruleSet.deadlines.maternityPreBirthRequestDays} dni przed planowanym rozpoczęciem urlopu. Dołącz zaświadczenie o przewidywanym terminie porodu.`,
      owner: "MAMA",
      category: "DOCUMENT",
      legalReference: citation(["LR-134", "LR-135"]),
      basis: "RECOMMENDED",
      estimated,
      actionOwner: "Mama",
      documents: documentsFor("MATERNITY", documentReport.documents),
      ruleIds: ["LR-134", "LR-135"],
    })
  }
  if (motherParental.length > 0) {
    milestones.push(
      {
        id: "parental-start",
        date: motherParental[0]!.start,
        title: "Start urlopu rodzicielskiego mamy",
        description: `Mama może wykorzystać najwyżej ${motherParentalWeeks} tygodni — ${ruleSet.parental.nonTransferableWeeks} tygodni puli jest zarezerwowanych dla taty. Wniosek najpóźniej ${ruleSet.deadlines.parentalRequestNoticeDays} dni przed rozpoczęciem.`,
        owner: "MAMA",
        category: "LEAVE",
        legalReference: citation(["LR-127", "LR-134"]),
        basis: "PLAN",
        estimated,
        actionOwner: "Mama",
        documents: documentsFor("PARENTAL", documentReport.documents),
        ruleIds: ["LR-127", "LR-134"],
      },
      {
        id: "parental-end",
        date: motherParental[motherParental.length - 1]!.end,
        title: "Koniec urlopu rodzicielskiego mamy",
        description: `Urlop można dzielić na maksymalnie ${ruleSet.parental.maxParts} części, nie później niż do końca roku, w którym dziecko kończy ${ruleSet.parental.deadlineChildAgeYears} lat.`,
        owner: "MAMA",
        category: "LEAVE",
        legalReference: citation(["LR-127"]),
        basis: "PLAN",
        estimated,
        actionOwner: "Mama",
        ruleIds: ["LR-127"],
      },
      {
        id: "parental-request-mother",
        date: addDays(
          motherParental[0]!.start,
          -ruleSet.deadlines.parentalRequestNoticeDays
        ),
        title: "Wniosek o urlop rodzicielski mamy",
        description: `Złóż wniosek do pracodawcy najpóźniej ${ruleSet.deadlines.parentalRequestNoticeDays} dni przed rozpoczęciem urlopu lub jego części.`,
        owner: "MAMA",
        category: "DOCUMENT",
        legalReference: citation(["LR-134", "LR-135"]),
        basis: "RECOMMENDED",
        estimated,
        actionOwner: "Mama",
        documents: documentsFor("PARENTAL", documentReport.documents),
        ruleIds: ["LR-134", "LR-135"],
      }
    )
  }
  milestones.push(
    {
      id: "application-815",
      date: addDays(birth, ruleSet.deadlines.flatRateApplicationDays),
      title: `Termin wniosku o ${formatRatePercent(ruleSet.parental.flatRate)}`,
      description: `Aby otrzymać ${formatRatePercent(ruleSet.parental.flatRate)} za cały okres, mama składa pisemny wniosek nie później niż ${ruleSet.deadlines.flatRateApplicationDays} dni po porodzie. Bez wniosku zasiłek za urlop rodzicielski wynosi ${formatRatePercent(ruleSet.parental.rate)}.`,
      owner: "OBOJE",
      category: "DEADLINE",
      legalReference: citation(["LR-130A", "LR-130"]),
      basis: "STATUTORY",
      estimated,
      actionOwner: "Mama",
      documents: documentsFor("PARENTAL", documentReport.documents),
      ruleIds: ["LR-130A", "LR-130"],
    },
    {
      id: "documents",
      date: birth,
      title: "Złóż dokumenty do zasiłku",
      description: `Po porodzie złóż wniosek i dokumenty u płatnika. Płatnik przekazuje dokumenty do ZUS w ciągu ${ruleSet.deadlines.employerForwardingDays} dni od ich otrzymania — ten termin nie jest liczony od porodu.`,
      owner: "OBOJE",
      category: "DOCUMENT",
      legalReference: citation(["LR-135", "LR-111"]),
      basis: "RECOMMENDED",
      estimated,
      needsVerification: true,
      actionOwner: "Oboje rodzice",
      documents: documentsFor("MATERNITY", documentReport.documents),
      ruleIds: ["LR-135", "LR-111"],
    }
  )
  if (fatherParental.length > 0) {
    milestones.push(
      {
        id: "second-parent",
        date: fatherParental[0]!.start,
        endDate: fatherParental[fatherParental.length - 1]!.end,
        title: `Urlop rodzicielski taty — ${secondParentWeeks} tyg.`,
        description: `Część zarezerwowana dla drugiego rodzica, płatna ${formatRatePercent(ruleSet.parental.rate)}. Nie można jej przenieść na mamę; niewykorzystana przepada.`,
        owner: "TATA",
        category: "LEAVE",
        legalReference: citation(["LR-127", "LR-130B"]),
        basis: "PLAN",
        estimated,
        actionOwner: "Tata",
        documents: documentsFor("PARENTAL", documentReport.documents, "FATHER"),
        ruleIds: ["LR-127", "LR-130B"],
      },
      {
        id: "parental-request-father",
        date: addDays(
          fatherParental[0]!.start,
          -ruleSet.deadlines.parentalRequestNoticeDays
        ),
        title: "Wniosek o urlop rodzicielski taty",
        description: `Złóż wniosek do pracodawcy najpóźniej ${ruleSet.deadlines.parentalRequestNoticeDays} dni przed rozpoczęciem części zarezerwowanej dla drugiego rodzica.`,
        owner: "TATA",
        category: "DOCUMENT",
        legalReference: citation(["LR-134", "LR-135"]),
        basis: "RECOMMENDED",
        estimated,
        actionOwner: "Tata",
        documents: documentsFor("PARENTAL", documentReport.documents, "FATHER"),
        ruleIds: ["LR-134", "LR-135"],
      }
    )
  }
  if (paternity) {
    milestones.push(
      {
        id: "paternity",
        date: paternity.start,
        endDate: paternity.end,
        title: `Urlop ojcowski — ${paternity.days} dni`,
        description: `Jednorazowo lub w ${ruleSet.paternity.maxParts} częściach po co najmniej ${ruleSet.paternity.minPartDays} dni, do ukończenia przez dziecko ${ruleSet.paternity.deadlineMonths} miesięcy. Wniosek co najmniej ${ruleSet.deadlines.paternityRequestNoticeDays} dni wcześniej.`,
        owner: "TATA",
        category: "LEAVE",
        legalReference: citation(["LR-133", "LR-134"]),
        basis: "PLAN",
        estimated,
        actionOwner: "Tata",
        documents: documentsFor(
          "PATERNITY",
          documentReport.documents,
          "FATHER"
        ),
        ruleIds: ["LR-133", "LR-134"],
      },
      {
        id: "paternity-request",
        date: addDays(
          paternity.start,
          -ruleSet.deadlines.paternityRequestNoticeDays
        ),
        title: "Wniosek o urlop ojcowski",
        description: `Złóż wniosek do pracodawcy co najmniej ${ruleSet.deadlines.paternityRequestNoticeDays} dni przed rozpoczęciem urlopu.`,
        owner: "TATA",
        category: "DOCUMENT",
        legalReference: citation(["LR-134", "LR-135"]),
        basis: "RECOMMENDED",
        estimated,
        actionOwner: "Tata",
        documents: documentsFor(
          "PATERNITY",
          documentReport.documents,
          "FATHER"
        ),
        ruleIds: ["LR-134", "LR-135"],
      }
    )
    if (schedule?.paternityDeadline) {
      milestones.push({
        id: "paternity-deadline",
        date: schedule.paternityDeadline,
        title: "Koniec terminu urlopu ojcowskiego",
        description: `Urlop ojcowski trzeba wykorzystać do ukończenia przez dziecko ${ruleSet.paternity.deadlineMonths}. miesiąca życia; potem prawo wygasa.`,
        owner: "TATA",
        category: "DEADLINE",
        legalReference: citation(["LR-133"]),
        basis: "STATUTORY",
        estimated,
        actionOwner: "Tata",
        ruleIds: ["LR-133"],
      })
    }
  }

  milestones.sort((a, b) =>
    a.date === b.date ? a.id.localeCompare(b.id) : a.date.localeCompare(b.date)
  )

  const planStart = minDate(timelinePeriods.map((period) => period.start))
  const parentalEnd = maxDate([
    ...motherParental.map((period) => period.end),
    ...fatherParental.map((period) => period.end),
  ])
  const lastMilestoneDate = maxDate(
    milestones.map((milestone) => milestone.date)
  )
  const stageMilestone = (id: string) =>
    milestones.some((item) => item.id === id) ? id : null
  const pick = (...ids: Array<string | null>) =>
    ids.filter((id): id is string => Boolean(id))

  const stages: TimelineStage[] = [
    {
      id: "before-birth",
      number: 1,
      title: "Przygotowania przed narodzinami",
      description:
        preBirthWeeks > 0 && !actualBirth
          ? "Czas na wybór wariantu urlopu, skompletowanie zaświadczeń i złożenie wniosku o urlop przed porodem."
          : "Czas na wybór wariantu urlopu i przygotowanie dokumentów. Urlop macierzyński zacznie się w dniu porodu.",
      start: planStart,
      end: estimated ? addDays(input.dueDate, -1) : null,
      periodIds: [],
      milestoneIds: pick(stageMilestone("maternity-pre-birth-request")),
      tasks: [
        ...(preBirthWeeks > 0 && !actualBirth
          ? ["Złóż wniosek o urlop macierzyński przed porodem."]
          : []),
        "Przygotuj zaświadczenie o przewidywanym terminie porodu.",
        "Zdecyduj, czy mama złoży wniosek o 81,5% za cały okres.",
      ],
    },
    {
      id: "birth",
      number: 2,
      title: "Narodziny dziecka",
      description:
        "Od dnia porodu liczą się najważniejsze terminy. To moment zgłoszenia dziecka i uruchomienia zasiłków.",
      start: birth,
      end: birth,
      periodIds: [],
      milestoneIds: pick(
        "birth",
        stageMilestone("maternity-start"),
        stageMilestone("documents")
      ),
      tasks: [
        "Zgłoś urodzenie dziecka w urzędzie stanu cywilnego.",
        "Złóż wniosek o zasiłek macierzyński i dokumenty u płatnika.",
        `Pamiętaj o wniosku o ${formatRatePercent(ruleSet.parental.flatRate)} w ciągu ${ruleSet.deadlines.flatRateApplicationDays} dni od porodu.`,
      ],
    },
    {
      id: "maternity",
      number: 3,
      title: "Urlop macierzyński",
      description:
        "Mama korzysta z urlopu macierzyńskiego. W tym czasie można zaplanować podział urlopu rodzicielskiego i urlop ojcowski.",
      start: maternityStart,
      end: maternityEnd,
      periodIds: pick(...maternity.map((period) => period.id)),
      milestoneIds: pick(stageMilestone("maternity-end")),
      tasks: [
        `Zaplanuj urlop rodzicielski — wniosek najpóźniej ${ruleSet.deadlines.parentalRequestNoticeDays} dni przed rozpoczęciem.`,
        "Ustal, czy tata wykorzysta swoje 9 tygodni części rodzicielskiego.",
      ],
    },
    {
      id: "parental",
      number: 4,
      title: "Urlop rodzicielski",
      description:
        "Rodzice dzielą wspólną pulę urlopu. Część drugiego rodzica jest zarezerwowana i nie przechodzi na mamę.",
      start: minDate([
        ...motherParental.map((period) => period.start),
        ...fatherParental.map((period) => period.start),
      ]),
      end: parentalEnd,
      periodIds: pick(
        ...motherParental.map((period) => period.id),
        ...fatherParental.map((period) => period.id)
      ),
      milestoneIds: pick(
        stageMilestone("parental-start"),
        stageMilestone("second-parent"),
        stageMilestone("parental-end")
      ),
      tasks: [
        "Złóż wniosek o każdą część urlopu z odpowiednim wyprzedzeniem.",
        "Ustal, kto sprawuje opiekę w poszczególnych miesiącach.",
      ],
    },
    {
      id: "next",
      number: 5,
      title: "Dodatkowe uprawnienia i kolejne terminy",
      description:
        "Urlop ojcowski, terminy graniczne i świadczenia, które można wykorzystać później. Ten etap może częściowo pokrywać się z urlopem rodzicielskim.",
      start: minDate([
        paternity?.start,
        schedule?.paternityDeadline,
        parentalEnd,
      ]),
      end: maxDate([
        parentalEnd,
        schedule?.paternityDeadline,
        lastMilestoneDate,
      ]),
      periodIds: pick(...(paternity ? [paternity.id] : [])),
      milestoneIds: pick(
        stageMilestone("paternity"),
        stageMilestone("paternity-deadline"),
        stageMilestone("application-815")
      ),
      tasks: [
        `Wykorzystaj urlop ojcowski do ukończenia przez dziecko ${ruleSet.paternity.deadlineMonths} miesięcy.`,
        "Sprawdź, czy przysługują dodatkowe świadczenia lub urlopy.",
      ],
    },
  ]

  return {
    input: {
      ...input,
      childrenCount: children,
      maternityWeeksBeforeBirth: preBirthWeeks,
      secondParentParentalWeeks: secondParentWeeks,
      paternityDays,
    },
    anchor: {
      kind: actualBirth ? "BIRTH" : "DUE_DATE",
      date: birth,
      estimated,
    },
    maternityWeeks,
    postBirthWeeks: maternityWeeks - preBirthWeeks,
    parentalPoolWeeks: poolWeeks,
    secondParentWeeks:
      fatherParental.reduce((sum, period) => sum + period.days, 0) / 7,
    motherParentalWeeks,
    periods: timelinePeriods,
    stages,
    milestones,
    ruleSetVersion: ruleSet.version,
    verified: ruleSet.verified,
    missing,
  }
}
