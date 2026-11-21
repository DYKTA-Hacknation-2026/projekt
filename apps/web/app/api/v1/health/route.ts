import { checkDatabaseHealth } from "@zpr/db/health"

import { apiRoute, json } from "@/server/http/route"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export const GET = apiRoute(async () => {
  const health = await checkDatabaseHealth()

  return json(
    {
      status: health.status,
      service: {
        name: "zpr-web",
        version: "0.1.0-scaffold",
        environment: process.env.NODE_ENV ?? "development",
      },
      timestamp: new Date().toISOString(),
      latencyMs: health.latencyMs,
      database: health.database,
      vector: health.vector,
      migrations: health.migrations,
      tables: health.tables,
      counts: health.counts,
    },
    { status: health.status === "error" ? 503 : 200 }
  )
})
