import type { Metadata } from "next"
import Link from "next/link"
import { Info, ShieldCheck, Smartphone } from "lucide-react"

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@workspace/ui/components/alert"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { MobywatelLogin } from "@/components/mobywatel-login"
import { PageHeader } from "@/components/page-header"
import { mobywatel as copy } from "@/messages/pl"
import { getMobywatelSession } from "@/server/auth/mobywatel-session"
import { listMobywatelPersonas } from "@/server/sim/mobywatel"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Logowanie przez mObywatel (symulacja)",
}

export default async function MobywatelPage() {
  const session = await getMobywatelSession()
  const personas = listMobywatelPersonas()

  return (
    <div className="page-shell py-10">
      <PageHeader
        eyebrow="Logowanie · symulacja"
        title={copy.title}
        lead={copy.lead}
      />

      {session && (
        <Alert variant="info" className="mt-6">
          <ShieldCheck aria-hidden="true" />
          <AlertTitle>{copy.sessionTitle}</AlertTitle>
          <AlertDescription>
            {session.profile.firstName} {session.profile.lastName} ·{" "}
            <Link href="/start" className="underline underline-offset-4">
              przejdź do kreatora
            </Link>
          </AlertDescription>
        </Alert>
      )}

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.55fr_1fr] lg:items-start">
        <MobywatelLogin personas={personas} />

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Smartphone
                  aria-hidden="true"
                  className="size-4 text-primary"
                />
                Jak działa prawdziwe logowanie
              </CardTitle>
              <CardDescription>
                Uproszczony opis login.gov.pl i aplikacji mObywatel.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ol className="grid gap-3 text-sm text-muted-foreground">
                <li>
                  <span className="font-medium text-foreground">1.</span> Usługa
                  publiczna przekierowuje do <strong>login.gov.pl</strong>.
                </li>
                <li>
                  <span className="font-medium text-foreground">2.</span>{" "}
                  Użytkownik wybiera <strong>aplikację mObywatel</strong> i
                  skanuje kod QR (na komputerze) albo przechodzi do aplikacji
                  (na telefonie).
                </li>
                <li>
                  <span className="font-medium text-foreground">3.</span>{" "}
                  Aplikacja pokazuje, która instytucja prosi o dane i jaki jest
                  zakres przekazania.
                </li>
                <li>
                  <span className="font-medium text-foreground">4.</span> Po
                  potwierdzeniu (PIN/biometria) usługa dostaje kod autoryzacyjny
                  i dane z uzgodnionego zakresu.
                </li>
              </ol>
            </CardContent>
          </Card>

          <Card className="border-warning/30 bg-warning/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Info
                  aria-hidden="true"
                  className="size-4 text-warning-foreground"
                />
                Co jest inne w demo
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>
                Nie ma prawdziwego QR kodu, aplikacji ani połączenia z
                login.gov.pl. Wybierasz syntetyczny profil testowy.
              </p>
              <p>
                Zamiast kodu autoryzacyjnego otrzymujesz podpisany, krótkotrwały
                cookie (10 minut), który zawiera tylko identyfikator profilu.
              </p>
              <p>
                Nie przekazujemy numeru PESEL — aplikacja go nie potrzebuje.
                Zakres danych to imię, nazwisko, data urodzenia, miejscowość i
                e-mail.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
