import type { Metadata } from "next"
import Link from "next/link"
import {
  ArrowRight,
  BookOpen,
  Calculator,
  CircleHelp,
  FileText,
  Info,
  MessagesSquare,
  ShieldCheck,
  Sparkles,
} from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@workspace/ui/components/alert"
import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { KnowledgeArticleCard } from "@/components/knowledge/knowledge-article-card"
import { KnowledgeCategoryGrid } from "@/components/knowledge/knowledge-category-grid"
import { KnowledgeFaqList } from "@/components/knowledge/knowledge-faq-list"
import { KnowledgeGuideCard } from "@/components/knowledge/knowledge-guide-card"
import { KnowledgeRecentList } from "@/components/knowledge/knowledge-recent-list"
import { KnowledgeSearchForm } from "@/components/knowledge/knowledge-search-form"
import { DbOffline } from "@/components/db-offline"
import { PageHeader } from "@/components/page-header"
import { LEGAL_DISCLOSURE, SIMULATION_DISCLOSURE } from "@/messages/pl"
import { getKnowledgeHome } from "@/server/services/knowledge-center"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Centrum wiedzy",
  description:
    "Zasiłki, urlopy, ubezpieczenia i dokumenty wyjaśnione prostym językiem. Sprawdzone źródła i data weryfikacji przy każdym materiale.",
}

const quickLinks = [
  {
    href: "/wiedza/faq",
    label: "Najczęstsze pytania",
    icon: CircleHelp,
  },
  {
    href: "/wiedza/dokumenty",
    label: "Dokumenty i formularze",
    icon: FileText,
  },
  {
    href: "/wiedza/przewodniki",
    label: "Przewodniki krok po kroku",
    icon: BookOpen,
  },
] as const

export default async function KnowledgeHomePage() {
  let data

  try {
    data = await getKnowledgeHome()
  } catch (error) {
    return (
      <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-10 sm:px-6">
        <PageHeader
          eyebrow="Centrum wiedzy"
          title="Centrum wiedzy"
          lead="Materiały są chwilowo niedostępne."
        />
        <DbOffline error={error} />
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-10 px-4 py-10 sm:px-6">
      <PageHeader
        eyebrow="Centrum wiedzy"
        title="Centrum wiedzy"
        lead="Świadczenia, prawa rodziców, ubezpieczenia i formalności — po ludzku, z datą weryfikacji i odnośnikiem do oficjalnego źródła."
        actions={
          <Button asChild variant="outline">
            <Link href="/asystent">
              <MessagesSquare data-icon="inline-start" aria-hidden="true" />
              Zapytaj asystenta
            </Link>
          </Button>
        }
      />

      <section aria-labelledby="knowledge-search-heading" className="space-y-4">
        <div className="max-w-3xl space-y-2">
          <h2
            id="knowledge-search-heading"
            className="text-lg font-semibold tracking-tight"
          >
            Od czego zaczynasz?
          </h2>
          <p className="text-sm text-pretty text-muted-foreground">
            Wpisz pytanie tak, jak powiedziałbyś je bliskiej osobie. Wyszukiwarka
            przeszuka artykuły, FAQ, dokumenty, przewodniki i słownik.
          </p>
        </div>
        <KnowledgeSearchForm size="large" />
      </section>

      <Alert variant="info">
        <Info aria-hidden="true" />
        <AlertTitle>Informacja, nie decyzja</AlertTitle>
        <AlertDescription className="space-y-1">
          <p>{LEGAL_DISCLOSURE}</p>
          <p className="text-xs">{SIMULATION_DISCLOSURE}</p>
        </AlertDescription>
      </Alert>

      <section aria-labelledby="categories-heading" className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2
              id="categories-heading"
              className="text-2xl font-semibold tracking-tight"
            >
              Kategorie tematyczne
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Dziewięć działów. Każdy prowadzi do artykułów, pytań i dokumentów.
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {quickLinks.map((link) => (
              <Button asChild key={link.href} size="sm" variant="outline">
                <Link href={link.href}>
                  <link.icon data-icon="inline-start" aria-hidden="true" />
                  {link.label}
                </Link>
              </Button>
            ))}
          </div>
        </div>
        <KnowledgeCategoryGrid categories={data.categories} />
      </section>

      <div className="grid gap-6 lg:grid-cols-[1.35fr_1fr] lg:items-start">
        <section aria-labelledby="featured-heading" className="space-y-4">
          <div className="flex items-end justify-between gap-3">
            <div>
              <h2
                id="featured-heading"
                className="text-2xl font-semibold tracking-tight"
              >
                Polecane artykuły
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Materiały, od których warto zacząć.
              </p>
            </div>
            <Link
              href="/wiedza/artykuly"
              className="inline-flex items-center gap-1 rounded-md text-sm font-medium text-primary hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              Wszystkie
              <ArrowRight aria-hidden="true" className="size-3.5" />
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {data.featured.map((article) => (
              <KnowledgeArticleCard key={article.id} article={article} />
            ))}
          </div>
        </section>

        <section aria-labelledby="popular-heading" className="space-y-4">
          <div>
            <h2
              id="popular-heading"
              className="text-2xl font-semibold tracking-tight"
            >
              Popularne pytania
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Krótka odpowiedź, a pod spodem szczegóły i wyjątki.
            </p>
          </div>
          <KnowledgeFaqList items={data.popular} compact />
          <Button asChild variant="outline" className="w-full">
            <Link href="/wiedza/faq">
              Zobacz wszystkie pytania
              <ArrowRight data-icon="inline-end" aria-hidden="true" />
            </Link>
          </Button>
        </section>
      </div>

      <section aria-labelledby="guides-heading" className="space-y-4">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2
              id="guides-heading"
              className="text-2xl font-semibold tracking-tight"
            >
              Przewodniki krok po kroku
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Konkretny cel, lista dokumentów i kolejne kroki — bez zgadywania.
            </p>
          </div>
          <Link
            href="/wiedza/przewodniki"
            className="inline-flex items-center gap-1 rounded-md text-sm font-medium text-primary hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
          >
            Wszystkie
            <ArrowRight aria-hidden="true" className="size-3.5" />
          </Link>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {data.guides.map((guide) => (
            <KnowledgeGuideCard key={guide.id} guide={guide} />
          ))}
        </div>
      </section>

      <section aria-labelledby="recent-heading" className="space-y-4">
        <div>
          <h2
            id="recent-heading"
            className="text-2xl font-semibold tracking-tight"
          >
            Ostatnio dodane i zaktualizowane
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Zmiany w treściach i nowe materiały. Data oznacza ostatnią
            aktualizację, nie datę publikacji.
          </p>
        </div>
        <KnowledgeRecentList items={data.recent} />
      </section>

      <div className="grid gap-3 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldCheck aria-hidden="true" className="size-4 text-primary" />
              Źródła i data weryfikacji
            </CardTitle>
            <CardDescription>
              Każdy artykuł ma oficjalne źródła i podstawę prawną. Nie
              przedstawiamy niezweryfikowanych informacji jako przepisów.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              href="/wiedza/zrodla"
              className="text-sm font-medium text-primary hover:underline"
            >
              Zobacz rejestr źródeł
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Calculator aria-hidden="true" className="size-4 text-primary" />
              Policz, nie zgaduj
            </CardTitle>
            <CardDescription>
              Kalkulator pokazuje założenia, braki danych i ślad reguł. Wynik nie
              zastępuje decyzji ZUS.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              href="/kalkulator"
              className="text-sm font-medium text-primary hover:underline"
            >
              Otwórz kalkulator
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles aria-hidden="true" className="size-4 text-primary" />
              Nie znalazłeś odpowiedzi?
            </CardTitle>
            <CardDescription>
              Asystent odpowiada na podstawie bazy wiedzy, a każdą informację
              prawną opatruje źródłem.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              href="/asystent"
              className="text-sm font-medium text-primary hover:underline"
            >
              Zapytaj asystenta
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
