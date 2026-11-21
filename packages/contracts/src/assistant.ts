import { z } from "zod"

export const assistantChatSchema = z.object({
  message: z
    .string()
    .trim()
    .min(2, "Wiadomość jest zbyt krótka")
    .max(4000, "Wiadomość jest zbyt długa"),
  conversationId: z.uuid().optional(),
  asOf: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
})

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
  messageId: z.uuid(),
  content: z.string(),
  citations: z.array(assistantCitationSchema),
  simulated: z.literal(true),
  aiDisclosure: z.string(),
})

export type AssistantChatInput = z.infer<typeof assistantChatSchema>
export type AssistantCitation = z.infer<typeof assistantCitationSchema>
export type AssistantReply = z.infer<typeof assistantReplySchema>
