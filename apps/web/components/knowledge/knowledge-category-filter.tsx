import Link from "next/link"

import type { CategorySummary } from "@zpr/db/repositories"
import { cn } from "@workspace/ui/lib/utils"

export function KnowledgeCategoryFilter({
  basePath,
  categories,
  selectedSlug,
  query,
}: {
  basePath: string
  categories: CategorySummary[]
  selectedSlug?: string
  query?: string
}) {
  const href = (slug?: string) => {
    const params = new URLSearchParams()
    if (slug) params.set("kategoria", slug)
    if (query) params.set("q", query)
    const suffix = params.toString()
    return suffix ? `${basePath}?${suffix}` : basePath
  }

  return (
    <nav aria-label="Filtruj według kategorii" className="flex flex-wrap gap-1.5">
      <Link
        href={href()}
        aria-current={!selectedSlug ? "page" : undefined}
        className={cn(
          "inline-flex min-h-9 items-center rounded-full border border-border bg-background px-3 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
          !selectedSlug && "border-primary/40 bg-primary/10 text-primary"
        )}
      >
        Wszystkie
      </Link>
      {categories.map((category) => (
        <Link
          key={category.id}
          href={href(category.slug)}
          aria-current={selectedSlug === category.slug ? "page" : undefined}
          className={cn(
            "inline-flex min-h-9 items-center rounded-full border border-border bg-background px-3 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
            selectedSlug === category.slug &&
              "border-primary/40 bg-primary/10 text-primary"
          )}
        >
          {category.title}
        </Link>
      ))}
    </nav>
  )
}
