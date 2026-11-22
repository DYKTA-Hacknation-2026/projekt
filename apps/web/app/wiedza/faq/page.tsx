import type { Metadata } from "next"
import Link from "next/link"
import { ArrowRight, CircleHelp, MessagesSquare } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import { KnowledgeBreadcrumbs } from "@/components/knowledge/knowledge-breadcrumbs"
import { KnowledgeCategoryFilter } from "@/components/knowledge/knowledge-category-filter"
import { KnowledgeFaqList } from "@/components/knowledge/knowledge-faq-list"
import { KnowledgeSearchForm } from "@/components/knowledge/knowledge-search-form"
import { DbOffline } from "@/components/db-offline"
import { PageHeader } from "@/components/page-header"
import { getFaqPage } from "@/server/services/knowledge-center"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "FAQ — najczęściej zadawane pytania",
  description:
    "Krótkie odpowiedzi, warunki, wyjątki i wskazówki. Filtr po kategorii i wyszukiwanie w treści pytań i odpowiedzi.",
}

export default async function KnowledgeFaqPage({
  searchParams,
}: {
  searchParams: Promise<{ kategoria?: string; q?: string }>
}) {
  const params = await searchParams
  let data

  try {
    data = await getFaqPage({ category: params.kategoria, query: params.q })
  } catch (error) {
    return (
      <div className="page-shell space-y-6 py-10">
        <PageHeader
          eyebrow="Centrum wiedzy"
          title="Najczęściej zadawane pytania"
          lead="Materiały są chwilowo niedostępne."
        />
        <DbOffline error={error} />
      </div>
    )
  }

  return (
    <div className="page-shell space-y-8 py-10">
      <KnowledgeBreadcrumbs items={[{ label: "FAQ" }]} />

      <PageHeader
        eyebrow="FAQ"
        title="Najczęściej zadawane pytania"
        lead="Krótka odpowiedź na wierzchu, a po rozwinięciu — wyjaśnienie, warunki, wyjątki i konkretne kroki. Bez „to zależy” bez wyjaśnienia."
        actions={
          <Button asChild variant="outline">
            <Link href="/asystent">
              <MessagesSquare data-icon="inline-start" aria-hidden="true" />
              Zapytaj asystenta
            </Link>
          </Button>
        }
      />

      <section className="space-y-4" aria-labelledby="faq-search">
        <h2 id="faq-search" className="sr-only">
          Szukaj w pytaniach
        </h2>
        <KnowledgeSearchForm
          action="/wiedza/faq"
          defaultQuery={data.query}
          showExamples={false}
          hiddenFields={
            data.selectedCategory
              ? { kategoria: data.selectedCategory.slug }
              : undefined
          }
        />
        <KnowledgeCategoryFilter
          basePath="/wiedza/faq"
          categories={data.categories}
          selectedSlug={data.selectedCategory?.slug}
          query={data.query}
        />
      </section>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {data.selectedCategory
            ? `Kategoria: ${data.selectedCategory.title}. `
            : "Wszystkie kategorie. "}
          Znaleziono {data.items.length}{" "}
          {data.items.length === 1
            ? "pytanie"
            : data.items.length < 5
              ? "pytania"
              : "pytań"}
          {data.query ? ` dla frazy „${data.query}”.` : "."}
        </p>
        {data.query && (
          <Button asChild size="sm" variant="ghost">
            <Link href="/wiedza/faq">Wyczyść wyszukiwanie</Link>
          </Button>
        )}
      </div>

      {data.items.length === 0 && data.query ? (
        <div className="rounded-lg border border-dashed border-border bg-card p-8 text-center">
          <CircleHelp
            aria-hidden="true"
            className="mx-auto size-8 text-muted-foreground"
          />
          <h2 className="mt-3 text-lg font-semibold">
            Nie znaleźliśmy pytania dla tej frazy
          </h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-pretty text-muted-foreground">
            Spróbuj krótszej frazy, np. „macierzyński” albo „dokumenty”. Możesz
            też przejść do pełnej wyszukiwarki albo zapytać asystenta.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Button asChild variant="outline">
              <Link href={`/wiedza/szukaj?q=${encodeURIComponent(data.query)}`}>
                Szukaj w całym centrum
                <ArrowRight data-icon="inline-end" aria-hidden="true" />
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/asystent">Zapytaj asystenta</Link>
            </Button>
          </div>
        </div>
      ) : (
        <KnowledgeFaqList
          items={data.items}
          showCategory={!data.selectedCategory}
        />
      )}
    </div>
  )
}
