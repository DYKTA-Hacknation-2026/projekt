import type { UIMessage } from "ai"

import type {
  AssistantMetadata,
  EvidenceSource,
  GroundingReport,
} from "@zpr/contracts/assistant"
import type { SearchKnowledgeBaseInput } from "@zpr/contracts/assistant-tools"
import type { KnowledgeSearchResult } from "@zpr/contracts/knowledge"
import type { CaseFacts, DeadlineReport, DeadlineTopic } from "@zpr/domain"
import type {
  Assessment,
  AssessmentInput,
  DocumentsReport,
  EligibilityReport,
  ScenarioComparisonReport,
  ScenarioInput,
  TimelineReport,
} from "@zpr/domain/engine"

/**
 * The deterministic engine, injected as a port. The assistant never computes
 * eligibility, periods or amounts itself — every number comes from here.
 */
export interface EngineServices {
  evaluateEligibility(input: AssessmentInput): EligibilityReport
  calculateParentalBenefits(input: AssessmentInput): Assessment
  compareBenefitScenarios(base: Omit<AssessmentInput, "plan">, scenarios: readonly ScenarioInput[]): ScenarioComparisonReport
  generateBenefitTimeline(input: AssessmentInput): TimelineReport
  identifyRequiredDocuments(input: AssessmentInput): DocumentsReport
}

export const ASSISTANT_TOOL_NAMES = [
  "searchKnowledgeBase",
  "getUserInsuranceProfile",
  "checkBenefitEligibility",
  "calculateBenefit",
  "compareLeaveScenarios",
  "getRequiredDocuments",
  "getRelevantDeadlines",
  "getBenefitTimeline",
] as const

export type AssistantToolName = (typeof ASSISTANT_TOOL_NAMES)[number]

/** Minimised, confirmed profile facts. No names, contact data or health details. */
export interface ProfileSnapshot {
  facts: CaseFacts
  grossMonthlyIncomePln: number | null
  caseNumber: string | null
  updatedAt: string | null
}

export type ProfileAccess =
  | { status: "AVAILABLE"; profile: ProfileSnapshot }
  | {
      status:
        | "NOT_ENABLED"
        | "NOT_AUTHENTICATED"
        | "CONSENT_REQUIRED"
        | "NOT_FOUND"
    }

/**
 * Application services the assistant may call. The web app implements this
 * port; the tools never see a database handle. `loadProfile` is already bound
 * to the authenticated principal — no tool can ask for another user's data.
 */
export interface AssistantServices {
  today(): string
  searchKnowledge(input: SearchKnowledgeBaseInput): Promise<KnowledgeSearchResult>
  loadProfile(): Promise<ProfileAccess>
  engine: EngineServices
  /** Catalogue of statutory deadlines (dates only, no eligibility), parameters from the rule set. */
  deadlines(
    facts: CaseFacts,
    options: { topics?: readonly DeadlineTopic[] }
  ): DeadlineReport
}

export interface AssistantDataParts {
  evidence: { sources: EvidenceSource[] }
  grounding: GroundingReport
  followups: { questions: string[] }
  [key: string]: unknown
}

export type AssistantMessageMetadata = AssistantMetadata & {
  redactions?: { kind: string; count: number }[]
  aborted?: boolean
}

/** UI message exchanged between the chat route and `useChat`. */
export type AssistantUIMessage = UIMessage<
  AssistantMessageMetadata,
  AssistantDataParts
>

export interface ToolCallRecord {
  toolCallId: string
  toolName: AssistantToolName
  input: unknown
  output: unknown
  status: "SUCCEEDED" | "FAILED"
  latencyMs: number
}
