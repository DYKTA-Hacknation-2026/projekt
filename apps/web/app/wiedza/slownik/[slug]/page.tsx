import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { BookMarked, Lightbulb } from "lucide-react"

import { Badge } from "@workspace/ui/components/badge"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { KnowledgeBreadcrumbs } from "@/components/knowledge/knowledge-breadcrumbs"
import { KnowledgeMeta } from "@/components/knowledge/knowledge-meta"
import { KnowledgeRelatedLinks } from "@/components/knowledge/knowledge-related-links"
import { DbOffline } from "@/components/db-offline"
import { getGlossaryView } from "@/server/services/knowledge-center"

export const dynamic = "force-dynamic"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  try {
    const data = await getGlossaryView(slug)
    return {
      title: data?.term.term ?? "Pojęcie",
      description: data?.term.definition,
    }
  } catch {
    return { title: "Pojęcie" }
  }
}

export default async function GlossaryTermPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  let data

  try {
    data = await getGlossaryView(slug)
  } catch (error) {
    return (
      <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-10 sm:px-6">
        <p className="text-sm text-muted-foreground">Pojęcie</p>
        <DbOffline error={error} />
      </div>
    )
  }

  if (!data) notFound()

  const { term } = data

  return (
    <div className="mx-auto w-full max-w-4xl space-y-8 px-4 py-8 sm:px-6">
      <KnowledgeBreadcrumbs
        items={[
          { href: "/wiedza/slownik", label: "Słownik pojęć" },
          { label: term.term },
        ]}
      />

      <header className="space-y-3 border-b border-border/70 pb-6">
        <Badge variant="outline" className="gap-1">
          <BookMarked aria-hidden="true" />
          Pojęcie
        </Badge>
        <h1 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
          {term.term}
        </h1>
        <p className="text-lg text-pretty">{term.definition}</p>
        <KnowledgeMeta lastReviewedAt={term.lastReviewedAt} />
      </header>

      <div className="space-y-4">
        {term.explanation && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Dokładniejsze wyjaśnienie</CardTitle>
            </CardHeader>
            <CardContent className="text-sm leading-7 text-pretty text-foreground/90">
              {term.explanation}
            </CardContent>
          </Card>
        )}

        {term.example && (
          <Card className="border-primary/20 bg-primary/[0.04]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Lightbulb aria-hidden="true" className="size-4 text-primary" />
                Przykład z życia
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm leading-7 text-pretty">
              {term.example}
            </CardContent>
          </Card>
        )}
      </div>

      <KnowledgeRelatedLinks items={data.related} title="Powiązane artykuły" />

      <div className="rounded-xl border border-border/70 bg-secondary/40 p-4 text-sm">
        <p className="font-medium">Szukasz więcej?</p>
        <p className="mt-1 text-muted-foreground">
          Zobacz pełny{" "}
          <Link href="/wiedza/slownik" className="font-medium text-primary hover:underline">
            słownik pojęć
          </Link>{" "}
          lub zapytaj asystenta o wyjaśnienie prostymi słowami.
        </p>
        <Link
          href={`/asystent?q=${encodeURIComponent(`Co oznacza „${term.term}”?`)}`}
          className="mt-2 inline-flex text-sm font-medium text-primary hover:underline"
        >
          Zapytaj asystenta
        </Link>
      </div>
    </div>
  )
}
