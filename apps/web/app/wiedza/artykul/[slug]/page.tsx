import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import {
  ArrowRight,
  BookCheck,
  Calculator,
  ExternalLink,
  FileText,
  Lightbulb,
  MessagesSquare,
  Scale,
  ShieldCheck,
} from "lucide-react"

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@workspace/ui/components/alert"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import {
  CONTENT_SOURCE_KIND_LABELS,
  type KnowledgeBlock,
} from "@zpr/contracts/content"
import { KnowledgeBlocks } from "@/components/knowledge/knowledge-blocks"
import { KnowledgeBreadcrumbs } from "@/components/knowledge/knowledge-breadcrumbs"
import { KnowledgeFaqList } from "@/components/knowledge/knowledge-faq-list"
import { KnowledgeMeta } from "@/components/knowledge/knowledge-meta"
import { KnowledgeRelatedLinks } from "@/components/knowledge/knowledge-related-links"
import { DbOffline } from "@/components/db-offline"
import { formatDate } from "@/lib/format"
import { headingId } from "@/lib/knowledge"
import { LEGAL_DISCLOSURE } from "@/messages/pl"
import { getArticleView } from "@/server/services/knowledge-center"

export const dynamic = "force-dynamic"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  try {
    const data = await getArticleView(slug)
    return {
      title: data?.article.title ?? "Artykuł",
      description: data?.article.summary,
    }
  } catch {
    return { title: "Artykuł" }
  }
}

function headings(blocks: KnowledgeBlock[]) {
  return blocks
    .map((block, index) => ({ block, index }))
    .filter(
      (
        entry
      ): entry is {
        block: Extract<KnowledgeBlock, { kind: "heading" }>
        index: number
      } => entry.block.kind === "heading"
    )
    .map((entry) => ({
      id: headingId(entry.block.text, entry.index),
      text: entry.block.text,
    }))
}

export default async function KnowledgeArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  let data

  try {
    data = await getArticleView(slug)
  } catch (error) {
    return (
      <div className="page-shell space-y-6 py-10">
        <p className="text-sm text-muted-foreground">Artykuł</p>
        <DbOffline error={error} />
      </div>
    )
  }

  if (!data) notFound()

  const { article, category } = data
  const toc = headings(article.blocks)
  const assistantHref = `/asystent?q=${encodeURIComponent(
    `${article.title} — wyjaśnij mi to prostymi słowami.`
  )}`

  return (
    <div className="page-shell space-y-8 py-10">
      <KnowledgeBreadcrumbs
        items={[
          { href: `/wiedza/kategoria/${category.slug}`, label: category.title },
          { label: article.title },
        ]}
      />

      <header className="max-w-3xl space-y-4">
        <Link
          href={`/wiedza/kategoria/${category.slug}`}
          className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary hover:bg-primary/15"
        >
          {category.title}
        </Link>
        <h1 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
          {article.title}
        </h1>
        <p className="text-lg text-pretty text-muted-foreground">
          {article.summary}
        </p>
        <KnowledgeMeta
          lastReviewedAt={article.lastReviewedAt}
          readingMinutes={article.readingMinutes}
        />
      </header>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_17rem] lg:items-start">
        <article className="min-w-0 space-y-8">
          {article.keyPoints.length > 0 && (
            <section aria-labelledby="key-points-heading">
              <Card className="border-primary/20 bg-primary/[0.04]">
                <CardHeader>
                  <CardTitle
                    id="key-points-heading"
                    className="flex items-center gap-2 text-base"
                  >
                    <BookCheck
                      aria-hidden="true"
                      className="size-4 text-primary"
                    />
                    Najważniejsze informacje
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <dl className="grid gap-3 sm:grid-cols-2">
                    {article.keyPoints.map((point) => (
                      <div
                        key={point.label}
                        className="rounded-lg border border-border/60 bg-card p-3"
                      >
                        <dt className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                          {point.label}
                        </dt>
                        <dd className="mt-1 text-sm leading-6 text-pretty">
                          {point.value}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </CardContent>
              </Card>
            </section>
          )}

          <KnowledgeBlocks blocks={article.blocks} />

          {article.practicalTips.length > 0 && (
            <section aria-labelledby="tips-heading">
              <Card>
                <CardHeader>
                  <CardTitle
                    id="tips-heading"
                    className="flex items-center gap-2 text-base"
                  >
                    <Lightbulb
                      aria-hidden="true"
                      className="size-4 text-primary"
                    />
                    Praktyczne wskazówki
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm leading-6">
                    {article.practicalTips.map((tip) => (
                      <li
                        key={tip}
                        className="flex gap-2 rounded-lg bg-secondary/40 p-2.5"
                      >
                        <span
                          aria-hidden="true"
                          className="mt-2 size-1.5 shrink-0 rounded-full bg-primary"
                        />
                        <span>{tip}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </section>
          )}

          {data.faq.length > 0 && (
            <section
              aria-labelledby="article-faq-heading"
              className="space-y-3"
            >
              <h2
                id="article-faq-heading"
                className="text-xl font-semibold tracking-tight"
              >
                Powiązane pytania
              </h2>
              <KnowledgeFaqList items={data.faq} />
            </section>
          )}

          {(data.relatedDocuments.length > 0 ||
            data.relatedGuides.length > 0) && (
            <div className="grid gap-6 sm:grid-cols-2">
              <KnowledgeRelatedLinks
                title="Dokumenty"
                items={data.relatedDocuments}
                columns={1}
              />
              <KnowledgeRelatedLinks
                title="Przewodniki"
                items={data.relatedGuides}
                columns={1}
              />
            </div>
          )}

          <KnowledgeRelatedLinks
            title="Czytaj dalej"
            items={data.relatedArticles}
          />

          <section aria-labelledby="sources-heading" className="space-y-3">
            <h2
              id="sources-heading"
              className="text-xl font-semibold tracking-tight"
            >
              Źródła i podstawa prawna
            </h2>
            <div className="grid gap-3 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <ShieldCheck
                      aria-hidden="true"
                      className="size-4 text-primary"
                    />
                    Oficjalne źródła
                  </CardTitle>
                  <CardDescription>
                    Sprawdzone w dniu podanym przy każdym odnośniku.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {data.sources.map((source) => (
                    <div
                      key={source.id}
                      className="rounded-lg border border-border/70 p-3 text-sm"
                    >
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge variant="outline">
                          {CONTENT_SOURCE_KIND_LABELS[source.kind]}
                        </Badge>
                        {source.isPrimary && (
                          <Badge variant="success">główne</Badge>
                        )}
                      </div>
                      <p className="mt-2 font-medium">{source.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {source.publisher}
                        {source.locator ? ` · ${source.locator}` : ""} ·
                        weryfikacja {formatDate(source.lastVerifiedAt)}
                        {source.accessedAt
                          ? ` · dostęp ${formatDate(source.accessedAt)}`
                          : ""}
                      </p>
                      {source.url && (
                        <a
                          href={source.url}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                        >
                          Otwórz źródło
                          <ExternalLink aria-hidden="true" className="size-3" />
                        </a>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Scale aria-hidden="true" className="size-4 text-primary" />
                    Podstawa prawna
                  </CardTitle>
                  <CardDescription>
                    Przepisy, na których opiera się artykuł.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {data.legalReferences.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Ten materiał nie powołuje konkretnego przepisu.
                    </p>
                  ) : (
                    data.legalReferences.map((reference) => (
                      <div
                        key={reference.id}
                        className="rounded-lg border border-border/70 p-3 text-sm"
                      >
                        <p className="font-mono text-xs font-semibold text-primary">
                          {reference.citation}
                        </p>
                        <p className="mt-1 font-medium">{reference.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {reference.actTitle}
                          {reference.locator ? ` · ${reference.locator}` : ""}
                        </p>
                        {reference.url && (
                          <a
                            href={reference.url}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                          >
                            Tekst aktu
                            <ExternalLink
                              aria-hidden="true"
                              className="size-3"
                            />
                          </a>
                        )}
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>
          </section>

          <Alert variant="info">
            <ShieldCheck aria-hidden="true" />
            <AlertTitle>Materiał informacyjny</AlertTitle>
            <AlertDescription>{LEGAL_DISCLOSURE}</AlertDescription>
          </Alert>
        </article>

        <aside className="space-y-4 lg:sticky lg:top-24">
          {toc.length > 0 && (
            <nav
              aria-labelledby="toc-heading"
              className="rounded-md border border-border/70 bg-card p-4"
            >
              <p
                id="toc-heading"
                className="text-xs font-semibold tracking-wide text-muted-foreground uppercase"
              >
                W tym artykule
              </p>
              <ul className="mt-2 space-y-1.5 text-sm">
                {toc.map((item) => (
                  <li key={item.id}>
                    <a
                      href={`#${item.id}`}
                      className="block rounded-md px-1 py-0.5 text-muted-foreground hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                    >
                      {item.text}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          )}

          <div className="rounded-md border border-border/70 bg-card p-4">
            <p className="text-sm font-medium">Sprawdź swoją sytuację</p>
            <p className="mt-1 text-xs text-pretty text-muted-foreground">
              Kalkulator porówna warianty, a asystent odpowie na dodatkowe
              pytanie z powołaniem na źródła.
            </p>
            <div className="mt-3 grid gap-2">
              <Button asChild size="sm">
                <Link href="/kalkulator">
                  <Calculator data-icon="inline-start" aria-hidden="true" />
                  Kalkulator
                </Link>
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link href={assistantHref}>
                  <MessagesSquare data-icon="inline-start" aria-hidden="true" />
                  Zapytaj asystenta
                </Link>
              </Button>
            </div>
          </div>

          <div className="rounded-md border border-border/70 bg-secondary/40 p-4 text-xs text-pretty text-muted-foreground">
            <p className="flex items-center gap-1.5 font-medium text-foreground">
              <FileText aria-hidden="true" className="size-3.5 text-primary" />
              {category.articleCount} artykułów w dziale
            </p>
            <Link
              href={`/wiedza/kategoria/${category.slug}`}
              className="mt-2 inline-flex items-center gap-1 font-medium text-primary hover:underline"
            >
              Wróć do działu
              <ArrowRight aria-hidden="true" className="size-3" />
            </Link>
          </div>
        </aside>
      </div>
    </div>
  )
}
