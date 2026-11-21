import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres"
import { Pool } from "pg"

import { getEnv } from "@zpr/contracts/env"

import * as schema from "./schema"

export type Database = NodePgDatabase<typeof schema>
export type DatabaseConnection = {
  db: Database
  pool: Pool
  connectionString: string
}

type DbGlobal = typeof globalThis & {
  __zprDatabase?: DatabaseConnection
}

export function createDatabase(connectionString?: string): DatabaseConnection {
  const env = getEnv()
  const url = connectionString ?? env.DATABASE_URL
  const pool = new Pool({
    connectionString: url,
    max: env.DATABASE_POOL_MAX,
    ssl: env.DATABASE_SSL ? { rejectUnauthorized: false } : undefined,
  })

  const db = drizzle(pool, { schema })
  return { db, pool, connectionString: url }
}

export function getDatabaseConnection(): DatabaseConnection {
  const globalForDb = globalThis as DbGlobal
  globalForDb.__zprDatabase ??= createDatabase()
  return globalForDb.__zprDatabase
}

export function getDb(): Database {
  return getDatabaseConnection().db
}

export async function closeDatabase(): Promise<void> {
  const globalForDb = globalThis as DbGlobal
  if (!globalForDb.__zprDatabase) return
  await globalForDb.__zprDatabase.pool.end()
  globalForDb.__zprDatabase = undefined
}

export { schema }
