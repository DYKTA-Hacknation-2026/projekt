import type { Metadata } from "next"
import { ClipboardList, LockKeyhole, ShieldCheck, Sparkles } from "lucide-react"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { OnboardingWizard } from "@/components/onboarding-wizard"
import { PageHeader } from "@/components/page-header"

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
]

export default function StartPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
      <PageHeader
        eyebrow="Kreator"
        title="Opisz swoją sytuację w czterech krokach"
        lead="Pola są wstępnie wypełnione przykładem Anny. Zmień je na własne albo zostaw demo, aby zobaczyć pełny przepływ."
      />

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.6fr_1fr] lg:items-start">
        <OnboardingWizard />

        <div className="space-y-4">
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
