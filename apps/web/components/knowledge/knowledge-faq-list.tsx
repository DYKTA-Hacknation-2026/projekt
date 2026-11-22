import Link from "next/link"
import {
  ArrowRight,
  Calculator,
  CircleHelp,
  ExternalLink,
  ListChecks,
  Star,
} from "lucide-react"

import type { FaqSummary } from "@zpr/db/repositories"
import { Badge } from "@workspace/ui/components/badge"

import { formatDate } from "@/lib/format"

export function KnowledgeFaqList({
  items,
  showCategory = false,
  compact = false,
}: {
  items: FaqSummary[]
  showCategory?: boolean
  compact?: boolean
}) {
  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-card p-6 text-center">
        <CircleHelp className="mx-auto size-6 text-muted-foreground" />
        <p className="mt-2 text-sm text-muted-foreground">
          Brak pytań spełniających kryteria. Spróbuj innej frazy lub kategorii.
        </p>
      </div>
    )
  }

  return (
    <div className="divide-y divide-border/70 overflow-hidden rounded-lg border border-border/70 bg-card">
      {items.map((item) => (
        <details
          key={item.id}
          id={item.slug}
          className="group scroll-mt-24 open:bg-secondary/20"
        >
          <summary className="flex cursor-pointer list-none items-start gap-3 p-4 text-left transition-colors hover:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none [&::-webkit-details-marker]:hidden">
            <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
              <CircleHelp aria-hidden="true" className="size-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex flex-wrap items-center gap-2">
                <span className="font-medium text-pretty">{item.question}</span>
                {item.isImportant && (
                  <Badge variant="warning" className="gap-1">
                    <Star aria-hidden="true" />
                    Ważne
                  </Badge>
                )}
                {showCategory && (
                  <Badge variant="outline">{item.categoryTitle}</Badge>
                )}
              </span>
              <span className="mt-1 block text-sm text-pretty text-muted-foreground">
                {item.shortAnswer}
              </span>
            </span>
            <span aria-hidden="true" className="disclosure-mark mt-1.5" />
          </summary>
          <div className="space-y-4 border-t border-border/50 px-4 py-4 pl-14">
            <p className="text-[0.95rem] leading-6 text-pretty text-foreground/90">
              {item.explanation}
            </p>
            {!compact && item.conditions && (
              <div>
                <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  Warunki i wyjątki
                </p>
                <p className="mt-1 text-sm leading-6 text-pretty text-muted-foreground">
                  {item.conditions}
                </p>
              </div>
            )}
            {!compact && item.whatToDo && (
              <div>
                <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  Co zrobić
                </p>
                <p className="mt-1 text-sm leading-6 text-pretty text-muted-foreground">
                  {item.whatToDo}
                </p>
              </div>
            )}
            <div className="flex flex-wrap items-center gap-2">
              {item.articleSlug && (
                <Link
                  href={`/wiedza/artykul/${item.articleSlug}`}
                  className="inline-flex items-center gap-1 rounded-md text-sm font-medium text-primary hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                >
                  Powiązany artykuł
                  <ArrowRight aria-hidden="true" className="size-3.5" />
                </Link>
              )}
              {item.calculatorHref && (
                <Link
                  href={item.calculatorHref}
                  className="inline-flex items-center gap-1 rounded-md text-sm font-medium text-primary hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                >
                  <Calculator aria-hidden="true" className="size-3.5" />
                  Otwórz kalkulator
                </Link>
              )}
              {item.guideHref && (
                <Link
                  href={item.guideHref}
                  className="inline-flex items-center gap-1 rounded-md text-sm font-medium text-primary hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                >
                  <ListChecks aria-hidden="true" className="size-3.5" />
                  Przewodnik krok po kroku
                </Link>
              )}
              {item.sourceUrl && (
                <a
                  href={item.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  title={item.sourceTitle ?? "Oficjalne źródło"}
                  className="inline-flex items-center gap-1 rounded-md text-sm font-medium text-primary hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                >
                  <ExternalLink aria-hidden="true" className="size-3.5" />
                  Oficjalne źródło
                </a>
              )}
              <span className="ml-auto text-xs text-muted-foreground">
                Weryfikacja: {formatDate(item.lastReviewedAt)}
              </span>
            </div>
          </div>
        </details>
      ))}
    </div>
  )
}
