import { cookies } from "next/headers"
import { z } from "zod"
import { ADMIN_COOKIE, verifyAdminToken } from "@zpr/contracts/admin-token"
import { getEnv } from "@zpr/contracts/env"
import { AppError } from "@zpr/contracts/problem"
import { requireWebService } from "@/server/http/internal"
import { apiRoute, json } from "@/server/http/route"
import { getContainer } from "@/server/container"
import * as knowledge from "@/server/services/knowledge-center"

const string = z.string()
const optional = string.optional()
const filters = z.object({ category: optional, query: optional })
const operations = {
  getKnowledgeHome: () => knowledge.getKnowledgeHome(),
  getKnowledgeCategory: (a: unknown) => knowledge.getKnowledgeCategory(string.parse(a)),
  getArticleView: (a: unknown) => knowledge.getArticleView(string.parse(a)),
  getFaqPage: (a: unknown) => knowledge.getFaqPage(filters.parse(a)),
  getArticleIndex: (a: unknown) => knowledge.getArticleIndex(filters.parse(a)),
  getDocumentsPage: (a: unknown) => knowledge.getDocumentsPage(optional.parse(a)),
  getDocumentView: (a: unknown) => knowledge.getDocumentView(string.parse(a)),
  getGuidesPage: (a: unknown) => knowledge.getGuidesPage(optional.parse(a)),
  getGuideView: (a: unknown) => knowledge.getGuideView(string.parse(a)),
  getGlossaryPage: (a: unknown) => knowledge.getGlossaryPage(z.object({ letter: optional, query: optional }).parse(a)),
  getGlossaryView: (a: unknown) => knowledge.getGlossaryView(string.parse(a)),
  searchKnowledgeContent: (a: unknown) => knowledge.searchKnowledgeContent(string.parse(a)),
  getSourcesPage: () => knowledge.getSourcesPage(),
  getAdminKnowledge: () => knowledge.getAdminKnowledge(),
  setContentStatus: async (a: unknown) => {
    const { type, slug, status } = z.object({ type: z.enum(["ARTICLE", "FAQ", "DOCUMENT", "GUIDE", "GLOSSARY"]), slug: string.min(1), status: z.enum(["DRAFT", "IN_REVIEW", "PUBLISHED", "ARCHIVED"]) }).parse(a)
    await getContainer().repositories.content.setContentStatus(type, slug, status)
    return null
  },
}
export const POST = apiRoute(async (request) => {
  requireWebService(request)
  const { operation, argument } = z.object({ operation: z.string(), argument: z.unknown().optional() }).parse(await request.json())
  if (!Object.hasOwn(operations, operation)) throw new AppError(400, "BAD_REQUEST", "Nieznana operacja.")
  if (operation === "getAdminKnowledge" || operation === "setContentStatus") {
    const env = getEnv()
    const token = (await cookies()).get(ADMIN_COOKIE)?.value
    if (env.ADMIN_GATE_ENABLED && !verifyAdminToken(token, env.SESSION_SECRET)) throw new AppError(401, "UNAUTHORIZED", "Wymagana sesja administratora.")
  }
  return json(await operations[operation as keyof typeof operations](argument))
})
