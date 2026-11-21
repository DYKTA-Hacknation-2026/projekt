import Link from "next/link"
import { ArrowRight } from "lucide-react"

import { CONTENT_TYPE_LABELS } from "@zpr/contracts/content"

import { Badge } from "@workspace/ui/components/badge"

import { slugifyHeading } from "@/lib/knowledge"
import type { RelatedLink } from "@/server/services/knowledge-center"

export function KnowledgeRelatedLinks({
  items,
  title = "Powiązane materiały",
  columns = 2,
}: {
  items: RelatedLink[]
  title?: string
  columns?: 1 | 2
}) {
  if (items.length === 0) return null
  const sectionId = `related-${slugifyHeading(title)}`

  return (
    <section aria-labelledby={sectionId} className="space-y-3">
      <h2 id={sectionId} className="text-lg font-semibold tracking-tight">
        {title}
      </h2>
      <ul className={columns === 2 ? "grid gap-2 sm:grid-cols-2" : "grid gap-2"}>
        {items.map((item) => (
          <li key={`${item.type}-${item.slug}`}>
            <Link
              href={item.href}
              className="group flex h-full items-start gap-3 rounded-lg border border-border/70 bg-card p-3 transition-colors hover:border-primary/40 hover:bg-primary/[0.02] focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              <Badge variant="outline" className="mt-0.5 shrink-0">
                {CONTENT_TYPE_LABELS[item.type]}
              </Badge>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-pretty group-hover:text-primary">
                  {item.title}
                </span>
                <span className="mt-0.5 line-clamp-2 block text-xs text-pretty text-muted-foreground">
                  {item.summary}
                </span>
              </span>
              <ArrowRight
                aria-hidden="true"
                className="mt-1 size-4 shrink-0 text-muted-foreground group-hover:text-primary"
              />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
