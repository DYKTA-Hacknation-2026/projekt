import { addDays, addMonths } from "./dates"
import { formatRatePercent } from "./money"
import type { RuleSet } from "./rule-set"

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

  const maternityWeeks =
    ruleSet.maternity.weeksByChildren[children] ??
    ruleSet.maternity.weeksByChildren[ruleSet.maternity.maxChildren] ??
    0
  const postBirthWeeks = maternityWeeks - preBirthWeeks
  const parentalPoolWeeks = input.hasZaZyciem
    ? children > 1
      ? ruleSet.parental.poolWeeks.zaZyciemMultiple
      : ruleSet.parental.poolWeeks.zaZyciemSingle
    : children > 1
      ? ruleSet.parental.poolWeeks.multiple
      : ruleSet.parental.poolWeeks.single

  const boundedSecondParentWeeks = Math.min(
    secondParentWeeks,
    parentalPoolWeeks
  )
  const motherParentalWeeks = parentalPoolWeeks - boundedSecondParentWeeks

  const birth = input.dueDate
  const maternityStart = addDays(birth, -preBirthWeeks * 7)
  const maternityEnd = addDays(birth, postBirthWeeks * 7 - 1)
  const parentalStart = addDays(maternityEnd, 1)
  const parentalEnd = addDays(parentalStart, motherParentalWeeks * 7 - 1)
  const secondParentStart = parentalStart
  const secondParentEnd = addDays(
    secondParentStart,
    boundedSecondParentWeeks * 7 - 1
  )
  // Demo plan: paternity starts after the statutory paternity period, so the
  // milestone stays inside the child's first year for typical inputs.
  const paternityStart = addDays(birth, ruleSet.paternity.days)
  const paternityEnd = addDays(paternityStart, Math.max(paternityDays - 1, 0))

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
      legalReference: "KP art. 180 § 1; LR-123",
    },
    {
      id: "birth",
      date: birth,
      title: "Przewidywany termin porodu",
      description:
        "W dniu porodu zaczyna się ochrona urlopowa i większość terminów dokumentowych.",
      owner: "OBOJE",
      category: "DEADLINE",
      legalReference: "KP art. 180 § 1",
    },
    {
      id: "maternity-end",
      date: maternityEnd,
      title: "Koniec urlopu macierzyńskiego",
      description: `Po porodzie pozostaje ${postBirthWeeks} tygodni urlopu (łącznie ${maternityWeeks} tyg.).`,
      owner: "MAMA",
      category: "LEAVE",
      legalReference: "KP art. 180 § 1; LR-123",
    },
    {
      id: "parental-start",
      date: parentalStart,
      title: "Start urlopu rodzicielskiego mamy",
      description: `Pula dla mamy to ${motherParentalWeeks} tygodni. Wniosek złóż najpóźniej ${ruleSet.deadlines.parentalRequestNoticeDays} dni przed rozpoczęciem.`,
      owner: "MAMA",
      category: "LEAVE",
      legalReference: "KP art. 182¹a; LR-127",
    },
    {
      id: "parental-end",
      date: parentalEnd,
      title: "Koniec urlopu rodzicielskiego mamy",
      description: `Urlop można dzielić na maksymalnie ${ruleSet.parental.maxParts} części, nie później niż do końca roku, w którym dziecko kończy ${ruleSet.parental.deadlineChildAgeYears} lat.`,
      owner: "MAMA",
      category: "LEAVE",
      legalReference: "KP art. 182¹a § 1–4",
    },
    {
      id: "application-815",
      date: addDays(birth, ruleSet.deadlines.flatRateApplicationDays),
      title: `Termin wniosku o ${formatRatePercent(ruleSet.parental.flatRate)}`,
      description: `Aby otrzymać ${formatRatePercent(ruleSet.parental.flatRate)} za cały okres, mama składa pisemny wniosek w ciągu ${ruleSet.deadlines.flatRateApplicationDays} dni od porodu.`,
      owner: "MAMA",
      category: "DEADLINE",
      legalReference: "U art. 31 ust. 4; LR-130",
    },
    {
      id: "documents",
      date: addDays(birth, ruleSet.deadlines.employerForwardingDays),
      title: "Dokumenty do płatnika",
      description: `Pracodawca przekazuje dokumenty do ZUS w ciągu ${ruleSet.deadlines.employerForwardingDays} dni, jeśli to ZUS wypłaca zasiłek.`,
      owner: "OBOJE",
      category: "DOCUMENT",
      legalReference: "R1316 § 2–3; LR-109",
    },
  ]

  if (boundedSecondParentWeeks > 0) {
    milestones.push({
      id: "second-parent",
      date: secondParentStart,
      endDate: secondParentEnd,
      title: `Urlop rodzicielski taty – ${boundedSecondParentWeeks} tyg.`,
      description: `To część zarezerwowana dla drugiego rodzica. Nie można jej przenieść na mamę; można ją wykorzystać później, do końca roku szkolnego.`,
      owner: "TATA",
      category: "LEAVE",
      legalReference: "KP art. 182¹a § 4; LR-127",
    })
  }

  if (paternityDays > 0) {
    milestones.push({
      id: "paternity",
      date: paternityStart,
      endDate: paternityEnd,
      title: `Urlop ojcowski – ${paternityDays} dni`,
      description: `Można go wykorzystać jednorazowo lub w ${ruleSet.paternity.maxParts} częściach po co najmniej ${ruleSet.paternity.minPartDays} dni, do ${ruleSet.paternity.deadlineMonths}. miesiąca życia dziecka.`,
      owner: "TATA",
      category: "LEAVE",
      legalReference: "KP art. 182³; LR-133",
    })

    milestones.push({
      id: "paternity-deadline",
      date: addDays(addMonths(birth, ruleSet.paternity.deadlineMonths), -1),
      title: "Koniec terminu urlopu ojcowskiego",
      description: `Urlop ojcowski trzeba wykorzystać do ukończenia przez dziecko ${ruleSet.paternity.deadlineMonths}. miesiąca życia.`,
      owner: "TATA",
      category: "DEADLINE",
      legalReference: "KP art. 182³; LR-133",
    })
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
    postBirthWeeks,
    parentalPoolWeeks,
    secondParentWeeks: boundedSecondParentWeeks,
    motherParentalWeeks,
    milestones,
  }
}
