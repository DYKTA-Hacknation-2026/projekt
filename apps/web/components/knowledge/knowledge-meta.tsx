import { BadgeCheck, CalendarCheck2 } from "lucide-react"

import { Badge } from "@workspace/ui/components/badge"
import { formatDate } from "@/lib/format"

export function KnowledgeMeta({
  lastReviewedAt,
  readingMinutes,
  children,
}: {
  lastReviewedAt: string
  readingMinutes?: number
  children?: React.ReactNode
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
      <Badge variant="success" className="gap-1">
        <BadgeCheck aria-hidden="true" />
        Sprawdzone {formatDate(lastReviewedAt)}
      </Badge>
      {typeof readingMinutes === "number" && (
        <span className="inline-flex items-center gap-1">
          <CalendarCheck2 aria-hidden="true" className="size-3.5" />
          {readingMinutes} min czytania
        </span>
      )}
      {children}
    </div>
  )
}
