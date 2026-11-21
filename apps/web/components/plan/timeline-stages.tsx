"use client"

import { CheckCircle2, Circle, CalendarRange } from "lucide-react"

import { Badge } from "@workspace/ui/components/badge"
import { cn } from "@workspace/ui/lib/utils"
import {
  formatDateRange,
  getCurrentStage,
} from "@/lib/timeline-view"
import type { TimelinePlan, TimelineStage } from "@/lib/timeline"
import type { SelectedTimelineItem } from "@/components/plan/timeline-details"
import {
  categoryDot,
  categoryLabel,
  ownerLabel,
} from "@/components/plan/plan-ui"

function StageRow({
  stage,
  plan,
  current,
  isLast,
  onSelect,
}: {
  stage: TimelineStage
  plan: TimelinePlan
  current: boolean
  isLast: boolean
  onSelect: (item: SelectedTimelineItem) => void
}) {
  const milestones = stage.milestoneIds
    .map((id) => plan.milestones.find((milestone) => milestone.id === id))
    .filter((milestone): milestone is NonNullable<typeof milestone> =>
      Boolean(milestone)
    )
  const periods = stage.periodIds
    .map((id) => plan.periods.find((period) => period.id === id))
    .filter((period): period is NonNullable<typeof period> => Boolean(period))

  return (
    <li className="relative flex gap-4 pb-8 last:pb-0">
      <span
        aria-hidden="true"
        className={cn(
          "absolute top-9 left-[0.9375rem] h-[calc(100%-1.5rem)] w-px bg-border",
          isLast && "hidden"
        )}
      />
      <span
        aria-hidden="true"
        className={cn(
          "relative z-[1] mt-0.5 grid size-8 shrink-0 place-items-center rounded-full border-2 text-xs font-semibold tabular-nums",
          current
            ? "border-primary bg-primary text-primary-foreground"
            : "border-border bg-background text-muted-foreground"
        )}
      >
        {current ? <Circle className="size-3 fill-current" /> : stage.number}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-base font-semibold">{stage.title}</h3>
          {current && <Badge variant="success">Aktualny etap</Badge>}
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <CalendarRange aria-hidden="true" className="size-3.5" />
            {formatDateRange(stage.start, stage.end)}
          </span>
        </div>
        <p className="mt-1 text-sm text-pretty text-muted-foreground">
          {stage.description}
        </p>

        {stage.tasks.length > 0 && (
          <div className="mt-3">
            <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Najważniejsze formalności
            </p>
            <ul className="mt-1.5 space-y-1">
              {stage.tasks.map((task) => (
                <li key={task} className="flex items-start gap-2 text-sm">
                  <CheckCircle2
                    aria-hidden="true"
                    className="mt-0.5 size-3.5 shrink-0 text-primary"
                  />
                  <span className="text-pretty">{task}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {(milestones.length > 0 || periods.length > 0) && (
          <div className="mt-3">
            <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Powiązane wydarzenia
            </p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {periods.map((period) => (
                <button
                  key={period.id}
                  type="button"
                  onClick={() => onSelect({ kind: "period", period })}
                  className="inline-flex max-w-full items-center gap-1.5 rounded-md border border-border bg-background px-2 py-1 text-left text-xs transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/60 focus-visible:outline-none"
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      "size-1.5 shrink-0 rounded-full",
                      period.owner === "MAMA" ? "bg-success" : "bg-info"
                    )}
                  />
                  <span className="truncate">{period.title}</span>
                  <span className="text-muted-foreground">
                    {ownerLabel[period.owner]}
                  </span>
                </button>
              ))}
              {milestones.map((milestone) => (
                <button
                  key={milestone.id}
                  type="button"
                  onClick={() => onSelect({ kind: "milestone", milestone })}
                  className="inline-flex max-w-full items-center gap-1.5 rounded-md border border-border bg-background px-2 py-1 text-left text-xs transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/60 focus-visible:outline-none"
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      "size-1.5 shrink-0 rounded-full",
                      categoryDot[milestone.category]
                    )}
                  />
                  <span className="truncate">{milestone.title}</span>
                  <span className="text-muted-foreground">
                    {categoryLabel[milestone.category]}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </li>
  )
}

export function TimelineStages({
  plan,
  today,
  onSelect,
}: {
  plan: TimelinePlan
  today: string
  onSelect: (item: SelectedTimelineItem) => void
}) {
  const current = getCurrentStage(plan, today)
  return (
    <section aria-labelledby="etapy-rodzicielstwa" className="space-y-4">
      <div>
        <h2 id="etapy-rodzicielstwa" className="text-xl font-semibold tracking-tight">
          Etapy rodzicielstwa
        </h2>
        <p className="mt-1 text-sm text-pretty text-muted-foreground">
          Ten sam plan podzielony na pięć etapów. Daty pochodzą z Twoich
          założeń, a nie ze sztywnego kalendarza.
        </p>
      </div>
      <ol className="rounded-xl border border-border/80 bg-card p-5 sm:p-6">
        {plan.stages.map((stage) => (
          <StageRow
            key={stage.id}
            stage={stage}
            plan={plan}
            current={current?.id === stage.id}
            isLast={stage.number === plan.stages.length}
            onSelect={onSelect}
          />
        ))}
      </ol>
    </section>
  )
}
