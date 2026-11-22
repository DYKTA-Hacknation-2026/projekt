import type { Metadata } from "next"
import Link from "next/link"
import { ListChecks } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import { KnowledgeBreadcrumbs } from "@/components/knowledge/knowledge-breadcrumbs"
import { KnowledgeCategoryFilter } from "@/components/knowledge/knowledge-category-filter"
import { KnowledgeGuideCard } from "@/components/knowledge/knowledge-guide-card"
import { DbOffline } from "@/components/db-offline"
import { PageHeader } from "@/components/page-header"
import { getGuidesPage } from "@/server/services/knowledge-center"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Przewodniki krok po kroku",
  description:
    "Procedury ZUS i urzędowe: cel, warunki, dokumenty, kolejne kroki, terminy, miejsca i typowe problemy.",
}

export default async function KnowledgeGuidesPage({
  searchParams,
}: {
  searchParams: Promise<{ kategoria?: string }>
}) {
  const params = await searchParams
  let data

  try {
    data = await getGuidesPage(params.kategoria)
  } catch (error) {
    return (
      <div className="page-shell space-y-6 py-10">
        <PageHeader
          eyebrow="Centrum wiedzy"
          title="Przewodniki krok po kroku"
          lead="Materiały są chwilowo niedostępne."
        />
        <DbOffline error={error} />
      </div>
    )
  }

  return (
    <div className="page-shell space-y-8 py-10">
      <KnowledgeBreadcrumbs items={[{ label: "Przewodniki" }]} />

      <PageHeader
        eyebrow="Procedury"
        title="Przewodniki krok po kroku"
        lead="Konkretna procedura, lista dokumentów, terminy i miejsca złożenia. Bez ogólników — ale też bez udawania, że każda sprawa jest identyczna."
      />

      <KnowledgeCategoryFilter
        basePath="/wiedza/przewodniki"
        categories={data.categories}
        selectedSlug={data.selectedCategory?.slug}
      />

      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <ListChecks aria-hidden="true" className="size-4" />
          {data.guides.length} przewodników
          {data.selectedCategory
            ? ` w kategorii „${data.selectedCategory.title}”`
            : ""}
        </p>
        <Button asChild size="sm" variant="outline">
          <Link href="/wiedza/dokumenty">Dokumenty i formularze</Link>
        </Button>
      </div>

      {data.guides.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
          Brak przewodników w tej kategorii.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {data.guides.map((guide) => (
            <KnowledgeGuideCard key={guide.id} guide={guide} />
          ))}
        </div>
      )}
    </div>
  )
}
