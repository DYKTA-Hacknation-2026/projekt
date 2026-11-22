"use client"

import Link from "next/link"
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  FileQuestion,
  Info,
  Scale,
  ShieldAlert,
  Sparkles,
  Wallet,
} from "lucide-react"

import type { CalculatorResult } from "@zpr/domain"
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
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"
import { formatDate, formatPln, formatPercent } from "@/lib/format"
import { storeCalculatorPrefill } from "@/lib/calculator-prefill"

import type { CalculationResponseBody } from "./types"

const ANALYSIS_STATUS = {
  COMPLETE: {
    label: "Analiza kompletna",
    variant: "success" as const,
    text: "Dostępne dane pozwalają na pełne obliczenie w zakresie obsługiwanym przez ten silnik.",
  },
  PARTIAL: {
    label: "Analiza częściowa",
    variant: "warning" as const,
    text: "Część informacji jest nieznana albo kwota nie może zostać wyliczona. Uzupełnij braki, aby poprawić wynik.",
  },
  MANUAL_REVIEW: {
    label: "Wymaga ręcznej analizy",
    variant: "destructive" as const,
    text: "Sprawa zawiera dane niespójne lub sytuację, której silnik nie rozstrzyga sam. Nie traktuj kwoty jako decyzji ZUS.",
  },
} as const

const AMOUNT_STATUS_NOTE: Partial<Record<string, string>> = {
  CALCULATED_LOWER_BOUND:
    "Kwota może być zaniżona: brakuje zatwierdzonej kwoty świadczenia rodzicielskiego albo minimalnego wynagrodzenia (Q-29).",
  CALCULATED_UPPER_BOUND:
    "Kwota może być zawyżona: brakuje zatwierdzonego limitu zewnętrznego (Q-29).",
  BASIS_UNKNOWN:
    "Silnik nie ma podstawy wymiaru, więc nie wyliczył kwoty. Nie podstawiamy wartości zastępczej.",
  NOT_CALCULATED:
    "Silnik nie wyliczył kwoty dla tej sytuacji. Sprawdź braki i informacje o ręcznej analizie.",
}

function formatWeeks(value: number): string {
  const rounded = Math.round(value * 10) / 10
  return `${rounded}`.replace(".", ",") + " tyg."
}

function periodText(weeks: number, days: number): string {
  if (days <= 0) return "—"
  return weeks > 0 && weeks * 7 === days
    ? `${weeks} tyg. (${days} dni)`
    : weeks > 0
      ? `${weeks} tyg. ${days - weeks * 7} dni (${days} dni)`
      : `${days} dni`
}

function assistantQuestion(result: CalculatorResult): string {
  const total = result.analysis.totalGrosze
  const weeks =
    result.maternityWeeks + result.motherParentalWeeks + result.secondParentWeeks
  const amount = total === null ? "kwota nie została wyliczona" : formatPln(total)
  const missing =
    result.analysis.missingEvidence.length > 0
      ? ` Brakuje mi: ${result.analysis.missingEvidence
          .map((item) => item.question)
          .join("; ")}.`
      : ""
  return `Wyjaśnij mi wynik kalkulatora ZPR: ${amount}, około ${formatWeeks(
    weeks
  )} urlopu. Status silnika: ${result.analysis.status}.${missing} Nie zmieniaj obliczeń — pomóż mi zrozumieć założenia, pojęcia i to, jakie dokumenty przygotować.`
}

export function CalculatorResultView({
  data,
  onAdvanced,
  advancedLabel = "Doprecyzuj w trybie zaawansowanym",
}: {
  data: CalculationResponseBody
  onAdvanced?: () => void
  advancedLabel?: string
}) {
  const result = data.result
  const analysis = result.analysis
  const eventDate = result.input.birthDate ?? result.input.placementDate
  const historical = result.historicalSimulation
  const historicalMessage = `Twoja data (${formatDate(eventDate)}) jest sprzed ${formatDate(result.earliestSupportedDate)}. Aplikacja nie ma przepisów obowiązujących wtedy, więc nie oceniamy tej sprawy według prawa, które obowiązywało w dniu zdarzenia. To nie jest decyzja ZUS, przyznanie ani odmowa świadczenia. Sprawdź uprawnienia bezpośrednio w ZUS.`
  const status = historical
    ? {
        label: "Symulacja obecnych przepisów",
        variant: "warning" as const,
        text: "To nie jest analiza prawa obowiązującego w dniu Twojego zdarzenia.",
      }
    : ANALYSIS_STATUS[analysis.status]
  const total = analysis.totalGrosze
  const missing = analysis.missingEvidence
  const unverifiedParams =
    !result.ruleSetVerified ||
    result.ruleSetUnverified.length > 0 ||
    /Q-15|Q-29/.test(result.warnings.join(" "))
  const visibleWarnings = result.warnings.filter(
    (warning) => !warning.startsWith("Brakuje:")
  )

  if (historical) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle
              aria-hidden="true"
              className="size-4 text-destructive"
            />
            Nie oceniamy spraw sprzed 1.07.2026
          </CardTitle>
          <CardDescription>
            Dla tego okresu nie mamy przepisów, więc nie pokazujemy kwoty ani
            werdyktu. Nie zgadujemy wyniku.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant="destructive">
            <AlertTriangle aria-hidden="true" />
            <AlertTitle>Brak danych prawnych dla tego okresu</AlertTitle>
            <AlertDescription>{historicalMessage}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader className="border-b border-border/70">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Wallet aria-hidden="true" className="size-4 text-primary" />
                Szacunek łączny
              </CardTitle>
              <CardDescription>
                Wersja silnika:{" "}
                <span className="font-mono">{data.engineVersion}</span> · zestaw
                reguł:{" "}
                <span className="font-mono">{result.ruleSetVersion}</span>
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant={status.variant}>{status.label}</Badge>
              <Badge
                variant={
                  historical
                    ? "warning"
                    : result.eligible
                      ? "info"
                      : "destructive"
                }
              >
                {historical
                  ? result.eligible
                    ? "W symulacji: uprawnienie"
                    : "W symulacji: brak uprawnienia"
                  : result.eligible
                    ? "Uprawnienie wstępne"
                    : "Brak uprawnienia"}
              </Badge>
              {!result.verified && !historical && (
                <Badge variant="warning">
                  Szacunek — parametry Q-15/Q-29
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            {total === null ? (
              <p className="text-2xl font-semibold tracking-tight">
                Nie wyliczono kwoty
              </p>
            ) : (
              <>
                <p className="text-sm font-medium text-muted-foreground">
                  {historical
                    ? "Kwota w symulacji obecnych przepisów"
                    : result.verified
                      ? "Kwota brutto"
                      : "Kwota szacunkowa"}
                </p>
                <p className="text-4xl font-semibold tracking-tight tabular-nums">
                  {formatPln(total)}
                </p>
              </>
            )}
            <p className="mt-1 text-xs text-pretty text-muted-foreground">
              {total === null
                ? "Silnik nie ma podstawy wymiaru albo kompletnych danych. Nie podstawiamy wartości zastępczej."
                : historical
                  ? "To nie jest kwota należna za Twoją sprawę — to wynik przeliczenia obecnych zasad na Twoje dane."
                  : "Kwota brutto, przed zaliczką PIT. "}
              {!historical &&
                (result.verified
                  ? "Parametry prawne są zweryfikowane."
                  : "To szacunek — parametry Q-15/Q-29 nie są jeszcze w pełni zatwierdzone.")}
            </p>
            {AMOUNT_STATUS_NOTE[analysis.amountStatus] && (
              <p className="mt-1 text-xs text-pretty text-warning-foreground">
                {AMOUNT_STATUS_NOTE[analysis.amountStatus]}
              </p>
            )}
          </div>

          {!historical && (
            <Alert
              variant={status.variant === "success" ? "info" : status.variant}
            >
              <Info aria-hidden="true" />
              <AlertTitle>{status.label}</AlertTitle>
              <AlertDescription>
                {status.text}
                <span className="text-xs">
                  Kod statusu silnika:{" "}
                  <span className="font-mono">{analysis.status}</span>
                </span>
              </AlertDescription>
            </Alert>
          )}

          {total !== null && (
            <div className="grid gap-3 sm:grid-cols-2">
              {result.totalsByBeneficiary.map((entry) => {
                const eligible =
                  entry.beneficiary === "MOTHER"
                    ? result.motherEligible
                    : result.fatherEligible
                return (
                  <div
                    key={entry.beneficiary}
                    className="rounded-lg bg-secondary/50 p-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs text-muted-foreground">
                        {entry.beneficiary === "MOTHER"
                          ? "Mama"
                          : "Tata / drugi rodzic"}
                      </p>
                      <Badge variant={eligible ? "success" : "destructive"}>
                        {eligible ? "uprawniony" : "brak uprawnienia"}
                      </Badge>
                    </div>
                    <p className="mt-1 font-medium tabular-nums">
                      {formatPln(entry.totalGrosze)}
                    </p>
                  </div>
                )
              })}
            </div>
          )}

          <dl className="grid grid-cols-2 gap-3 text-sm">
            <Metric
              label={
                result.mode === "BIRTH"
                  ? "Macierzyński"
                  : "Na warunkach macierzyńskiego"
              }
              value={`${result.maternityWeeks} tyg.`}
            />
            {result.mode === "BIRTH" ? (
              <Metric
                label="Po porodzie"
                value={`${result.postBirthWeeks} tyg.`}
              />
            ) : (
              <Metric
                label="Wiek dziecka"
                value={
                  result.ageAtPlacementYears === null
                    ? "—"
                    : `${result.ageAtPlacementYears.toFixed(1).replace(".", ",")} lat`
                }
              />
            )}
            {result.supplementaryWeeks > 0 && (
              <Metric
                label="Uzupełniający"
                value={`${result.supplementaryWeeks} tyg.`}
              />
            )}
            <Metric
              label="Pula rodzicielska"
              value={`${result.parentalPoolWeeks} tyg.`}
            />
            <Metric
              label="Rodzicielski mamy"
              value={formatWeeks(result.motherParentalWeeks)}
            />
            <Metric
              label="Dla drugiego rodzica"
              value={formatWeeks(result.secondParentWeeks)}
            />
            {result.extensionWeeks > 0 && (
              <Metric
                label="Przedłużenie"
                value={`${formatWeeks(result.extensionWeeks)} (limit ${result.extensionCapWeeks})`}
              />
            )}
            <Metric label="Podstawa mamy" value={formatPln(result.basisGrosze)} />
            <Metric
              label="Podstawa drugiego rodzica"
              value={formatPln(result.secondParentBasisGrosze)}
            />
          </dl>

          {data.calculationId && (
            <p className="text-xs text-muted-foreground">
              Zapisano jako{" "}
              <span className="font-mono">
                {data.calculationId.slice(0, 8)}…
              </span>
            </p>
          )}
        </CardContent>
      </Card>

      {unverifiedParams && !historical && (
        <Alert variant="warning">
          <ShieldAlert aria-hidden="true" />
          <AlertTitle>Parametry prawne wymagają potwierdzenia</AlertTitle>
          <AlertDescription>
            <ul className="list-disc space-y-1 pl-4">
              <li>
                <strong>Q-15 (zaokrąglanie):</strong> silnik przyjmuje
                zaokrąglenie podstawy i każdej pozycji do pełnych groszy.
                Źródła nie określają tej reguły dla zasiłków.
              </li>
              <li>
                <strong>Q-29 (kwoty zewnętrzne):</strong> minimalne
                wynagrodzenie i kwota świadczenia rodzicielskiego są przyjęte
                jako stałe aplikacji. Mogą zmienić wysokość wyniku dla niskich
                podstaw lub progu zadłużenia.
              </li>
            </ul>
            <p className="mt-2">
              Dlatego kwota jest szacunkiem, a nie decyzją ZUS. Zestaw reguł:{" "}
              <span className="font-mono">{result.ruleSetVersion}</span>.
            </p>
          </AlertDescription>
        </Alert>
      )}

      {missing.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileQuestion aria-hidden="true" className="size-4 text-warning-foreground" />
              Czego brakuje
            </CardTitle>
            <CardDescription>
              Bez tych informacji silnik nie podstawia przypadkowych wartości.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {missing.map((item, index) => (
                <li
                  key={`${item.parent ?? "all"}-${item.key}-${index}`}
                  className="rounded-lg border border-warning/30 bg-warning/10 p-3 text-sm"
                >
                  <p className="font-medium">
                    {item.parent === "MOTHER"
                      ? "Mama: "
                      : item.parent === "FATHER"
                        ? "Drugi rodzic: "
                        : ""}
                    {item.question}
                  </p>
                  <p className="mt-0.5 text-xs text-pretty text-muted-foreground">
                    {item.why}
                  </p>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-pretty text-muted-foreground">
              Uzupełnij te informacje w trybie zaawansowanym albo w kreatorze
              sytuacji. Po powrocie dane zostaną przeniesione bez ponownego
              wpisywania.
            </p>
          </CardContent>
        </Card>
      )}

      {(analysis.manualReviewReasons.length > 0 ||
        analysis.unsupported.length > 0) && (
        <Alert variant="destructive">
          <AlertTriangle aria-hidden="true" />
          <AlertTitle>Wymaga sprawdzenia poza kalkulatorem</AlertTitle>
          <AlertDescription>
            <ul className="list-disc space-y-1 pl-4">
              {analysis.manualReviewReasons.map((reason) => (
                <li key={reason}>{reason}</li>
              ))}
              {analysis.unsupported.map((item) => (
                <li key={item.code}>
                  <span className="font-mono text-xs">{item.code}</span>{" "}
                  {item.text}
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Rozbicie na okresy</CardTitle>
          <CardDescription>
            Każda pozycja ma świadczeniobiorcę, rodzaj urlopu, stawkę i podstawę
            prawną.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          <Table>
            <TableCaption className="sr-only">
              Rozbicie zasiłków na okresy, świadczeniobiorców i stawki
            </TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">Świadczeniobiorca</TableHead>
                <TableHead>Rodzaj urlopu</TableHead>
                <TableHead>Okres</TableHead>
                <TableHead>Stawka</TableHead>
                <TableHead className="pr-4 text-right">Kwota</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {result.lines.map((line, index) => (
                <TableRow key={`${line.kind}-${index}`}>
                  <TableCell className="pl-4 font-medium whitespace-normal">
                    {line.beneficiary === "MOTHER"
                      ? "Mama"
                      : "Tata / drugi rodzic"}
                  </TableCell>
                  <TableCell className="max-w-[15rem] whitespace-normal">
                    <p className="font-medium">{line.leaveType}</p>
                    <p className="text-xs text-muted-foreground">
                      {line.label}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {line.legalReference}
                    </p>
                    {line.minimumApplied && (
                      <p className="text-xs text-muted-foreground">
                        Podniesiono do kwoty świadczenia rodzicielskiego (U art.
                        31 ust. 3a).
                      </p>
                    )}
                  </TableCell>
                  <TableCell className="whitespace-normal text-muted-foreground">
                    {periodText(line.weeks, line.days)}
                  </TableCell>
                  <TableCell>{formatPercent(line.rate)}</TableCell>
                  <TableCell className="pr-4 text-right font-medium tabular-nums">
                    {formatPln(line.amountGrosze)}
                  </TableCell>
                </TableRow>
              ))}
              {result.lines.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="pl-4 text-muted-foreground">
                    Brak świadczeń do wyliczenia dla podanych danych.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {visibleWarnings.length > 0 && (
        <Alert variant="warning">
          <AlertTriangle aria-hidden="true" />
          <AlertTitle>Ważne zastrzeżenia</AlertTitle>
          <AlertDescription>
            <ul className="list-disc space-y-1 pl-4">
              {visibleWarnings.map((warning) => (
                <li key={warning} className="text-pretty">
                  {warning}
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Scale aria-hidden="true" className="size-4 text-primary" />
            Założenia i ślad reguł
          </CardTitle>
          <CardDescription>
            Ten sam wynik można odtworzyć z zapisanego wejścia i wersji reguł.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {analysis.assumptions.length > 0 && (
            <div>
              <h3 className="text-sm font-medium">Przyjęte założenia</h3>
              <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-muted-foreground">
                {analysis.assumptions.map((assumption) => (
                  <li key={assumption} className="text-pretty">
                    {assumption}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <details className="rounded-lg border border-border/70 p-3">
            <summary className="cursor-pointer text-sm font-medium">
              Pokaż ślad reguł ({result.trace.length})
            </summary>
            <ol className="mt-3 space-y-4">
              {result.trace.map((step, index) => (
                <li key={`${step.ruleId}-${index}`} className="flex gap-3">
                  <CheckCircle2
                    aria-hidden="true"
                    className="mt-0.5 size-4 shrink-0 text-primary"
                  />
                  <div>
                    <p className="text-sm font-medium">
                      <span className="mr-2 font-mono text-xs text-muted-foreground">
                        {step.ruleId}
                      </span>
                      {step.label}
                    </p>
                    <p className="mt-0.5 text-xs text-pretty text-muted-foreground">
                      {step.detail}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {step.legalReference}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </details>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        {onAdvanced && (
          <Button type="button" variant="outline" onClick={onAdvanced}>
            <ClipboardList aria-hidden="true" />
            {advancedLabel}
          </Button>
        )}
        <Button asChild>
          <Link href={`/asystent?q=${encodeURIComponent(assistantQuestion(result))}`}>
            <Sparkles aria-hidden="true" />
            Zapytaj asystenta o ten wynik
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/os-czasu">
            Zaplanuj terminy
            <ArrowRight data-icon="inline-end" aria-hidden="true" />
          </Link>
        </Button>
        <Button asChild variant="ghost">
          <Link href="/dokumenty">Sprawdź dokumenty</Link>
        </Button>
        <Button
          asChild
          variant="ghost"
          onClick={() => storeCalculatorPrefill(window.sessionStorage, result.input)}
        >
          <Link href="/start">Przekaż dane do kreatora</Link>
        </Button>
      </div>
    </>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-secondary/50 p-3">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 font-medium tabular-nums">{value}</dd>
    </div>
  )
}
