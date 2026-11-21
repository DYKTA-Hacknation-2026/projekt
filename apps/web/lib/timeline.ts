import {
  MATERNITY_WEEKS_BY_CHILDREN,
  PARENTAL_POOL_WEEKS,
} from "@zpr/domain"

export type TimelineOwner = "MAMA" | "TATA" | "OBOJE"
export type TimelineCategory =
  | "LEAVE"
  | "BENEFIT"
  | "DOCUMENT"
  | "DEADLINE"

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

function parseDate(value: string): Date {
  const date = new Date(`${value}T00:00:00Z`)
  if (Number.isNaN(date.getTime())) {
    throw new RangeError("Nieprawidłowa data porodu")
  }
  return date
}

export function addDays(value: string, days: number): string {
  const date = parseDate(value)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

export function daysBetween(start: string, end: string): number {
  return Math.round(
    (parseDate(end).getTime() - parseDate(start).getTime()) / 86_400_000
  )
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export function buildTimeline(input: TimelineInput): TimelinePlan {
  const children = clamp(Math.round(input.childrenCount), 1, 5)
  const preBirthWeeks = clamp(
    Math.round(input.maternityWeeksBeforeBirth),
    0,
    6
  )
  const secondParentWeeks = clamp(
    Math.round(input.secondParentParentalWeeks),
    0,
    9
  )
  const paternityDays = clamp(Math.round(input.paternityDays), 0, 14)

  const maternityWeeks = MATERNITY_WEEKS_BY_CHILDREN[children] ?? 37
  const postBirthWeeks = maternityWeeks - preBirthWeeks
  const parentalPoolWeeks = input.hasZaZyciem
    ? children > 1
      ? PARENTAL_POOL_WEEKS.zaZyciemMultiple
      : PARENTAL_POOL_WEEKS.zaZyciemSingle
    : children > 1
      ? PARENTAL_POOL_WEEKS.multiple
      : PARENTAL_POOL_WEEKS.single

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
  const paternityStart = addDays(birth, 14)
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
      description: `Pula dla mamy to ${motherParentalWeeks} tygodni. Wniosek złóż najpóźniej 21 dni przed rozpoczęciem.`,
      owner: "MAMA",
      category: "LEAVE",
      legalReference: "KP art. 182¹a; LR-127",
    },
    {
      id: "parental-end",
      date: parentalEnd,
      title: "Koniec urlopu rodzicielskiego mamy",
      description:
        "Urlop można dzielić na maksymalnie 5 części, nie później niż do końca roku, w którym dziecko kończy 6 lat.",
      owner: "MAMA",
      category: "LEAVE",
      legalReference: "KP art. 182¹a § 1–4",
    },
    {
      id: "application-815",
      date: addDays(birth, 21),
      title: "Termin wniosku o 81,5%",
      description:
        "Aby otrzymać 81,5% za cały okres, mama składa pisemny wniosek w ciągu 21 dni od porodu.",
      owner: "MAMA",
      category: "DEADLINE",
      legalReference: "U art. 31 ust. 4; LR-130",
    },
    {
      id: "documents",
      date: addDays(birth, 7),
      title: "Dokumenty do płatnika",
      description:
        "Pracodawca przekazuje dokumenty do ZUS w ciągu 7 dni, jeśli to ZUS wypłaca zasiłek.",
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
      title: `Urlop rodzicielski taty — ${boundedSecondParentWeeks} tyg.`,
      description:
        "To część zarezerwowana dla drugiego rodzica. Nie można jej przenieść na mamę; można ją wykorzystać później, do końca roku szkolnego.",
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
      title: `Urlop ojcowski — ${paternityDays} dni`,
      description:
        "Można go wykorzystać jednorazowo lub w dwóch częściach po co najmniej 7 dni, do 12. miesiąca życia dziecka.",
      owner: "TATA",
      category: "LEAVE",
      legalReference: "KP art. 182³; LR-133",
    })

    milestones.push({
      id: "paternity-deadline",
      date: addDays(birth, 365),
      title: "Koniec terminu urlopu ojcowskiego",
      description:
        "Urlop ojcowski trzeba wykorzystać do ukończenia przez dziecko 12. miesiąca życia.",
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
