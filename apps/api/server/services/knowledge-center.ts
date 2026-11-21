import type { ContentItemType } from "@zpr/contracts/content"
import type {
  AdminContentRow,
  ArticleLegalLink,
  ArticleSourceLink,
  ArticleSummary,
  CategorySummary,
  ContentArticleRecord,
  ContentDocumentRecord,
  ContentGlossaryRecord,
  ContentGuideRecord,
  ContentSourceRecord,
  ContentStats,
  DocumentSummary,
  FaqSummary,
  GuideSummary,
  GlossarySummary,
  RecentContentItem,
  RelatedContentItem,
  SearchHit,
} from "@zpr/db/repositories"

import { getContainer } from "../container"

export interface RelatedLink extends RelatedContentItem {
  href: string
}

export function knowledgeHref(type: ContentItemType, slug: string): string {
  switch (type) {
    case "ARTICLE":
      return `/wiedza/artykul/${slug}`
    case "FAQ":
      return `/wiedza/faq#${slug}`
    case "DOCUMENT":
      return `/wiedza/dokumenty/${slug}`
    case "GUIDE":
      return `/wiedza/przewodniki/${slug}`
    case "GLOSSARY":
      return `/wiedza/slownik/${slug}`
  }
}

function toRelatedLink(item: RelatedContentItem): RelatedLink {
  return { ...item, href: knowledgeHref(item.type, item.slug) }
}

export function toRecentLink(item: RecentContentItem): RelatedLink {
  return {
    type: item.type,
    id: "",
    slug: item.slug,
    title: item.title,
    summary: item.summary,
    label: null,
    href: knowledgeHref(item.type, item.slug),
  }
}

export interface KnowledgeHomeData {
  categories: CategorySummary[]
  featured: ArticleSummary[]
  popular: FaqSummary[]
  recent: RecentContentItem[]
  guides: GuideSummary[]
}

export async function getKnowledgeHome(): Promise<KnowledgeHomeData> {
  const { repositories } = getContainer()
  const [categories, featured, popular, recent, guides] = await Promise.all([
    repositories.content.listCategories(),
    repositories.content.listArticles({ featuredOnly: true, limit: 4 }),
    repositories.content.listFaq({ limit: 5 }),
    repositories.content.listRecentlyUpdated(6),
    repositories.content.listGuides({ limit: 4 }),
  ])

  return { categories, featured, popular, recent, guides }
}

export interface KnowledgeCategoryData {
  category: CategorySummary
  categories: CategorySummary[]
  articles: ArticleSummary[]
  faq: FaqSummary[]
  guides: GuideSummary[]
  documents: DocumentSummary[]
  glossary: GlossarySummary[]
}

export async function getKnowledgeCategory(
  slug: string
): Promise<KnowledgeCategoryData | null> {
  const { repositories } = getContainer()
  const categories = await repositories.content.listCategories()
  const category = categories.find((item) => item.slug === slug)
  if (!category) return null

  const [articles, faq, guides, documents, glossary] = await Promise.all([
    repositories.content.listArticles({ categorySlug: slug }),
    repositories.content.listFaq({ categorySlug: slug }),
    repositories.content.listGuides({ categorySlug: slug }),
    repositories.content.listDocuments({ categorySlug: slug }),
    category.slug === "pojecia-i-definicje"
      ? repositories.content.listGlossary()
      : Promise.resolve([]),
  ])

  return { category, categories, articles, faq, guides, documents, glossary }
}

export interface ArticleView {
  article: ContentArticleRecord
  category: CategorySummary
  sources: ArticleSourceLink[]
  legalReferences: ArticleLegalLink[]
  faq: FaqSummary[]
  related: RelatedLink[]
  relatedArticles: RelatedLink[]
  relatedDocuments: RelatedLink[]
  relatedGuides: RelatedLink[]
  relatedGlossary: RelatedLink[]
}

export async function getArticleView(slug: string): Promise<ArticleView | null> {
  const { repositories } = getContainer()
  const row = await repositories.content.getArticleBySlug(slug)
  if (!row) return null

  const categories = await repositories.content.listCategories()
  const category =
    categories.find((item) => item.id === row.category.id) ?? {
      ...row.category,
      articleCount: 0,
      faqCount: 0,
      guideCount: 0,
      documentCount: 0,
      glossaryCount: 0,
    }
  const related = row.related.map(toRelatedLink)

  return {
    article: row.article,
    category,
    sources: row.sources,
    legalReferences: row.legalReferences,
    faq: row.faq,
    related,
    relatedArticles: related.filter((item) => item.type === "ARTICLE"),
    relatedDocuments: related.filter((item) => item.type === "DOCUMENT"),
    relatedGuides: related.filter((item) => item.type === "GUIDE"),
    relatedGlossary: related.filter((item) => item.type === "GLOSSARY"),
  }
}

export interface FaqPageData {
  items: FaqSummary[]
  categories: CategorySummary[]
  selectedCategory: CategorySummary | null
  query: string
}

export async function getFaqPage(input: {
  category?: string
  query?: string
}): Promise<FaqPageData> {
  const { repositories } = getContainer()
  const [categories, items] = await Promise.all([
    repositories.content.listCategories(),
    repositories.content.listFaq({
      categorySlug: input.category,
      query: input.query,
    }),
  ])

  return {
    items,
    categories: categories.filter((category) => category.faqCount > 0),
    selectedCategory:
      categories.find((category) => category.slug === input.category) ?? null,
    query: input.query ?? "",
  }
}

export interface ArticleIndexData {
  articles: ArticleSummary[]
  categories: CategorySummary[]
  selectedCategory: CategorySummary | null
  query: string
}

export async function getArticleIndex(input: {
  category?: string
  query?: string
}): Promise<ArticleIndexData> {
  const { repositories } = getContainer()
  const [categories, articles] = await Promise.all([
    repositories.content.listCategories(),
    repositories.content.listArticles({ categorySlug: input.category }),
  ])

  const query = input.query?.trim().toLocaleLowerCase("pl") ?? ""
  const filtered = query
    ? articles.filter(
        (article) =>
          article.title.toLocaleLowerCase("pl").includes(query) ||
          article.summary.toLocaleLowerCase("pl").includes(query)
      )
    : articles

  return {
    articles: filtered,
    categories: categories.filter((category) => category.articleCount > 0),
    selectedCategory:
      categories.find((category) => category.slug === input.category) ?? null,
    query: input.query ?? "",
  }
}

export interface DocumentsPageData {
  documents: DocumentSummary[]
  categories: CategorySummary[]
  selectedCategory: CategorySummary | null
}

export async function getDocumentsPage(category?: string): Promise<DocumentsPageData> {
  const { repositories } = getContainer()
  const [categories, documents] = await Promise.all([
    repositories.content.listCategories(),
    repositories.content.listDocuments({ categorySlug: category }),
  ])
  return {
    documents,
    categories: categories.filter((item) => item.documentCount > 0),
    selectedCategory:
      categories.find((item) => item.slug === category) ?? null,
  }
}

export interface DocumentView {
  document: ContentDocumentRecord
  category: CategorySummary
  related: RelatedLink[]
}

export async function getDocumentView(slug: string): Promise<DocumentView | null> {
  const { repositories } = getContainer()
  const row = await repositories.content.getDocumentBySlug(slug)
  if (!row) return null
  const categories = await repositories.content.listCategories()
  const category =
    categories.find((item) => item.id === row.category.id) ?? {
      ...row.category,
      articleCount: 0,
      faqCount: 0,
      guideCount: 0,
      documentCount: 0,
      glossaryCount: 0,
    }
  return {
    document: row.document,
    category,
    related: row.related.map(toRelatedLink),
  }
}

export interface GuidesPageData {
  guides: GuideSummary[]
  categories: CategorySummary[]
  selectedCategory: CategorySummary | null
}

export async function getGuidesPage(category?: string): Promise<GuidesPageData> {
  const { repositories } = getContainer()
  const [categories, guides] = await Promise.all([
    repositories.content.listCategories(),
    repositories.content.listGuides({ categorySlug: category }),
  ])
  return {
    guides,
    categories: categories.filter((item) => item.guideCount > 0),
    selectedCategory:
      categories.find((item) => item.slug === category) ?? null,
  }
}

export interface GuideView {
  guide: ContentGuideRecord
  category: CategorySummary
  related: RelatedLink[]
  documents: RelatedLink[]
  articles: RelatedLink[]
  sources: ArticleSourceLink[]
}

export async function getGuideView(slug: string): Promise<GuideView | null> {
  const { repositories } = getContainer()
  const row = await repositories.content.getGuideBySlug(slug)
  if (!row) return null
  const categories = await repositories.content.listCategories()
  const category =
    categories.find((item) => item.id === row.category.id) ?? {
      ...row.category,
      articleCount: 0,
      faqCount: 0,
      guideCount: 0,
      documentCount: 0,
      glossaryCount: 0,
    }
  const related = row.related.map(toRelatedLink)
  const articles = related.filter((item) => item.type === "ARTICLE")

  // A guide has no own source join table. It inherits the verified sources of
  // its related articles, so every procedural claim still has a citation path.
  const sourceLists = await Promise.all(
    articles.map((article) =>
      repositories.content.getArticleBySlug(article.slug)
    )
  )
  const seen = new Set<string>()
  const sources: ArticleSourceLink[] = []
  for (const article of sourceLists) {
    for (const source of article?.sources ?? []) {
      if (seen.has(source.id)) continue
      seen.add(source.id)
      sources.push(source)
    }
  }

  return {
    guide: row.guide,
    category,
    related,
    documents: related.filter((item) => item.type === "DOCUMENT"),
    articles,
    sources,
  }
}

export interface GlossaryPageData {
  terms: GlossarySummary[]
  letters: string[]
  selectedLetter: string | null
  query: string
}

export async function getGlossaryPage(input: {
  letter?: string
  query?: string
}): Promise<GlossaryPageData> {
  const { repositories } = getContainer()
  const letter = input.letter?.toUpperCase() ?? undefined
  const [terms, allTerms] = await Promise.all([
    repositories.content.listGlossary({ letter, query: input.query }),
    repositories.content.listGlossary(),
  ])
  return {
    terms,
    letters: [...new Set(allTerms.map((term) => term.letter))].sort((a, b) =>
      a.localeCompare(b, "pl")
    ),
    selectedLetter: letter ?? null,
    query: input.query ?? "",
  }
}

export interface GlossaryView {
  term: ContentGlossaryRecord
  related: RelatedLink[]
}

export async function getGlossaryView(slug: string): Promise<GlossaryView | null> {
  const { repositories } = getContainer()
  const row = await repositories.content.getGlossaryBySlug(slug)
  if (!row) return null
  return { term: row.term, related: row.related.map(toRelatedLink) }
}

export interface SearchPageData {
  query: string
  hits: Array<SearchHit & { href: string }>
  groups: Array<{ type: ContentItemType; label: string; hits: Array<SearchHit & { href: string }> }>
}

const TYPE_ORDER: ContentItemType[] = [
  "ARTICLE",
  "FAQ",
  "DOCUMENT",
  "GUIDE",
  "GLOSSARY",
]

const TYPE_LABELS: Record<ContentItemType, string> = {
  ARTICLE: "Artykuły",
  FAQ: "Pytania i odpowiedzi",
  DOCUMENT: "Dokumenty i formularze",
  GUIDE: "Przewodniki",
  GLOSSARY: "Pojęcia",
}

export async function searchKnowledgeContent(
  query: string
): Promise<SearchPageData> {
  const { repositories } = getContainer()
  const trimmed = query.trim()
  const raw = trimmed.length >= 2
    ? await repositories.content.searchContent(trimmed, 30)
    : []
  const hits = raw.map((hit) => ({
    ...hit,
    href: knowledgeHref(hit.type, hit.slug),
  }))

  const groups = TYPE_ORDER.map((type) => ({
    type,
    label: TYPE_LABELS[type],
    hits: hits.filter((hit) => hit.type === type),
  })).filter((group) => group.hits.length > 0)

  return { query: trimmed, hits, groups }
}

export interface SourcesPageData {
  sources: ContentSourceRecord[]
}

export async function getSourcesPage(): Promise<SourcesPageData> {
  const { repositories } = getContainer()
  return { sources: await repositories.content.listSources() }
}

export interface AdminKnowledgeData {
  stats: ContentStats
  rows: AdminContentRow[]
}

export async function getAdminKnowledge(): Promise<AdminKnowledgeData> {
  const { repositories } = getContainer()
  const [stats, rows] = await Promise.all([
    repositories.content.getContentStats(),
    repositories.content.listContentForAdmin(60),
  ])
  return { stats, rows }
}
