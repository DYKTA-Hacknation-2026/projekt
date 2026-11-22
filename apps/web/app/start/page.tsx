import type { Metadata } from "next"
import Link from "next/link"
import {
  ArrowRight,
  CalendarClock,
  ClipboardList,
  FileCheck2,
  ListChecks,
  LockKeyhole,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Wallet,
} from "lucide-react"

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@workspace/ui/components/alert"
import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { PageHeader } from "@/components/page-header"
import { SituationWizard } from "@/components/situation-wizard"
import { mobywatel as copy } from "@/messages/pl"
import { getMobywatelSession } from "@/server/auth/mobywatel-session"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Sprawdź uprawnienia i przygotuj formalności",
}

const outcomes = [
  {
    icon: ListChecks,
    title: "Indywidualne zestawienie uprawnień",
    text: "Zasiłki, urlopy i świadczenia, które wynikają z Twojej sytuacji.",
  },
  {
    icon: Wallet,
    title: "Szacunkowe kwoty",
    text: "Wyliczone przez deterministyczny silnik, z jasnym oznaczeniem niepewności.",
  },
  {
    icon: CalendarClock,
    title: "Plan urlopów i terminów",
    text: "Kiedy złożyć wniosek, od kiedy liczyć urlop i co zaplanować wcześniej.",
  },
  {
    icon: FileCheck2,
    title: "Lista dokumentów",
    text: "Co przygotować, kto ma wystawić dokument i gdzie go złożyć.",
  },
  {
    icon: Sparkles,
    title: "Kolejne kroki",
    text: "Konkretny plan działania zamiast ogólnej informacji o sukcesie.",
  },
] as const

export default async function StartPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const session = await getMobywatelSession()
  const params = await searchParams
  const importAccepted = params.import === "accepted"

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6">
      <PageHeader
        eyebrow="Kreator sytuacji"
        title="Sprawdź swoje uprawnienia i przygotuj się do formalności"
        lead="Odpowiedz na kilka krótkich pytań dotyczących Twojej sytuacji. Sprawdzimy, jakie świadczenia i urlopy mogą Ci przysługiwać oraz jakie dokumenty warto przygotować."
        actions={
          <Button asChild>
            <Link href="#wizard">
              Zacznij pytania
              <ArrowRight data-icon="inline-end" aria-hidden="true" />
            </Link>
          </Button>
        }
      />

      {importAccepted && (
        <Alert variant="info" className="mt-6">
          <Sparkles aria-hidden="true" />
          <AlertTitle>Dane z symulowanych źródeł</AlertTitle>
          <AlertDescription>
            Zaakceptowany raport pobrania wstępnie uzupełnił formularz. Sprawdź
            każdą wartość w kreatorze i popraw ją, jeśli się nie zgadza.
          </AlertDescription>
        </Alert>
      )}

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.35fr_1fr] lg:items-start">
        <Card className="border-primary/25 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck aria-hidden="true" className="size-5 text-primary" />
              Co otrzymasz na końcu
            </CardTitle>
            <CardDescription>
              Jeden spójny proces: od opisu sytuacji, przez analizę, do
              przygotowania dokumentów. Bez zakładania konta.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {outcomes.map((item) => (
              <div key={item.title} className="flex gap-3">
                <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-background text-primary">
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

        <div className="space-y-4">
          <Alert variant="info">
            <LockKeyhole aria-hidden="true" />
            <AlertTitle>Analiza informacyjna, nie decyzja ZUS</AlertTitle>
            <AlertDescription>
              Wynik nie zastępuje decyzji ZUS ani płatnika. Nie wymagamy PESEL-u
              ani numeru konta. Możesz przejść cały proces bez zapisywania
              sprawy.
            </AlertDescription>
          </Alert>

          {session ? (
            <Card className="border-primary/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Smartphone
                    aria-hidden="true"
                    className="size-4 text-primary"
                  />
                  {copy.sessionTitle}
                </CardTitle>
                <CardDescription>
                  {session.profile.firstName} {session.profile.lastName} ·{" "}
                  {copy.sessionText}{" "}
                  <Link
                    href="/mobywatel"
                    className="underline underline-offset-4"
                  >
                    {copy.sessionChange}
                  </Link>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild variant="outline" className="w-full">
                  <Link href="/dane">
                    Pobierz dane z symulowanych źródeł
                    <ArrowRight data-icon="inline-end" aria-hidden="true" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Smartphone
                    aria-hidden="true"
                    className="size-4 text-primary"
                  />
                  {copy.startCalloutTitle}
                </CardTitle>
                <CardDescription>{copy.startCalloutText}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button asChild className="w-full">
                  <Link href="/mobywatel">
                    {copy.startCalloutCta}
                    <ArrowRight data-icon="inline-end" aria-hidden="true" />
                  </Link>
                </Button>
                <Button asChild variant="ghost" className="w-full">
                  <Link href="#wizard">Wolę wypełnić ręcznie</Link>
                </Button>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ClipboardList
                  aria-hidden="true"
                  className="size-4 text-primary"
                />
                Sprawa jest opcjonalna
              </CardTitle>
              <CardDescription>
                Na końcu możesz zapisać sprawę i wrócić do niej z numerem. Bez
                zapisu nadal widzisz wyniki i możesz sprawdzić wniosek.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Masz już wypełniony wniosek?
              </CardTitle>
              <CardDescription>
                Możesz zacząć od sprawdzenia dokumentu. Jeśli najpierw opiszesz
                sytuację, analiza porówna dokument z Twoim profilem.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline" className="w-full">
                <Link href="/dokumenty">Przejdź do analizy dokumentu</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <section id="wizard" className="mt-10 scroll-mt-6">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">
              Kreator sytuacji
            </h2>
            <p className="text-sm text-muted-foreground">
              Pięć krótkich kroków. Pytania zmieniają się wraz z Twoją sytuacją.
            </p>
          </div>
          <p className="text-xs text-muted-foreground">
            Możesz wrócić do poprzedniego kroku bez utraty odpowiedzi.
          </p>
        </div>
        <SituationWizard mobywatelProfile={session?.profile ?? null} />
      </section>
    </div>
  )
}
