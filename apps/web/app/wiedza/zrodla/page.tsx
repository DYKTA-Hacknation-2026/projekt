import type { Metadata } from "next"
import { ExternalLink, Scale, ShieldCheck } from "lucide-react"

import {
  CONTENT_SOURCE_KIND_LABELS,
  type ContentSourceKind,
} from "@zpr/contracts/content"
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@workspace/ui/components/alert"
import { Badge } from "@workspace/ui/components/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { KnowledgeBreadcrumbs } from "@/components/knowledge/knowledge-breadcrumbs"
import { DbOffline } from "@/components/db-offline"
import { PageHeader } from "@/components/page-header"
import { formatDate } from "@/lib/format"
import { getSourcesPage } from "@/server/services/knowledge-center"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Źródła i podstawy prawne",
  description:
    "Rejestr oficjalnych źródeł Centrum wiedzy: ZUS, gov.pl, akty prawne. Data dostępu i weryfikacji przy każdej pozycji.",
}

export default async function KnowledgeSourcesPage() {
  let data

  try {
    data = await getSourcesPage()
  } catch (error) {
    return (
      <div className="page-shell space-y-6 py-10">
        <PageHeader
          eyebrow="Centrum wiedzy"
          title="Źródła i podstawy prawne"
          lead="Rejestr źródeł jest chwilowo niedostępny."
        />
        <DbOffline error={error} />
      </div>
    )
  }

  const grouped = new Map<ContentSourceKind, typeof data.sources>()
  for (const source of data.sources) {
    const bucket = grouped.get(source.kind) ?? []
    bucket.push(source)
    grouped.set(source.kind, bucket)
  }

  return (
    <div className="page-shell space-y-8 py-10">
      <KnowledgeBreadcrumbs items={[{ label: "Źródła" }]} />

      <PageHeader
        eyebrow="Wiarygodność"
        title="Źródła i podstawy prawne"
        lead="Nie tworzymy przepisów z domysłów. Każda informacja o prawach, terminach i obowiązkach ma wskazane źródło oraz datę weryfikacji."
      />

      <Alert variant="info">
        <ShieldCheck aria-hidden="true" />
        <AlertTitle>Jak czytać ten rejestr</AlertTitle>
        <AlertDescription>
          Data weryfikacji oznacza dzień, w którym redakcja sprawdziła treść
          źródła. To nie jest data wejścia w życie przepisu. Przy aktach
          prawnych zawsze sprawdź tekst jednolity i późniejsze nowelizacje.
        </AlertDescription>
      </Alert>

      <div className="grid gap-3 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Scale aria-hidden="true" className="size-4 text-primary" />
              Podstawa prawna
            </CardTitle>
            <CardDescription>
              Artykuły powołują konkretne jednostki redakcyjne: art., ust., §.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Kodeks pracy, ustawa zasiłkowa oraz rozporządzenia MRPiPS. Linki
            prowadzą do ISAP lub Dziennika Ustaw.
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldCheck aria-hidden="true" className="size-4 text-primary" />
              Materiały urzędowe
            </CardTitle>
            <CardDescription>
              ZUS, gov.pl i Ministerstwo Rodziny, Pracy i Polityki Społecznej.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Materiały urzędowe wyjaśniają praktykę, ale nie zastępują przepisów
            ani decyzji ZUS w indywidualnej sprawie.
          </CardContent>
        </Card>
      </div>

      {[...grouped.entries()].map(([kind, sources]) => (
        <section
          key={kind}
          aria-labelledby={`sources-${kind}`}
          className="space-y-3"
        >
          <h2
            id={`sources-${kind}`}
            className="text-lg font-semibold tracking-tight"
          >
            {CONTENT_SOURCE_KIND_LABELS[kind]}
          </h2>
          <ul className="space-y-2">
            {sources.map((source) => (
              <li
                key={source.id}
                className="rounded-lg border border-border/70 bg-card p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium text-pretty">{source.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {source.publisher}
                    </p>
                  </div>
                  <Badge variant="outline">
                    weryfikacja {formatDate(source.lastVerifiedAt)}
                  </Badge>
                </div>
                {source.description && (
                  <p className="mt-2 text-sm text-pretty text-muted-foreground">
                    {source.description}
                  </p>
                )}
                {source.url && (
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                  >
                    Otwórz źródło
                    <ExternalLink aria-hidden="true" className="size-3.5" />
                  </a>
                )}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
