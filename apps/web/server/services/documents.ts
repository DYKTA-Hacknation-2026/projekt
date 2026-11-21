import { uuidv7 } from "@zpr/db"

import { SAMPLE_DOCUMENTS } from "@/lib/sample-documents"

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

export { SAMPLE_DOCUMENTS }

const FORM_TITLES: Record<DocumentFormCode, string> = {
  ZAM: "ZAM — wniosek o zasiłek macierzyński",
  "Z-3": "Z-3 — zaświadczenie płatnika składek (pracownik)",
  "Z-3a": "Z-3a — zaświadczenie płatnika składek (zlecenie)",
  UNKNOWN: "Nierozpoznany formularz",
}

function sampleAnalysis(
  fileName: string,
  formCode: DocumentFormCode,
  fields: ExtractedField[],
  extraWarnings: string[] = []
): DocumentAnalysis {
  return {
    id: uuidv7(),
    fileName,
    formCode,
    formTitle: FORM_TITLES[formCode],
    extractionMode: "deterministic-demo",
    simulated: true,
    requiresConfirmation: true,
    fields,
    warnings: [
      "Dane w przykładzie są syntetyczne. Potwierdź każde pole przed użyciem w obliczeniach.",
      ...extraWarnings,
    ],
    detectedAt: new Date().toISOString(),
  }
}

export function buildSampleAnalysis(sampleId: string): DocumentAnalysis {
  if (sampleId === "anna-zam") {
    return sampleAnalysis(
      "ZAM_Anna_Kowalska_demo.pdf",
      "ZAM",
      [
        {
          key: "imie",
          label: "Imię",
          value: "Anna",
          confidence: 0.99,
          source: "przykład ZUS (syntetyczny)",
        },
        {
          key: "nazwisko",
          label: "Nazwisko",
          value: "Kowalska",
          confidence: 0.99,
          source: "przykład ZUS (syntetyczny)",
        },
        {
          key: "formularz",
          label: "Formularz",
          value: "ZAM",
          confidence: 0.98,
          source: "nagłówek dokumentu",
        },
        {
          key: "dataPorodu",
          label: "Przewidywany termin porodu",
          value: "2027-03-10",
          confidence: 0.96,
          source: "pole formularza",
        },
        {
          key: "podstawa",
          label: "Podstawa wymiaru (miesięczna)",
          value: "8000,00 zł",
          confidence: 0.94,
          source: "zaświadczenie płatnika",
        },
        {
          key: "wniosek815",
          label: "Wniosek o stawkę 81,5%",
          value: "Tak — złożony w terminie 21 dni",
          confidence: 0.9,
          source: "oświadczenie wnioskodawcy",
        },
      ],
      [
        "Wariant 81,5% wymaga pisemnego wniosku w ciągu 21 dni od porodu.",
        "Formularz ZAM zastępuje ZUR i ZAO od 24 października 2026 r.",
      ]
    )
  }

  if (sampleId === "tomasz-z3") {
    return sampleAnalysis(
      "Z-3_Tomasz_Kowalski_demo.pdf",
      "Z-3",
      [
        {
          key: "imie",
          label: "Imię",
          value: "Tomasz",
          confidence: 0.98,
          source: "przykład ZUS (syntetyczny)",
        },
        {
          key: "nazwisko",
          label: "Nazwisko",
          value: "Kowalski",
          confidence: 0.98,
          source: "przykład ZUS (syntetyczny)",
        },
        {
          key: "okresUbezpieczenia",
          label: "Okres ubezpieczenia",
          value: "od 2023-03-01, nadal trwa",
          confidence: 0.95,
          source: "część II formularza",
        },
        {
          key: "podstawa",
          label: "Podstawa wymiaru (miesięczna)",
          value: "6000,00 zł",
          confidence: 0.93,
          source: "część III formularza",
        },
      ],
      [
        "Pracodawca zgłasza więcej niż 20 ubezpieczonych? Sprawdź, czy zasiłek wypłaca płatnik, czy ZUS.",
      ]
    )
  }

  if (sampleId === "kasia-z3a") {
    return sampleAnalysis(
      "Z-3a_Kasia_Nowak_demo.pdf",
      "Z-3a",
      [
        {
          key: "imie",
          label: "Imię",
          value: "Kasia",
          confidence: 0.98,
          source: "przykład ZUS (syntetyczny)",
        },
        {
          key: "nazwisko",
          label: "Nazwisko",
          value: "Nowak",
          confidence: 0.98,
          source: "przykład ZUS (syntetyczny)",
        },
        {
          key: "tytul",
          label: "Tytuł ubezpieczenia",
          value: "Umowa zlecenia",
          confidence: 0.96,
          source: "część II formularza",
        },
        {
          key: "koniecUbezpieczenia",
          label: "Koniec okresu ubezpieczenia",
          value: "2026-10-15",
          confidence: 0.94,
          source: "część II formularza",
        },
        {
          key: "podstawa",
          label: "Podstawa wymiaru (miesięczna)",
          value: "4500,00 zł",
          confidence: 0.92,
          source: "część III formularza",
        },
      ],
      [
        "Ubezpieczenie zakończyło się 15 października 2026 r., a poród był 2 listopada 2026 r. — sprawdź prawo do zasiłku (LR-72).",
        "Okres dobrowolnego ubezpieczenia chorobowego był krótszy niż 90 dni.",
      ]
    )
  }

  throw new Error("Nieznany przykład dokumentu")
}

function normalizeFileName(fileName: string): string {
  return fileName.toUpperCase().replace(/[\s_.]/g, "-")
}

export function detectFormFromFilename(fileName: string): {
  formCode: DocumentFormCode
  legacy: boolean
} {
  const normalized = normalizeFileName(fileName)

  if (/\bZAM\b|ZAM/.test(normalized)) {
    return { formCode: "ZAM", legacy: false }
  }
  if (/Z-?3A/.test(normalized)) {
    return { formCode: "Z-3a", legacy: false }
  }
  if (/Z-?3B/.test(normalized)) {
    return { formCode: "Z-3", legacy: true }
  }
  if (/Z-?3/.test(normalized)) {
    return { formCode: "Z-3", legacy: false }
  }
  if (/ZUR|ZAO/.test(normalized)) {
    return { formCode: "ZAM", legacy: true }
  }

  return { formCode: "UNKNOWN", legacy: false }
}

export function analyzeUploadedFile(input: {
  fileName: string
  size: number
  signature: string
}): DocumentAnalysis {
  const detected = detectFormFromFilename(input.fileName)
  const warnings = [
    "Wersja demonstracyjna sprawdza sygnaturę PDF, rozmiar i nazwę pliku. Nie wykonuje OCR ani nie odczytuje treści formularza.",
    "Pola są puste celowo — uzupełnij je ręcznie i potwierdź przed obliczeniem.",
  ]

  if (detected.legacy) {
    warnings.push(
      "Rozpoznano formularz wycofany (ZUR/ZAO/Z-3b). Od 24 października 2026 r. obowiązuje ZAM; sprawdź, czy dokument jest aktualny."
    )
  }
  if (detected.formCode === "UNKNOWN") {
    warnings.push(
      "Nie rozpoznano kodu formularza z nazwy pliku. Wybierz formularz ręcznie."
    )
  }

  return {
    id: uuidv7(),
    fileName: input.fileName,
    formCode: detected.formCode,
    formTitle: FORM_TITLES[detected.formCode],
    extractionMode: "deterministic-demo",
    simulated: true,
    requiresConfirmation: true,
    fields: [
      {
        key: "formularz",
        label: "Rozpoznany formularz",
        value: detected.formCode,
        confidence: detected.formCode === "UNKNOWN" ? 0.15 : 0.8,
        source: "nazwa pliku",
      },
      {
        key: "plik",
        label: "Plik",
        value: `${input.fileName} (${Math.round(input.size / 1024)} kB)`,
        confidence: 1,
        source: "metadane pliku",
      },
      {
        key: "sygnatura",
        label: "Sygnatura PDF",
        value: input.signature,
        confidence: 1,
        source: "pierwsze bajty pliku",
      },
      {
        key: "podstawa",
        label: "Podstawa wymiaru",
        value: "Do uzupełnienia",
        confidence: 0,
        source: "brak ekstrakcji treści w wersji demo",
      },
    ],
    warnings,
    detectedAt: new Date().toISOString(),
  }
}
