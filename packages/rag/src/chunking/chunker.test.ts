import { describe, expect, it } from "vitest"

import { normalizeDocument } from "../extract/normalize"
import { splitTextPages } from "../extract/extract"
import type { ExtractedDocument } from "../extract/types"
import { parseGuideDocument } from "../structure/guide"
import { isPlausibleNext, parseLegalDocument } from "../structure/legal"
import { chunkUnits, estimateTokens } from "./chunker"

function doc(
  text: string,
  format: ExtractedDocument["format"] = "markdown"
): ExtractedDocument {
  return { format, rawHash: "x", metadata: {}, pages: splitTextPages(text) }
}

const STATUTE = `<!-- page: 6 -->
ROZDZIAŁ 4. ZASIŁEK MACIERZYŃSKI
Art. 29
1. Zasiłek macierzyński przysługuje ubezpieczonej, która w okresie ubezpieczenia chorobowego albo w okresie urlopu wychowawczego:
1) urodziła dziecko;
2) przyjęła na wychowanie dziecko w wieku do 14 roku życia;
3) przyjęła na wychowanie w ramach rodziny zastępczej dziecko w wieku do 7 roku życia.
2. Przepisy ust. 1 pkt 2 i 3 stosuje się odpowiednio do ubezpieczonego.
3. (uchylony)
<!-- page: 7 -->
Art. 30
Zasiłek macierzyński przysługuje także po ustaniu ubezpieczenia.`

describe("legal structure", () => {
  it("detects articles, ust. and pkt and skips repealed provisions", () => {
    const structured = parseLegalDocument(normalizeDocument(doc(STATUTE)))
    const provisions = structured.units.filter(
      (unit) => unit.kind === "provision"
    )
    expect(
      provisions.map(
        (unit) => `${unit.locator.article}:${unit.locator.paragraph ?? "-"}`
      )
    ).toEqual(["29:1", "29:2", "30:-"])
    expect(provisions[0]?.items).toHaveLength(3)
    expect(provisions[0]?.leadIn).toMatch(/:$/)
    expect(provisions[0]?.headingPath).toEqual([
      "ROZDZIAŁ 4. ZASIŁEK MACIERZYŃSKI",
      "Art. 29",
    ])
    expect(structured.stats.repealedSkipped).toBe(1)
    expect(provisions[2]?.pageStart).toBe(7)
  })

  it("recovers flattened superscripts in Kodeks pracy article numbers", () => {
    const text =
      "Art. 180\n§ 1. Urlop.\n§ 11. Część.\n§ 2. Dalej.\nArt. 1801\n§ 1. Martwe dziecko.\nArt. 1821a\n§ 1. Rodzicielski.\nArt. 92\n§ 1. X."
    const units = parseLegalDocument(normalizeDocument(doc(text)), {
      superscripts: true,
    }).units
    expect([...new Set(units.map((unit) => unit.locator.article))]).toEqual([
      "180",
      "180¹",
      "182¹a",
      "92",
    ])
    expect(
      units
        .filter((unit) => unit.locator.article === "180")
        .map((unit) => unit.locator.paragraph)
    ).toEqual(["1", "1¹", "2"])
  })

  it("links amendment footnotes to the provision's effective date", () => {
    const text =
      "Art. 9\n1. Pierwszy ustęp obowiązuje.\n4.3 Niezależnie od liczby tytułów ustala się jeden okres.\n3 Art. 9 ust. 4 dodany ustawą z dnia 18.12.2025 r., która wchodzi w życie 1.01.2027 r."
    const units = parseLegalDocument(
      normalizeDocument(doc(text, "pdf"), {
        footnotes: true,
        runningHeaders: false,
      })
    ).units
    expect(
      units.map((unit) => [unit.locator.paragraph, unit.validFrom ?? null])
    ).toEqual([
      ["1", null],
      ["4", "2027-01-01"],
    ])
  })

  it("rejects wrapped lines that only look like a new ust.", () => {
    expect(isPlausibleNext("1", "2")).toBe(true)
    expect(isPlausibleNext("1", "1a")).toBe(true)
    expect(isPlausibleNext("2", "14", "tygodni")).toBe(false)
    expect(isPlausibleNext("1", "3", "Przepis stosuje się")).toBe(true)
    expect(isPlausibleNext(null, "5", "lat")).toBe(false)
  })
})

describe("section-aware chunking", () => {
  it("keeps a short article whole and never crosses articles", () => {
    const units = parseLegalDocument(normalizeDocument(doc(STATUTE))).units
    const chunks = chunkUnits(units, { citationPrefix: "U" })
    const legal = chunks.filter((chunk) => chunk.legalReference)
    expect(legal.map((chunk) => chunk.legalReference)).toEqual([
      "U art. 29 ust. 1–2",
      "U art. 30",
    ])
    for (const chunk of legal)
      expect(new Set([chunk.metadata.article]).size).toBe(1)
    expect(legal[1]?.pageStart).toBe(7)
  })

  it("splits a long enumeration between points, repeating lead-in and closing", () => {
    const items = Array.from(
      { length: 12 },
      (_, i) =>
        `${i + 1}) warunek numer ${i + 1} dotyczący sytuacji ubezpieczonego i jego dziecka w okresie urlopu;`
    ).join("\n")
    const text = `Art. 29\n9. W przypadku:\n${items}\n- zasiłek macierzyński przysługuje ojcu dziecka.`
    const units = parseLegalDocument(normalizeDocument(doc(text))).units
    const chunks = chunkUnits(
      units,
      { citationPrefix: "U" },
      { maxTokens: 120, legalArticleMaxTokens: 100, minTokens: 0 }
    )
    expect(chunks.length).toBeGreaterThan(1)
    for (const chunk of chunks) {
      expect(chunk.content.startsWith("9. W przypadku:")).toBe(true)
      expect(chunk.content).toContain(
        "zasiłek macierzyński przysługuje ojcu dziecka"
      )
      expect(chunk.content).not.toMatch(
        /warunek numer \d+ dotyczący sytuacji ubezpieczonego i jego\s*$/
      )
      expect(chunk.legalReference).toMatch(
        /^U art\. 29 ust\. 9 \(cz\. \d\/\d\)$/
      )
    }
    const allItems = chunks.flatMap(
      (chunk) => chunk.content.match(/^\d+\)/gm) ?? []
    )
    expect(allItems).toHaveLength(12)
  })

  it("gives a provision with a different effective date its own chunk", () => {
    const text =
      "Art. 9\n1. Pierwszy.\n4.3 Nowy ustęp.\n3 Art. 9 ust. 4 dodany ustawą, która wchodzi w życie 1.01.2027 r."
    const units = parseLegalDocument(
      normalizeDocument(doc(text, "pdf"), {
        footnotes: true,
        runningHeaders: false,
      })
    ).units
    const chunks = chunkUnits(units, { citationPrefix: "U" })
    expect(
      chunks.map((chunk) => [chunk.legalReference, chunk.validFrom])
    ).toEqual([
      ["U art. 9 ust. 1", null],
      ["U art. 9 ust. 4", "2027-01-01"],
    ])
  })

  it("packs guide sections with overlap and keeps lists with their intro", () => {
    const paragraph = (n: number) =>
      `Zdanie numer ${n} opisuje zasady wypłaty zasiłku w prosty sposób.`
    const text = [
      "# Zasiłek macierzyński",
      Array.from({ length: 8 }, (_, i) => paragraph(i + 1)).join(" "),
      "",
      "Zasiłek przysługuje osobom:",
      "- obowiązkowo ubezpieczonym,",
      "- dobrowolnie ubezpieczonym.",
      "",
      "# Inna sekcja",
      "Treść innej sekcji.",
    ].join("\n")
    const units = parseGuideDocument(normalizeDocument(doc(text))).units
    const list = units.find((unit) => unit.kind === "list")
    expect(list?.leadIn).toBe("Zasiłek przysługuje osobom:")
    expect(list?.items).toHaveLength(2)

    const chunks = chunkUnits(
      units,
      {},
      { maxTokens: 60, overlapTokens: 20, minTokens: 0 }
    )
    expect(chunks.every((chunk) => chunk.tokenCount <= 60 * 1.15)).toBe(true)
    const listChunk = chunks.find((chunk) =>
      chunk.content.includes("obowiązkowo ubezpieczonym")
    )
    expect(listChunk?.content).toContain("Zasiłek przysługuje osobom:")
    expect(listChunk?.content).toContain("dobrowolnie ubezpieczonym")
    expect(
      chunks.some((chunk) => (chunk.metadata.overlapTokens ?? 0) > 0)
    ).toBe(true)
    expect(
      chunks.find((chunk) => chunk.content.includes("Treść innej sekcji"))
        ?.headingPath
    ).toEqual(["Inna sekcja"])
    expect(
      chunks.some(
        (chunk) =>
          chunk.content.includes("Treść innej sekcji") &&
          chunk.content.includes("Zdanie numer")
      )
    ).toBe(false)
  })

  it("honours configurable size and rejects invalid overlap", () => {
    const text = `# A\n${Array.from({ length: 40 }, (_, i) => `Zdanie ${i} o zasiłku chorobowym w ciąży.`).join(" ")}`
    const units = parseGuideDocument(normalizeDocument(doc(text))).units
    const small = chunkUnits(
      units,
      {},
      { maxTokens: 50, overlapTokens: 0, minTokens: 0 }
    )
    const large = chunkUnits(
      units,
      {},
      { maxTokens: 400, overlapTokens: 0, minTokens: 0 }
    )
    expect(small.length).toBeGreaterThan(large.length)
    expect(() =>
      chunkUnits(units, {}, { maxTokens: 50, overlapTokens: 50 })
    ).toThrow(/overlap/)
    expect(estimateTokens("abcdefg", 3.5)).toBe(2)
  })
})
