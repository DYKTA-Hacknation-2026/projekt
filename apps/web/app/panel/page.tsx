import type { Metadata } from "next"
import Link from "next/link"
import {
  ArrowRight,
  BookOpen,
  Calculator,
  Database,
  FileText,
  Gauge,
  Scale,
  Users,
} from "lucide-react"

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
import { formatDate, formatNumber, formatPln } from "@/lib/format"
import { dashboard, statusLabels } from "@/messages/pl"
import {
  getDashboardData,
  type DashboardData,
} from "@/server/services/dashboard"

export const dynamic = "force-dynamic"

export const metadata: Metadata = { title: "Panel sprawy" }

type BadgeVariant =
  | "default"
  | "secondary"
  | "outline"
  | "destructive"
  | "success"
  | "warning"
  | "info"

function statusVariant(status: string): BadgeVariant {
  if (["READY", "OK", "VERIFIED", "INDEXED", "SUCCEEDED"].includes(status)) {
    return "success"
  }
  if (
    ["IN_REVIEW", "INDETERMINATE", "UNVERIFIED", "PENDING", "RUNNING"].includes(
      status
    )
  ) {
    return "warning"
  }
  if (["ERROR", "FAILED", "CLOSED"].includes(status)) return "destructive"
  return "secondary"
}

function statusLabel(status: string): string {
  return (statusLabels as Record<string, string>)[status] ?? status
}

function CasesTable({ data }: { data: DashboardData }) {
  return (
    <Card>
      <CardHeader className="border-b border-border/70">
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle>Sprawy demonstracyjne</CardTitle>
            <CardDescription>
              Syntetyczne osoby i ich scenariusze z dokumentacji.
            </CardDescription>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href="/start">
              Nowa sprawa
              <ArrowRight data-icon="inline-end" aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="px-0">
        {data.cases.length === 0 ? (
          <p className="px-4 py-8 text-sm text-muted-foreground">
            Brak spraw. Uruchom seed bazy danych.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">Numer</TableHead>
                <TableHead>Sprawa</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Termin</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.cases.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="pl-4 font-mono text-xs">
                    {item.caseNumber}
                  </TableCell>
                  <TableCell className="max-w-[22rem] whitespace-normal">
                    <p className="font-medium">{item.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.ownerName}
                    </p>
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(item.status)}>
                      {statusLabel(item.status)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(item.dueDate)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}

export default async function PanelPage() {
  let data: DashboardData

  try {
    data = await getDashboardData()
  } catch (error) {
    return (
      <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-10 sm:px-6">
        <PageHeader
          eyebrow="Panel"
          title={dashboard.title}
          lead={dashboard.lead}
        />
        <DbOffline error={error} />
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-8 px-4 py-10 sm:px-6">
      <PageHeader
        eyebrow="Panel"
        title={dashboard.title}
        lead={dashboard.lead}
        actions={
          <>
            <Button asChild variant="outline">
              <Link href="/kalkulator">
                <Calculator data-icon="inline-start" aria-hidden="true" />
                Kalkulator
              </Link>
            </Button>
            <Button asChild>
              <Link href="/os-czasu">
                Oś czasu
                <ArrowRight data-icon="inline-end" aria-hidden="true" />
              </Link>
            </Button>
          </>
        }
      />

      <section aria-label="Statystyki danych">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <StatCard
            label="Użytkownicy"
            value={formatNumber(data.stats.users)}
            hint="Konta demo i sprawy"
            icon={<Users aria-hidden="true" className="size-4" />}
          />
          <StatCard
            label="Sprawy"
            value={formatNumber(data.stats.cases)}
            hint="Aktywne i zamknięte"
            icon={<FileText aria-hidden="true" className="size-4" />}
          />
          <StatCard
            label="Obliczenia"
            value={formatNumber(data.stats.calculations)}
            hint="Zapisane z wersją silnika"
            icon={<Gauge aria-hidden="true" className="size-4" />}
          />
          <StatCard
            label="Reguły prawne"
            value={formatNumber(data.stats.rules)}
            hint="Aktywne wersje"
            icon={<Scale aria-hidden="true" className="size-4" />}
          />
          <StatCard
            label="Fragmenty wiedzy"
            value={formatNumber(data.stats.chunks)}
            hint="Wektory + full-text"
            icon={<Database aria-hidden="true" className="size-4" />}
          />
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <CasesTable data={data} />

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database aria-hidden="true" className="size-4 text-primary" />
                Model embeddingów
              </CardTitle>
              <CardDescription>
                Wymiary muszą odpowiadać wektorom w bazie.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {data.embeddingModel ? (
                <>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-muted-foreground">Model</span>
                    <span className="font-mono text-xs">
                      {data.embeddingModel.name}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-muted-foreground">Dostawca</span>
                    <span>{data.embeddingModel.provider}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-muted-foreground">Wymiary</span>
                    <span className="font-mono text-xs tabular-nums">
                      {data.embeddingModel.dimensions}
                    </span>
                  </div>
                  <Badge variant="success">Aktywny</Badge>
                </>
              ) : (
                <p className="text-muted-foreground">
                  Brak aktywnego modelu. Uruchom seed.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen aria-hidden="true" className="size-4 text-primary" />
                Źródła wiedzy
              </CardTitle>
              <CardDescription>Podstawa odpowiedzi asystenta.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {data.sources.map((source) => (
                <div
                  key={source.id}
                  className="flex items-start justify-between gap-3 rounded-lg border border-border/70 p-2.5 text-sm"
                >
                  <div>
                    <p className="font-medium">{source.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {source.publisher} · {source.documentCount} dok.
                    </p>
                  </div>
                  <Badge variant="outline">{source.sourceType}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Ostatnie obliczenia</CardTitle>
            <CardDescription>
              Każdy wynik przechowuje wejście, wersję i ślad reguł.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-0">
            {data.calculations.length === 0 ? (
              <p className="px-4 py-6 text-sm text-muted-foreground">
                Brak obliczeń. Otwórz kalkulator.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-4">Kwota</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Silnik</TableHead>
                    <TableHead>Data</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.calculations.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="pl-4 font-medium tabular-nums">
                        {formatPln(item.totalAmountGrosze)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusVariant(item.status)}>
                          {statusLabel(item.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {item.engineVersion}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(item.createdAt)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Aktywne reguły</CardTitle>
            <CardDescription>
              Wersje i status weryfikacji parametrów.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-4">Kod</TableHead>
                  <TableHead>Reguła</TableHead>
                  <TableHead>Weryfikacja</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.rules.map((rule) => (
                  <TableRow key={rule.id}>
                    <TableCell className="pl-4 font-mono text-xs">
                      {rule.code}
                    </TableCell>
                    <TableCell className="max-w-[15rem] whitespace-normal">
                      <p className="font-medium">{rule.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {rule.legalReference} · {rule.version}
                      </p>
                    </TableCell>
                    <TableCell>
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
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Osoby demonstracyjne</CardTitle>
          <CardDescription>
            Wszystkie dane są syntetyczne. E-maile używają domeny .test.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {data.demoUsers.map((user) => (
            <div
              key={user.id}
              className="rounded-lg border border-border/70 p-3 text-sm"
            >
              <p className="font-medium">{user.displayName}</p>
              <p className="text-xs break-all text-muted-foreground">
                {user.email}
              </p>
              <Badge variant="outline" className="mt-2">
                {user.role}
              </Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
