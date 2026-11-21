import { mkdtemp, readdir, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"

import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { applyMigrations, createDatabase, type DatabaseConnection } from "@zpr/db/client"
import { DrizzleDocumentRepository } from "@zpr/db/repositories"
import { buildSyntheticSamplePdf } from "@zpr/documents/samples"
import { LocalFileStorage } from "@zpr/documents/storage"

import { createDocumentService } from "@/server/services/documents"

/**
 * PostgreSQL + local private storage: upload is stored in `docs.uploads`,
 * extraction in `docs.extractions` (+ findings), checklist in
 * `app.checklist_items`, and after the TTL the file and the rows are gone.
 *
 *   TEST_DATABASE_URL=postgresql://zpr:zpr_local_password@localhost:5435/zpr pnpm --filter api test
 *
 * Creates and drops its own database; skipped without TEST_DATABASE_URL.
 */

const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL

describe.skipIf(!TEST_DATABASE_URL)("documents on PostgreSQL", () => {
  const name = `zpr_docs_it_${process.pid}_${Math.random().toString(36).slice(2, 8)}`
  let admin: DatabaseConnection
  let connection: DatabaseConnection
  let dir: string
  let now = new Date("2026-11-21T10:00:00Z")

  beforeAll(async () => {
    admin = createDatabase(TEST_DATABASE_URL)
    await admin.pool.query(`CREATE DATABASE "${name}"`)
    const url = new URL(TEST_DATABASE_URL!)
    url.pathname = `/${name}`
    connection = createDatabase(url.toString())
    await applyMigrations(connection.db)
    dir = await mkdtemp(path.join(tmpdir(), "zpr-docs-it-"))
  }, 120_000)

  afterAll(async () => {
    await connection?.pool.end()
    await admin?.pool.query(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`)
    await admin?.pool.end()
    if (dir) await rm(dir, { recursive: true, force: true })
  })

  it("persists the pipeline and purges file and rows after the TTL", async () => {
    const service = createDocumentService({
      repo: new DrizzleDocumentRepository(connection.db),
      storage: new LocalFileStorage(dir),
      env: { DOCUMENT_TTL_HOURS: 24, DOCUMENT_EXTRACTION_TIMEOUT_MS: 10_000, DOCUMENT_OCR_ENABLED: false, DOCUMENT_LLM_FALLBACK: false, DOCUMENT_DEMO_MODE: true, SAMPLE_CASES_DIR: undefined },
      now: () => now,
      today: () => "2026-11-21",
    })
    const owner = "0193a000-0000-7000-8000-0000000000ff"
    const bytes = buildSyntheticSamplePdf("kasia-z3a")!
    const form = new FormData()
    form.set("file", new File([new Uint8Array(bytes)], "Z-3a.pdf", { type: "application/pdf" }))
    const meta = await service.upload({ ownerKey: owner, file: form.get("file"), consent: "DOCUMENT_PROCESSING" })

    const count = async (table: string) => Number((await connection.pool.query(`select count(*)::int as n from ${table} where ${table === "docs.uploads" ? "id" : table === "docs.extractions" ? "upload_id" : "source_document_id"} = $1`, [meta.documentId])).rows[0].n)
    expect(await count("docs.uploads")).toBe(1)
    expect((await readdir(path.join(dir, "uploads"))).length).toBe(1)

    const extraction = await service.extract(meta.documentId, owner)
    expect(await count("docs.extractions")).toBe(1)
    const findings = await connection.pool.query("select code from docs.validation_findings f join docs.extractions e on e.id = f.extraction_id where e.upload_id = $1", [meta.documentId])
    expect(findings.rows.map((row: { code: string }) => row.code)).toContain("INSURANCE_ENDED_BEFORE_EVENT")

    const assessment = await service.confirm(meta.documentId, owner, { fields: extraction.fields.map((field) => ({ key: field.key, value: field.value, confirmed: true })) })
    expect(assessment.status).toBe("CONFIRMED")
    const stored = await connection.pool.query("select status, confirmed_at, result->'fields' as fields from docs.extractions where upload_id = $1", [meta.documentId])
    expect(stored.rows[0]).toMatchObject({ status: "CONFIRMED" })
    expect(stored.rows[0].confirmed_at).toBeInstanceOf(Date)
    expect(await count("app.checklist_items")).toBe(assessment.checklist.length)

    now = new Date("2026-11-22T10:00:01Z")
    expect(await service.cleanupExpired()).toBe(1)
    expect(await count("docs.uploads")).toBe(0)
    expect(await count("docs.extractions")).toBe(0)
    expect((await readdir(path.join(dir, "uploads"))).length).toBe(0)
    // The checklist holds no document content and stays with the owner (database-design §4).
    const orphaned = await connection.pool.query("select count(*)::int as n from app.checklist_items where owner_key = $1 and source_document_id is null", [owner])
    expect(orphaned.rows[0].n).toBe(assessment.checklist.length)
  }, 60_000)
})
