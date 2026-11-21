import "dotenv/config"

import { defineConfig } from "drizzle-kit"

const connectionString =
  process.env.DATABASE_URL ??
  "postgresql://zpr:zpr_local_password@localhost:5435/zpr"

export default defineConfig({
  schema: "./src/schema/index.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url: connectionString },
  casing: "snake_case",
  verbose: true,
  strict: true,
})
