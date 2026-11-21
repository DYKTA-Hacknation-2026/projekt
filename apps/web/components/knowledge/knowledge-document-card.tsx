import Link from "next/link"
import { ArrowUpRight, FileText } from "lucide-react"

import {
  DOCUMENT_KIND_LABELS,
  type DocumentKind,
} from "@zpr/contracts/content"
import type { DocumentSummary } from "@zpr/db/repositories"
import { Badge } from "@workspace/ui/components/badge"

import { formatDate } from "@/lib/format"

export function documentKindVariant(kind: DocumentKind) {
  if (kind === "DEMO") return "warning" as const
  if (kind === "FORM") return "info" as const
  if (kind === "CERTIFICATE") return "outline" as const
  return "secondary" as const
}

export function KnowledgeDocumentCard({ document }: { document: DocumentSummary }) {
  return (
    <Link
      href={`/wiedza/dokumenty/${document.slug}`}
      className="group flex h-full flex-col rounded-xl border border-border/70 bg-card p-5 transition-colors hover:border-primary/40 hover:bg-primary/[0.02] focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
    >
      <span className="flex flex-wrap items-center gap-2">
        {document.code && (
          <span className="rounded-md border border-primary/30 bg-primary/10 px-2 py-0.5 font-mono text-xs font-semibold text-primary">
            {document.code}
          </span>
        )}
        <Badge variant={documentKindVariant(document.kind)}>
          {DOCUMENT_KIND_LABELS[document.kind]}
        </Badge>
      </span>
      <span className="mt-3 flex items-start justify-between gap-2">
        <span className="font-semibold text-pretty group-hover:text-primary">
          {document.name}
        </span>
        <ArrowUpRight
          aria-hidden="true"
          className="mt-0.5 size-4 shrink-0 text-muted-foreground group-hover:text-primary"
        />
      </span>
      <span className="mt-2 line-clamp-3 text-sm text-pretty text-muted-foreground">
        {document.purpose}
      </span>
      <span className="mt-auto flex items-center gap-1 pt-4 text-xs text-muted-foreground">
        <FileText aria-hidden="true" className="size-3.5" />
        Weryfikacja: {formatDate(document.lastReviewedAt)}
      </span>
    </Link>
  )
}
