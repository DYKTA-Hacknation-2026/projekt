import type { Metadata } from "next"
import { Info, Scale, ShieldCheck } from "lucide-react"

import type { RuleSet } from "@zpr/domain"
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@workspace/ui/components/alert"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { CalculatorForm } from "@/components/calculator-form"
import { DbOffline } from "@/components/db-offline"
import { PageHeader } from "@/components/page-header"
import { calculator } from "@/messages/pl"
import { getActiveRuleSet } from "@/server/api-client"

export const metadata: Metadata = { title: "Kalkulator zasiłków" }
export const dynamic = "force-dynamic"

export default async function CalculatorPage() {
  let ruleSet: RuleSet
  try {
    ruleSet = await getActiveRuleSet()
  } catch (error) {
    return (
      <div className="mx-auto w-full max-w-6xl space-y-8 px-4 py-10 sm:px-6">
        <PageHeader
          eyebrow="Kalkulator"
          title={calculator.title}
          lead={calculator.lead}
        />
        <DbOffline error={error} />
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-8 px-4 py-10 sm:px-6">
      <PageHeader
        eyebrow="Kalkulator"
        title={calculator.title}
        lead={calculator.lead}
      />

      <Alert variant="info">
        <Info aria-hidden="true" />
        <AlertTitle>Wynik demonstracyjny, ale deterministyczny</AlertTitle>
        <AlertDescription>
          Ten sam zestaw danych wejściowych zawsze daje ten sam wynik. Silnik
          korzysta z zestawu reguł {ruleSet.version} zapisanego w bazie.
          {ruleSet.verified
            ? " Wszystkie parametry są zweryfikowane."
            : " Część parametrów (Q-29, Q-15) nie jest jeszcze zweryfikowana — wynik jest oznaczony jako szacunek."}
        </AlertDescription>
      </Alert>

      <CalculatorForm ruleSet={ruleSet} />

      <section className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Scale aria-hidden="true" className="size-4 text-primary" />
              Podstawa wymiaru
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-pretty text-muted-foreground">
            Średnie miesięczne wynagrodzenie brutto pomniejszone o{" "}
            {(ruleSet.basis.contributionDeduction * 100).toLocaleString(
              "pl-PL",
              {
                maximumFractionDigits: 2,
              }
            )}
            % składki chorobowej. Podstawa dzienna to 1/
            {ruleSet.basis.dailyDivisor} podstawy miesięcznej (U art. 36, 38;
            LR-112).
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldCheck aria-hidden="true" className="size-4 text-primary" />
              Stawki i wymiary
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-pretty text-muted-foreground">
            Macierzyński{" "}
            {Object.entries(ruleSet.maternity.weeksByChildren)
              .sort(([a], [b]) => Number(a) - Number(b))
              .map(([, weeks]) => weeks)
              .join("/")}{" "}
            tygodni, rodzicielski {ruleSet.parental.poolWeeks.single}/
            {ruleSet.parental.poolWeeks.multiple} tygodnie, z „Za życiem”{" "}
            {ruleSet.parental.poolWeeks.zaZyciemSingle}/
            {ruleSet.parental.poolWeeks.zaZyciemMultiple}.{" "}
            {ruleSet.parental.nonTransferableWeeks} tygodni drugiego rodzica
            jest niezbywalne (KP art. 180 § 1, 182¹a; LR-123, LR-127).
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Info aria-hidden="true" className="size-4 text-primary" />
              Czego kalkulator nie robi
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-pretty text-muted-foreground">
            Nie rozstrzyga o prawie do zasiłku, nie zastępuje decyzji ZUS i nie
            uwzględnia indywidualnych przerw w ubezpieczeniu. Do tego służy
            osobny moduł uprawnień i analiza dokumentów.
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
