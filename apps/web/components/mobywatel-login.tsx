"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Fingerprint,
  Info,
  Landmark,
  LockKeyhole,
  ShieldCheck,
  Smartphone,
} from "lucide-react"

import type {
  MobywatelMethod,
  MobywatelPersona,
} from "@zpr/contracts/mobywatel"
import { MOBYWATEL_SCOPE_KEYS } from "@zpr/contracts/mobywatel"
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
import { cn } from "@workspace/ui/lib/utils"
import { mobywatel as copy } from "@/messages/pl"

type Step = 0 | 1 | 2 | 3 | 4

interface MobywatelLoginProps {
  personas: MobywatelPersona[]
}

export function MobywatelLogin({ personas }: MobywatelLoginProps) {
  const router = useRouter()
  const [step, setStep] = useState<Step>(0)
  const [personaId, setPersonaId] = useState<string | null>(null)
  const [consent, setConsent] = useState(false)
  const [pin, setPin] = useState("")
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    setHydrated(true)
  }, [])

  const selected = personas.find((persona) => persona.id === personaId) ?? null

  function selectPersona(id: string) {
    setPersonaId(id)
    setError(null)
  }

  async function authorize(method: MobywatelMethod) {
    if (!selected) {
      setError("Najpierw wybierz profil testowy.")
      return
    }
    if (!consent) {
      setError("Zaznacz zgodę na przekazanie danych.")
      return
    }
    if (method === "PIN" && !/^\d{4}$/.test(pin)) {
      setError("Podaj 4-cyfrowy kod PIN (w demo dowolne cyfry, np. 1234).")
      return
    }

    setPending(true)
    setError(null)

    try {
      const response = await fetch("/api/v1/sim/mobywatel/authorize", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          personaId: selected.id,
          method,
          pin: method === "PIN" ? pin : undefined,
          consent: true,
        }),
      })
      const data = (await response.json()) as { detail?: string }

      if (!response.ok) {
        throw new Error(data.detail ?? "Nie udało się potwierdzić logowania.")
      }

      router.prefetch("/start")
      setStep(4)
    } catch (authorizeError) {
      setError(
        authorizeError instanceof Error
          ? authorizeError.message
          : "Wystąpił nieoczekiwany błąd."
      )
    } finally {
      setPending(false)
    }
  }

  const progress = step >= 4 ? 100 : ((step + 1) / 4) * 100

  return (
    <div className="space-y-4" data-mobywatel-hydrated={hydrated}>
      <Alert variant="warning">
        <Info aria-hidden="true" />
        <AlertTitle>{copy.simulationTitle}</AlertTitle>
        <AlertDescription>{copy.simulationText}</AlertDescription>
      </Alert>

      <Card className="overflow-hidden">
        <div className="border-b border-border/70 bg-secondary/50 px-5 py-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Landmark aria-hidden="true" className="size-4 text-primary" />
              login.gov.pl
              <Badge variant="warning">SYMULACJA</Badge>
            </div>
            <span className="text-xs text-muted-foreground">
              {step < 4
                ? `${copy.stepLabel} ${step + 1} ${copy.of} 4`
                : "Gotowe"}
            </span>
          </div>
          <Progress
            className="mt-3"
            value={progress}
            label={`Postęp logowania: ${Math.round(progress)}%`}
          />
        </div>

        <CardHeader>
          <CardTitle>
            {step === 0 && copy.providerStep}
            {step === 1 && copy.personaStep}
            {step === 2 && copy.consentStep}
            {step === 3 && copy.pinStep}
            {step === 4 && copy.successTitle}
          </CardTitle>
          <CardDescription>
            {step === 0 && copy.providerLead}
            {step === 1 && copy.personaLead}
            {step === 2 && copy.consentLead}
            {step === 3 && copy.pinLead}
            {step === 4 && copy.successText}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-5">
          {error && (
            <Alert variant="destructive">
              <Info aria-hidden="true" />
              <AlertTitle>Nie udało się kontynuować</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {step === 0 && (
            <div className="grid gap-3 sm:grid-cols-2">
              {copy.providers.map((provider) => (
                <button
                  key={provider.id}
                  type="button"
                  disabled={!provider.enabled || !hydrated}
                  aria-disabled={!provider.enabled || !hydrated}
                  onClick={() => provider.enabled && setStep(1)}
                  className={cn(
                    "rounded-lg border p-4 text-left transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
                    provider.enabled
                      ? "border-primary/40 bg-primary/5 hover:border-primary hover:bg-primary/10"
                      : "cursor-not-allowed border-border/60 bg-muted/30 opacity-60"
                  )}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2 font-medium">
                      <Smartphone aria-hidden="true" className="size-4 text-primary" />
                      {provider.label}
                    </span>
                    {provider.enabled ? (
                      <Badge variant="success">{copy.providerRecommended}</Badge>
                    ) : (
                      <Badge variant="outline">{copy.providerUnavailable}</Badge>
                    )}
                  </span>
                  <span className="mt-2 block text-sm text-pretty text-muted-foreground">
                    {provider.description}
                  </span>
                </button>
              ))}
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-3">
                {personas.map((persona) => {
                  const active = persona.id === personaId
                  return (
                    <button
                      key={persona.id}
                      type="button"
                      aria-pressed={active}
                      onClick={() => selectPersona(persona.id)}
                      className={cn(
                        "rounded-lg border p-4 text-left transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
                        active
                          ? "border-primary bg-primary/10 ring-2 ring-primary/30"
                          : "border-border/70 bg-card hover:border-primary/50"
                      )}
                    >
                      <span className="grid size-10 place-items-center rounded-full bg-secondary text-sm font-semibold">
                        {persona.initials}
                      </span>
                      <span className="mt-3 block font-medium">
                        {persona.firstName} {persona.lastName}
                      </span>
                      <span className="mt-1 block text-xs text-muted-foreground">
                        {persona.description}
                      </span>
                      <span className="mt-3 block text-xs text-muted-foreground">
                        {copy.personaBirth}: {persona.birthDate}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {copy.personaCity}: {persona.city}
                      </span>
                    </button>
                  )
                })}
              </div>
              <div className="flex flex-wrap justify-between gap-2">
                <Button type="button" variant="ghost" onClick={() => setStep(0)}>
                  <ArrowLeft data-icon="inline-start" aria-hidden="true" />
                  {copy.back}
                </Button>
                <Button
                  type="button"
                  disabled={!selected}
                  onClick={() => setStep(2)}
                >
                  {copy.next}
                  <ArrowRight data-icon="inline-end" aria-hidden="true" />
                </Button>
              </div>
            </div>
          )}

          {step === 2 && selected && (
            <div className="space-y-4">
              <div className="rounded-lg border border-border/70 bg-secondary/30 p-4">
                <div className="flex items-center gap-2 font-medium">
                  <Landmark aria-hidden="true" className="size-4 text-primary" />
                  Zasiłkowy Przewodnik
                  <Badge variant="outline">projekt demonstracyjny</Badge>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  {selected.firstName} {selected.lastName}
                </p>
              </div>

              <ul className="grid gap-2 sm:grid-cols-2">
                {MOBYWATEL_SCOPE_KEYS.map((key) => (
                  <li
                    key={key}
                    className="flex items-center gap-2 rounded-lg border border-border/60 px-3 py-2 text-sm"
                  >
                    <CheckCircle2
                      aria-hidden="true"
                      className="size-4 text-success"
                    />
                    {copy.scopeLabels[key]}
                  </li>
                ))}
              </ul>

              <p className="flex items-start gap-2 text-xs text-pretty text-muted-foreground">
                <LockKeyhole aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
                {copy.consentNote}
              </p>

              <label className="flex items-start gap-3 rounded-lg border border-border/70 p-3 text-sm">
                <input
                  type="checkbox"
                  className="mt-0.5 size-4 accent-[var(--primary)]"
                  checked={consent}
                  onChange={(event) => setConsent(event.target.checked)}
                />
                <span>{copy.consentCheckbox}</span>
              </label>

              <div className="flex flex-wrap justify-between gap-2">
                <Button type="button" variant="ghost" onClick={() => setStep(1)}>
                  <ArrowLeft data-icon="inline-start" aria-hidden="true" />
                  {copy.back}
                </Button>
                <div className="flex flex-wrap gap-2">
                  <Button asChild variant="outline">
                    <Link href="/start">{copy.cancel}</Link>
                  </Button>
                  <Button
                    type="button"
                    disabled={!consent}
                    onClick={() => setStep(3)}
                  >
                    {copy.consentSubmit}
                    <ArrowRight data-icon="inline-end" aria-hidden="true" />
                  </Button>
                </div>
              </div>
            </div>
          )}

          {step === 3 && selected && (
            <div className="space-y-4">
              <div className="flex items-start gap-3 rounded-lg border border-primary/20 bg-primary/5 p-4">
                <ShieldCheck
                  aria-hidden="true"
                  className="mt-0.5 size-5 text-primary"
                />
                <div>
                  <p className="font-medium">
                    {selected.firstName} {selected.lastName}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {copy.pinLead}
                  </p>
                </div>
              </div>

              <div className="max-w-xs space-y-2">
                <Label htmlFor="mobywatel-pin">{copy.pinLabel}</Label>
                <Input
                  id="mobywatel-pin"
                  type="password"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={4}
                  value={pin}
                  onChange={(event) =>
                    setPin(event.target.value.replace(/\D/g, "").slice(0, 4))
                  }
                  aria-describedby="mobywatel-pin-hint"
                />
                <p
                  id="mobywatel-pin-hint"
                  className="text-xs text-muted-foreground"
                >
                  {copy.pinHint}
                </p>
              </div>

              <div className="flex flex-wrap justify-between gap-2">
                <Button type="button" variant="ghost" onClick={() => setStep(2)}>
                  <ArrowLeft data-icon="inline-start" aria-hidden="true" />
                  {copy.back}
                </Button>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={pending}
                    onClick={() => void authorize("BIOMETRY")}
                  >
                    <Fingerprint data-icon="inline-start" aria-hidden="true" />
                    {copy.biometrics}
                  </Button>
                  <Button
                    type="button"
                    disabled={pending}
                    onClick={() => void authorize("PIN")}
                  >
                    {pending ? "Potwierdzanie…" : copy.pinSubmit}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {step === 4 && selected && (
            <div className="space-y-4">
              <div className="flex items-start gap-3 rounded-lg border border-success/30 bg-success/10 p-4">
                <CheckCircle2
                  aria-hidden="true"
                  className="mt-0.5 size-6 text-success"
                />
                <div>
                  <p className="font-medium">
                    {selected.firstName} {selected.lastName}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {selected.email}
                  </p>
                </div>
              </div>
              <p className="text-sm text-pretty text-muted-foreground">
                {copy.successText}
              </p>
              <div className="flex flex-wrap gap-2">
                <Button type="button" onClick={() => router.push("/start")}>
                  {copy.successCta}
                  <ArrowRight data-icon="inline-end" aria-hidden="true" />
                </Button>
                <Button asChild variant="outline">
                  <Link href="/o-projekcie">O symulacji</Link>
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
