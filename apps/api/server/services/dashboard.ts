import type { DashboardData } from "@zpr/contracts/views"

import { getContainer } from "@/server/container"

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
    cases: caseList.map((item) => ({
      ...item,
      createdAt: item.createdAt.toISOString(),
    })),
    calculations: calculationList.map((calculation) => ({
      ...calculation,
      createdAt: calculation.createdAt.toISOString(),
    })),
    rules: ruleList,
    sources,
    documents,
    embeddingModel,
    demoUsers: demoUsers.map((user) => ({
      ...user,
      createdAt: user.createdAt.toISOString(),
    })),
  }
}
