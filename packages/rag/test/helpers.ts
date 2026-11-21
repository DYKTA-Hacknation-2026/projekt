import path from "node:path"
import { fileURLToPath } from "node:url"

import { migrate } from "drizzle-orm/node-postgres/migrator"

import { createDatabase, type Database } from "@zpr/db/client"

import { parseRagConfig, type RagConfig } from "../src/config"
import type {
  EmbeddingModelConfig,
  EmbeddingProvider,
} from "../src/embeddings/provider"
import { l2Normalize } from "../src/embeddings/provider"
import type { IngestRequest } from "../src/ingest/pipeline"
import type { DocumentDefinition, SourceDefinition } from "../src/sources/types"
import { searchTokens } from "../src/text/search-text"

const here = path.dirname(fileURLToPath(import.meta.url))
const MIGRATIONS = path.resolve(here, "../../db/drizzle")

/**
 * Integration tests need PostgreSQL with pgvector, e.g. the compose service:
 *   TEST_DATABASE_URL=postgresql://zpr:zpr_local_password@localhost:5435/zpr
 * Each test file creates (and drops) its own database, so runs are isolated
 * and never touch application data.
 */
export const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL

export interface TestDatabase {
  db: Database
  url: string
  close(): Promise<void>
}

export async function createTestDatabase(): Promise<TestDatabase> {
  if (!TEST_DATABASE_URL) throw new Error("TEST_DATABASE_URL is not set")
  const name = `zpr_rag_it_${process.pid}_${Math.random().toString(36).slice(2, 8)}`
  const admin = createDatabase(TEST_DATABASE_URL).pool
  await admin.query(`CREATE DATABASE "${name}"`)
  const url = new URL(TEST_DATABASE_URL)
  url.pathname = `/${name}`
  const connection = createDatabase(url.toString())
  await migrate(connection.db, { migrationsFolder: MIGRATIONS })
  return {
    db: connection.db,
    url: url.toString(),
    async close() {
      await connection.pool.end()
      await admin.query(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`)
      await admin.end()
    },
  }
}

export function testConfig(overrides: Partial<RagConfig> = {}): RagConfig {
  return { ...parseRagConfig({}), ...overrides }
}

export function source(
  overrides: Partial<SourceDefinition> = {}
): SourceDefinition {
  return {
    slug: "test-ustawa",
    title: "Ustawa testowa",
    publisher: "Sejm RP",
    sourceType: "LEGAL_ACT",
    url: "https://example.test/ustawa",
    accessLevel: "PUBLIC",
    redistribution: "ALLOWED",
    authorityRank: 100,
    ...overrides,
  }
}

export function document(
  overrides: Partial<DocumentDefinition> = {}
): DocumentDefinition {
  return {
    sourceSlug: "test-ustawa",
    documentKey: "main",
    title: "Ustawa testowa",
    version: "1",
    documentType: "LEGAL_EXTRACT",
    parser: "legal",
    legal: { citationPrefix: "T" },
    origin: { kind: "curated", path: "inline" },
    ...overrides,
  }
}

export function textRequest(
  src: SourceDefinition,
  doc: DocumentDefinition,
  text: string,
  force = false
): IngestRequest {
  return {
    source: src,
    document: doc,
    content: { bytes: new TextEncoder().encode(text), format: "markdown" },
    force,
  }
}

/**
 * A tiny "semantic" provider for tests: each dimension is a concept with
 * synonyms, so "bliźnięta" and "dwojga dzieci" land on the same axis even
 * though they share no word. Proves the pgvector path finds matches that
 * keyword search cannot.
 */
export class ConceptEmbeddingProvider implements EmbeddingProvider {
  static readonly CONCEPTS: string[][] = [
    ["blizniet", "blizniak", "dwojga", "dwoje", "dwojgu"],
    ["ojciec", "ojca", "tata", "taty", "ojcowsk"],
    ["ciaz", "ciazy", "ciezarn"],
    ["pieniadz", "kwot", "wynos", "procent", "podstaw"],
    ["urlop", "urlopu", "wolne"],
    ["formularz", "druk", "wniosek", "wniosk"],
    ["choroba", "chorob", "zwolnien", "l4"],
    ["dziecko", "dziecka", "dzieci", "dzieck"],
  ]
  readonly config: EmbeddingModelConfig
  calls: { documents: string[][]; queries: string[] } = {
    documents: [],
    queries: [],
  }

  constructor(overrides: Partial<EmbeddingModelConfig> = {}) {
    this.config = {
      provider: "test-concepts",
      model: "concepts-8",
      dimensions: 8,
      distanceMetric: "COSINE",
      documentPrefix: "",
      queryPrefix: "",
      normalize: true,
      revision: 1,
      ...overrides,
    }
  }

  private embed(text: string): number[] {
    const tokens = searchTokens(text)
    const vector: number[] = ConceptEmbeddingProvider.CONCEPTS.map(
      (synonyms) =>
        tokens.filter((token) =>
          synonyms.some((synonym) => token.startsWith(synonym))
        ).length
    )
    if (!vector.some((value) => value > 0)) vector[7] = 0.01
    return l2Normalize(
      vector
        .slice(0, this.config.dimensions)
        .concat(new Array(Math.max(0, this.config.dimensions - 8)).fill(0))
    )
  }

  async embedDocument(texts: string[]): Promise<number[][]> {
    this.calls.documents.push(texts)
    return texts.map((text) => this.embed(text))
  }

  async embedQuery(text: string): Promise<number[]> {
    this.calls.queries.push(text)
    return this.embed(text)
  }
}

/** Wraps a provider and fails the first `failures` document calls. */
export class FlakyProvider implements EmbeddingProvider {
  attempts = 0
  constructor(
    private readonly inner: EmbeddingProvider,
    private failures: number,
    private readonly error = () => new Error("embedding API 503")
  ) {}
  get config() {
    return this.inner.config
  }
  async embedDocument(texts: string[]): Promise<number[][]> {
    this.attempts += 1
    if (this.failures > 0) {
      this.failures -= 1
      throw this.error()
    }
    return this.inner.embedDocument(texts)
  }
  embedQuery(text: string): Promise<number[]> {
    return this.inner.embedQuery(text)
  }
}
