import { describe, expect, it, vi } from "vitest"

import { parseEnv } from "@zpr/contracts/env"

import {
  assertCompatible,
  configFingerprint,
  cosineSimilarity,
  createEmbeddingProvider,
  EmbeddingCompatibilityError,
  HashEmbeddingProvider,
  OpenAICompatibleEmbeddingProvider,
} from "./index"

describe("embedding provider abstraction", () => {
  it("local provider is deterministic with configurable dimensions", async () => {
    const provider = new HashEmbeddingProvider({ dimensions: 256 })
    const [a] = await provider.embedDocument(["urlop macierzyński i zasiłek"])
    const b = await provider.embedQuery("urlop macierzyński i zasiłek")
    expect(a).toHaveLength(256)
    expect(b).toEqual(a)
    expect(Math.hypot(...b)).toBeCloseTo(1)
  })

  it("embedQuery and embedDocument share one vector space", async () => {
    const provider = new HashEmbeddingProvider()
    const [related, unrelated] = await provider.embedDocument([
      "Zasiłek macierzyński wynosi 100% podstawy wymiaru zasiłku.",
      "Rejestracja działalności gospodarczej w gminie.",
    ])
    const query = await provider.embedQuery("ile wynosi zasiłek macierzyński")
    expect(cosineSimilarity(query, related!)).toBeGreaterThan(
      cosineSimilarity(query, unrelated!)
    )
  })

  it("builds the same provider configuration for indexing and querying from env", () => {
    const env = parseEnv({
      EMBEDDING_DIMENSIONS: "512",
      EMBEDDING_QUERY_PREFIX: "query: ",
      EMBEDDING_DOCUMENT_PREFIX: "passage: ",
    })
    const a = createEmbeddingProvider(env)
    const b = createEmbeddingProvider(env)
    expect(a.config).toEqual(b.config)
    expect(a.config).toMatchObject({
      provider: "local-demo",
      dimensions: 512,
      queryPrefix: "query: ",
    })
    expect(configFingerprint(a.config)).toBe(configFingerprint(b.config))
  })

  it("fingerprint changes with anything that alters the vector space", () => {
    const base = new HashEmbeddingProvider().config
    expect(configFingerprint({ ...base, queryPrefix: "query: " })).not.toBe(
      configFingerprint(base)
    )
    expect(configFingerprint({ ...base, dimensions: 768 })).not.toBe(
      configFingerprint(base)
    )
    expect(configFingerprint({ ...base, model: "other" })).not.toBe(
      configFingerprint(base)
    )
  })

  it("rejects an index built with an incompatible configuration", () => {
    const runtime = new HashEmbeddingProvider().config
    const stored = {
      name: "x",
      dimensions: 1024,
      configFingerprint: configFingerprint(runtime),
    }
    expect(() => assertCompatible(stored, runtime)).not.toThrow()
    expect(() =>
      assertCompatible({ ...stored, dimensions: 768 }, runtime)
    ).toThrow(EmbeddingCompatibilityError)
    expect(() =>
      assertCompatible(stored, { ...runtime, documentPrefix: "passage: " })
    ).toThrow(/configuration/)
  })

  it("requires credentials or a base URL for remote providers", () => {
    expect(() =>
      createEmbeddingProvider(parseEnv({ EMBEDDING_PROVIDER: "openai" }))
    ).toThrow(/EMBEDDING_API_KEY/)
    expect(() =>
      createEmbeddingProvider(
        parseEnv({ EMBEDDING_PROVIDER: "openai-compatible" })
      )
    ).toThrow(/EMBEDDING_BASE_URL/)
    const ollama = createEmbeddingProvider(
      parseEnv({ EMBEDDING_PROVIDER: "ollama", EMBEDDING_MODEL: "bge-m3" })
    )
    expect(ollama).toBeInstanceOf(OpenAICompatibleEmbeddingProvider)
  })
})

describe("OpenAI-compatible provider", () => {
  const vector = (seed: number, dims = 4) =>
    Array.from({ length: dims }, (_, i) => (i === seed % dims ? 3 : 0))
  const respond = (inputs: string[], dims = 4) =>
    new Response(
      JSON.stringify({
        data: inputs
          .map((_, index) => ({ index, embedding: vector(index, dims) }))
          .reverse(),
      }),
      { status: 200 }
    )

  it("batches, applies prefixes, normalises and keeps order", async () => {
    const calls: Array<{ input: string[]; dimensions?: number }> = []
    const fetchMock = vi.fn(
      async (_url: string | URL | Request, init?: RequestInit) => {
        const body = JSON.parse(String(init?.body)) as {
          input: string[]
          dimensions?: number
        }
        calls.push(body)
        return respond(body.input)
      }
    )
    const provider = new OpenAICompatibleEmbeddingProvider({
      provider: "openai",
      model: "text-embedding-3-small",
      dimensions: 4,
      baseUrl: "https://example.test/v1",
      apiKey: "k",
      batchSize: 2,
      documentPrefix: "passage: ",
      queryPrefix: "query: ",
      fetch: fetchMock as unknown as typeof fetch,
    })
    const vectors = await provider.embedDocument(["a", "b", "c"])
    expect(calls.map((call) => call.input)).toEqual([
      ["passage: a", "passage: b"],
      ["passage: c"],
    ])
    expect(calls[0]?.dimensions).toBe(4)
    expect(vectors[0]).toEqual([1, 0, 0, 0])
    expect(vectors[1]).toEqual([0, 1, 0, 0])
    await provider.embedQuery("q")
    expect(calls.at(-1)?.input).toEqual(["query: q"])
  })

  it("retries rate limits and server errors, fails fast on 4xx", async () => {
    let attempts = 0
    const flaky = vi.fn(
      async (_url: string | URL | Request, init?: RequestInit) => {
        attempts += 1
        if (attempts < 3) return new Response("slow down", { status: 429 })
        return respond(
          (JSON.parse(String(init?.body)) as { input: string[] }).input
        )
      }
    )
    const provider = new OpenAICompatibleEmbeddingProvider({
      provider: "openai-compatible",
      model: "m",
      dimensions: 4,
      baseUrl: "https://x.test",
      retries: 3,
      fetch: flaky as unknown as typeof fetch,
    })
    await expect(provider.embedQuery("x")).resolves.toHaveLength(4)
    expect(attempts).toBe(3)

    const badRequest = vi.fn(async () => new Response("bad", { status: 400 }))
    const failing = new OpenAICompatibleEmbeddingProvider({
      provider: "openai-compatible",
      model: "m",
      dimensions: 4,
      baseUrl: "https://x.test",
      retries: 3,
      fetch: badRequest as unknown as typeof fetch,
    })
    await expect(failing.embedQuery("x")).rejects.toThrow(/400/)
    expect(badRequest).toHaveBeenCalledTimes(1)
  }, 20_000)

  it("rejects vectors with the wrong dimension", async () => {
    const wrong = vi.fn(
      async (_url: string | URL | Request, init?: RequestInit) =>
        respond(
          (JSON.parse(String(init?.body)) as { input: string[] }).input,
          3
        )
    )
    const provider = new OpenAICompatibleEmbeddingProvider({
      provider: "openai-compatible",
      model: "m",
      dimensions: 4,
      baseUrl: "https://x.test",
      retries: 1,
      fetch: wrong as unknown as typeof fetch,
    })
    await expect(provider.embedQuery("x")).rejects.toThrow(
      /3 dimensions, expected 4/
    )
  })
})
