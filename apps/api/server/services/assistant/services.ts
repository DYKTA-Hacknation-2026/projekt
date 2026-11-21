import type { AssistantServices, ProfileAccess, ProfileSnapshot } from "@zpr/ai"
import { warsawToday } from "@zpr/ai"
import type { AssistantProfileRecord } from "@zpr/db/repositories"
import { groszeToPln, relevantDeadlines, type CaseFacts } from "@zpr/domain"
import { type RuleSet } from "@zpr/domain"
import {
  calculateParentalBenefits,
  compareBenefitScenarios,
  evaluateEligibility,
  generateBenefitTimeline,
  identifyRequiredDocuments,
} from "@zpr/domain/engine"

import type { Principal } from "@/server/auth/session"
import { getContainer } from "@/server/container"
import { searchKnowledge } from "@/server/services/knowledge"

/** Converts the stored record into minimised case facts. */
export function toProfileSnapshot(
  record: AssistantProfileRecord
): ProfileSnapshot {
  const facts: CaseFacts = {}
  if (record.employmentType) facts.employmentType = record.employmentType
  if (record.employmentType !== "EMPLOYMENT" && record.coverageMode) {
    // The wizard stores the coverage of the insurance period; for mandate and
    // self-employment, "VOLUNTARY" means voluntary sickness insurance.
    facts.sicknessInsurance =
      record.coverageMode === "VOLUNTARY" ? "VOLUNTARY" : undefined
  }
  if (record.insuranceStartDate)
    facts.insuranceStartDate = record.insuranceStartDate
  if (record.familyEvent) facts.familyEvent = record.familyEvent
  if (record.eventDate) facts.eventDate = record.eventDate
  if (record.expectedDueDate) facts.expectedDueDate = record.expectedDueDate
  if (record.childCount) facts.childrenCount = record.childCount
  if (record.hasZaZyciem !== null) facts.hasZaZyciem = record.hasZaZyciem
  for (const key of Object.keys(facts) as (keyof CaseFacts)[]) {
    if (facts[key] === undefined) delete facts[key]
  }
  return {
    facts,
    grossMonthlyIncomePln:
      record.grossMonthlyAmountGrosze && record.grossMonthlyAmountGrosze > 0
        ? groszeToPln(record.grossMonthlyAmountGrosze)
        : null,
    caseNumber: record.caseNumber,
    updatedAt: record.updatedAt?.toISOString() ?? null,
  }
}

/**
 * Profile access is decided here, outside the model:
 * the user must have enabled it for this request, the session must be bound
 * to a user, and that user must have consented to AI processing.
 */
export async function loadProfileFor(
  principal: Principal,
  profileEnabled: boolean
): Promise<ProfileAccess> {
  if (!profileEnabled) return { status: "NOT_ENABLED" }
  if (!principal.userId) return { status: "NOT_AUTHENTICATED" }
  const record = await getContainer().repositories.users.getAssistantProfile(
    principal.userId
  )
  if (!record) return { status: "NOT_FOUND" }
  if (!record.aiAssistantConsent) return { status: "CONSENT_REQUIRED" }
  return { status: "AVAILABLE", profile: toProfileSnapshot(record) }
}

export function createAssistantServices(input: {
  principal: Principal
  profileEnabled: boolean
  ruleSet: RuleSet
}): AssistantServices {
  const { ruleSet } = input
  return {
    today: () => warsawToday(),
    searchKnowledge: (query) =>
      searchKnowledge({
        query: query.query,
        limit: query.limit ?? 5,
        asOf: query.asOf,
        benefitTags: query.benefitTags,
        sourceTypes: query.sourceTypes,
      }),
    loadProfile: () => loadProfileFor(input.principal, input.profileEnabled),
    engine: {
      evaluateEligibility,
      calculateParentalBenefits,
      compareBenefitScenarios,
      generateBenefitTimeline,
      identifyRequiredDocuments,
    },
    deadlines: (facts, options) =>
      relevantDeadlines(facts, { ...options, ruleSet }),
  }
}
