import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import {
  ArrowRight,
  ClipboardCheck,
  ExternalLink,
  FileText,
  Info,
  ListChecks,
  Send,
  UserRound,
} from "lucide-react"

import { DOCUMENT_KIND_LABELS, type DocumentKind } from "@zpr/contracts/content"
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
import { KnowledgeBreadcrumbs } from "@/components/knowledge/knowledge-breadcrumbs"
import { KnowledgeMeta } from "@/components/knowledge/knowledge-meta"
import { KnowledgeRelatedLinks } from "@/components/knowledge/knowledge-related-links"
import { documentKindVariant } from "@/components/knowledge/knowledge-document-card"
import { DbOffline } from "@/components/db-offline"
import { formatDate } from "@/lib/format"
import { getDocumentView } from "@/server/services/knowledge-center"

export const dynamic = "force-dynamic"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  try {
    const data = await getDocumentView(slug)
    return {
      title: data?.document.name ?? "Dokument",
      description: data?.document.purpose,
    }
  } catch {
    return { title: "Dokument" }
  }
}

function kindNote(kind: DocumentKind) {
  if (kind === "DEMO") {
    return "To materiał demonstracyjny, a nie oficjalny formularz ZUS. Wzór wniosku ustala pracodawca."
  }
  if (kind === "CERTIFICATE") {
    return "To zaświadczenie, nie wniosek. Sprawdź, kto je wystawia, zanim zaczniesz go wypełniać."
  }
  if (kind === "ATTACHMENT") {
    return "To dokument dodatkowy. Nie zastępuje wniosku — jest do niego dołączany."
  }
  return "To formularz. Pobierz aktualny wzór z oficjalnego źródła i sprawdź wersję przed złożeniem."
}

export default async function KnowledgeDocumentPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  let data

  try {
    data = await getDocumentView(slug)
  } catch (error) {
    return (
      <div className="page-shell space-y-6 py-10">
        <p className="text-sm text-muted-foreground">Dokument</p>
        <DbOffline error={error} />
      </div>
    )
  }

  if (!data) notFound()

  const { document, category } = data
  const withdrawn = document.slug === "zaswiadczenie-z-3b"

  return (
    <div className="page-shell space-y-8 py-10">
      <KnowledgeBreadcrumbs
        items={[
          { href: "/wiedza/dokumenty", label: "Dokumenty i formularze" },
          { label: document.code ?? document.name },
        ]}
      />

      <header className="max-w-3xl space-y-4 border-b border-border/70 pb-8">
        <div className="flex flex-wrap items-center gap-2">
          {document.code && (
            <span className="rounded-md border border-primary/30 bg-primary/10 px-2.5 py-1 font-mono text-sm font-semibold text-primary">
              {document.code}
            </span>
          )}
          <Badge variant={documentKindVariant(document.kind)}>
            {DOCUMENT_KIND_LABELS[document.kind]}
          </Badge>
          <Badge variant="outline">{category.title}</Badge>
          {withdrawn && <Badge variant="destructive">Wycofany</Badge>}
        </div>
        <h1 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
          {document.name}
        </h1>
        <p className="text-lg text-pretty text-muted-foreground">
          {document.purpose}
        </p>
        <KnowledgeMeta lastReviewedAt={document.lastReviewedAt} />
      </header>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_19rem] lg:items-start">
        <div className="min-w-0 space-y-6">
          {document.note && (
            <Alert variant={withdrawn ? "destructive" : "warning"}>
              <Info aria-hidden="true" />
              <AlertTitle>
                {withdrawn ? "Nie składaj tego formularza" : "Ważna informacja"}
              </AlertTitle>
              <AlertDescription>{document.note}</AlertDescription>
            </Alert>
          )}

          <section aria-labelledby="when-heading">
            <Card>
              <CardHeader>
                <CardTitle
                  id="when-heading"
                  className="flex items-center gap-2 text-base"
                >
                  <ClipboardCheck
                    aria-hidden="true"
                    className="size-4 text-primary"
                  />
                  Kiedy jest potrzebny
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm leading-6 text-pretty">
                {document.whenRequired}
              </CardContent>
            </Card>
          </section>

          <div className="grid gap-3 sm:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <UserRound
                    aria-hidden="true"
                    className="size-4 text-primary"
                  />
                  Kto wypełnia
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm leading-6 text-pretty text-muted-foreground">
                {document.filledBy}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Send aria-hidden="true" className="size-4 text-primary" />
                  Kto składa
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm leading-6 text-pretty text-muted-foreground">
                {document.submittedBy}
              </CardContent>
            </Card>
          </div>

          <section aria-labelledby="information-heading">
            <Card>
              <CardHeader>
                <CardTitle
                  id="information-heading"
                  className="flex items-center gap-2 text-base"
                >
                  <ListChecks
                    aria-hidden="true"
                    className="size-4 text-primary"
                  />
                  Jakie informacje przygotować
                </CardTitle>
                <CardDescription>
                  Zbierz je wcześniej, aby uniknąć uzupełnień.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="list-disc space-y-2 pl-5 text-sm leading-6">
                  {document.informationNeeded.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </section>

          <section aria-labelledby="additional-heading">
            <Card>
              <CardHeader>
                <CardTitle
                  id="additional-heading"
                  className="flex items-center gap-2 text-base"
                >
                  <FileText
                    aria-hidden="true"
                    className="size-4 text-primary"
                  />
                  Dokumenty dodatkowe
                </CardTitle>
              </CardHeader>
              <CardContent>
                {document.additionalDocuments.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Brak dodatkowych dokumentów.
                  </p>
                ) : (
                  <ul className="list-disc space-y-2 pl-5 text-sm leading-6">
                    {document.additionalDocuments.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </section>

          <section aria-labelledby="channels-heading">
            <Card>
              <CardHeader>
                <CardTitle
                  id="channels-heading"
                  className="flex items-center gap-2 text-base"
                >
                  <Send aria-hidden="true" className="size-4 text-primary" />
                  Gdzie można złożyć
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="list-disc space-y-2 pl-5 text-sm leading-6">
                  {document.submissionChannels.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </section>

          <KnowledgeRelatedLinks
            items={data.related}
            title="Powiązane materiały i instrukcje"
          />
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24">
          <div className="rounded-md border border-primary/20 bg-primary/[0.04] p-4">
            <p className="text-xs font-semibold tracking-wide text-primary uppercase">
              Oficjalny wzór
            </p>
            <p className="mt-1 text-sm text-pretty text-muted-foreground">
              {kindNote(document.kind)}
            </p>
            {document.officialUrl && (
              <Button asChild className="mt-3 w-full" size="sm">
                <a href={document.officialUrl} target="_blank" rel="noreferrer">
                  <ExternalLink data-icon="inline-start" aria-hidden="true" />
                  Otwórz oficjalny wzór
                </a>
              </Button>
            )}
            {document.officialSourceLabel && (
              <p className="mt-2 text-xs text-muted-foreground">
                {document.officialSourceLabel}
              </p>
            )}
          </div>

          {document.generatorHref && (
            <div className="rounded-md border border-border/70 bg-card p-4">
              <p className="text-sm font-medium">Zrób kolejny krok</p>
              <p className="mt-1 text-xs text-pretty text-muted-foreground">
                {document.generatorLabel ??
                  "Otwórz powiązane narzędzie w aplikacji."}
              </p>
              <Button
                asChild
                variant="outline"
                className="mt-3 w-full"
                size="sm"
              >
                <Link href={document.generatorHref}>
                  {document.generatorLabel ?? "Otwórz narzędzie"}
                  <ArrowRight data-icon="inline-end" aria-hidden="true" />
                </Link>
              </Button>
            </div>
          )}

          <div className="rounded-md border border-border/70 bg-secondary/40 p-4 text-xs text-muted-foreground">
            <p className="font-medium text-foreground">Weryfikacja karty</p>
            <p className="mt-1">
              {formatDate(document.lastReviewedAt)} · źródło:{" "}
              {document.officialSourceLabel ?? "ZUS"}
            </p>
            <p className="mt-2 text-pretty">
              Karta informacyjna nie zastępuje instrukcji na formularzu. Zawsze
              sprawdź aktualną wersję druku.
            </p>
          </div>
        </aside>
      </div>
    </div>
  )
}
