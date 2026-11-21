import { z } from "zod"

/**
 * Content model for Centrum wiedzy.
 *
 * Editorial content is stored in the database (schema `kb`) and rendered by the
 * web app. The shapes below are shared by the seed, repositories and UI so that
 * an editor can update a record without touching application code.
 */

export const contentStatusSchema = z.enum([
  "DRAFT",
  "IN_REVIEW",
  "PUBLISHED",
  "ARCHIVED",
])
export type ContentStatus = z.infer<typeof contentStatusSchema>

export const contentItemTypeSchema = z.enum([
  "ARTICLE",
  "FAQ",
  "DOCUMENT",
  "GUIDE",
  "GLOSSARY",
])
export type ContentItemType = z.infer<typeof contentItemTypeSchema>

export const contentSourceKindSchema = z.enum([
  "LEGAL_ACT",
  "OFFICIAL_GUIDANCE",
  "OFFICIAL_FORM",
  "GOVERNMENT_PAGE",
  "EDITORIAL",
  "OTHER",
])
export type ContentSourceKind = z.infer<typeof contentSourceKindSchema>

export const documentKindSchema = z.enum([
  "FORM",
  "CERTIFICATE",
  "ATTACHMENT",
  "DEMO",
])
export type DocumentKind = z.infer<typeof documentKindSchema>

/** A content section. Blocks are rendered by the knowledge UI, never as HTML. */
export const knowledgeBlockSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("paragraph"), text: z.string().min(1) }),
  z.object({ kind: z.literal("heading"), text: z.string().min(1) }),
  z.object({
    kind: z.literal("list"),
    items: z.array(z.string().min(1)).min(1),
    ordered: z.boolean().optional(),
  }),
  z.object({
    kind: z.literal("callout"),
    tone: z.enum(["info", "warning", "important"]),
    title: z.string().optional(),
    text: z.string().min(1),
  }),
  z.object({
    kind: z.literal("table"),
    caption: z.string().optional(),
    headers: z.array(z.string().min(1)).min(1),
    rows: z.array(z.array(z.string())).min(1),
  }),
])
export type KnowledgeBlock = z.infer<typeof knowledgeBlockSchema>

export const knowledgeKeyPointSchema = z.object({
  label: z.string().min(1),
  value: z.string().min(1),
})
export type KnowledgeKeyPoint = z.infer<typeof knowledgeKeyPointSchema>

export const guideStepSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  tip: z.string().optional(),
})
export type GuideStep = z.infer<typeof guideStepSchema>

export const guideProblemSchema = z.object({
  problem: z.string().min(1),
  solution: z.string().min(1),
})
export type GuideProblem = z.infer<typeof guideProblemSchema>

export const guideDocumentRefSchema = z.object({
  label: z.string().min(1),
  /** Slug of a document in the knowledge base, if the document is described. */
  slug: z.string().optional(),
})
export type GuideDocumentRef = z.infer<typeof guideDocumentRefSchema>

/** A short, related-content link shown next to an article or guide. */
export interface KnowledgeRelatedLink {
  type: ContentItemType
  title: string
  href: string
  summary?: string
}

export const CONTENT_STATUS_LABELS: Record<ContentStatus, string> = {
  DRAFT: "Szkic",
  IN_REVIEW: "W weryfikacji",
  PUBLISHED: "Opublikowany",
  ARCHIVED: "Zarchiwizowany",
}

export const CONTENT_TYPE_LABELS: Record<ContentItemType, string> = {
  ARTICLE: "Artykuł",
  FAQ: "Pytanie i odpowiedź",
  DOCUMENT: "Dokument",
  GUIDE: "Przewodnik",
  GLOSSARY: "Pojęcie",
}

export const CONTENT_SOURCE_KIND_LABELS: Record<ContentSourceKind, string> = {
  LEGAL_ACT: "Akt prawny",
  OFFICIAL_GUIDANCE: "Materiał urzędowy",
  OFFICIAL_FORM: "Oficjalny formularz",
  GOVERNMENT_PAGE: "Serwis publiczny",
  EDITORIAL: "Opracowanie redakcyjne",
  OTHER: "Inne źródło",
}

export const DOCUMENT_KIND_LABELS: Record<DocumentKind, string> = {
  FORM: "Formularz",
  CERTIFICATE: "Zaświadczenie",
  ATTACHMENT: "Załącznik",
  DEMO: "Materiał demonstracyjny",
}
