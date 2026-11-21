import { describe, expect, it } from "vitest"

import { fuse } from "./fusion"
import {
  analyzeQuery,
  bm25,
  containsPhrase,
  idfFrom,
  sanitizeQuery,
  stemCoverage,
} from "./query"
import { LexicalReranker } from "./rerank"
import { pgArray } from "./service"

describe("relevance fusion", () => {
  const lists = {
    vector: [
      { chunkId: "a", rank: 1, score: 0.9 },
      { chunkId: "b", rank: 2, score: 0.5 },
    ],
    lexical: [
      { chunkId: "b", rank: 1, score: 3 },
      { chunkId: "c", rank: 2, score: 1 },
    ],
  }

  it("computes reciprocal rank fusion", () => {
    const fused = fuse(lists, {
      strategy: "rrf",
      k: 60,
      weights: { vector: 1, lexical: 1, exact: 1.5, phrase: 0.75 },
    })
    expect(fused.map((entry) => entry.chunkId)).toEqual(["b", "a", "c"])
    expect(fused[0]?.fusedScore).toBeCloseTo(1 / 62 + 1 / 61)
    expect(fused[0]?.ranks).toEqual({ vector: 2, lexical: 1 })
  })

  it("supports weighted score fusion and list weights", () => {
    const fused = fuse(lists, {
      strategy: "weighted",
      k: 60,
      weights: { vector: 2, lexical: 0, exact: 0, phrase: 0 },
    })
    expect(fused[0]?.chunkId).toBe("a")
    expect(fused.find((entry) => entry.chunkId === "c")?.fusedScore).toBe(0)
  })

  it("lets an exact-match list lift a chunk", () => {
    const fused = fuse(
      { ...lists, exact: [{ chunkId: "c", rank: 1, score: 1 }] },
      {
        strategy: "rrf",
        k: 60,
        weights: { vector: 1, lexical: 1, exact: 1.5, phrase: 0.75 },
      }
    )
    expect(fused[0]?.chunkId).toBe("c")
  })
})

describe("query handling", () => {
  it("redacts personal identifiers before search", () => {
    const { text, redactions } = sanitizeQuery(
      "Mój PESEL 90010112345, mail anna@example.com, tel. 600 700 800, konto PL61 1090 1014 0000 0712 1981 2874 — czy dostanę zasiłek?"
    )
    expect(text).not.toMatch(/\d{6,}|@|600 700/)
    expect(redactions.map((r) => r.kind).sort()).toEqual([
      "ACCOUNT",
      "EMAIL",
      "PESEL",
      "PHONE",
    ])
  })

  it("never sends identifiers to the embedding text or keyword query", () => {
    const analyzed = analyzeQuery("PESEL 90010112345 urlop rodzicielski")
    expect(analyzed.embeddingText).toBe("PESEL urlop rodzicielski")
    expect(analyzed.lexicalQuery).not.toContain("9001")
    expect(analyzed.redactions).toEqual([{ kind: "PESEL", count: 1 }])
  })

  it("detects exact terms, synonyms and tags", () => {
    const analyzed = analyzeQuery("Czy L4 w ciąży wpływa na Z-3a?")
    expect(analyzed.exactTerms.map((term) => term.term)).toEqual(
      expect.arrayContaining(["e-ZLA", "Z-3a"])
    )
    expect(analyzed.expansions).toContain("zwolnienie lekarskie e-ZLA")
    expect(analyzed.benefitTags).toEqual(
      expect.arrayContaining(["SICKNESS", "PREGNANCY", "FORMS"])
    )
  })

  it("weights coverage by IDF so common words alone are not evidence", () => {
    const stats = {
      documents: 100,
      averageLength: 50,
      frequencies: new Map([
        ["2026", 90],
        ["rok", 80],
        ["pit", 0],
      ]),
    }
    const idf = idfFrom(stats)
    const coverage = stemCoverage(
      ["pit", "2026", "rok"],
      "w 2026 rok zasilk",
      idf
    )
    expect(coverage).toBeLessThan(0.3)
    expect(stemCoverage(["pit", "2026"], "pit 2026", idf)).toBe(1)
  })

  it("ranks rare-term matches above repeated common words (BM25)", () => {
    const stats = {
      documents: 100,
      averageLength: 20,
      frequencies: new Map([
        ["zasilk", 80],
        ["przedaw", 2],
      ]),
    }
    const repeated = bm25(
      ["zasilk", "przedaw"],
      "zasilk zasilk zasilk zasilk zasilk macierz",
      stats
    )
    const rare = bm25(
      ["zasilk", "przedaw"],
      "roszcze przedaw po 6 miesi",
      stats
    )
    expect(rare).toBeGreaterThan(repeated)
  })

  it("matches multi-word phrases on stems", () => {
    expect(
      containsPhrase("wymiar urlop rodzici dzieck", ["urlop", "rodzici"])
    ).toBe(true)
    expect(containsPhrase("urlop ojcowsk rodzici", ["urlop", "rodzici"])).toBe(
      false
    )
  })
})

describe("optional reranker", () => {
  it("prefers chunks covering the whole question", async () => {
    const scores = await new LexicalReranker().rerank("urlop ojcowski wymiar", [
      {
        id: "1",
        content: "",
        headingPath: null,
        stemText: "urlop urlop urlop macierz",
      },
      {
        id: "2",
        content: "",
        headingPath: "Urlop ojcowski",
        stemText: "urlop ojcowsk w wymiar do 2 tygodni",
      },
    ])
    expect(scores[1]).toBeGreaterThan(scores[0]!)
  })
})

describe("SQL parameters", () => {
  it("encodes arrays as one escaped Postgres literal", () => {
    expect(pgArray(["PUBLIC", "INTERNAL"])).toBe('{"PUBLIC","INTERNAL"}')
    expect(pgArray(['a"b', "c\\d"])).toBe('{"a\\"b","c\\\\d"}')
  })
})
