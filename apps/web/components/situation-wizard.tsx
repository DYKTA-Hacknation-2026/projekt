"use client"

import Link from "next/link"
import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react"
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Info,
  Loader2,
  Save,
  ShieldCheck,
  Sparkles,
} from "lucide-react"

import { importPrefillStorageSchema } from "@zpr/contracts/data-import"
import type { CaseProfile } from "@zpr/contracts/case-profile"
import type { MobywatelProfile } from "@zpr/contracts/mobywatel"
import {
  QUESTIONS,
  STEP_META,
  WIZARD_STEPS,
  emptySituationAnswers,
  missingAnswers,
  scenarioLabel,
  situationSummary,
  questionsForStep,
  toSituationAssessmentRequest,
  validateStep,
  type AnswerKey,
  type ContactDetails,
  type QuestionDefinition,
  type SituationAnswers,
} from "@zpr/domain"
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
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { Progress } from "@workspace/ui/components/progress"
import { Select } from "@workspace/ui/components/select"
import { cn } from "@workspace/ui/lib/utils"

import {
  readCaseProfile,
  readSituationAnswers,
  writeCaseProfile,
  writeSituationAnswers,
} from "@/lib/situation-profile"
import {
  SituationResults,
  type SituationAnalysis,
} from "@/components/situation/situation-results"

type AnalysisStage = "idle" | "calculation" | "documents" | "done"

interface OnboardingResponse {
  caseNumber?: string
  detail?: string
  issues?: Array<{ path: string; message: string }>
}

interface ImportPrefillState {
  sessionId: string
  label: string
}

const EMPLOYMENT_TO_ONBOARDING = {
  EMPLOYMENT: "EMPLOYMENT",
  MANDATE: "MANDATE",
  SELF_EMPLOYMENT: "SELF_EMPLOYMENT",
  OTHER: "OTHER",
  NONE: "OTHER",
} as const

const CONSENT_COPY = [
  {
    key: "healthData" as const,
    title: "Dane o ciąży i zdrowiu",
    description:
      "Potrzebne tylko do sprawdzenia uprawnień związanych z ciążą i porodem. Możesz zapisać sprawę bez tej zgody.",
  },
  {
    key: "aiAssistant" as const,
    title: "Asystent AI",
    description:
      "Osobna zgoda na rozmowę z asystentem. Asystent nie decyduje o uprawnieniach ani kwotach.",
  },
  {
    key: "documentProcessing" as const,
    title: "Analiza dokumentów",
    description:
      "Osobna zgoda na lokalną analizę przesłanego wniosku. Bez niej kreator nadal działa.",
  },
]

const useHydrationEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  })
  const data = (await response.json().catch(() => ({}))) as {
    detail?: string
    issues?: Array<{ path: string; message: string }>
  }
  if (!response.ok) {
    const issue = data.issues?.[0]
    throw new Error(
      issue
        ? `${issue.path}: ${issue.message}`
        : (data.detail ?? "Nie udało się wykonać analizy.")
    )
  }
  return data as T
}

function scenarioFromEvent(eventType: string): {
  scenario: SituationAnswers["scenario"]
  careKind: string
} {
  if (eventType === "BIRTH") return { scenario: "BIRTH", careKind: "" }
  if (eventType === "ADOPTION")
    return { scenario: "CARE", careKind: "ADOPTION" }
  if (eventType === "FOSTER_CARE")
    return { scenario: "CARE", careKind: "FOSTER_CARE" }
  return { scenario: "PREGNANCY", careKind: "" }
}

function onboardingEventType(
  answers: SituationAnswers
): "PREGNANCY" | "BIRTH" | "ADOPTION" | "FOSTER_CARE" {
  if (answers.scenario === "CARE") {
    return answers.careKind === "FOSTER_CARE" ? "FOSTER_CARE" : "ADOPTION"
  }
  if (answers.birthDate) return "BIRTH"
  return "PREGNANCY"
}

function buildCaseProfile(
  answers: SituationAnswers,
  analysis: SituationAnalysis | null,
  request: ReturnType<typeof toSituationAssessmentRequest>,
  savedCaseNumber?: string
): CaseProfile {
  const today = new Date().toISOString()
  return {
    version: 1,
    scenario: (answers.scenario || "PREGNANCY") as CaseProfile["scenario"],
    label: scenarioLabel(answers),
    request: {
      ...request,
      asOf: analysis?.calculation.asOf ?? today.slice(0, 10),
    } as CaseProfile["request"],
    analyzedAt: today,
    ...(savedCaseNumber ? { savedCaseNumber } : {}),
  }
}

export function SituationWizard({
  mobywatelProfile,
}: {
  mobywatelProfile?: MobywatelProfile | null
}) {
  const [answers, setAnswers] = useState<SituationAnswers>(() =>
    emptySituationAnswers()
  )
  const [contact, setContact] = useState<ContactDetails>({
    firstName: "",
    lastName: "",
    email: "",
  })
  const [consents, setConsents] = useState({
    healthData: false,
    aiAssistant: false,
    documentProcessing: false,
  })
  const [stepIndex, setStepIndex] = useState(0)
  const [stepErrors, setStepErrors] = useState<
    Array<{ questionId: AnswerKey; message: string }>
  >([])
  const [hydrated, setHydrated] = useState(false)
  const [prefillSources, setPrefillSources] = useState<string[]>([])
  const [importPrefill, setImportPrefill] = useState<ImportPrefillState | null>(
    null
  )
  const [primaryBirthYear, setPrimaryBirthYear] = useState<number | undefined>()

  const [analysis, setAnalysis] = useState<SituationAnalysis | null>(null)
  const [stage, setStage] = useState<AnalysisStage>("idle")
  const [analysisError, setAnalysisError] = useState<string | null>(null)
  const [retry, setRetry] = useState(0)

  const [savedCaseNumber, setSavedCaseNumber] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [justSaved, setJustSaved] = useState(false)

  const stepId = WIZARD_STEPS[stepIndex]!
  const stepMeta = STEP_META[stepId]
  const visibleQuestions = questionsForStep(stepId, answers)
  const request = useMemo(
    () =>
      toSituationAssessmentRequest(answers, {
        primaryBirthYear,
      }),
    [answers, primaryBirthYear]
  )
  const requestKey = JSON.stringify(request)
  const unresolved = useMemo(() => missingAnswers(answers), [answers])
  const unresolvedKey = JSON.stringify(unresolved)
  const profileReady = Boolean(
    request.event.birthDate ||
    request.event.expectedDueDate ||
    request.event.careTakingDate
  )

  // Hydrate once from the prior session, mObywatel prefill and import report.
  useHydrationEffect(() => {
    const session = window.sessionStorage
    const stored = readSituationAnswers(session)
    let next = stored ?? emptySituationAnswers()
    const sources: string[] = []
    const sourceLabel = (label: string) => {
      if (!sources.includes(label)) sources.push(label)
    }

    const imported = session.getItem("zpr:import-prefill")
    if (imported) {
      try {
        const parsed = importPrefillStorageSchema.safeParse(
          JSON.parse(imported)
        )
        if (parsed.success) {
          const data = parsed.data.data
          setImportPrefill({
            sessionId: parsed.data.sessionId,
            label: "Raport pobrania (symulacja)",
          })
          sourceLabel("raport pobrania z symulowanych źródeł")
          if (data.eventType) {
            const mapped = scenarioFromEvent(data.eventType)
            next = {
              ...next,
              scenario: mapped.scenario,
              careKind: mapped.careKind || next.careKind,
            }
          }
          if (data.expectedDueDate) next.dueDate = data.expectedDueDate
          if (data.eventDate) {
            if (data.eventType === "BIRTH") next.birthDate = data.eventDate
            else if (
              data.eventType === "ADOPTION" ||
              data.eventType === "FOSTER_CARE"
            ) {
              next.careTakingDate = data.eventDate
            }
          }
          if (data.childrenCount !== undefined) {
            next.childrenCount = String(data.childrenCount)
          }
          if (data.hasZaZyciem !== undefined) {
            next.hasZaZyciem = data.hasZaZyciem ? "YES" : "NO"
          }
          if (data.isPremature !== undefined) {
            next.premature = data.isPremature ? "YES" : "NO"
          }
          if (data.employmentType) {
            next.motherEmployment = data.employmentType
          }
          if (data.employerName) {
            next.motherEmployerName = data.employerName
          }
          if (data.grossMonthlyIncomePln !== undefined) {
            next.motherIncome = String(data.grossMonthlyIncomePln)
          }
          if (data.insuranceStartDate) {
            next.motherInsuranceStartDate = data.insuranceStartDate
          }
          if (data.coverageMode) {
            next.motherSickness = data.coverageMode
          }
          if (data.firstName) {
            setContact((current) => ({
              ...current,
              firstName: data.firstName!,
            }))
          }
          if (data.lastName) {
            setContact((current) => ({ ...current, lastName: data.lastName! }))
          }
          if (data.email) {
            setContact((current) => ({ ...current, email: data.email! }))
          }
        }
      } catch {
        // Ignore a stale or malformed prefill.
      }
    }

    if (mobywatelProfile) {
      sourceLabel("mObywatel (symulacja)")
      setContact((current) => ({
        firstName: mobywatelProfile.firstName || current.firstName,
        lastName: mobywatelProfile.lastName || current.lastName,
        email: mobywatelProfile.email || current.email,
      }))
      const year = Number(mobywatelProfile.birthDate.slice(0, 4))
      if (Number.isFinite(year)) setPrimaryBirthYear(year)
    }

    const existingProfile = readCaseProfile(session)
    if (existingProfile?.savedCaseNumber) {
      setSavedCaseNumber(existingProfile.savedCaseNumber)
    }

    setAnswers(next)
    setPrefillSources(sources)
    setHydrated(true)
  }, [mobywatelProfile])

  useEffect(() => {
    if (!hydrated) return
    writeSituationAnswers(window.sessionStorage, answers)
  }, [answers, hydrated])

  // Re-run the deterministic engine whenever the summary is visible and the
  // answers change. Only the API endpoints are called; no rules live here.
  useEffect(() => {
    if (!hydrated || stepId !== "summary") return
    if (unresolved.length > 0) {
      setAnalysis(null)
      setStage("idle")
      return
    }
    let cancelled = false
    async function run() {
      setAnalysisError(null)
      setAnalysis(null)
      setStage("calculation")
      try {
        const calculation = await postJson<SituationAnalysis["calculation"]>(
          "/api/v1/benefits/calculate",
          request
        )
        if (cancelled) return
        setStage("documents")
        const documents = await postJson<SituationAnalysis["documents"]>(
          "/api/v1/documents/required",
          request
        )
        if (cancelled) return
        const nextAnalysis = { calculation, documents }
        setAnalysis(nextAnalysis)
        setStage("done")
        const existingProfile = readCaseProfile(window.sessionStorage)
        writeCaseProfile(
          window.sessionStorage,
          buildCaseProfile(
            answers,
            nextAnalysis,
            request,
            existingProfile?.savedCaseNumber
          )
        )
      } catch (error) {
        if (cancelled) return
        setStage("idle")
        setAnalysisError(
          error instanceof Error
            ? error.message
            : "Nie udało się wykonać analizy."
        )
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [
    answers,
    hydrated,
    request,
    requestKey,
    retry,
    stepId,
    unresolved.length,
    unresolvedKey,
  ])

  function setAnswer(key: AnswerKey, value: string) {
    setAnswers((current) => ({ ...current, [key]: value }))
    setStepErrors((current) =>
      current.filter((issue) => issue.questionId !== key)
    )
    setSaveError(null)
    setJustSaved(false)
  }

  function goNext() {
    const issues = validateStep(stepId, answers)
    if (issues.length > 0) {
      setStepErrors(issues)
      return
    }
    setStepErrors([])
    setStepIndex((current) => Math.min(WIZARD_STEPS.length - 1, current + 1))
  }

  function goBack() {
    setStepErrors([])
    setStepIndex((current) => Math.max(0, current - 1))
  }

  function onCheckDocument() {
    writeSituationAnswers(window.sessionStorage, answers)
    writeCaseProfile(
      window.sessionStorage,
      buildCaseProfile(answers, analysis, request, savedCaseNumber ?? undefined)
    )
  }

  async function onSaveCase(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaveError(null)
    const errors: string[] = []
    if (contact.firstName.trim().length < 2) errors.push("Podaj imię.")
    if (contact.lastName.trim().length < 2) errors.push("Podaj nazwisko.")
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email.trim())) {
      errors.push("Podaj poprawny adres e-mail.")
    }
    if (errors.length > 0) {
      setSaveError(errors.join(" "))
      return
    }

    setSaving(true)
    try {
      const eventType = onboardingEventType(answers)
      const payload = {
        firstName: contact.firstName.trim(),
        lastName: contact.lastName.trim(),
        email: contact.email.trim(),
        eventType,
        expectedDueDate: answers.dueDate || undefined,
        eventDate: answers.birthDate || answers.careTakingDate || undefined,
        childrenCount: Number(answers.childrenCount) || 1,
        hasZaZyciem: answers.hasZaZyciem === "YES",
        isPremature: answers.premature === "YES",
        employmentType:
          EMPLOYMENT_TO_ONBOARDING[
            (answers.motherEmployment ||
              "OTHER") as keyof typeof EMPLOYMENT_TO_ONBOARDING
          ] ?? "OTHER",
        employerName: answers.motherEmployerName || undefined,
        grossMonthlyIncomePln:
          Number(answers.motherIncome.replace(",", ".")) || 0,
        insuranceStartDate: answers.motherInsuranceStartDate || undefined,
        coverageMode:
          answers.motherSickness === "VOLUNTARY" ? "VOLUNTARY" : "COMPULSORY",
        importSessionId: importPrefill?.sessionId,
        consents,
      }
      const response = await fetch("/api/v1/onboarding", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = (await response
        .json()
        .catch(() => ({}))) as OnboardingResponse
      if (!response.ok) {
        const issue = data.issues?.[0]
        throw new Error(
          issue
            ? `${issue.path}: ${issue.message}`
            : (data.detail ?? "Nie udało się zapisać sprawy.")
        )
      }
      const caseNumber = data.caseNumber ?? "—"
      setSavedCaseNumber(caseNumber)
      setJustSaved(true)
      writeCaseProfile(
        window.sessionStorage,
        buildCaseProfile(answers, analysis, request, caseNumber)
      )
    } catch (error) {
      setSaveError(
        error instanceof Error ? error.message : "Wystąpił nieoczekiwany błąd."
      )
    } finally {
      setSaving(false)
    }
  }

  function goToQuestion(questionId: AnswerKey) {
    const question = QUESTIONS.find((item) => item.id === questionId)
    if (!question) return
    const index = WIZARD_STEPS.indexOf(question.step)
    if (index >= 0) setStepIndex(index)
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="border-b border-border/70">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <p className="text-xs font-semibold tracking-[0.16em] text-primary uppercase">
                Krok {stepIndex + 1} z {WIZARD_STEPS.length}
              </p>
              <CardTitle className="text-xl" id="wizard-step-title">
                {stepMeta.title}
              </CardTitle>
              <CardDescription>{stepMeta.lead}</CardDescription>
            </div>
            <span className="text-xs text-muted-foreground tabular-nums">
              {Math.round(((stepIndex + 1) / WIZARD_STEPS.length) * 100)}%
            </span>
          </div>
          <Progress
            value={((stepIndex + 1) / WIZARD_STEPS.length) * 100}
            label={`Postęp kreatora: ${Math.round(((stepIndex + 1) / WIZARD_STEPS.length) * 100)}%`}
          />
          <ol className="hidden gap-2 sm:flex" aria-label="Kroki kreatora">
            {WIZARD_STEPS.map((step, index) => (
              <li
                key={step}
                className={cn(
                  "flex-1 rounded-lg border px-2 py-1.5 text-center text-[11px]",
                  index === stepIndex
                    ? "border-primary/50 bg-primary/10 font-medium text-primary"
                    : index < stepIndex
                      ? "border-success/30 bg-success/10 text-foreground"
                      : "border-border/70 text-muted-foreground"
                )}
                aria-current={index === stepIndex ? "step" : undefined}
              >
                {STEP_META[step].title}
              </li>
            ))}
          </ol>
        </CardHeader>

        <CardContent className="space-y-5 pt-6">
          {prefillSources.length > 0 && (
            <Alert variant="info">
              <Sparkles aria-hidden="true" />
              <AlertTitle>Uzupełniliśmy część danych</AlertTitle>
              <AlertDescription>
                Dane pochodzą z: {prefillSources.join(", ")}. To symulacja —
                sprawdź każdą wartość i popraw, jeśli się nie zgadza.
              </AlertDescription>
            </Alert>
          )}

          {stepId === "situation" && (
            <QuestionGroup
              questions={visibleQuestions}
              answers={answers}
              errors={stepErrors}
              onChange={setAnswer}
            />
          )}

          {stepId === "situation" && prefillSources.length > 0 && (
            <ContactPrefillCard contact={contact} onChange={setContact} />
          )}

          {stepId !== "situation" && stepId !== "summary" && (
            <QuestionGroup
              questions={visibleQuestions}
              answers={answers}
              errors={stepErrors}
              onChange={setAnswer}
            />
          )}

          {stepId === "summary" && (
            <SummaryStep
              answers={answers}
              analysis={analysis}
              stage={stage}
              error={analysisError}
              unresolved={unresolved}
              onRetry={() => setRetry((value) => value + 1)}
              onGoToQuestion={goToQuestion}
              onCheckDocument={onCheckDocument}
              profileReady={profileReady}
              savedCaseNumber={savedCaseNumber ?? undefined}
            />
          )}

          {stepErrors.length > 0 && (
            <Alert variant="destructive">
              <AlertTriangle aria-hidden="true" />
              <AlertTitle>Uzupełnij wymagane informacje</AlertTitle>
              <AlertDescription>
                <ul className="mt-1 list-disc space-y-1 pl-4">
                  {stepErrors.map((issue) => (
                    <li key={`${issue.questionId}-${issue.message}`}>
                      {issue.message}
                    </li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          <div className="flex flex-col-reverse justify-between gap-2 border-t border-border/70 pt-4 sm:flex-row">
            <Button
              type="button"
              variant="ghost"
              onClick={goBack}
              disabled={stepIndex === 0}
            >
              <ArrowLeft data-icon="inline-start" aria-hidden="true" />
              Wstecz
            </Button>
            {stepIndex < WIZARD_STEPS.length - 1 ? (
              <Button type="button" onClick={goNext}>
                Dalej
                <ArrowRight data-icon="inline-end" aria-hidden="true" />
              </Button>
            ) : (
              <Button
                type="button"
                variant="outline"
                onClick={() => setStepIndex(0)}
              >
                Zmień odpowiedzi
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {stepId === "summary" && answers.scenario !== "" && (
        <SaveCaseCard
          contact={contact}
          onContactChange={setContact}
          consents={consents}
          onConsentsChange={setConsents}
          savedCaseNumber={savedCaseNumber}
          justSaved={justSaved}
          saving={saving}
          error={saveError}
          onSubmit={onSaveCase}
        />
      )}
    </div>
  )
}

function QuestionGroup({
  questions,
  answers,
  errors,
  onChange,
}: {
  questions: QuestionDefinition[]
  answers: SituationAnswers
  errors: Array<{ questionId: AnswerKey; message: string }>
  onChange: (key: AnswerKey, value: string) => void
}) {
  return (
    <div className="space-y-6">
      {questions.map((question) => (
        <QuestionField
          key={question.id}
          question={question}
          answers={answers}
          error={
            errors.find((issue) => issue.questionId === question.id)?.message
          }
          onChange={onChange}
        />
      ))}
    </div>
  )
}

function QuestionField({
  question,
  answers,
  error,
  onChange,
}: {
  question: QuestionDefinition
  answers: SituationAnswers
  error?: string
  onChange: (key: AnswerKey, value: string) => void
}) {
  const value = answers[question.id]
  const describedBy = [
    question.help ? `${question.id}-help` : null,
    `${question.id}-why`,
  ]
    .filter(Boolean)
    .join(" ")
  const id = `q-${question.id}`

  if (question.kind === "choice") {
    return (
      <fieldset className="space-y-2" aria-describedby={describedBy}>
        <legend className="text-sm font-medium">{question.label}</legend>
        {question.help && (
          <p
            id={`${question.id}-help`}
            className="text-xs text-pretty text-muted-foreground"
          >
            {question.help}
          </p>
        )}
        <p
          id={`${question.id}-why`}
          className="text-xs text-pretty text-muted-foreground"
        >
          <span className="font-medium text-foreground">Dlaczego pytamy:</span>{" "}
          {question.why}
        </p>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {question.options?.map((option) => (
            <label
              key={option.value}
              className={cn(
                "flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm transition-colors",
                value === option.value
                  ? "border-primary/60 bg-primary/5"
                  : "border-border/70 hover:border-primary/40"
              )}
            >
              <input
                type="radio"
                name={question.id}
                value={option.value}
                checked={value === option.value}
                onChange={() => onChange(question.id, option.value)}
                className="mt-0.5 size-4 accent-[var(--primary)]"
                aria-describedby={describedBy}
              />
              <span>
                <span className="font-medium">{option.label}</span>
                {option.description && (
                  <span className="mt-0.5 block text-xs text-pretty text-muted-foreground">
                    {option.description}
                  </span>
                )}
              </span>
            </label>
          ))}
        </div>
        {error && <p className="text-xs text-destructive">{error}</p>}
      </fieldset>
    )
  }

  if (question.kind === "select") {
    return (
      <div className="space-y-2">
        <Label htmlFor={id}>{question.label}</Label>
        {question.help && (
          <p
            id={`${question.id}-help`}
            className="text-xs text-pretty text-muted-foreground"
          >
            {question.help}
          </p>
        )}
        <Select
          id={id}
          value={value}
          onChange={(event: ChangeEvent<HTMLSelectElement>) =>
            onChange(question.id, event.target.value)
          }
          aria-describedby={describedBy}
          aria-invalid={error ? true : undefined}
        >
          <option value="">— wybierz —</option>
          {question.options?.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
        <p
          id={`${question.id}-why`}
          className="text-xs text-pretty text-muted-foreground"
        >
          <span className="font-medium text-foreground">Dlaczego pytamy:</span>{" "}
          {question.why}
        </p>
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{question.label}</Label>
      {question.help && (
        <p
          id={`${question.id}-help`}
          className="text-xs text-pretty text-muted-foreground"
        >
          {question.help}
        </p>
      )}
      <div className="flex items-center gap-2">
        <Input
          id={id}
          type={
            question.kind === "date"
              ? "date"
              : question.kind === "number"
                ? "number"
                : "text"
          }
          inputMode={question.kind === "number" ? "decimal" : undefined}
          min={question.min}
          max={question.max}
          placeholder={question.placeholder}
          value={value}
          onChange={(event: ChangeEvent<HTMLInputElement>) =>
            onChange(question.id, event.target.value)
          }
          aria-describedby={describedBy}
          aria-invalid={error ? true : undefined}
        />
        {question.suffix && (
          <span className="text-sm whitespace-nowrap text-muted-foreground">
            {question.suffix}
          </span>
        )}
      </div>
      <p
        id={`${question.id}-why`}
        className="text-xs text-pretty text-muted-foreground"
      >
        <span className="font-medium text-foreground">Dlaczego pytamy:</span>{" "}
        {question.why}
      </p>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}

function ContactPrefillCard({
  contact,
  onChange,
}: {
  contact: ContactDetails
  onChange: (contact: ContactDetails) => void
}) {
  return (
    <Card className="border-primary/25 bg-primary/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ShieldCheck aria-hidden="true" className="size-4 text-primary" />
          Dane osoby (tylko do zapisania sprawy)
        </CardTitle>
        <CardDescription>
          Nie są potrzebne do samej analizy. Możesz je poprawić albo zostawić —
          kreator działa bez zakładania konta.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="prefill-firstName">Imię</Label>
          <Input
            id="prefill-firstName"
            autoComplete="given-name"
            value={contact.firstName}
            onChange={(event) =>
              onChange({ ...contact, firstName: event.target.value })
            }
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="prefill-lastName">Nazwisko</Label>
          <Input
            id="prefill-lastName"
            autoComplete="family-name"
            value={contact.lastName}
            onChange={(event) =>
              onChange({ ...contact, lastName: event.target.value })
            }
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="prefill-email">Adres e-mail</Label>
          <Input
            id="prefill-email"
            type="email"
            autoComplete="email"
            value={contact.email}
            onChange={(event) =>
              onChange({ ...contact, email: event.target.value })
            }
          />
        </div>
      </CardContent>
    </Card>
  )
}

function SummaryStep({
  answers,
  analysis,
  stage,
  error,
  unresolved,
  onRetry,
  onGoToQuestion,
  onCheckDocument,
  profileReady,
  savedCaseNumber,
}: {
  answers: SituationAnswers
  analysis: SituationAnalysis | null
  stage: AnalysisStage
  error: string | null
  unresolved: Array<{ questionId: AnswerKey; message: string }>
  onRetry: () => void
  onGoToQuestion: (id: AnswerKey) => void
  onCheckDocument: () => void
  profileReady: boolean
  savedCaseNumber?: string
}) {
  const summary = situationSummary(answers)

  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-border/70 bg-secondary/40 p-4">
        <h2 className="font-semibold">Podsumowanie przed analizą</h2>
        <dl className="mt-3 grid gap-2 sm:grid-cols-2">
          {summary.map((row) => (
            <div key={row.label}>
              <dt className="text-xs text-muted-foreground">{row.label}</dt>
              <dd className="text-sm font-medium text-pretty">{row.value}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-3 text-xs text-muted-foreground">
          Analizę wykonuje deterministyczny silnik na podstawie tych danych i
          wersjonowanego zestawu reguł. To nie jest decyzja ZUS.
        </p>
      </div>

      {unresolved.length > 0 && (
        <Alert variant="warning">
          <Info aria-hidden="true" />
          <AlertTitle>Brakuje informacji do pełnej analizy</AlertTitle>
          <AlertDescription>
            <ul className="mt-1 space-y-2">
              {unresolved.map((issue) => (
                <li
                  key={`${issue.questionId}-${issue.message}`}
                  className="flex flex-wrap items-center justify-between gap-2"
                >
                  <span>{issue.message}</span>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => onGoToQuestion(issue.questionId)}
                  >
                    Uzupełnij
                  </Button>
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {unresolved.length === 0 &&
        (stage === "calculation" || stage === "documents") && (
          <div
            aria-live="polite"
            role="status"
            className="rounded-lg border border-primary/30 bg-primary/5 p-5"
          >
            <div className="flex items-center gap-3">
              <Loader2
                aria-hidden="true"
                className="size-5 animate-spin text-primary"
              />
              <div>
                <p className="font-medium">Trwa analiza Twojej sytuacji</p>
                <p className="text-sm text-muted-foreground">
                  {stage === "calculation"
                    ? "Sprawdzam kwalifikowalność, okresy i szacunkowe kwoty…"
                    : "Dobieram wymagane dokumenty i terminy…"}
                </p>
              </div>
            </div>
            <ol className="mt-4 grid gap-2 text-xs text-muted-foreground sm:grid-cols-3">
              <li
                className={
                  stage === "calculation" ? "font-medium text-foreground" : ""
                }
              >
                1. Kwalifikowalność i kwoty
              </li>
              <li
                className={
                  stage === "documents" ? "font-medium text-foreground" : ""
                }
              >
                2. Dokumenty i terminy
              </li>
              <li>3. Wyniki i plan działania</li>
            </ol>
          </div>
        )}

      {error && (
        <Alert variant="destructive">
          <AlertTriangle aria-hidden="true" />
          <AlertTitle>Nie udało się wykonać analizy</AlertTitle>
          <AlertDescription className="space-y-2">
            <p>{error}</p>
            <Button type="button" size="sm" variant="outline" onClick={onRetry}>
              Spróbuj ponownie
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {analysis && (
        <SituationResults
          analysis={analysis}
          answers={answers}
          onCheckDocument={onCheckDocument}
          documentProfileReady={profileReady}
          savedCaseNumber={savedCaseNumber}
        />
      )}
    </div>
  )
}

function SaveCaseCard({
  contact,
  onContactChange,
  consents,
  onConsentsChange,
  savedCaseNumber,
  justSaved,
  saving,
  error,
  onSubmit,
}: {
  contact: ContactDetails
  onContactChange: (contact: ContactDetails) => void
  consents: {
    healthData: boolean
    aiAssistant: boolean
    documentProcessing: boolean
  }
  onConsentsChange: (consents: {
    healthData: boolean
    aiAssistant: boolean
    documentProcessing: boolean
  }) => void
  savedCaseNumber: string | null
  justSaved: boolean
  saving: boolean
  error: string | null
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
}) {
  if (savedCaseNumber) {
    return (
      <Card className="border-success/40 bg-success/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 aria-hidden="true" className="size-5 text-success" />
            Sprawa zapisana
          </CardTitle>
          <CardDescription>
            Numer sprawy:{" "}
            <span className="font-mono font-medium text-foreground">
              {savedCaseNumber}
            </span>
            {justSaved ? " — zapisaliśmy dane z kreatora." : "."}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button asChild>
            <Link href="/panel">Otwórz panel sprawy</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/os-czasu">Otwórz plan urlopów</Link>
          </Button>
          <Button asChild variant="ghost">
            <Link href="/dokumenty">
              Sprawdź dokument
              <ArrowRight data-icon="inline-end" aria-hidden="true" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card id="zapisz-sprawe">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Save aria-hidden="true" className="size-4 text-primary" />
          Zapisz sprawę i wróć do niej później
        </CardTitle>
        <CardDescription>
          Zapis jest opcjonalny. Bez niego nadal widzisz pełną analizę i możesz
          przejść do sprawdzenia dokumentu.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="save-firstName">Imię</Label>
              <Input
                id="save-firstName"
                autoComplete="given-name"
                value={contact.firstName}
                onChange={(event) =>
                  onContactChange({ ...contact, firstName: event.target.value })
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="save-lastName">Nazwisko</Label>
              <Input
                id="save-lastName"
                autoComplete="family-name"
                value={contact.lastName}
                onChange={(event) =>
                  onContactChange({ ...contact, lastName: event.target.value })
                }
                required
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="save-email">Adres e-mail</Label>
              <Input
                id="save-email"
                type="email"
                autoComplete="email"
                value={contact.email}
                onChange={(event) =>
                  onContactChange({ ...contact, email: event.target.value })
                }
                required
              />
              <p className="text-xs text-muted-foreground">
                Służy tylko do identyfikacji sprawy w wersji demonstracyjnej.
              </p>
            </div>
          </div>

          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">
              Zgody — każda osobno
            </legend>
            <p className="text-xs text-muted-foreground">
              Podstawowe funkcje kreatora działają bez tych zgód. Zapis sprawy
              nie łączy ich w jedną decyzję.
            </p>
            {CONSENT_COPY.map((consent) => (
              <label
                key={consent.key}
                className="flex items-start gap-3 rounded-lg border border-border/70 p-3 text-sm"
              >
                <input
                  type="checkbox"
                  className="mt-0.5 size-4 accent-[var(--primary)]"
                  checked={consents[consent.key]}
                  onChange={(event) =>
                    onConsentsChange({
                      ...consents,
                      [consent.key]: event.target.checked,
                    })
                  }
                />
                <span>
                  <span className="font-medium">{consent.title}</span>
                  <span className="mt-0.5 block text-xs text-pretty text-muted-foreground">
                    {consent.description}
                  </span>
                </span>
              </label>
            ))}
          </fieldset>

          {error && (
            <Alert variant="destructive">
              <AlertTitle>Nie można zapisać sprawy</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" disabled={saving}>
              {saving && (
                <Loader2 aria-hidden="true" className="animate-spin" />
              )}
              {saving ? "Zapisuję sprawę…" : "Zapisz sprawę"}
            </Button>
            <p className="text-xs text-muted-foreground">
              Dane trafią do bazy demonstracyjnej. Nie podawaj prawdziwych
              danych wrażliwych.
            </p>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
