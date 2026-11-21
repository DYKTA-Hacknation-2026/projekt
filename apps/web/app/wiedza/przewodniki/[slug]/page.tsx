import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import {
  ArrowRight,
  CalendarClock,
  CircleAlert,
  ClipboardList,
  ExternalLink,
  FileText,
  MapPin,
  ShieldCheck,
  Target,
  Users,
} from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@workspace/ui/components/alert"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { KnowledgeBreadcrumbs } from "@/components/knowledge/knowledge-breadcrumbs"
import { KnowledgeMeta } from "@/components/knowledge/knowledge-meta"
import { KnowledgeRelatedLinks } from "@/components/knowledge/knowledge-related-links"
import { DbOffline } from "@/components/db-offline"
import { formatDate } from "@/lib/format"
import { LEGAL_DISCLOSURE } from "@/messages/pl"
import { getGuideView } from "@/server/services/knowledge-center"

export const dynamic = "force-dynamic"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  try {
    const data = await getGuideView(slug)
    return {
      title: data?.guide.title ?? "Przewodnik",
      description: data?.guide.summary,
    }
  } catch {
    return { title: "Przewodnik" }
  }
}

export default async function KnowledgeGuidePage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  let data

  try {
    data = await getGuideView(slug)
  } catch (error) {
    return (
      <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-10 sm:px-6">
        <p className="text-sm text-muted-foreground">Przewodnik</p>
        <DbOffline error={error} />
      </div>
    )
  }

  if (!data) notFound()

  const { guide, category } = data

  return (
    <div className="mx-auto w-full max-w-6xl space-y-8 px-4 py-8 sm:px-6">
      <KnowledgeBreadcrumbs
        items={[
          { href: "/wiedza/przewodniki", label: "Przewodniki" },
          { href: `/wiedza/kategoria/${category.slug}`, label: category.title },
          { label: guide.title },
        ]}
      />

      <header className="max-w-3xl space-y-4 border-b border-border/70 pb-8">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="gap-1">
            <ClipboardList aria-hidden="true" />
            Przewodnik
          </Badge>
          <Badge variant="outline">{category.title}</Badge>
        </div>
        <h1 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
          {guide.title}
        </h1>
        <p className="text-lg text-pretty text-muted-foreground">
          {guide.summary}
        </p>
        <KnowledgeMeta lastReviewedAt={guide.lastReviewedAt} />
      </header>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-start">
        <div className="min-w-0 space-y-6">
          <div className="grid gap-3 sm:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Target aria-hidden="true" className="size-4 text-primary" />
                  Cel procedury
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm leading-6 text-pretty text-muted-foreground">
                {guide.summary}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Users aria-hidden="true" className="size-4 text-primary" />
                  Kogo dotyczy
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm leading-6 text-pretty text-muted-foreground">
                {guide.audience}
              </CardContent>
            </Card>
          </div>

          {guide.conditions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <ShieldCheck
                    aria-hidden="true"
                    className="size-4 text-primary"
                  />
                  Wymagane warunki
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="list-disc space-y-2 pl-5 text-sm leading-6">
                  {guide.conditions.map((condition) => (
                    <li key={condition}>{condition}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {guide.documents.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <FileText aria-hidden="true" className="size-4 text-primary" />
                  Dokumenty
                </CardTitle>
                <CardDescription>
                  Kliknij dokument, aby zobaczyć kartę informacyjną.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="grid gap-2 sm:grid-cols-2">
                  {guide.documents.map((document) => (
                    <li key={document.label}>
                      {document.slug ? (
                        <Link
                          href={`/wiedza/dokumenty/${document.slug}`}
                          className="group flex items-center justify-between gap-2 rounded-lg border border-border/70 p-2.5 text-sm transition-colors hover:border-primary/40 hover:bg-primary/[0.02]"
                        >
                          <span className="font-medium group-hover:text-primary">
                            {document.label}
                          </span>
                          <ArrowRight
                            aria-hidden="true"
                            className="size-3.5 shrink-0 text-muted-foreground"
                          />
                        </Link>
                      ) : (
                        <span className="block rounded-lg border border-border/70 p-2.5 text-sm">
                          {document.label}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          <section aria-labelledby="steps-heading" className="space-y-3">
            <h2
              id="steps-heading"
              className="text-xl font-semibold tracking-tight"
            >
              Kolejne kroki
            </h2>
            <ol className="space-y-3">
              {guide.steps.map((step, index) => (
                <li
                  key={`${step.title}-${index}`}
                  className="flex gap-3 rounded-xl border border-border/70 bg-card p-4"
                >
                  <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary/10 font-mono text-sm font-semibold text-primary">
                    {index + 1}
                  </span>
                  <div className="min-w-0 space-y-1">
                    <p className="font-semibold text-pretty">{step.title}</p>
                    <p className="text-sm leading-6 text-pretty text-muted-foreground">
                      {step.description}
                    </p>
                    {step.tip && (
                      <p className="rounded-lg bg-secondary/60 px-2.5 py-1.5 text-xs text-pretty">
                        <span className="font-medium">Wskazówka: </span>
                        {step.tip}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          </section>

          <div className="grid gap-3 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <CalendarClock
                    aria-hidden="true"
                    className="size-4 text-primary"
                  />
                  Ważne terminy
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="list-disc space-y-2 pl-5 text-sm leading-6">
                  {guide.deadlines.map((deadline) => (
                    <li key={deadline}>{deadline}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <MapPin aria-hidden="true" className="size-4 text-primary" />
                  Gdzie złożyć
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="list-disc space-y-2 pl-5 text-sm leading-6">
                  {guide.places.map((place) => (
                    <li key={place}>{place}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>

          {guide.problems.length > 0 && (
            <section aria-labelledby="problems-heading" className="space-y-3">
              <h2
                id="problems-heading"
                className="text-xl font-semibold tracking-tight"
              >
                Typowe problemy i wyjątki
              </h2>
              <div className="divide-y divide-border/70 overflow-hidden rounded-xl border border-border/70 bg-card">
                {guide.problems.map((item) => (
                  <details key={item.problem} className="group">
                    <summary className="flex cursor-pointer list-none items-start gap-2 p-4 text-sm font-medium hover:bg-muted/50 [&::-webkit-details-marker]:hidden">
                      <CircleAlert
                        aria-hidden="true"
                        className="mt-0.5 size-4 shrink-0 text-warning"
                      />
                      <span className="flex-1">{item.problem}</span>
                      <span
                        aria-hidden="true"
                        className="text-lg leading-none text-muted-foreground transition-transform group-open:rotate-45"
                      >
                        +
                      </span>
                    </summary>
                    <p className="border-t border-border/50 px-4 py-3 pl-10 text-sm leading-6 text-pretty text-muted-foreground">
                      {item.solution}
                    </p>
                  </details>
                ))}
              </div>
            </section>
          )}

          <KnowledgeRelatedLinks
            items={data.related}
            title="Powiązane materiały"
          />

          {data.sources.length > 0 && (
            <section aria-labelledby="guide-sources" className="space-y-3">
              <h2
                id="guide-sources"
                className="text-xl font-semibold tracking-tight"
              >
                Źródła
              </h2>
              <ul className="grid gap-2 sm:grid-cols-2">
                {data.sources.map((source) => (
                  <li
                    key={source.id}
                    className="rounded-lg border border-border/70 bg-card p-3 text-sm"
                  >
                    <p className="font-medium">{source.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {source.publisher} · weryfikacja{" "}
                      {formatDate(source.lastVerifiedAt)}
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
                  </li>
                ))}
              </ul>
            </section>
          )}

          <Alert variant="info">
            <ShieldCheck aria-hidden="true" />
            <AlertTitle>Materiał informacyjny</AlertTitle>
            <AlertDescription>{LEGAL_DISCLOSURE}</AlertDescription>
          </Alert>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24">
          <div className="rounded-xl border border-primary/20 bg-primary/[0.04] p-4">
            <p className="text-sm font-medium">Skrót</p>
            <ul className="mt-2 space-y-1.5 text-xs text-muted-foreground">
              <li>{guide.steps.length} kroków</li>
              <li>{guide.documents.length} dokumentów</li>
              <li>{guide.deadlines.length} terminów</li>
            </ul>
            {guide.calculatorHref && (
              <Button asChild className="mt-3 w-full" size="sm">
                <Link href={guide.calculatorHref}>
                  Otwórz kalkulator
                  <ArrowRight data-icon="inline-end" aria-hidden="true" />
                </Link>
              </Button>
            )}
          </div>
          <div className="rounded-xl border border-border/70 bg-secondary/40 p-4 text-xs text-muted-foreground">
            <p className="font-medium text-foreground">Ostatnia weryfikacja</p>
            <p className="mt-1">{formatDate(guide.lastReviewedAt)}</p>
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
