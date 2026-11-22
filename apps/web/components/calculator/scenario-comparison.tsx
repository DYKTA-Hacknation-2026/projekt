"use client"

import { AlertTriangle, GitCompareArrows, Info } from "lucide-react"

import type { CalculatorComparison } from "@zpr/domain"
import { Alert, AlertDescription, AlertTitle } from "@workspace/ui/components/alert"
import { Badge } from "@workspace/ui/components/badge"
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
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"
import { formatPln } from "@/lib/format"

function statusLabel(status: "COMPLETE" | "PARTIAL" | "MANUAL_REVIEW"): {
  label: string
  variant: "success" | "warning" | "destructive"
} {
  if (status === "COMPLETE") return { label: "kompletny", variant: "success" }
  if (status === "PARTIAL") return { label: "częściowy", variant: "warning" }
  return { label: "wymaga analizy", variant: "destructive" }
}

export function ScenarioComparisonView({
  comparison,
}: {
  comparison: CalculatorComparison
}) {
  const historical = comparison.outcomes.some(
    (outcome) => outcome.result.historicalSimulation
  )
  const earliest = comparison.outcomes[0]?.result.earliestSupportedDate

  if (historical) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle
              aria-hidden="true"
              className="size-4 text-destructive"
            />
            Nie porównujemy wariantów dla tego okresu
          </CardTitle>
          <CardDescription>
            Dla sprawy sprzed {earliest ?? "1.07.2026"} nie mamy przepisów,
            więc nie pokazujemy kwot ani różnic między wariantami.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertTriangle aria-hidden="true" />
            <AlertTitle>Brak danych prawnych dla tego okresu</AlertTitle>
            <AlertDescription>
              To nie jest odmowa ani przyznanie świadczenia. Sprawdź
              uprawnienia bezpośrednio w ZUS.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <GitCompareArrows aria-hidden="true" className="size-4 text-primary" />
          Porównanie wariantów
        </CardTitle>
        <CardDescription>
          Warianty liczy ten sam silnik co wynik główny. Różnice dotyczą tylko
          podziału urlopu rodzicielskiego.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 px-0">
        <div className="grid gap-4 px-6 xl:grid-cols-3">
          {comparison.outcomes.map((outcome, index) => {
            const status = statusLabel(outcome.result.analysis.status)
            return (
              <div
                key={outcome.id}
                className="space-y-2 rounded-lg border border-border/70 p-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium">{outcome.name}</p>
                  <Badge variant={status.variant}>{status.label}</Badge>
                </div>
                <p className="text-xs text-pretty text-muted-foreground">
                  {outcome.description}
                </p>
                <p className="text-xl font-semibold tabular-nums">
                  {outcome.result.analysis.totalGrosze === null
                    ? "Nie wyliczono"
                    : formatPln(outcome.result.analysis.totalGrosze)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {index === 0
                    ? "wariant odniesienia"
                    : outcome.differenceGrosze === null
                      ? "różnicy nie można wyliczyć"
                      : `${outcome.differenceGrosze >= 0 ? "+" : ""}${formatPln(
                          outcome.differenceGrosze
                        )} względem wariantu A`}
                </p>
                <dl className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <dt className="text-muted-foreground">Mama</dt>
                    <dd className="font-medium">
                      {outcome.result.maternityWeeks} tyg. mac. +{" "}
                      {outcome.result.motherParentalWeeks} tyg. rodz.
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Tata</dt>
                    <dd className="font-medium">
                      {outcome.result.secondParentWeeks} tyg. rodz.
                      {outcome.result.paternityDays > 0
                        ? ` + ${outcome.result.paternityDays} dni`
                        : ""}
                    </dd>
                  </div>
                </dl>
                {outcome.result.warnings.length > 0 && (
                  <p className="text-xs text-pretty text-muted-foreground">
                    {outcome.result.warnings[0]}
                  </p>
                )}
              </div>
            )
          })}
        </div>

        <div className="px-4">
          <Table>
            <TableCaption className="sr-only">
              Zestawienie kwot i wymiarów urlopu w wariantach
            </TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-0">Wariant</TableHead>
                <TableHead>Status analizy</TableHead>
                <TableHead>Podział</TableHead>
                <TableHead className="text-right">Kwota</TableHead>
                <TableHead className="pr-0 text-right">Różnica</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {comparison.outcomes.map((outcome, index) => {
                const status = statusLabel(outcome.result.analysis.status)
                return (
                  <TableRow key={outcome.id}>
                    <TableCell className="pl-0 font-medium whitespace-normal">
                      {outcome.name}
                    </TableCell>
                    <TableCell>
                      <Badge variant={status.variant}>{status.label}</Badge>
                    </TableCell>
                    <TableCell className="whitespace-normal text-muted-foreground">
                      Mama {outcome.result.motherParentalWeeks} tyg. · Tata{" "}
                      {outcome.result.secondParentWeeks} tyg. · Tata{" "}
                      {outcome.result.paternityDays} dni ojcowskiego
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums">
                      {outcome.result.analysis.totalGrosze === null
                        ? "—"
                        : formatPln(outcome.result.analysis.totalGrosze)}
                    </TableCell>
                    <TableCell className="pr-0 text-right tabular-nums">
                      {index === 0
                        ? "—"
                        : outcome.differenceGrosze === null
                          ? "—"
                          : `${outcome.differenceGrosze >= 0 ? "+" : ""}${formatPln(
                              outcome.differenceGrosze
                            )}`}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>

        <div className="px-4">
          <Alert variant="info">
            <Info aria-hidden="true" />
            <AlertTitle>Jak czytać porównanie</AlertTitle>
            <AlertDescription>
              <ul className="list-disc space-y-1 pl-4">
                {comparison.notes.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        </div>
      </CardContent>
    </Card>
  )
}
