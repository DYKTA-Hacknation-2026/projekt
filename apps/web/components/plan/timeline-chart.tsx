"use client"

import { CalendarClock, FileText, Flag, MoveHorizontal } from "lucide-react"

import { cn } from "@workspace/ui/lib/utils"
import { formatDate } from "@/lib/format"
import {
  durationLabel,
  formatDateRange,
  periodStatusLabel,
  type EventPoint,
  type PeriodBar,
  type TimelineView,
} from "@/lib/timeline-view"
import type {
  TimelineMilestone,
  TimelinePeriod,
} from "@/lib/timeline"
import {
  categoryDot,
  categoryLabel,
  ownerBar,
  ownerDot,
  ownerLabel,
  ownerSurface,
} from "@/components/plan/plan-ui"

interface TimelineChartProps {
  view: TimelineView
  today: string
  selectedId: string | null
  onSelectPeriod: (period: TimelinePeriod) => void
  onSelectMilestone: (milestone: TimelineMilestone) => void
}

function tickAlignment(left: number): string {
  if (left < 5) return "translate-x-0"
  if (left > 95) return "-translate-x-full"
  return "-translate-x-1/2"
}

function GridLines({ view }: { view: TimelineView }) {
  return (
    <div aria-hidden="true">
      {view.scale.ticks.map((tick) => (
        <span
          key={tick.date}
          className="absolute inset-y-0 border-l border-border/35"
          style={{ left: `${tick.left}%` }}
        />
      ))}
    </div>
  )
}

function TodayLine({ view }: { view: TimelineView }) {
  if (view.scale.todayLeft === null) return null
  return (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute inset-y-0 z-0 border-l-2 border-dashed border-primary/45"
      style={{ left: `${view.scale.todayLeft}%` }}
    />
  )
}

function AnchorLine({ view }: { view: TimelineView }) {
  if (view.scale.anchorLeft === null) return null
  return (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute inset-y-0 z-0 border-l border-dashed border-info/45"
      style={{ left: `${view.scale.anchorLeft}%` }}
    />
  )
}

function AxisHeader({ view }: { view: TimelineView }) {
  const dense = view.scale.ticks.length > 12
  return (
    <div
      className="relative h-14 border-b border-border/60"
      aria-hidden="true"
    >
      {view.scale.ticks.map((tick, index) => {
        const showLabel =
          !dense || index === 0 || tick.year !== "" || index % 2 === 0
        return (
          <div
            key={tick.date}
            className={cn(
              "absolute top-2 flex flex-col whitespace-nowrap",
              tickAlignment(tick.left)
            )}
            style={{ left: `${tick.left}%` }}
          >
            {tick.year && (
              <span className="text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
                {tick.year}
              </span>
            )}
            {showLabel && (
              <span className="text-xs font-medium text-muted-foreground">
                {tick.label}
              </span>
            )}
          </div>
        )
      })}
      <span className="absolute right-2 bottom-1 text-[10px] text-muted-foreground">
        wspólna skala czasu
      </span>
    </div>
  )
}

function PeriodBarButton({
  bar,
  selected,
  onSelect,
}: {
  bar: PeriodBar
  selected: boolean
  onSelect: (period: TimelinePeriod) => void
}) {
  const { period } = bar
  const compact = bar.width < 8
  const label = `${period.title}, ${formatDateRange(period.start, period.end)}, ${ownerLabel[period.owner]}, ${durationLabel(period.days)}`
  return (
    <>
      <button
        type="button"
        onClick={() => onSelect(period)}
        title={`${label}. Kliknij, aby zobaczyć szczegóły.`}
        aria-label={`${label}. Pokaż szczegóły.`}
        aria-pressed={selected}
        className="peer absolute z-[2] h-9 cursor-pointer rounded-md focus-visible:ring-3 focus-visible:ring-ring/60 focus-visible:outline-none"
        style={{
          left: `${bar.targetLeft}%`,
          width: `${bar.targetWidth}%`,
          top: `${bar.row * 48 + 6}px`,
        }}
      />
      <span
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute z-[1] flex h-9 flex-col justify-center overflow-hidden rounded-md border px-2 text-left shadow-sm transition-colors peer-hover:brightness-95 peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-background",
          ownerBar[period.owner],
          selected && "ring-2 ring-ring ring-offset-2 ring-offset-background"
        )}
        style={{
          left: `${bar.left}%`,
          width: `${bar.width}%`,
          top: `${bar.row * 48 + 6}px`,
        }}
      >
        <span className="truncate text-[11px] leading-tight font-semibold">
          {compact ? "" : period.title}
        </span>
        <span className="truncate text-[10px] leading-tight">
          {compact ? "" : formatDateRange(period.start, period.end)}
        </span>
      </span>
    </>
  )
}

function SharedPointButton({
  point,
  selected,
  onSelect,
}: {
  point: EventPoint
  selected: boolean
  onSelect: (milestone: TimelineMilestone) => void
}) {
  const { milestone } = point
  const isDocument = milestone.category === "DOCUMENT"
  const Icon = isDocument ? FileText : Flag
  return (
    <div
      className="absolute z-[2] -translate-x-1/2"
      style={{ left: `${point.left}%`, top: `${point.row * 58 + 8}px` }}
    >
      <button
        type="button"
        onClick={() => onSelect(milestone)}
        aria-label={`${milestone.title}, ${formatDate(milestone.date)}, ${ownerLabel[milestone.owner]}, ${categoryLabel[milestone.category]}. Pokaż szczegóły.`}
        aria-pressed={selected}
        className="group flex max-w-[160px] flex-col items-center gap-1 rounded-md p-0.5 focus-visible:ring-3 focus-visible:ring-ring/60 focus-visible:outline-none"
      >
        <span
          className={cn(
            "grid size-4 place-items-center rounded-full border-2 border-background ring-2 ring-offset-1 ring-offset-background transition-transform group-hover:scale-110",
            isDocument ? "bg-info ring-info/35" : "bg-warning ring-warning/35",
            selected && "scale-110 ring-4"
          )}
        >
          <Icon aria-hidden="true" className="size-2 text-background" />
        </span>
        <span
          className={cn(
            "inline-flex max-w-full items-center gap-1 rounded-md border bg-background/95 px-1.5 py-0.5 text-[10px] leading-tight shadow-sm",
            selected
              ? "border-ring text-foreground"
              : "border-border text-muted-foreground"
          )}
        >
          <span
            aria-hidden="true"
            className={cn(
              "size-1.5 shrink-0 rounded-full",
              ownerDot[milestone.owner]
            )}
          />
          <span className="truncate">{milestone.title}</span>
        </span>
      </button>
    </div>
  )
}

function DesktopTimeline({
  view,
  selectedId,
  onSelectPeriod,
  onSelectMilestone,
}: Omit<TimelineChartProps, "today">) {
  return (
    <div className="hidden md:block">
      <div
        role="region"
        aria-label="Wizualna oś czasu planu. Przewiń w poziomie, aby zobaczyć cały okres."
        tabIndex={0}
        className="overflow-x-auto pb-2 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
      >
        <div className="min-w-[1040px]">
          <div className="grid grid-cols-[92px_minmax(0,1fr)]">
            <div aria-hidden="true" />
            <AxisHeader view={view} />
          </div>

          {view.tracks.map((track) => {
            const shortBars = track.bars.filter((bar) => bar.width < 8)
            return (
              <div
                key={track.owner}
                className="grid grid-cols-[92px_minmax(0,1fr)] border-b border-border/60"
              >
                <div className="flex items-start gap-2 py-3 pr-3">
                  <span
                    aria-hidden="true"
                    className={cn(
                      "mt-1.5 size-2.5 shrink-0 rounded-full",
                      ownerDot[track.owner]
                    )}
                  />
                  <div>
                    <p className="text-sm font-semibold">{track.title}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {track.bars.length}{" "}
                      {track.bars.length === 1
                        ? "okres"
                        : track.bars.length < 5
                          ? "okresy"
                          : "okresów"}
                    </p>
                  </div>
                </div>
                <div
                  className="relative"
                  style={{ height: `${track.rows * 48 + 12}px` }}
                >
                  <GridLines view={view} />
                  <TodayLine view={view} />
                  <AnchorLine view={view} />
                  {track.bars.map((bar) => (
                    <PeriodBarButton
                      key={bar.period.id}
                      bar={bar}
                      selected={selectedId === bar.period.id}
                      onSelect={onSelectPeriod}
                    />
                  ))}
                </div>
                {shortBars.length > 0 && (
                  <div className="col-start-2 flex flex-wrap items-center gap-1.5 border-t border-border/30 py-2">
                    <span className="text-[10px] font-medium text-muted-foreground">
                      Krótkie okresy:
                    </span>
                    {shortBars.map((bar) => (
                      <button
                        key={bar.period.id}
                        type="button"
                        onClick={() => onSelectPeriod(bar.period)}
                        aria-pressed={selectedId === bar.period.id}
                        className="inline-flex min-h-7 items-center gap-1.5 rounded-md border border-border bg-background px-2 py-0.5 text-[10px] transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/60 focus-visible:outline-none"
                      >
                        <span
                          aria-hidden="true"
                          className={cn(
                            "size-1.5 rounded-full",
                            ownerDot[bar.period.owner]
                          )}
                        />
                        <span className="font-medium">{bar.period.title}</span>
                        <span className="text-muted-foreground">
                          {formatDateRange(bar.period.start, bar.period.end)} ·{" "}
                          {durationLabel(bar.period.days)}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )
          })}

          {view.shared.points.length > 0 && (
            <div className="grid grid-cols-[92px_minmax(0,1fr)]">
              <div className="flex items-start gap-2 py-3 pr-3">
                <span
                  aria-hidden="true"
                  className={cn("mt-1.5 size-2.5 shrink-0 rounded-full", ownerDot.OBOJE)}
                />
                <div>
                  <p className="text-sm font-semibold">{view.sharedTitle}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {view.sharedHint}
                  </p>
                </div>
              </div>
              <div
                className="relative"
                style={{ height: `${view.shared.rows * 58 + 20}px` }}
              >
                <span
                  aria-hidden="true"
                  className="absolute inset-x-0 top-3 h-px bg-border"
                />
                <GridLines view={view} />
                <TodayLine view={view} />
                <AnchorLine view={view} />
                {view.shared.points.map((point) => (
                  <SharedPointButton
                    key={point.milestone.id}
                    point={point}
                    selected={selectedId === point.milestone.id}
                    onSelect={onSelectMilestone}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
        <MoveHorizontal aria-hidden="true" className="size-3.5" />
        Przewiń oś w poziomie, aby zobaczyć cały plan.
      </p>
    </div>
  )
}

function MobilePeriodItem({
  bar,
  selected,
  today,
  onSelect,
}: {
  bar: PeriodBar
  selected: boolean
  today: string
  onSelect: (period: TimelinePeriod) => void
}) {
  const { period } = bar
  return (
    <li className="relative pb-3">
      <span
        aria-hidden="true"
        className={cn(
          "absolute top-4 -left-[27px] size-3 rounded-full ring-4 ring-background",
          ownerDot[period.owner]
        )}
      />
      <button
        type="button"
        onClick={() => onSelect(period)}
        aria-pressed={selected}
        className={cn(
          "w-full rounded-lg border border-l-4 p-3 text-left transition-colors focus-visible:ring-3 focus-visible:ring-ring/60 focus-visible:outline-none",
          ownerSurface[period.owner],
          selected && "ring-2 ring-ring ring-offset-2 ring-offset-background"
        )}
      >
        <span className="flex flex-wrap items-center gap-1.5">
          <span className="text-sm font-semibold">{period.title}</span>
          <span className="text-[10px]">
            {periodStatusLabel(period, today)}
          </span>
        </span>
        <span className="mt-0.5 block text-xs">
          {formatDateRange(period.start, period.end)}
        </span>
        <span className="mt-0.5 block text-xs">
          {durationLabel(period.days)} · zasiłek {period.ratePercent}
        </span>
      </button>
    </li>
  )
}

function MobileTimeline({
  view,
  today,
  selectedId,
  onSelectPeriod,
  onSelectMilestone,
}: TimelineChartProps) {
  const periodsByOwner = (owner: "MAMA" | "TATA") =>
    view.periods
      .filter((period) => period.owner === owner)
      .sort((a, b) => a.start.localeCompare(b.start))
  const points = [...view.points].sort((a, b) => a.date.localeCompare(b.date))

  return (
    <div className="space-y-7 md:hidden">
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <CalendarClock aria-hidden="true" className="size-3.5" />
        Dziś: {formatDate(today)}. Oś pionowa pokazuje te same okresy i terminy
        co widok na komputerze.
      </p>
      {(["MAMA", "TATA"] as const).map((owner) => {
        const periods = periodsByOwner(owner)
        if (periods.length === 0) return null
        const barsByPeriod = new Map(
          view.tracks
            .find((track) => track.owner === owner)
            ?.bars.map((bar) => [bar.period.id, bar]) ?? []
        )
        return (
          <section key={owner} aria-labelledby={`mobile-${owner}`}>
            <h3
              id={`mobile-${owner}`}
              className="flex items-center gap-2 text-sm font-semibold"
            >
              <span
                aria-hidden="true"
                className={cn("size-2.5 rounded-full", ownerDot[owner])}
              />
              {ownerLabel[owner]}
            </h3>
            <ol className="mt-3 ml-3 space-y-0 border-l border-border pl-5">
              {periods.map((period) => (
                <MobilePeriodItem
                  key={period.id}
                  bar={
                    barsByPeriod.get(period.id) ?? {
                      period,
                      row: 0,
                      left: 0,
                      width: 0,
                      targetLeft: 0,
                      targetWidth: 0,
                    }
                  }
                  selected={selectedId === period.id}
                  today={today}
                  onSelect={onSelectPeriod}
                />
              ))}
            </ol>
          </section>
        )
      })}

      {points.length > 0 && (
        <section aria-labelledby="mobile-shared">
          <h3
            id="mobile-shared"
            className="flex items-center gap-2 text-sm font-semibold"
          >
            <span
              aria-hidden="true"
              className={cn("size-2.5 rounded-full", ownerDot.OBOJE)}
            />
            {view.sharedTitle}
          </h3>
          <ol className="mt-3 ml-3 space-y-2 border-l border-border pl-5">
            {points.map((milestone) => (
              <li key={milestone.id} className="relative">
                <span
                  aria-hidden="true"
                  className={cn(
                    "absolute top-3 -left-[27px] size-3 rounded-full ring-4 ring-background",
                    categoryDot[milestone.category]
                  )}
                />
                <button
                  type="button"
                  onClick={() => onSelectMilestone(milestone)}
                  aria-pressed={selectedId === milestone.id}
                  className={cn(
                    "w-full rounded-lg border border-l-4 p-3 text-left transition-colors focus-visible:ring-3 focus-visible:ring-ring/60 focus-visible:outline-none",
                    ownerSurface[milestone.owner],
                    selectedId === milestone.id &&
                      "ring-2 ring-ring ring-offset-2 ring-offset-background"
                  )}
                >
                  <span className="block text-[11px] font-semibold tracking-wide uppercase">
                    {formatDate(milestone.date)}
                  </span>
                  <span className="mt-0.5 block text-sm font-semibold">
                    {milestone.title}
                  </span>
                  <span className="mt-0.5 block text-xs">
                    {categoryLabel[milestone.category]} ·{" "}
                    {milestone.actionOwner ?? ownerLabel[milestone.owner]}
                  </span>
                </button>
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  )
}

export function TimelineChart(props: TimelineChartProps) {
  return (
    <>
      <DesktopTimeline
        view={props.view}
        selectedId={props.selectedId}
        onSelectPeriod={props.onSelectPeriod}
        onSelectMilestone={props.onSelectMilestone}
      />
      <MobileTimeline {...props} />
    </>
  )
}

export function TimelineLegend({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground",
        className
      )}
    >
      <span className="inline-flex items-center gap-1.5">
        <span aria-hidden="true" className={cn("size-2.5 rounded-full", ownerDot.MAMA)} />
        Mama
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span aria-hidden="true" className={cn("size-2.5 rounded-full", ownerDot.TATA)} />
        Tata
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span aria-hidden="true" className={cn("size-2.5 rounded-full", ownerDot.OBOJE)} />
        Wspólne
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span
          aria-hidden="true"
          className="inline-block h-2.5 w-5 rounded-sm border border-success/50 bg-success/20"
        />
        pasek = urlop lub uprawnienie
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span
          aria-hidden="true"
          className="inline-block h-3 border-l border-dashed border-info/60"
        />
        linia = termin porodu
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span
          aria-hidden="true"
          className="inline-block size-2.5 rounded-full bg-warning ring-2 ring-warning/30"
        />
        punkt = termin lub formalność
      </span>
    </div>
  )
}
