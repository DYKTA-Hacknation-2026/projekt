import { existsSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

import { describe, expect, it } from "vitest"

import { prepareDocument } from "../ingest/pipeline"
import { NonRetryableError, withRetry } from "../util/retry"
import { DOCUMENTS, SOURCES, findSource } from "./manifest"
import { mostRestrictiveAccess, mostRestrictiveRedistribution } from "./types"

const KNOWLEDGE = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../knowledge"
)

describe("source manifest", () => {
  it("has unique sources and document versions that reference known sources", () => {
    expect(new Set(SOURCES.map((s) => s.slug)).size).toBe(SOURCES.length)
    const keys = DOCUMENTS.map(
      (d) => `${d.sourceSlug}/${d.documentKey}@${d.version}`
    )
    expect(new Set(keys).size).toBe(keys.length)
    for (const doc of DOCUMENTS)
      expect(findSource(doc.sourceSlug), doc.sourceSlug).toBeDefined()
  })

  it("commits only curated files that exist", () => {
    for (const doc of DOCUMENTS) {
      if (doc.origin.kind === "curated")
        expect(
          existsSync(path.join(KNOWLEDGE, doc.origin.path)),
          doc.origin.path
        ).toBe(true)
    }
  })

  it("never registers documents for restricted sources", () => {
    const restricted = SOURCES.filter(
      (s) => s.accessLevel === "RESTRICTED"
    ).map((s) => s.slug)
    expect(restricted).toContain("zus-przykladowe-sprawy")
    expect(DOCUMENTS.filter((d) => restricted.includes(d.sourceSlug))).toEqual(
      []
    )
  })

  it("keeps competition copies internal and citation-only", () => {
    for (const doc of DOCUMENTS.filter((d) => d.origin.kind === "local")) {
      const source = findSource(doc.sourceSlug)!
      expect(mostRestrictiveAccess(source.accessLevel, doc.accessLevel)).toBe(
        "INTERNAL"
      )
      expect(
        mostRestrictiveRedistribution(source.redistribution, doc.redistribution)
      ).toBe("CITATION_ONLY")
    }
  })

  it("chains statute versions by effective date", () => {
    const versions = DOCUMENTS.filter(
      (d) =>
        d.sourceSlug === "ustawa-zasilkowa" &&
        d.documentKey === "wybrane-przepisy"
    )
    expect(
      versions.map((v) => [v.effectiveFrom, v.effectiveTo ?? null])
    ).toEqual([
      ["2026-07-01", "2027-01-01"],
      ["2027-01-01", null],
    ])
  })
})

describe("curated documents", () => {
  it("chunk with page and legal references", async () => {
    const definition = DOCUMENTS.find((d) => d.documentKey === "dzial-osmy")!
    const prepared = await prepareDocument({
      source: findSource(definition.sourceSlug)!,
      document: definition,
      content: {
        filePath: path.join(
          KNOWLEDGE,
          (definition.origin as { path: string }).path
        ),
      },
    })
    expect(prepared.rows.map((row) => row.legalReference)).toEqual([
      "KP art. 180 § 1–3",
      "KP art. 180¹ § 1–2",
      "KP art. 182¹a § 1–4",
      "KP art. 182³ § 1–2",
    ])
    expect(prepared.rows[0]?.pageNumber).toBe(3)
    expect(prepared.rows[3]).toMatchObject({ pageNumber: 7, pageEnd: 8 })
    expect(prepared.rows[2]?.metadata.benefitTags).toEqual(
      expect.arrayContaining(["PARENTAL", "ZA_ZYCIEM"])
    )
    expect(prepared.rows[0]?.searchText).toContain("art 180")
  })
})

describe("retry", () => {
  it("retries transient failures and stops on non-retryable ones", async () => {
    let calls = 0
    const result = await withRetry(
      async () => {
        calls += 1
        if (calls < 3) throw new Error("transient")
        return "ok"
      },
      { attempts: 3, baseDelayMs: 1, sleep: async () => {} }
    )
    expect(result).toBe("ok")

    calls = 0
    await expect(
      withRetry(
        async () => {
          calls += 1
          throw new NonRetryableError("fatal")
        },
        { attempts: 5, baseDelayMs: 1, sleep: async () => {} }
      )
    ).rejects.toThrow("fatal")
    expect(calls).toBe(1)
  })
})
