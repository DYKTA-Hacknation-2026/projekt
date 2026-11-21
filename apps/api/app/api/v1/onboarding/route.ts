import { onboardingSchema } from "@zpr/contracts/onboarding"

import { principalFrom, respondAs } from "@/server/http/principal"
import { apiRoute, json, readJson } from "@/server/http/route"
import { createHousehold } from "@/server/services/onboarding"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export const POST = apiRoute(async (request) => {
  const input = await readJson(request, onboardingSchema)
  const created = await createHousehold(input)
  // Bind the created (synthetic) user to this browser session so the
  // assistant may read the confirmed profile — only with the user's consent
  // and only after they switch it on in the chat.
  const principal = principalFrom(request)
  return respondAs(json(created, { status: 201 }), {
    sid: principal.sid,
    userId: created.userId,
    issue: true,
  })
})
