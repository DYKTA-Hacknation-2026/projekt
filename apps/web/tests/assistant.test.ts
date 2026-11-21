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
  sourceId: "01900000-0000-7000-8000-000000000101",
  sourceSlug: "kodeks-pracy",
  documentTitle: "Kodeks pracy — urlopy",
  documentVersion: "2026",
  externalId: null,
  headingPath: "Art. 180",
  pageEnd: 52,
  accessLevel: "PUBLIC",
  redistribution: "ALLOWED",
  authorityRank: 100,
  benefitTags: ["MATERNITY"],
  relevance: {
    score: 0.03,
    relevance: 0.8,
    vectorSimilarity: 0.4,
    lexicalScore: 2,
    coverage: 0.9,
    exactTerms: [],
    ranks: { vector: 1, lexical: 1 },
  },
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

  it("cites citation-only sources without quoting them", () => {
    const internal: KnowledgeChunkResult = {
      ...chunk,
      accessLevel: "INTERNAL",
      redistribution: "CITATION_ONLY",
      content:
        "Tekst z materiałów konkursowych, którego nie wolno rozpowszechniać.",
    }
    const answer = buildGroundedAnswer("urlop macierzyński", [internal])
    expect(answer.content).not.toContain("nie wolno rozpowszechniać")
    expect(answer.content).toContain("KP art. 180")
    expect(answer.citations[0]?.quote).not.toContain(
      "nie wolno rozpowszechniać"
    )
  })

  it("passes the retrieval no-evidence message through", () => {
    const answer = buildGroundedAnswer(
      "sernik",
      [],
      "W bazie wiedzy nie ma fragmentu, który dotyczy tego pytania."
    )
    expect(answer.content).toContain("nie ma fragmentu")
    expect(answer.citations).toEqual([])
  })

  it("adds the amount guard without inventing a number", () => {
    const answer = buildGroundedAnswer("Ile będę dostawać na rodzicielskim?", [
      chunk,
    ])
    expect(answer.content).toContain("Nie wyliczam kwot")
    expect(answer.content).not.toMatch(/\d+\s?zł/)
  })
})
