import { generateText } from "ai"
import { z } from "zod"

import { createChatModel } from "@zpr/ai/provider"
import { scrubPii } from "@zpr/ai/guards"
import type { Env } from "@zpr/contracts/env"
import type { FieldSuggester } from "@zpr/documents"

/**
 * LLM fallback for unread document fields (AD-08). Off unless
 * DOCUMENT_LLM_FALLBACK=true, an AI provider is configured and the user ticks
 * consent for that request. The text is scrubbed twice (document scrubber in
 * `@zpr/documents`, then the assistant's PII guard); the model only proposes
 * values, which come back as `source: LLM`, low confidence, unconfirmed.
 */

const responseSchema = z.object({
  fields: z.array(z.object({ key: z.string().max(80), value: z.string().max(200) })).max(40),
})

export function createDocumentSuggester(env: Env): FieldSuggester | null {
  if (!env.DOCUMENT_LLM_FALLBACK) return null
  const resolved = createChatModel({ provider: env.AI_PROVIDER, model: env.AI_MODEL, apiKey: env.AI_API_KEY, baseUrl: env.AI_BASE_URL })
  if (!resolved) return null
  return {
    name: `${resolved.provider}:${resolved.modelId}`,
    async suggest(request) {
      const { text } = scrubPii(request.text)
      const result = await generateText({
        model: resolved.model,
        temperature: 0,
        maxOutputTokens: 800,
        maxRetries: 0,
        abortSignal: AbortSignal.timeout(Math.min(env.AI_TIMEOUT_MS, 20_000)),
        instructions:
          "Odczytujesz wartości pól z tekstu formularza ZUS. Zwróć wyłącznie JSON {\"fields\":[{\"key\":\"...\",\"value\":\"...\"}]}. " +
          "Podawaj tylko wartości dosłownie obecne w tekście; jeśli pola nie ma, pomiń je. Nie zgaduj i nie licz.",
        prompt: `Formularz: ${request.form}\nPola: ${JSON.stringify(request.fields)}\n\nTekst:\n${text}`,
      })
      const match = /\{[\s\S]*\}/.exec(result.text)
      if (!match) return []
      const parsed = responseSchema.safeParse(JSON.parse(match[0]))
      if (!parsed.success) return []
      const allowed = new Set(request.fields.map((field) => field.key))
      return parsed.data.fields.filter((field) => allowed.has(field.key))
    },
  }
}
