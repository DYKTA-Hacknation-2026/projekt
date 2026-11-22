import type { Metadata } from "next"
import { BookOpen, Calculator, ShieldAlert, Workflow } from "lucide-react"

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { AssistantChat } from "@/components/assistant-chat"
import { PageHeader } from "@/components/page-header"
import { assistant } from "@/messages/pl"

export const metadata: Metadata = { title: "Asystent zasiłkowy" }

const pipeline = [
  {
    icon: Workflow,
    title: "1. Rozpoznanie pytania",
    text: "Klasyfikator intencji wybiera wymagane narzędzia. Model nie może pominąć wyszukiwania ani modułu reguł.",
  },
  {
    icon: BookOpen,
    title: "2. Źródła z bazy wiedzy",
    text: "Hybrydowe wyszukiwanie (pgvector + pełnotekstowe) z filtrem daty obowiązywania. Cytaty S1, S2… prowadzą do fragmentu.",
  },
  {
    icon: Calculator,
    title: "3. Deterministyczne usługi",
    text: "Uprawnienia, kwoty, dokumenty, terminy i oś czasu liczy kod z rejestru przepisów — nie model językowy.",
  },
  {
    icon: ShieldAlert,
    title: "4. Strażnicy odpowiedzi",
    text: "Sprawdzamy cytaty i liczby, usuwamy PESEL i dane kontaktowe, a treść źródeł traktujemy jako dane, nie polecenia.",
  },
]

export default function AssistantPage() {
  return (
    <div className="page-shell space-y-8 py-10">
      <PageHeader
        eyebrow="Asystent"
        title={assistant.title}
        lead={assistant.lead}
      />

      <AssistantChat />

      <section
        aria-label="Jak działa asystent"
        className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
      >
        {pipeline.map((step) => (
          <Card key={step.title}>
            <CardHeader>
              <span className="mb-2 grid size-9 place-items-center rounded-lg bg-primary/10 text-primary">
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
