import Link from "next/link"
import { Search } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"

const EXAMPLES = [
  "Ile wynosi zasiłek macierzyński?",
  "Jak zgłosić urodzenie dziecka?",
  "Czym jest podstawa wymiaru?",
  "Jakie dokumenty do ZUS?",
]

export function KnowledgeSearchForm({
  defaultQuery = "",
  size = "default",
  action = "/wiedza/szukaj",
  showExamples = true,
  hiddenFields,
}: {
  defaultQuery?: string
  size?: "default" | "large"
  action?: string
  showExamples?: boolean
  hiddenFields?: Record<string, string>
}) {
  return (
    <div className="space-y-3">
      <form
        action={action}
        method="get"
        role="search"
        className="flex flex-col gap-2 sm:flex-row"
      >
        {hiddenFields &&
          Object.entries(hiddenFields).map(([name, value]) => (
            <input key={name} type="hidden" name={name} value={value} />
          ))}
        <label htmlFor="knowledge-q" className="sr-only">
          Szukaj w Centrum wiedzy
        </label>
        <div className="relative flex-1">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            id="knowledge-q"
            name="q"
            type="search"
            defaultValue={defaultQuery}
            placeholder="Wpisz pytanie, pojęcie, formularz lub nazwę świadczenia"
            autoComplete="off"
            className={
              size === "large"
                ? "h-12 rounded-md pl-10 text-base"
                : "h-10 pl-10"
            }
          />
        </div>
        <Button type="submit" size={size === "large" ? "lg" : "default"}>
          <Search data-icon="inline-start" aria-hidden="true" />
          Szukaj
        </Button>
      </form>
      <div className="flex flex-wrap items-center gap-1.5">
        {showExamples && (
          <>
            <span className="text-xs text-muted-foreground">
              Popularne pytania:
            </span>
            {EXAMPLES.map((example) => (
              <Link
                key={example}
                href={`${action}?q=${encodeURIComponent(example)}`}
                className="rounded-full border border-border bg-background px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
              >
                {example}
              </Link>
            ))}
          </>
        )}
      </div>
    </div>
  )
}
