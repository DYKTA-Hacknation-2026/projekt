"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useMemo, useState, type ReactNode } from "react"
import {
  AlertTriangle,
  ArrowRight,
  Baby,
  Building2,
  CheckCircle2,
  CircleDashed,
  FileText,
  Info,
  Landmark,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  XCircle,
} from "lucide-react"

import type {
  DataScope,
  DataSourceCatalog,
  DataSourceId,
  FieldSource,
  ImportAcceptance,
  ImportFieldKey,
  ImportPreview,
  ImportSessionView,
  ImportedCaseData,
  SourceActivity,
  SourceFetchResult,
  SourceIssue,
} from "@zpr/contracts/data-import"
import type {
  CalculatorResult,
  EligibilityAssessment,
  SickLeaveAnalysis,
} from "@zpr/domain"
import type { MobywatelPersona } from "@zpr/contracts/mobywatel"
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
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { Progress } from "@workspace/ui/components/progress"
import { Select } from "@workspace/ui/components/select"
import { formatDate, formatPln } from "@/lib/format"

type PreviewResponse = Omit<ImportPreview, "eligibility" | "calculation" | "sickLeave"> & {
  eligibility: EligibilityAssessment
  calculation: CalculatorResult
  sickLeave: SickLeaveAnalysis
}

type Step = 1 | 2 | 3 | 4

type FetchProgress = {
  status: "PENDING" | "RUNNING" | SourceFetchResult["status"]
  activities: SourceActivity[]
}

const STEP_TITLES = [
  "Informacja i zgoda",
  "Pobieranie danych",
  "Podsumowanie",
  "Weryfikacja danych",
] as const

const SOURCE_ICONS: Record<DataSourceId, typeof Landmark> = {
  ZUS: Landmark,
  EMPLOYER: Building2,
  EZLA: Stethoscope,
  USC: Baby,
  PUE: FileText,
}

const STATUS_LABELS: Record<SourceFetchResult["status"], string> = {
  PENDING: "Oczekuje",
  SUCCESS: "Pobrano",
  PARTIAL: "Pobrano częściowo",
  EMPTY: "Brak danych",
  ERROR: "Błąd źródła",
}

const STATUS_VARIANTS: Record<
  SourceFetchResult["status"],
  "success" | "warning" | "secondary" | "destructive" | "info" | "outline"
> = {
  PENDING: "outline",
  SUCCESS: "success",
  PARTIAL: "warning",
  EMPTY: "secondary",
  ERROR: "destructive",
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init)
  const body = (await response.json()) as {
    detail?: string
    issues?: Array<{ path: string; message: string }>
  }
  if (!response.ok) {
    const issue = body.issues?.[0]
    throw new Error(
      issue
        ? `${issue.path}: ${issue.message}`
        : body.detail ?? "Nie udało się wykonać operacji."
    )
  }
  return body as T
}

function countRecords(result: SourceFetchResult): number {
  const data = result.data
  if (!data) return 0
  switch (data.source) {
    case "ZUS":
      return (
        data.insurancePeriods.length +
        data.contributionBases.length +
        (data.arrears ? 1 : 0) +
        (data.benefitBasis ? 1 : 0)
      )
    case "EMPLOYER":
      return data.payers.length + data.employments.length
    case "EZLA":
      return data.sickLeaves.length
    case "USC":
      return data.children.length + data.familyEvents.length
    case "PUE":
      return data.cases.length + data.documents.length
  }
}

function issueVariant(severity: SourceIssue["severity"]) {
  return severity === "ERROR"
    ? "destructive"
    : severity === "WARNING"
      ? "warning"
      : "info"
}

function OriginBadge({ source }: { source?: FieldSource }) {
  if (!source) {
    return <Badge variant="outline">Uzupełnij ręcznie</Badge>
  }
  return (
    <Badge variant={source.origin === "MANUAL" ? "warning" : "success"}>
      {source.label}
    </Badge>
  )
}

export function DataImportWizard({ persona }: { persona: MobywatelPersona }) {
  const router = useRouter()
  const [step, setStep] = useState<Step>(1)
  const [catalog, setCatalog] = useState<DataSourceCatalog | null>(null)
  const [selectedScopes, setSelectedScopes] = useState<Set<DataScope>>(
    new Set()
  )
  const [catalogError, setCatalogError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [sessionView, setSessionView] = useState<ImportSessionView | null>(null)
  const [progress, setProgress] = useState<Record<string, FetchProgress>>({})
  const [preview, setPreview] = useState<PreviewResponse | null>(null)
  const [formData, setFormData] = useState<ImportedCaseData>({})
  const [fieldSources, setFieldSources] = useState<
    Partial<Record<ImportFieldKey, FieldSource>>
  >({})

  useEffect(() => {
    let cancelled = false
    request<DataSourceCatalog>("/api/v1/data-import/sources")
      .then((data) => {
        if (cancelled) return
        setCatalog(data)
        setSelectedScopes(new Set(data.scopes.map((scope) => scope.id)))
      })
      .catch((loadError: unknown) => {
        if (cancelled) return
        setCatalogError(
          loadError instanceof Error
            ? loadError.message
            : "Nie udało się pobrać listy źródeł."
        )
      })
    return () => {
      cancelled = true
    }
  }, [])

  const selectedSourceCount = useMemo(() => {
    if (!catalog) return 0
    return catalog.sources.filter((source) =>
      source.scopes.some((scope) => selectedScopes.has(scope.id))
    ).length
  }, [catalog, selectedScopes])

  function toggleScope(scope: DataScope, checked: boolean) {
    setSelectedScopes((current) => {
      const next = new Set(current)
      if (checked) next.add(scope)
      else next.delete(scope)
      return next
    })
  }

  async function startImport() {
    if (!catalog || selectedScopes.size === 0) return
    setError(null)
    setBusy(true)
    setStep(2)
    setProgress({})
    setSessionView(null)

    try {
      const created = await request<ImportSessionView>(
        "/api/v1/data-import/sessions",
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ scopes: [...selectedScopes] }),
        }
      )
      setSessionView(created)

      const sources = catalog.sources.filter((source) =>
        source.scopes.some((scope) => selectedScopes.has(scope.id))
      )

      for (const source of sources) {
        setProgress((current) => ({
          ...current,
          [source.id]: {
            status: "RUNNING",
            activities: source.activities.map((activity) => ({
              ...activity,
              status: "PENDING",
            })),
          },
        }))
        await sleep(220)

        try {
          const response = await request<{
            result: SourceFetchResult
            session: ImportSessionView
          }>(
            `/api/v1/data-import/sessions/${created.session.id}/sources/${source.id}`,
            { method: "POST" }
          )
          setProgress((current) => ({
            ...current,
            [source.id]: {
              status: response.result.status,
              activities: response.result.activities,
            },
          }))
          setSessionView(response.session)
        } catch (sourceError) {
          setProgress((current) => ({
            ...current,
            [source.id]: {
              status: "ERROR",
              activities: source.activities.map((activity) => ({
                ...activity,
                status: "ERROR",
              })),
            },
          }))
          setError(
            sourceError instanceof Error
              ? sourceError.message
              : `Nie udało się pobrać danych z ${source.label}.`
          )
        }
      }

      const final = await request<ImportSessionView>(
        `/api/v1/data-import/sessions/${created.session.id}`
      )
      setSessionView(final)
      setStep(3)
    } catch (startError) {
      setError(
        startError instanceof Error
          ? startError.message
          : "Nie udało się rozpocząć pobierania."
      )
      setStep(1)
    } finally {
      setBusy(false)
    }
  }

  async function openVerification() {
    if (!sessionView) return
    setError(null)
    setBusy(true)
    try {
      const result = await request<PreviewResponse>(
        `/api/v1/data-import/sessions/${sessionView.session.id}/preview`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({}),
        }
      )
      setPreview(result)
      setFormData(result.data)
      setFieldSources(result.fieldSources)
      setStep(4)
    } catch (previewError) {
      setError(
        previewError instanceof Error
          ? previewError.message
          : "Nie udało się przygotować danych do weryfikacji."
      )
    } finally {
      setBusy(false)
    }
  }

  async function recheck() {
    if (!sessionView) return
    setError(null)
    setBusy(true)
    try {
      const result = await request<PreviewResponse>(
        `/api/v1/data-import/sessions/${sessionView.session.id}/preview`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ data: formData }),
        }
      )
      setPreview(result)
      setFormData(result.data)
      setFieldSources(result.fieldSources)
    } catch (previewError) {
      setError(
        previewError instanceof Error
          ? previewError.message
          : "Nie udało się sprawdzić danych."
      )
    } finally {
      setBusy(false)
    }
  }

  async function accept() {
    if (!sessionView) return
    setError(null)
    setBusy(true)
    try {
      const accepted = await request<ImportAcceptance>(
        `/api/v1/data-import/sessions/${sessionView.session.id}/accept`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ data: formData }),
        }
      )
      window.sessionStorage.setItem(
        "zpr:import-prefill",
        JSON.stringify({
          sessionId: accepted.session.id,
          data: accepted.prefill,
          fieldSources: accepted.fieldSources,
        })
      )
      router.push(accepted.onboardingUrl)
    } catch (acceptError) {
      setError(
        acceptError instanceof Error
          ? acceptError.message
          : "Nie udało się zatwierdzić danych."
      )
    } finally {
      setBusy(false)
    }
  }

  async function skip() {
    if (sessionView) {
      try {
        await request(
          `/api/v1/data-import/sessions/${sessionView.session.id}/skip`,
          { method: "POST" }
        )
      } catch {
        // Skipping must never block the manual path.
      }
    }
    window.sessionStorage.removeItem("zpr:import-prefill")
    router.push("/start")
  }

  function updateField<K extends keyof ImportedCaseData>(
    key: K,
    value: ImportedCaseData[K]
  ) {
    setFormData((current) => ({ ...current, [key]: value }))
    setFieldSources((current) => ({
      ...current,
      [key]: {
        origin: "MANUAL",
        label: "Poprawione przez Ciebie",
      },
    }))
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="border-b border-border/70">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle>
                Krok {step} z 4 · {STEP_TITLES[step - 1]}
              </CardTitle>
              <CardDescription>
                Symulacja pobrania danych dla:{" "}
                <span className="font-medium text-foreground">
                  {persona.firstName} {persona.lastName}
                </span>
                . Nic nie jest pobierane bez Twojej zgody.
              </CardDescription>
            </div>
            <Badge variant="warning">Symulacja</Badge>
          </div>
          <Progress
            value={step * 25}
            label={`Postęp pobierania danych: ${step * 25}%`}
          />
        </CardHeader>
        <CardContent className="space-y-5 pt-6">
          {error && (
            <Alert variant="destructive">
              <AlertTriangle aria-hidden="true" />
              <AlertTitle>Nie można kontynuować</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {step === 1 && (
            <ConsentStep
              catalog={catalog}
              catalogError={catalogError}
              selectedScopes={selectedScopes}
              selectedSourceCount={selectedSourceCount}
              busy={busy}
              onToggle={toggleScope}
              onStart={startImport}
              onSkip={skip}
            />
          )}

          {step === 2 && (
            <FetchingStep
              persona={persona}
              progress={progress}
              sessionView={sessionView}
              catalog={catalog}
              busy={busy}
            />
          )}

          {step === 3 && sessionView && (
            <SummaryStep
              view={sessionView}
              catalog={catalog}
              busy={busy}
              onVerify={openVerification}
              onSkip={skip}
            />
          )}

          {step === 4 && preview && (
            <VerificationStep
              preview={preview}
              formData={formData}
              fieldSources={fieldSources}
              busy={busy}
              onChange={updateField}
              onRecheck={recheck}
              onAccept={accept}
            />
          )}
        </CardContent>
      </Card>

      <Alert variant="info">
        <ShieldCheck aria-hidden="true" />
        <AlertTitle>Bezpieczeństwo i ograniczenie danych</AlertTitle>
        <AlertDescription>
          To nie jest połączenie z ZUS, PUE/eZUS, USC, e-ZLA ani mObywatelem.
          Wszystkie rekordy są syntetyczne. Pobieramy tylko zakres, który
          zaznaczysz, a zaakceptowane dane możesz poprawić w kreatorze.
        </AlertDescription>
      </Alert>
    </div>
  )
}

function ConsentStep({
  catalog,
  catalogError,
  selectedScopes,
  selectedSourceCount,
  busy,
  onToggle,
  onStart,
  onSkip,
}: {
  catalog: DataSourceCatalog | null
  catalogError: string | null
  selectedScopes: Set<DataScope>
  selectedSourceCount: number
  busy: boolean
  onToggle: (scope: DataScope, checked: boolean) => void
  onStart: () => void
  onSkip: () => void
}) {
  if (catalogError) {
    return (
      <Alert variant="destructive">
        <AlertTriangle aria-hidden="true" />
        <AlertTitle>Nie udało się wczytać źródeł</AlertTitle>
        <AlertDescription>{catalogError}</AlertDescription>
      </Alert>
    )
  }

  if (!catalog) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 aria-hidden="true" className="size-4 animate-spin" />
        Wczytuję listę źródeł…
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-border/70 bg-secondary/30 p-4 text-sm">
        <p className="font-medium">
          Możesz uzupełnić formularz danymi z symulowanych systemów.
        </p>
        <p className="mt-1 text-pretty text-muted-foreground">
          Zaznacz, na jakie zakresy danych się zgadzasz. Każde źródło jest
          osobnym modułem, który w przyszłości można zastąpić prawdziwą
          integracją. Możesz też pominąć ten krok i wpisać wszystko samodzielnie.
        </p>
      </div>

      <div className="space-y-3">
        {catalog.sources.map((source) => {
          const Icon = SOURCE_ICONS[source.id]
          return (
            <div
              key={source.id}
              className="rounded-lg border border-border/70 p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="flex gap-3">
                  <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-lg bg-secondary text-primary">
                    <Icon aria-hidden="true" className="size-4" />
                  </span>
                  <div>
                    <p className="font-medium">{source.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {source.institution}
                    </p>
                  </div>
                </div>
                <Badge variant="warning">Dane symulowane</Badge>
              </div>
              <p className="mt-2 text-sm text-pretty text-muted-foreground">
                {source.description}
              </p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {source.scopes.map((scope) => (
                  <label
                    key={scope.id}
                    className="flex items-start gap-2.5 rounded-lg border border-border/60 p-2.5 text-sm"
                  >
                    <input
                      type="checkbox"
                      className="mt-0.5 size-4 accent-[var(--primary)]"
                      checked={selectedScopes.has(scope.id)}
                      onChange={(event) =>
                        onToggle(scope.id, event.target.checked)
                      }
                    />
                    <span>
                      <span className="font-medium">{scope.label}</span>
                      <span className="block text-xs text-muted-foreground">
                        {scope.description}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      <div className="flex flex-col gap-2 border-t border-border/70 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted-foreground">
          Wybrano {selectedScopes.size} zakresów z {selectedSourceCount}{" "}
          {selectedSourceCount === 1 ? "źródła" : "źródeł"}.
        </p>
        <div className="flex flex-col-reverse gap-2 sm:flex-row">
          <Button type="button" variant="outline" onClick={onSkip}>
            Uzupełnię dane samodzielnie
          </Button>
          <Button
            type="button"
            onClick={onStart}
            disabled={busy || selectedScopes.size === 0}
          >
            {busy && <Loader2 aria-hidden="true" className="animate-spin" />}
            Pobierz moje dane
            <ArrowRight data-icon="inline-end" aria-hidden="true" />
          </Button>
        </div>
      </div>
    </div>
  )
}

function FetchingStep({
  persona,
  progress,
  sessionView,
  catalog,
  busy,
}: {
  persona: MobywatelPersona
  progress: Record<string, FetchProgress>
  sessionView: ImportSessionView | null
  catalog: DataSourceCatalog | null
  busy: boolean
}) {
  const entries = Object.entries(progress)

  return (
    <div className="space-y-4" aria-live="polite">
      <div className="rounded-lg border border-border/70 bg-secondary/30 p-4 text-sm">
        <p className="font-medium">
          Pobieram dane dla {persona.firstName} {persona.lastName} (symulacja).
        </p>
        <p className="mt-1 text-muted-foreground">
          Każde źródło ma własny postęp. Animatorem nie udajemy długiego
          oczekiwania — to tylko czytelny podgląd procesu.
        </p>
      </div>

      {entries.length === 0 && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 aria-hidden="true" className="size-4 animate-spin" />
          Uruchamiam źródła…
        </div>
      )}

      <div className="space-y-3">
        {entries.map(([sourceId, item]) => (
          <div key={sourceId} className="rounded-lg border border-border/70 p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="font-medium">
                {catalog?.sources.find((source) => source.id === sourceId)
                  ?.label ?? sourceId}
              </p>
              <Badge
                variant={
                  item.status === "RUNNING"
                    ? "info"
                    : STATUS_VARIANTS[item.status] ?? "outline"
                }
              >
                {item.status === "RUNNING"
                  ? "Pobieram…"
                  : STATUS_LABELS[item.status] ?? item.status}
              </Badge>
            </div>
            <ul className="mt-3 space-y-2">
              {item.activities.map((activity) => (
                <li
                  key={activity.id}
                  className="flex items-center gap-2 text-sm text-muted-foreground"
                >
                  {activity.status === "SUCCESS" ? (
                    <CheckCircle2
                      aria-hidden="true"
                      className="size-4 text-success"
                    />
                  ) : activity.status === "ERROR" ? (
                    <XCircle
                      aria-hidden="true"
                      className="size-4 text-destructive"
                    />
                  ) : activity.status === "PENDING" ? (
                    <CircleDashed
                      aria-hidden="true"
                      className="size-4 text-muted-foreground"
                    />
                  ) : (
                    <Loader2
                      aria-hidden="true"
                      className="size-4 animate-spin text-primary"
                    />
                  )}
                  {activity.label}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {busy && (
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 aria-hidden="true" className="size-3.5 animate-spin" />
          Trwa pobieranie…
        </p>
      )}

      {sessionView && (
        <p className="text-xs text-muted-foreground">
          Sesja: <span className="font-mono">{sessionView.session.id.slice(0, 8)}…</span>
        </p>
      )}
    </div>
  )
}

function SummaryStep({
  view,
  catalog,
  busy,
  onVerify,
  onSkip,
}: {
  view: ImportSessionView
  catalog: DataSourceCatalog | null
  busy: boolean
  onVerify: () => void
  onSkip: () => void
}) {
  const summary = view.session.summary

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryMetric
          label="Pobrane poprawnie"
          value={summary.counts.downloaded}
          hint="źródła z danymi"
        />
        <SummaryMetric
          label="Niedostępne"
          value={summary.counts.unavailable}
          hint="puste lub błąd"
        />
        <SummaryMetric
          label="Do uzupełnienia"
          value={summary.counts.manual}
          hint="pola ręczne"
        />
        <SummaryMetric
          label="Niespójności"
          value={summary.counts.inconsistencies}
          hint="wymagają uwagi"
        />
      </div>

      <div className="space-y-3">
        {view.session.sources.map((source) => (
          <div key={source.source} className="rounded-lg border border-border/70 p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-medium">{source.label}</p>
                <p className="text-xs text-muted-foreground">
                  {source.institution} · {countRecords(source)} rekordów
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={STATUS_VARIANTS[source.status]}>
                  {STATUS_LABELS[source.status]}
                </Badge>
                <Badge variant="outline">Symulacja</Badge>
              </div>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Zakres zgody:{" "}
              {source.requestedScopes
                .map(
                  (scope) =>
                    catalog?.scopes.find((item) => item.id === scope)?.label ??
                    scope
                )
                .join(", ")}
            </p>
            {source.issues.length > 0 && (
              <ul className="mt-3 space-y-1.5">
                {source.issues.map((issue) => (
                  <li key={`${source.source}-${issue.code}-${issue.message}`}>
                    <Badge variant={issueVariant(issue.severity)}>
                      {issue.severity === "ERROR"
                        ? "Błąd"
                        : issue.severity === "WARNING"
                          ? "Uwaga"
                          : "Info"}
                    </Badge>{" "}
                    <span className="text-sm text-muted-foreground">
                      {issue.message}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <SourceDataDetails result={source} />
          </div>
        ))}
      </div>

      {summary.manualFields.length > 0 && (
        <Alert variant="warning">
          <AlertTriangle aria-hidden="true" />
          <AlertTitle>Dane wymagające ręcznego uzupełnienia</AlertTitle>
          <AlertDescription>
            <ul className="list-disc space-y-1 pl-4">
              {summary.manualFields.map((field) => (
                <li key={field.field}>
                  <span className="font-medium">{field.label}</span> —{" "}
                  {field.reason}
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {summary.inconsistencies.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle aria-hidden="true" />
          <AlertTitle>Możliwe niespójności między źródłami</AlertTitle>
          <AlertDescription>
            <ul className="list-disc space-y-1 pl-4">
              {summary.inconsistencies.map((item) => (
                <li key={item.code}>
                  <span className="font-medium">
                    {item.sources.join(" / ")}
                  </span>{" "}
                  — {item.message}
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {summary.notes.length > 0 && (
        <div className="rounded-lg border border-border/70 bg-secondary/30 p-4 text-sm">
          <p className="font-medium">Dodatkowe uwagi</p>
          <ul className="mt-2 list-disc space-y-1 pl-4 text-muted-foreground">
            {summary.notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-col-reverse gap-2 border-t border-border/70 pt-4 sm:flex-row sm:justify-between">
        <Button type="button" variant="outline" onClick={onSkip}>
          Uzupełnię dane samodzielnie
        </Button>
        <Button type="button" onClick={onVerify} disabled={busy}>
          {busy && <Loader2 aria-hidden="true" className="animate-spin" />}
          Przejdź do weryfikacji
          <ArrowRight data-icon="inline-end" aria-hidden="true" />
        </Button>
      </div>
    </div>
  )
}

function VerificationStep({
  preview,
  formData,
  fieldSources,
  busy,
  onChange,
  onRecheck,
  onAccept,
}: {
  preview: PreviewResponse
  formData: ImportedCaseData
  fieldSources: Partial<Record<ImportFieldKey, FieldSource>>
  busy: boolean
  onChange: <K extends keyof ImportedCaseData>(
    key: K,
    value: ImportedCaseData[K]
  ) => void
  onRecheck: () => void
  onAccept: () => void
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
      <div className="space-y-4">
        <div className="rounded-lg border border-border/70 bg-secondary/30 p-4 text-sm">
          <p className="font-medium">Sprawdź dane przed przekazaniem</p>
          <p className="mt-1 text-pretty text-muted-foreground">
            Pobrane dane nie są nieomylne. Popraw pola, które się nie zgadzają.
            Zmienione pole otrzyma oznaczenie „Poprawione przez Ciebie”.
          </p>
        </div>

        <fieldset className="space-y-4">
          <legend className="text-sm font-semibold">Dane osobowe</legend>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              id="import-first-name"
              label="Imię"
              source={fieldSources.firstName}
            >
              <Input
                id="import-first-name"
                value={formData.firstName ?? ""}
                onChange={(event) => onChange("firstName", event.target.value)}
              />
            </Field>
            <Field
              id="import-last-name"
              label="Nazwisko"
              source={fieldSources.lastName}
            >
              <Input
                id="import-last-name"
                value={formData.lastName ?? ""}
                onChange={(event) => onChange("lastName", event.target.value)}
              />
            </Field>
            <Field
              id="import-email"
              label="Adres e-mail"
              source={fieldSources.email}
              className="sm:col-span-2"
            >
              <Input
                id="import-email"
                type="email"
                value={formData.email ?? ""}
                onChange={(event) => onChange("email", event.target.value)}
              />
            </Field>
            <Field
              id="import-birth-date"
              label="Data urodzenia"
              source={fieldSources.birthDate}
            >
              <Input
                id="import-birth-date"
                type="date"
                value={formData.birthDate ?? ""}
                onChange={(event) =>
                  onChange("birthDate", event.target.value || undefined)
                }
              />
            </Field>
            <Field
              id="import-city"
              label="Miejscowość"
              source={fieldSources.city}
            >
              <Input
                id="import-city"
                value={formData.city ?? ""}
                onChange={(event) => onChange("city", event.target.value)}
              />
            </Field>
          </div>
        </fieldset>

        <fieldset className="space-y-4 border-t border-border/70 pt-4">
          <legend className="text-sm font-semibold">Sytuacja rodzinna</legend>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              id="import-event-type"
              label="Sytuacja"
              source={fieldSources.eventType}
            >
              <Select
                id="import-event-type"
                value={formData.eventType ?? ""}
                onChange={(event) =>
                  onChange(
                    "eventType",
                    (event.target.value || undefined) as
                      | ImportedCaseData["eventType"]
                      | undefined
                  )
                }
              >
                <option value="">Wybierz…</option>
                <option value="PREGNANCY">Ciąża</option>
                <option value="BIRTH">Dziecko już się urodziło</option>
                <option value="ADOPTION">Przysposobienie</option>
                <option value="FOSTER_CARE">Rodzina zastępcza</option>
              </Select>
            </Field>
            <Field
              id="import-children-count"
              label="Liczba dzieci z jednego porodu"
              source={fieldSources.childrenCount}
            >
              <Select
                id="import-children-count"
                value={formData.childrenCount?.toString() ?? ""}
                onChange={(event) =>
                  onChange(
                    "childrenCount",
                    event.target.value ? Number(event.target.value) : undefined
                  )
                }
              >
                <option value="">Wybierz…</option>
                {[1, 2, 3, 4, 5].map((count) => (
                  <option key={count} value={count}>
                    {count === 5 ? "5 lub więcej" : count}
                  </option>
                ))}
              </Select>
            </Field>
            <Field
              id="import-due-date"
              label="Przewidywany termin porodu"
              source={fieldSources.expectedDueDate}
            >
              <Input
                id="import-due-date"
                type="date"
                value={formData.expectedDueDate ?? ""}
                onChange={(event) =>
                  onChange("expectedDueDate", event.target.value || undefined)
                }
              />
            </Field>
            <Field
              id="import-event-date"
              label="Data urodzenia / przyjęcia dziecka"
              source={fieldSources.eventDate}
            >
              <Input
                id="import-event-date"
                type="date"
                value={formData.eventDate ?? ""}
                onChange={(event) =>
                  onChange("eventDate", event.target.value || undefined)
                }
              />
            </Field>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <CheckField
              checked={formData.hasZaZyciem ?? false}
              onChange={(checked) => onChange("hasZaZyciem", checked)}
              label="Zaświadczenie „Za życiem”"
              hint="Wydłuża urlop rodzicielski do 65/67 tygodni."
            />
            <CheckField
              checked={formData.isPremature ?? false}
              onChange={(checked) => onChange("isPremature", checked)}
              label="Poród przedwczesny"
              hint="Może uprawniać do uzupełniającego urlopu macierzyńskiego."
            />
          </div>
        </fieldset>

        <fieldset className="space-y-4 border-t border-border/70 pt-4">
          <legend className="text-sm font-semibold">
            Praca i ubezpieczenie
          </legend>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              id="import-employment-type"
              label="Forma zatrudnienia"
              source={fieldSources.employmentType}
            >
              <Select
                id="import-employment-type"
                value={formData.employmentType ?? ""}
                onChange={(event) =>
                  onChange(
                    "employmentType",
                    (event.target.value || undefined) as
                      | ImportedCaseData["employmentType"]
                      | undefined
                  )
                }
              >
                <option value="">Wybierz…</option>
                <option value="EMPLOYMENT">Umowa o pracę</option>
                <option value="MANDATE">Umowa zlecenia</option>
                <option value="SELF_EMPLOYMENT">Działalność gospodarcza</option>
                <option value="OTHER">Inna / brak tytułu</option>
              </Select>
            </Field>
            <Field
              id="import-coverage"
              label="Rodzaj ubezpieczenia chorobowego"
              source={fieldSources.coverageMode}
            >
              <Select
                id="import-coverage"
                value={formData.coverageMode ?? ""}
                onChange={(event) =>
                  onChange(
                    "coverageMode",
                    (event.target.value || undefined) as
                      | ImportedCaseData["coverageMode"]
                      | undefined
                  )
                }
              >
                <option value="">Wybierz…</option>
                <option value="COMPULSORY">Obowiązkowe</option>
                <option value="VOLUNTARY">Dobrowolne</option>
              </Select>
            </Field>
            <Field
              id="import-employer"
              label="Pracodawca / płatnik składek"
              source={fieldSources.employerName}
              className="sm:col-span-2"
            >
              <Input
                id="import-employer"
                value={formData.employerName ?? ""}
                onChange={(event) =>
                  onChange("employerName", event.target.value)
                }
              />
            </Field>
            <Field
              id="import-insurance-start"
              label="Początek ubezpieczenia"
              source={fieldSources.insuranceStartDate}
            >
              <Input
                id="import-insurance-start"
                type="date"
                value={formData.insuranceStartDate ?? ""}
                onChange={(event) =>
                  onChange(
                    "insuranceStartDate",
                    event.target.value || undefined
                  )
                }
              />
            </Field>
            <Field
              id="import-income"
              label="Miesięczny dochód brutto (zł)"
              source={fieldSources.grossMonthlyIncomePln}
            >
              <Input
                id="import-income"
                type="number"
                min={0}
                step={100}
                value={formData.grossMonthlyIncomePln ?? ""}
                onChange={(event) =>
                  onChange(
                    "grossMonthlyIncomePln",
                    event.target.value === ""
                      ? undefined
                      : Number(event.target.value)
                  )
                }
              />
            </Field>
            <Field
              id="import-basis"
              label="Podstawa wymiaru zasiłku (zł)"
              source={fieldSources.monthlyBasisGrosze}
              className="sm:col-span-2"
            >
              <Input
                id="import-basis"
                type="number"
                min={0}
                step={0.01}
                value={
                  formData.monthlyBasisGrosze !== undefined
                    ? formData.monthlyBasisGrosze / 100
                    : ""
                }
                onChange={(event) =>
                  onChange(
                    "monthlyBasisGrosze",
                    event.target.value === ""
                      ? undefined
                      : Math.round(Number(event.target.value) * 100)
                  )
                }
              />
              <p className="text-xs text-muted-foreground">
                Zwykle pochodzi z ZUS. Jeśli pozostanie puste, kalkulator
                wyliczy podstawę z wynagrodzenia brutto.
              </p>
            </Field>
          </div>
        </fieldset>

        <div className="flex flex-col-reverse gap-2 border-t border-border/70 pt-4 sm:flex-row sm:justify-between">
          <Button type="button" variant="outline" onClick={onRecheck} disabled={busy}>
            <RefreshCw aria-hidden="true" />
            Sprawdź ponownie
          </Button>
          <Button type="button" onClick={onAccept} disabled={busy}>
            {busy && <Loader2 aria-hidden="true" className="animate-spin" />}
            Zatwierdź dane i przejdź do formularza
            <ArrowRight data-icon="inline-end" aria-hidden="true" />
          </Button>
        </div>
      </div>

      <div className="space-y-4 lg:sticky lg:top-24">
        <EligibilityPreview preview={preview} />
        <SickLeavePreview analysis={preview.sickLeave} />
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles aria-hidden="true" className="size-4 text-primary" />
              Kalkulator
            </CardTitle>
            <CardDescription>
              Dane trafią też do kalkulatora świadczeń.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Podstawa miesięczna</span>
              <span className="font-medium tabular-nums">
                {formatPln(preview.calculation.basisGrosze)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Dzieci z porodu</span>
              <span className="font-medium">
                {preview.calculation.normalizedChildrenCount}
              </span>
            </div>
            <Button asChild variant="outline" size="sm" className="mt-2">
              <Link href="/kalkulator">
                Otwórz kalkulator
                <ArrowRight data-icon="inline-end" aria-hidden="true" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function EligibilityPreview({ preview }: { preview: PreviewResponse }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ShieldCheck aria-hidden="true" className="size-4 text-primary" />
          Wstępna analiza uprawnień
        </CardTitle>
        <CardDescription>
          Wynik z jawnych reguł, nie decyzja ZUS. Na dzień{" "}
          {formatDate(preview.eligibility.asOf)}.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {preview.eligibility.determinations.map((determination) => (
          <div
            key={determination.benefit}
            className="rounded-lg border border-border/70 p-3 text-sm"
          >
            <Badge variant={eligibilityVariant(determination.status)}>
              {eligibilityLabel(determination.status)}
            </Badge>
            <p className="mt-2 font-medium text-pretty">{determination.label}</p>
            {determination.reasons[0] && (
              <p className="mt-1 text-xs text-pretty text-muted-foreground">
                {determination.reasons[0].text}
              </p>
            )}
            {determination.missingFacts.length > 0 && (
              <p className="mt-1 text-xs text-warning-foreground">
                Brakuje: {determination.missingFacts[0]?.question}
              </p>
            )}
          </div>
        ))}
        <p className="text-xs text-muted-foreground">
          {preview.eligibility.disclaimer}
        </p>
      </CardContent>
    </Card>
  )
}

function SickLeavePreview({ analysis }: { analysis: SickLeaveAnalysis }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Stethoscope aria-hidden="true" className="size-4 text-primary" />
          Zwolnienia e-ZLA
        </CardTitle>
        <CardDescription>
          Tylko daty i związek z ciążą — bez diagnozy.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="flex items-center justify-between gap-3">
          <span className="text-muted-foreground">Łącznie dni</span>
          <span className="font-medium tabular-nums">{analysis.totalDays}</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-muted-foreground">Związane z ciążą</span>
          <span className="font-medium tabular-nums">
            {analysis.pregnancyRelatedDays}
          </span>
        </div>
        <Badge
          variant={
            analysis.status === "OK"
              ? "success"
              : analysis.status === "ATTENTION"
                ? "warning"
                : "secondary"
          }
        >
          {analysis.status === "OK"
            ? "Dane spójne"
            : analysis.status === "ATTENTION"
              ? "Wymaga uwagi"
              : "Wymaga uzupełnienia"}
        </Badge>
        {analysis.periods.length > 0 && (
          <ul className="space-y-1.5 text-xs text-muted-foreground">
            {analysis.periods.map((period) => (
              <li key={`${period.startDate}-${period.endDate}`}>
                {formatDate(period.startDate)} – {formatDate(period.endDate)} ·{" "}
                {period.days} dni{period.pregnancyRelated ? " · ciąża" : ""}
              </li>
            ))}
          </ul>
        )}
        {analysis.warnings.length > 0 && (
          <ul className="list-disc space-y-1 pl-4 text-xs text-muted-foreground">
            {analysis.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}

function eligibilityVariant(
  status: EligibilityAssessment["determinations"][number]["status"]
) {
  switch (status) {
    case "ELIGIBLE":
      return "success" as const
    case "NOT_ELIGIBLE":
      return "destructive" as const
    case "INDETERMINATE":
      return "warning" as const
    case "NEEDS_INPUT":
      return "secondary" as const
  }
}

function eligibilityLabel(
  status: EligibilityAssessment["determinations"][number]["status"]
) {
  switch (status) {
    case "ELIGIBLE":
      return "Spełnia wstępne warunki"
    case "NOT_ELIGIBLE":
      return "Nie spełnia warunków"
    case "INDETERMINATE":
      return "Wymaga oceny"
    case "NEEDS_INPUT":
      return "Brakuje danych"
  }
}

function SourceDataDetails({ result }: { result: SourceFetchResult }) {
  const data = result.data
  if (!data) {
    return (
      <p className="mt-3 rounded-md bg-secondary/40 p-3 text-xs text-muted-foreground">
        To źródło nie przekazało rekordów. Możesz uzupełnić brakujące dane
        ręcznie w następnym kroku.
      </p>
    )
  }

  const sections: Array<{ title: string; rows: Array<[string, string]> }> = []

  if (data.source === "ZUS") {
    if (data.insurancePeriods.length > 0) {
      sections.push({
        title: "Historia ubezpieczenia",
        rows: data.insurancePeriods.map((period) => [
          `${period.payerName} · ${period.coverageMode === "COMPULSORY" ? "obowiązkowe" : "dobrowolne"}`,
          `${formatDate(period.startDate)} – ${period.endDate ? formatDate(period.endDate) : "nadal"}`,
        ]),
      })
    }
    if (data.contributionBases.length > 0) {
      const first = data.contributionBases[0]
      const last = data.contributionBases[data.contributionBases.length - 1]
      sections.push({
        title: "Podstawy wymiaru składek",
        rows: [
          [
            `Zakres: ${first?.period} – ${last?.period}`,
            `${data.contributionBases.length} miesięcy`,
          ],
          ...(data.benefitBasis
            ? ([
                [
                  "Podstawa wymiaru zasiłku",
                  formatPln(data.benefitBasis.averageMonthlyBasisGrosze),
                ],
              ] as Array<[string, string]>)
            : []),
        ],
      })
    }
    if (data.arrears) {
      sections.push({
        title: "Składki i zaległości",
        rows: [
          [
            data.arrears.status === "NONE"
              ? "Brak zaległości"
              : data.arrears.status === "PAID"
                ? "Zaległość spłacona"
                : "Zaległość otwarta",
            formatPln(data.arrears.amountGrosze),
          ],
        ],
      })
    }
  }

  if (data.source === "EMPLOYER") {
    for (const payer of data.payers) {
      sections.push({
        title: "Płatnik składek",
        rows: [
          [payer.name, payer.city],
          ["NIP (syntetyczny)", payer.taxId],
        ],
      })
    }
    for (const employment of data.employments) {
      sections.push({
        title: `Zatrudnienie: ${employment.title}`,
        rows: [
          [
            employment.payerName,
            `${formatDate(employment.startDate)} – ${
              employment.endDate ? formatDate(employment.endDate) : "nadal"
            }`,
          ],
          [
            `Wymiar: ${Math.round(employment.workingTimeFraction * 100)}%`,
            `${formatPln(employment.grossMonthlyAmountGrosze)} brutto`,
          ],
          [
            "Składniki wynagrodzenia",
            `${employment.components.length} · zmiany: ${employment.changes.length}`,
          ],
        ],
      })
    }
  }

  if (data.source === "EZLA") {
    sections.push({
      title: "Zwolnienia lekarskie",
      rows:
        data.sickLeaves.length > 0
          ? data.sickLeaves.map((leave) => [
              `${formatDate(leave.startDate)} – ${formatDate(leave.endDate)}`,
              `${leave.days} dni${leave.pregnancyRelated ? " · ciąża" : ""} · ${leave.status === "FINISHED" ? "zakończone" : "aktywne"}`,
            ])
          : [["Brak zwolnień w źródle", "—"]],
    })
  }

  if (data.source === "USC") {
    for (const child of data.children) {
      sections.push({
        title: `Dziecko: ${child.firstName}`,
        rows: [
          ["Data urodzenia", formatDate(child.birthDate)],
          [
            `Dzieci z jednego porodu: ${child.childrenInBirth}`,
            child.isAdopted ? "Przysposobienie" : "Urodzenie",
          ],
        ],
      })
    }
    if (data.familyEvents.length > 0) {
      sections.push({
        title: "Zdarzenie rodzinne",
        rows: data.familyEvents.map((event) => [
          event.type === "BIRTH" ? "Urodzenie" : event.type,
          event.eventDate ? formatDate(event.eventDate) : "—",
        ]),
      })
    }
  }

  if (data.source === "PUE") {
    for (const item of data.cases) {
      sections.push({
        title: `Sprawa ${item.caseNumber}`,
        rows: [
          [item.applicationType, item.status],
          [
            item.periodFrom && item.periodTo
              ? `${formatDate(item.periodFrom)} – ${formatDate(item.periodTo)}`
              : "Okres nieokreślony",
            item.amountGrosze !== null ? formatPln(item.amountGrosze) : "—",
          ],
          [
            item.decisionNumber
              ? `Decyzja ${item.decisionNumber}`
              : "Brak decyzji",
            item.decisionDate ? formatDate(item.decisionDate) : "—",
          ],
        ],
      })
    }
    if (data.documents.length > 0) {
      sections.push({
        title: "Dokumenty i zaświadczenia",
        rows: data.documents.map((document) => [
          document.title,
          document.available ? "Dostępny" : "Niedostępny",
        ]),
      })
    }
  }

  if (sections.length === 0) {
    return (
      <p className="mt-3 rounded-md bg-secondary/40 p-3 text-xs text-muted-foreground">
        Źródło odpowiedziało, ale nie zwróciło rekordów w wybranym zakresie.
      </p>
    )
  }

  return (
    <details className="mt-3 rounded-md border border-border/60 bg-secondary/20 p-3">
      <summary className="cursor-pointer text-sm font-medium">
        Podejrzyj pobrane rekordy ({countRecords(result)})
      </summary>
      <div className="mt-3 space-y-4">
        {sections.map((section) => (
          <div key={`${result.source}-${section.title}`}>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {section.title}
            </p>
            <dl className="mt-1.5 grid gap-1.5">
              {section.rows.map(([label, value], index) => (
                <div
                  key={`${section.title}-${index}`}
                  className="flex flex-wrap items-start justify-between gap-2 text-sm"
                >
                  <dt className="text-pretty">{label}</dt>
                  <dd className="font-medium text-muted-foreground">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
      </div>
    </details>
  )
}

function SummaryMetric({
  label,
  value,
  hint,
}: {
  label: string
  value: number
  hint: string
}) {
  return (
    <div className="rounded-lg border border-border/70 bg-secondary/30 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-2xl font-semibold tabular-nums">{value}</p>
      <p className="text-xs text-muted-foreground">{hint}</p>
    </div>
  )
}

function Field({
  id,
  label,
  source,
  className,
  children,
}: {
  id: string
  label: string
  source?: FieldSource
  className?: string
  children: ReactNode
}) {
  return (
    <div className={`flex min-w-0 flex-col gap-1.5 ${className ?? ""}`}>
      <Label htmlFor={id} className="block truncate" title={label}>
        {label}
      </Label>
      {children}
      <OriginBadge source={source} />
    </div>
  )
}

function CheckField({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
  hint: string
}) {
  return (
    <label className="flex items-start gap-3 rounded-lg border border-border/70 p-3 text-sm">
      <input
        type="checkbox"
        className="mt-0.5 size-4 accent-[var(--primary)]"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span>
        <span className="font-medium">{label}</span>
        <span className="block text-xs text-muted-foreground">{hint}</span>
      </span>
    </label>
  )
}
