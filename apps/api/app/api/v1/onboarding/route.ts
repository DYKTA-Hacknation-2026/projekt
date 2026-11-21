import { onboardingSchema } from "@zpr/contracts/onboarding"

import { apiRoute, json, readJson } from "@/server/http/route"
import { createHousehold } from "@/server/services/onboarding"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export const POST = apiRoute(async (request) => {
  const input = await readJson(request, onboardingSchema)
  const created = await createHousehold(input)
  return json(created, { status: 201 })
})
