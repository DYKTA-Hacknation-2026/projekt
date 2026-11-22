import type { KnowledgeBlock } from "@zpr/contracts/content"

import { headingId } from "@/lib/knowledge"
import { cn } from "@workspace/ui/lib/utils"

const CALLOUT_STYLES: Record<
  Extract<KnowledgeBlock, { kind: "callout" }>["tone"],
  string
> = {
  info: "border-info/30 bg-info/5",
  warning: "border-warning/40 bg-warning/10",
  important: "border-primary/30 bg-primary/5",
}

const CALLOUT_TITLE: Record<
  Extract<KnowledgeBlock, { kind: "callout" }>["tone"],
  string
> = {
  info: "Warto wiedzieć",
  warning: "Uwaga",
  important: "Najważniejsze",
}

export function KnowledgeBlocks({ blocks }: { blocks: KnowledgeBlock[] }) {
  return (
    <div className="space-y-4">
      {blocks.map((block, index) => {
        if (block.kind === "heading") {
          return (
            <h2
              key={index}
              id={headingId(block.text, index)}
              className="mt-8 scroll-mt-24 text-xl font-semibold tracking-tight text-balance first:mt-0 sm:text-2xl"
            >
              {block.text}
            </h2>
          )
        }

        if (block.kind === "paragraph") {
          return (
            <p
              key={index}
              className="text-base leading-7 text-pretty text-foreground/90"
            >
              {block.text}
            </p>
          )
        }

        if (block.kind === "list") {
          const ListTag = block.ordered ? "ol" : "ul"
          return (
            <ListTag
              key={index}
              className={cn(
                "space-y-2 pl-5 text-base leading-7 text-foreground/90",
                block.ordered ? "list-decimal" : "list-disc"
              )}
            >
              {block.items.map((item, itemIndex) => (
                <li key={itemIndex} className="pl-1">
                  {item}
                </li>
              ))}
            </ListTag>
          )
        }

        if (block.kind === "callout") {
          return (
            <aside
              key={index}
              className={cn(
                "rounded-md border px-4 py-3.5",
                CALLOUT_STYLES[block.tone]
              )}
            >
              <p className="text-sm font-semibold">
                {block.title ?? CALLOUT_TITLE[block.tone]}
              </p>
              <p className="mt-1 text-sm leading-6 text-pretty text-foreground/90">
                {block.text}
              </p>
            </aside>
          )
        }

        return (
          <div
            key={index}
            role="region"
            aria-label={block.caption ?? "Tabela informacyjna"}
            tabIndex={0}
            className="overflow-x-auto rounded-md border border-border/70 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
          >
            <table className="w-full min-w-[34rem] border-collapse text-sm">
              {block.caption && (
                <caption className="border-b border-border/70 px-3 py-2 text-left text-xs text-muted-foreground">
                  {block.caption}
                </caption>
              )}
              <thead className="bg-secondary/60">
                <tr>
                  {block.headers.map((header) => (
                    <th
                      key={header}
                      scope="col"
                      className="border-b border-border/70 px-3 py-2 text-left font-semibold"
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {block.rows.map((row, rowIndex) => (
                  <tr key={rowIndex} className="even:bg-secondary/20">
                    {row.map((cell, cellIndex) => (
                      <td
                        key={cellIndex}
                        className="border-b border-border/50 px-3 py-2 align-top text-foreground/90 last:border-b-0"
                      >
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      })}
    </div>
  )
}
