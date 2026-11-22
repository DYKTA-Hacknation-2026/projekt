import { and, asc, desc, eq, inArray, or, sql } from "drizzle-orm"

import type { ContentItemType } from "@zpr/contracts/content"

import type { Database } from "../client"
import {
  contentArticleLegalReferences,
  contentArticles,
  contentArticleSources,
  contentCategories,
  contentDocuments,
  contentFaqItems,
  contentGlossaryTerms,
  contentGuides,
  contentLegalReferences,
  contentRelations,
  contentSources,
} from "../schema"

/* -------------------------------------------------------------------------- */
/* Read models                                                                */
/* -------------------------------------------------------------------------- */

export type ContentCategoryRecord = typeof contentCategories.$inferSelect
export type ContentArticleRecord = typeof contentArticles.$inferSelect
export type ContentFaqRecord = typeof contentFaqItems.$inferSelect
export type ContentDocumentRecord = typeof contentDocuments.$inferSelect
export type ContentGuideRecord = typeof contentGuides.$inferSelect
export type ContentGlossaryRecord = typeof contentGlossaryTerms.$inferSelect
export type ContentSourceRecord = typeof contentSources.$inferSelect
export type ContentLegalReferenceRecord =
  typeof contentLegalReferences.$inferSelect

export interface CategorySummary extends ContentCategoryRecord {
  articleCount: number
  faqCount: number
  guideCount: number
  documentCount: number
  glossaryCount: number
}

export interface ArticleSummary {
  id: string
  slug: string
  title: string
  summary: string
  readingMinutes: number
  isFeatured: boolean
  popularity: number
  lastReviewedAt: string
  publishedAt: string | null
  updatedAt: Date
  categorySlug: string
  categoryTitle: string
  categoryIcon: string
}

export interface ArticleSourceLink {
  id: string
  slug: string
  title: string
  publisher: string
  kind: ContentSourceRecord["kind"]
  url: string | null
  description: string | null
  accessedAt: string | null
  lastVerifiedAt: string
  locator: string | null
  isPrimary: boolean
}

export interface ArticleLegalLink {
  id: string
  citation: string
  title: string
  actTitle: string
  url: string | null
  effectiveFrom: string | null
  notes: string | null
  locator: string | null
}

export interface RelatedContentItem {
  type: ContentItemType
  id: string
  slug: string
  title: string
  summary: string
  label: string | null
}

export interface FaqSummary {
  id: string
  slug: string
  question: string
  shortAnswer: string
  explanation: string
  conditions: string | null
  whatToDo: string | null
  isImportant: boolean
  popularity: number
  calculatorHref: string | null
  guideHref: string | null
  lastReviewedAt: string
  categorySlug: string
  categoryTitle: string
  articleSlug: string | null
  articleTitle: string | null
  sourceUrl: string | null
  sourceTitle: string | null
}

export interface DocumentSummary {
  id: string
  slug: string
  code: string | null
  name: string
  kind: ContentDocumentRecord["kind"]
  purpose: string
  lastReviewedAt: string
  sortOrder: number
  categorySlug: string
  categoryTitle: string
}

export interface GuideSummary {
  id: string
  slug: string
  title: string
  summary: string
  audience: string
  lastReviewedAt: string
  sortOrder: number
  categorySlug: string
  categoryTitle: string
}

export interface GlossarySummary {
  id: string
  slug: string
  term: string
  letter: string
  definition: string
  lastReviewedAt: string
}

export interface SearchHit {
  type: ContentItemType
  slug: string
  title: string
  snippet: string
  score: number
  updatedAt: Date
}

export interface RecentContentItem {
  type: ContentItemType
  slug: string
  title: string
  summary: string
  updatedAt: Date
}

export interface ContentStats {
  categories: number
  articles: number
  faq: number
  documents: number
  guides: number
  glossary: number
  sources: number
  reviewOverdue: number
}

export interface AdminContentRow {
  type: ContentItemType
  slug: string
  title: string
  status: ContentArticleRecord["status"]
  lastReviewedAt: string
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

/** Lower-cases and removes Polish diacritics for accent-insensitive search. */
export function normalizeSearchQuery(value: string): string {
  return value
    .toLocaleLowerCase("pl")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ł/g, "l")
    .trim()
}

/**
 * SQL mirror of `normalizeSearchQuery` for a text column. The translate()
 * mapping keeps the query index-free but reliable on a small editorial corpus.
 */
function normalizedContains(column: unknown, needle: string) {
  const pattern = `%${needle.replace(/[%_\\]/g, "")}%`
  return sql`translate(lower(${column}), 'ąćęłńóśźż', 'acelnoszz') like ${pattern}`
}

function countByCategory(
  rows: Array<{ categoryId: string; value: number }>
): Map<string, number> {
  return new Map(rows.map((row) => [row.categoryId, row.value]))
}

/* -------------------------------------------------------------------------- */
/* Repository                                                                 */
/* -------------------------------------------------------------------------- */

export class DrizzleContentRepository {
  constructor(private readonly db: Database) {}

  async listCategories(): Promise<CategorySummary[]> {
    const categories = await this.db
      .select()
      .from(contentCategories)
      .where(eq(contentCategories.status, "PUBLISHED"))
      .orderBy(asc(contentCategories.sortOrder), asc(contentCategories.title))

    const [articleRows, faqRows, guideRows, documentRows, glossaryRow] =
      await Promise.all([
      this.db
        .select({
          categoryId: contentArticles.categoryId,
          value: sql<number>`count(*)::int`,
        })
        .from(contentArticles)
        .where(eq(contentArticles.status, "PUBLISHED"))
        .groupBy(contentArticles.categoryId),
      this.db
        .select({
          categoryId: contentFaqItems.categoryId,
          value: sql<number>`count(*)::int`,
        })
        .from(contentFaqItems)
        .where(eq(contentFaqItems.status, "PUBLISHED"))
        .groupBy(contentFaqItems.categoryId),
      this.db
        .select({
          categoryId: contentGuides.categoryId,
          value: sql<number>`count(*)::int`,
        })
        .from(contentGuides)
        .where(eq(contentGuides.status, "PUBLISHED"))
        .groupBy(contentGuides.categoryId),
      this.db
        .select({
          categoryId: contentDocuments.categoryId,
          value: sql<number>`count(*)::int`,
        })
        .from(contentDocuments)
        .where(eq(contentDocuments.status, "PUBLISHED"))
        .groupBy(contentDocuments.categoryId),
      this.db
        .select({ value: sql<number>`count(*)::int` })
        .from(contentGlossaryTerms)
        .where(eq(contentGlossaryTerms.status, "PUBLISHED")),
    ])

    const articles = countByCategory(articleRows)
    const faq = countByCategory(faqRows)
    const guides = countByCategory(guideRows)
    const documents = countByCategory(documentRows)
    const glossaryCount = glossaryRow[0]?.value ?? 0

    return categories.map((category) => ({
      ...category,
      articleCount: articles.get(category.id) ?? 0,
      faqCount: faq.get(category.id) ?? 0,
      guideCount: guides.get(category.id) ?? 0,
      documentCount: documents.get(category.id) ?? 0,
      glossaryCount:
        category.slug === "pojecia-i-definicje" ? glossaryCount : 0,
    }))
  }

  async getCategoryBySlug(slug: string): Promise<CategorySummary | null> {
    const categories = await this.listCategories()
    return categories.find((category) => category.slug === slug) ?? null
  }

  async listArticles(options?: {
    categorySlug?: string
    limit?: number
    featuredOnly?: boolean
  }): Promise<ArticleSummary[]> {
    const conditions = [eq(contentArticles.status, "PUBLISHED")]
    if (options?.categorySlug) {
      conditions.push(eq(contentCategories.slug, options.categorySlug))
    }
    if (options?.featuredOnly) {
      conditions.push(eq(contentArticles.isFeatured, true))
    }

    const query = this.db
      .select({
        id: contentArticles.id,
        slug: contentArticles.slug,
        title: contentArticles.title,
        summary: contentArticles.summary,
        readingMinutes: contentArticles.readingMinutes,
        isFeatured: contentArticles.isFeatured,
        popularity: contentArticles.popularity,
        lastReviewedAt: contentArticles.lastReviewedAt,
        publishedAt: contentArticles.publishedAt,
        updatedAt: contentArticles.updatedAt,
        categorySlug: contentCategories.slug,
        categoryTitle: contentCategories.title,
        categoryIcon: contentCategories.icon,
      })
      .from(contentArticles)
      .innerJoin(
        contentCategories,
        eq(contentCategories.id, contentArticles.categoryId)
      )
      .where(and(...conditions))
      .orderBy(
        desc(contentArticles.isFeatured),
        desc(contentArticles.popularity),
        desc(contentArticles.updatedAt)
      )

    if (options?.limit) return query.limit(options.limit)
    return query
  }

  async getArticleBySlug(slug: string): Promise<{
    article: ContentArticleRecord
    category: ContentCategoryRecord
    sources: ArticleSourceLink[]
    legalReferences: ArticleLegalLink[]
    faq: FaqSummary[]
    related: RelatedContentItem[]
  } | null> {
    const [row] = await this.db
      .select({
        article: contentArticles,
        category: contentCategories,
      })
      .from(contentArticles)
      .innerJoin(
        contentCategories,
        eq(contentCategories.id, contentArticles.categoryId)
      )
      .where(
        and(
          eq(contentArticles.slug, slug),
          eq(contentArticles.status, "PUBLISHED")
        )
      )
      .limit(1)

    if (!row) return null

    const [sources, legalReferences, faq, related] = await Promise.all([
      this.db
        .select({
          id: contentSources.id,
          slug: contentSources.slug,
          title: contentSources.title,
          publisher: contentSources.publisher,
          kind: contentSources.kind,
          url: contentSources.url,
          description: contentSources.description,
          accessedAt: contentSources.accessedAt,
          lastVerifiedAt: contentSources.lastVerifiedAt,
          locator: contentArticleSources.locator,
          isPrimary: contentArticleSources.isPrimary,
        })
        .from(contentArticleSources)
        .innerJoin(
          contentSources,
          eq(contentSources.id, contentArticleSources.sourceId)
        )
        .where(eq(contentArticleSources.articleId, row.article.id))
        .orderBy(
          desc(contentArticleSources.isPrimary),
          asc(contentSources.publisher)
        ),
      this.db
        .select({
          id: contentLegalReferences.id,
          citation: contentLegalReferences.citation,
          title: contentLegalReferences.title,
          actTitle: contentLegalReferences.actTitle,
          url: contentLegalReferences.url,
          effectiveFrom: contentLegalReferences.effectiveFrom,
          notes: contentLegalReferences.notes,
          locator: contentArticleLegalReferences.locator,
        })
        .from(contentArticleLegalReferences)
        .innerJoin(
          contentLegalReferences,
          eq(
            contentLegalReferences.id,
            contentArticleLegalReferences.legalReferenceId
          )
        )
        .where(eq(contentArticleLegalReferences.articleId, row.article.id))
        .orderBy(asc(contentLegalReferences.citation)),
      this.listFaq({ articleId: row.article.id }),
      this.getRelated("ARTICLE", row.article.id),
    ])

    return {
      article: row.article,
      category: row.category,
      sources,
      legalReferences,
      faq,
      related,
    }
  }

  async listFaq(options?: {
    categorySlug?: string
    articleId?: string
    query?: string
    limit?: number
  }): Promise<FaqSummary[]> {
    const conditions = [eq(contentFaqItems.status, "PUBLISHED")]
    if (options?.categorySlug) {
      conditions.push(eq(contentCategories.slug, options.categorySlug))
    }
    if (options?.articleId) {
      conditions.push(eq(contentFaqItems.articleId, options.articleId))
    }
    if (options?.query?.trim()) {
      const needle = normalizeSearchQuery(options.query)
      conditions.push(
        or(
          normalizedContains(contentFaqItems.question, needle),
          normalizedContains(contentFaqItems.shortAnswer, needle),
          normalizedContains(contentFaqItems.explanation, needle)
        )!
      )
    }

    const query = this.db
      .select({
        id: contentFaqItems.id,
        slug: contentFaqItems.slug,
        question: contentFaqItems.question,
        shortAnswer: contentFaqItems.shortAnswer,
        explanation: contentFaqItems.explanation,
        conditions: contentFaqItems.conditions,
        whatToDo: contentFaqItems.whatToDo,
        isImportant: contentFaqItems.isImportant,
        popularity: contentFaqItems.popularity,
        calculatorHref: contentFaqItems.calculatorHref,
        guideHref: contentFaqItems.guideHref,
        lastReviewedAt: contentFaqItems.lastReviewedAt,
        categorySlug: contentCategories.slug,
        categoryTitle: contentCategories.title,
        articleSlug: contentArticles.slug,
        articleTitle: contentArticles.title,
        sourceUrl: sql<string | null>`(
          select cs.url
          from kb.content_article_sources cas
          join kb.content_sources cs on cs.id = cas.source_id
          where cas.article_id = ${contentFaqItems.articleId}
            and exists (
              select 1 from kb.content_articles a
              where a.id = cas.article_id and a.status = 'PUBLISHED'
            )
          order by cas.is_primary desc, cs.title asc
          limit 1
        )`,
        sourceTitle: sql<string | null>`(
          select cs.title
          from kb.content_article_sources cas
          join kb.content_sources cs on cs.id = cas.source_id
          where cas.article_id = ${contentFaqItems.articleId}
            and exists (
              select 1 from kb.content_articles a
              where a.id = cas.article_id and a.status = 'PUBLISHED'
            )
          order by cas.is_primary desc, cs.title asc
          limit 1
        )`,
      })
      .from(contentFaqItems)
      .innerJoin(
        contentCategories,
        eq(contentCategories.id, contentFaqItems.categoryId)
      )
      .leftJoin(
        contentArticles,
        and(
          eq(contentArticles.id, contentFaqItems.articleId),
          eq(contentArticles.status, "PUBLISHED")
        )
      )
      .where(and(...conditions))
      .orderBy(
        desc(contentFaqItems.isImportant),
        desc(contentFaqItems.popularity),
        asc(contentFaqItems.question)
      )

    if (options?.limit) return query.limit(options.limit)
    return query
  }

  async listDocuments(options?: {
    categorySlug?: string
    limit?: number
  }): Promise<DocumentSummary[]> {
    const conditions = [eq(contentDocuments.status, "PUBLISHED")]
    if (options?.categorySlug) {
      conditions.push(eq(contentCategories.slug, options.categorySlug))
    }

    const query = this.db
      .select({
        id: contentDocuments.id,
        slug: contentDocuments.slug,
        code: contentDocuments.code,
        name: contentDocuments.name,
        kind: contentDocuments.kind,
        purpose: contentDocuments.purpose,
        lastReviewedAt: contentDocuments.lastReviewedAt,
        sortOrder: contentDocuments.sortOrder,
        categorySlug: contentCategories.slug,
        categoryTitle: contentCategories.title,
      })
      .from(contentDocuments)
      .innerJoin(
        contentCategories,
        eq(contentCategories.id, contentDocuments.categoryId)
      )
      .where(and(...conditions))
      .orderBy(asc(contentDocuments.sortOrder), asc(contentDocuments.name))

    if (options?.limit) return query.limit(options.limit)
    return query
  }

  async getDocumentBySlug(slug: string): Promise<{
    document: ContentDocumentRecord
    category: ContentCategoryRecord
    related: RelatedContentItem[]
  } | null> {
    const [row] = await this.db
      .select({
        document: contentDocuments,
        category: contentCategories,
      })
      .from(contentDocuments)
      .innerJoin(
        contentCategories,
        eq(contentCategories.id, contentDocuments.categoryId)
      )
      .where(
        and(
          eq(contentDocuments.slug, slug),
          eq(contentDocuments.status, "PUBLISHED")
        )
      )
      .limit(1)
    if (!row) return null

    return {
      document: row.document,
      category: row.category,
      related: await this.getRelated("DOCUMENT", row.document.id),
    }
  }

  async listGuides(options?: {
    categorySlug?: string
    limit?: number
  }): Promise<GuideSummary[]> {
    const conditions = [eq(contentGuides.status, "PUBLISHED")]
    if (options?.categorySlug) {
      conditions.push(eq(contentCategories.slug, options.categorySlug))
    }

    const query = this.db
      .select({
        id: contentGuides.id,
        slug: contentGuides.slug,
        title: contentGuides.title,
        summary: contentGuides.summary,
        audience: contentGuides.audience,
        lastReviewedAt: contentGuides.lastReviewedAt,
        sortOrder: contentGuides.sortOrder,
        categorySlug: contentCategories.slug,
        categoryTitle: contentCategories.title,
      })
      .from(contentGuides)
      .innerJoin(
        contentCategories,
        eq(contentCategories.id, contentGuides.categoryId)
      )
      .where(and(...conditions))
      .orderBy(asc(contentGuides.sortOrder), asc(contentGuides.title))

    if (options?.limit) return query.limit(options.limit)
    return query
  }

  async getGuideBySlug(slug: string): Promise<{
    guide: ContentGuideRecord
    category: ContentCategoryRecord
    related: RelatedContentItem[]
  } | null> {
    const [row] = await this.db
      .select({
        guide: contentGuides,
        category: contentCategories,
      })
      .from(contentGuides)
      .innerJoin(
        contentCategories,
        eq(contentCategories.id, contentGuides.categoryId)
      )
      .where(
        and(
          eq(contentGuides.slug, slug),
          eq(contentGuides.status, "PUBLISHED")
        )
      )
      .limit(1)
    if (!row) return null

    return {
      guide: row.guide,
      category: row.category,
      related: await this.getRelated("GUIDE", row.guide.id),
    }
  }

  async listGlossary(options?: {
    letter?: string
    query?: string
  }): Promise<GlossarySummary[]> {
    const conditions = [eq(contentGlossaryTerms.status, "PUBLISHED")]
    if (options?.letter && /^[A-ZĄĆĘŁŃÓŚŹŻ]$/.test(options.letter)) {
      conditions.push(eq(contentGlossaryTerms.letter, options.letter))
    }
    if (options?.query?.trim()) {
      const needle = normalizeSearchQuery(options.query)
      conditions.push(
        or(
          normalizedContains(contentGlossaryTerms.term, needle),
          normalizedContains(contentGlossaryTerms.definition, needle),
          normalizedContains(contentGlossaryTerms.explanation, needle)
        )!
      )
    }

    return this.db
      .select({
        id: contentGlossaryTerms.id,
        slug: contentGlossaryTerms.slug,
        term: contentGlossaryTerms.term,
        letter: contentGlossaryTerms.letter,
        definition: contentGlossaryTerms.definition,
        lastReviewedAt: contentGlossaryTerms.lastReviewedAt,
      })
      .from(contentGlossaryTerms)
      .where(and(...conditions))
      .orderBy(asc(contentGlossaryTerms.term))
  }

  async getGlossaryBySlug(slug: string): Promise<{
    term: ContentGlossaryRecord
    related: RelatedContentItem[]
  } | null> {
    const [row] = await this.db
      .select()
      .from(contentGlossaryTerms)
      .where(
        and(
          eq(contentGlossaryTerms.slug, slug),
          eq(contentGlossaryTerms.status, "PUBLISHED")
        )
      )
      .limit(1)
    if (!row) return null

    return {
      term: row,
      related: await this.getRelated("GLOSSARY", row.id),
    }
  }

  async listSources(): Promise<ContentSourceRecord[]> {
    return this.db
      .select()
      .from(contentSources)
      .orderBy(asc(contentSources.publisher), asc(contentSources.title))
  }

  async getRelated(
    type: ContentItemType,
    id: string
  ): Promise<RelatedContentItem[]> {
    const links = await this.db
      .select()
      .from(contentRelations)
      .where(
        or(
          and(
            eq(contentRelations.fromType, type),
            eq(contentRelations.fromId, id)
          ),
          and(
            eq(contentRelations.toType, type),
            eq(contentRelations.toId, id)
          )
        )
      )
      .orderBy(asc(contentRelations.sortOrder))

    if (links.length === 0) return []

    const wanted = new Map<ContentItemType, Set<string>>()
    const labels = new Map<string, string | null>()
    for (const link of links) {
      const isFrom = link.fromType === type && link.fromId === id
      const targetType = isFrom ? link.toType : link.fromType
      const targetId = isFrom ? link.toId : link.fromId
      const bucket = wanted.get(targetType) ?? new Set<string>()
      bucket.add(targetId)
      wanted.set(targetType, bucket)
      labels.set(`${targetType}:${targetId}`, link.label)
    }

    const items = new Map<string, Omit<RelatedContentItem, "label">>()
    for (const [targetType, ids] of wanted) {
      const rows = await this.fetchPreview(targetType, [...ids])
      for (const row of rows) items.set(`${targetType}:${row.id}`, row)
    }

    return [...items.values()].map((item) => ({
      ...item,
      label: labels.get(`${item.type}:${item.id}`) ?? null,
    }))
  }

  private async fetchPreview(
    type: ContentItemType,
    ids: string[]
  ): Promise<Array<Omit<RelatedContentItem, "label">>> {
    if (ids.length === 0) return []

    if (type === "ARTICLE") {
      const rows = await this.db
        .select({
          id: contentArticles.id,
          slug: contentArticles.slug,
          title: contentArticles.title,
          summary: contentArticles.summary,
        })
        .from(contentArticles)
        .where(
          and(
            inArray(contentArticles.id, ids),
            eq(contentArticles.status, "PUBLISHED")
          )
        )
      return rows.map((row) => ({ ...row, type }))
    }

    if (type === "FAQ") {
      const rows = await this.db
        .select({
          id: contentFaqItems.id,
          slug: contentFaqItems.slug,
          title: contentFaqItems.question,
          summary: contentFaqItems.shortAnswer,
        })
        .from(contentFaqItems)
        .where(
          and(
            inArray(contentFaqItems.id, ids),
            eq(contentFaqItems.status, "PUBLISHED")
          )
        )
      return rows.map((row) => ({ ...row, type }))
    }

    if (type === "DOCUMENT") {
      const rows = await this.db
        .select({
          id: contentDocuments.id,
          slug: contentDocuments.slug,
          title: contentDocuments.name,
          summary: contentDocuments.purpose,
        })
        .from(contentDocuments)
        .where(
          and(
            inArray(contentDocuments.id, ids),
            eq(contentDocuments.status, "PUBLISHED")
          )
        )
      return rows.map((row) => ({ ...row, type }))
    }

    if (type === "GUIDE") {
      const rows = await this.db
        .select({
          id: contentGuides.id,
          slug: contentGuides.slug,
          title: contentGuides.title,
          summary: contentGuides.summary,
        })
        .from(contentGuides)
        .where(
          and(
            inArray(contentGuides.id, ids),
            eq(contentGuides.status, "PUBLISHED")
          )
        )
      return rows.map((row) => ({ ...row, type }))
    }

    const rows = await this.db
      .select({
        id: contentGlossaryTerms.id,
        slug: contentGlossaryTerms.slug,
        title: contentGlossaryTerms.term,
        summary: contentGlossaryTerms.definition,
      })
      .from(contentGlossaryTerms)
      .where(
        and(
          inArray(contentGlossaryTerms.id, ids),
          eq(contentGlossaryTerms.status, "PUBLISHED")
        )
      )
    return rows.map((row) => ({ ...row, type }))
  }

  async searchContent(query: string, limit = 20): Promise<SearchHit[]> {
    const needle = normalizeSearchQuery(query)
    if (needle.length < 2) return []

    const perTypeLimit = Math.max(limit, 10)
    const [articles, faq, documents, guides, glossary] = await Promise.all([
      this.db
        .select({
          type: sql<"ARTICLE">`'ARTICLE'`,
          slug: contentArticles.slug,
          title: contentArticles.title,
          snippet: contentArticles.summary,
          updatedAt: contentArticles.updatedAt,
        })
        .from(contentArticles)
        .where(
          and(
            eq(contentArticles.status, "PUBLISHED"),
            or(
              normalizedContains(contentArticles.title, needle),
              normalizedContains(contentArticles.summary, needle),
              normalizedContains(sql`(${contentArticles.blocks})::text`, needle)
            )!
          )
        )
        .limit(perTypeLimit),
      this.db
        .select({
          type: sql<"FAQ">`'FAQ'`,
          slug: contentFaqItems.slug,
          title: contentFaqItems.question,
          snippet: contentFaqItems.shortAnswer,
          updatedAt: contentFaqItems.updatedAt,
        })
        .from(contentFaqItems)
        .where(
          and(
            eq(contentFaqItems.status, "PUBLISHED"),
            or(
              normalizedContains(contentFaqItems.question, needle),
              normalizedContains(contentFaqItems.shortAnswer, needle),
              normalizedContains(contentFaqItems.explanation, needle)
            )!
          )
        )
        .limit(perTypeLimit),
      this.db
        .select({
          type: sql<"DOCUMENT">`'DOCUMENT'`,
          slug: contentDocuments.slug,
          title: contentDocuments.name,
          snippet: sql<string>`coalesce(${contentDocuments.code} || ' — ', '') || ${contentDocuments.purpose}`,
          updatedAt: contentDocuments.updatedAt,
        })
        .from(contentDocuments)
        .where(
          and(
            eq(contentDocuments.status, "PUBLISHED"),
            or(
              normalizedContains(contentDocuments.name, needle),
              normalizedContains(contentDocuments.code, needle),
              normalizedContains(contentDocuments.purpose, needle),
              normalizedContains(contentDocuments.whenRequired, needle)
            )!
          )
        )
        .limit(perTypeLimit),
      this.db
        .select({
          type: sql<"GUIDE">`'GUIDE'`,
          slug: contentGuides.slug,
          title: contentGuides.title,
          snippet: contentGuides.summary,
          updatedAt: contentGuides.updatedAt,
        })
        .from(contentGuides)
        .where(
          and(
            eq(contentGuides.status, "PUBLISHED"),
            or(
              normalizedContains(contentGuides.title, needle),
              normalizedContains(contentGuides.summary, needle),
              normalizedContains(contentGuides.audience, needle)
            )!
          )
        )
        .limit(perTypeLimit),
      this.db
        .select({
          type: sql<"GLOSSARY">`'GLOSSARY'`,
          slug: contentGlossaryTerms.slug,
          title: contentGlossaryTerms.term,
          snippet: contentGlossaryTerms.definition,
          updatedAt: contentGlossaryTerms.updatedAt,
        })
        .from(contentGlossaryTerms)
        .where(
          and(
            eq(contentGlossaryTerms.status, "PUBLISHED"),
            or(
              normalizedContains(contentGlossaryTerms.term, needle),
              normalizedContains(contentGlossaryTerms.definition, needle),
              normalizedContains(contentGlossaryTerms.explanation, needle)
            )!
          )
        )
        .limit(perTypeLimit),
    ])

    const hits = [...articles, ...faq, ...documents, ...guides, ...glossary]
    return hits
      .map((hit) => {
        const title = normalizeSearchQuery(hit.title)
        let score = 40
        if (title === needle) score = 100
        else if (title.startsWith(needle)) score = 90
        else if (title.includes(needle)) score = 80
        else if (normalizeSearchQuery(hit.snippet).includes(needle)) score = 60
        return { ...hit, score }
      })
      .sort(
        (a, b) =>
          b.score - a.score || b.updatedAt.getTime() - a.updatedAt.getTime()
      )
      .slice(0, limit)
  }

  async listRecentlyUpdated(limit = 6): Promise<RecentContentItem[]> {
    const [articles, faq, documents, guides] = await Promise.all([
      this.db
        .select({
          type: sql<"ARTICLE">`'ARTICLE'`,
          slug: contentArticles.slug,
          title: contentArticles.title,
          summary: contentArticles.summary,
          updatedAt: contentArticles.updatedAt,
        })
        .from(contentArticles)
        .where(eq(contentArticles.status, "PUBLISHED"))
        .orderBy(desc(contentArticles.updatedAt))
        .limit(limit),
      this.db
        .select({
          type: sql<"FAQ">`'FAQ'`,
          slug: contentFaqItems.slug,
          title: contentFaqItems.question,
          summary: contentFaqItems.shortAnswer,
          updatedAt: contentFaqItems.updatedAt,
        })
        .from(contentFaqItems)
        .where(eq(contentFaqItems.status, "PUBLISHED"))
        .orderBy(desc(contentFaqItems.updatedAt))
        .limit(limit),
      this.db
        .select({
          type: sql<"DOCUMENT">`'DOCUMENT'`,
          slug: contentDocuments.slug,
          title: contentDocuments.name,
          summary: contentDocuments.purpose,
          updatedAt: contentDocuments.updatedAt,
        })
        .from(contentDocuments)
        .where(eq(contentDocuments.status, "PUBLISHED"))
        .orderBy(desc(contentDocuments.updatedAt))
        .limit(limit),
      this.db
        .select({
          type: sql<"GUIDE">`'GUIDE'`,
          slug: contentGuides.slug,
          title: contentGuides.title,
          summary: contentGuides.summary,
          updatedAt: contentGuides.updatedAt,
        })
        .from(contentGuides)
        .where(eq(contentGuides.status, "PUBLISHED"))
        .orderBy(desc(contentGuides.updatedAt))
        .limit(limit),
    ])

    return [...articles, ...faq, ...documents, ...guides]
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
      .slice(0, limit)
  }

  async getContentStats(): Promise<ContentStats> {
    const [counts] = await this.db
      .select({
        categories: sql<number>`(select count(*)::int from ${contentCategories})`,
        articles: sql<number>`(select count(*)::int from ${contentArticles} where ${contentArticles.status} = 'PUBLISHED')`,
        faq: sql<number>`(select count(*)::int from ${contentFaqItems} where ${contentFaqItems.status} = 'PUBLISHED')`,
        documents: sql<number>`(select count(*)::int from ${contentDocuments} where ${contentDocuments.status} = 'PUBLISHED')`,
        guides: sql<number>`(select count(*)::int from ${contentGuides} where ${contentGuides.status} = 'PUBLISHED')`,
        glossary: sql<number>`(select count(*)::int from ${contentGlossaryTerms} where ${contentGlossaryTerms.status} = 'PUBLISHED')`,
        sources: sql<number>`(select count(*)::int from ${contentSources})`,
        reviewOverdue: sql<number>`(
          select count(*)::int from ${contentArticles}
          where ${contentArticles.status} = 'PUBLISHED'
            and ${contentArticles.lastReviewedAt} < current_date - interval '180 days'
        )`,
      })
      .from(contentCategories)
      .limit(1)

    return counts ?? {
      categories: 0,
      articles: 0,
      faq: 0,
      documents: 0,
      guides: 0,
      glossary: 0,
      sources: 0,
      reviewOverdue: 0,
    }
  }

  async setContentStatus(
    type: ContentItemType,
    slug: string,
    status: ContentArticleRecord["status"]
  ): Promise<void> {
    const updatedAt = new Date()
    if (type === "ARTICLE") {
      await this.db
        .update(contentArticles)
        .set({ status, updatedAt })
        .where(eq(contentArticles.slug, slug))
      return
    }
    if (type === "FAQ") {
      await this.db
        .update(contentFaqItems)
        .set({ status, updatedAt })
        .where(eq(contentFaqItems.slug, slug))
      return
    }
    if (type === "DOCUMENT") {
      await this.db
        .update(contentDocuments)
        .set({ status, updatedAt })
        .where(eq(contentDocuments.slug, slug))
      return
    }
    if (type === "GUIDE") {
      await this.db
        .update(contentGuides)
        .set({ status, updatedAt })
        .where(eq(contentGuides.slug, slug))
      return
    }
    await this.db
      .update(contentGlossaryTerms)
      .set({ status, updatedAt })
      .where(eq(contentGlossaryTerms.slug, slug))
  }

  async listContentForAdmin(limit = 40): Promise<AdminContentRow[]> {    const [articles, faq, documents, guides, glossary] = await Promise.all([
      this.db
        .select({
          type: sql<"ARTICLE">`'ARTICLE'`,
          slug: contentArticles.slug,
          title: contentArticles.title,
          status: contentArticles.status,
          lastReviewedAt: contentArticles.lastReviewedAt,
        })
        .from(contentArticles)
        .orderBy(desc(contentArticles.updatedAt))
        .limit(limit),
      this.db
        .select({
          type: sql<"FAQ">`'FAQ'`,
          slug: contentFaqItems.slug,
          title: contentFaqItems.question,
          status: contentFaqItems.status,
          lastReviewedAt: contentFaqItems.lastReviewedAt,
        })
        .from(contentFaqItems)
        .orderBy(desc(contentFaqItems.updatedAt))
        .limit(limit),
      this.db
        .select({
          type: sql<"DOCUMENT">`'DOCUMENT'`,
          slug: contentDocuments.slug,
          title: contentDocuments.name,
          status: contentDocuments.status,
          lastReviewedAt: contentDocuments.lastReviewedAt,
        })
        .from(contentDocuments)
        .orderBy(desc(contentDocuments.updatedAt))
        .limit(limit),
      this.db
        .select({
          type: sql<"GUIDE">`'GUIDE'`,
          slug: contentGuides.slug,
          title: contentGuides.title,
          status: contentGuides.status,
          lastReviewedAt: contentGuides.lastReviewedAt,
        })
        .from(contentGuides)
        .orderBy(desc(contentGuides.updatedAt))
        .limit(limit),
      this.db
        .select({
          type: sql<"GLOSSARY">`'GLOSSARY'`,
          slug: contentGlossaryTerms.slug,
          title: contentGlossaryTerms.term,
          status: contentGlossaryTerms.status,
          lastReviewedAt: contentGlossaryTerms.lastReviewedAt,
        })
        .from(contentGlossaryTerms)
        .orderBy(desc(contentGlossaryTerms.updatedAt))
        .limit(limit),
    ])

    return [...articles, ...faq, ...documents, ...guides, ...glossary]
  }
}

export type ContentRepository = DrizzleContentRepository
