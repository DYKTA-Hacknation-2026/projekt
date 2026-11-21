import type { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"
import {
  BookOpen,
  Database,
  History,
  ListChecks,
  Plus,
  Scale,
  ShieldCheck,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"
import { AdminLogout } from "@/components/admin-logout"
import { DbOffline } from "@/components/db-offline"
import { PageHeader } from "@/components/page-header"
import { StatCard } from "@/components/stat-card"
import { formatDate, formatNumber } from "@/lib/format"
import { statusLabels } from "@/messages/pl"
import { getAdminSession } from "@/server/auth/admin-session"
import { getAdminData, type AdminData } from "@/server/services/admin"

export const dynamic = "force-dynamic"

export const metadata: Metadata = { title: "Panel administratora" }

type BadgeVariant =
  | "default"
  | "secondary"
  | "outline"
  | "destructive"
  | "success"
  | "warning"
  | "info"

function statusVariant(status: string): BadgeVariant {
  if (["VERIFIED", "INDEXED", "SUCCEEDED"].includes(status)) return "success"
  if (["UNVERIFIED", "PENDING", "RUNNING", "QUEUED"].includes(status)) {
    return "warning"
  }
  if (["FAILED", "ERROR"].includes(status)) return "destructive"
  return "secondary"
}

function statusLabel(status: string): string {
  return (statusLabels as Record<string, string>)[status] ?? status
}

function AdminContent({ data }: { data: AdminData }) {
  return (
    <>
      <section aria-label="Statystyki administracyjne">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Reguły"
            value={formatNumber(data.counts.rules)}
            hint="Aktywne wersje"
            icon={<Scale aria-hidden="true" className="size-4" />}
          />
          <StatCard
            label="Fragmenty KB"
            value={formatNumber(data.counts.chunks)}
            hint="Wektory i FTS"
            icon={<Database aria-hidden="true" className="size-4" />}
          />
          <StatCard
            label="Użytkownicy"
            value={formatNumber(data.counts.users)}
            hint="Konta demo i kreator"
            icon={<Users aria-hidden="true" className="size-4" />}
          />
          <StatCard
            label="Sprawy"
            value={formatNumber(data.counts.cases)}
            hint="Wszystkie statusy"
            icon={<ListChecks aria-hidden="true" className="size-4" />}
          />
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <Card>
          <CardHeader className="border-b border-border/70">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Scale aria-hidden="true" className="size-4 text-primary" />
                  Wersje reguł prawnych
                </CardTitle>
                <CardDescription>
                  Publikacja jest niezmienna. Nowa wersja wymaga nowego rekordu.
                </CardDescription>
              </div>
              <Button type="button" size="sm" variant="outline" disabled>
                <Plus aria-hidden="true" />
                Nowa wersja (etap 2)
              </Button>
            </div>
          </CardHeader>
          <CardContent className="px-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-4">Kod</TableHead>
                  <TableHead>Reguła</TableHead>
                  <TableHead>Wersja</TableHead>
                  <TableHead>Od</TableHead>
                  <TableHead className="pr-4">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.rules.map((rule) => (
                  <TableRow key={rule.id}>
                    <TableCell className="pl-4 font-mono text-xs">
                      {rule.code}
                    </TableCell>
                    <TableCell className="max-w-[16rem] whitespace-normal">
                      <p className="font-medium">{rule.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {rule.legalReference}
                      </p>
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {rule.version}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(rule.effectiveFrom)}
                    </TableCell>
                    <TableCell className="pr-4">
                      <Badge variant={statusVariant(rule.verificationStatus)}>
                        {statusLabel(rule.verificationStatus)}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database aria-hidden="true" className="size-4 text-primary" />
                Indeks wektorowy
              </CardTitle>
              <CardDescription>
                Jeden model aktywny; mieszanie wymiarów jest zablokowane.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {data.embeddingModel ? (
                <>
                  <Row label="Model" value={data.embeddingModel.name} />
                  <Row label="Dostawca" value={data.embeddingModel.provider} />
                  <Row
                    label="Wymiary"
                    value={String(data.embeddingModel.dimensions)}
                  />
                  <Badge variant="success">Aktywny model</Badge>
                </>
              ) : (
                <p className="text-muted-foreground">Brak modelu.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History aria-hidden="true" className="size-4 text-primary" />
                Ostatnie indeksowanie
              </CardTitle>
              <CardDescription>Joby i liczba fragmentów.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {data.jobs.map((job) => (
                <div
                  key={job.id}
                  className="flex items-start justify-between gap-2 rounded-lg border border-border/70 p-2.5 text-sm"
                >
                  <div>
                    <p className="line-clamp-1 font-medium">{job.documentTitle}</p>
                    <p className="text-xs text-muted-foreground">
                      {job.chunksCreated} fragmentów ·{" "}
                      {formatDate(job.createdAt)}
                    </p>
                  </div>
                  <Badge variant={statusVariant(job.status)}>
                    {statusLabel(job.status)}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen aria-hidden="true" className="size-4 text-primary" />
              Źródła wiedzy
            </CardTitle>
            <CardDescription>
              Dokumenty i fragmenty wykorzystywane przez asystenta.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-4">Źródło</TableHead>
                  <TableHead>Typ</TableHead>
                  <TableHead className="pr-4">Dokumenty</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.sources.map((source) => (
                  <TableRow key={source.id}>
                    <TableCell className="max-w-[20rem] pl-4 whitespace-normal">
                      <p className="font-medium">{source.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {source.publisher}
                      </p>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{source.sourceType}</Badge>
                    </TableCell>
                    <TableCell className="pr-4 tabular-nums">
                      {source.documentCount}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ListChecks aria-hidden="true" className="size-4 text-primary" />
              Dokumenty w indeksie
            </CardTitle>
            <CardDescription>
              Status indeksacji i liczba fragmentów.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-4">Dokument</TableHead>
                  <TableHead>Wersja</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="pr-4">Fragmenty</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.documents.map((document) => (
                  <TableRow key={document.id}>
                    <TableCell className="max-w-[18rem] pl-4 whitespace-normal">
                      <p className="font-medium">{document.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {document.sourceTitle}
                      </p>
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {document.version}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(document.status)}>
                        {statusLabel(document.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="pr-4 tabular-nums">
                      {document.chunkCount}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users aria-hidden="true" className="size-4 text-primary" />
            Konta demonstracyjne
          </CardTitle>
          <CardDescription>
            Role są sprawdzane w usługach; proxy tylko zgrubnie chroni /admin.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {data.users.map((user) => (
            <div
              key={user.id}
              className="rounded-lg border border-border/70 p-3 text-sm"
            >
              <p className="font-medium">{user.displayName}</p>
              <p className="text-xs break-all text-muted-foreground">
                {user.email}
              </p>
              <div className="mt-2 flex gap-1">
                <Badge variant="outline">{user.role}</Badge>
                {user.isDemo && <Badge variant="secondary">demo</Badge>}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono text-xs">{value}</span>
    </div>
  )
}

export default async function AdminPage() {
  const session = await getAdminSession()

  if (session.gateEnabled && !session.authenticated) {
    redirect("/admin/login?next=/admin")
  }

  let data: AdminData

  try {
    data = await getAdminData()
  } catch (error) {
    return (
      <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-10 sm:px-6">
        <PageHeader
          eyebrow="Administracja"
          title="Panel administratora"
          lead="Reguły, parametry, źródła wiedzy i joby indeksowania."
        />
        <DbOffline error={error} />
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-8 px-4 py-10 sm:px-6">
      <PageHeader
        eyebrow="Administracja"
        title="Panel administratora"
        lead="Szkielet operacyjny: podgląd wersji reguł, modeli embeddingów, źródeł i jobów. Zapis zmian jest przygotowany w schemacie, ale nie w tym etapie."
        actions={
          session.gateEnabled ? (
            <AdminLogout />
          ) : (
            <Badge variant="warning">Tryb demo bez logowania</Badge>
          )
        }
      />

      {!session.gateEnabled ? (
        <Alert variant="warning">
          <ShieldCheck aria-hidden="true" />
          <AlertTitle>Bramka wyłączona w demo</AlertTitle>
          <AlertDescription>
            <p>
              Aby przetestować logowanie i ciasteczko sesji, ustaw{" "}
              <code>ADMIN_GATE_ENABLED=true</code> w <code>.env</code> i użyj
              danych z <code>ADMIN_EMAIL</code> /{" "}
              <code>ADMIN_DEMO_PASSWORD</code>.{" "}
              <Link href="/admin/login" className="underline underline-offset-4">
                Otwórz ekran logowania
              </Link>
              .
            </p>
          </AlertDescription>
        </Alert>
      ) : (
        <Alert variant="success">
          <ShieldCheck aria-hidden="true" />
          <AlertTitle>Sesja administratora aktywna</AlertTitle>
          <AlertDescription>
            Ciasteczko HttpOnly, podpisane HMAC, wygasa po 8 godzinach.
          </AlertDescription>
        </Alert>
      )}

      <AdminContent data={data} />
    </div>
  )
}
