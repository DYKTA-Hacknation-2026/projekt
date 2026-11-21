import "dotenv/config"

import { closeDatabase, getDatabaseConnection } from "../client"
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
import {
  CONTENT_ARTICLES,
  CONTENT_CATEGORIES,
  CONTENT_DOCUMENTS,
  CONTENT_FAQ,
  CONTENT_GLOSSARY,
  CONTENT_GUIDES,
  CONTENT_LEGAL_REFERENCES,
  CONTENT_RELATIONS,
  CONTENT_SOURCES,
} from "../content"

/**
 * Seeds the editorial Centrum wiedzy. Idempotent: records are keyed by slug
 * (or citation), so re-running updates the content in place and keeps URLs
 * stable. Relations are rebuilt because they are fully derived from the seed.
 */
export async function seedKnowledgeCenter(): Promise<void> {
  const { db } = getDatabaseConnection()

  console.info("[db:seed] Centrum wiedzy — kategorie")
  const categoryIds = new Map<string, string>()
  for (const category of CONTENT_CATEGORIES) {
    const [row] = await db
      .insert(contentCategories)
      .values({
        slug: category.slug,
        title: category.title,
        description: category.description,
        icon: category.icon,
        sortOrder: category.sortOrder,
        status: "PUBLISHED",
      })
      .onConflictDoUpdate({
        target: contentCategories.slug,
        set: {
          title: category.title,
          description: category.description,
          icon: category.icon,
          sortOrder: category.sortOrder,
          status: "PUBLISHED",
          updatedAt: new Date(),
        },
      })
      .returning({ id: contentCategories.id })
    if (row) categoryIds.set(category.slug, row.id)
  }

  console.info("[db:seed] Centrum wiedzy — źródła")
  const sourceIds = new Map<string, string>()
  for (const source of CONTENT_SOURCES) {
    const [row] = await db
      .insert(contentSources)
      .values({
        slug: source.slug,
        title: source.title,
        publisher: source.publisher,
        kind: source.kind,
        url: source.url,
        description: source.description,
        accessedAt: source.accessedAt,
        lastVerifiedAt: source.lastVerifiedAt,
      })
      .onConflictDoUpdate({
        target: contentSources.slug,
        set: {
          title: source.title,
          publisher: source.publisher,
          kind: source.kind,
          url: source.url,
          description: source.description,
          accessedAt: source.accessedAt,
          lastVerifiedAt: source.lastVerifiedAt,
          updatedAt: new Date(),
        },
      })
      .returning({ id: contentSources.id })
    if (row) sourceIds.set(source.slug, row.id)
  }

  console.info("[db:seed] Centrum wiedzy — podstawy prawne")
  const legalIds = new Map<string, string>()
  for (const reference of CONTENT_LEGAL_REFERENCES) {
    const [row] = await db
      .insert(contentLegalReferences)
      .values({
        citation: reference.citation,
        title: reference.title,
        actTitle: reference.actTitle,
        url: reference.url,
        effectiveFrom: reference.effectiveFrom,
        notes: reference.notes,
      })
      .onConflictDoUpdate({
        target: contentLegalReferences.citation,
        set: {
          title: reference.title,
          actTitle: reference.actTitle,
          url: reference.url,
          effectiveFrom: reference.effectiveFrom,
          notes: reference.notes,
          updatedAt: new Date(),
        },
      })
      .returning({ id: contentLegalReferences.id })
    if (row) legalIds.set(reference.citation, row.id)
  }

  console.info("[db:seed] Centrum wiedzy — artykuły")
  const articleIds = new Map<string, string>()
  for (const article of CONTENT_ARTICLES) {
    const categoryId = categoryIds.get(article.categorySlug)
    if (!categoryId) throw new Error(`Unknown category ${article.categorySlug}`)
    const [row] = await db
      .insert(contentArticles)
      .values({
        slug: article.slug,
        categoryId,
        title: article.title,
        summary: article.summary,
        blocks: article.blocks,
        keyPoints: article.keyPoints,
        practicalTips: article.practicalTips,
        keywords: article.keywords,
        readingMinutes: article.readingMinutes,
        isFeatured: article.isFeatured ?? false,
        popularity: article.popularity ?? 0,
        status: "PUBLISHED",
        lastReviewedAt: article.lastReviewedAt,
        publishedAt: article.publishedAt,
      })
      .onConflictDoUpdate({
        target: contentArticles.slug,
        set: {
          categoryId,
          title: article.title,
          summary: article.summary,
          blocks: article.blocks,
          keyPoints: article.keyPoints,
          practicalTips: article.practicalTips,
          keywords: article.keywords,
          readingMinutes: article.readingMinutes,
          isFeatured: article.isFeatured ?? false,
          popularity: article.popularity ?? 0,
          status: "PUBLISHED",
          lastReviewedAt: article.lastReviewedAt,
          publishedAt: article.publishedAt,
          updatedAt: new Date(),
        },
      })
      .returning({ id: contentArticles.id })
    if (row) articleIds.set(article.slug, row.id)
  }

  // Join rows are derived; rebuild them so removed links disappear.
  await db.delete(contentArticleSources)
  await db.delete(contentArticleLegalReferences)

  for (const article of CONTENT_ARTICLES) {
    const articleId = articleIds.get(article.slug)
    if (!articleId) continue

    for (const source of article.sources) {
      const sourceId = sourceIds.get(source.sourceSlug)
      if (!sourceId) throw new Error(`Unknown source ${source.sourceSlug}`)
      await db
        .insert(contentArticleSources)
        .values({
          articleId,
          sourceId,
          locator: source.locator,
          isPrimary: source.isPrimary ?? false,
        })
        .onConflictDoNothing()
    }

    for (const reference of article.legalReferences) {
      const legalReferenceId = legalIds.get(reference.citation)
      if (!legalReferenceId) {
        throw new Error(`Unknown legal reference ${reference.citation}`)
      }
      await db
        .insert(contentArticleLegalReferences)
        .values({
          articleId,
          legalReferenceId,
          locator: reference.locator,
        })
        .onConflictDoNothing()
    }
  }

  console.info("[db:seed] Centrum wiedzy — FAQ")
  for (const item of CONTENT_FAQ) {
    const categoryId = categoryIds.get(item.categorySlug)
    if (!categoryId) throw new Error(`Unknown category ${item.categorySlug}`)
    const articleId = item.articleSlug
      ? (articleIds.get(item.articleSlug) ?? null)
      : null
    await db
      .insert(contentFaqItems)
      .values({
        slug: item.slug,
        categoryId,
        question: item.question,
        shortAnswer: item.shortAnswer,
        explanation: item.explanation,
        conditions: item.conditions,
        whatToDo: item.whatToDo,
        isImportant: item.isImportant ?? false,
        popularity: item.popularity ?? 0,
        articleId,
        calculatorHref: item.calculatorHref,
        guideHref: item.guideSlug
          ? `/wiedza/przewodniki/${item.guideSlug}`
          : null,
        status: "PUBLISHED",
        lastReviewedAt: item.lastReviewedAt,
      })
      .onConflictDoUpdate({
        target: contentFaqItems.slug,
        set: {
          categoryId,
          question: item.question,
          shortAnswer: item.shortAnswer,
          explanation: item.explanation,
          conditions: item.conditions,
          whatToDo: item.whatToDo,
          isImportant: item.isImportant ?? false,
          popularity: item.popularity ?? 0,
          articleId,
          calculatorHref: item.calculatorHref,
          guideHref: item.guideSlug
            ? `/wiedza/przewodniki/${item.guideSlug}`
            : null,
          status: "PUBLISHED",
          lastReviewedAt: item.lastReviewedAt,
          updatedAt: new Date(),
        },
      })
  }

  console.info("[db:seed] Centrum wiedzy — dokumenty")
  const documentIds = new Map<string, string>()
  for (const document of CONTENT_DOCUMENTS) {
    const categoryId = categoryIds.get(document.categorySlug)
    if (!categoryId) throw new Error(`Unknown category ${document.categorySlug}`)
    const [row] = await db
      .insert(contentDocuments)
      .values({
        slug: document.slug,
        categoryId,
        code: document.code,
        name: document.name,
        kind: document.kind,
        purpose: document.purpose,
        whenRequired: document.whenRequired,
        filledBy: document.filledBy,
        submittedBy: document.submittedBy,
        informationNeeded: document.informationNeeded,
        additionalDocuments: document.additionalDocuments,
        submissionChannels: document.submissionChannels,
        officialUrl: document.officialUrl,
        officialSourceLabel: document.officialSourceLabel,
        generatorHref: document.generatorHref,
        generatorLabel: document.generatorLabel,
        note: document.note,
        sortOrder: document.sortOrder,
        status: "PUBLISHED",
        lastReviewedAt: document.lastReviewedAt,
      })
      .onConflictDoUpdate({
        target: contentDocuments.slug,
        set: {
          categoryId,
          code: document.code,
          name: document.name,
          kind: document.kind,
          purpose: document.purpose,
          whenRequired: document.whenRequired,
          filledBy: document.filledBy,
          submittedBy: document.submittedBy,
          informationNeeded: document.informationNeeded,
          additionalDocuments: document.additionalDocuments,
          submissionChannels: document.submissionChannels,
          officialUrl: document.officialUrl,
          officialSourceLabel: document.officialSourceLabel,
          generatorHref: document.generatorHref,
          generatorLabel: document.generatorLabel,
          note: document.note,
          sortOrder: document.sortOrder,
          status: "PUBLISHED",
          lastReviewedAt: document.lastReviewedAt,
          updatedAt: new Date(),
        },
      })
      .returning({ id: contentDocuments.id })
    if (row) documentIds.set(document.slug, row.id)
  }

  console.info("[db:seed] Centrum wiedzy — przewodniki")
  const guideIds = new Map<string, string>()
  for (const guide of CONTENT_GUIDES) {
    const categoryId = categoryIds.get(guide.categorySlug)
    if (!categoryId) throw new Error(`Unknown category ${guide.categorySlug}`)
    const [row] = await db
      .insert(contentGuides)
      .values({
        slug: guide.slug,
        categoryId,
        title: guide.title,
        summary: guide.summary,
        audience: guide.audience,
        conditions: guide.conditions,
        documents: guide.documents,
        steps: guide.steps,
        deadlines: guide.deadlines,
        places: guide.places,
        problems: guide.problems,
        calculatorHref: guide.calculatorHref,
        sortOrder: guide.sortOrder,
        status: "PUBLISHED",
        lastReviewedAt: guide.lastReviewedAt,
      })
      .onConflictDoUpdate({
        target: contentGuides.slug,
        set: {
          categoryId,
          title: guide.title,
          summary: guide.summary,
          audience: guide.audience,
          conditions: guide.conditions,
          documents: guide.documents,
          steps: guide.steps,
          deadlines: guide.deadlines,
          places: guide.places,
          problems: guide.problems,
          calculatorHref: guide.calculatorHref,
          sortOrder: guide.sortOrder,
          status: "PUBLISHED",
          lastReviewedAt: guide.lastReviewedAt,
          updatedAt: new Date(),
        },
      })
      .returning({ id: contentGuides.id })
    if (row) guideIds.set(guide.slug, row.id)
  }

  console.info("[db:seed] Centrum wiedzy — słownik")
  const glossaryIds = new Map<string, string>()
  for (const term of CONTENT_GLOSSARY) {
    const [row] = await db
      .insert(contentGlossaryTerms)
      .values({
        slug: term.slug,
        term: term.term,
        letter: term.letter,
        definition: term.definition,
        explanation: term.explanation,
        example: term.example,
        status: "PUBLISHED",
        lastReviewedAt: term.lastReviewedAt,
      })
      .onConflictDoUpdate({
        target: contentGlossaryTerms.slug,
        set: {
          term: term.term,
          letter: term.letter,
          definition: term.definition,
          explanation: term.explanation,
          example: term.example,
          status: "PUBLISHED",
          lastReviewedAt: term.lastReviewedAt,
          updatedAt: new Date(),
        },
      })
      .returning({ id: contentGlossaryTerms.id })
    if (row) glossaryIds.set(term.slug, row.id)
  }

  console.info("[db:seed] Centrum wiedzy — powiązania")
  await db.delete(contentRelations)

  const idsByType = {
    ARTICLE: articleIds,
    FAQ: new Map<string, string>(),
    DOCUMENT: documentIds,
    GUIDE: guideIds,
    GLOSSARY: glossaryIds,
  } as const

  const relationRows = CONTENT_RELATIONS.map((relation) => {
    const fromId = idsByType[relation.fromType].get(relation.fromSlug)
    const toId = idsByType[relation.toType].get(relation.toSlug)
    if (!fromId || !toId) {
      throw new Error(
        `Unknown relation ${relation.fromType}/${relation.fromSlug} -> ${relation.toType}/${relation.toSlug}`
      )
    }
    return {
      fromType: relation.fromType,
      fromId,
      toType: relation.toType,
      toId,
      label: relation.label,
      sortOrder: relation.sortOrder ?? 0,
    }
  })

  for (const term of CONTENT_GLOSSARY) {
    const fromId = glossaryIds.get(term.slug)
    if (!fromId) continue
    for (const [index, articleSlug] of term.relatedArticleSlugs.entries()) {
      const toId = articleIds.get(articleSlug)
      if (!toId) continue
      relationRows.push({
        fromType: "GLOSSARY",
        fromId,
        toType: "ARTICLE",
        toId,
        label: term.term,
        sortOrder: index,
      })
    }
  }

  if (relationRows.length > 0) {
    await db.insert(contentRelations).values(relationRows).onConflictDoNothing()
  }

  console.info(
    `[db:seed] Centrum wiedzy — gotowe: ${CONTENT_CATEGORIES.length} kategorii, ${CONTENT_ARTICLES.length} artykułów, ${CONTENT_FAQ.length} FAQ, ${CONTENT_DOCUMENTS.length} dokumentów, ${CONTENT_GUIDES.length} przewodników, ${CONTENT_GLOSSARY.length} pojęć.`
  )
}

export async function deleteKnowledgeCenterContent(): Promise<void> {
  const { db } = getDatabaseConnection()
  await db.delete(contentRelations)
  await db.delete(contentArticleSources)
  await db.delete(contentArticleLegalReferences)
  await db.delete(contentFaqItems)
  await db.delete(contentDocuments)
  await db.delete(contentGuides)
  await db.delete(contentGlossaryTerms)
  await db.delete(contentArticles)
  await db.delete(contentLegalReferences)
  await db.delete(contentSources)
  await db.delete(contentCategories)
}

// Small helper kept close to the seed for ad-hoc verification scripts.
export async function countKnowledgeCenterRows(): Promise<Record<string, number>> {
  const { db } = getDatabaseConnection()
  const tables = {
    categories: contentCategories,
    articles: contentArticles,
    faq: contentFaqItems,
    documents: contentDocuments,
    guides: contentGuides,
    glossary: contentGlossaryTerms,
    sources: contentSources,
    legalReferences: contentLegalReferences,
  }
  const result: Record<string, number> = {}
  for (const [name, table] of Object.entries(tables)) {
    const rows = await db.select({ id: table.id }).from(table)
    result[name] = rows.length
  }
  return result
}
