"use client"

import Link from "next/link"
import { useEffect, useId, useMemo, useRef, useState, type FormEvent } from "react"
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  FileText,
  Info,
  Loader2,
  ScanLine,
  ShieldCheck,
  Trash2,
  Upload,
  XCircle,
} from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@workspace/ui/components/alert"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { Progress } from "@workspace/ui/components/progress"
import { Select } from "@workspace/ui/components/select"
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@workspace/ui/components/table"
import { cn } from "@workspace/ui/lib/utils"
import {
  DOCUMENT_PREFILL_STORAGE_KEY,
  DOCUMENT_PROCESSING_CONSENT,
  MAX_DOCUMENT_BYTES,
  applyBlockers,
  type DocumentAssessment,
  type DocumentExtraction,
  type DocumentMeta,
  type ExtractedField,
  type SampleCaseSummary,
  type ValidationFinding,
} from "@zpr/contracts/documents"
import type { CaseProfile, CaseProfileComparison } from "@zpr/contracts/case-profile"

import { serializeDocumentPrefill } from "@/lib/document-prefill"
import { readCaseProfile } from "@/lib/situation-profile"
import { formatDate, formatPln } from "@/lib/format"
import { documents as t } from "@/messages/pl"

type Problem = { detail?: string; title?: string }

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, credentials: "same-origin" })
  if (response.status === 204) return undefined as T
  const body = (await response.json().catch(() => ({}))) as T & Problem
  if (!response.ok) throw new Error(body.detail ?? body.title ?? t.errors.generic)
  return body
}

const severityVariant = { ERROR: "destructive", WARNING: "warning", INFO: "info" } as const

function displayValue(field: ExtractedField): string {
  return field.value
}

export function DocumentAnalyzer() {
  const [samples, setSamples] = useState<SampleCaseSummary[] | null>(null)
  const [samplesError, setSamplesError] = useState(false)
  const [aiAvailable, setAiAvailable] = useState(false)
  const [selectedSample, setSelectedSample] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [consent, setConsent] = useState(false)
  const [aiAssist, setAiAssist] = useState(false)
  const [meta, setMeta] = useState<DocumentMeta | null>(null)
  const [extraction, setExtraction] = useState<DocumentExtraction | null>(null)
  const [fields, setFields] = useState<ExtractedField[]>([])
  const [assessment, setAssessment] = useState<DocumentAssessment | null>(null)
  const [previewPage, setPreviewPage] = useState(1)
  const [pending, setPending] = useState<"analyze" | "confirm" | "delete" | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<string>("")
  const [profile, setProfile] = useState<CaseProfile | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const consentId = useId()

  useEffect(() => {
    setProfile(readCaseProfile(window.sessionStorage))
  }, [])

  useEffect(() => {
    let cancelled = false
    request<{ sampleCases: SampleCaseSummary[]; features?: { aiAssist?: boolean } }>("/api/v1/sample-cases")
      .then((body) => {
        if (cancelled) return
        setSamples(body.sampleCases)
        setAiAvailable(Boolean(body.features?.aiAssist))
      })
      .catch(() => !cancelled && setSamplesError(true))
    return () => {
      cancelled = true
    }
  }, [])

  const blockers = useMemo(() => applyBlockers(fields), [fields])
  const errors = extraction?.findings.filter((finding) => finding.severity === "ERROR" && !finding.fieldKey) ?? []
  const canApply = Boolean(extraction) && blockers.length === 0 && errors.length === 0 && pending === null

  function reset() {
    setMeta(null)
    setExtraction(null)
    setFields([])
    setAssessment(null)
    setSelectedSample(null)
    setFileName(null)
    setPreviewPage(1)
    setError(null)
    if (inputRef.current) inputRef.current.value = ""
  }

  function showExtraction(loaded: DocumentMeta, result: DocumentExtraction) {
    setMeta(loaded)
    setExtraction(result)
    setFields(result.fields)
    setAssessment(null)
    setPreviewPage(1)
    setStatus(`${result.formTitle}. ${result.fields.length} pól do sprawdzenia.`)
  }

  async function onSample(sampleId: string) {
    setPending("analyze")
    setError(null)
    setSelectedSample(sampleId)
    try {
      const body = await request<{ document: DocumentMeta; extraction: DocumentExtraction }>(`/api/v1/sample-cases/${encodeURIComponent(sampleId)}/load`, { method: "POST" })
      showExtraction(body.document, body.extraction)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : t.errors.generic)
    } finally {
      setPending(null)
    }
  }

  async function onFileSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const file = inputRef.current?.files?.[0]
    if (!file) return setError(t.errors.noFile)
    if (file.size > MAX_DOCUMENT_BYTES) return setError(t.errors.tooLarge)
    if (!file.name.toLowerCase().endsWith(".pdf") && file.type !== "application/pdf") return setError(t.errors.notPdf)
    if (!consent) return setError(t.errors.noConsent)

    setPending("analyze")
    setError(null)
    setSelectedSample(null)
    try {
      const form = new FormData()
      form.set("file", file)
      form.set("consent", DOCUMENT_PROCESSING_CONSENT)
      const uploaded = await request<DocumentMeta>("/api/v1/documents", { method: "POST", body: form })
      const result = await request<DocumentExtraction>(`/api/v1/documents/${uploaded.documentId}/extract`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(aiAvailable && aiAssist ? { allowAiAssist: true } : {}),
      })
      showExtraction(uploaded, result)
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : t.errors.generic)
    } finally {
      setPending(null)
    }
  }

  function updateField(key: string, patch: Partial<Pick<ExtractedField, "value" | "confirmed">>) {
    setAssessment(null)
    setFields((current) =>
      current.map((field) => {
        if (field.key !== key) return field
        const changed = patch.value !== undefined && patch.value !== field.value
        return { ...field, ...patch, userEdited: field.userEdited || changed, source: changed ? "USER" : field.source }
      })
    )
  }

  function confirmFilled() {
    setAssessment(null)
    setFields((current) => current.map((field) => (field.value.trim() !== "" ? { ...field, confirmed: true } : field)))
  }

  async function onApply() {
    if (!meta || !canApply) return
    setPending("confirm")
    setError(null)
    try {
      const result = await request<DocumentAssessment>(`/api/v1/documents/${meta.documentId}/fields`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          fields: fields.map(({ key, value, confirmed }) => ({ key, value, confirmed })),
          ...(profile ? { profile } : {}),
        }),
      })
      setAssessment(result)
      setExtraction(result.extraction)
      setFields(result.extraction.fields)
      if (result.status === "CONFIRMED" && result.mapping.prefill) {
        try {
          window.sessionStorage.setItem(DOCUMENT_PREFILL_STORAGE_KEY, serializeDocumentPrefill(result.mapping.prefill))
        } catch {
          // Storage unavailable: the calculator simply opens without a prefill.
        }
      }
      setStatus(result.status === "CONFIRMED" ? t.resultTitle : t.blockersTitle)
    } catch (confirmError) {
      setError(confirmError instanceof Error ? confirmError.message : t.errors.generic)
    } finally {
      setPending(null)
    }
  }

  async function onDelete() {
    if (!meta) return
    setPending("delete")
    try {
      await request<void>(`/api/v1/documents/${meta.documentId}`, { method: "DELETE" })
      reset()
      setStatus(t.deleted)
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : t.errors.generic)
    } finally {
      setPending(null)
    }
  }

  const findings = extraction?.findings ?? []
  const legacy = extraction?.legacyForm ? findings.find((finding) => finding.code === "FORM_WITHDRAWN" || finding.code === "FORM_PRE_REFORM") : undefined

  return (
    <div className="space-y-6">
      <p className="sr-only" aria-live="polite" role="status">
        {status}
      </p>

      {profile ? (
        <Alert variant="info" data-testid="case-profile-banner">
          <Info aria-hidden="true" />
          <AlertTitle>Porównujemy dokument z Twoją sprawą</AlertTitle>
          <AlertDescription>
            Profil: {profile.label}
            {profile.savedCaseNumber ? ` · sprawa ${profile.savedCaseNumber}` : ""}. Użyjemy
            danych, które już podano w kreatorze.{" "}
            <Link href="/start" className="underline underline-offset-4">
              Zmień profil
            </Link>
          </AlertDescription>
        </Alert>
      ) : (
        <Alert data-testid="no-case-profile">
          <Info aria-hidden="true" />
          <AlertTitle>Nie mamy jeszcze profilu sprawy</AlertTitle>
          <AlertDescription>
            Możesz sprawdzić dokument bez profilu. Aby porównać go z Twoją
            sytuacją i nie wpisywać danych drugi raz,{" "}
            <Link href="/start" className="underline underline-offset-4">
              opisz najpierw swoją sytuację
            </Link>
            .
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:items-start">
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ScanLine aria-hidden="true" className="size-4 text-primary" />
                {t.samplesTitle}
              </CardTitle>
              <CardDescription>{t.samplesLead}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {!samples && !samplesError && <p className="text-sm text-muted-foreground">{t.samplesLoading}</p>}
              {samplesError && <p className="text-sm text-destructive">{t.samplesError}</p>}
              {samples?.map((sample) => (
                <button
                  key={sample.id}
                  type="button"
                  onClick={() => void onSample(sample.id)}
                  disabled={pending !== null}
                  aria-pressed={selectedSample === sample.id}
                  data-sample={sample.id}
                  className={cn(
                    "w-full rounded-lg border p-3 text-left transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none disabled:opacity-50",
                    selectedSample === sample.id ? "border-primary bg-primary/5" : "border-border/70"
                  )}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium">{sample.label}</span>
                    <Badge variant="outline" className="font-mono text-[10px]">
                      {sample.formCode}
                    </Badge>
                  </span>
                  <span className="mt-1 block text-xs text-pretty text-muted-foreground">{sample.description}</span>
                  <span className="mt-1 block text-[11px] text-muted-foreground">
                    {sample.code} · {sample.watermark}
                  </span>
                </button>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload aria-hidden="true" className="size-4 text-primary" />
                {t.uploadTitle}
              </CardTitle>
              <CardDescription>{t.uploadLead}</CardDescription>
            </CardHeader>
            <form onSubmit={onFileSubmit} noValidate>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="document-file">{t.fileLabel}</Label>
                  <Input
                    ref={inputRef}
                    id="document-file"
                    type="file"
                    accept="application/pdf,.pdf"
                    onChange={(event) => setFileName(event.target.files?.[0]?.name ?? null)}
                  />
                  {fileName && (
                    <p className="text-xs text-muted-foreground">
                      {t.fileChosen}: {fileName}
                    </p>
                  )}
                </div>
                <div className="flex items-start gap-3 rounded-lg border border-border/70 p-3 text-sm">
                  <input
                    id={consentId}
                    type="checkbox"
                    className="mt-0.5 size-4 accent-[var(--primary)]"
                    checked={consent}
                    onChange={(event) => setConsent(event.target.checked)}
                    aria-describedby={`${consentId}-help`}
                  />
                  <span>
                    <label htmlFor={consentId} className="font-medium">
                      {t.consentLabel}
                    </label>
                    <span id={`${consentId}-help`} className="block text-xs text-muted-foreground">
                      {t.consentHelp}
                    </span>
                  </span>
                </div>
                {aiAvailable && (
                  <label className="flex items-start gap-3 text-xs">
                    <input type="checkbox" className="mt-0.5 size-4" checked={aiAssist} onChange={(event) => setAiAssist(event.target.checked)} />
                    <span>{t.aiAssistLabel}</span>
                  </label>
                )}
                <Button type="submit" disabled={pending !== null} className="w-full">
                  {pending === "analyze" ? <Loader2 aria-hidden="true" className="animate-spin" /> : <FileText aria-hidden="true" />}
                  {pending === "analyze" ? t.analyzing : t.analyze}
                </Button>
              </CardContent>
            </form>
          </Card>

          <div aria-live="assertive">
            {error && (
              <Alert variant="destructive">
                <AlertTriangle aria-hidden="true" />
                <AlertTitle>{t.errorTitle}</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </div>

          {meta && extraction && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t.previewTitle}</CardTitle>
                <CardDescription>
                  {t.pagesLabel}: {extraction.pages}
                  {extraction.origin === "SAMPLE_CASE" ? ` · ${t.sampleBadge}` : ""}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <object
                  key={`${meta.documentId}-${previewPage}`}
                  data={`${meta.previewPath}#page=${previewPage}`}
                  type="application/pdf"
                  aria-label={`${t.previewTitle}: ${extraction.formTitle}`}
                  className="h-[28rem] w-full rounded-lg border border-border/70 bg-muted"
                >
                  <p className="p-3 text-sm text-muted-foreground">{t.previewFallback}</p>
                </object>
                <a href={`${meta.previewPath}#page=${previewPage}`} target="_blank" rel="noopener" className="text-xs text-primary underline-offset-4 hover:underline">
                  {t.previewOpen}
                </a>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="min-w-0 space-y-4" aria-live="polite" aria-busy={pending !== null}>
          {!extraction ? (
            <Card className="border-dashed">
              <CardHeader>
                <CardTitle>{t.emptyTitle}</CardTitle>
                <CardDescription>{t.emptyLead}</CardDescription>
              </CardHeader>
            </Card>
          ) : (
            <Card>
              <CardHeader className="border-b border-border/70">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <CardTitle data-testid="detected-form">{extraction.formTitle}</CardTitle>
                    <CardDescription>
                      {t.methodLabel}: {t.methods[extraction.extractionMethod]} · {t.formLabel}:{" "}
                      <span className="font-mono">{extraction.detectedForm}</span>
                    </CardDescription>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {extraction.legacyForm && <Badge variant="destructive">{t.legacyBadge}</Badge>}
                    <Badge variant={assessment?.status === "CONFIRMED" ? "success" : "warning"}>
                      {assessment?.status === "CONFIRMED" ? t.confirmedBadge : t.needsReviewBadge}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {legacy && (
                  <Alert variant={legacy.code === "FORM_WITHDRAWN" ? "destructive" : "info"} data-testid="legacy-form-alert">
                    <XCircle aria-hidden="true" />
                    <AlertTitle>{t.legacyTitle}</AlertTitle>
                    <AlertDescription>
                      {legacy.message}
                      {legacy.legalBasis && (
                        <span className="mt-1 block text-xs">
                          {t.legalBasis}: {legacy.legalBasis}
                        </span>
                      )}
                    </AlertDescription>
                  </Alert>
                )}

                <FieldsTable fields={fields} onChange={updateField} onPage={setPreviewPage} />

                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={confirmFilled} disabled={pending !== null}>
                    <CheckCircle2 aria-hidden="true" />
                    {t.confirmAll}
                  </Button>
                </div>

                <Findings findings={findings.filter((finding) => finding !== legacy)} />

                {blockers.length > 0 && (
                  <Alert variant="warning" data-testid="apply-blockers">
                    <AlertTriangle aria-hidden="true" />
                    <AlertTitle>{t.blockersTitle}</AlertTitle>
                    <AlertDescription>
                      <ul className="list-disc space-y-0.5 pl-4">
                        {blockers.map((blocker) => (
                          <li key={blocker.key}>
                            {blocker.label} — {t.blockerReasons[blocker.reason]}
                          </li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}

                <div className="flex flex-wrap gap-2">
                  <Button type="button" onClick={() => void onApply()} disabled={!canApply} aria-disabled={!canApply}>
                    {pending === "confirm" ? <Loader2 aria-hidden="true" className="animate-spin" /> : <CheckCircle2 aria-hidden="true" />}
                    {pending === "confirm" ? t.applying : t.apply}
                  </Button>
                  {assessment?.status === "CONFIRMED" && assessment.mapping.prefill && (
                    <Button asChild variant="secondary">
                      <Link href="/kalkulator">
                        {t.toCalculator}
                        <ArrowRight data-icon="inline-end" aria-hidden="true" />
                      </Link>
                    </Button>
                  )}
                  <Button type="button" variant="outline" onClick={() => void onDelete()} disabled={pending !== null}>
                    <Trash2 aria-hidden="true" />
                    {t.delete}
                  </Button>
                  <Button type="button" variant="ghost" onClick={reset} disabled={pending !== null}>
                    {t.clear}
                  </Button>
                </div>

                <p className="flex items-start gap-2 text-xs text-muted-foreground">
                  <ShieldCheck aria-hidden="true" className="mt-0.5 size-3.5 shrink-0 text-success" />
                  {extraction.processedLocally ? t.localNote : t.aiNote}
                </p>
              </CardContent>
            </Card>
          )}

          {assessment && <AssessmentView assessment={assessment} />}
        </div>
      </div>
    </div>
  )
}

function FieldsTable({
  fields,
  onChange,
  onPage,
}: {
  fields: ExtractedField[]
  onChange: (key: string, patch: Partial<Pick<ExtractedField, "value" | "confirmed">>) => void
  onPage: (page: number) => void
}) {
  return (
    <div>
      <Table>
        <TableCaption>{t.fieldsCaption}</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>{t.colField}</TableHead>
            <TableHead>{t.colValue}</TableHead>
            <TableHead>{t.colConfidence}</TableHead>
            <TableHead>{t.colConfirm}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {fields.map((field) => {
            const id = `field-${field.key}`
            const percent = Math.round(field.confidence * 100)
            return (
              <TableRow key={field.key} data-field={field.key} className={cn(field.needsReview && !field.confirmed && "bg-warning/5")}>
                <TableCell className="align-top whitespace-normal">
                  <Label htmlFor={id} className="font-normal">
                    {field.label}
                    {field.required && <span className="ml-1 text-[11px] text-destructive">({t.requiredMark})</span>}
                  </Label>
                  <span className="mt-0.5 flex flex-wrap items-center gap-1 text-[11px] text-muted-foreground">
                    {t.colSource}: {t.sources[field.source]}
                    {field.page && (
                      <button type="button" className="underline underline-offset-2 hover:text-foreground" onClick={() => onPage(field.page!)}>
                        {t.page} {field.page}
                      </button>
                    )}
                    {field.userEdited && <Badge variant="info" className="text-[10px]">{t.editedMark}</Badge>}
                    {field.needsReview && !field.userEdited && field.value !== "" && <Badge variant="warning" className="text-[10px]">{t.reviewMark}</Badge>}
                  </span>
                </TableCell>
                <TableCell className="min-w-44 align-top whitespace-normal">
                  {field.options ? (
                    <Select id={id} value={field.value} onChange={(event) => onChange(field.key, { value: event.target.value })} className="h-8">
                      <option value="">— {t.emptyValue} —</option>
                      {field.options.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </Select>
                  ) : field.type === "BOOLEAN" ? (
                    <Select id={id} value={field.value} onChange={(event) => onChange(field.key, { value: event.target.value })} className="h-8">
                      <option value="">— {t.emptyValue} —</option>
                      <option value="true">Tak</option>
                      <option value="false">Nie</option>
                    </Select>
                  ) : (
                    <Input
                      id={id}
                      value={displayValue(field)}
                      placeholder={field.type === "DATE" ? "RRRR-MM-DD" : field.type === "MONEY" ? "np. 6000,00" : t.emptyValue}
                      inputMode={field.type === "MONEY" || field.type === "INTEGER" ? "decimal" : undefined}
                      onChange={(event) => onChange(field.key, { value: event.target.value })}
                      className="h-8"
                    />
                  )}
                </TableCell>
                <TableCell className="w-24 align-top">
                  <Progress value={percent} label={`${t.colConfidence} — ${field.label}: ${percent}%`} />
                  <span className="mt-1 block text-[11px] text-muted-foreground tabular-nums">{percent}%</span>
                </TableCell>
                <TableCell className="w-16 align-top">
                  <input
                    type="checkbox"
                    className="size-5 accent-[var(--primary)]"
                    checked={field.confirmed}
                    onChange={(event) => onChange(field.key, { confirmed: event.target.checked })}
                    aria-label={`${t.colConfirm}: ${field.label}`}
                  />
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}

function Findings({ findings }: { findings: ValidationFinding[] }) {
  if (findings.length === 0) return null
  return (
    <section aria-labelledby="findings-title" className="space-y-2">
      <h3 id="findings-title" className="text-sm font-medium">
        {t.findingsTitle}
      </h3>
      <ul className="space-y-2">
        {findings.map((finding, index) => (
          <li key={`${finding.code}-${finding.fieldKey ?? index}`} data-finding={finding.code}>
            <Alert variant={severityVariant[finding.severity]}>
              {finding.severity === "INFO" ? <Info aria-hidden="true" /> : <AlertTriangle aria-hidden="true" />}
              <AlertTitle className="text-xs">{t.severity[finding.severity]}</AlertTitle>
              <AlertDescription className="text-xs">
                {finding.message}
                {finding.legalBasis && (
                  <span className="mt-0.5 block text-muted-foreground">
                    {t.legalBasis}: {finding.legalBasis}
                  </span>
                )}
              </AlertDescription>
            </Alert>
          </li>
        ))}
      </ul>
    </section>
  )
}

function AssessmentView({ assessment }: { assessment: DocumentAssessment }) {
  if (assessment.status !== "CONFIRMED" || !assessment.calculation || !assessment.eligibility) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t.missingTitle}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <ul className="list-disc pl-4">
            {assessment.mapping.missing.map((item) => (
              <li key={item.semanticKey}>{item.label}</li>
            ))}
          </ul>
          {assessment.mapping.notes.map((note) => (
            <p key={note} className="text-xs text-muted-foreground">
              {note}
            </p>
          ))}
        </CardContent>
      </Card>
    )
  }

  const { calculation, eligibility } = assessment
  const benefits = calculation.applicableBenefits
  const deadlines = (assessment.timeline ?? []).filter((entry) => entry.kind === "DEADLINE")

  return (
    <div className="space-y-4" data-testid="document-assessment">
      {assessment.profileComparison && (
        <ProfileComparisonView comparison={assessment.profileComparison} />
      )}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t.resultTitle}</CardTitle>
          <CardDescription>
            {calculation.ruleSet.label} · {eligibility.disclaimer}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {assessment.comparison && (
            <Alert variant={assessment.comparison.matches ? "success" : "destructive"} data-testid="sample-comparison">
              {assessment.comparison.matches ? <CheckCircle2 aria-hidden="true" /> : <XCircle aria-hidden="true" />}
              <AlertTitle>
                {t.comparisonTitle}: {assessment.comparison.matches ? `✓ ${t.comparisonOk}` : `✗ ${t.comparisonFail}`}
              </AlertTitle>
              <AlertDescription className="text-xs">{assessment.comparison.details.join(" · ")}</AlertDescription>
            </Alert>
          )}
          <dl className="grid gap-2 text-sm sm:grid-cols-2">
            {calculation.basis.map((basis) => (
              <div key={basis.parent} className="rounded-lg border border-border/70 p-3">
                <dt className="text-xs text-muted-foreground">
                  {t.basis} ({t.parents[basis.parent]})
                </dt>
                <dd className="font-medium tabular-nums" data-testid={`basis-${basis.parent}`}>
                  {basis.monthlyBasisGrosze !== null ? formatPln(basis.monthlyBasisGrosze) : t.amountUnknown}
                </dd>
              </div>
            ))}
            <div className="rounded-lg border border-border/70 p-3">
              <dt className="text-xs text-muted-foreground">{t.amount}</dt>
              <dd className="font-medium tabular-nums" data-testid="total-amount">
                {calculation.totals.totalGrosze !== null ? formatPln(calculation.totals.totalGrosze) : t.amountUnknown}
              </dd>
            </div>
          </dl>
          <Table>
            <TableCaption>{t.verdict}</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead>{t.colField}</TableHead>
                <TableHead>{t.verdict}</TableHead>
                <TableHead className="text-right">{t.amount}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {benefits.map((benefit) => (
                <TableRow key={`${benefit.parent}-${benefit.benefit}`} data-benefit={benefit.benefit}>
                  <TableCell className="whitespace-normal">
                    {benefit.label} <span className="text-xs text-muted-foreground">({t.parents[benefit.parent]})</span>
                  </TableCell>
                  <TableCell>{t.statuses[benefit.status]}</TableCell>
                  <TableCell className="text-right tabular-nums">{benefit.amountGrosze !== null ? formatPln(benefit.amountGrosze) : t.amountUnknown}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {assessment.routing && assessment.routing.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t.routingTitle}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            {assessment.routing.map((route) => (
              <p key={route.parent}>
                <span className="font-medium">
                  {t.parents[route.parent]} — {t.payer}: {t.payers[route.payer]}.
                </span>{" "}
                {route.explanation}
              </p>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base" id="checklist-title">
            {t.checklistTitle}
          </CardTitle>
          <CardDescription>{t.checklistLead}</CardDescription>
        </CardHeader>
        <CardContent>
          <ul aria-labelledby="checklist-title" data-testid="document-checklist" className="divide-y divide-border/70">
            {assessment.checklist.map((item) => (
              <li key={item.id} className="space-y-1 py-3 text-sm first:pt-0 last:pb-0">
                <p className="font-medium text-pretty">{item.title}</p>
                <dl className="grid gap-x-4 gap-y-0.5 text-xs sm:grid-cols-[auto_1fr]">
                  <dt className="text-muted-foreground">{t.checklistCols.who}</dt>
                  <dd>{t.preparedBy[item.preparedBy] ?? item.preparedBy}</dd>
                  <dt className="text-muted-foreground">{t.checklistCols.where}</dt>
                  <dd>{t.submitTo[item.submitTo] ?? item.submitTo}</dd>
                  <dt className="text-muted-foreground">{t.checklistCols.when}</dt>
                  <dd>
                    {item.dueDate ? <span className="font-medium">{formatDate(item.dueDate)}. </span> : null}
                    {item.when}
                  </dd>
                  <dt className="text-muted-foreground">{t.legalBasis}</dt>
                  <dd>{item.legalBasis}</dd>
                </dl>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {deadlines.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t.deadlinesTitle}</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1 text-sm" data-testid="document-deadlines">
              {deadlines.map((entry) => (
                <li key={entry.id}>
                  <span className="font-medium tabular-nums">{formatDate(entry.date)}</span> — {entry.title}
                  <span className="block text-xs text-muted-foreground">{entry.detail}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function ProfileComparisonView({
  comparison,
}: {
  comparison: CaseProfileComparison
}) {
  const groups: Array<{
    title: string
    rows: CaseProfileComparison["matches"]
    variant: "success" | "warning" | "destructive"
    empty: string
  }> = [
    {
      title: "Zgodne z profilem",
      rows: comparison.matches,
      variant: "success",
      empty: "Brak pól, które można było porównać.",
    },
    {
      title: "Brakuje w dokumencie",
      rows: comparison.missingInDocument,
      variant: "warning",
      empty: "Dokument zawiera wszystkie porównywane dane.",
    },
    {
      title: "Wykryte rozbieżności",
      rows: comparison.mismatches,
      variant: "destructive",
      empty: "Nie wykryto rozbieżności w porównywanych polach.",
    },
  ]

  return (
    <Card data-testid="profile-comparison">
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2 text-base">
          Porównanie z Twoją sprawą
          <Badge variant={comparison.status === "MATCH" ? "success" : "warning"}>
            {comparison.status === "MATCH" ? "brak rozbieżności" : "wymaga uwagi"}
          </Badge>
        </CardTitle>
        <CardDescription>
          To zestawienie faktów, nie ocena kompletności ani decyzja ZUS.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        {groups.map((group) => (
          <section key={group.title}>
            <h3 className="flex items-center gap-2 text-sm font-medium">
              {group.variant === "success" ? (
                <CheckCircle2 aria-hidden="true" className="size-4 text-success" />
              ) : group.variant === "warning" ? (
                <AlertTriangle aria-hidden="true" className="size-4 text-warning-foreground" />
              ) : (
                <XCircle aria-hidden="true" className="size-4 text-destructive" />
              )}
              {group.title}
            </h3>
            {group.rows.length === 0 ? (
              <p className="mt-1 text-xs text-muted-foreground">{group.empty}</p>
            ) : (
              <ul className="mt-1 space-y-1">
                {group.rows.map((row) => (
                  <li
                    key={`${group.title}-${row.label}`}
                    className="rounded-md border border-border/70 p-2 text-xs"
                  >
                    <span className="font-medium">{row.label}:</span> w sprawie „
                    {row.profile}”, w dokumencie „{row.document}”.
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}

        {comparison.manualReview.length > 0 && (
          <section>
            <h3 className="text-sm font-medium">Wymaga ręcznej weryfikacji</h3>
            <ul className="mt-1 list-disc space-y-1 pl-4 text-xs text-muted-foreground">
              {comparison.manualReview.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
        )}

        <section>
          <h3 className="text-sm font-medium">Sugerowane działania</h3>
          <ul className="mt-1 list-disc space-y-1 pl-4 text-xs text-muted-foreground">
            {comparison.suggestions.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>

        <p className="text-xs text-pretty text-muted-foreground">{comparison.disclaimer}</p>
      </CardContent>
    </Card>
  )
}
