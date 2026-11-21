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
  dataImportSessions,
  dataImportSnapshots,
  knowledgeChunks,
  legalRuleVersions,
  users,
} from "../schema"
import type { OnboardingInput } from "@zpr/contracts/onboarding"
import type {
  DataScope,
  ImportedCaseData,
  ImportSummary,
  SourceFetchResult,
  SourceIssue,
} from "@zpr/contracts/data-import"

export type UserRecord = typeof users.$inferSelect
export type ConversationRecord = typeof conversations.$inferSelect
export type ConversationMessageRecord = typeof conversationMessages.$inferSelect
export type KnowledgeChunkRecord = typeof knowledgeChunks.$inferSelect
export type LegalRuleVersionRecord = typeof legalRuleVersions.$inferSelect
export type ImportSessionRecord = typeof dataImportSessions.$inferSelect
export type ImportSnapshotRecord = typeof dataImportSnapshots.$inferSelect

export type UserSummary = UserSummaryPayload<Date>

export interface UserRepository {
  countUsers(): Promise<number>
  listDemoUsers(limit?: number): Promise<UserSummary[]>
  findUserByEmail(email: string): Promise<UserRecord | null>
  getAssistantProfile(userId: string): Promise<AssistantProfileRecord | null>
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
  /** Version of the amount rule (LR-130) that produced the result. */
  ruleVersionId?: string
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

/** One effective version of a rule, including its typed parameter payload. */
export interface LegalRuleParameterRecord {
  id: string
  code: string
  version: string
  effectiveFrom: string
  effectiveTo: string | null
  verificationStatus: "VERIFIED" | "UNVERIFIED" | "PROPOSED"
  parameters: Record<string, unknown>
}

export interface LegalRepository {
  countRules(): Promise<number>
  listRuleVersions(limit?: number): Promise<LegalRuleSummary[]>
  /**
   * Latest effective version of every active rule at `asOf`. The domain layer
   * turns these rows into a `RuleSet`; no legal value lives in application code.
   */
  getRuleParameters(asOf: string): Promise<LegalRuleParameterRecord[]>
}

export type { KnowledgeSourceSummary } from "@zpr/contracts/views"

export type { KnowledgeDocumentSummary } from "@zpr/contracts/views"

export type IngestionJobSummary = IngestionJobSummaryPayload<Date>

export type { EmbeddingModelSummary } from "@zpr/contracts/views"

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

export interface ConversationSummary {
  id: string
  title: string
  createdAt: Date
  updatedAt: Date
  isSimulated: boolean
  messageCount: number
}

export interface SaveTurnInput {
  conversationId: string
  /** Null when the user message is already stored (regenerate). */
  user: {
    content: string
    metadata: Record<string, unknown>
    createdAt: Date
  } | null
  assistant: {
    content: string
    model: string
    tokensIn: number | null
    tokensOut: number | null
    metadata: Record<string, unknown>
  }
  toolCalls: {
    toolName: string
    arguments: Record<string, unknown>
    result: Record<string, unknown>
    status: "SUCCEEDED" | "FAILED"
    latencyMs: number
  }[]
  evidence: { chunkId: string; rank: number; score: number; quote: string }[]
}

export interface ConversationRepository {
  countConversations(): Promise<number>
  createConversation(input: {
    id?: string
    ownerKey: string
    userId?: string | null
    title: string
    isSimulated?: boolean
  }): Promise<ConversationRecord>
  getConversation(id: string): Promise<ConversationRecord | null>
  getOwnedConversation(
    id: string,
    ownerKey: string
  ): Promise<ConversationRecord | null>
  listOwnedConversations(
    ownerKey: string,
    limit?: number
  ): Promise<ConversationSummary[]>
  listMessages(conversationId: string): Promise<ConversationMessageRecord[]>
  appendMessage(input: {
    conversationId: string
    role: "USER" | "ASSISTANT" | "SYSTEM" | "TOOL"
    content: string
    model?: string
    metadata?: Record<string, unknown>
  }): Promise<ConversationMessageRecord>
  saveTurn(input: SaveTurnInput): Promise<{ assistantMessageId: string }>
  deleteLastAssistantMessage(conversationId: string): Promise<boolean>
  deleteOwnedConversation(id: string, ownerKey: string): Promise<boolean>
  deleteAllOwned(ownerKey: string): Promise<number>
}

/** Confirmed facts for the assistant. Contains no names or contact data. */
export interface AssistantProfileRecord {
  userId: string
  aiAssistantConsent: boolean
  employmentType: "EMPLOYMENT" | "MANDATE" | "SELF_EMPLOYMENT" | "OTHER" | null
  coverageMode: "COMPULSORY" | "VOLUNTARY" | null
  insuranceStartDate: string | null
  insuranceEndDate: string | null
  contributionArrears: boolean | null
  pregnancySickLeave: boolean | null
  sickLeaveDays: number | null
  grossMonthlyAmountGrosze: number | null
  familyEvent: "PREGNANCY" | "BIRTH" | "ADOPTION" | "FOSTER_CARE" | null
  eventDate: string | null
  expectedDueDate: string | null
  childCount: number | null
  hasZaZyciem: boolean | null
  caseNumber: string | null
  updatedAt: Date | null
}

export interface CreateImportSessionInput {
  ownerKey: string
  personaId: string
  scenarioId: string
  scopes: DataScope[]
  engineVersion?: string
}

export interface SaveImportSnapshotInput {
  sessionId: string
  result: SourceFetchResult
  issues: SourceIssue[]
}

export interface AcceptImportSessionInput {
  sessionId: string
  ownerKey: string
  data: ImportedCaseData
  fieldSources: Record<string, unknown>
  summary: ImportSummary
}

export interface ImportRepository {
  createSession(input: CreateImportSessionInput): Promise<ImportSessionRecord>
  getOwnedSession(
    sessionId: string,
    ownerKey: string
  ): Promise<ImportSessionRecord | null>
  listSnapshots(sessionId: string): Promise<ImportSnapshotRecord[]>
  saveSnapshot(input: SaveImportSnapshotInput): Promise<ImportSnapshotRecord>
  markRunning(sessionId: string): Promise<void>
  markCompleted(sessionId: string): Promise<void>
  markSkipped(sessionId: string, ownerKey: string): Promise<boolean>
  acceptSession(input: AcceptImportSessionInput): Promise<ImportSessionRecord>
  findLatestAcceptedForUser(
    userId: string
  ): Promise<ImportSessionRecord | null>
  applyToUser(input: { sessionId: string; userId: string }): Promise<void>
}
