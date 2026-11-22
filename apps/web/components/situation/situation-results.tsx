"use client"

import Link from "next/link"
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  CircleHelp,
  Clock,
  FileSearch,
  FileText,
  Info,
  Scale,
  ShieldCheck,
  Wallet,
} from "lucide-react"

import type { engine } from "@zpr/domain"
import { situationSummary, type SituationAnswers } from "@zpr/domain"
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
import { formatDate, formatPln } from "@/lib/format"

export interface SituationAnalysis {
  calculation: engine.Assessment
  documents: engine.DocumentsReport
}

type BadgeVariant =
  | "default"
  | "secondary"
  | "outline"
  | "destructive"
  | "success"
  | "warning"
  | "info"

const ASSESSMENT_STATUS: Record<
  engine.AssessmentStatus,
  { label: string; variant: BadgeVariant; description: string }
> = {
  COMPLETE: {
    label: "Analiza kompletna",
    variant: "success",
    description:
      "Silnik miał wszystkie wymagane dane. Wynik nadal jest szacunkiem informacyjnym, nie decyzją ZUS.",
  },
  PARTIAL: {
    label: "Wynik częściowy",
    variant: "warning",
    description:
      "Część danych jest niepełna. Poniższe uprawnienia i kwoty nie są pełnym potwierdzeniem — uzupełnij wskazane informacje.",
  },
  MANUAL_REVIEW: {
    label: "Wymaga ręcznej weryfikacji",
    variant: "destructive",
    description:
      "Silnik wykrył sytuację, której nie rozstrzyga samodzielnie. Sprawdź wskazówki i skontaktuj się z ZUS lub płatnikiem.",
  },
}

const ELIGIBILITY_LABELS: Record<
  engine.EligibilityStatus,
  { label: string; variant: BadgeVariant }
> = {
  ELIGIBLE: { label: "Potwierdzone na podstawie danych", variant: "success" },
  CONDITIONAL: { label: "Warunkowe", variant: "warning" },
  NEEDS_INPUT: { label: "Wymaga uzupełnienia danych", variant: "warning" },
  MANUAL_REVIEW: {
    label: "Wymaga ręcznej weryfikacji",
    variant: "destructive",
  },
  NOT_ELIGIBLE: {
    label: "Brak podstaw do potwierdzenia",
    variant: "secondary",
  },
}

const AMOUNT_STATUS_LABEL: Record<engine.AmountStatus, string> = {
  CALCULATED: "wyliczona",
  CALCULATED_LOWER_BOUND: "co najmniej",
  CALCULATED_UPPER_BOUND: "co najwyżej",
  BASIS_UNKNOWN: "brak podstawy wymiaru",
  NOT_CALCULATED: "nie wyliczono",
  NOT_APPLICABLE: "nie dotyczy",
}

const PAYER_LABELS: Record<string, string> = {
  EMPLOYER: "pracodawca",
  ZUS: "ZUS",
  PAYER_OR_ZUS: "płatnik lub ZUS",
  NONE: "brak",
  UNKNOWN: "nieustalony",
}

const PREPARED_BY_LABELS: Record<string, string> = {
  YOU: "Ty",
  OTHER_PARENT: "drugi rodzic",
  EMPLOYER: "pracodawca",
  PAYER: "płatnik składek",
  DOCTOR: "lekarz",
  HOSPITAL: "szpital",
  COURT: "sąd",
  CIVIL_REGISTRY: "urząd stanu cywilnego",
  ZUS: "ZUS",
}

const BENEFIT_SHORT: Record<engine.BenefitType, string> = {
  SICKNESS_IN_PREGNANCY: "Zasiłek chorobowy w ciąży",
  EMPLOYER_SICK_PAY: "Wynagrodzenie chorobowe",
  REHABILITATION: "Świadczenie rehabilitacyjne",
  MATERNITY_EQUIVALENT: "Zasiłek do porodu",
  MATERNITY: "Zasiłek macierzyński",
  MATERNITY_TERMS: "Urlop na warunkach macierzyńskiego",
  SUPPLEMENTARY_MATERNITY: "Uzupełniający urlop macierzyński",
  PARENTAL: "Zasiłek rodzicielski",
  PATERNITY: "Zasiłek ojcowski",
  STILLBIRTH_FUNERAL_ALLOWANCE: "Zasiłek pogrzebowy",
}

function amountText(
  amountGrosze: number | null,
  status: engine.AmountStatus
): string {
  if (
    amountGrosze === null ||
    status === "BASIS_UNKNOWN" ||
    status === "NOT_CALCULATED" ||
    status === "NOT_APPLICABLE"
  ) {
    return "Kwota nieustalona"
  }
  if (status === "CALCULATED_LOWER_BOUND")
    return `co najmniej ${formatPln(amountGrosze)}`
  if (status === "CALCULATED_UPPER_BOUND")
    return `co najwyżej ${formatPln(amountGrosze)}`
  return formatPln(amountGrosze)
}

function overallEligibilityLabel(
  status: engine.EligibilityStatus,
  overall: engine.AssessmentStatus
): { label: string; variant: BadgeVariant } {
  const base = ELIGIBILITY_LABELS[status]
  if (status === "ELIGIBLE" && overall !== "COMPLETE") {
    return {
      label: "Wstępnie potwierdzone — wynik częściowy",
      variant: "warning",
    }
  }
  return base
}

function SectionHeading({
  id,
  icon: Icon,
  title,
  description,
}: {
  id: string
  icon: typeof FileText
  title: string
  description?: string
}) {
  return (
    <CardHeader className="border-b border-border/70">
      <CardTitle
        id={id}
        role="heading"
        aria-level={2}
        className="flex items-center gap-2"
      >
        <Icon aria-hidden="true" className="size-4 text-primary" />
        {title}
      </CardTitle>
      {description && <CardDescription>{description}</CardDescription>}
    </CardHeader>
  )
}

export function SituationResults({
  analysis,
  answers,
  onCheckDocument,
  documentProfileReady,
  savedCaseNumber,
}: {
  analysis: SituationAnalysis
  answers: SituationAnswers
  onCheckDocument: () => void
  documentProfileReady: boolean
  savedCaseNumber?: string
}) {
  const { calculation, documents } = analysis
  const status = ASSESSMENT_STATUS[calculation.status]
  const unsupportedPeriod = calculation.unsupported.find(
    (item) => item.code === "U-01"
  )
  const summary = situationSummary(answers)
  const totalKnown =
    calculation.totals.totalGrosze !== null &&
    (calculation.totals.amountStatus === "CALCULATED" ||
      calculation.totals.amountStatus === "CALCULATED_LOWER_BOUND" ||
      calculation.totals.amountStatus === "CALCULATED_UPPER_BOUND")
  const periodRange =
    calculation.periods.length > 0
      ? {
          start: calculation.periods.reduce(
            (min, period) => (period.start < min ? period.start : min),
            calculation.periods[0]!.start
          ),
          end: calculation.periods.reduce(
            (max, period) => (period.end > max ? period.end : max),
            calculation.periods[0]!.end
          ),
        }
      : null

  return (
    <div className="space-y-6" data-testid="situation-results">
      {unsupportedPeriod ? (
        <Alert variant="destructive">
          <AlertTriangle aria-hidden="true" />
          <AlertTitle>Brak przepisów dla tego okresu</AlertTitle>
          <AlertDescription>
            Twoje zdarzenie jest sprzed{" "}
            {formatDate(calculation.ruleSet.effectiveFrom)}. Aplikacja ma dane
            prawne dopiero od tej daty, więc nie oceniamy tej sprawy według
            prawa, które obowiązywało wtedy. To nie jest decyzja ZUS,
            przyznanie ani odmowa świadczenia. Sprawdź uprawnienia
            bezpośrednio w ZUS.
          </AlertDescription>
        </Alert>
      ) : (
        <Alert
          variant={
            calculation.status === "COMPLETE"
              ? "success"
              : calculation.status === "PARTIAL"
                ? "warning"
                : "destructive"
          }
        >
          {calculation.status === "COMPLETE" ? (
            <CheckCircle2 aria-hidden="true" />
          ) : (
            <AlertTriangle aria-hidden="true" />
          )}
          <AlertTitle className="flex flex-wrap items-center gap-2">
            {status.label}
            <Badge variant={status.variant}>
              {calculation.anchor.estimated
                ? "termin szacunkowy"
                : "termin znany"}
            </Badge>
          </AlertTitle>
          <AlertDescription>
            {status.description} {calculation.disclaimer}
          </AlertDescription>
        </Alert>
      )}

      <section aria-labelledby="situation-summary">
        <Card>
          <SectionHeading
            id="situation-summary"
            icon={FileText}
            title="Podsumowanie Twojej sytuacji"
            description="Dane, na których silnik oparł analizę. Możesz wrócić i je zmienić."
          />
          <CardContent className="space-y-4 pt-6">
            <dl className="grid gap-3 sm:grid-cols-2">
              {summary.map((row) => (
                <div key={row.label} className="rounded-lg bg-secondary/40 p-3">
                  <dt className="text-xs text-muted-foreground">{row.label}</dt>
                  <dd className="mt-0.5 text-sm font-medium text-pretty">
                    {row.value}
                  </dd>
                </div>
              ))}
            </dl>
            {calculation.anchor.date && (
              <p className="text-xs text-muted-foreground">
                Data bazowa analizy: {formatDate(calculation.anchor.date)}
                {calculation.anchor.estimated
                  ? " (przewidywana — okresy przesuną się po porodzie)."
                  : "."}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Silnik {calculation.engineVersion} · zestaw reguł{" "}
              {calculation.ruleSet.version} ({calculation.ruleSet.selectedBy}).
            </p>
          </CardContent>
        </Card>
      </section>

      <section aria-labelledby="situation-benefits">
        <Card>
          <SectionHeading
            id="situation-benefits"
            icon={ShieldCheck}
            title="Możliwe uprawnienia"
            description="Każdy status mówi, na ile danych opiera się wynik. „Wymaga uzupełnienia” nie jest potwierdzeniem."
          />
          <CardContent className="space-y-3 pt-6">
            {calculation.eligibility.determinations.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {unsupportedPeriod
                  ? "Dla okresu sprzed 1.07.2026 nie mamy przepisów, więc nie wskazujemy uprawnień. To nie jest odmowa — sprawdź swoją sytuację w ZUS."
                  : "Silnik nie zwrócił uprawnień. Najczęściej oznacza to brak wymaganej daty albo brak danych o ubezpieczeniu."}
              </p>
            ) : (
              calculation.eligibility.determinations.map(
                (determination, index) => {
                  const label = overallEligibilityLabel(
                    determination.status,
                    calculation.status
                  )
                  const benefit = calculation.applicableBenefits.find(
                    (item) =>
                      item.benefit === determination.benefit &&
                      item.parent === determination.parent
                  )
                  const ruleIds = [
                    ...new Set(
                      determination.reasons.map((reason) => reason.ruleId)
                    ),
                  ]
                  const benefitRules = calculation.appliedRules.filter((rule) =>
                    ruleIds.includes(rule.ruleId)
                  )
                  return (
                    <article
                      key={`${determination.parent}-${determination.benefit}-${index}`}
                      className="rounded-lg border border-border/70 p-4"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <h3 className="font-medium">
                            {determination.label ||
                              BENEFIT_SHORT[determination.benefit]}
                          </h3>
                          <p className="text-xs text-muted-foreground">
                            {determination.parent === "MOTHER"
                              ? "Matka / rodzic przyjmujący"
                              : "Drugi rodzic"}{" "}
                            ·{" "}
                            {determination.payer === "NONE"
                              ? "brak płatnika"
                              : (PAYER_LABELS[determination.payer] ??
                                determination.payer)}
                          </p>
                        </div>
                        <Badge variant={label.variant}>{label.label}</Badge>
                      </div>

                      {determination.reasons.length > 0 && (
                        <ul className="mt-3 space-y-1 text-sm text-pretty">
                          {determination.reasons.map((reason) => (
                            <li
                              key={`${reason.code}-${reason.ruleId}`}
                              className="flex gap-2"
                            >
                              <span
                                className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary"
                                aria-hidden="true"
                              />
                              <span>
                                {reason.text}{" "}
                                <span className="font-mono text-[11px] text-muted-foreground">
                                  ({reason.ruleId})
                                </span>
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}

                      {determination.conditions.length > 0 && (
                        <div className="mt-3">
                          <p className="text-xs font-medium text-muted-foreground">
                            Warunki
                          </p>
                          <ul className="mt-1 list-disc space-y-1 pl-4 text-xs text-muted-foreground">
                            {determination.conditions.map((condition) => (
                              <li key={condition}>{condition}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
                        {benefit && benefit.days > 0 && (
                          <span>
                            Okres: {benefit.days} dni (
                            {Math.floor(benefit.days / 7)} tyg.)
                          </span>
                        )}
                        {benefit && benefit.rates.length > 0 && (
                          <span>Stawka: {benefit.rates.join(", ")}</span>
                        )}
                        {benefit && (
                          <span>
                            Kwota:{" "}
                            {amountText(
                              benefit.amountGrosze,
                              benefit.amountStatus
                            )}
                          </span>
                        )}
                        <span>
                          Podstawa prawna: {ruleIds.join(", ") || "—"}
                        </span>
                      </div>
                      {benefitRules.length > 0 && (
                        <p className="mt-2 text-xs text-pretty text-muted-foreground">
                          Źródło:{" "}
                          {[
                            ...new Set(
                              benefitRules.flatMap((rule) => rule.sources)
                            ),
                          ].join("; ")}
                        </p>
                      )}
                    </article>
                  )
                }
              )
            )}
          </CardContent>
        </Card>
      </section>

      <section aria-labelledby="situation-amounts">
        <Card>
          <SectionHeading
            id="situation-amounts"
            icon={Wallet}
            title="Szacunkowe kwoty"
            description="Kwoty brutto, wyliczone deterministycznie przez silnik. Pokazujemy je tylko wtedy, gdy mają podstawę."
          />
          <CardContent className="space-y-4 pt-6">
            <div className="rounded-lg bg-primary/5 p-4">
              <p className="text-xs text-muted-foreground">
                Łącznie za wskazany plan
              </p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">
                {unsupportedPeriod
                  ? "Nie wyliczamy kwot dla tego okresu"
                  : totalKnown
                    ? `${calculation.totals.amountStatus === "CALCULATED_LOWER_BOUND" ? "co najmniej " : calculation.totals.amountStatus === "CALCULATED_UPPER_BOUND" ? "co najwyżej " : ""}${formatPln(calculation.totals.totalGrosze ?? 0)}`
                    : "Nie można wiarygodnie wyliczyć"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {unsupportedPeriod
                  ? "Aplikacja nie ma przepisów obowiązujących przed 1.07.2026. To nie jest odmowa ani przyznanie świadczenia — sprawdź swoją sprawę w ZUS."
                  : `Status kwoty: ${AMOUNT_STATUS_LABEL[calculation.totals.amountStatus]}.${
                      calculation.totals.amountStatus === "BASIS_UNKNOWN"
                        ? " Brakuje podstawy wymiaru — uzupełnij wynagrodzenie albo podstawę z Z-3/Z-3a."
                        : ""
                    }`}
              </p>
              {!unsupportedPeriod && periodRange && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Okres: {formatDate(periodRange.start)} –{" "}
                  {formatDate(periodRange.end)}.
                </p>
              )}
            </div>

            {calculation.basis.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Podstawa wymiaru</h3>
                {calculation.basis.map((basis) => (
                  <div
                    key={basis.parent}
                    className="rounded-lg border border-border/70 p-3 text-sm"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span>
                        {basis.parent === "MOTHER" ? "Matka" : "Drugi rodzic"}
                      </span>
                      <Badge
                        variant={
                          basis.status === "CALCULATED" ||
                          basis.status === "PROVIDED"
                            ? "success"
                            : "warning"
                        }
                      >
                        {basis.status === "PROVIDED"
                          ? "podana"
                          : basis.status === "CALCULATED"
                            ? "wyliczona"
                            : basis.status === "INCONSISTENT"
                              ? "niespójna"
                              : "nieustalona"}
                      </Badge>
                    </div>
                    <p className="mt-1 text-muted-foreground">
                      {basis.monthlyBasisGrosze !== null
                        ? `${formatPln(basis.monthlyBasisGrosze)} miesięcznie`
                        : "Brak podstawy wymiaru."}
                      {basis.minimumBasisApplied === "APPLIED"
                        ? " Zastosowano minimalną podstawę."
                        : ""}
                    </p>
                    {basis.steps.length > 0 && (
                      <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-muted-foreground">
                        {basis.steps.map((step) => (
                          <li key={step}>{step}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            )}

            {calculation.breakdown.length > 0 && (
              <div>
                <h3 className="text-sm font-medium">Pozycje wyliczenia</h3>
                <ul className="mt-2 divide-y divide-border/70 rounded-lg border border-border/70">
                  {calculation.breakdown.map((line) => (
                    <li
                      key={line.id}
                      className="grid gap-1 p-3 text-sm sm:grid-cols-[1fr_auto]"
                    >
                      <div>
                        <p className="font-medium">{line.label}</p>
                        <p className="text-xs text-muted-foreground">
                          {line.formula}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {line.period
                            ? `${formatDate(line.period.start)} – ${formatDate(line.period.end)}`
                            : "Bez okresu"}
                        </p>
                      </div>
                      <p className="font-medium tabular-nums sm:text-right">
                        {line.amountGrosze !== null
                          ? formatPln(line.amountGrosze)
                          : "—"}
                      </p>
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-xs text-muted-foreground">
                  Kwoty są brutto. Każda pozycja jest liczona osobno i
                  zaokrąglana raz na końcu.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <section aria-labelledby="situation-plan">
        <Card>
          <SectionHeading
            id="situation-plan"
            icon={Clock}
            title="Plan działania i terminy"
            description="Kolejne kroki pochodzą z silnika. Plan urlopów możesz dopracować w osobnej osi czasu."
          />
          <CardContent className="space-y-5 pt-6">
            <div>
              <h3 className="text-sm font-medium">Kolejne kroki</h3>
              <ol className="mt-2 space-y-2">
                {calculation.nextSteps.map((step, index) => (
                  <li
                    key={step.id}
                    className="flex gap-3 rounded-lg border border-border/70 p-3 text-sm"
                  >
                    <span className="grid size-6 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                      {index + 1}
                    </span>
                    <div>
                      <p className="text-pretty">{step.text}</p>
                      {step.dueDate && (
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          Termin: {formatDate(step.dueDate)}
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            </div>

            {calculation.timeline.length > 0 && (
              <div>
                <h3 className="text-sm font-medium">Oś czasu</h3>
                <ul className="mt-2 space-y-2">
                  {calculation.timeline.map((entry) => (
                    <li
                      key={entry.id}
                      className="flex flex-wrap items-start justify-between gap-2 rounded-lg border border-border/70 p-3 text-sm"
                    >
                      <div>
                        <p className="font-medium">{entry.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {entry.detail}
                        </p>
                      </div>
                      <div className="text-right text-xs">
                        <p className="tabular-nums">
                          {formatDate(entry.date)}
                          {entry.endDate
                            ? ` – ${formatDate(entry.endDate)}`
                            : ""}
                        </p>
                        {entry.estimated && (
                          <Badge variant="outline">szacunek</Badge>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <Button asChild variant="outline">
              <Link href="/os-czasu">
                Dopracuj plan urlopów w osi czasu
                <ArrowRight data-icon="inline-end" aria-hidden="true" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </section>

      <section aria-labelledby="situation-documents">
        <Card>
          <SectionHeading
            id="situation-documents"
            icon={FileText}
            title="Dokumenty do przygotowania"
            description="Lista pochodzi z silnika i uwzględnia formularze obowiązujące w wybranym zestawie reguł."
          />
          <CardContent className="space-y-3 pt-6">
            {documents.documents.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {unsupportedPeriod
                  ? "Dla okresu sprzed 1.07.2026 nie wskazujemy dokumentów, bo nie mamy ówczesnych przepisów. Sprawdź wymagane dokumenty w ZUS."
                  : "Brak dokumentów do wskazania na podstawie obecnych danych."}
              </p>
            ) : (
              documents.documents.map((document) => (
                <article
                  key={`${document.code}-${document.parent}`}
                  className="rounded-lg border border-border/70 p-3"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-medium">{document.name}</p>
                      <p className="font-mono text-xs text-muted-foreground">
                        {document.code}
                      </p>
                    </div>
                    <Badge variant={document.provided ? "success" : "outline"}>
                      {document.provided ? "już masz" : "do przygotowania"}
                    </Badge>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Przygotowuje:{" "}
                    {PREPARED_BY_LABELS[document.preparedBy] ??
                      document.preparedBy}{" "}
                    · Składasz do:{" "}
                    {PAYER_LABELS[document.submitTo] ?? document.submitTo} ·
                    Kiedy: {document.when}
                    {document.dueDate
                      ? ` · Termin: ${formatDate(document.dueDate)}`
                      : ""}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {document.legalBasis}
                  </p>
                </article>
              ))
            )}
            {documents.routing.length > 0 && (
              <div className="rounded-lg bg-secondary/40 p-3 text-sm">
                <p className="font-medium">Kto wypłaca</p>
                {documents.routing.map((route) => (
                  <p
                    key={route.parent}
                    className="text-xs text-muted-foreground"
                  >
                    {route.parent === "MOTHER" ? "Matka" : "Drugi rodzic"}:{" "}
                    {PAYER_LABELS[route.payer] ?? route.payer}.{" "}
                    {route.explanation}
                  </p>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <section aria-labelledby="situation-missing">
        <Card>
          <SectionHeading
            id="situation-missing"
            icon={CircleHelp}
            title="Brakujące informacje"
            description="To konkretne luki, które zmieniają wynik. Nie musisz ich znać od razu — możesz uzupełnić je później."
          />
          <CardContent className="space-y-2 pt-6">
            {calculation.missingEvidence.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Silnik nie zgłosił brakujących informacji.
              </p>
            ) : (
              calculation.missingEvidence.map((item) => (
                <div
                  key={`${item.parent ?? "all"}-${item.key}`}
                  className="rounded-lg border border-warning/40 bg-warning/10 p-3"
                >
                  <p className="text-sm font-medium">{item.question}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {item.why}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Wpływ:{" "}
                    {[
                      ...new Set(
                        item.affects.map((benefit) => BENEFIT_SHORT[benefit])
                      ),
                    ].join(", ")}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </section>

      {(calculation.warnings.length > 0 ||
        calculation.manualReviewReasons.length > 0) && (
        <section aria-labelledby="situation-risks">
          <Card>
            <SectionHeading
              id="situation-risks"
              icon={AlertTriangle}
              title="Wymaga uwagi"
              description="Sygnały ryzyka i sytuacje, których silnik nie rozstrzyga samodzielnie."
            />
            <CardContent className="space-y-2 pt-6">
              {calculation.manualReviewReasons.map((reason) => (
                <Alert key={reason} variant="warning">
                  <AlertTriangle aria-hidden="true" />
                  <AlertTitle>Ręczna weryfikacja</AlertTitle>
                  <AlertDescription>{reason}</AlertDescription>
                </Alert>
              ))}
              {calculation.warnings.map((warning) => (
                <Alert
                  key={`${warning.code}-${warning.parent ?? "both"}`}
                  variant={
                    warning.severity === "RISK"
                      ? "destructive"
                      : warning.severity === "WARNING"
                        ? "warning"
                        : "info"
                  }
                >
                  <Info aria-hidden="true" />
                  <AlertTitle>
                    {warning.severity === "RISK"
                      ? "Ryzyko"
                      : warning.severity === "WARNING"
                        ? "Uwaga"
                        : "Informacja"}
                  </AlertTitle>
                  <AlertDescription>{warning.text}</AlertDescription>
                </Alert>
              ))}
            </CardContent>
          </Card>
        </section>
      )}

      <section aria-labelledby="situation-sources">
        <Card>
          <SectionHeading
            id="situation-sources"
            icon={Scale}
            title="Podstawy i zastrzeżenia"
            description="Wersjonowane reguły i źródła użyte w analizie."
          />
          <CardContent className="space-y-3 pt-6 text-sm">
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">
                silnik {calculation.engineVersion}
              </Badge>
              <Badge variant="outline">
                reguły {calculation.ruleSet.version}
              </Badge>
              <Badge variant="outline">{calculation.ruleSet.label}</Badge>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">
                Użyte reguły
              </p>
              <ul className="mt-1 space-y-1 text-xs text-muted-foreground">
                {calculation.appliedRules.map((rule) => (
                  <li key={rule.ruleId}>
                    <span className="font-mono">{rule.ruleId}</span> —{" "}
                    {rule.title}. {rule.sources.join("; ")}
                  </li>
                ))}
              </ul>
            </div>
            {calculation.assumptions.length > 0 && (
              <details className="rounded-lg border border-border/70 p-3">
                <summary className="cursor-pointer text-sm font-medium">
                  Założenia silnika
                </summary>
                <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-muted-foreground">
                  {calculation.assumptions.map((assumption) => (
                    <li key={assumption}>{assumption}</li>
                  ))}
                </ul>
              </details>
            )}
            {calculation.unsupported.length > 0 && (
              <details className="rounded-lg border border-border/70 p-3">
                <summary className="cursor-pointer text-sm font-medium">
                  Czego ta analiza nie obejmuje
                </summary>
                <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-muted-foreground">
                  {calculation.unsupported.map((item) => (
                    <li key={item.code}>
                      <span className="font-mono">{item.code}</span> —{" "}
                      {item.text}
                    </li>
                  ))}
                </ul>
              </details>
            )}
            <p className="text-xs text-pretty text-muted-foreground">
              {calculation.disclaimer}
            </p>
          </CardContent>
        </Card>
      </section>

      <Card className="border-primary/30 bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSearch aria-hidden="true" className="size-4 text-primary" />
            Masz już wypełniony wniosek?
          </CardTitle>
          <CardDescription>
            Możesz przesłać dokument, a my sprawdzimy jego kompletność i
            porównamy zawarte w nim informacje z Twoją sytuacją. Nie wpisujesz
            drugi raz tych samych danych.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-3">
          <Button
            asChild
            onClick={(event) => {
              if (!documentProfileReady) {
                event.preventDefault()
                return
              }
              onCheckDocument()
            }}
          >
            <Link
              href="/dokumenty?from=start"
              aria-disabled={!documentProfileReady}
            >
              Sprawdź mój wniosek
              <ArrowRight data-icon="inline-end" aria-hidden="true" />
            </Link>
          </Button>
          <p className="max-w-md text-xs text-muted-foreground">
            Analiza dokumentu wymaga osobnej zgody i odbywa się lokalnie. Wynik
            nigdy nie jest komunikatorem „ZUS zaakceptuje wniosek”.
          </p>
          {savedCaseNumber && (
            <Badge variant="success" className="ml-auto">
              sprawa {savedCaseNumber}
            </Badge>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
