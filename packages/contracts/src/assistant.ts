import { z } from "zod"

import { isoDateSchema } from "./common"

const messageText = z
  .string()
  .trim()
  .min(2, "Wiadomość jest zbyt krótka")
  .max(4000, "Wiadomość jest zbyt długa")

export const assistantOptionsSchema = z
  .object({
    /** The user explicitly allows the assistant to read their confirmed profile. */
    useProfile: z.boolean().default(false),
    /** Date the provisions must be valid on (defaults to today in Warsaw). */
    asOf: isoDateSchema.optional(),
  })
  .strict()

/** REST (non-streaming) request: `POST /api/v1/assistant/messages`. */
export const assistantChatSchema = z
  .object({
    message: messageText,
    conversationId: z.uuid().optional(),
    asOf: isoDateSchema.optional(),
    useProfile: z.boolean().default(false),
  })
  .strict()

/**
 * Streaming request: `POST /api/v1/assistant/chat` (AI SDK UI message stream).
 *
 * The client sends only the newest user message; history is always loaded
 * from the database, so a client cannot inject fabricated assistant or tool
 * messages into the model context. Only text parts are accepted.
 */
export const assistantStreamRequestSchema = z
  .object({
    id: z.uuid("Nieprawidłowy identyfikator rozmowy"),
    message: z
      .object({
        id: z.string().min(1).max(100),
        role: z.literal("user"),
        parts: z
          .array(
            z.object({ type: z.literal("text"), text: messageText }).strict()
          )
          .length(1),
        metadata: z.unknown().optional(),
      })
      .strict(),
    options: assistantOptionsSchema.optional(),
    trigger: z.enum(["submit-message", "regenerate-message"]).optional(),
    messageId: z.string().max(100).optional(),
  })
  .strict()

export const evidenceSourceSchema = z.object({
  /** Turn-local label used in the answer, e.g. "S1". */
  ref: z.string().regex(/^S\d{1,2}$/),
  chunkId: z.uuid(),
  sourceTitle: z.string(),
  documentTitle: z.string(),
  sourceType: z.string(),
  sourceUrl: z.string().nullable(),
  legalReference: z.string().nullable(),
  sectionIdentifier: z.string().nullable(),
  headingPath: z.string().nullable(),
  pageNumber: z.number().nullable(),
  pageEnd: z.number().nullable(),
  validFrom: z.string().nullable(),
  validTo: z.string().nullable(),
  /** Excerpt, or null when the source may only be cited (CITATION_ONLY). */
  quote: z.string().nullable(),
  citationOnly: z.boolean(),
  relevance: z.number(),
  /** The passage contains instruction-like text and was neutralised. */
  flagged: z.boolean(),
})

export const groundingReportSchema = z.object({
  status: z.enum(["OK", "WARN"]),
  citedRefs: z.array(z.string()),
  invalidRefs: z.array(z.string()),
  unverifiedNumbers: z.array(z.string()),
  uncitedLegalClaims: z.boolean(),
  eligibilityClaimWithoutTool: z.boolean(),
  notes: z.array(z.string()),
})

export const assistantMetadataSchema = z.object({
  conversationId: z.uuid().optional(),
  createdAt: z.string().optional(),
  mode: z.enum(["llm", "rules"]).optional(),
  model: z.string().optional(),
  profileUsed: z.boolean().optional(),
  simulated: z.literal(true).optional(),
})

export const assistantDataSchemas = {
  evidence: z.object({ sources: z.array(evidenceSourceSchema) }),
  grounding: groundingReportSchema,
  followups: z.object({ questions: z.array(z.string().max(200)).max(4) }),
}

/** Flat citation shape returned by the REST endpoint. */
export const assistantCitationSchema = z.object({
  chunkId: z.uuid(),
  sourceTitle: z.string(),
  sourceUrl: z.string().nullable(),
  legalReference: z.string().nullable(),
  sectionIdentifier: z.string().nullable(),
  quote: z.string(),
  score: z.number(),
})

export const assistantReplySchema = z.object({
  conversationId: z.uuid(),
  messageId: z.string(),
  content: z.string(),
  citations: z.array(assistantCitationSchema),
  sources: z.array(evidenceSourceSchema),
  toolCalls: z.array(
    z.object({
      toolName: z.string(),
      input: z.unknown(),
      output: z.unknown(),
      status: z.enum(["SUCCEEDED", "FAILED"]),
    })
  ),
  grounding: groundingReportSchema.nullable(),
  followUpQuestions: z.array(z.string()),
  mode: z.enum(["llm", "rules"]),
  simulated: z.literal(true),
  aiDisclosure: z.string(),
})

export type AssistantChatInput = z.infer<typeof assistantChatSchema>
export type AssistantStreamRequest = z.infer<
  typeof assistantStreamRequestSchema
>
export type AssistantOptions = z.infer<typeof assistantOptionsSchema>
export type AssistantCitation = z.infer<typeof assistantCitationSchema>
export type AssistantReply = z.infer<typeof assistantReplySchema>
export type EvidenceSource = z.infer<typeof evidenceSourceSchema>
export type GroundingReport = z.infer<typeof groundingReportSchema>
export type AssistantMetadata = z.infer<typeof assistantMetadataSchema>
