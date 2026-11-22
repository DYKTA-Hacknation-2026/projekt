import Link from "next/link"
import { ArrowRight, ListChecks } from "lucide-react"

import type { GuideSummary } from "@zpr/db/repositories"
import { Badge } from "@workspace/ui/components/badge"

import { formatDate } from "@/lib/format"

export function KnowledgeGuideCard({ guide }: { guide: GuideSummary }) {
  return (
    <Link
      href={`/wiedza/przewodniki/${guide.slug}`}
      className="group flex h-full flex-col rounded-lg border border-border/70 bg-card p-5 transition-colors hover:border-primary/40 hover:bg-primary/[0.02] focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
    >
      <span className="flex flex-wrap items-center gap-2">
        <Badge variant="secondary" className="gap-1">
          <ListChecks aria-hidden="true" />
          Przewodnik
        </Badge>
        <Badge variant="outline">{guide.categoryTitle}</Badge>
      </span>
      <span className="mt-3 font-semibold text-pretty group-hover:text-primary">
        {guide.title}
      </span>
      <span className="mt-2 line-clamp-3 text-sm text-pretty text-muted-foreground">
        {guide.summary}
      </span>
      <span className="mt-3 text-xs text-muted-foreground">
        {guide.audience}
      </span>
      <span className="mt-auto flex items-center justify-between gap-3 pt-4 text-xs text-muted-foreground">
        <span>Weryfikacja: {formatDate(guide.lastReviewedAt)}</span>
        <span className="inline-flex items-center gap-1 font-medium text-primary">
          Otwórz
          <ArrowRight
            aria-hidden="true"
            className="size-3.5 transition-transform group-hover:translate-x-0.5"
          />
        </span>
      </span>
    </Link>
  )
}
