import type { Metadata } from "next"
import Link from "next/link"
import { FileSearch, Files, Info } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@workspace/ui/components/alert"
import { Button } from "@workspace/ui/components/button"
import { KnowledgeBreadcrumbs } from "@/components/knowledge/knowledge-breadcrumbs"
import { KnowledgeCategoryFilter } from "@/components/knowledge/knowledge-category-filter"
import { KnowledgeDocumentCard } from "@/components/knowledge/knowledge-document-card"
import { DbOffline } from "@/components/db-offline"
import { PageHeader } from "@/components/page-header"
import { getDocumentsPage } from "@/server/services/knowledge-center"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Dokumenty i formularze",
  description:
    "Karty dokumentów ZUS: cel, sytuacje użycia, kto wypełnia, gdzie złożyć i link do oficjalnego wzoru. Bez nieaktualnych druków.",
}

export default async function KnowledgeDocumentsPage({
  searchParams,
}: {
  searchParams: Promise<{ kategoria?: string }>
}) {
  const params = await searchParams
  let data

  try {
    data = await getDocumentsPage(params.kategoria)
  } catch (error) {
    return (
      <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-10 sm:px-6">
        <PageHeader
          eyebrow="Centrum wiedzy"
          title="Dokumenty i formularze"
          lead="Materiały są chwilowo niedostępne."
        />
        <DbOffline error={error} />
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-8 px-4 py-8 sm:px-6">
      <KnowledgeBreadcrumbs items={[{ label: "Dokumenty i formularze" }]} />

      <PageHeader
        eyebrow="Dokumenty"
        title="Dokumenty i formularze"
        lead="Nie każdy formularz jest potrzebny każdemu. Sprawdź, w jakiej sytuacji go użyć, kto go wypełnia i gdzie złożyć. Przy każdym oficjalnym źródle podajemy datę weryfikacji."
        actions={
          <Button asChild variant="outline">
            <Link href="/dokumenty">
              <FileSearch data-icon="inline-start" aria-hidden="true" />
              Analizator dokumentów
            </Link>
          </Button>
        }
      />

      <Alert variant="warning">
        <Info aria-hidden="true" />
        <AlertTitle>Ważne zmiany w formularzach</AlertTitle>
        <AlertDescription>
          Od 24 października 2026 r. ZAM zastępuje ZUR i ZAO, Z-3b został
          wycofany, a Z-15 zastępuje Z-15A i Z-15B (na eZUS od połowy listopada).
          Przed złożeniem zawsze sprawdź aktualny wzór na zus.pl — karty poniżej
          wyjaśniają, który dokument jest właściwy.
        </AlertDescription>
      </Alert>

      <KnowledgeCategoryFilter
        basePath="/wiedza/dokumenty"
        categories={data.categories}
        selectedSlug={data.selectedCategory?.slug}
      />

      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {data.selectedCategory
            ? `Kategoria: ${data.selectedCategory.title}. `
            : "Wszystkie dokumenty. "}
          {data.documents.length} pozycji.
        </p>
        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
          <Files aria-hidden="true" className="size-3.5" />
          Karty informacyjne, nie wzory do wypełnienia
        </span>
      </div>

      {data.documents.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center">
          <p className="text-sm text-muted-foreground">
            Brak dokumentów w tej kategorii.
          </p>
          <Button asChild variant="outline" className="mt-4">
            <Link href="/wiedza/dokumenty">Pokaż wszystkie</Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {data.documents.map((document) => (
            <KnowledgeDocumentCard key={document.id} document={document} />
          ))}
        </div>
      )}
    </div>
  )
}
