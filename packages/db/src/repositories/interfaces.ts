import type {
  conversationMessages,
  conversations,
  knowledgeChunks,
  legalRuleVersions,
  users,
} from "../schema"
import type { OnboardingInput } from "@zpr/contracts/onboarding"

export type UserRecord = typeof users.$inferSelect
export type ConversationRecord = typeof conversations.$inferSelect
export type ConversationMessageRecord = typeof conversationMessages.$inferSelect
export type KnowledgeChunkRecord = typeof knowledgeChunks.$inferSelect
export type LegalRuleVersionRecord = typeof legalRuleVersions.$inferSelect

export interface UserSummary {
  id: string
  displayName: string
  email: string
  role: UserRecord["role"]
  isDemo: boolean
  createdAt: Date
}

export interface UserRepository {
  countUsers(): Promise<number>
  listDemoUsers(limit?: number): Promise<UserSummary[]>
  findUserByEmail(email: string): Promise<UserRecord | null>
}

export interface HouseholdRepository {
  createFromOnboarding(
    input: OnboardingInput
  ): Promise<{ userId: string; caseId: string; caseNumber: string }>
}

export interface BenefitCaseSummary {
  id: string
  caseNumber: string
  title: string
  status: "DRAFT" | "IN_REVIEW" | "READY" | "CLOSED"
  dueDate: string | null
  ownerName: string
  createdAt: Date
}

export interface CalculationSummary {
  id: string
  caseId: string | null
  totalAmountGrosze: number
  status: "OK" | "INDETERMINATE" | "ERROR"
  engineVersion: string
  createdAt: Date
}

export interface SaveCalculationInput {
  caseId?: string
  scenarioId?: string
  input: Record<string, unknown>
  result: Record<string, unknown>
  totalAmountGrosze: number
  status: "OK" | "INDETERMINATE" | "ERROR"
  engineVersion?: string
}

export interface BenefitRepository {
  countCases(): Promise<number>
  countCalculations(): Promise<number>
  listCases(limit?: number): Promise<BenefitCaseSummary[]>
  listRecentCalculations(limit?: number): Promise<CalculationSummary[]>
  findFirstCaseForEmail(email: string): Promise<{ id: string } | null>
  saveCalculation(input: SaveCalculationInput): Promise<{ id: string }>
}

export interface LegalRuleSummary {
  id: string
  code: string
  title: string
  category: string
  legalReference: string
  verificationStatus: "VERIFIED" | "UNVERIFIED" | "PROPOSED"
  version: string
  effectiveFrom: string
}

export interface LegalRepository {
  countRules(): Promise<number>
  listRuleVersions(limit?: number): Promise<LegalRuleSummary[]>
}

export interface KnowledgeSourceSummary {
  id: string
  slug: string
  title: string
  publisher: string
  sourceType: string
  isConfidential: boolean
  accessLevel: "PUBLIC" | "INTERNAL" | "RESTRICTED"
  documentCount: number
}

export interface KnowledgeDocumentSummary {
  id: string
  title: string
  version: string
  status: "PENDING" | "INDEXED" | "FAILED" | "SUPERSEDED" | "ARCHIVED"
  effectiveFrom: string | null
  effectiveTo: string | null
  sourceTitle: string
  chunkCount: number
}

export interface IngestionJobSummary {
  id: string
  status: "QUEUED" | "RUNNING" | "SUCCEEDED" | "FAILED"
  chunksCreated: number
  documentTitle: string
  createdAt: Date
}

export interface EmbeddingModelSummary {
  id: string
  name: string
  provider: string
  dimensions: number
  isActive: boolean
}

export interface KnowledgeRepository {
  getActiveEmbeddingModel(): Promise<EmbeddingModelSummary | null>
  countChunks(): Promise<number>
  listSources(limit?: number): Promise<KnowledgeSourceSummary[]>
  listDocuments(limit?: number): Promise<KnowledgeDocumentSummary[]>
  listIngestionJobs(limit?: number): Promise<IngestionJobSummary[]>
  listRecentChunks(
    limit?: number
  ): Promise<
    Array<
      Pick<
        KnowledgeChunkRecord,
        | "id"
        | "content"
        | "sourceTitle"
        | "legalReference"
        | "createdAt"
        | "contentHash"
      >
    >
  >
}

export interface ConversationRepository {
  countConversations(): Promise<number>
  createConversation(input: {
    userId?: string
    title: string
    isSimulated?: boolean
  }): Promise<ConversationRecord>
  getConversation(id: string): Promise<ConversationRecord | null>
  appendMessage(input: {
    conversationId: string
    role: "USER" | "ASSISTANT" | "SYSTEM" | "TOOL"
    content: string
    model?: string
    metadata?: Record<string, unknown>
  }): Promise<ConversationMessageRecord>
  addEvidence(input: {
    messageId: string
    chunkId: string
    rank: number
    score: number
    quote: string
  }): Promise<void>
  addToolCall(input: {
    messageId: string
    toolName: string
    arguments: Record<string, unknown>
    result: Record<string, unknown>
    latencyMs: number
  }): Promise<void>
  listMessages(conversationId: string): Promise<ConversationMessageRecord[]>
}
