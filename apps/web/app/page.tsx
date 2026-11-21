import Link from "next/link"
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  FileCheck2,
  Info,
  MessagesSquare,
  ShieldCheck,
  Sparkles,
  Wallet,
} from "lucide-react"

import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { Separator } from "@workspace/ui/components/separator"
import { home } from "@/messages/pl"
import { formatPln } from "@/lib/format"

const panelRows = [
  { label: "Ulga/stawka", value: "100% / 70%" },
  { label: "Macierzyński", value: "20 tygodni" },
  { label: "Rodzicielski", value: "41 tygodni" },
  { label: "Dla drugiego rodzica", value: "9 tygodni" },
]

export default function HomePage() {
  return (
    <>
      <section className="relative overflow-hidden border-b border-border/70">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60%_60%_at_85%_10%,color-mix(in_oklch,var(--primary)_12%,transparent),transparent_70%),radial-gradient(50%_50%_at_10%_90%,color-mix(in_oklch,var(--warning)_18%,transparent),transparent_70%)]"
        />
        <div className="mx-auto grid w-full max-w-6xl gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[1.15fr_0.85fr] lg:items-center lg:py-24">
          <div className="space-y-7">
            <Badge variant="outline" className="h-6 gap-1.5 bg-background/70 px-3">
              <Sparkles aria-hidden="true" className="size-3.5" />
              {home.eyebrow}
            </Badge>
            <div className="space-y-5">
              <h1 className="max-w-2xl text-4xl leading-[1.05] font-semibold tracking-tight text-balance sm:text-5xl lg:text-6xl">
                {home.title}
              </h1>
              <p className="max-w-xl text-lg text-pretty text-muted-foreground">
                {home.lead}
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button asChild size="lg" className="h-11 px-5 text-sm">
                <Link href="/dokumenty">
                  {home.primaryCta}
                  <ArrowRight data-icon="inline-end" aria-hidden="true" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="h-11 px-5 text-sm"
              >
                <Link href="/kalkulator">{home.secondaryCta}</Link>
              </Button>
            </div>
            <ul className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-3">
              {home.trust.map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <CheckCircle2
                    aria-hidden="true"
                    className="mt-0.5 size-4 shrink-0 text-success"
                  />
                  <span className="text-pretty">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <Card className="border-border/80 bg-card/90 shadow-xl shadow-primary/5 backdrop-blur">
            <CardHeader className="border-b border-border/70">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-base">Sprawa ZPR-DEMO-001</CardTitle>
                  <CardDescription>Anna Kowalska · S-01 / S-10</CardDescription>
                </div>
                <Badge variant="secondary" className="shrink-0">
                  Gotowa
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg bg-secondary/60 p-4">
                <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  Szacunek łączny
                </p>
                <p className="mt-1 text-3xl font-semibold tracking-tight tabular-nums">
                  {formatPln(15_540_000)}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Wynik demonstracyjny · wymaga potwierdzenia Q-29
                </p>
              </div>
              <dl className="grid gap-2">
                {panelRows.map((row) => (
                  <div
                    key={row.label}
                    className="flex items-center justify-between gap-3 text-sm"
                  >
                    <dt className="text-muted-foreground">{row.label}</dt>
                    <dd className="font-medium tabular-nums">{row.value}</dd>
                  </div>
                ))}
              </dl>
              <Separator />
              <div className="flex items-start gap-2 text-xs text-muted-foreground">
                <Info aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
                <p className="text-pretty">
                  Kwoty są wyliczone z podstawy 8 000 zł brutto i oznaczone jako
                  niezweryfikowane do czasu uzupełnienia parametrów zewnętrznych.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6">
        <div className="grid gap-4 md:grid-cols-3">
          {home.paths.map((path, index) => {
            const Icon = [CalendarDays, Wallet, MessagesSquare][index] ?? Info
            return (
              <Card key={path.href} className="h-full">
                <CardHeader>
                  <span className="mb-2 grid size-9 place-items-center rounded-lg bg-primary/10 text-primary">
                    <Icon aria-hidden="true" className="size-4" />
                  </span>
                  <CardTitle>{path.title}</CardTitle>
                  <CardDescription className="text-pretty">
                    {path.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Link
                    href={path.href}
                    className="inline-flex items-center gap-1 text-sm font-medium text-primary underline-offset-4 hover:underline"
                  >
                    Otwórz
                    <ArrowRight aria-hidden="true" className="size-3.5" />
                  </Link>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </section>

      <section className="border-y border-border/70 bg-secondary/40">
        <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold tracking-[0.18em] text-primary uppercase">
                Jak to działa
              </p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight">
                Trzy kroki, żadnych domysłów
              </h2>
            </div>
            <p className="max-w-sm text-sm text-pretty text-muted-foreground">
              Każdy wynik ma numer reguły, wersję zestawu przepisów i jawne
              założenia. Braki danych nie zamieniają się w zgadywanie.
            </p>
          </div>
          <ol className="mt-8 grid gap-4 md:grid-cols-3">
            {home.steps.map((step) => (
              <li
                key={step.number}
                className="rounded-xl border border-border/70 bg-card p-5"
              >
                <span className="font-mono text-xs font-semibold text-primary">
                  {step.number}
                </span>
                <h3 className="mt-2 text-lg font-semibold">{step.title}</h3>
                <p className="mt-2 text-sm text-pretty text-muted-foreground">
                  {step.text}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6">
        <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          <div className="space-y-4">
            <p className="text-xs font-semibold tracking-[0.18em] text-primary uppercase">
              Scenariusze demo
            </p>
            <h2 className="text-3xl font-semibold tracking-tight text-balance">
              Sprawdź konkretną historię, nie abstrakcyjny formularz
            </h2>
            <p className="text-sm text-pretty text-muted-foreground">
              Dane są syntetyczne i wymyślone na potrzeby demonstracji. Każda
              osoba odpowiada scenariuszowi z dokumentacji projektu, więc jury
              może porównać wynik z oczekiwanym.
            </p>
            <div className="rounded-xl border border-border/70 bg-card p-4">
              <div className="flex items-center gap-2 text-sm font-medium">
                <ShieldCheck aria-hidden="true" className="size-4 text-primary" />
                Uczciwie o brakach
              </div>
              <p className="mt-2 text-sm text-pretty text-muted-foreground">
                Minimalna podstawa i kwota świadczenia rodzicielskiego (Q-29)
                oraz polityka zaokrągleń (Q-15) czekają na zatwierdzenie. Dlatego
                kalkulator pokazuje status „Wymaga danych”, a nie wymyśloną kwotę.
              </p>
            </div>
          </div>

          <div className="grid gap-3">
            {home.personas.map((persona) => (
              <div
                key={persona.name}
                className="flex flex-col gap-3 rounded-xl border border-border/70 bg-card p-5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold">{persona.name}</h3>
                    <Badge variant="outline" className="font-mono text-[10px]">
                      {persona.scenario}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{persona.role}</p>
                  <p className="mt-1 text-xs text-pretty text-muted-foreground">
                    {persona.note}
                  </p>
                </div>
                <Button asChild variant="outline" size="sm" className="shrink-0">
                  <Link href="/panel">
                    Otwórz
                    <ArrowRight data-icon="inline-end" aria-hidden="true" />
                  </Link>
                </Button>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 pb-20 sm:px-6">
        <div className="overflow-hidden rounded-2xl border border-primary/20 bg-primary px-6 py-10 text-primary-foreground sm:px-10">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="max-w-xl space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold tracking-[0.18em] uppercase opacity-80">
                <FileCheck2 aria-hidden="true" className="size-4" />
                Start w 3 minuty
              </div>
              <h2 className="text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
                Zobacz, jak wygląda twoja sprawa po wpisaniu kilku danych.
              </h2>
              <p className="text-sm text-pretty text-primary-foreground/80">
                Bez konta, bez PESEL-u. W każdej chwili możesz wrócić do
                kalkulatora i porównać warianty.
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button asChild size="lg" variant="secondary" className="h-11">
                <Link href="/start">
                  Otwórz kreator
                  <ArrowRight data-icon="inline-end" aria-hidden="true" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="h-11 border-primary-foreground/30 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
              >
                <Link href="/o-projekcie">O projekcie</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
