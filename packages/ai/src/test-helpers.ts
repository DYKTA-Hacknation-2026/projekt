import type { SearchKnowledgeBaseInput } from "@zpr/contracts/assistant-tools"
import type {
  KnowledgeChunkResult,
  KnowledgeSearchResult,
} from "@zpr/contracts/knowledge"
import {
  assessEligibility,
  buildTimeline,
  calculateBenefits,
  compareLeaveScenarios,
  relevantDeadlines,
  requiredDocuments,
  type RuleSet,
} from "@zpr/domain"
import { testRuleSet } from "@zpr/domain/testing"

import type { AssistantServices, ProfileAccess } from "./types"

/** Test-only fakes. Domain services are the real ones; retrieval is scripted. */

let sequence = 0

export function chunk(
  overrides: Partial<KnowledgeChunkResult> = {}
): KnowledgeChunkResult {
  sequence += 1
  const id = `01900000-0000-7000-8000-${String(900_000 + sequence).padStart(12, "0")}`
  return {
    id,
    documentId: "01900000-0000-7000-8000-000000000201",
    content:
      "Art. 180 § 1. Pracownicy przysługuje urlop macierzyński w wymiarze 20 tygodni w przypadku urodzenia jednego dziecka przy jednym porodzie.",
    sourceId: "01900000-0000-7000-8000-000000000101",
    sourceSlug: "kodeks-pracy",
    sourceTitle: "Kodeks pracy",
    sourceType: "LEGAL_ACT",
    sourceUrl: "https://isap.sejm.gov.pl/",
    documentTitle: "Kodeks pracy — Dział VIII",
    documentVersion: "2026",
    externalId: null,
    headingPath: "Art. 180",
    pageNumber: 3,
    pageEnd: 3,
    sectionIdentifier: "Art. 180 § 1",
    legalReference: "KP art. 180 § 1",
    validFrom: "2026-01-01",
    validTo: null,
    accessLevel: "PUBLIC",
    redistribution: "ALLOWED",
    authorityRank: 100,
    benefitTags: ["MATERNITY"],
    score: 0.03,
    relevance: {
      score: 0.03,
      relevance: 0.8,
      vectorSimilarity: 0.5,
      lexicalScore: 2,
      coverage: 0.8,
      exactTerms: [],
      ranks: { vector: 1, lexical: 1 },
    },
    ...overrides,
  }
}

export interface FakeServicesOptions {
  chunks?: KnowledgeChunkResult[]
  profile?: ProfileAccess
  searchError?: boolean
  today?: string
  ruleSet?: RuleSet
}

export function fakeServices(options: FakeServicesOptions = {}) {
  const searches: SearchKnowledgeBaseInput[] = []
  const ruleSet = options.ruleSet ?? testRuleSet()
  let profileLoads = 0
  const services: AssistantServices = {
    today: () => options.today ?? "2026-11-21",
    async searchKnowledge(input): Promise<KnowledgeSearchResult> {
      searches.push(input)
      if (options.searchError) throw new Error("connection refused")
      const results = options.chunks ?? [chunk()]
      return {
        status: results.length ? "OK" : "NO_EVIDENCE",
        query: input.query,
        asOf: input.asOf ?? "2026-11-21",
        exactTerms: [],
        redactions: [],
        noEvidence: results.length
          ? null
          : {
              reason: "NO_MATCH",
              message:
                "W bazie wiedzy nie ma fragmentu, który dotyczy tego pytania.",
            },
        embeddingModel: null,
        results,
      }
    },
    async loadProfile() {
      profileLoads += 1
      return options.profile ?? { status: "NOT_ENABLED" }
    },
    assessEligibility: (facts, eligibilityOptions) =>
      assessEligibility(facts, { ...eligibilityOptions, ruleSet }),
    calculate: (calculatorInput) => calculateBenefits(calculatorInput, ruleSet),
    compareScenarios: (base, scenarios) =>
      compareLeaveScenarios(base, scenarios, ruleSet),
    requiredDocuments: (benefit, facts) =>
      requiredDocuments(benefit, facts, ruleSet),
    deadlines: (facts, deadlineOptions) =>
      relevantDeadlines(facts, { ...deadlineOptions, ruleSet }),
    timeline: (timelineInput) => buildTimeline(timelineInput, ruleSet),
  }
  return {
    services,
    searches,
    get profileLoads() {
      return profileLoads
    },
  }
}

let ids = 0
export const nextId = () => `msg-${++ids}`
