"use client"

import Link from "next/link"
import { useRef, useState, type ChangeEvent, type FormEvent } from "react"
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  FileText,
  Loader2,
  ScanLine,
  Upload,
} from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@workspace/ui/components/alert"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { Progress } from "@workspace/ui/components/progress"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"
import { SAMPLE_DOCUMENTS } from "@/lib/sample-documents"
import type { DocumentAnalysis } from "@/server/services/documents"
import { cn } from "@workspace/ui/lib/utils"

const MAX_FILE_BYTES = 10 * 1024 * 1024

export function DocumentAnalyzer() {
  const [analysis, setAnalysis] = useState<DocumentAnalysis | null>(null)
  const [selectedSample, setSelectedSample] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmed, setConfirmed] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  async function analyze(formData: FormData, sampleId: string | null) {
    setPending(true)
    setError(null)
    setConfirmed(false)
    setSelectedSample(sampleId)

    try {
      const response = await fetch("/api/v1/documents/analyze", {
        method: "POST",
        body: formData,
      })
      const data = (await response.json()) as DocumentAnalysis & {
        detail?: string
      }

      if (!response.ok) {
        throw new Error(data.detail ?? "Nie udało się przeanalizować dokumentu.")
      }

      setAnalysis(data)
    } catch (analyzeError) {
      setError(
        analyzeError instanceof Error
          ? analyzeError.message
          : "Wystąpił nieoczekiwany błąd."
      )
    } finally {
      setPending(false)
    }
  }

  function onSample(sampleId: string) {
    const formData = new FormData()
    formData.set("sampleCase", sampleId)
    void analyze(formData, sampleId)
  }

  function onFileSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const file = inputRef.current?.files?.[0]

    if (!file) {
      setError("Wybierz plik PDF.")
      return
    }
    if (file.size > MAX_FILE_BYTES) {
      setError("Maksymalny rozmiar pliku to 10 MB.")
      return
    }
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setError("Obsługiwane są wyłącznie pliki PDF.")
      return
    }

    setFileName(file.name)
    const formData = new FormData()
    formData.set("file", file)
    void analyze(formData, null)
  }

  function updateField(key: string, value: string) {
    setAnalysis((current) =>
      current
        ? {
            ...current,
            fields: current.fields.map((field) =>
              field.key === key ? { ...field, value, confidence: 1 } : field
            ),
          }
        : current
    )
  }

  function applyToCalculator() {
    if (!analysis) return
    const income = analysis.fields.find((field) => field.key === "podstawa")
    const value = income?.value.replace(/[^\d,.]/g, "").replace(",", ".")
    const amount = Number(value)
    if (Number.isFinite(amount) && amount > 0) {
      window.sessionStorage.setItem(
        "zpr:document-prefill",
        JSON.stringify({ income: String(amount) })
      )
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ScanLine aria-hidden="true" className="size-4 text-primary" />
              Przykłady ZUS
            </CardTitle>
            <CardDescription>
              Syntetyczne dokumenty odwzorowujące układ formularzy. Nie zawierają
              danych prawdziwych osób.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {SAMPLE_DOCUMENTS.map((sample) => (
              <button
                key={sample.id}
                type="button"
                onClick={() => onSample(sample.id)}
                disabled={pending}
                className={cn(
                  "w-full rounded-lg border p-3 text-left transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none disabled:opacity-50",
                  selectedSample === sample.id
                    ? "border-primary bg-primary/5"
                    : "border-border/70"
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium">{sample.label}</span>
                  <Badge variant="outline" className="font-mono text-[10px]">
                    {sample.formCode}
                  </Badge>
                </div>
                <p className="mt-1 text-xs text-pretty text-muted-foreground">
                  {sample.description}
                </p>
              </button>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload aria-hidden="true" className="size-4 text-primary" />
              Wgraj własny PDF
            </CardTitle>
            <CardDescription>
              Maks. 10 MB. Sprawdzamy sygnaturę PDF i nazwę pliku. Wersja demo nie
              wykonuje OCR.
            </CardDescription>
          </CardHeader>
          <form onSubmit={onFileSubmit}>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="document-file">Plik PDF</Label>
                <Input
                  ref={inputRef}
                  id="document-file"
                  type="file"
                  accept="application/pdf,.pdf"
                  onChange={(event: ChangeEvent<HTMLInputElement>) =>
                    setFileName(event.target.files?.[0]?.name ?? null)
                  }
                />
                {fileName && (
                  <p className="text-xs text-muted-foreground">
                    Wybrano: {fileName}
                  </p>
                )}
              </div>
              <Button type="submit" disabled={pending} className="w-full">
                {pending ? (
                  <Loader2 aria-hidden="true" className="animate-spin" />
                ) : (
                  <FileText aria-hidden="true" />
                )}
                {pending ? "Analizuję…" : "Analizuj dokument"}
              </Button>
            </CardContent>
          </form>
        </Card>

        <div aria-live="polite">
          {error && (
            <Alert variant="destructive">
              <AlertTriangle aria-hidden="true" />
              <AlertTitle>Nie udało się przeanalizować</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>
      </div>

      <div aria-live="polite">
        {!analysis ? (
          <Card className="border-dashed">
            <CardHeader>
              <CardTitle>Wynik analizy pojawi się tutaj</CardTitle>
              <CardDescription>
                Wybierz przykład albo wgraj PDF. Zobaczysz rozpoznany formularz,
                pola z pewnością odczytu i ostrzeżenia.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>
                Każde pole wymaga potwierdzenia. Formularz ZAM zastąpił ZUR i ZAO
                od 24 października 2026 r., a Z-3b został zniesiony.
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader className="border-b border-border/70">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <CardTitle>{analysis.formTitle}</CardTitle>
                  <CardDescription>{analysis.fileName}</CardDescription>
                </div>
                <Badge variant="warning">Wymaga potwierdzenia</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                <Badge variant="outline" className="font-mono">
                  {analysis.formCode}
                </Badge>
                <span className="self-center">
                  Tryb: {analysis.extractionMode}
                </span>
                <span className="self-center">Symulacja: tak</span>
              </div>

              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Pole</TableHead>
                      <TableHead>Wartość (edytowalna)</TableHead>
                      <TableHead>Pewność</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {analysis.fields.map((field) => (
                      <TableRow key={field.key}>
                        <TableCell className="whitespace-normal">
                          <Label
                            htmlFor={`field-${field.key}`}
                            className="font-normal"
                          >
                            {field.label}
                          </Label>
                          <p className="text-[11px] text-muted-foreground">
                            {field.source}
                          </p>
                        </TableCell>
                        <TableCell className="min-w-48 whitespace-normal">
                          <Input
                            id={`field-${field.key}`}
                            value={field.value}
                            onChange={(event) =>
                              updateField(field.key, event.target.value)
                            }
                            className="h-8"
                          />
                        </TableCell>
                        <TableCell className="w-24">
                          <Progress
                            value={field.confidence * 100}
                            label={`Pewność pola ${field.label}: ${Math.round(
                              field.confidence * 100
                            )}%`}
                          />
                          <span className="mt-1 block text-[11px] text-muted-foreground tabular-nums">
                            {Math.round(field.confidence * 100)}%
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {analysis.warnings.length > 0 && (
                <Alert variant="warning">
                  <AlertTriangle aria-hidden="true" />
                  <AlertTitle>Sprawdź przed użyciem</AlertTitle>
                  <AlertDescription>
                    <ul className="list-disc space-y-1 pl-4">
                      {analysis.warnings.map((warning) => (
                        <li key={warning} className="text-pretty">
                          {warning}
                        </li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              <label className="flex items-start gap-3 rounded-lg border border-border/70 p-3 text-sm">
                <input
                  type="checkbox"
                  className="mt-0.5 size-4 accent-[var(--primary)]"
                  checked={confirmed}
                  onChange={(event) => setConfirmed(event.target.checked)}
                />
                <span>
                  <span className="font-medium">
                    Potwierdzam poprawność pól
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    Dopiero po potwierdzeniu możesz przenieść podstawę do
                    kalkulatora.
                  </span>
                </span>
              </label>

              <div className="flex flex-wrap gap-2">
                <Button asChild={confirmed} disabled={!confirmed} onClick={applyToCalculator}>
                  {confirmed ? (
                    <Link href="/kalkulator">
                      Zastosuj w kalkulatorze
                      <ArrowRight data-icon="inline-end" aria-hidden="true" />
                    </Link>
                  ) : (
                    <span>Zastosuj w kalkulatorze</span>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setAnalysis(null)
                    setSelectedSample(null)
                    setFileName(null)
                    setConfirmed(false)
                  }}
                >
                  Wyczyść
                </Button>
              </div>

              <p className="flex items-start gap-2 text-xs text-muted-foreground">
                <CheckCircle2
                  aria-hidden="true"
                  className="mt-0.5 size-3.5 shrink-0 text-success"
                />
                Analiza jest deterministyczna i wykonywana lokalnie. Plik nie jest
                wysyłany do zewnętrznego dostawcy AI.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
