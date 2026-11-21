import type { Metadata } from "next"
import Link from "next/link"
import { Info, ShieldCheck } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@workspace/ui/components/alert"
import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { AdminLoginForm } from "@/components/admin-login-form"
import { PageHeader } from "@/components/page-header"
import { getAdminSession } from "@/server/auth/admin-session"
import { getEnv } from "@zpr/contracts/env"

export const dynamic = "force-dynamic"

export const metadata: Metadata = { title: "Logowanie administratora" }

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>
}) {
  const params = await searchParams
  const session = await getAdminSession()
  const env = getEnv()

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-10 sm:px-6">
      <PageHeader
        eyebrow="Administracja"
        title="Dostęp do konfiguracji"
        lead="Panel służy do wersjonowania reguł, parametrów i źródeł wiedzy. Nie zawiera danych osobowych."
      />

      {!session.gateEnabled && (
        <Alert variant="warning">
          <Info aria-hidden="true" />
          <AlertTitle>Bramka administratora jest wyłączona</AlertTitle>
          <AlertDescription>
            W środowisku demo <code>ADMIN_GATE_ENABLED=false</code>. Panel jest
            dostępny bez logowania, aby ułatwić przegląd. W produkcji ustaw
            <code> ADMIN_GATE_ENABLED=true</code> i silne hasło.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck aria-hidden="true" className="size-4 text-primary" />
            {session.gateEnabled ? "Zaloguj się" : "Przejdź do panelu"}
          </CardTitle>
          <CardDescription>
            {session.gateEnabled
              ? "Sesja jest podpisana HMAC i wygasa po 8 godzinach."
              : "Możesz otworzyć panel bez danych dostępowych."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {session.gateEnabled ? (
            <>
              <AdminLoginForm next={params.next} />
              <p className="text-xs text-pretty text-muted-foreground">
                Konto administratora jest konfigurowane zmiennymi{" "}
                <code>ADMIN_EMAIL</code> i <code>ADMIN_DEMO_PASSWORD</code>.
                Nie używaj domyślnego hasła poza środowiskiem lokalnym.
              </p>
            </>
          ) : (
            <>
              <Button asChild className="w-full">
                <Link href="/admin">Otwórz panel administratora</Link>
              </Button>
              <p className="text-xs text-muted-foreground">
                Domyślne konto w pliku <code>.env.example</code>:{" "}
                {env.ADMIN_EMAIL} (hasło tylko lokalne).
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
