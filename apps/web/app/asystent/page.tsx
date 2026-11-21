import type { Metadata } from "next"
import { BookOpen, Database, Search, ShieldAlert } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card"
import { AssistantChat } from "@/components/assistant-chat"
import { PageHeader } from "@/components/page-header"
import { assistant } from "@/messages/pl"

export const metadata: Metadata = { title: "Asystent wiedzy" }

const pipeline = [
  {
    icon: Search,
    title: "1. Zapytanie",
    text: "Pytanie jest zamieniane na wektor deterministycznym modelem demo (1024 wymiary).",
  },
  {
    icon: Database,
    title: "2. Hybrydowy retrieval",
    text: "pgvector HNSW i pełnotekstowe wyszukiwanie w PostgreSQL, łączone metodą RRF.",
  },
  {
    icon: BookOpen,
    title: "3. Cytaty",
    text: "Odpowiedź składa się wyłącznie z wybranych fragmentów. Każdy ma tytuł, stronę i podstawę prawną.",
  },
  {
    icon: ShieldAlert,
    title: "4. Strażnik kwot",
    text: "Asystent nie generuje kwot ani decyzji. Odsyła do deterministycznego kalkulatora.",
  },
]

export default function AssistantPage() {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-8 px-4 py-10 sm:px-6">
      <PageHeader
        eyebrow="Asystent"
        title={assistant.title}
        lead={assistant.lead}
      />

      <AssistantChat />

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {pipeline.map((step) => (
          <Card key={step.title}>
            <CardHeader>
              <span className="mb-2 grid size-8 place-items-center rounded-lg bg-primary/10 text-primary">
                <step.icon aria-hidden="true" className="size-4" />
              </span>
              <CardTitle className="text-sm">{step.title}</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-pretty text-muted-foreground">
              {step.text}
            </CardContent>
          </Card>
        ))}
      </section>
    </div>
  )
}
