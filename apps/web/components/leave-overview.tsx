"use client"

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs"
import { cn } from "@workspace/ui/lib/utils"
import { formatDate } from "@/lib/format"
import {
  addDays,
  buildTimeline,
  daysBetween,
  type TimelineMilestone,
} from "@/lib/timeline"

type Owner = "MAMA" | "SECOND"

interface Period {
  id: string
  label: string
  shortLabel: string
  owner: Owner
  start: string
  end: string
  barClass: string
  dotClass: string
  durationLabel: string
}

const examplePlan = buildTimeline({
  dueDate: "2027-03-10",
  maternityWeeksBeforeBirth: 2,
  childrenCount: 1,
  secondParentParentalWeeks: 9,
  paternityDays: 14,
  hasZaZyciem: false,
})

function milestone(id: string): TimelineMilestone {
  const found = examplePlan.milestones.find((item) => item.id === id)
  if (!found) {
    throw new Error(`Brak kamienia osi czasu: ${id}`)
  }
  return found
}

function duration(start: string, end: string, unit: "weeks" | "days") {
  const count = daysBetween(start, end) + 1
  if (unit === "days") return `${count} dni`
  return `${Math.round(count / 7)} tyg.`
}

const maternity = milestone("maternity-start")
const maternityEnd = milestone("maternity-end")
const parental = milestone("parental-start")
const parentalEnd = milestone("parental-end")
const secondParent = milestone("second-parent")
const paternity = milestone("paternity")

const periods: Period[] = [
  {
    id: "maternity",
    label: "Urlop macierzyński mamy",
    shortLabel: "Macierzyński",
    owner: "MAMA",
    start: maternity.date,
    end: maternityEnd.date,
    barClass: "bg-primary text-primary-foreground",
    dotClass: "bg-primary",
    durationLabel: duration(maternity.date, maternityEnd.date, "weeks"),
  },
  {
    id: "mother-parental",
    label: "Urlop rodzicielski mamy",
    shortLabel: "Rodzicielski mamy",
    owner: "MAMA",
    start: parental.date,
    end: parentalEnd.date,
    barClass: "bg-primary/20 text-primary ring-1 ring-primary/30 ring-inset",
    dotClass: "bg-primary/30",
    durationLabel: duration(parental.date, parentalEnd.date, "weeks"),
  },
  {
    id: "second-parent",
    label: "Urlop rodzicielski drugiego rodzica",
    shortLabel: "9 tyg.",
    owner: "SECOND",
    start: secondParent.date,
    end: secondParent.endDate ?? secondParent.date,
    barClass:
      "bg-success/25 text-success-foreground ring-1 ring-success/40 ring-inset",
    dotClass: "bg-success/40",
    durationLabel: duration(
      secondParent.date,
      secondParent.endDate ?? secondParent.date,
      "weeks"
    ),
  },
  {
    id: "paternity",
    label: "Urlop ojcowski",
    shortLabel: "Ojcowski",
    owner: "SECOND",
    start: paternity.date,
    end: paternity.endDate ?? paternity.date,
    barClass:
      "bg-warning/40 text-warning-foreground ring-1 ring-warning/50 ring-inset",
    dotClass: "bg-warning",
    durationLabel: duration(
      paternity.date,
      paternity.endDate ?? paternity.date,
      "days"
    ),
  },
]

const rangeStart = addDays(
  periods.reduce(
    (earliest, item) => (item.start < earliest ? item.start : earliest),
    periods[0]!.start
  ),
  -7
)
const rangeEnd = addDays(
  periods.reduce(
    (latest, item) => (item.end > latest ? item.end : latest),
    periods[0]!.end
  ),
  7
)
const totalDays = Math.max(daysBetween(rangeStart, rangeEnd), 1)

const ownerRows: Array<{ owner: Owner; label: string }> = [
  { owner: "MAMA", label: "Mama" },
  { owner: "SECOND", label: "Drugi rodzic" },
]

function position(period: Period) {
  const left = (daysBetween(rangeStart, period.start) / totalDays) * 100
  const width = ((daysBetween(period.start, period.end) + 1) / totalDays) * 100
  return { left, width }
}

function TimelineRows({ owners }: { owners: Owner[] }) {
  return (
    <div className="mt-5 space-y-3">
      <div className="flex items-center justify-between gap-3 text-[11px] text-muted-foreground">
        <span>{formatDate(rangeStart)}</span>
        <span className="hidden sm:inline">wspólna oś czasu</span>
        <span>{formatDate(rangeEnd)}</span>
      </div>

      {ownerRows
        .filter((row) => owners.includes(row.owner))
        .map((row) => (
          <div
            key={row.owner}
            className="grid grid-cols-[4.75rem_minmax(0,1fr)] items-center gap-3 sm:grid-cols-[6.5rem_minmax(0,1fr)]"
          >
            <span className="text-xs font-medium text-muted-foreground">
              {row.label}
            </span>
            <div className="relative h-11 overflow-hidden rounded-lg bg-secondary/70">
              {periods
                .filter((period) => period.owner === row.owner)
                .map((period) => {
                  const { left, width } = position(period)
                  return (
                    <div
                      key={period.id}
                      className={cn(
                        "absolute inset-y-1.5 flex items-center overflow-hidden rounded-md",
                        period.barClass
                      )}
                      style={{
                        left: `${left}%`,
                        width: `${Math.max(width, 1.4)}%`,
                      }}
                      title={`${period.label}: ${formatDate(period.start)} – ${formatDate(period.end)} (${period.durationLabel})`}
                    >
                      {width >= 12 && (
                        <span className="truncate px-1.5 text-[10px] font-medium">
                          {period.shortLabel}
                        </span>
                      )}
                    </div>
                  )
                })}
            </div>
          </div>
        ))}

      <p className="text-[11px] text-muted-foreground">
        Pełne nazwy i daty każdego okresu znajdziesz poniżej.
      </p>
    </div>
  )
}

function PeriodList({ owners }: { owners: Owner[] }) {
  return (
    <ul className="mt-5 grid gap-2 sm:grid-cols-2">
      {periods
        .filter((period) => owners.includes(period.owner))
        .map((period) => (
          <li
            key={period.id}
            className="flex items-start gap-2 rounded-lg bg-secondary/40 p-2.5"
          >
            <span
              aria-hidden="true"
              className={cn("mt-1 size-3 shrink-0 rounded-sm", period.dotClass)}
            />
            <div>
              <p className="text-xs font-medium">{period.label}</p>
              <p className="text-[11px] text-muted-foreground">
                {formatDate(period.start)} – {formatDate(period.end)} ·{" "}
                {period.durationLabel}
              </p>
            </div>
          </li>
        ))}
    </ul>
  )
}

export function LeaveOverview() {
  return (
    <Tabs defaultValue="all">
      <TabsList
        aria-label="Widok osi czasu urlopów"
        className="grid h-auto w-full grid-cols-3 sm:w-fit"
      >
        <TabsTrigger value="all" className="h-8 px-3">
          Razem
        </TabsTrigger>
        <TabsTrigger value="mama" className="h-8 px-3">
          Mama
        </TabsTrigger>
        <TabsTrigger value="second" className="h-8 px-3">
          Drugi rodzic
        </TabsTrigger>
      </TabsList>

      <TabsContent value="all">
        <TimelineRows owners={["MAMA", "SECOND"]} />
        <PeriodList owners={["MAMA", "SECOND"]} />
      </TabsContent>

      <TabsContent value="mama">
        <TimelineRows owners={["MAMA"]} />
        <PeriodList owners={["MAMA"]} />
      </TabsContent>

      <TabsContent value="second">
        <TimelineRows owners={["SECOND"]} />
        <PeriodList owners={["SECOND"]} />
      </TabsContent>
    </Tabs>
  )
}
