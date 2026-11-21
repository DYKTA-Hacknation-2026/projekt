import type { BenefitCaseSummary, CalculationSummary, EmbeddingModelSummary, KnowledgeDocumentSummary, KnowledgeSourceSummary, LegalRuleSummary, UserSummary } from "@zpr/db/repositories"

import { getContainer } from "@/server/container"

export interface DashboardData {
  generatedAt: string
  stats: {
    users: number
    cases: number
    calculations: number
    rules: number
    chunks: number
  }
  cases: BenefitCaseSummary[]
  calculations: CalculationSummary[]
  rules: LegalRuleSummary[]
  sources: KnowledgeSourceSummary[]
  documents: KnowledgeDocumentSummary[]
  embeddingModel: EmbeddingModelSummary | null
  demoUsers: UserSummary[]
}

export async function getDashboardData(): Promise<DashboardData> {
  const { repositories } = getContainer()

  const [
    users,
    cases,
    calculations,
    rules,
    chunks,
    caseList,
    calculationList,
    ruleList,
    sources,
    documents,
    embeddingModel,
    demoUsers,
  ] = await Promise.all([
    repositories.users.countUsers(),
    repositories.benefits.countCases(),
    repositories.benefits.countCalculations(),
    repositories.legal.countRules(),
    repositories.knowledge.countChunks(),
    repositories.benefits.listCases(8),
    repositories.benefits.listRecentCalculations(6),
    repositories.legal.listRuleVersions(10),
    repositories.knowledge.listSources(6),
    repositories.knowledge.listDocuments(6),
    repositories.knowledge.getActiveEmbeddingModel(),
    repositories.users.listDemoUsers(6),
  ])

  return {
    generatedAt: new Date().toISOString(),
    stats: {
      users,
      cases,
      calculations,
      rules,
      chunks,
    },
    cases: caseList,
    calculations: calculationList,
    rules: ruleList,
    sources,
    documents,
    embeddingModel,
    demoUsers,
  }
}
