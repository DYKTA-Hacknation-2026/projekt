import { describe, expect, it } from "vitest"

import { htmlToText, splitTextPages } from "./extract"
import { normalizeDocument, parseAmendment } from "./normalize"
import type { ExtractedDocument } from "./types"

function pdf(pages: string[]): ExtractedDocument {
  return {
    format: "pdf",
    rawHash: "x",
    metadata: {},
    pages: pages.map((text, index) => ({ pageNumber: index + 1, text })),
  }
}

describe("page boundaries", () => {
  it("splits curated text on page markers and form feeds", () => {
    expect(
      splitTextPages("<!-- page: 5 -->\nA\n<!-- page: 7 -->\nB").map(
        (p) => p.pageNumber
      )
    ).toEqual([5, 7])
    expect(splitTextPages("A\fB\fC")).toHaveLength(3)
    expect(splitTextPages("no markers")).toEqual([
      { pageNumber: 1, text: "no markers\n" },
    ])
  })

  it("keeps the page of every line", () => {
    const normalized = normalizeDocument(pdf(["Art. 1\n1. Tekst", "2. Dalej"]))
    expect(normalized.lines.map((line) => line.page)).toEqual([1, 1, 2])
  })
})

describe("normalisation", () => {
  it("joins words hyphenated across lines, also across pages", () => {
    const normalized = normalizeDocument(
      pdf([
        "osobom objętym ubezpiecze-\nniem społecznym",
        "x",
        "działal-",
        "ność",
      ])
    )
    const text = normalized.lines.map((line) => line.text).join(" ")
    expect(text).toContain("ubezpieczeniem społecznym")
    expect(text).toContain("działalność")
    expect(normalized.stats.joinedHyphenations).toBe(2)
  })

  it("does not join a dash between words or before a capital", () => {
    const normalized = normalizeDocument(
      pdf(["pracownik -\nojciec", "e-\nZLA"])
    )
    expect(normalized.lines.map((line) => line.text)).toEqual([
      "pracownik -",
      "ojciec",
      "e-",
      "ZLA",
    ])
  })

  it("removes running headers and folios repeated across pages", () => {
    const pages = Array.from(
      { length: 5 },
      (_, index) => `Legalis\nTreść strony ${index + 1}.\n${index + 1}`
    )
    const normalized = normalizeDocument(pdf(pages))
    expect(normalized.lines.map((line) => line.text)).toEqual(
      Array.from({ length: 5 }, (_, index) => `Treść strony ${index + 1}.`)
    )
  })

  it("repairs glued negations and bullets", () => {
    const normalized = normalizeDocument(
      pdf(["niedłużej niż 270 dni, niewięcej niż 6 tygodni\n▪ pierwszy punkt"])
    )
    expect(normalized.lines.map((line) => line.text)).toEqual([
      "nie dłużej niż 270 dni, nie więcej niż 6 tygodni",
      "- pierwszy punkt",
    ])
  })

  it("captures the table of contents instead of indexing it", () => {
    const normalized = normalizeDocument(
      pdf(["Spis treści\nZasiłek macierzyński . . . . . . . 29\nTreść"])
    )
    expect(normalized.toc).toEqual([
      { title: "Zasiłek macierzyński", page: 29 },
    ])
    expect(normalized.lines.map((line) => line.text)).toEqual(["Treść"])
  })

  it("separates Legalis footnotes and parses amendment dates", () => {
    const normalized = normalizeDocument(
      pdf([
        "Art. 9\n4.3 Niezależnie od liczby tytułów ustala się jeden okres zasiłkowy.\n3 Art. 9 ust. 4 dodany ustawą z dnia 18.12.2025 r. (Dz.U. z 2026 r. poz. 26), która wchodzi w życie 1.01.2027 r.",
      ]),
      { footnotes: true }
    )
    expect(normalized.lines.map((line) => line.text)).toHaveLength(2)
    expect(normalized.footnotes.get(3)).toMatchObject({
      kind: "ADDED",
      effectiveFrom: "2027-01-01",
    })
  })

  it("classifies amendment notes", () => {
    expect(
      parseAmendment(
        1,
        "Art. 61b ust. 1 w brzmieniu ustawy z dnia 13.02.2026 r., która wchodzi w życie 1.07.2026 r."
      )
    ).toMatchObject({ kind: "AMENDED", effectiveFrom: "2026-07-01" })
    expect(
      parseAmendment(2, "Treść odnośnika publikujemy na końcu ustawy.")
    ).toMatchObject({ kind: "OTHER", effectiveFrom: null })
  })

  it("converts HTML to text with headings and list items", () => {
    const text = htmlToText(
      "<h2>Za życiem</h2><p>Akapit&nbsp;1</p><ul><li>pierwszy</li></ul><script>x()</script>"
    )
    expect(text).toContain("## Za życiem")
    expect(text).toContain("Akapit 1")
    expect(text).toContain("- pierwszy")
    expect(text).not.toContain("x()")
  })
})
