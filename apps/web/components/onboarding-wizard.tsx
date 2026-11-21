"use client"

import Link from "next/link"
import { useState, type ChangeEvent, type FormEvent } from "react"
import { ArrowRight, CheckCircle2, Loader2, ShieldCheck } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@workspace/ui/components/alert"
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
import type { MobywatelProfile } from "@zpr/contracts/mobywatel"

type FormState = {
  firstName: string
  lastName: string
  email: string
  birthDate: string
  city: string
  eventType: "PREGNANCY" | "BIRTH" | "ADOPTION" | "FOSTER_CARE"
  expectedDueDate: string
  eventDate: string
  childrenCount: string
  hasZaZyciem: boolean
  isPremature: boolean
  employmentType: "EMPLOYMENT" | "MANDATE" | "SELF_EMPLOYMENT" | "OTHER"
  employerName: string
  grossMonthlyIncomePln: string
  insuranceStartDate: string
  coverageMode: "COMPULSORY" | "VOLUNTARY"
  healthData: boolean
  aiAssistant: boolean
  documentProcessing: boolean
}

const initialState: FormState = {
  firstName: "Anna",
  lastName: "Kowalska",
  email: "anna.kowalska@example.test",
  birthDate: "1994-05-14",
  city: "Warszawa",
  eventType: "PREGNANCY",
  expectedDueDate: "2027-03-10",
  eventDate: "",
  childrenCount: "1",
  hasZaZyciem: false,
  isPremature: false,
  employmentType: "EMPLOYMENT",
  employerName: "Przykładowy Pracodawca S.A.",
  grossMonthlyIncomePln: "8000",
  insuranceStartDate: "2024-01-01",
  coverageMode: "COMPULSORY",
  healthData: true,
  aiAssistant: true,
  documentProcessing: true,
}

interface OnboardingWizardProps {
  mobywatelProfile?: MobywatelProfile | null
}

function buildInitialState(
  profile?: MobywatelProfile | null
): FormState {
  if (!profile) return initialState

  return {
    ...initialState,
    firstName: profile.firstName,
    lastName: profile.lastName,
    email: profile.email,
    birthDate: profile.birthDate,
    city: profile.city,
  }
}

type Step = 1 | 2 | 3 | 4
type StringKeys = {
  [K in keyof FormState]: FormState[K] extends string ? K : never
}[keyof FormState]

const STEP_TITLES = [
  "Dane podstawowe",
  "Sytuacja rodzinna",
  "Praca i ubezpieczenie",
  "Zgody i podsumowanie",
] as const

function optional(value: string): string | undefined {
  return value.trim() === "" ? undefined : value
}

export function OnboardingWizard({ mobywatelProfile }: OnboardingWizardProps) {
  const [step, setStep] = useState<Step>(1)
  const [form, setForm] = useState<FormState>(() =>
    buildInitialState(mobywatelProfile)
  )
  const [fromMobywatel, setFromMobywatel] = useState(Boolean(mobywatelProfile))
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<{
    caseNumber: string
    nextSteps: string[]
  } | null>(null)

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  function text<K extends StringKeys>(key: K) {
    return {
      value: form[key],
      onChange: (event: ChangeEvent<HTMLInputElement>) =>
        update(key, event.target.value as FormState[K]),
    }
  }

  function next() {
    setError(null)
    if (step === 1) {
      if (!form.firstName.trim() || !form.lastName.trim()) {
        setError("Imię i nazwisko są wymagane.")
        return
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
        setError("Podaj poprawny adres e-mail.")
        return
      }
    }
    if (step === 3) {
      const income = Number(form.grossMonthlyIncomePln)
      if (!Number.isFinite(income) || income < 0) {
        setError("Podaj miesięczny dochód brutto w złotych.")
        return
      }
    }
    setStep((current) => Math.min(4, current + 1) as Step)
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setPending(true)

    try {
      const payload = {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        birthDate: optional(form.birthDate),
        city: optional(form.city),
        eventType: form.eventType,
        expectedDueDate: optional(form.expectedDueDate),
        eventDate: optional(form.eventDate),
        childrenCount: Number(form.childrenCount),
        hasZaZyciem: form.hasZaZyciem,
        isPremature: form.isPremature,
        employmentType: form.employmentType,
        employerName: optional(form.employerName),
        grossMonthlyIncomePln: Number(form.grossMonthlyIncomePln),
        insuranceStartDate: optional(form.insuranceStartDate),
        coverageMode: form.coverageMode,
        consents: {
          healthData: form.healthData,
          aiAssistant: form.aiAssistant,
          documentProcessing: form.documentProcessing,
        },
      }

      const response = await fetch("/api/v1/onboarding", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      })

      const data = (await response.json()) as {
        caseNumber?: string
        nextSteps?: string[]
        detail?: string
        issues?: Array<{ path: string; message: string }>
      }

      if (!response.ok) {
        const issue = data.issues?.[0]
        throw new Error(
          issue ? `${issue.path}: ${issue.message}` : data.detail ?? "Nie udało się utworzyć sprawy."
        )
      }

      setResult({
        caseNumber: data.caseNumber ?? "—",
        nextSteps: data.nextSteps ?? [],
      })

      if (fromMobywatel) {
        setFromMobywatel(false)
        void fetch("/api/v1/sim/mobywatel/logout", { method: "POST" })
      }
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Wystąpił nieoczekiwany błąd."
      )
    } finally {
      setPending(false)
    }
  }

  if (result) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 aria-hidden="true" className="size-5 text-success" />
            Sprawa utworzona
          </CardTitle>
          <CardDescription>
            Numer sprawy:{" "}
            <span className="font-mono font-medium text-foreground">
              {result.caseNumber}
            </span>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant="success">
            <ShieldCheck aria-hidden="true" />
            <AlertTitle>Dane zapisane w bazie demonstracyjnej</AlertTitle>
            <AlertDescription>
              To środowisko lokalne. Nie podawaj prawdziwych danych wrażliwych.
            </AlertDescription>
          </Alert>
          <ol className="grid gap-2 text-sm">
            {result.nextSteps.map((item) => (
              <li key={item} className="flex items-start gap-2">
                <CheckCircle2
                  aria-hidden="true"
                  className="mt-0.5 size-4 shrink-0 text-primary"
                />
                {item}
              </li>
            ))}
          </ol>
          <div className="flex flex-wrap gap-2">
            <Button asChild>
              <Link href="/kalkulator">
                Przejdź do kalkulatora
                <ArrowRight data-icon="inline-end" aria-hidden="true" />
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/os-czasu">Otwórz oś czasu</Link>
            </Button>
            <Button asChild variant="ghost">
              <Link href="/panel">Wróć do panelu</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="border-b border-border/70">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle>
              Krok {step} z 4 · {STEP_TITLES[step - 1]}
            </CardTitle>
            <CardDescription>
              Możesz wrócić do poprzedniego kroku bez utraty danych.
            </CardDescription>
          </div>
          <span className="text-xs text-muted-foreground">{step * 25}%</span>
        </div>
        <Progress value={step * 25} label={`Postęp kreatora: ${step * 25}%`} />
      </CardHeader>

      <form onSubmit={onSubmit}>
        <CardContent className="space-y-5 pt-6">
          {step === 1 && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="firstName">Imię</Label>
                <Input id="firstName" autoComplete="given-name" required {...text("firstName")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Nazwisko</Label>
                <Input id="lastName" autoComplete="family-name" required {...text("lastName")} />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="email">Adres e-mail</Label>
                <Input id="email" type="email" autoComplete="email" required {...text("email")} />
                <p className="text-xs text-muted-foreground">
                  Używamy go tylko do identyfikacji sprawy w wersji demo.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="birthDate">Data urodzenia</Label>
                <Input id="birthDate" type="date" {...text("birthDate")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">Miejscowość</Label>
                <Input id="city" autoComplete="address-level2" {...text("city")} />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="eventType">Sytuacja</Label>
                <Select
                  id="eventType"
                  value={form.eventType}
                  onChange={(event) =>
                    update("eventType", event.target.value as FormState["eventType"])
                  }
                >
                  <option value="PREGNANCY">Ciąża</option>
                  <option value="BIRTH">Dziecko już się urodziło</option>
                  <option value="ADOPTION">Przysposobienie</option>
                  <option value="FOSTER_CARE">Rodzina zastępcza</option>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="childrenCount">Liczba dzieci z jednego porodu</Label>
                <Select
                  id="childrenCount"
                  value={form.childrenCount}
                  onChange={(event) => update("childrenCount", event.target.value)}
                >
                  {[1, 2, 3, 4, 5].map((count) => (
                    <option key={count} value={count}>
                      {count === 5 ? "5 lub więcej" : count}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="expectedDueDate">Przewidywany termin porodu</Label>
                <Input id="expectedDueDate" type="date" {...text("expectedDueDate")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="eventDate">Data zdarzenia (jeśli już nastąpiło)</Label>
                <Input id="eventDate" type="date" {...text("eventDate")} />
              </div>
              <label className="flex items-start gap-3 rounded-lg border border-border/70 p-3 text-sm">
                <input
                  type="checkbox"
                  className="mt-0.5 size-4 accent-[var(--primary)]"
                  checked={form.hasZaZyciem}
                  onChange={(event) => update("hasZaZyciem", event.target.checked)}
                />
                <span>
                  <span className="font-medium">Zaświadczenie „Za życiem”</span>
                  <span className="block text-xs text-muted-foreground">
                    Wydłuża urlop rodzicielski do 65/67 tygodni.
                  </span>
                </span>
              </label>
              <label className="flex items-start gap-3 rounded-lg border border-border/70 p-3 text-sm">
                <input
                  type="checkbox"
                  className="mt-0.5 size-4 accent-[var(--primary)]"
                  checked={form.isPremature}
                  onChange={(event) => update("isPremature", event.target.checked)}
                />
                <span>
                  <span className="font-medium">Poród przedwczesny</span>
                  <span className="block text-xs text-muted-foreground">
                    Może uprawniać do uzupełniającego urlopu macierzyńskiego.
                  </span>
                </span>
              </label>
            </div>
          )}

          {step === 3 && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="employmentType">Forma zatrudnienia</Label>
                <Select
                  id="employmentType"
                  value={form.employmentType}
                  onChange={(event) =>
                    update(
                      "employmentType",
                      event.target.value as FormState["employmentType"]
                    )
                  }
                >
                  <option value="EMPLOYMENT">Umowa o pracę</option>
                  <option value="MANDATE">Umowa zlecenia</option>
                  <option value="SELF_EMPLOYMENT">Działalność gospodarcza</option>
                  <option value="OTHER">Inna / brak tytułu</option>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="coverageMode">Rodzaj ubezpieczenia chorobowego</Label>
                <Select
                  id="coverageMode"
                  value={form.coverageMode}
                  onChange={(event) =>
                    update(
                      "coverageMode",
                      event.target.value as FormState["coverageMode"]
                    )
                  }
                >
                  <option value="COMPULSORY">Obowiązkowe</option>
                  <option value="VOLUNTARY">Dobrowolne</option>
                </Select>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="employerName">Pracodawca / zleceniodawca</Label>
                <Input id="employerName" {...text("employerName")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="grossMonthlyIncomePln">
                  Miesięczny dochód brutto (zł)
                </Label>
                <Input
                  id="grossMonthlyIncomePln"
                  type="number"
                  min={0}
                  step={100}
                  inputMode="decimal"
                  required
                  {...text("grossMonthlyIncomePln")}
                />
                <p className="text-xs text-muted-foreground">
                  Do podstawy wymiaru przyjmujemy kwotę po potrąceniu 13,71%.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="insuranceStartDate">Początek ubezpieczenia</Label>
                <Input id="insuranceStartDate" type="date" {...text("insuranceStartDate")} />
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <div className="rounded-lg border border-border/70 bg-secondary/40 p-4 text-sm">
                <h2 className="font-semibold">Podsumowanie</h2>
                <dl className="mt-3 grid gap-2 sm:grid-cols-2">
                  <div>
                    <dt className="text-xs text-muted-foreground">Osoba</dt>
                    <dd>
                      {form.firstName} {form.lastName}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">E-mail</dt>
                    <dd className="break-all">{form.email}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Sytuacja</dt>
                    <dd>
                      {form.eventType === "PREGNANCY"
                        ? "Ciąża"
                        : form.eventType === "BIRTH"
                          ? "Narodziny"
                          : form.eventType === "ADOPTION"
                            ? "Przysposobienie"
                            : "Rodzina zastępcza"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Termin</dt>
                    <dd>{form.expectedDueDate || form.eventDate || "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Dochód brutto</dt>
                    <dd>{form.grossMonthlyIncomePln} zł / mies.</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Ubezpieczenie</dt>
                    <dd>
                      {form.coverageMode === "COMPULSORY"
                        ? "Obowiązkowe"
                        : "Dobrowolne"}
                    </dd>
                  </div>
                </dl>
              </div>

              <div className="space-y-3">
                <Consent
                  checked={form.healthData}
                  onChange={(checked) => update("healthData", checked)}
                  title="Przetwarzanie danych o ciąży i zdrowiu"
                  description="Dane zdrowotne są dobrowolne. W wersji demo zapisujemy tylko zgodę, nie treść diagnozy."
                />
                <Consent
                  checked={form.aiAssistant}
                  onChange={(checked) => update("aiAssistant", checked)}
                  title="Asystent AI"
                  description="Zgoda na wysyłanie pytań do asystenta. Asystent nie decyduje o uprawnieniach."
                />
                <Consent
                  checked={form.documentProcessing}
                  onChange={(checked) => update("documentProcessing", checked)}
                  title="Analiza dokumentów"
                  description="Zgoda na lokalną analizę formularzy. Pliki demo nie są wysyłane na zewnątrz."
                />
              </div>
            </div>
          )}

          <div aria-live="polite" className="min-h-5">
            {error && (
              <Alert variant="destructive">
                <AlertTitle>Nie można kontynuować</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </div>

          <div className="flex flex-col-reverse justify-between gap-2 border-t border-border/70 pt-4 sm:flex-row">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setStep((current) => Math.max(1, current - 1) as Step)}
              disabled={step === 1 || pending}
            >
              Wstecz
            </Button>
            {step < 4 ? (
              <Button type="button" onClick={next}>
                Dalej
                <ArrowRight data-icon="inline-end" aria-hidden="true" />
              </Button>
            ) : (
              <Button type="submit" disabled={pending}>
                {pending && <Loader2 aria-hidden="true" className="animate-spin" />}
                {pending ? "Tworzę sprawę…" : "Utwórz sprawę"}
              </Button>
            )}
          </div>
        </CardContent>
      </form>
    </Card>
  )
}

function Consent({
  checked,
  onChange,
  title,
  description,
}: {
  checked: boolean
  onChange: (checked: boolean) => void
  title: string
  description: string
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
        <span className="font-medium">{title}</span>
        <span className="mt-0.5 block text-xs text-pretty text-muted-foreground">
          {description}
        </span>
      </span>
    </label>
  )
}
