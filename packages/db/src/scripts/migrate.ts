import "dotenv/config"

import { fileURLToPath } from "node:url"
import path from "node:path"

import { migrate } from "drizzle-orm/node-postgres/migrator"

import { closeDatabase, getDatabaseConnection } from "../client"

const migrationsFolder = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../drizzle"
)

async function main(): Promise<void> {
  const { db } = getDatabaseConnection()
  console.info(`[db:migrate] Applying migrations from ${migrationsFolder}`)
  await migrate(db, { migrationsFolder })
  console.info("[db:migrate] Migrations applied successfully.")
}

main()
  .then(async () => {
    await closeDatabase()
    process.exit(0)
  })
  .catch(async (error: unknown) => {
    console.error("[db:migrate] Migration failed:", error)
    await closeDatabase()
    process.exit(1)
  })
