import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowRight, BookMarked, FileText, ListChecks } from "lucide-react"

import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { KnowledgeArticleCard } from "@/components/knowledge/knowledge-article-card"
import { KnowledgeBreadcrumbs } from "@/components/knowledge/knowledge-breadcrumbs"
import { KnowledgeDocumentCard } from "@/components/knowledge/knowledge-document-card"
import { KnowledgeFaqList } from "@/components/knowledge/knowledge-faq-list"
import { KnowledgeGuideCard } from "@/components/knowledge/knowledge-guide-card"
import { KnowledgeIcon } from "@/components/knowledge/knowledge-icon"
import { DbOffline } from "@/components/db-offline"
import { PageHeader } from "@/components/page-header"
import { getKnowledgeCategory } from "@/server/services/knowledge-center"

export const dynamic = "force-dynamic"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  try {
    const data = await getKnowledgeCategory(slug)
    return { title: data?.category.title ?? "Kategoria" }
  } catch {
    return { title: "Kategoria" }
  }
}

export default async function KnowledgeCategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  let data

  try {
    data = await getKnowledgeCategory(slug)
  } catch (error) {
    return (
      <div className="page-shell space-y-6 py-10">
        <PageHeader
          eyebrow="Centrum wiedzy"
          title="Kategoria"
          lead="Materiały są chwilowo niedostępne."
        />
        <DbOffline error={error} />
      </div>
    )
  }

  if (!data) notFound()

  const { category } = data
  const empty =
    data.articles.length === 0 &&
    data.faq.length === 0 &&
    data.guides.length === 0 &&
    data.documents.length === 0 &&
    data.glossary.length === 0

  return (
    <div className="page-shell space-y-8 py-10">
      <KnowledgeBreadcrumbs items={[{ label: category.title }]} />

      <header className="flex flex-col gap-4 border-b border-border/70 pb-8 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-4">
          <span className="grid size-12 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
            <KnowledgeIcon name={category.icon} className="size-6" />
          </span>
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
              {category.title}
            </h1>
            <p className="max-w-2xl text-base text-pretty text-muted-foreground">
              {category.description}
            </p>
            <div className="flex flex-wrap gap-1.5 pt-1">
              <Badge variant="outline">{category.articleCount} artykułów</Badge>
              <Badge variant="outline">{category.faqCount} pytań</Badge>
              <Badge variant="outline">
                {category.guideCount} przewodników
              </Badge>
              <Badge variant="outline">
                {category.documentCount} dokumentów
              </Badge>
              {category.glossaryCount > 0 && (
                <Badge variant="outline">{category.glossaryCount} pojęć</Badge>
              )}
            </div>
          </div>
        </div>
        <Button asChild variant="outline" className="shrink-0">
          <Link href="/wiedza">Wszystkie tematy</Link>
        </Button>
      </header>

      {empty && (
        <Card>
          <CardHeader>
            <CardTitle>Materiały w przygotowaniu</CardTitle>
            <CardDescription>
              Ten dział nie ma jeszcze opublikowanych treści. Wróć później lub
              skorzystaj z wyszukiwarki.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline">
              <Link href="/wiedza/szukaj?q=zasi%C5%82ek">
                Szukaj w całym centrum
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {data.articles.length > 0 && (
        <section aria-labelledby="category-articles" className="space-y-4">
          <h2
            id="category-articles"
            className="flex items-center gap-2 text-xl font-semibold tracking-tight"
          >
            <BookMarked aria-hidden="true" className="size-5 text-primary" />
            Artykuły
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {data.articles.map((article) => (
              <KnowledgeArticleCard key={article.id} article={article} />
            ))}
          </div>
        </section>
      )}

      {data.glossary.length > 0 && (
        <section aria-labelledby="category-glossary" className="space-y-3">
          <h2
            id="category-glossary"
            className="flex items-center gap-2 text-xl font-semibold tracking-tight"
          >
            <BookMarked aria-hidden="true" className="size-5 text-primary" />
            Pojęcia
          </h2>
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {data.glossary.map((term) => (
              <li key={term.id}>
                <Link
                  href={`/wiedza/slownik/${term.slug}`}
                  className="group flex h-full flex-col rounded-lg border border-border/70 bg-card p-4 transition-colors hover:border-primary/40 hover:bg-primary/[0.02] focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                >
                  <span className="font-semibold group-hover:text-primary">
                    {term.term}
                  </span>
                  <span className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                    {term.definition}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {data.faq.length > 0 && (
        <section aria-labelledby="category-faq" className="space-y-4">
          <h2
            id="category-faq"
            className="text-xl font-semibold tracking-tight"
          >
            Najczęstsze pytania
          </h2>
          <KnowledgeFaqList items={data.faq} />
        </section>
      )}

      {data.documents.length > 0 && (
        <section aria-labelledby="category-documents" className="space-y-4">
          <h2
            id="category-documents"
            className="flex items-center gap-2 text-xl font-semibold tracking-tight"
          >
            <FileText aria-hidden="true" className="size-5 text-primary" />
            Dokumenty i formularze
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {data.documents.map((document) => (
              <KnowledgeDocumentCard key={document.id} document={document} />
            ))}
          </div>
        </section>
      )}

      {data.guides.length > 0 && (
        <section aria-labelledby="category-guides" className="space-y-4">
          <h2
            id="category-guides"
            className="flex items-center gap-2 text-xl font-semibold tracking-tight"
          >
            <ListChecks aria-hidden="true" className="size-5 text-primary" />
            Przewodniki
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {data.guides.map((guide) => (
              <KnowledgeGuideCard key={guide.id} guide={guide} />
            ))}
          </div>
        </section>
      )}

      <div className="rounded-lg border border-border/70 bg-secondary/40 p-4">
        <p className="text-sm font-medium">Inne tematy</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {data.categories
            .filter((item) => item.slug !== category.slug)
            .map((item) => (
              <Link
                key={item.id}
                href={`/wiedza/kategoria/${item.slug}`}
                className="inline-flex min-h-8 items-center rounded-full border border-border bg-background px-2.5 text-xs text-muted-foreground hover:text-foreground"
              >
                {item.title}
              </Link>
            ))}
          <Link
            href="/wiedza"
            className="inline-flex min-h-8 items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2.5 text-xs font-medium text-primary"
          >
            Centrum wiedzy
            <ArrowRight aria-hidden="true" className="size-3" />
          </Link>
        </div>
      </div>
    </div>
  )
}
