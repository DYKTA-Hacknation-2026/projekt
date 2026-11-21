import type { Metadata } from "next"
import Link from "next/link"
import { Info, ShieldCheck, Smartphone } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@workspace/ui/components/alert"
import { Button } from "@workspace/ui/components/button"
import { DataImportWizard } from "@/components/data-import-wizard"
import { PageHeader } from "@/components/page-header"
import { getMobywatelSession } from "@/server/auth/mobywatel-session"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Uzupełnij dane automatycznie (symulacja)",
}

export default async function DataImportPage() {
  const session = await getMobywatelSession()

  return (
    <div className="mx-auto w-full max-w-6xl space-y-8 px-4 py-10 sm:px-6">
      <PageHeader
        eyebrow="Dane automatyczne · symulacja"
        title="Uzupełnij dane automatycznie"
        lead="Pobierz dane z symulowanych systemów ZUS, pracodawcy, e-ZLA, USC i PUE/eZUS. Zdecyduj, jakie zakresy udostępnisz, a potem sprawdź i popraw każdą informację."
      />

      {!session ? (
        <Alert variant="warning">
          <Smartphone aria-hidden="true" />
          <AlertTitle>Najpierw zaloguj się przez mObywatel (symulacja)</AlertTitle>
          <AlertDescription className="space-y-3">
            <p>
              Pobieranie danych zaczyna się od istniejącej symulacji logowania.
              Wybierz profil testowy, a następnie wróć tutaj.
            </p>
            <Button asChild size="sm">
              <Link href="/mobywatel">Przejdź do logowania</Link>
            </Button>
          </AlertDescription>
        </Alert>
      ) : (
        <>
          <Alert variant="info">
            <Info aria-hidden="true" />
            <AlertTitle>To nie jest połączenie z systemami państwowymi</AlertTitle>
            <AlertDescription>
              Wszystkie źródła, dane i decyzje są syntetyczne. Symulacja służy
              do testowania procesu i nie wywołuje skutków prawnych.
            </AlertDescription>
          </Alert>

          <DataImportWizard persona={session.persona} />

          <Alert variant="success">
            <ShieldCheck aria-hidden="true" />
            <AlertTitle>Możesz przerwać w każdej chwili</AlertTitle>
            <AlertDescription>
              Rezygnacja z pobierania nie blokuje kreatora. W każdej chwili
              możesz wrócić do formularza i uzupełnić dane ręcznie.
            </AlertDescription>
          </Alert>
        </>
      )}
    </div>
  )
}
