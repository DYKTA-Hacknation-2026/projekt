import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { HashEmbeddingProvider } from "../src/embeddings"
import { IngestionPipeline } from "../src/ingest/pipeline"
import { RetrievalService } from "../src/retrieval/service"
import type { DocumentDefinition, SourceDefinition } from "../src/sources/types"
import {
  ConceptEmbeddingProvider,
  createTestDatabase,
  TEST_DATABASE_URL,
  document,
  source,
  testConfig,
  textRequest,
  type TestDatabase,
} from "./helpers"

const KP = source({
  slug: "kodeks-pracy",
  title: "Kodeks pracy",
  authorityRank: 100,
})
const FORMS = source({
  slug: "zus-formularze",
  title: "Formularze ZUS",
  sourceType: "FORM_INSTRUCTION",
  accessLevel: "PUBLIC",
  redistribution: "ATTRIBUTION",
  authorityRank: 70,
})
const INTERNAL = source({
  slug: "hacknation",
  title: "Materiały konkursowe",
  sourceType: "TASK_DOCUMENT",
  accessLevel: "INTERNAL",
  redistribution: "CITATION_ONLY",
  authorityRank: 40,
})
const U = source({
  slug: "ustawa-zasilkowa",
  title: "Ustawa zasiłkowa",
  authorityRank: 100,
})

const KP_TEXT = `<!-- page: 3 -->
Art. 180
§ 1. Pracownicy przysługuje urlop macierzyński w wymiarze:
1) 20 tygodni - w przypadku urodzenia jednego dziecka przy jednym porodzie;
2) 31 tygodni - w przypadku urodzenia dwojga dzieci przy jednym porodzie.
<!-- page: 7 -->
Art. 1821a
§ 1. Pracownicy - rodzice dziecka mają prawo do urlopu rodzicielskiego w wymiarze do 41 tygodni.
§ 2. Rodzicom dziecka posiadającego zaświadczenie „Za życiem” przysługuje urlop rodzicielski w wymiarze do 65 tygodni.
Art. 1823
§ 1. Pracownik - ojciec ma prawo do urlopu ojcowskiego w wymiarze do 2 tygodni.`

const FORMS_TEXT = `# Formularze

## ZAM
Druk ZAM to wniosek o zasiłek macierzyński składany przez przedsiębiorców do ZUS.

## Z-3
Zaświadczenie Z-3 wystawia pracodawca dla pracownika.

## Z-3a
Zaświadczenie Z-3a dotyczy ubezpieczonego, który nie jest pracownikiem, na przykład zleceniobiorcy.

## e-ZLA
Zwolnienie lekarskie e-ZLA w ciąży oznacza się kodem B.`

const INTERNAL_TEXT = `# Opis zadania
Narzędzie ma objaśniać zasiłek macierzyński przyszłym rodzicom w prosty sposób.`

const U_2026 = `Art. 9
1. Do okresu zasiłkowego wlicza się wszystkie okresy nieprzerwanej niezdolności do pracy.`
const U_2027 = `${U_2026}
4. Niezależnie od liczby tytułów ubezpieczenia chorobowego ustala się jeden okres zasiłkowy.`

const guide = (overrides: Partial<DocumentDefinition>): DocumentDefinition =>
  document({ parser: "guide", legal: undefined, ...overrides })

describe.skipIf(!TEST_DATABASE_URL)("hybrid retrieval", () => {
  let test: TestDatabase
  const provider = new HashEmbeddingProvider({ dimensions: 512 })
  let retrieval: RetrievalService
  let publicRetrieval: RetrievalService

  async function ingest(
    src: SourceDefinition,
    doc: DocumentDefinition,
    text: string
  ) {
    const result = await new IngestionPipeline(test.db, provider).ingest(
      textRequest(src, doc, text)
    )
    expect(result.status, result.error).toMatch(/INGESTED|UPDATED/)
    return result
  }

  beforeAll(async () => {
    test = await createTestDatabase()
    await ingest(
      KP,
      document({
        sourceSlug: "kodeks-pracy",
        documentKey: "kp",
        legal: { citationPrefix: "KP", superscripts: true },
      }),
      KP_TEXT
    )
    await ingest(
      FORMS,
      guide({
        sourceSlug: "zus-formularze",
        documentKey: "forms",
        title: "Formularze ZUS",
        documentType: "FORM_INSTRUCTION",
      }),
      FORMS_TEXT
    )
    await ingest(
      INTERNAL,
      guide({
        sourceSlug: "hacknation",
        documentKey: "task",
        title: "Opis zadania",
        documentType: "TASK_DOCUMENT",
        accessLevel: "INTERNAL",
      }),
      INTERNAL_TEXT
    )
    await ingest(
      U,
      document({
        sourceSlug: "ustawa-zasilkowa",
        documentKey: "u",
        version: "2026-07-01",
        effectiveFrom: "2026-07-01",
        legal: { citationPrefix: "U" },
      }),
      U_2026
    )
    await ingest(
      U,
      document({
        sourceSlug: "ustawa-zasilkowa",
        documentKey: "u",
        version: "2027-01-01",
        effectiveFrom: "2027-01-01",
        legal: { citationPrefix: "U" },
      }),
      U_2027
    )
    retrieval = new RetrievalService(test.db, provider, testConfig(), {
      accessLevels: ["PUBLIC", "INTERNAL"],
      today: () => "2026-11-21",
    })
    publicRetrieval = new RetrievalService(test.db, provider, testConfig(), {
      accessLevels: ["PUBLIC"],
      today: () => "2026-11-21",
    })
  })
  afterAll(async () => test?.close())

  it("returns typed chunks with source, page, section, URL, dates and relevance", async () => {
    const result = await retrieval.search({
      query: "Ile tygodni trwa urlop macierzyński przy jednym dziecku?",
    })
    expect(result.status).toBe("OK")
    const top = result.chunks[0]!
    expect(top).toMatchObject({
      sourceSlug: "kodeks-pracy",
      documentTitle: "Ustawa testowa",
      sectionIdentifier: "Art. 180 § 1",
      legalReference: "KP art. 180 § 1",
      pageNumber: 3,
      sourceUrl: "https://example.test/ustawa",
      accessLevel: "PUBLIC",
      redistribution: "ALLOWED",
    })
    expect(top.content).toContain("20 tygodni")
    expect(top.relevance.relevance).toBeGreaterThanOrEqual(
      result.diagnostics.minRelevance
    )
    expect(top.relevance.ranks.lexical).toBeDefined()
    expect(top.relevance.ranks.vector).toBeDefined()
    expect(result.diagnostics.vectorSearch).toBe("OK")
    expect(result.query.asOf).toBe("2026-11-21")
  })

  it("finds semantically related chunks through pgvector without shared words", async () => {
    const concepts = new ConceptEmbeddingProvider()
    await new IngestionPipeline(test.db, concepts).ingest(
      textRequest(
        KP,
        document({
          sourceSlug: "kodeks-pracy",
          documentKey: "kp",
          legal: { citationPrefix: "KP", superscripts: true },
        }),
        KP_TEXT,
        true
      )
    )
    const semantic = new RetrievalService(
      test.db,
      concepts,
      testConfig({ RETRIEVAL_MIN_RELEVANCE: 0.05, RETRIEVAL_VECTOR_FLOOR: 0 }),
      { accessLevels: ["PUBLIC"], today: () => "2026-11-21" }
    )
    const result = await semantic.search({ query: "bliźnięta" })
    expect(result.diagnostics.candidates.lexical).toBe(0)
    expect(result.diagnostics.embeddingModel?.dimensions).toBe(8)
    expect(result.status).toBe("OK")
    expect(result.chunks[0]?.content).toContain("dwojga dzieci")
    expect(result.chunks[0]?.relevance.ranks).toEqual({ vector: 1 })
  })

  it.each([
    ["ZAM", "Druk ZAM"],
    ["e-ZLA", "e-ZLA"],
    ["L4", "e-ZLA"],
    ["Z-3a", "Z-3a dotyczy"],
    ["Za życiem", "„Za życiem”"],
    ["za zyciem", "„Za życiem”"],
  ])("matches the exact term %s", async (query, expected) => {
    const result = await retrieval.search({ query })
    expect(result.status).toBe("OK")
    expect(result.chunks[0]?.content).toContain(expected)
  })

  it("does not confuse Z-3 with Z-3a", async () => {
    const result = await retrieval.search({ query: "Z-3" })
    expect(result.query.exactTerms).toEqual(["Z-3"])
    const top = result.chunks[0]!
    expect(top.content).toContain("Z-3 wystawia pracodawca")
    expect(top.relevance.exactTerms).toEqual(["Z-3"])
    const z3a = result.chunks.find((chunk) =>
      chunk.content.includes("Z-3a dotyczy")
    )
    if (z3a) expect(z3a.relevance.exactTerms).not.toContain("Z-3")
  })

  it.each([
    ["urlop rodzicielski", "41 tygodni"],
    ["wymiar urlopu rodzicielskiego", "41 tygodni"],
    ["zasiłek macierzyński druk", "Druk ZAM"],
  ])("matches inflected domain phrase %s", async (query, expected) => {
    const result = await retrieval.search({ query })
    expect(
      result.chunks
        .slice(0, 2)
        .map((chunk) => chunk.content)
        .join(" ")
    ).toContain(expected)
  })

  it("filters by source, source type and benefit tags", async () => {
    const bySource = await retrieval.search({
      query: "zasiłek macierzyński",
      sources: ["zus-formularze"],
    })
    expect(bySource.chunks.length).toBeGreaterThan(0)
    expect(new Set(bySource.chunks.map((chunk) => chunk.sourceSlug))).toEqual(
      new Set(["zus-formularze"])
    )

    const byType = await retrieval.search({
      query: "urlop",
      sourceTypes: ["LEGAL_ACT"],
    })
    expect(
      byType.chunks.every((chunk) => chunk.sourceType === "LEGAL_ACT")
    ).toBe(true)

    const byTag = await retrieval.search({
      query: "urlop tygodni",
      benefitTags: ["PATERNITY"],
    })
    expect(byTag.chunks.map((chunk) => chunk.legalReference)).toEqual([
      "KP art. 182³ § 1",
    ])
  })

  it("enforces access levels and never exposes internal material publicly", async () => {
    const internal = await retrieval.search({
      query: "objaśniać zasiłek przyszłym rodzicom",
    })
    expect(
      internal.chunks.some((chunk) => chunk.sourceSlug === "hacknation")
    ).toBe(true)
    expect(
      internal.chunks.find((chunk) => chunk.sourceSlug === "hacknation")
    ).toMatchObject({
      accessLevel: "INTERNAL",
      redistribution: "CITATION_ONLY",
    })

    const pub = await publicRetrieval.search({
      query: "objaśniać zasiłek przyszłym rodzicom",
    })
    expect(pub.chunks.some((chunk) => chunk.sourceSlug === "hacknation")).toBe(
      false
    )

    const restrictedOnly = new RetrievalService(
      test.db,
      provider,
      testConfig(),
      { accessLevels: ["RESTRICTED"] }
    )
    const fallback = await restrictedOnly.search({
      query: "objaśniać zasiłek przyszłym rodzicom",
    })
    expect(
      fallback.chunks.every((chunk) => chunk.accessLevel === "PUBLIC")
    ).toBe(true)
  })

  it("serves the legal version valid on the relevant date", async () => {
    const query = "jeden okres zasiłkowy niezależnie od liczby tytułów"
    const before = await retrieval.search({
      query,
      asOf: "2026-12-01",
      sources: ["ustawa-zasilkowa"],
      minRelevance: 0,
    })
    expect(before.chunks.map((chunk) => chunk.documentVersion)).toEqual([
      "2026-07-01",
    ])
    expect(before.chunks[0]?.content).not.toContain("jeden okres zasiłkowy")
    expect(before.chunks[0]).toMatchObject({
      effectiveFrom: "2026-07-01",
      effectiveTo: "2027-01-01",
    })

    const after = await retrieval.search({
      query,
      asOf: "2027-02-01",
      sources: ["ustawa-zasilkowa"],
    })
    expect(after.chunks.map((chunk) => chunk.documentVersion)).toEqual([
      "2027-01-01",
    ])
    expect(after.chunks[0]?.content).toContain("jeden okres zasiłkowy")
    expect(after.chunks[0]).toMatchObject({
      effectiveFrom: "2027-01-01",
      effectiveTo: null,
    })
  })

  it("applies provision-level effective dates from amendment notes", async () => {
    const pdfLike = new TextEncoder().encode(
      "Art. 17\n1. Ubezpieczony traci prawo do zasiłku chorobowego.\n1d.4 Praca zarobkowa może być wykonywana na żądanie ubezpieczonego.\n4 Art. 17 ust. 1d dodany ustawą z dnia 18.12.2025 r., która wchodzi w życie 1.01.2027 r."
    )
    const result = await new IngestionPipeline(test.db, provider).ingest({
      source: U,
      document: document({
        sourceSlug: "ustawa-zasilkowa",
        documentKey: "pdf",
        version: "854",
        effectiveFrom: "2026-07-01",
        legal: { citationPrefix: "U", footnotes: true },
      }),
      content: { bytes: pdfLike, format: "text" },
    })
    expect(result.status).toBe("INGESTED")
    retrieval.invalidateCaches()
    const query = "praca zarobkowa na żądanie ubezpieczonego"
    const now = await retrieval.search({
      query,
      asOf: "2026-11-21",
      sources: ["ustawa-zasilkowa"],
      minRelevance: 0,
    })
    expect(now.chunks.map((chunk) => chunk.legalReference)).not.toContain(
      "U art. 17 ust. 1d"
    )
    const later = await retrieval.search({
      query,
      asOf: "2027-01-01",
      sources: ["ustawa-zasilkowa"],
    })
    expect(later.chunks[0]).toMatchObject({
      legalReference: "U art. 17 ust. 1d",
      effectiveFrom: "2027-01-01",
    })
  })

  it("supersedes older versions when a corrected edition replaces them", async () => {
    await ingest(
      FORMS,
      guide({
        sourceSlug: "zus-formularze",
        documentKey: "faq",
        version: "1",
        title: "FAQ",
      }),
      "# FAQ\nStara odpowiedź o zasiłku pogrzebowym."
    )
    await ingest(
      FORMS,
      guide({
        sourceSlug: "zus-formularze",
        documentKey: "faq",
        version: "2",
        title: "FAQ",
        supersedesPrevious: true,
      }),
      "# FAQ\nNowa odpowiedź o zasiłku pogrzebowym."
    )
    retrieval.invalidateCaches()
    const result = await retrieval.search({
      query: "odpowiedź zasiłek pogrzebowy",
    })
    const faq = result.chunks.filter((chunk) => chunk.documentTitle === "FAQ")
    expect(faq.map((chunk) => chunk.documentVersion)).toEqual(["2"])
  })

  it("returns a clear no-evidence outcome", async () => {
    const offTopic = await retrieval.search({
      query: "przepis na sernik z rodzynkami",
    })
    expect(offTopic.status).toBe("NO_EVIDENCE")
    expect(offTopic.chunks).toEqual([])
    expect(offTopic.noEvidence?.reason).toMatch(/NO_MATCH|BELOW_THRESHOLD/)
    expect(offTopic.noEvidence?.message).toMatch(/zus\.pl/)

    const empty = await retrieval.search({ query: "czy i jak?" })
    expect(empty.noEvidence?.reason).toBe("EMPTY_QUERY")

    const tooEarly = await retrieval.search({
      query: "okres zasiłkowy",
      asOf: "2020-01-01",
      sources: ["ustawa-zasilkowa"],
    })
    expect(tooEarly).toMatchObject({
      status: "NO_EVIDENCE",
      noEvidence: { reason: "NO_MATCH" },
    })

    const strict = await retrieval.search({
      query: "urlop macierzyński",
      minRelevance: 0.99,
    })
    expect(strict.noEvidence?.reason).toBe("BELOW_THRESHOLD")
  })

  it("redacts personal data before embedding and searching", async () => {
    const spy = new ConceptEmbeddingProvider({
      provider: "local-demo",
      model: "zpr-hash-512",
      dimensions: 512,
    })
    Object.defineProperty(spy, "config", { value: provider.config })
    const spied = new RetrievalService(test.db, spy, testConfig(), {
      accessLevels: ["PUBLIC"],
      today: () => "2026-11-21",
    })
    const result = await spied.search({
      query: "PESEL 90010112345, anna@example.com — urlop ojcowski",
    })
    expect(result.query.redactions.map((r) => r.kind).sort()).toEqual([
      "EMAIL",
      "PESEL",
    ])
    expect(spy.calls.queries.join(" ")).not.toMatch(
      /90010112345|anna@example\.com/
    )
  })

  it("never compares vectors from a different embedding configuration", async () => {
    const other = new HashEmbeddingProvider({
      dimensions: 512,
      queryPrefix: "query: ",
    })
    const mismatched = new RetrievalService(test.db, other, testConfig(), {
      accessLevels: ["PUBLIC"],
      today: () => "2026-11-21",
    })
    const result = await mismatched.search({ query: "urlop rodzicielski" })
    expect(result.diagnostics.vectorSearch).toBe("UNAVAILABLE")
    expect(
      result.chunks.every((chunk) => chunk.relevance.vectorSimilarity === null)
    ).toBe(true)
    expect(result.chunks[0]?.content).toContain("41 tygodni")
  })

  it("supports weighted fusion and the optional reranker", async () => {
    const { LexicalReranker } = await import("../src/retrieval/rerank")
    const weighted = new RetrievalService(
      test.db,
      provider,
      testConfig({ RETRIEVAL_FUSION: "weighted" }),
      {
        accessLevels: ["PUBLIC"],
        reranker: new LexicalReranker(),
        today: () => "2026-11-21",
      }
    )
    const result = await weighted.search({ query: "urlop ojcowski" })
    expect(result.diagnostics).toMatchObject({
      fusion: "weighted",
      reranker: "lexical",
    })
    expect(result.chunks[0]?.legalReference).toBe("KP art. 182³ § 1")
    expect(result.chunks[0]?.relevance.rerankScore).toBeGreaterThan(0)
  })
})
