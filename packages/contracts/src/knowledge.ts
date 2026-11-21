import { z } from "zod"

export const knowledgeSearchSchema = z.object({
  q: z
    .string()
    .trim()
    .min(2, "Zapytanie musi mieć co najmniej 2 znaki")
    .max(500),
  limit: z.coerce.number().int().min(1).max(20).default(6),
  model: z.string().trim().optional(),
  asOf: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
})

export const knowledgeChunkResultSchema = z.object({
  id: z.uuid(),
  documentId: z.uuid(),
  content: z.string(),
  sourceTitle: z.string(),
  sourceUrl: z.string().nullable(),
  sourceType: z.string(),
  pageNumber: z.number().nullable(),
  sectionIdentifier: z.string().nullable(),
  legalReference: z.string().nullable(),
  validFrom: z.string().nullable(),
  validTo: z.string().nullable(),
  score: z.number(),
  lexicalScore: z.number().optional(),
  vectorScore: z.number().optional(),
})

export type KnowledgeSearchInput = z.infer<typeof knowledgeSearchSchema>
export type KnowledgeChunkResult = z.infer<typeof knowledgeChunkResultSchema>
