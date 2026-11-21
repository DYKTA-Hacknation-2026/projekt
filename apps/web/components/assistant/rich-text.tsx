"use client"

import { Fragment, type ReactNode } from "react"

import type { EvidenceSource } from "@zpr/contracts/assistant"
import { cn } from "@workspace/ui/lib/utils"

/**
 * Minimal, safe Markdown subset for assistant answers: paragraphs, bullet and
 * numbered lists, headings, **bold**, _italic_ and `[S#]` citations. Text is
 * rendered through React (escaped) — no HTML from the model ever reaches the DOM.
 */

const INLINE = /(\*\*[^*\n]+\*\*|(?<![\p{L}\d])_[^_\n]+_(?![\p{L}\d])|\[S\d{1,2}\])/gu

export interface CitationHandlers {
  sources: EvidenceSource[]
  onCite: (ref: string) => void
}

function CitationChip({ refId, handlers }: { refId: string; handlers: CitationHandlers }) {
  const source = handlers.sources.find((item) => item.ref === refId)
  if (!source) {
    return (
      <span
        className="mx-0.5 inline-flex items-center rounded border border-dashed border-warning/60 px-1 font-mono text-[10px] text-warning-foreground"
        title="Tego źródła nie pobrano w tej odpowiedzi — nie zostało zweryfikowane."
      >
        {refId}?
      </span>
    )
  }
  return (
    <button
      type="button"
      onClick={() => handlers.onCite(refId)}
      className="mx-0.5 inline-flex min-h-6 items-center rounded-md border border-primary/30 bg-primary/10 px-1.5 align-baseline font-mono text-[11px] font-medium text-primary transition-colors hover:bg-primary/20 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
      aria-label={`Źródło ${refId}: ${source.documentTitle}${source.legalReference ? `, ${source.legalReference}` : ""}. Pokaż fragment.`}
      title={`${source.documentTitle}${source.legalReference ? ` — ${source.legalReference}` : ""}`}
    >
      {refId}
    </button>
  )
}

function inline(text: string, handlers: CitationHandlers, keyPrefix: string): ReactNode[] {
  return text.split(INLINE).map((token, index) => {
    const key = `${keyPrefix}-${index}`
    if (!token) return null
    if (/^\[S\d{1,2}\]$/.test(token)) {
      return <CitationChip key={key} refId={token.slice(1, -1)} handlers={handlers} />
    }
    if (token.startsWith("**") && token.endsWith("**")) {
      return <strong key={key} className="font-semibold">{token.slice(2, -2)}</strong>
    }
    if (token.startsWith("_") && token.endsWith("_") && token.length > 2) {
      return <em key={key} className="text-muted-foreground">{token.slice(1, -1)}</em>
    }
    return <Fragment key={key}>{token}</Fragment>
  })
}

type Block =
  | { kind: "p"; lines: string[] }
  | { kind: "ul"; items: string[] }
  | { kind: "ol"; items: string[] }
  | { kind: "h"; text: string }

function parse(text: string): Block[] {
  const blocks: Block[] = []
  for (const raw of text.replace(/\r\n/g, "\n").split("\n")) {
    const line = raw.trimEnd()
    const last = blocks.at(-1)
    if (!line.trim()) {
      blocks.push({ kind: "p", lines: [] })
      continue
    }
    const bullet = line.match(/^\s*[-*•]\s+(.*)$/)
    const numbered = line.match(/^\s*\d+[.)]\s+(.*)$/)
    const heading = line.match(/^#{1,4}\s+(.*)$/)
    if (heading) blocks.push({ kind: "h", text: heading[1]! })
    else if (bullet) {
      if (last?.kind === "ul") last.items.push(bullet[1]!)
      else blocks.push({ kind: "ul", items: [bullet[1]!] })
    } else if (numbered) {
      if (last?.kind === "ol") last.items.push(numbered[1]!)
      else blocks.push({ kind: "ol", items: [numbered[1]!] })
    } else if (last?.kind === "p") last.lines.push(line)
    else blocks.push({ kind: "p", lines: [line] })
  }
  return blocks.filter((block) => block.kind !== "p" || block.lines.length > 0)
}

export function RichText({
  text,
  handlers,
  className,
}: {
  text: string
  handlers: CitationHandlers
  className?: string
}) {
  const blocks = parse(text)
  return (
    <div className={cn("space-y-2.5 text-sm leading-relaxed text-pretty", className)}>
      {blocks.map((block, index) => {
        const key = `b-${index}`
        switch (block.kind) {
          case "h":
            return (
              <p key={key} className="font-heading text-base font-semibold">
                {inline(block.text, handlers, key)}
              </p>
            )
          case "ul":
            return (
              <ul key={key} className="ml-4 list-disc space-y-1 marker:text-muted-foreground">
                {block.items.map((item, itemIndex) => (
                  <li key={`${key}-${itemIndex}`}>{inline(item, handlers, `${key}-${itemIndex}`)}</li>
                ))}
              </ul>
            )
          case "ol":
            return (
              <ol key={key} className="ml-4 list-decimal space-y-1 marker:text-muted-foreground">
                {block.items.map((item, itemIndex) => (
                  <li key={`${key}-${itemIndex}`}>{inline(item, handlers, `${key}-${itemIndex}`)}</li>
                ))}
              </ol>
            )
          default:
            return (
              <p key={key}>
                {block.lines.map((line, lineIndex) => (
                  <Fragment key={`${key}-${lineIndex}`}>
                    {lineIndex > 0 && <br />}
                    {inline(line, handlers, `${key}-${lineIndex}`)}
                  </Fragment>
                ))}
              </p>
            )
        }
      })}
    </div>
  )
}
