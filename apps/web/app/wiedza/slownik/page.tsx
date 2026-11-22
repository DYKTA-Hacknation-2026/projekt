import type { Metadata } from "next"
import Link from "next/link"
import { BookMarked } from "lucide-react"

import { Badge } from "@workspace/ui/components/badge"
import { KnowledgeBreadcrumbs } from "@/components/knowledge/knowledge-breadcrumbs"
import { KnowledgeSearchForm } from "@/components/knowledge/knowledge-search-form"
import { DbOffline } from "@/components/db-offline"
import { PageHeader } from "@/components/page-header"
import { formatDate } from "@/lib/format"
import { getGlossaryPage } from "@/server/services/knowledge-center"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Słownik pojęć",
  description:
    "Proste definicje terminów z ZUS i przepisów: ubezpieczony, płatnik, podstawa wymiaru, okres zasiłkowy i inne.",
}

export default async function KnowledgeGlossaryPage({
  searchParams,
}: {
  searchParams: Promise<{ litera?: string; q?: string }>
}) {
  const params = await searchParams
  let data

  try {
    data = await getGlossaryPage({ letter: params.litera, query: params.q })
  } catch (error) {
    return (
      <div className="page-shell space-y-6 py-10">
        <PageHeader
          eyebrow="Centrum wiedzy"
          title="Słownik pojęć"
          lead="Materiały są chwilowo niedostępne."
        />
        <DbOffline error={error} />
      </div>
    )
  }

  const grouped = new Map<string, typeof data.terms>()
  for (const term of data.terms) {
    const bucket = grouped.get(term.letter) ?? []
    bucket.push(term)
    grouped.set(term.letter, bucket)
  }

  return (
    <div className="page-shell space-y-8 py-10">
      <KnowledgeBreadcrumbs items={[{ label: "Słownik pojęć" }]} />

      <PageHeader
        eyebrow="Słownik"
        title="Słownik pojęć"
        lead="Trudne terminy urzędowe wyjaśnione po ludzku. Każde pojęcie ma definicję, szersze wyjaśnienie, przykład i powiązane artykuły."
      />

      <section className="space-y-4">
        <KnowledgeSearchForm
          action="/wiedza/slownik"
          defaultQuery={data.query}
          showExamples={false}
          hiddenFields={
            data.selectedLetter ? { litera: data.selectedLetter } : undefined
          }
        />
        <nav
          aria-label="Filtruj alfabetycznie"
          className="flex flex-wrap gap-1"
        >
          <Link
            href="/wiedza/slownik"
            aria-current={!data.selectedLetter ? "page" : undefined}
            className="inline-flex size-10 items-center justify-center rounded-md border border-border bg-background text-sm text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
          >
            Wsz.
          </Link>
          {data.letters.map((letter) => (
            <Link
              key={letter}
              href={`/wiedza/slownik?litera=${encodeURIComponent(letter)}`}
              aria-current={data.selectedLetter === letter ? "page" : undefined}
              className="inline-flex size-10 items-center justify-center rounded-md border border-border bg-background text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none aria-[current=page]:border-primary/40 aria-[current=page]:bg-primary/10 aria-[current=page]:text-primary"
            >
              {letter}
            </Link>
          ))}
        </nav>
      </section>

      <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <BookMarked aria-hidden="true" className="size-4" />
        {data.terms.length} pojęć
        {data.selectedLetter ? ` na literę ${data.selectedLetter}` : ""}
        {data.query ? ` dla frazy „${data.query}”` : ""}.
      </p>

      {data.terms.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
          Brak pojęć dla wybranych kryteriów.
        </div>
      ) : (
        <div className="space-y-8">
          {[...grouped.entries()].map(([letter, terms]) => (
            <section key={letter} aria-labelledby={`letter-${letter}`}>
              <h2
                id={`letter-${letter}`}
                className="mb-3 flex items-center gap-2 text-lg font-semibold tracking-tight"
              >
                <span className="grid size-8 place-items-center rounded-lg bg-primary/10 font-mono text-sm text-primary">
                  {letter}
                </span>
                {letter}
              </h2>
              <dl className="grid gap-2 sm:grid-cols-2">
                {terms.map((term) => (
                  <div
                    key={term.id}
                    className="rounded-lg border border-border/70 bg-card p-4"
                  >
                    <dt>
                      <Link
                        href={`/wiedza/slownik/${term.slug}`}
                        className="font-semibold hover:text-primary hover:underline"
                      >
                        {term.term}
                      </Link>
                    </dt>
                    <dd className="mt-1 text-sm leading-6 text-pretty text-muted-foreground">
                      {term.definition}
                    </dd>
                    <dd className="mt-2">
                      <Badge variant="outline" className="text-[10px]">
                        Weryfikacja {formatDate(term.lastReviewedAt)}
                      </Badge>
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
