import { checkDatabaseHealth } from "@zpr/db/health"

import { json, apiRoute } from "@/server/http/route"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export const GET = apiRoute(async () => {
  const health = await checkDatabaseHealth()

  return json(
    {
      status: health.status === "ok" ? "ok" : "degraded",
      service: "zpr-web",
      timestamp: new Date().toISOString(),
      checks: {
        database: health.database,
        vector: health.vector,
        migrations: health.migrations,
      },
      latencyMs: health.latencyMs,
    },
    { status: health.status === "ok" ? 200 : 503 }
  )
})
