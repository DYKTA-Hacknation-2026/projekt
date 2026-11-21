import Link from "next/link"
import { ArrowUpRight } from "lucide-react"

import type { CategorySummary } from "@zpr/db/repositories"

import { KnowledgeIcon } from "./knowledge-icon"

export function KnowledgeCategoryGrid({
  categories,
  columns = "three",
}: {
  categories: CategorySummary[]
  columns?: "two" | "three"
}) {
  return (
    <div
      className={
        columns === "three"
          ? "grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
          : "grid gap-3 sm:grid-cols-2"
      }
    >
      {categories.map((category) => {
        const total =
          category.articleCount +
          category.faqCount +
          category.guideCount +
          category.documentCount +
          category.glossaryCount
        return (
          <Link
            key={category.id}
            href={`/wiedza/kategoria/${category.slug}`}
            className="group relative flex gap-3 rounded-xl border border-border/70 bg-card p-4 transition-colors hover:border-primary/40 hover:bg-primary/[0.03] focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
          >
            <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
              <KnowledgeIcon name={category.icon} className="size-5" />
            </span>
            <span className="min-w-0 space-y-1">
              <span className="flex items-start justify-between gap-2">
                <span className="font-semibold">{category.title}</span>
                <ArrowUpRight
                  aria-hidden="true"
                  className="mt-0.5 size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary"
                />
              </span>
              <span className="block text-sm text-pretty text-muted-foreground">
                {category.description}
              </span>
              <span className="block text-xs text-muted-foreground">
                {category.articleCount > 0 && `${category.articleCount} art.`}
                {category.faqCount > 0 && ` · ${category.faqCount} pytań`}
                {category.guideCount > 0 && ` · ${category.guideCount} przew.`}
                {category.documentCount > 0 &&
                  ` · ${category.documentCount} dok.`}
                {category.glossaryCount > 0 &&
                  ` · ${category.glossaryCount} pojęć`}
                {total === 0 && "Materiały w przygotowaniu"}
              </span>
            </span>
          </Link>
        )
      })}
    </div>
  )
}
