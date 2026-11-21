import type { AdminData } from "@zpr/contracts/views"

import { getContainer } from "@/server/container"

export async function getAdminData(): Promise<AdminData> {
  const { repositories } = getContainer()

  const [
    rules,
    sources,
    documents,
    jobs,
    embeddingModel,
    users,
    ruleCount,
    chunkCount,
    userCount,
    caseCount,
  ] = await Promise.all([
    repositories.legal.listRuleVersions(20),
    repositories.knowledge.listSources(12),
    repositories.knowledge.listDocuments(12),
    repositories.knowledge.listIngestionJobs(12),
    repositories.knowledge.getActiveEmbeddingModel(),
    repositories.users.listDemoUsers(12),
    repositories.legal.countRules(),
    repositories.knowledge.countChunks(),
    repositories.users.countUsers(),
    repositories.benefits.countCases(),
  ])

  return {
    rules,
    sources,
    documents,
    jobs: jobs.map((job) => ({
      ...job,
      createdAt: job.createdAt.toISOString(),
    })),
    embeddingModel,
    users: users.map((user) => ({
      ...user,
      createdAt: user.createdAt.toISOString(),
    })),
    counts: {
      rules: ruleCount,
      chunks: chunkCount,
      users: userCount,
      cases: caseCount,
    },
  }
}
