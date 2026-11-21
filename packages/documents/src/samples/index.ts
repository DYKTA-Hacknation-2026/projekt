import type { SampleCaseExpected, SampleCaseSummary } from "@zpr/contracts/documents"

import { formPage, writePdf, type PdfDocumentSpec, type PdfPageSpec } from "../pdf/writer"

/**
 * SYNTHETIC sample cases. Every person, payer and amount here is invented;
 * the layout only mimics the data scope of R1316 annexes 2, 3 and 6. The
 * PDFs are generated on demand — no ZUS document is stored in the repository
 * (legal-assumptions Q-19). Real ZUS sample cases are loaded from the
 * git-ignored `fixtures/private/sample-cases/manifest.json` instead.
 *
 * Expected outcomes come from the rules (demo-scenarios.md S-01, S-18 and
 * U art. 29, 31, 36), not from the UI.
 */

export const SYNTHETIC_WATERMARK = "DOKUMENT SYNTETYCZNY — wyłącznie do testów, nie jest dokumentem ZUS"

export interface SyntheticSampleCase extends SampleCaseSummary {
  origin: "SYNTHETIC"
  fileName: string
  /** Codes of findings the extraction must report. */
  expectedFindings: string[]
  build: () => PdfDocumentSpec
}

const footer = [SYNTHETIC_WATERMARK, "Przyklad ZUS - wylacznie do celow HackNation (dane fikcyjne)."]

function annaZam(): PdfDocumentSpec {
  const zam = formPage(
    ["ZAM", "WNIOSEK O ZASIŁEK MACIERZYŃSKI", "Załącznik nr 6 do rozporządzenia (układ syntetyczny)"],
    [
      ["1. Imię", "Anna"],
      ["2. Nazwisko", "Kowalska"],
      ["3. PESEL", "90010112345"],
      ["4. Wnioskodawca", "matka dziecka"],
      ["5. Rodzaj zasiłku", "zasiłek macierzyński"],
      ["6. Data porodu", "10.11.2026"],
      ["7. Liczba dzieci urodzonych przy jednym porodzie", "1"],
      ["8. Tytuł ubezpieczenia", "umowa o pracę"],
      ["9. Wniosek o zasiłek w wysokości 81,5%", "NIE"],
      ["10. Data złożenia wniosku", "12.11.2026"],
    ],
    footer
  )
  const z3 = formPage(
    ["Z-3", "ZAŚWIADCZENIE PŁATNIKA SKŁADEK", "Załącznik do wniosku ZAM (układ syntetyczny)"],
    [
      ["1. Imię", "Anna"],
      ["2. Nazwisko", "Kowalska"],
      ["3. Tytuł ubezpieczenia", "umowa o pracę"],
      ["4. Początek ubezpieczenia chorobowego", "01.09.2024"],
      ["5. Liczba osób zgłoszonych do ubezpieczenia chorobowego (30.11)", "8"],
      ["6. Wynagrodzenie brutto (miesięczne, stałe w okresie 12 m-cy)", "8 000,00 zł"],
      ["7. Data wystawienia", "12.11.2026"],
    ],
    footer
  )
  return { title: "ZAM — Anna Kowalska (syntetyczny)", pages: [zam, z3] }
}

function tomaszZ3(): PdfDocumentSpec {
  // AcroForm: values live only in form fields, not in the page text.
  const page: PdfPageSpec = formPage(
    ["ZAŚWIADCZENIE PŁATNIKA SKŁADEK", "dla celów zasiłku (formularz wypełnialny, układ syntetyczny)"],
    [
      ["Imię", ""],
      ["Nazwisko", ""],
      ["Okres ubezpieczenia", ""],
      ["Podstawa wymiaru zasiłku", ""],
    ],
    footer
  )
  const field = (name: string, value: string, y: number) => ({ name, value, rect: [300, y, 520, y + 14] as [number, number, number, number] })
  page.fields = [
    field("kod_formularza", "Z-3", 760),
    field("imie", "Tomasz", 740),
    field("nazwisko", "Kowalski", 720),
    field("pesel", "88020254321", 700),
    field("wnioskodawca", "ojciec dziecka", 680),
    field("rodzaj_zasilku", "zasiłek za urlop ojcowski", 660),
    field("data_porodu", "2026-11-10", 640),
    field("poczatek_ubezpieczenia", "2023-03-01", 620),
    field("liczba_ubezpieczonych", "12", 600),
    field("podstawa_wymiaru_zasilku", "6000,00", 580),
    field("data_wystawienia", "2026-11-15", 560),
  ]
  return { title: "Z-3 — Tomasz Kowalski (syntetyczny)", pages: [page] }
}

function kasiaZ3a(): PdfDocumentSpec {
  return {
    title: "Z-3a — Kasia Nowak (syntetyczny)",
    pages: [
      formPage(
        ["Z-3a", "ZAŚWIADCZENIE PŁATNIKA SKŁADEK", "Załącznik nr 3 do rozporządzenia (układ syntetyczny)"],
        [
          ["1. Imię", "Kasia"],
          ["2. Nazwisko", "Nowak"],
          ["3. Tytuł ubezpieczenia", "umowa zlecenia"],
          ["4. Ubezpieczenie chorobowe", "dobrowolne"],
          ["5. Początek ubezpieczenia chorobowego", "01.08.2026"],
          ["6. Koniec ubezpieczenia chorobowego", "15.10.2026"],
          ["7. Data porodu", "02.11.2026"],
          ["8. Podstawa wymiaru zasiłku", "4 500,00 zł"],
          ["9. Data wystawienia", "05.11.2026"],
        ],
        footer
      ),
    ],
  }
}

function ewaZur(): PdfDocumentSpec {
  return {
    title: "ZUR — Ewa Wiśniewska (syntetyczny, formularz wycofany)",
    pages: [
      formPage(
        ["ZUR", "WNIOSEK O ZASIŁEK (DRUK SPRZED 24.10.2026)", "układ syntetyczny"],
        [
          ["1. Imię", "Ewa"],
          ["2. Nazwisko", "Wiśniewska"],
          ["3. Wnioskodawca", "matka dziecka"],
          ["4. Rodzaj zasiłku", "zasiłek macierzyński"],
          ["5. Data porodu", "08.11.2026"],
          ["6. Tytuł ubezpieczenia", "działalność gospodarcza"],
          ["7. Data złożenia wniosku", "12.11.2026"],
        ],
        footer
      ),
    ],
  }
}

const expected = (value: SampleCaseExpected) => value

export const SYNTHETIC_SAMPLE_CASES: readonly SyntheticSampleCase[] = [
  {
    id: "anna-zam",
    code: "SC-SYN-01",
    label: "ZAM + Z-3 — Anna Kowalska",
    description: "Wniosek ZAM z dołączonym Z-3: pracownica, płatnik do 20 osób (wypłaca ZUS), wynagrodzenie brutto 8000 zł.",
    formCode: "ZAM",
    origin: "SYNTHETIC",
    fileName: "ZAM_Anna_Kowalska_syntetyczny.pdf",
    watermark: SYNTHETIC_WATERMARK,
    // S-01: basis = 8 000 × (1 − 13,71%) = 6 903,20 zł; maternity 20 weeks × 100%.
    expected: expected({
      benefit: "MATERNITY",
      parent: "MOTHER",
      status: "ELIGIBLE",
      monthlyBasisGrosze: 690_320,
      // 140 days × 6 903,20 / 30 = 32 214,93 zł (U art. 31 ust. 1, art. 18 ust. 2 — 1/30 basis per day).
      amountGrosze: 3_221_493,
      notes: "S-01/S-02: zasiłek macierzyński 100% przez 20 tygodni; wypłaca ZUS (płatnik ≤ 20 osób).",
    }),
    expectedFindings: [],
    build: annaZam,
  },
  {
    id: "tomasz-z3",
    code: "SC-SYN-02",
    label: "Z-3 (formularz wypełnialny) — Tomasz Kowalski",
    description: "Zaświadczenie płatnika z polami AcroForm: podstawa wymiaru 6000 zł, zasiłek za urlop ojcowski.",
    formCode: "Z-3",
    origin: "SYNTHETIC",
    fileName: "dokument_platnika.pdf",
    watermark: SYNTHETIC_WATERMARK,
    // Basis from the payer is used as-is; paternity 14 days × 100% × 6000/30.
    expected: expected({
      benefit: "PATERNITY",
      parent: "FATHER",
      status: "ELIGIBLE",
      monthlyBasisGrosze: 600_000,
      amountGrosze: 280_000,
      notes: "Podstawa z Z-3 bez ponownego odliczania składek; 14 dni × 200 zł.",
    }),
    expectedFindings: ["PAYER_CERTIFICATE_ONLY"],
    build: tomaszZ3,
  },
  {
    id: "kasia-z3a",
    code: "SC-SYN-03",
    label: "Z-3a — Kasia Nowak",
    description: "Umowa zlecenia z dobrowolnym ubezpieczeniem chorobowym; ubezpieczenie ustało przed porodem.",
    formCode: "Z-3a",
    origin: "SYNTHETIC",
    fileName: "Z-3a_Kasia_Nowak_syntetyczny.pdf",
    watermark: SYNTHETIC_WATERMARK,
    // S-18: not insured on the birth date and no U art. 29/30 exception → no maternity benefit.
    expected: expected({
      benefit: "MATERNITY",
      parent: "MOTHER",
      status: "NOT_ELIGIBLE",
      // No right → the engine does not compute a basis or an amount.
      amountGrosze: null,
      notes: "S-18: brak ubezpieczenia w dniu porodu (U art. 29 ust. 1).",
    }),
    expectedFindings: ["INSURANCE_ENDED_BEFORE_EVENT"],
    build: kasiaZ3a,
  },
  {
    id: "ewa-zur",
    code: "SC-SYN-04",
    label: "ZUR (formularz wycofany) — Ewa Wiśniewska",
    description: "Wniosek na druku ZUR złożony po 24.10.2026 r. — pokazuje ostrzeżenie o formularzu wycofanym (LR-05).",
    formCode: "ZUR",
    origin: "SYNTHETIC",
    fileName: "wniosek_ewa.pdf",
    watermark: SYNTHETIC_WATERMARK,
    expectedFindings: ["FORM_WITHDRAWN"],
    build: ewaZur,
  },
]

export function findSyntheticSample(id: string): SyntheticSampleCase | null {
  return SYNTHETIC_SAMPLE_CASES.find((sample) => sample.id === id) ?? null
}

export function buildSyntheticSamplePdf(id: string): Uint8Array | null {
  const sample = findSyntheticSample(id)
  return sample ? writePdf({ ...sample.build(), producer: `ZPR — ${SYNTHETIC_WATERMARK}` }) : null
}

export function sampleSummary(sample: SampleCaseSummary): SampleCaseSummary {
  const { id, code, label, description, formCode, origin, expected: outcome, watermark } = sample
  return { id, code, label, description, formCode, origin, expected: outcome, watermark }
}
