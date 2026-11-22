import type { Metadata } from "next"
import Link from "next/link"
import {
  BookOpen,
  Bot,
  Database,
  FileSearch,
  Layers,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
} from "lucide-react"

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
import { PageHeader } from "@/components/page-header"
import {
  AI_DISCLOSURE,
  APP_NAME,
  LEGAL_DISCLOSURE,
  SIMULATION_DISCLOSURE,
} from "@/messages/pl"

export const metadata: Metadata = { title: "O projekcie i AI" }

const architecture = [
  {
    icon: Layers,
    title: "Modularny monolit",
    text: "Jedna aplikacja Next.js, wyraźne pakiety: domena, kontrakty, baza i UI. Reguły prawne są kodem, parametry — danymi.",
  },
  {
    icon: Database,
    title: "Jedna baza",
    text: "PostgreSQL 17 z pgvector. Schematy app, legal, kb i chat. Wektory, pełnotekstowe wyszukiwanie i dane aplikacji w jednym miejscu.",
  },
  {
    icon: Sparkles,
    title: "Deterministyczne kwoty",
    text: "Kalkulator nie korzysta z LLM. Wynik ma wejście, wersję silnika, ślad reguł i jawne braki danych.",
  },
  {
    icon: FileSearch,
    title: "Dokumenty bez udawania",
    text: "Analiza demo sprawdza PDF i metadane, ale nie twierdzi, że wykonała OCR. Pola zawsze wymagają potwierdzenia.",
  },
]

const sources = [
  ["Kodeks pracy", "KP art. 180, 182¹a, 182³, 183", "Urlopy i wymiary"],
  ["Ustawa zasiłkowa", "U art. 4, 30a, 31, 36, 38", "Prawo, stawki, podstawa"],
  ["R1316", "§ 12–33", "Dokumenty i terminy"],
  ["R322", "§ 2–17", "Wnioski urlopowe"],
  ["Poradnik ZUS 2026", "P s. 24–27", "Praktyczne objaśnienia"],
]

export default function AboutPage() {
  return (
    <div className="page-shell space-y-8 py-10">
      <PageHeader
        eyebrow="O projekcie"
        title="Co jest prawdziwe, co jest symulacją, a gdzie pomaga AI"
        lead={`${APP_NAME} to projekt hackathonowy. Budujemy go tak, aby jury i użytkownik mogli odróżnić regułę prawną od demonstracji i od odpowiedzi modelu językowego.`}
      />

      <div className="grid gap-4 md:grid-cols-2">
        <Alert variant="warning">
          <TriangleAlert aria-hidden="true" />
          <AlertTitle>Symulacja</AlertTitle>
          <AlertDescription>{SIMULATION_DISCLOSURE}</AlertDescription>
        </Alert>
        <Alert variant="info">
          <ShieldCheck aria-hidden="true" />
          <AlertTitle>Zastrzeżenie prawne</AlertTitle>
          <AlertDescription>{LEGAL_DISCLOSURE}</AlertDescription>
        </Alert>
        <Alert variant="default" className="md:col-span-2">
          <Bot aria-hidden="true" />
          <AlertTitle>Ujawnienie AI</AlertTitle>
          <AlertDescription>{AI_DISCLOSURE}</AlertDescription>
        </Alert>
      </div>

      <section className="grid gap-4 sm:grid-cols-2">
        {architecture.map((item) => (
          <Card key={item.title}>
            <CardHeader>
              <span className="mb-2 grid size-9 place-items-center rounded-lg bg-primary/10 text-primary">
                <item.icon aria-hidden="true" className="size-4" />
              </span>
              <CardTitle>{item.title}</CardTitle>
              <CardDescription className="text-pretty">
                {item.text}
              </CardDescription>
            </CardHeader>
          </Card>
        ))}
      </section>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen aria-hidden="true" className="size-4 text-primary" />
            Źródła i reguły
          </CardTitle>
          <CardDescription>
            Zakres źródeł użytych w scenariuszach i bazie wiedzy. Pełna
            traceability znajduje się w repozytorium w katalogu docs.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {sources.map(([name, reference, scope]) => (
            <div
              key={name}
              className="rounded-lg border border-border/70 p-3 text-sm"
            >
              <p className="font-medium">{name}</p>
              <p className="font-mono text-xs text-muted-foreground">
                {reference}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{scope}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Otwarte pytania, których nie ukrywamy</CardTitle>
          <CardDescription>
            Wynik „Wymaga danych” jest celowy. Lepiej pokazać brak niż wymyślić
            kwotę.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-pretty text-muted-foreground">
          <p>
            <strong className="text-foreground">Q-29:</strong> minimalna
            podstawa wymiaru i kwota świadczenia rodzicielskiego. Wpływa na
            dolny próg zasiłku i próg zadłużenia.
          </p>
          <p>
            <strong className="text-foreground">Q-15:</strong> polityka
            zaokrągleń kwot dziennych i miesięcznych względem przykładowych
            spraw ZUS.
          </p>
          <p>
            <strong className="text-foreground">Q-19:</strong> poufność
            przykładowych spraw ZUS. Wersja publiczna używa wyłącznie danych
            syntetycznych.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Zewnętrzne rozwiązania</CardTitle>
          <CardDescription>
            Wersje i licencje są w pliku lockfile oraz w dokumentacji projektu.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
          {[
            "Next.js 16 / React 19",
            "Tailwind CSS v4",
            "shadcn/ui + Radix",
            "Drizzle ORM",
            "PostgreSQL 17 + pgvector",
            "Zod 4",
            "Vitest + Playwright + axe",
          ].map((item) => (
            <div
              key={item}
              className="rounded-lg border border-border/70 px-3 py-2"
            >
              {item}
            </div>
          ))}
        </CardContent>
      </Card>

      <p className="text-sm text-muted-foreground">
        Wróć do{" "}
        <Link href="/panel" className="underline underline-offset-4">
          panelu sprawy
        </Link>{" "}
        albo{" "}
        <Link href="/start" className="underline underline-offset-4">
          utwórz nową sprawę
        </Link>
        .
      </p>
    </div>
  )
}
