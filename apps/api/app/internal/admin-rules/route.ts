import { saveRuleVersionSchema } from "@zpr/contracts/rules-admin"

import { requireAdmin } from "@/server/auth/admin"
import { requireWebService } from "@/server/http/internal"
import { apiRoute, json, readJson } from "@/server/http/route"
import {
  getAdminRules,
  saveAdminRuleVersion,
} from "@/server/services/admin-rules"

/** Rule versions with their parameters, for the `/admin/reguly` editor. */
export const GET = apiRoute(async (request) => {
  requireWebService(request)
  await requireAdmin()
  return json(await getAdminRules())
})

/** Appends an immutable version. The previous one is closed automatically. */
export const POST = apiRoute(async (request) => {
  requireWebService(request)
  await requireAdmin()
  const input = await readJson(request, saveRuleVersionSchema)
  return json(await saveAdminRuleVersion(input), { status: 201 })
})
