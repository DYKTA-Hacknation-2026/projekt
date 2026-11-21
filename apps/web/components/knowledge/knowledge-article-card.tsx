import Link from "next/link"
import { ArrowRight, Clock } from "lucide-react"

import type { ArticleSummary } from "@zpr/db/repositories"

import { formatDate } from "@/lib/format"
import { readingLabel } from "@/lib/knowledge"

export function KnowledgeArticleCard({
  article,
  compact = false,
}: {
  article: ArticleSummary
  compact?: boolean
}) {
  return (
    <Link
      href={`/wiedza/artykul/${article.slug}`}
      className="group flex h-full flex-col rounded-xl border border-border/70 bg-card p-5 transition-colors hover:border-primary/40 hover:bg-primary/[0.02] focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
    >
      <span className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span className="rounded-full bg-primary/10 px-2 py-0.5 font-medium text-primary">
          {article.categoryTitle}
        </span>
        <span className="inline-flex items-center gap-1">
          <Clock aria-hidden="true" className="size-3" />
          {readingLabel(article.readingMinutes)}
        </span>
      </span>
      <span className="mt-3 text-lg font-semibold tracking-tight text-balance group-hover:text-primary">
        {article.title}
      </span>
      {!compact && (
        <span className="mt-2 line-clamp-3 text-sm text-pretty text-muted-foreground">
          {article.summary}
        </span>
      )}
      <span className="mt-auto flex items-center justify-between gap-3 pt-4 text-xs text-muted-foreground">
        <span>Weryfikacja: {formatDate(article.lastReviewedAt)}</span>
        <span className="inline-flex items-center gap-1 font-medium text-primary">
          Czytaj
          <ArrowRight
            aria-hidden="true"
            className="size-3.5 transition-transform group-hover:translate-x-0.5"
          />
        </span>
      </span>
    </Link>
  )
}
