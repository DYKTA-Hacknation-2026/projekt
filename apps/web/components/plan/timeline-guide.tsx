import {
  AlertTriangle,
  CalendarClock,
  Clock,
  Info,
  Landmark,
  Scale,
  ShieldCheck,
} from "lucide-react"

import { Badge } from "@workspace/ui/components/badge"

export function TimelineGuide({
  ruleSetVersion,
  verified,
  unverifiedRules,
  missing,
}: {
  ruleSetVersion: string
  verified: boolean
  unverifiedRules: string[]
  missing: string[]
}) {
  return (
    <section
      aria-labelledby="jak-czytac-plan"
      className="rounded-xl border border-border/80 bg-card p-5 sm:p-6"
    >
      <div className="flex items-center gap-2">
        <Info aria-hidden="true" className="size-5 text-primary" />
        <h2 id="jak-czytac-plan" className="text-xl font-semibold tracking-tight">
          Jak czytać Wasz plan?
        </h2>
      </div>

      <div className="mt-5 grid gap-6 md:grid-cols-2">
        <div className="space-y-2">
          <h3 className="text-sm font-semibold">Urlop a zasiłek</h3>
          <p className="text-sm text-pretty text-muted-foreground">
            <strong className="font-medium text-foreground">Urlop</strong> to
            czas wolny od pracy, którego udziela pracodawca.{" "}
            <strong className="font-medium text-foreground">Zasiłek</strong> to
            pieniądze wypłacane za czas urlopu — przez pracodawcę albo ZUS.
            Można mieć prawo do urlopu i nie mieć prawa do zasiłku, dlatego
            pokazujemy je razem, ale nie zamiennie.
          </p>
        </div>

        <div className="space-y-2">
          <h3 className="text-sm font-semibold">Skąd pochodzą daty</h3>
          <p className="text-sm text-pretty text-muted-foreground">
            Daty wylicza ten sam silnik reguł, który zasila kalkulator. Liczą
            się od przewidywanego terminu porodu albo od rzeczywistej daty
            porodu, jeśli ją podasz. Przy każdym wydarzeniu znajdziesz podstawę
            prawną i identyfikator reguły.
          </p>
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <Badge variant="outline" className="font-mono">
              {ruleSetVersion}
            </Badge>
            {verified ? (
              <Badge variant="success">
                <ShieldCheck aria-hidden="true" />
                Reguły zweryfikowane
              </Badge>
            ) : (
              <Badge variant="warning">
                <AlertTriangle aria-hidden="true" />
                Część reguł niezweryfikowana
                {unverifiedRules.length > 0
                  ? `: ${unverifiedRules.join(", ")}`
                  : ""}
              </Badge>
            )}
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-semibold">Poziom pewności daty</h3>
          <ul className="space-y-2 text-sm">
            <li className="flex items-start gap-2">
              <Badge variant="warning">Termin ustawowy</Badge>
              <span className="text-muted-foreground">
                Wynika wprost z przepisów. Może przesunąć się razem z datą
                porodu.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <Badge variant="info">Zalecane działanie</Badge>
              <span className="text-muted-foreground">
                Data obliczona z ustawowego wyprzedzenia, np. wniosek złożony
                odpowiednio wcześniej przed urlopem.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <Badge variant="secondary">Wynika z planu</Badge>
              <span className="text-muted-foreground">
                Zależy od Twojej decyzji: długości urlopu, podziału między
                rodzicami albo wybranego wariantu.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <Badge variant="outline">
                <Clock aria-hidden="true" />
                Data orientacyjna
              </Badge>
              <span className="text-muted-foreground">
                Wyliczona od przewidywanego terminu porodu, a nie od
                potwierdzonej daty urodzenia.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <Badge variant="warning">
                <AlertTriangle aria-hidden="true" />
                Wymaga weryfikacji
              </Badge>
              <span className="text-muted-foreground">
                Brakuje danych, np. informacji o liczbie ubezpieczonych u
                płatnika. Nie zgadujemy tej wartości.
              </span>
            </li>
          </ul>
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-semibold">Dlaczego plan może się zmienić</h3>
          <p className="flex items-start gap-2 text-sm text-pretty text-muted-foreground">
            <CalendarClock aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            Po porodzie zmienia się data, od której liczą się wnioski i zasiłki.
            Część uprawnień zależy też od indywidualnej sytuacji: tytułu
            ubezpieczenia, przerw w składkach, decyzji pracodawcy i podziału
            urlopu między rodzicami. Dlatego po narodzinach wróć do planu i
            zaktualizuj założenia.
          </p>
          <p className="flex items-start gap-2 text-sm text-pretty text-muted-foreground">
            <Landmark aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            Plan nie jest decyzją ZUS ani gwarancją wypłaty. Ostateczna decyzja
            należy do płatnika składek lub ZUS.
          </p>
        </div>
      </div>

      {missing.length > 0 && (
        <div className="mt-5 rounded-lg border border-warning/30 bg-warning/[0.06] p-4">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <AlertTriangle aria-hidden="true" className="size-4 text-warning-foreground" />
            Co wymaga uzupełnienia
          </h3>
          <ul className="mt-2 space-y-1.5 text-sm text-pretty text-muted-foreground">
            {missing.map((item) => (
              <li key={item} className="flex gap-2">
                <span aria-hidden="true" className="mt-2 size-1 shrink-0 rounded-full bg-warning" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-5 flex flex-col gap-2 border-t border-border/70 pt-4 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <span className="inline-flex items-center gap-1.5">
          <Scale aria-hidden="true" className="size-3.5" />
          Podstawy prawne i źródła są przy każdym wydarzeniu w szczegółach.
        </span>
        <span>
          Dane demonstracyjne. Nie jest to oficjalny serwis ZUS.
        </span>
      </div>
    </section>
  )
}
