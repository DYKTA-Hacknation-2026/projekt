import Link from "next/link"
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Calculator,
  Info,
  FileCheck2,
  FileText,
  FolderOpen,
  LockKeyhole,
  MessagesSquare,
  ScanLine,
  ShieldCheck,
} from "lucide-react"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { home } from "@/messages/pl"
import { formatPln } from "@/lib/format"
import "./home.css"

const panelRows = [
  ["Urlop macierzyński", "20 tygodni"],
  ["Urlop rodzicielski", "41 tygodni"],
  ["Dla drugiego rodzica", "9 tygodni"],
]

export default function HomePage() {
  return (
    <div className="guide">
      <section className="guide-hero hero wrap" data-enter>
        <div className="guide-intro">
          <p className="guide-kicker">
            <BookOpen size={15} /> Przewodnik dla rodziców
          </p>
          <h1>
            Sprawdź, co ci <em>przysługuje.</em>
          </h1>
          <p className="guide-lead">
            Zasiłki, urlopy i dokumenty w jednym miejscu. Sprawdź uprawnienia
            obojga rodziców i zaplanuj czas po narodzinach dziecka.
          </p>
          <div className="guide-actions">
            <Link href="/dokumenty">
              <FileText size={17} /> Sprawdź dokumenty <ArrowRight size={16} />
            </Link>
            <Link href="/kalkulator">
              <Calculator size={17} /> Oblicz zasiłek
            </Link>
          </div>
          <p className="guide-proof">
            <LockKeyhole size={14} /> Bez logowania <span>·</span> Bez numeru
            PESEL
          </p>
        </div>
        <div className="dossier app-frame" data-visual="">
          <div className="dossier-label">
            <FolderOpen size={16} /> Teczka świadczeń <span>DEMO</span>
          </div>
          <div className="receipt">
            <div className="receipt-id">
              <ScanLine size={19} /> ZPR-DEMO-001
            </div>
            <p>Szacunek łączny</p>
            <strong>{formatPln(15_540_000)}</strong>
            <dl>
              {panelRows.map(([label, value]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
            <div className="receipt-end">
              <span className="barcode" aria-hidden="true" /> S-01 / S-10
            </div>
          </div>
          <p className="dossier-foot">
            <Info size={14} /> Podstawa 8 000 zł brutto · wynik niezweryfikowany (Q-29)
          </p>
        </div>
      </section>
      <section className="guide-tools">
        <div className="guide-wrap wrap">
          <h2>Narzędzia dla rodziców</h2>
          <div className="tool-grid">
            {home.paths.map((path, i) => {
              const Icon =
                [FolderOpen, Calculator, MessagesSquare][i] ?? FileText
              return (
                <Link href={path.href} key={path.href}>
                  <span className="tool-icon">
                    <Icon size={23} />
                  </span>
                  <ArrowUpRight className="tool-arrow" size={19} />
                  <h3>{path.title}</h3>
                  <p>{path.description}</p>
                </Link>
              )
            })}
          </div>
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
                Planowanie urlopu w trzech krokach
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
              Przykładowe sytuacje rodziców
            </h2>
            <p className="text-sm text-pretty text-muted-foreground">
              Dane są syntetyczne i wymyślone na potrzeby demonstracji. Każda
              osoba odpowiada scenariuszowi z dokumentacji projektu, więc jury
              może porównać wynik z oczekiwanym.
            </p>
            <div className="rounded-xl border border-border/70 bg-card p-4">
              <div className="flex items-center gap-2 text-sm font-medium">
                <ShieldCheck
                  aria-hidden="true"
                  className="size-4 text-primary"
                />
                Uczciwie o brakach
              </div>
              <p className="mt-2 text-sm text-pretty text-muted-foreground">
                Minimalna podstawa i kwota świadczenia rodzicielskiego (Q-29)
                oraz polityka zaokrągleń (Q-15) czekają na zatwierdzenie.
                Dlatego kalkulator pokazuje status „Wymaga danych”, a nie
                wymyśloną kwotę.
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
                  <p className="text-sm text-muted-foreground">
                    {persona.role}
                  </p>
                  <p className="mt-1 text-xs text-pretty text-muted-foreground">
                    {persona.note}
                  </p>
                </div>
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="shrink-0"
                >
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

      <section className="mx-auto w-full max-w-6xl px-4 pb-12 sm:px-6">
        <div className="flex flex-col gap-5 rounded-2xl border border-primary/20 bg-card p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
          <div className="max-w-2xl space-y-2">
            <p className="flex items-center gap-2 text-xs font-semibold tracking-[0.18em] text-primary uppercase">
              <BookOpen aria-hidden="true" className="size-4" />
              Centrum wiedzy
            </p>
            <h2 className="text-2xl font-semibold tracking-tight text-balance">
              Nie wiesz, od czego zacząć?
            </h2>
            <p className="text-sm text-pretty text-muted-foreground">
              Artykuły, najczęstsze pytania, karty dokumentów, przewodniki i
              słownik pojęć. Wszystko prostym językiem, z datą weryfikacji i
              odnośnikiem do oficjalnego źródła.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button asChild>
              <Link href="/wiedza">
                Przeglądaj wiedzę
                <ArrowRight data-icon="inline-end" aria-hidden="true" />
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/wiedza/faq">Najczęstsze pytania</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 pb-20 sm:px-6">
        <div className="overflow-hidden rounded-2xl border border-primary/20 bg-primary px-6 py-10 text-primary-foreground sm:px-10">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="max-w-xl space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold tracking-[0.18em] uppercase">
                <FileCheck2 aria-hidden="true" className="size-4" />
                Start w 3 minuty
              </div>
              <h2 className="text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
                Zobacz, jak wygląda twoja sprawa po wpisaniu kilku danych.
              </h2>
              <p className="text-sm text-pretty text-primary-foreground">
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
    </div>
  )
}
