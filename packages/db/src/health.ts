import { sql } from "drizzle-orm"

import { getDatabaseConnection } from "./client"

export interface DatabaseHealth {
  status: "ok" | "degraded" | "error"
  latencyMs: number
  database: {
    status: "ok" | "error"
    message?: string
  }
  vector: {
    status: "ok" | "missing"
    extension: "vector"
    version: string | null
  }
  migrations: {
    status: "ok" | "missing"
    table: string
  }
  tables: {
    users: boolean
    knowledgeChunks: boolean
    legalRules: boolean
    conversations: boolean
  }
  counts: {
    knowledgeChunks: number | null
    legalRules: number | null
  }
}

export async function checkDatabaseHealth(): Promise<DatabaseHealth> {
  const startedAt = performance.now()

  try {
    const { db } = getDatabaseConnection()

    await db.execute(sql`select 1`)

    const vectorResult = await db.execute(
      sql`select extversion from pg_extension where extname = 'vector'`
    )
    const versionRow = vectorResult.rows[0] as
      | { extversion?: string }
      | undefined

    const tableResult = await db.execute(sql`
      select
        to_regclass('app.users') is not null as users,
        to_regclass('kb.knowledge_chunks') is not null as knowledge_chunks,
        to_regclass('legal.legal_rules') is not null as legal_rules,
        to_regclass('chat.conversations') is not null as conversations,
        to_regclass('drizzle.__drizzle_migrations') is not null as migrations
    `)
    const tables = tableResult.rows[0] as
      | {
          users?: boolean
          knowledge_chunks?: boolean
          legal_rules?: boolean
          conversations?: boolean
          migrations?: boolean
        }
      | undefined

    let knowledgeChunks: number | null = null
    let legalRules: number | null = null

    if (tables?.knowledge_chunks) {
      const result = await db.execute(
        sql`select count(*)::int as value from kb.knowledge_chunks`
      )
      knowledgeChunks = Number(
        (result.rows[0] as { value?: number } | undefined)?.value ?? 0
      )
    }

    if (tables?.legal_rules) {
      const result = await db.execute(
        sql`select count(*)::int as value from legal.legal_rules`
      )
      legalRules = Number(
        (result.rows[0] as { value?: number } | undefined)?.value ?? 0
      )
    }

    const vectorOk = Boolean(versionRow?.extversion)
    const migrationsOk = Boolean(tables?.migrations)
    const allTablesOk = Boolean(
      tables?.users &&
        tables?.knowledge_chunks &&
        tables?.legal_rules &&
        tables?.conversations
    )

    return {
      status: vectorOk && migrationsOk && allTablesOk ? "ok" : "degraded",
      latencyMs: Math.round(performance.now() - startedAt),
      database: { status: "ok" },
      vector: {
        status: vectorOk ? "ok" : "missing",
        extension: "vector",
        version: versionRow?.extversion ?? null,
      },
      migrations: {
        status: migrationsOk ? "ok" : "missing",
        table: "drizzle.__drizzle_migrations",
      },
      tables: {
        users: Boolean(tables?.users),
        knowledgeChunks: Boolean(tables?.knowledge_chunks),
        legalRules: Boolean(tables?.legal_rules),
        conversations: Boolean(tables?.conversations),
      },
      counts: { knowledgeChunks, legalRules },
    }
  } catch (error) {
    return {
      status: "error",
      latencyMs: Math.round(performance.now() - startedAt),
      database: {
        status: "error",
        message:
          error instanceof Error ? error.message : "Nieznany błąd bazy danych",
      },
      vector: { status: "missing", extension: "vector", version: null },
      migrations: {
        status: "missing",
        table: "drizzle.__drizzle_migrations",
      },
      tables: {
        users: false,
        knowledgeChunks: false,
        legalRules: false,
        conversations: false,
      },
      counts: { knowledgeChunks: null, legalRules: null },
    }
  }
}
