import type { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"
import {
  BookOpen,
  CircleHelp,
  ExternalLink,
  FileText,
  LibraryBig,
  ListChecks,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react"

import { CONTENT_TYPE_LABELS } from "@zpr/contracts/content"
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"
import { DbOffline } from "@/components/db-offline"
import { PageHeader } from "@/components/page-header"
import { StatCard } from "@/components/stat-card"
import { formatDate, formatNumber } from "@/lib/format"
import { statusLabels } from "@/messages/pl"
import { getAdminSession } from "@/server/auth/admin-session"
import {
  getAdminKnowledge,
  knowledgeHref,
  type AdminKnowledgeData,
} from "@/server/services/knowledge-center"
import { setContentStatusAction } from "./actions"

export const dynamic = "force-dynamic"

export const metadata: Metadata = { title: "Centrum wiedzy — administracja" }

function statusVariant(status: string) {
  if (status === "PUBLISHED") return "success" as const
  if (status === "IN_REVIEW") return "warning" as const
  if (status === "ARCHIVED") return "secondary" as const
  return "outline" as const
}

function isOverdue(value: string) {
  const reviewed = new Date(`${value}T00:00:00Z`).getTime()
  return Date.now() - reviewed > 180 * 24 * 60 * 60 * 1000
}

function AdminContent({ data }: { data: AdminKnowledgeData }) {
  return (
    <>
      <section aria-label="Statystyki Centrum wiedzy">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Artykuły"
            value={formatNumber(data.stats.articles)}
            hint="Opublikowane"
            icon={<BookOpen aria-hidden="true" className="size-4" />}
          />
          <StatCard
            label="FAQ"
            value={formatNumber(data.stats.faq)}
            hint="Pytania i odpowiedzi"
            icon={<CircleHelp aria-hidden="true" className="size-4" />}
          />
          <StatCard
            label="Dokumenty"
            value={formatNumber(data.stats.documents)}
            hint="Karty formularzy"
            icon={<FileText aria-hidden="true" className="size-4" />}
          />
          <StatCard
            label="Przewodniki"
            value={formatNumber(data.stats.guides)}
            hint="Procedury krok po kroku"
            icon={<ListChecks aria-hidden="true" className="size-4" />}
          />
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Kategorie"
          value={formatNumber(data.stats.categories)}
          hint="W tym dziewięć tematycznych"
          icon={<LibraryBig aria-hidden="true" className="size-4" />}
        />
        <StatCard
          label="Pojęcia"
          value={formatNumber(data.stats.glossary)}
          hint="Słownik"
          icon={<BookOpen aria-hidden="true" className="size-4" />}
        />
        <StatCard
          label="Źródła"
          value={formatNumber(data.stats.sources)}
          hint="Rejestr oficjalny"
          icon={<ShieldCheck aria-hidden="true" className="size-4" />}
        />
        <StatCard
          label="Do przeglądu"
          value={formatNumber(data.stats.reviewOverdue)}
          hint="Weryfikacja starsza niż 180 dni"
          icon={<TriangleAlert aria-hidden="true" className="size-4" />}
        />
      </div>

      <Alert variant="info">
        <ShieldCheck aria-hidden="true" />
        <AlertTitle>Kontrola publikacji</AlertTitle>
        <AlertDescription>
          Możesz ukryć lub opublikować materiał bez zmiany kodu. Treść i źródła
          są rekordami w schemacie <code>kb</code> (tabele{" "}
          <code>content_*</code>) — edycja tekstu odbywa się w bazie lub w
          Drizzle Studio, a publikacją steruje ten panel.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>Wszystkie materiały</CardTitle>
          <CardDescription>
            Ostatnie 60 rekordów. Kliknij tytuł, aby otworzyć materiał publicznie.
            „Do przeglądu” oznacza weryfikację starszą niż 180 dni.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">Typ</TableHead>
                <TableHead>Materiał</TableHead>
                <TableHead>Weryfikacja</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="pr-4 text-right">Akcja</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.rows.map((row) => (
                <TableRow key={`${row.type}-${row.slug}`}>
                  <TableCell className="pl-4">
                    <Badge variant="outline">
                      {CONTENT_TYPE_LABELS[row.type]}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-[26rem] whitespace-normal">
                    <Link
                      href={knowledgeHref(row.type, row.slug)}
                      className="inline-flex items-start gap-1 font-medium hover:text-primary hover:underline"
                    >
                      {row.title}
                      <ExternalLink
                        aria-hidden="true"
                        className="mt-0.5 size-3 shrink-0"
                      />
                    </Link>
                  </TableCell>
                  <TableCell>
                    <span className="flex flex-wrap items-center gap-1 text-muted-foreground">
                      {formatDate(row.lastReviewedAt)}
                      {isOverdue(row.lastReviewedAt) && (
                        <Badge variant="warning">przegląd</Badge>
                      )}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(row.status)}>
                      {(statusLabels as Record<string, string>)[row.status] ??
                        row.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="pr-4 text-right">
                    <form action={setContentStatusAction}>
                      <input type="hidden" name="type" value={row.type} />
                      <input type="hidden" name="slug" value={row.slug} />
                      <input
                        type="hidden"
                        name="status"
                        value={row.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED"}
                      />
                      <Button
                        type="submit"
                        size="sm"
                        variant={
                          row.status === "PUBLISHED" ? "outline" : "default"
                        }
                      >
                        {row.status === "PUBLISHED" ? "Ukryj" : "Opublikuj"}
                      </Button>
                    </form>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  )
}

export default async function AdminKnowledgePage() {
  const session = await getAdminSession()

  if (session.gateEnabled && !session.authenticated) {
    redirect("/admin/login?next=/admin/wiedza")
  }

  let data: AdminKnowledgeData

  try {
    data = await getAdminKnowledge()
  } catch (error) {
    return (
      <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-10 sm:px-6">
        <PageHeader
          eyebrow="Administracja"
          title="Centrum wiedzy"
          lead="Materiały są chwilowo niedostępne."
        />
        <DbOffline error={error} />
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-8 px-4 py-10 sm:px-6">
      <PageHeader
        eyebrow="Administracja · wiedza"
        title="Centrum wiedzy"
        lead="Rejestr treści, statusy publikacji, daty weryfikacji i szybkie ukrywanie materiałów. Panel działa w istniejącej bramce /admin."
        actions={
          <Button asChild variant="outline">
            <Link href="/wiedza">
              Otwórz publiczne centrum
              <ExternalLink data-icon="inline-end" aria-hidden="true" />
            </Link>
          </Button>
        }
      />

      <AdminContent data={data} />
    </div>
  )
}
