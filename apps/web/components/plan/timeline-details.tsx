"use client"

import Link from "next/link"
import {
  AlertTriangle,
  ArrowUpRight,
  CalendarDays,
  Clock,
  FileText,
  Info,
  MousePointerClick,
  Scale,
  UserRound,
  X,
} from "lucide-react"

import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"
import { formatDate } from "@/lib/format"
import {
  durationLabel,
  formatDateRange,
  periodStatusLabel,
} from "@/lib/timeline-view"
import type { TimelineMilestone, TimelinePeriod } from "@/lib/timeline"
import {
  basisLabel,
  categoryLabel,
  categorySurface,
  documentPreparedBy,
  documentSubmitTo,
  ownerLabel,
  ownerSurface,
} from "@/components/plan/plan-ui"

export type SelectedTimelineItem =
  | { kind: "period"; period: TimelinePeriod }
  | { kind: "milestone"; milestone: TimelineMilestone }

function DocumentList({ documents }: { documents: TimelinePeriod["documents"] }) {
  if (documents.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Dla tego elementu nie mamy w planie osobnej listy dokumentów.
      </p>
    )
  }
  return (
    <ul className="space-y-3">
      {documents.map((document) => (
        <li
          key={`${document.code}-${document.name}`}
          className="rounded-lg border border-border/70 p-3"
        >
          <p className="text-sm font-medium text-pretty">{document.name}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Przygotowuje: {documentPreparedBy[document.preparedBy] ?? document.preparedBy}{" "}
            · Składasz do: {documentSubmitTo[document.submitTo] ?? document.submitTo}
          </p>
          <p className="mt-1 text-xs text-pretty">{document.when}</p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {document.legalBasis}
          </p>
          {document.caveat && (
            <p className="mt-1 flex gap-1.5 text-[11px] text-warning-foreground">
              <AlertTriangle aria-hidden="true" className="mt-0.5 size-3 shrink-0" />
              {document.caveat}
            </p>
          )}
        </li>
      ))}
    </ul>
  )
}

function StatusBadge({
  item,
  today,
}: {
  item: SelectedTimelineItem
  today: string
}) {
  if (item.kind === "period") {
    return <Badge variant="outline">{periodStatusLabel(item.period, today)}</Badge>
  }
  const { milestone } = item
  if (milestone.date < today) {
    return <Badge variant="secondary">Minęło</Badge>
  }
  if (milestone.date === today) {
    return <Badge variant="warning">Dziś</Badge>
  }
  if (milestone.category === "DOCUMENT" || milestone.category === "DEADLINE") {
    return <Badge variant="info">Do zrobienia</Badge>
  }
  return <Badge variant="outline">Zaplanowane</Badge>
}

export function TimelineDetails({
  item,
  today,
  onClose,
}: {
  item: SelectedTimelineItem | null
  today: string
  onClose: () => void
}) {
  if (!item) {
    return (
      <aside
        aria-label="Szczegóły wydarzenia"
        className="rounded-lg border border-dashed border-border bg-muted/25 p-5"
      >
        <div className="flex items-center gap-2 text-sm font-semibold">
          <MousePointerClick aria-hidden="true" className="size-4 text-primary" />
          Szczegóły wydarzenia
        </div>
        <p className="mt-2 text-sm text-pretty text-muted-foreground">
          Kliknij pasek urlopu albo punkt na osi, aby zobaczyć daty, dokumenty i
          podstawę prawną. Nic nie zostanie zaznaczone automatycznie jako
          wykonane.
        </p>
      </aside>
    )
  }

  const isPeriod = item.kind === "period"
  const title = isPeriod ? item.period.title : item.milestone.title
  const owner = isPeriod ? item.period.owner : item.milestone.owner
  const description = isPeriod
    ? item.period.description
    : item.milestone.description
  const start = isPeriod ? item.period.start : item.milestone.date
  const end = isPeriod ? item.period.end : item.milestone.endDate
  const documents = isPeriod
    ? item.period.documents
    : (item.milestone.documents ?? [])
  const legalReference = isPeriod
    ? item.period.legalReference
    : item.milestone.legalReference
  const ruleIds = isPeriod ? item.period.ruleIds : (item.milestone.ruleIds ?? [])

  return (
    <aside
      aria-label="Szczegóły wydarzenia"
      aria-live="polite"
      className="rounded-lg border border-border bg-card p-5"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge className={cn("border", ownerSurface[owner])}>
            <span
              aria-hidden="true"
              className={cn(
                "size-1.5 rounded-full",
                owner === "MAMA"
                  ? "bg-success"
                  : owner === "TATA"
                    ? "bg-info"
                    : "bg-accent-foreground/70"
              )}
            />
            {ownerLabel[owner]}
          </Badge>
          <Badge
            variant="outline"
            className={cn("border", categorySurface[isPeriod ? "LEAVE" : item.milestone.category])}
          >
            {categoryLabel[isPeriod ? "LEAVE" : item.milestone.category]}
          </Badge>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={onClose}
          aria-label="Zamknij szczegóły"
        >
          <X aria-hidden="true" />
        </Button>
      </div>

      <h2 className="mt-3 text-lg leading-tight font-semibold text-balance">
        {title}
      </h2>

      {!isPeriod && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          <Badge
            variant={
              item.milestone.basis === "STATUTORY"
                ? "warning"
                : item.milestone.basis === "RECOMMENDED"
                  ? "info"
                  : "secondary"
            }
          >
            {basisLabel[item.milestone.basis ?? "STATUTORY"]}
          </Badge>
          {item.milestone.estimated && (
            <Badge variant="outline">
              <Clock aria-hidden="true" />
              Data orientacyjna
            </Badge>
          )}
          {item.milestone.needsVerification && (
            <Badge variant="warning">
              <AlertTriangle aria-hidden="true" />
              Wymaga weryfikacji
            </Badge>
          )}
          <StatusBadge item={item} today={today} />
        </div>
      )}

      {isPeriod && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          <Badge variant="outline">{durationLabel(item.period.days)}</Badge>
          <Badge variant="outline">zasiłek {item.period.ratePercent}</Badge>
          <StatusBadge item={item} today={today} />
        </div>
      )}

      <dl className="mt-4 grid gap-2 text-sm">
        <div className="flex items-start gap-2">
          <CalendarDays
            aria-hidden="true"
            className="mt-0.5 size-4 shrink-0 text-muted-foreground"
          />
          <div>
            <dt className="sr-only">Data</dt>
            <dd className="font-medium">
              {formatDateRange(start, end)}
            </dd>
            {isPeriod && (
              <dd className="text-xs text-muted-foreground">
                {durationLabel(item.period.days)} · {item.period.days} dni
              </dd>
            )}
          </div>
        </div>
        <div className="flex items-start gap-2">
          <UserRound
            aria-hidden="true"
            className="mt-0.5 size-4 shrink-0 text-muted-foreground"
          />
          <div>
            <dt className="sr-only">Osoba</dt>
            <dd>
              {ownerLabel[owner]}
              {!isPeriod && item.milestone.actionOwner
                ? ` · działa: ${item.milestone.actionOwner}`
                : ""}
            </dd>
          </div>
        </div>
      </dl>

      <p className="mt-4 text-sm text-pretty">{description}</p>

      {!isPeriod && (item.milestone.category === "DOCUMENT" || item.milestone.category === "DEADLINE") && (
        <section className="mt-4" aria-labelledby="details-actions">
          <h3 id="details-actions" className="text-sm font-semibold">
            Co należy zrobić?
          </h3>
          <p className="mt-1 text-sm text-pretty text-muted-foreground">
            {item.milestone.actionOwner
              ? `Za ten krok odpowiada: ${item.milestone.actionOwner}. `
              : ""}
            Sprawdź listę dokumentów i termin ich złożenia. Status zadania
            wynika wyłącznie z daty — nie oznaczamy niczego jako wykonane bez
            Twojej decyzji.
          </p>
        </section>
      )}

      <section className="mt-5" aria-labelledby="details-documents">
        <h3
          id="details-documents"
          className="flex items-center gap-2 text-sm font-semibold"
        >
          <FileText aria-hidden="true" className="size-4 text-primary" />
          Dokumenty i formalności
        </h3>
        <div className="mt-2">
          <DocumentList documents={documents} />
        </div>
        {documents.length > 0 && (
          <Button asChild variant="outline" size="sm" className="mt-3 w-full">
            <Link href="/dokumenty">
              Zobacz wymagane dokumenty
              <ArrowUpRight data-icon="inline-end" aria-hidden="true" />
            </Link>
          </Button>
        )}
      </section>

      <section className="mt-5 border-t border-border/70 pt-4" aria-labelledby="details-legal">
        <h3
          id="details-legal"
          className="flex items-center gap-2 text-sm font-semibold"
        >
          <Scale aria-hidden="true" className="size-4 text-primary" />
          Podstawa prawna i źródła
        </h3>
        <p className="mt-1 text-xs text-pretty text-muted-foreground">
          {legalReference}
        </p>
        {ruleIds.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {ruleIds.map((ruleId) => (
              <Badge key={ruleId} variant="outline" className="font-mono text-[10px]">
                {ruleId}
              </Badge>
            ))}
          </div>
        )}
      </section>

      <p className="mt-4 flex items-start gap-2 text-[11px] text-muted-foreground">
        <Info aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
        To informacja o uprawnieniach, nie decyzja ZUS. Ostateczna decyzja
        należy do płatnika lub ZUS.
      </p>
    </aside>
  )
}
