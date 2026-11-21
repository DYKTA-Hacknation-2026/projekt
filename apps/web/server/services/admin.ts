import type {
  EmbeddingModelSummary,
  IngestionJobSummary,
  KnowledgeDocumentSummary,
  KnowledgeSourceSummary,
  LegalRuleSummary,
  UserSummary,
} from "@zpr/db/repositories"

import { getContainer } from "@/server/container"

export interface AdminData {
  rules: LegalRuleSummary[]
  sources: KnowledgeSourceSummary[]
  documents: KnowledgeDocumentSummary[]
  jobs: IngestionJobSummary[]
  embeddingModel: EmbeddingModelSummary | null
  users: UserSummary[]
  counts: {
    rules: number
    chunks: number
    users: number
    cases: number
  }
}

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
    jobs,
    embeddingModel,
    users,
    counts: {
      rules: ruleCount,
      chunks: chunkCount,
      users: userCount,
      cases: caseCount,
    },
  }
}
