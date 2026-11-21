import type { UIMessage } from "ai"

import type {
  AssistantMetadata,
  EvidenceSource,
  GroundingReport,
} from "@zpr/contracts/assistant"
import type { SearchKnowledgeBaseInput } from "@zpr/contracts/assistant-tools"
import type { KnowledgeSearchResult } from "@zpr/contracts/knowledge"
import type {
  BenefitCode,
  CalculatorInput,
  CalculatorResult,
  CaseFacts,
  DeadlineReport,
  DeadlineTopic,
  DocumentChecklist,
  EligibilityAssessment,
  LeaveScenario,
  ScenarioBase,
  ScenarioComparison,
  TimelineInput,
  TimelinePlan,
} from "@zpr/domain"

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
  assessEligibility(
    facts: CaseFacts,
    options: { asOf: string; benefits?: readonly BenefitCode[] }
  ): EligibilityAssessment
  calculate(input: CalculatorInput): CalculatorResult
  compareScenarios(
    base: ScenarioBase,
    scenarios: readonly LeaveScenario[]
  ): ScenarioComparison
  requiredDocuments(benefit: BenefitCode, facts: CaseFacts): DocumentChecklist
  deadlines(
    facts: CaseFacts,
    options: { topics?: readonly DeadlineTopic[] }
  ): DeadlineReport
  timeline(input: TimelineInput): TimelinePlan
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
