import type { Metadata } from "next"
import { BookMarked } from "lucide-react"

import { KnowledgeArticleCard } from "@/components/knowledge/knowledge-article-card"
import { KnowledgeBreadcrumbs } from "@/components/knowledge/knowledge-breadcrumbs"
import { KnowledgeCategoryFilter } from "@/components/knowledge/knowledge-category-filter"
import { KnowledgeSearchForm } from "@/components/knowledge/knowledge-search-form"
import { DbOffline } from "@/components/db-offline"
import { PageHeader } from "@/components/page-header"
import { getArticleIndex } from "@/server/services/knowledge-center"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Artykuły i opracowania",
  description:
    "Opracowania tematyczne o ciąży, zasiłkach, ubezpieczeniach, urlopach, adopcji i sytuacjach szczególnych. Każdy artykuł ze źródłami.",
}

export default async function KnowledgeArticlesPage({
  searchParams,
}: {
  searchParams: Promise<{ kategoria?: string; q?: string }>
}) {
  const params = await searchParams
  let data

  try {
    data = await getArticleIndex({
      category: params.kategoria,
      query: params.q,
    })
  } catch (error) {
    return (
      <div className="page-shell space-y-6 py-10">
        <PageHeader
          eyebrow="Centrum wiedzy"
          title="Artykuły i opracowania"
          lead="Materiały są chwilowo niedostępne."
        />
        <DbOffline error={error} />
      </div>
    )
  }

  return (
    <div className="page-shell space-y-8 py-10">
      <KnowledgeBreadcrumbs items={[{ label: "Artykuły" }]} />

      <PageHeader
        eyebrow="Baza wiedzy"
        title="Artykuły i opracowania"
        lead="Dłuższe materiały z sekcjami, najważniejszymi informacjami, praktycznymi wskazówkami, powiązanymi dokumentami i źródłami."
      />

      <section className="space-y-4">
        <KnowledgeSearchForm
          action="/wiedza/artykuly"
          defaultQuery={data.query}
          showExamples={false}
          hiddenFields={
            data.selectedCategory
              ? { kategoria: data.selectedCategory.slug }
              : undefined
          }
        />
        <KnowledgeCategoryFilter
          basePath="/wiedza/artykuly"
          categories={data.categories}
          selectedSlug={data.selectedCategory?.slug}
          query={data.query}
        />
      </section>

      <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <BookMarked aria-hidden="true" className="size-4" />
        {data.articles.length} artykułów
        {data.selectedCategory
          ? ` w kategorii „${data.selectedCategory.title}”`
          : ""}
        {data.query ? ` dla frazy „${data.query}”` : ""}.
      </p>

      {data.articles.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
          Brak artykułów dla wybranych kryteriów. Wyczyść filtr lub zmień frazę.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {data.articles.map((article) => (
            <KnowledgeArticleCard key={article.id} article={article} />
          ))}
        </div>
      )}
    </div>
  )
}
