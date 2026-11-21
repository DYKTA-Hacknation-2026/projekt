import { daysBetween } from "@zpr/domain"

import type {
  TimelineMilestone,
  TimelinePeriod,
  TimelinePlan,
  TimelineStage,
} from "@/lib/timeline"

export type PlanOwnerFilter = "ALL" | "MAMA" | "TATA" | "OBOJE"
export type PlanTypeFilter = "ALL" | "LEAVE" | "DOCUMENT" | "DEADLINE"

export const ownerFilters: ReadonlyArray<{
  value: PlanOwnerFilter
  label: string
}> = [
  { value: "ALL", label: "Wszyscy" },
  { value: "MAMA", label: "Mama" },
  { value: "TATA", label: "Tata" },
  { value: "OBOJE", label: "Wspólne" },
]

export const typeFilters: ReadonlyArray<{
  value: PlanTypeFilter
  label: string
}> = [
  { value: "ALL", label: "Wszystko" },
  { value: "LEAVE", label: "Urlopy i uprawnienia" },
  { value: "DOCUMENT", label: "Formalności" },
  { value: "DEADLINE", label: "Terminy" },
]

export interface MonthTick {
  date: string
  /** Short month, e.g. "mar". */
  label: string
  /** Year label shown on the first tick and every January. */
  year: string
  left: number
}

export interface TimelineScale {
  start: string
  end: string
  days: number
  ticks: MonthTick[]
  /** Position of today, or null when today is outside the plan. */
  todayLeft: number | null
  /** Position of the birth / due date, if it falls inside the scale. */
  anchorLeft: number | null
}

export interface PeriodBar {
  period: TimelinePeriod
  row: number
  left: number
  width: number
  /** Invisible click target, at least 24px wide. */
  targetLeft: number
  targetWidth: number
}

export interface TimelineTrack {
  owner: "MAMA" | "TATA"
  title: string
  rows: number
  bars: PeriodBar[]
}

export interface EventPoint {
  milestone: TimelineMilestone
  row: number
  left: number
}

export interface SharedTrack {
  rows: number
  points: EventPoint[]
}

export interface TimelineView {
  periods: TimelinePeriod[]
  /** All milestones after filtering, for the table and details. */
  milestones: TimelineMilestone[]
  /** Only dated points drawn on the chart. */
  points: TimelineMilestone[]
  tracks: TimelineTrack[]
  shared: SharedTrack
  sharedTitle: string
  sharedHint: string
  scale: TimelineScale
}

const monthFormatter = new Intl.DateTimeFormat("pl-PL", {
  month: "short",
  timeZone: "UTC",
})

const monthYearFormatter = new Intl.DateTimeFormat("pl-PL", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
})

function parse(value: string): Date {
  return new Date(`${value}T00:00:00Z`)
}

function iso(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function addDays(value: string, days: number): string {
  const date = parse(value)
  date.setUTCDate(date.getUTCDate() + days)
  return iso(date)
}

function startOfMonth(value: string): string {
  const date = parse(value)
  date.setUTCDate(1)
  return iso(date)
}

function endOfMonth(value: string): string {
  const date = parse(value)
  date.setUTCDate(1)
  date.setUTCMonth(date.getUTCMonth() + 1)
  date.setUTCDate(0)
  return iso(date)
}

function nextMonth(value: string): string {
  const date = parse(value)
  date.setUTCDate(1)
  date.setUTCMonth(date.getUTCMonth() + 1)
  return iso(date)
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function percentile(value: string, start: string, end: string): number {
  const total = Math.max(1, daysBetween(start, end) + 1)
  return clamp((daysBetween(start, value) / total) * 100, 0, 100)
}

/**
 * A month-snapped time scale shared by every track. Every track uses the same
 * `left` / `width` percentages, so periods can be compared across parents.
 */
export function buildTimelineScale(
  periods: readonly TimelinePeriod[],
  milestones: readonly TimelineMilestone[],
  today?: string,
  anchorDate?: string
): TimelineScale {
  const dates = [
    ...periods.flatMap((period) => [period.start, period.end]),
    ...milestones.map((milestone) => milestone.date),
  ].filter(Boolean)
  const fallback = today ?? "2027-01-01"
  const first = dates.sort()[0] ?? fallback
  const last = [...dates].sort().at(-1) ?? fallback
  const start = startOfMonth(addDays(first, -7))
  const end = endOfMonth(addDays(last, 7))
  const days = Math.max(1, daysBetween(start, end) + 1)
  const ticks: MonthTick[] = []
  let cursor = start
  let index = 0
  while (cursor <= end && index < 60) {
    const date = parse(cursor)
    const showYear = index === 0 || date.getUTCMonth() === 0
    ticks.push({
      date: cursor,
      label: monthFormatter.format(date).replace(".", ""),
      year: showYear ? monthYearFormatter.format(date).split(" ").at(-1) ?? "" : "",
      left: percentile(cursor, start, end),
    })
    cursor = nextMonth(cursor)
    index += 1
  }
  const todayLeft =
    today && today >= start && today <= end
      ? percentile(today, start, end)
      : null
  const anchorLeft =
    anchorDate && anchorDate >= start && anchorDate <= end
      ? percentile(anchorDate, start, end)
      : null
  return { start, end, days, ticks, todayLeft, anchorLeft }
}

function buildTrack(
  owner: "MAMA" | "TATA",
  periods: readonly TimelinePeriod[],
  scale: TimelineScale
): TimelineTrack {
  // 24px at the 948px chart cell used by the desktop timeline.
  const minTarget = 2.8
  const gap = 0.4
  const positioned = [...periods]
    .sort((a, b) =>
      a.start === b.start ? a.end.localeCompare(b.end) : a.start.localeCompare(b.start)
    )
    .map((period) => {
      const left = percentile(period.start, scale.start, scale.end)
      const right = percentile(addDays(period.end, 1), scale.start, scale.end)
      return {
        period,
        left,
        width: clamp(right - left, 0.8, 100 - left),
      }
    })

  const rows: PeriodBar[][] = []
  const placed: PeriodBar[] = []
  const fits = (
    row: PeriodBar[],
    targetLeft: number,
    targetWidth: number,
    requireGap = true
  ) =>
    row.every((bar) => {
      const space = requireGap ? gap : 0
      return (
        targetLeft + targetWidth + space <= bar.targetLeft ||
        targetLeft >= bar.targetLeft + bar.targetWidth + space
      )
    })
  const place = (
    bar: (typeof positioned)[number],
    targetLeft: number,
    targetWidth: number,
    forceRow?: number,
    requireGap = true
  ) => {
    let row =
      forceRow ??
      rows.findIndex((candidate) =>
        fits(candidate, targetLeft, targetWidth, requireGap)
      )
    if (row === -1) {
      row = rows.length
      rows.push([])
    }
    const placedBar: PeriodBar = {
      period: bar.period,
      left: bar.left,
      width: bar.width,
      row,
      targetLeft,
      targetWidth,
    }
    rows[row]!.push(placedBar)
    placed.push(placedBar)
  }

  // Place full-size periods first so short ones can use the free space around
  // them without pushing the main sequence onto extra rows. Full-size targets
  // may touch each other; only short targets need a gap for WCAG target size.
  for (const bar of positioned) {
    if (bar.width >= minTarget) {
      place(bar, bar.left, bar.width, undefined, false)
    }
  }
  for (const bar of positioned) {
    if (bar.width >= minTarget) continue
    const candidates = [
      bar.left,
      bar.left + bar.width - minTarget,
      bar.left - (minTarget - bar.width) / 2,
    ]
      .map((left) => clamp(left, 0, 100 - minTarget))
      .filter((left, index, list) => list.indexOf(left) === index)
    const chosen =
      rows
        .flatMap((row, rowIndex) =>
          candidates.map((targetLeft) => ({ rowIndex, targetLeft }))
        )
        .find(({ rowIndex, targetLeft }) =>
          fits(rows[rowIndex]!, targetLeft, minTarget)
        ) ?? {
        rowIndex: rows.length,
        targetLeft: candidates[0] ?? bar.left,
      }
    if (chosen.rowIndex === rows.length) rows.push([])
    place(bar, chosen.targetLeft, minTarget, chosen.rowIndex)
  }

  placed.sort((a, b) => a.row - b.row || a.left - b.left)
  return {
    owner,
    title: owner === "MAMA" ? "Mama" : "Tata",
    rows: Math.max(1, rows.length),
    bars: placed,
  }
}

function buildSharedTrack(
  milestones: readonly TimelineMilestone[],
  scale: TimelineScale
): SharedTrack {
  const sorted = [...milestones].sort((a, b) =>
    a.date === b.date ? a.id.localeCompare(b.id) : a.date.localeCompare(b.date)
  )
  const rows: number[] = []
  const points = sorted.map((milestone) => {
    const left = percentile(milestone.date, scale.start, scale.end)
    let row = 0
    while (row < rows.length && left - rows[row]! < 16) row += 1
    rows[row] = left
    return { milestone, row, left }
  })
  return { rows: Math.max(1, rows.length), points }
}

/**
 * Applies the owner / type filters. Periods belong to one parent; shared
 * milestones belong to both. A parent filter shows that parent's track
 * without the other parent's periods.
 */
export function filterTimeline(
  plan: TimelinePlan,
  owner: PlanOwnerFilter,
  type: PlanTypeFilter
): Pick<TimelineView, "periods" | "milestones" | "points"> {
  const ownerMatches = (value: string) =>
    owner === "ALL" ? true : value === owner
  const periods =
    type === "ALL" || type === "LEAVE"
      ? plan.periods.filter((period) => ownerMatches(period.owner))
      : []
  const milestones = plan.milestones.filter((milestone) => {
    if (!ownerMatches(milestone.owner)) return false
    if (type === "ALL") return true
    if (type === "LEAVE") return milestone.category === "LEAVE"
    return milestone.category === type
  })
  const points = milestones.filter(
    (milestone) =>
      milestone.category === "DOCUMENT" || milestone.category === "DEADLINE"
  )
  return { periods, milestones, points }
}

export function buildTimelineView(
  plan: TimelinePlan,
  owner: PlanOwnerFilter,
  type: PlanTypeFilter,
  today?: string
): TimelineView {
  const filtered = filterTimeline(plan, owner, type)
  const scale = buildTimelineScale(
    filtered.periods,
    filtered.points,
    today,
    plan.anchor.date
  )
  const tracks = (["MAMA", "TATA"] as const)
    .map((trackOwner) =>
      buildTrack(
        trackOwner,
        filtered.periods.filter((period) => period.owner === trackOwner),
        scale
      )
    )
    .filter((track) => track.bars.length > 0)
  const shared = buildSharedTrack(filtered.points, scale)
  const sharedTitle =
    owner === "MAMA"
      ? "Mama — terminy"
      : owner === "TATA"
        ? "Tata — terminy"
        : "Wspólne"
  const sharedHint =
    owner === "ALL" || owner === "OBOJE"
      ? "terminy i formalności"
      : "formalności rodzica"
  return { ...filtered, tracks, shared, sharedTitle, sharedHint, scale }
}

export interface PlanTask {
  milestone: TimelineMilestone
  date: string
  daysUntil: number
  status: "today" | "upcoming" | "overdue"
}

/**
 * The next actionable formalność. Only document / deadline milestones with a
 * concrete date qualify — a leave start is not a task.
 */
export function findNextTask(
  plan: TimelinePlan,
  today: string
): { next: PlanTask | null; overdue: PlanTask | null } {
  const candidates = plan.milestones
    .filter(
      (milestone) =>
        (milestone.category === "DOCUMENT" ||
          milestone.category === "DEADLINE") &&
        milestone.basis !== "PLAN"
    )
    .map((milestone) => {
      const daysUntil = daysBetween(today, milestone.date)
      return {
        milestone,
        date: milestone.date,
        daysUntil,
        status:
          daysUntil === 0
            ? ("today" as const)
            : daysUntil > 0
              ? ("upcoming" as const)
              : ("overdue" as const),
      }
    })
    .sort((a, b) => a.date.localeCompare(b.date))
  return {
    next: candidates.find((task) => task.status !== "overdue") ?? null,
    overdue: [...candidates].reverse().find((task) => task.status === "overdue") ?? null,
  }
}

/** The nearest dated milestone in either direction, for the header summary. */
export function findNearestDate(
  plan: TimelinePlan,
  today: string
): TimelineMilestone | null {
  const dated = [...plan.milestones].sort((a, b) =>
    a.date.localeCompare(b.date)
  )
  return (
    dated.find((milestone) => milestone.date >= today) ??
    dated.at(-1) ??
    null
  )
}

export function getCurrentStage(
  plan: TimelinePlan,
  today: string
): TimelineStage | null {
  const stages = plan.stages
  const inside = stages.find(
    (stage) =>
      stage.start &&
      stage.end &&
      stage.start <= today &&
      today <= stage.end
  )
  if (inside) return inside
  const upcoming = stages.find((stage) => stage.start && stage.start > today)
  if (upcoming) return upcoming
  return stages.at(-1) ?? null
}

export function formatDateRange(
  start: string | null | undefined,
  end?: string | null
): string {
  if (!start) return "Termin nieustalony"
  const startText = shortDate(start)
  if (!end || end === start) return startText
  return `${startText} – ${shortDate(end)}`
}

const shortFormatter = new Intl.DateTimeFormat("pl-PL", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
})

function shortDate(value: string): string {
  return shortFormatter.format(parse(value)).replace(".", "")
}

export function durationLabel(days: number): string {
  if (days <= 0) return "0 dni"
  const weeks = Math.floor(days / 7)
  const rest = days % 7
  if (weeks === 0) return `${rest} dn.`
  if (rest === 0) return `${weeks} tyg.`
  return `${weeks} tyg. ${rest} dn.`
}

export function daysUntilLabel(days: number): string {
  if (days === 0) return "Dziś"
  if (days === 1) return "Jutro"
  if (days > 1) return `Za ${days} dni`
  if (days === -1) return "Wczoraj"
  return `${Math.abs(days)} dni temu`
}

export function basisLabel(basis: TimelineMilestone["basis"]): string {
  switch (basis) {
    case "STATUTORY":
      return "Termin ustawowy"
    case "RECOMMENDED":
      return "Zalecane działanie"
    case "PLAN":
      return "Wynika z planu"
    default:
      return "Termin"
  }
}

export function statusLabel(
  start: string,
  end: string | undefined,
  today: string
): string {
  if (end && start <= today && today <= end) return "Trwa"
  if (end && end < today) return "Zakończony"
  if (start > today) return "Zaplanowany"
  if (!end && start === today) return "Dziś"
  return "W toku"
}

export function periodStatusLabel(period: TimelinePeriod, today: string): string {
  if (period.start <= today && today <= period.end) return "Trwa"
  if (period.end < today) return "Zakończony"
  return "Zaplanowany"
}
