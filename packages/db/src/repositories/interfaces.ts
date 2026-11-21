import type {
  UserSummary as UserSummaryPayload,
  BenefitCaseSummary as BenefitCaseSummaryPayload,
  CalculationSummary as CalculationSummaryPayload,
  LegalRuleSummary,
  KnowledgeSourceSummary,
  KnowledgeDocumentSummary,
  IngestionJobSummary as IngestionJobSummaryPayload,
  EmbeddingModelSummary,
} from "@zpr/contracts/views"
import type {
  conversationMessages,
  conversations,
  knowledgeChunks,
  legalRuleVersions,
  users,
} from "../schema"
import type { OnboardingInput } from "@zpr/contracts/onboarding"
import type { KnowledgeChunkResult } from "@zpr/contracts/knowledge"

export type UserRecord = typeof users.$inferSelect
export type ConversationRecord = typeof conversations.$inferSelect
export type ConversationMessageRecord = typeof conversationMessages.$inferSelect
export type KnowledgeChunkRecord = typeof knowledgeChunks.$inferSelect
export type LegalRuleVersionRecord = typeof legalRuleVersions.$inferSelect

export type UserSummary = UserSummaryPayload<Date>

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

export type BenefitCaseSummary = BenefitCaseSummaryPayload<Date>

export type CalculationSummary = CalculationSummaryPayload<Date>

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

export type { LegalRuleSummary } from "@zpr/contracts/views"

export interface LegalRepository {
  countRules(): Promise<number>
  listRuleVersions(limit?: number): Promise<LegalRuleSummary[]>
}

export type { KnowledgeSourceSummary } from "@zpr/contracts/views"

export type { KnowledgeDocumentSummary } from "@zpr/contracts/views"

export type IngestionJobSummary = IngestionJobSummaryPayload<Date>

export type { EmbeddingModelSummary } from "@zpr/contracts/views"

export interface SearchChunksOptions {
  query: string
  limit: number
  asOf?: string
}

export interface KnowledgeRepository {
  getActiveEmbeddingModel(): Promise<EmbeddingModelSummary | null>
  countChunks(): Promise<number>
  listSources(limit?: number): Promise<KnowledgeSourceSummary[]>
  listDocuments(limit?: number): Promise<KnowledgeDocumentSummary[]>
  listIngestionJobs(limit?: number): Promise<IngestionJobSummary[]>
  searchChunks(
    embedding: number[],
    options: SearchChunksOptions
  ): Promise<KnowledgeChunkResult[]>
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
