import { describe, expect, it } from "vitest"

import type { KnowledgeChunkResult } from "@zpr/contracts/knowledge"

import { buildGroundedAnswer } from "@/server/services/assistant"

const chunk: KnowledgeChunkResult = {
  id: "01900000-0000-7000-8000-000000000301",
  documentId: "01900000-0000-7000-8000-000000000201",
  content:
    "Wymiar urlopu macierzyńskiego zależy od liczby dzieci: 20 tygodni przy jednym dziecku.",
  sourceTitle: "Kodeks pracy — art. 180",
  sourceUrl: "https://isap.sejm.gov.pl/",
  sourceType: "LEGAL_ACT",
  pageNumber: 52,
  sectionIdentifier: "Art. 180 § 1–2",
  legalReference: "KP art. 180 § 1–2",
  validFrom: "2026-11-01",
  validTo: null,
  score: 0.03,
}

describe("grounded assistant answer", () => {
  it("quotes retrieved chunks and returns citations", () => {
    const answer = buildGroundedAnswer(
      "Ile trwa urlop macierzyński przy jednym dziecku?",
      [chunk]
    )

    expect(answer.content).toContain("20 tygodni")
    expect(answer.content).toContain("[S1]")
    expect(answer.content).toContain("KP art. 180")
    expect(answer.citations).toHaveLength(1)
    expect(answer.citations[0]?.chunkId).toBe(chunk.id)
    expect(answer.citations[0]?.quote.length).toBeLessThanOrEqual(241)
  })

  it("refuses to guess when retrieval finds nothing", () => {
    const answer = buildGroundedAnswer("Pytanie bez źródła", [])
    expect(answer.citations).toEqual([])
    expect(answer.content).toContain("Nie znalazłem")
  })

  it("adds the amount guard without inventing a number", () => {
    const answer = buildGroundedAnswer("Ile będę dostawać na rodzicielskim?", [
      chunk,
    ])
    expect(answer.content).toContain("Nie wyliczam kwot")
    expect(answer.content).not.toMatch(/\d+\s?zł/)
  })
})
