import { uuidSchema } from "@zpr/contracts/common"

import { AppError } from "@/server/http/problem"
import { principalFrom, respondAs } from "@/server/http/principal"
import { apiRoute, json } from "@/server/http/route"
import {
  deleteConversation,
  getConversationMessages,
} from "@/server/services/assistant"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

type Context = { params: Promise<{ id: string }> }

async function conversationId(context: Context): Promise<string> {
  const parsed = uuidSchema.safeParse((await context.params).id)
  if (!parsed.success) throw new AppError(404, "NOT_FOUND", "Nie znaleziono rozmowy.")
  return parsed.data
}

/** History with tool results, sources and grounding reports. */
export const GET = apiRoute<Context>(async (request, context) => {
  const principal = principalFrom(request)
  const conversation = await getConversationMessages(principal, await conversationId(context))
  return respondAs(json(conversation), principal)
})

export const DELETE = apiRoute<Context>(async (request, context) => {
  const principal = principalFrom(request)
  await deleteConversation(principal, await conversationId(context))
  return respondAs(new Response(null, { status: 204, headers: { "cache-control": "no-store" } }), principal)
})
