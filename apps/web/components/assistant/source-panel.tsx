"use client"

import { BookOpen, CalendarRange, ExternalLink, FileSearch, ShieldAlert } from "lucide-react"

import type { EvidenceSource } from "@zpr/contracts/assistant"
import { Badge } from "@workspace/ui/components/badge"
import { cn } from "@workspace/ui/lib/utils"

const SOURCE_TYPES: Record<string, string> = {
  LEGAL_ACT: "Akt prawny",
  GUIDE: "Poradnik",
  OFFICIAL_GUIDANCE: "Wyjaśnienia urzędowe",
  BENEFIT_TABLE: "Tabela świadczeń",
  FORM_INSTRUCTION: "Formularze",
  GOVERNMENT_PAGE: "Strona rządowa",
  CHARITY_RESOURCE: "Organizacje wsparcia",
  TASK_DOCUMENT: "Materiał konkursowy",
  INTERNAL: "Materiał wewnętrzny",
  WEB_PAGE: "Strona WWW",
  FORM_TEMPLATE: "Wzór formularza",
}

export function sourceLocator(source: EvidenceSource): string {
  const reference = source.legalReference ?? source.sectionIdentifier ?? source.headingPath
  const page = source.pageNumber
    ? `s. ${source.pageNumber}${source.pageEnd && source.pageEnd !== source.pageNumber ? `–${source.pageEnd}` : ""}`
    : null
  return [reference, page].filter(Boolean).join(", ")
}

function validity(source: EvidenceSource): string {
  if (!source.validFrom && !source.validTo) return "bez określonej daty"
  return `${source.validFrom ?? "?"} – ${source.validTo ?? "obowiązuje"}`
}

export function SourceDetail({ source }: { source: EvidenceSource }) {
  return (
    <article className="space-y-3 text-sm" aria-labelledby={`source-${source.ref}-title`}>
      <div className="flex flex-wrap items-center gap-2">
        <Badge className="font-mono">{source.ref}</Badge>
        <Badge variant="outline">{SOURCE_TYPES[source.sourceType] ?? source.sourceType}</Badge>
        {source.citationOnly && <Badge variant="warning">Tylko cytowanie</Badge>}
      </div>
      <h3 id={`source-${source.ref}-title`} className="font-heading text-base leading-snug font-semibold">
        {source.documentTitle}
      </h3>
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-xs">
        <dt className="flex items-center gap-1 text-muted-foreground"><BookOpen aria-hidden="true" className="size-3" />Źródło</dt>
        <dd>{source.sourceTitle}</dd>
        <dt className="flex items-center gap-1 text-muted-foreground"><FileSearch aria-hidden="true" className="size-3" />Miejsce</dt>
        <dd className="font-mono">{sourceLocator(source) || "—"}</dd>
        <dt className="flex items-center gap-1 text-muted-foreground"><CalendarRange aria-hidden="true" className="size-3" />Obowiązuje</dt>
        <dd className="tabular-nums">{validity(source)}</dd>
      </dl>
      {source.flagged && (
        <p className="flex gap-2 rounded-lg bg-warning/15 px-3 py-2 text-xs">
          <ShieldAlert aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
          Fragment zawierał tekst przypominający polecenia. Został potraktowany wyłącznie jako treść źródła.
        </p>
      )}
      {source.quote ? (
        <blockquote className="border-l-2 border-primary/50 pl-3 text-pretty text-muted-foreground">„{source.quote}”</blockquote>
      ) : (
        <p className="rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
          Ten materiał można tylko wskazać (bez cytowania treści). Sprawdź go w oryginale pod podanym adresem.
        </p>
      )}
      {source.sourceUrl && (
        <a
          href={source.sourceUrl}
          target="_blank"
          rel="noreferrer noopener"
          className="inline-flex items-center gap-1 text-xs font-medium text-primary underline-offset-4 hover:underline"
        >
          Otwórz oficjalne źródło
          <ExternalLink aria-hidden="true" className="size-3" />
          <span className="sr-only">(otwiera się w nowej karcie)</span>
        </a>
      )}
    </article>
  )
}

export function SourceList({
  sources,
  selected,
  onSelect,
}: {
  sources: EvidenceSource[]
  selected: string | null
  onSelect: (ref: string) => void
}) {
  return (
    <ul className="space-y-1.5" aria-label="Źródła tej odpowiedzi">
      {sources.map((source) => (
        <li key={source.ref}>
          <button
            type="button"
            onClick={() => onSelect(source.ref)}
            aria-current={selected === source.ref ? "true" : undefined}
            className={cn(
              "flex w-full items-start gap-2 rounded-lg border px-2.5 py-2 text-left text-xs transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
              selected === source.ref ? "border-primary/40 bg-primary/10" : "border-border/70 hover:bg-muted"
            )}
          >
            <span className="font-mono font-medium text-primary">{source.ref}</span>
            <span className="min-w-0">
              <span className="block truncate font-medium">{source.documentTitle}</span>
              <span className="block truncate text-muted-foreground">{sourceLocator(source)}</span>
            </span>
          </button>
        </li>
      ))}
    </ul>
  )
}
