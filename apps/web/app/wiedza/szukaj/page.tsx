import type { Metadata } from "next"
import Link from "next/link"
import { ArrowRight, SearchX, Sparkles } from "lucide-react"

import { CONTENT_TYPE_LABELS } from "@zpr/contracts/content"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { KnowledgeBreadcrumbs } from "@/components/knowledge/knowledge-breadcrumbs"
import { KnowledgeSearchForm } from "@/components/knowledge/knowledge-search-form"
import { DbOffline } from "@/components/db-offline"
import { PageHeader } from "@/components/page-header"
import { searchKnowledgeContent } from "@/server/services/knowledge-center"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Szukaj w Centrum wiedzy",
  description:
    "Przeszukaj artykuły, FAQ, dokumenty, przewodniki i słownik. Wyniki pogrupowane według typu materiału.",
}

export default async function KnowledgeSearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const params = await searchParams
  const query = params.q?.trim() ?? ""
  let data

  try {
    data = await searchKnowledgeContent(query)
  } catch (error) {
    return (
      <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-10 sm:px-6">
        <PageHeader
          eyebrow="Centrum wiedzy"
          title="Szukaj w Centrum wiedzy"
          lead="Wyszukiwarka jest chwilowo niedostępna."
        />
        <DbOffline error={error} />
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-8 px-4 py-8 sm:px-6">
      <KnowledgeBreadcrumbs items={[{ label: "Wyszukiwanie" }]} />

      <PageHeader
        eyebrow="Wyszukiwarka"
        title="Szukaj w Centrum wiedzy"
        lead="Jedna fraza przeszukuje artykuły, pytania i odpowiedzi, dokumenty, przewodniki i słownik. Wyniki nie są reklamami — kolejność zależy od trafności."
      />

      <KnowledgeSearchForm defaultQuery={query} size="large" />

      {query.length < 2 ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center">
          <Sparkles
            aria-hidden="true"
            className="mx-auto size-7 text-primary"
          />
          <h2 className="mt-3 text-lg font-semibold">
            Wpisz co najmniej dwa znaki
          </h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-pretty text-muted-foreground">
            Możesz wpisać nazwę świadczenia („zasiłek macierzyński”), dokument
            („ZAM”, „Z-3”), pojęcie („podstawa wymiaru”) albo zwykłe pytanie.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Button asChild variant="outline">
              <Link href="/wiedza">Przeglądaj kategorie</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/wiedza/faq">Najczęstsze pytania</Link>
            </Button>
          </div>
        </div>
      ) : data.hits.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center">
          <SearchX
            aria-hidden="true"
            className="mx-auto size-8 text-muted-foreground"
          />
          <h2 className="mt-3 text-lg font-semibold">
            Brak wyników dla „{query}”
          </h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-pretty text-muted-foreground">
            Spróbuj krótszej frazy albo innego słowa. Jeżeli pytanie dotyczy
            Twojej konkretnej sytuacji, asystent może pomóc dobrać materiał i
            wskazać źródła.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Button asChild>
              <Link href={`/asystent?q=${encodeURIComponent(query)}`}>
                Zapytaj asystenta
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/wiedza/dokumenty">Przeglądaj dokumenty</Link>
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          <p className="text-sm text-muted-foreground">
            Znaleziono {data.hits.length}{" "}
            {data.hits.length === 1
              ? "materiał"
              : data.hits.length < 5
                ? "materiały"
                : "materiałów"}{" "}
            dla frazy „{query}”.
          </p>

          {data.groups.map((group) => (
            <section
              key={group.type}
              aria-labelledby={`search-${group.type}`}
              className="space-y-3"
            >
              <div className="flex items-center gap-2">
                <h2
                  id={`search-${group.type}`}
                  className="text-lg font-semibold tracking-tight"
                >
                  {group.label}
                </h2>
                <Badge variant="outline">{group.hits.length}</Badge>
              </div>
              <ul className="grid gap-2 sm:grid-cols-2">
                {group.hits.map((hit) => (
                  <li key={`${hit.type}-${hit.slug}`}>
                    <Link
                      href={hit.href}
                      className="group flex h-full flex-col rounded-xl border border-border/70 bg-card p-4 transition-colors hover:border-primary/40 hover:bg-primary/[0.02] focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                    >
                      <span className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                        <Badge variant="outline">
                          {CONTENT_TYPE_LABELS[hit.type]}
                        </Badge>
                      </span>
                      <span className="mt-2 font-medium text-pretty group-hover:text-primary">
                        {hit.title}
                      </span>
                      <span className="mt-1 line-clamp-3 text-sm text-pretty text-muted-foreground">
                        {hit.snippet}
                      </span>
                      <span className="mt-auto inline-flex items-center gap-1 pt-3 text-xs font-medium text-primary">
                        Otwórz
                        <ArrowRight
                          aria-hidden="true"
                          className="size-3 transition-transform group-hover:translate-x-0.5"
                        />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
