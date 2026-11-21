import type { Metadata } from "next"
import { FileCheck2, FileSearch, ShieldCheck, TriangleAlert } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card"
import { DocumentAnalyzer } from "@/components/document-analyzer"
import { PageHeader } from "@/components/page-header"
import { documents } from "@/messages/pl"

export const metadata: Metadata = { title: "Analiza dokumentów" }

const rules = [
  {
    icon: FileSearch,
    title: "Deterministycznie najpierw",
    text: "Najpierw sygnatura i metadane, potem dopiero ewentualny OCR. Wersja demo nie udaje, że odczytała treść.",
  },
  {
    icon: FileCheck2,
    title: "Pola do potwierdzenia",
    text: "Każde pole ma źródło i pewność. Użytkownik może je poprawić przed obliczeniem.",
  },
  {
    icon: ShieldCheck,
    title: "Limit i typ pliku",
    text: "Maks. 10 MB, tylko PDF sprawdzany po magicznych bajtach. Plik nie jest wykonywany.",
  },
  {
    icon: TriangleAlert,
    title: "Formularze po zmianach",
    text: "ZAM zastępuje ZUR i ZAO. Z-3b jest zniesiony od 24 października 2026 r.",
  },
]

export default function DocumentsPage() {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-8 px-4 py-10 sm:px-6">
      <PageHeader
        eyebrow="Dokumenty"
        title={documents.title}
        lead={documents.lead}
      />

      <DocumentAnalyzer />

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {rules.map((rule) => (
          <Card key={rule.title}>
            <CardHeader>
              <span className="mb-2 grid size-8 place-items-center rounded-lg bg-primary/10 text-primary">
                <rule.icon aria-hidden="true" className="size-4" />
              </span>
              <CardTitle className="text-sm">{rule.title}</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-pretty text-muted-foreground">
              {rule.text}
            </CardContent>
          </Card>
        ))}
      </section>
    </div>
  )
}
