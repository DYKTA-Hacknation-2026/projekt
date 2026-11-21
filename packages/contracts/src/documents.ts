export type DocumentFormCode = "ZAM" | "Z-3" | "Z-3a" | "UNKNOWN"

export interface ExtractedField {
  key: string
  label: string
  value: string
  confidence: number
  source: string
}

export interface DocumentAnalysis {
  id: string
  fileName: string
  formCode: DocumentFormCode
  formTitle: string
  extractionMode: "deterministic-demo"
  simulated: true
  requiresConfirmation: true
  fields: ExtractedField[]
  warnings: string[]
  detectedAt: string
}

export const SAMPLE_DOCUMENTS = [
  {
    id: "anna-zam",
    label: "ZAM — Anna Kowalska",
    description: "Wniosek o zasiłek macierzyński. Formularz połączony ZUR/ZAO.",
    formCode: "ZAM",
  },
  {
    id: "tomasz-z3",
    label: "Z-3 — Tomasz Kowalski",
    description:
      "Zaświadczenie płatnika składek dla pracownika, podstawa wymiaru.",
    formCode: "Z-3",
  },
  {
    id: "kasia-z3a",
    label: "Z-3a — Kasia Nowak",
    description:
      "Zaświadczenie dla zlecenia; koniec ubezpieczenia przed porodem.",
    formCode: "Z-3a",
  },
] as const

export type SampleDocumentId = (typeof SAMPLE_DOCUMENTS)[number]["id"]
