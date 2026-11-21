import type { Metadata } from "next"
import Link from "next/link"
import {
  ArrowRight,
  ClipboardList,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
  Smartphone,
} from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@workspace/ui/components/alert"
import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { OnboardingWizard } from "@/components/onboarding-wizard"
import { PageHeader } from "@/components/page-header"
import { mobywatel as copy } from "@/messages/pl"
import { getMobywatelSession } from "@/server/auth/mobywatel-session"

export const dynamic = "force-dynamic"

export const metadata: Metadata = { title: "Kreator sytuacji" }

const privacy = [
  {
    icon: LockKeyhole,
    title: "Minimum danych",
    text: "Nie wymagamy PESEL-u. Daty i kwoty wystarczą do wstępnego sprawdzenia uprawnień.",
  },
  {
    icon: ShieldCheck,
    title: "Zgody rozdzielone",
    text: "Zgodę na dane zdrowotne, asystenta AI i dokumenty zbieramy osobno. Każdą można wyłączyć.",
  },
  {
    icon: ClipboardList,
    title: "Sprawa z numerem",
    text: "Na końcu powstaje sprawa w bazie demo. Możesz ją otworzyć w panelu i wrócić do obliczeń.",
  },
] as const

export default async function StartPage() {
  const session = await getMobywatelSession()

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
      <PageHeader
        eyebrow="Kreator"
        title="Opisz swoją sytuację w czterech krokach"
        lead={
          session
            ? "Dane z mObywatel (symulacja) są już wpisane. Sprawdź je, uzupełnij resztę i zapisz sprawę."
            : "Wypełnij pola ręcznie albo zaloguj się przez mObywatel (symulacja), aby uzupełnić dane osobowe automatycznie."
        }
      />

      {session && (
        <Alert variant="success" className="mt-6">
          <ShieldCheck aria-hidden="true" />
          <AlertTitle>{copy.sessionTitle}</AlertTitle>
          <AlertDescription>
            {session.profile.firstName} {session.profile.lastName} ·{" "}
            {copy.sessionText}{" "}
            <Link href="/mobywatel" className="underline underline-offset-4">
              {copy.sessionChange}
            </Link>
          </AlertDescription>
        </Alert>
      )}

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.6fr_1fr] lg:items-start">
        <OnboardingWizard mobywatelProfile={session?.profile ?? null} />

        <div className="space-y-4">
          {!session && (
            <Card className="border-primary/30 bg-primary/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Smartphone aria-hidden="true" className="size-4 text-primary" />
                  {copy.startCalloutTitle}
                </CardTitle>
                <CardDescription>{copy.startCalloutText}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild className="w-full">
                  <Link href="/mobywatel">
                    {copy.startCalloutCta}
                    <ArrowRight data-icon="inline-end" aria-hidden="true" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles aria-hidden="true" className="size-4 text-primary" />
                Co powstanie po drodze
              </CardTitle>
              <CardDescription>
                Kreator zapisuje spójny zestaw danych, nie pojedynczy formularz.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {privacy.map((item) => (
                <div key={item.title} className="flex gap-3">
                  <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-secondary text-primary">
                    <item.icon aria-hidden="true" className="size-4" />
                  </span>
                  <div>
                    <p className="text-sm font-medium">{item.title}</p>
                    <p className="text-xs text-pretty text-muted-foreground">
                      {item.text}
                    </p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border-primary/20 bg-primary/5">
            <CardHeader>
              <CardTitle className="text-base">Wolisz najpierw policzyć?</CardTitle>
              <CardDescription>
                Kalkulator działa bez tworzenia sprawy. Możesz porównać warianty
                i dopiero potem zapisać wynik.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    </div>
  )
}
