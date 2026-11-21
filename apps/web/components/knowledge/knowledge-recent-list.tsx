import Link from "next/link"

import { CONTENT_TYPE_LABELS } from "@zpr/contracts/content"
import type { RecentContentItem } from "@zpr/db/repositories"
import { Badge } from "@workspace/ui/components/badge"

import { formatDate } from "@/lib/format"
import { knowledgeHref } from "@/server/services/knowledge-center"

export function KnowledgeRecentList({ items }: { items: RecentContentItem[] }) {
  return (
    <ol className="divide-y divide-border/70 overflow-hidden rounded-xl border border-border/70 bg-card">
      {items.map((item) => (
        <li key={`${item.type}-${item.slug}`}>
          <Link
            href={knowledgeHref(item.type, item.slug)}
            className="flex flex-col gap-1 p-4 transition-colors hover:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none sm:flex-row sm:items-center sm:justify-between sm:gap-4"
          >
            <span className="flex min-w-0 items-start gap-3">
              <Badge variant="outline" className="mt-0.5 shrink-0">
                {CONTENT_TYPE_LABELS[item.type]}
              </Badge>
              <span className="min-w-0">
                <span className="block text-sm font-medium text-pretty">
                  {item.title}
                </span>
                <span className="line-clamp-1 block text-xs text-muted-foreground">
                  {item.summary}
                </span>
              </span>
            </span>
            <span className="shrink-0 pl-0 text-xs text-muted-foreground sm:pl-3">
              {formatDate(item.updatedAt)}
            </span>
          </Link>
        </li>
      ))}
    </ol>
  )
}
