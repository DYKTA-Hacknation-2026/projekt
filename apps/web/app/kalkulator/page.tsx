import type { Metadata } from "next"
import { Info, Scale, ShieldCheck } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@workspace/ui/components/alert"
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card"
import { CalculatorForm } from "@/components/calculator-form"
import { PageHeader } from "@/components/page-header"
import { calculator } from "@/messages/pl"

export const metadata: Metadata = { title: "Kalkulator zasiłków" }

export default function CalculatorPage() {
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
          oznacza kwoty jako niezweryfikowane do czasu uzupełnienia minimalnej
          podstawy i świadczenia rodzicielskiego (Q-29) oraz zasad zaokrąglania
          (Q-15). Nie ukrywamy tych braków.
        </AlertDescription>
      </Alert>

      <CalculatorForm />

      <section className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Scale aria-hidden="true" className="size-4 text-primary" />
              Podstawa wymiaru
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-pretty text-muted-foreground">
            Średnie miesięczne wynagrodzenie brutto pomniejszone o 13,71%
            składki chorobowej. Podstawa dzienna to 1/30 podstawy miesięcznej
            (U art. 36, 38; LR-112).
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
            Macierzyński 20/31/33/35/37 tygodni, rodzicielski 41/43 tygodnie,
            z „Za życiem” 65/67. Dziewięć tygodni drugiego rodzica jest
            niezbywalne (KP art. 180 § 1, 182¹a; LR-123, LR-127).
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
