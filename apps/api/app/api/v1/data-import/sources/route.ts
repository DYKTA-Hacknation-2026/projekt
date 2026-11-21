import { getDataImportCatalog } from "@/server/services/data-import"
import { apiRoute, json } from "@/server/http/route"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

/**
 * Static catalogue of simulated institutions, scopes and progress activities.
 * It contains no personal data and is safe to render before consent.
 */
export const GET = apiRoute(async () => {
  return json(getDataImportCatalog())
})
