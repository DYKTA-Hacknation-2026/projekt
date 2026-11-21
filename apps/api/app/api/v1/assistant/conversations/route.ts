import { principalFrom, respondAs } from "@/server/http/principal"
import { apiRoute, json } from "@/server/http/route"
import {
  deleteAllConversations,
  listConversations,
} from "@/server/services/assistant"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

/** The caller's own conversations (owner = signed session). */
export const GET = apiRoute(async (request) => {
  const principal = principalFrom(request)
  const conversations = principal.issue ? [] : await listConversations(principal)
  return respondAs(json({ conversations }), principal)
})

/** Deletes all of the caller's conversations with messages, tool calls and evidence. */
export const DELETE = apiRoute(async (request) => {
  const principal = principalFrom(request)
  const deleted = principal.issue ? 0 : await deleteAllConversations(principal)
  return respondAs(json({ deleted }), principal)
})
