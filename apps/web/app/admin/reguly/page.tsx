import type { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"
import {
  ArrowLeft,
  CalendarClock,
  Save,
  Scale,
  ShieldCheck,
} from "lucide-react"

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@workspace/ui/components/alert"
import { Button } from "@workspace/ui/components/button"
import { DbOffline } from "@/components/db-offline"
import { PageHeader } from "@/components/page-header"
import { StatCard } from "@/components/stat-card"
import { formatDate } from "@/lib/format"
import { getAdminSession } from "@/server/auth/admin-session"
import { getAdminRules } from "@/server/api-client"

import { RuleEditorCard } from "./rule-editor"

export const dynamic = "force-dynamic"

export const metadata: Metadata = { title: "Parametry prawne — administracja" }

export default async function AdminRulesPage({
  searchParams,
}: {
  searchParams: Promise<{ zapisano?: string; wersja?: string; blad?: string }>
}) {
  const session = await getAdminSession()

  if (session.gateEnabled && !session.authenticated) {
    redirect("/admin/login?next=/admin/reguly")
  }

  const params = await searchParams
  let data: Awaited<ReturnType<typeof getAdminRules>>

  try {
    data = await getAdminRules()
  } catch (error) {
    return (
      <div className="page-shell space-y-6 py-10">
        <PageHeader
          eyebrow="Administracja"
          title="Parametry prawne"
          lead="Reguły są chwilowo niedostępne."
        />
        <DbOffline error={error} />
      </div>
    )
  }

  const pending = data.rules.filter(
    (rule) => (rule.versions[0]?.effectiveFrom ?? "") > data.asOf
  ).length
  const unverified = data.rules.filter(
    (rule) => rule.current && rule.current.verificationStatus !== "VERIFIED"
  ).length

  return (
    <div className="page-shell space-y-8 py-10">
      <PageHeader
        eyebrow="Administracja · reguły"
        title="Parametry prawne"
        lead="Zmiany prawa wprowadza się tutaj, bez edycji kodu. Zapis tworzy nową, niezmienną wersję reguły — kalkulator, kwalifikowalność i planer od razu korzystają z wartości obowiązującej w danej dacie."
        actions={
          <Button asChild variant="outline">
            <Link href="/admin">
              <ArrowLeft data-icon="inline-start" aria-hidden="true" />
              Panel administratora
            </Link>
          </Button>
        }
      />

      <section aria-label="Statystyki parametrów">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Reguły"
            value={data.rules.length}
            hint="Kody LR z edytorem"
            icon={<Scale aria-hidden="true" className="size-4" />}
          />
          <StatCard
            label="Obowiązują dziś"
            value={data.rules.filter((rule) => rule.current).length}
            hint={`Stan na ${formatDate(data.asOf)}`}
            icon={<ShieldCheck aria-hidden="true" className="size-4" />}
          />
          <StatCard
            label="Przyszłe wersje"
            value={pending}
            hint="Czekają na datę wejścia"
            icon={<CalendarClock aria-hidden="true" className="size-4" />}
          />
          <StatCard
            label="Do weryfikacji"
            value={unverified}
            hint="Status inny niż VERIFIED"
            icon={<Save aria-hidden="true" className="size-4" />}
          />
        </div>
      </section>

      {params.zapisano && (
        <Alert variant="success">
          <ShieldCheck aria-hidden="true" />
          <AlertTitle>Zapisano nową wersję</AlertTitle>
          <AlertDescription>
            Reguła {params.zapisano}
            {params.wersja ? ` · ${params.wersja}` : ""} została zapisana.
            Poprzednia wersja została zamknięta dzień przed nową datą
            obowiązywania.
          </AlertDescription>
        </Alert>
      )}

      {params.blad && (
        <Alert variant="destructive">
          <Scale aria-hidden="true" />
          <AlertTitle>Nie zapisano zmian</AlertTitle>
          <AlertDescription>{params.blad}</AlertDescription>
        </Alert>
      )}

      <Alert variant="info">
        <ShieldCheck aria-hidden="true" />
        <AlertTitle>Wersje są niezmienne</AlertTitle>
        <AlertDescription>
          <p>
            Nie edytujemy opublikowanej historii. Każda zmiana to nowa wersja z
            własną datą „obowiązuje od”. Dzięki temu obliczenie sprzed zmiany
            nadal korzysta z dawnych wartości, a raport pokazuje wersję reguł.
            Wartości procentowe wpisujemy w skali 0–100 (np. 70), kwoty w
            złotych.
          </p>
        </AlertDescription>
      </Alert>

      <section aria-label="Reguły i parametry" className="space-y-4">
        {data.rules.map((rule) => (
          <RuleEditorCard key={rule.ruleId} rule={rule} />
        ))}
      </section>
    </div>
  )
}
