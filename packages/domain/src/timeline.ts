import { formatRatePercent } from "./money"
import type { RuleSet } from "./rule-set"
import { addDays } from "./dates"
import { evaluate } from "./engine/evaluate"
import { latestRuleSet, ruleSetFor } from "./engine/rulesets"
import type { AssessmentInput, ParentInput } from "./engine/types"

export type TimelineOwner = "MAMA" | "TATA" | "OBOJE"
export type TimelineCategory = "LEAVE" | "BENEFIT" | "DOCUMENT" | "DEADLINE"

export interface TimelineMilestone {
  id: string
  date: string
  endDate?: string
  title: string
  description: string
  owner: TimelineOwner
  category: TimelineCategory
  legalReference: string
}

export interface TimelinePlan {
  input: TimelineInput
  maternityWeeks: number
  postBirthWeeks: number
  parentalPoolWeeks: number
  secondParentWeeks: number
  motherParentalWeeks: number
  milestones: TimelineMilestone[]
}

export interface TimelineInput {
  dueDate: string
  maternityWeeksBeforeBirth: number
  childrenCount: number
  secondParentParentalWeeks: number
  paternityDays: number
  hasZaZyciem: boolean
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

/**
 * Two-parent leave planner for the UI. An adapter over the engine schedule
 * (`./engine`), so periods and deadlines follow the same rules as the
 * calculator; both parents are assumed to be insured employees.
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
  const request: AssessmentInput = {
    asOf: input.dueDate,
    // The planner is a what-if tool: dates outside the supported versions use the current rules.
    ruleSetVersion: ruleSetFor(input.dueDate)
      ? undefined
      : latestRuleSet().version,
    event: {
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
      maternityWeeksBeforeBirth: preBirthWeeks,
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
  const { schedule } = evaluate(request, engineRules)
  const periods = schedule?.periods ?? []
  const find = (predicate: (period: (typeof periods)[number]) => boolean) =>
    periods.find(predicate)
  const maternity = periods.filter(
    (period) => period.benefit === "MATERNITY" && period.parent === "MOTHER"
  )
  const maternityStart = maternity[0]?.start ?? input.dueDate
  const maternityEnd = schedule?.maternityEnd ?? input.dueDate
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
  const birth = input.dueDate

  const milestones: TimelineMilestone[] = [
    {
      id: "maternity-start",
      date: maternityStart,
      title: "Start urlopu macierzyńskiego",
      description:
        preBirthWeeks > 0
          ? `Mama może rozpocząć urlop do ${preBirthWeeks} tyg. przed porodem. Potrzebne zaświadczenie o przewidywanym terminie porodu.`
          : "Mama pracuje do porodu; urlop macierzyński zaczyna się w dniu porodu.",
      owner: "MAMA",
      category: "LEAVE",
      legalReference: "KP art. 180 § 1–2, art. 183¹; LR-123",
    },
    {
      id: "birth",
      date: birth,
      title: "Przewidywany termin porodu",
      description:
        "W dniu porodu powstaje prawo do zasiłku macierzyńskiego; od tej daty liczy się większość terminów.",
      owner: "OBOJE",
      category: "DEADLINE",
      legalReference: "U art. 29 ust. 1; LR-120",
    },
    {
      id: "maternity-end",
      date: maternityEnd,
      title: "Koniec urlopu macierzyńskiego",
      description: `Po porodzie pozostaje ${maternityWeeks - preBirthWeeks} tygodni urlopu (łącznie ${maternityWeeks} tyg.).`,
      owner: "MAMA",
      category: "LEAVE",
      legalReference: "KP art. 180 § 1; LR-123",
    },
  ]
  if (motherParental.length > 0) {
    milestones.push(
      {
        id: "parental-start",
        date: motherParental[0]!.start,
        title: "Start urlopu rodzicielskiego mamy",
        description: `Mama może wykorzystać najwyżej ${motherParentalWeeks} tygodni — ${ruleSet.parental.nonTransferableWeeks} tygodni puli jest zarezerwowanych dla taty. Wniosek najpóźniej ${ruleSet.deadlines.parentalRequestNoticeDays} dni przed rozpoczęciem.`,
        owner: "MAMA",
        category: "LEAVE",
        legalReference: "KP art. 182¹a § 4, art. 182¹d; LR-127",
      },
      {
        id: "parental-end",
        date: motherParental[motherParental.length - 1]!.end,
        title: "Koniec urlopu rodzicielskiego mamy",
        description: `Urlop można dzielić na maksymalnie ${ruleSet.parental.maxParts} części, nie później niż do końca roku, w którym dziecko kończy ${ruleSet.parental.deadlineChildAgeYears} lat.`,
        owner: "MAMA",
        category: "LEAVE",
        legalReference: "KP art. 182¹c; LR-127",
      }
    )
  }
  milestones.push(
    {
      id: "application-815",
      date: addDays(birth, ruleSet.deadlines.flatRateApplicationDays),
      title: `Termin wniosku o ${formatRatePercent(ruleSet.parental.flatRate)}`,
      description: `Aby otrzymać ${formatRatePercent(ruleSet.parental.flatRate)} za cały okres, mama składa pisemny wniosek nie później niż ${ruleSet.deadlines.flatRateApplicationDays} dni po porodzie.`,
      owner: "MAMA",
      category: "DEADLINE",
      legalReference: "U art. 30a ust. 1; LR-130A",
    },
    {
      id: "documents",
      date: addDays(birth, ruleSet.deadlines.employerForwardingDays),
      title: "Dokumenty do płatnika",
      description: `Gdy zasiłek wypłaca ZUS, płatnik przekazuje dokumenty do ZUS w ciągu ${ruleSet.deadlines.employerForwardingDays} dni od ich otrzymania.`,
      owner: "OBOJE",
      category: "DOCUMENT",
      legalReference: "U art. 61b; LR-110",
    }
  )
  if (fatherParental.length > 0) {
    milestones.push({
      id: "second-parent",
      date: fatherParental[0]!.start,
      endDate: fatherParental[fatherParental.length - 1]!.end,
      title: `Urlop rodzicielski taty — ${secondParentWeeks} tyg.`,
      description: `Część zarezerwowana dla drugiego rodzica, płatna ${formatRatePercent(ruleSet.parental.rate)}. Nie można jej przenieść na mamę; niewykorzystana przepada.`,
      owner: "TATA",
      category: "LEAVE",
      legalReference: "KP art. 182¹a § 4; U art. 31 ust. 3f; LR-130B",
    })
  }
  if (paternity) {
    milestones.push({
      id: "paternity",
      date: paternity.start,
      endDate: paternity.end,
      title: `Urlop ojcowski — ${paternity.days} dni`,
      description: `Jednorazowo lub w ${ruleSet.paternity.maxParts} częściach po co najmniej ${ruleSet.paternity.minPartDays} dni, do ukończenia przez dziecko ${ruleSet.paternity.deadlineMonths} miesięcy. Wniosek co najmniej ${ruleSet.deadlines.paternityRequestNoticeDays} dni wcześniej.`,
      owner: "TATA",
      category: "LEAVE",
      legalReference: "KP art. 182³; LR-133",
    })
    if (schedule?.paternityDeadline) {
      milestones.push({
        id: "paternity-deadline",
        date: schedule.paternityDeadline,
        title: "Koniec terminu urlopu ojcowskiego",
        description: `Urlop ojcowski trzeba wykorzystać do ukończenia przez dziecko ${ruleSet.paternity.deadlineMonths}. miesiąca życia; potem prawo wygasa.`,
        owner: "TATA",
        category: "DEADLINE",
        legalReference: "KP art. 182³ § 1; LR-133",
      })
    }
  }

  milestones.sort((a, b) => a.date.localeCompare(b.date))

  return {
    input: {
      ...input,
      childrenCount: children,
      maternityWeeksBeforeBirth: preBirthWeeks,
      secondParentParentalWeeks: secondParentWeeks,
      paternityDays,
    },
    maternityWeeks,
    postBirthWeeks: maternityWeeks - preBirthWeeks,
    parentalPoolWeeks: poolWeeks,
    secondParentWeeks:
      fatherParental.reduce((sum, period) => sum + period.days, 0) / 7,
    motherParentalWeeks,
    milestones,
  }
}
