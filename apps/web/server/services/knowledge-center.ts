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

import { apiUrl } from "@/server/api-client"
import { getEnv } from "@zpr/contracts/env"
import { cookies } from "next/headers"

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

export interface RelatedLink extends RelatedContentItem {
  href: string
}
export interface KnowledgeHomeData {
  categories: CategorySummary[]
  featured: ArticleSummary[]
  popular: FaqSummary[]
  recent: RecentContentItem[]
  guides: GuideSummary[]
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
export interface FaqPageData {
  items: FaqSummary[]
  categories: CategorySummary[]
  selectedCategory: CategorySummary | null
  query: string
}
export interface ArticleIndexData {
  articles: ArticleSummary[]
  categories: CategorySummary[]
  selectedCategory: CategorySummary | null
  query: string
}
export interface DocumentsPageData {
  documents: DocumentSummary[]
  categories: CategorySummary[]
  selectedCategory: CategorySummary | null
}
export interface DocumentView {
  document: ContentDocumentRecord
  category: CategorySummary
  related: RelatedLink[]
}
export interface GuidesPageData {
  guides: GuideSummary[]
  categories: CategorySummary[]
  selectedCategory: CategorySummary | null
}
export interface GuideView {
  guide: ContentGuideRecord
  category: CategorySummary
  related: RelatedLink[]
  documents: RelatedLink[]
  articles: RelatedLink[]
  sources: ArticleSourceLink[]
}
export interface GlossaryPageData {
  terms: GlossarySummary[]
  letters: string[]
  selectedLetter: string | null
  query: string
}
export interface GlossaryView {
  term: ContentGlossaryRecord
  related: RelatedLink[]
}
export interface SearchPageData {
  query: string
  hits: Array<SearchHit & { href: string }>
  groups: Array<{ type: ContentItemType; label: string; hits: Array<SearchHit & { href: string }> }>
}
export interface SourcesPageData {
  sources: ContentSourceRecord[]
}
export interface AdminKnowledgeData {
  stats: ContentStats
  rows: AdminContentRow[]
}
async function read<T>(operation: string, argument?: unknown): Promise<T> {
 const response = await fetch(apiUrl("/internal/knowledge-center"), { method: "POST", headers: { authorization: "Bearer " + getEnv().SESSION_SECRET, "content-type": "application/json", cookie: (await cookies()).toString() }, body: JSON.stringify({ operation, argument }), cache: "no-store" })
 if (!response.ok) throw new Error("Knowledge API request failed (" + response.status + ")")
 return response.json()
}
export function getKnowledgeHome(): Promise<KnowledgeHomeData> { return read("getKnowledgeHome") }
export function getKnowledgeCategory(slug: string): Promise<KnowledgeCategoryData | null> { return read("getKnowledgeCategory", slug) }
export function getArticleView(slug: string): Promise<ArticleView | null> { return read("getArticleView", slug) }
export function getFaqPage(input: { category?: string; query?: string }): Promise<FaqPageData> { return read("getFaqPage", input) }
export function getArticleIndex(input: { category?: string; query?: string }): Promise<ArticleIndexData> { return read("getArticleIndex", input) }
export function getDocumentsPage(category?: string): Promise<DocumentsPageData> { return read("getDocumentsPage", category) }
export function getDocumentView(slug: string): Promise<DocumentView | null> { return read("getDocumentView", slug) }
export function getGuidesPage(category?: string): Promise<GuidesPageData> { return read("getGuidesPage", category) }
export function getGuideView(slug: string): Promise<GuideView | null> { return read("getGuideView", slug) }
export function getGlossaryPage(input: { letter?: string; query?: string }): Promise<GlossaryPageData> { return read("getGlossaryPage", input) }
export function getGlossaryView(slug: string): Promise<GlossaryView | null> { return read("getGlossaryView", slug) }
export function searchKnowledgeContent(query: string): Promise<SearchPageData> { return read("searchKnowledgeContent", query) }
export function getSourcesPage(): Promise<SourcesPageData> { return read("getSourcesPage") }
export function getAdminKnowledge(): Promise<AdminKnowledgeData> { return read("getAdminKnowledge") }
export function setContentStatus(type: ContentItemType, slug: string, status: import("@zpr/contracts/content").ContentStatus): Promise<void> { return read("setContentStatus", { type, slug, status }) }
