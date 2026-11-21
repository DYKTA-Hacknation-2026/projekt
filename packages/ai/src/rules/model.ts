import type {
  LanguageModelV4,
  LanguageModelV4CallOptions,
  LanguageModelV4Content,
  LanguageModelV4StreamPart,
  LanguageModelV4Usage,
} from "@ai-sdk/provider"

import type { BenefitCode } from "@zpr/domain"

import type { IntentClassification } from "../intent"
import type { TurnState } from "../turn"
import type { AssistantToolName } from "../types"
import { composeAnswer } from "./compose"
import { extractFacts, type ExtractedFacts } from "./extract-facts"

export const RULES_MODEL_ID = "zpr-rules-1"

/**
 * Offline "language model" used when no LLM provider is configured.
 *
 * It plugs into the same `streamText` loop as a real model: on the first step
 * it requests the tools chosen by the deterministic intent classifier (with
 * arguments from the explicit fact extractor); once tool results exist it
 * composes the answer from them. Retrieval, services, guards, streaming and
 * persistence are therefore identical in both modes.
 */

const USAGE: LanguageModelV4Usage = {
  inputTokens: { total: 0, noCache: 0, cacheRead: undefined, cacheWrite: undefined },
  outputTokens: { total: 0, text: 0, reasoning: undefined },
}

function chooseBenefits(text: string, extracted: ExtractedFacts): BenefitCode[] {
  const lower = text.toLowerCase()
  const benefits: BenefitCode[] = []
  if (/(l-?4|zwolnieni|chorobow)/.test(lower)) benefits.push("SICKNESS_IN_PREGNANCY")
  if (/(ojcowsk)/.test(lower) || (extracted.facts.parentRole === "FATHER" && !/(przej|rodzicielsk)/.test(lower))) {
    benefits.push("PATERNITY_BENEFIT")
  }
  if (/(rodzicielsk|przej|podzie)/.test(lower)) benefits.push("PARENTAL_LEAVE_BENEFIT")
  if (/(macierzy[nń]sk|zasi[lł]e?k|urlop|ryzyk|utrat|strac)/.test(lower) || benefits.length === 0) {
    if (extracted.facts.parentRole !== "FATHER" || /macierzy/.test(lower)) benefits.unshift("MATERNITY_ALLOWANCE")
  }
  if (extracted.facts.familyEvent === "PREGNANCY" && /(co\s+(powinn|musz|mam|trzeba)|kroki|dalej)/.test(lower) && !benefits.includes("SICKNESS_IN_PREGNANCY")) {
    benefits.push("SICKNESS_IN_PREGNANCY")
  }
  return [...new Set(benefits)].slice(0, 4)
}

function primaryBenefit(text: string, extracted: ExtractedFacts): BenefitCode {
  return chooseBenefits(text, extracted)[0] ?? "MATERNITY_ALLOWANCE"
}

const STOPWORDS = new Set(
  "czy mi mnie mam masz jest jestem jak jaki jaka jakie jakich gdzie kiedy ile się i w we na do od o z ze za to ten ta te co a ale lub oraz że by być mogę może moja mój moje moim nas nam was ich jej jego po przy dla tak nie już też tylko bardzo powinnam powinienem zrobić muszę trzeba".split(" ")
)

/** Legal vocabulary per intent: the knowledge base is written in it. */
const INTENT_TERMS: Partial<Record<IntentClassification["intents"][number], string>> = {
  ELIGIBILITY: "zasiłek macierzyński przysługuje ubezpieczenie chorobowe",
  NEXT_STEPS: "zasiłek macierzyński przysługuje ubezpieczenie chorobowe wniosek",
  DURATION: "wymiar urlopu macierzyńskiego rodzicielskiego tygodni",
  SCENARIOS: "podział urlopu rodzicielskiego wyłączne prawo drugi rodzic rezygnacja",
  WORK_DURING_LEAVE: "łączenie urlopu rodzicielskiego z pracą wymiar czasu pracy",
  DOCUMENTS: "wniosek zaświadczenie płatnika składek ZAM odpis aktu urodzenia",
  SUBMISSION: "jak złożyć wniosek eZUS płatnik ZUS wypłaca",
  DEADLINES: "termin wniosek przedawnienie roszczenia",
  RISKS: "przedawnienie roszczenia o wypłatę zasiłku",
  SPECIAL_SITUATION: "urodzenie martwego dziecka zgon dziecka Za życiem wsparcie organizacje",
  AMOUNT: "wysokość zasiłku macierzyńskiego podstawy wymiaru",
}

const FATHER_WORD =
  /(^|[^a-ząćęłńóśźż])(tata|taty|tacie|tatą|ojciec|ojca|ojcu|ojcem|mąż|męża|mężowi|partner\w*)(?![a-ząćęłńóśźż])/

const TITLE_TERMS: Record<string, string> = {
  SELF_EMPLOYMENT: "działalność gospodarcza dobrowolne ubezpieczenie chorobowe",
  MANDATE: "umowa zlecenia dobrowolne ubezpieczenie chorobowe",
  EMPLOYMENT: "pracownik",
}

/**
 * Rewrites the question into knowledge-base vocabulary (an LLM does this on
 * its own). Short follow-ups ("a przy bliźniętach?") inherit the previous
 * question's content words.
 */
export function rulesSearchQuery(
  userTexts: readonly string[],
  intent: IntentClassification,
  extracted: ExtractedFacts
): string {
  const last = userTexts.at(-1) ?? ""
  const previous = userTexts.at(-2)
  const base = last.length < 45 && previous ? `${previous} ${last}` : last
  const content = (base.toLowerCase().match(/[a-ząćęłńóśźż0-9-]+/g) ?? [])
    .filter((word) => word.length > 2 && !STOPWORDS.has(word))
  const specific = intent.intents.filter((name) => name !== "GENERAL_LEGAL")
  const terms = [
    ...specific.map((name) => INTENT_TERMS[name]).filter(Boolean),
    extracted.facts.employmentType ? TITLE_TERMS[extracted.facts.employmentType] : undefined,
    FATHER_WORD.test(base.toLowerCase()) ? "urlop ojcowski ojciec" : undefined,
  ].filter(Boolean)
  const words = [...new Set([...content, ...terms.join(" ").split(" ")])]
  return words.join(" ").slice(0, 300)
}

export function plannedToolInput(
  name: AssistantToolName,
  userTexts: readonly string[],
  today: string,
  intent: IntentClassification
): Record<string, unknown> {
  const text = userTexts.at(-1) ?? ""
  const extracted = extractFacts(userTexts, today)
  const facts = extracted.facts
  switch (name) {
    case "searchKnowledgeBase":
      return { query: rulesSearchQuery(userTexts, intent, extracted) }
    case "getUserInsuranceProfile":
      return {}
    case "checkBenefitEligibility":
      return { benefits: chooseBenefits(text, extracted), facts }
    case "calculateBenefit":
      return {
        ...(extracted.grossMonthlyIncomePln !== undefined ? { grossMonthlyIncomePln: extracted.grossMonthlyIncomePln } : {}),
        ...(facts.childrenCount ? { childrenCount: Math.min(facts.childrenCount, 5) } : {}),
        ...(facts.hasZaZyciem !== undefined ? { hasZaZyciem: facts.hasZaZyciem } : {}),
        ...(extracted.prefersFlatRate ? { paymentOption: "FLAT_81_5" } : {}),
        ...(extracted.secondParentWeeks !== undefined ? { secondParentParentalWeeks: extracted.secondParentWeeks } : {}),
        ...(extracted.parentalWorkFraction !== undefined ? { parentalWorkFraction: extracted.parentalWorkFraction } : {}),
      }
    case "compareLeaveScenarios":
      return {
        ...(extracted.grossMonthlyIncomePln !== undefined ? { grossMonthlyIncomePln: extracted.grossMonthlyIncomePln } : {}),
        ...(facts.childrenCount ? { childrenCount: Math.min(facts.childrenCount, 5) } : {}),
        ...(facts.expectedDueDate ?? facts.eventDate ? { dueDate: facts.eventDate ?? facts.expectedDueDate } : {}),
        scenarios: [
          { name: "Mama wykorzystuje całą pulę", secondParentParentalWeeks: 0, paternityDays: 14 },
          { name: "Tata bierze swoje 9 tygodni", secondParentParentalWeeks: 9, paternityDays: 14 },
          { name: "Wariant 81,5% i 9 tygodni taty", paymentOption: "FLAT_81_5", secondParentParentalWeeks: 9, paternityDays: 14 },
        ],
      }
    case "getRequiredDocuments":
      return { benefit: primaryBenefit(text, extracted), facts }
    case "getRelevantDeadlines": {
      const topics = new Set<string>()
      if (intent.intents.includes("WORK_DURING_LEAVE")) {
        topics.add("WORK_COMBINATION")
        topics.add("PARENTAL")
      }
      if (intent.intents.includes("RISKS")) topics.add("PAYMENT")
      // An explicit deadline question gets every deadline.
      if (intent.intents.includes("DEADLINES") || intent.intents.includes("NEXT_STEPS")) topics.clear()
      return { facts, ...(topics.size ? { topics: [...topics] } : {}) }
    }
    case "getBenefitTimeline":
      return {
        ...(facts.eventDate ?? facts.expectedDueDate ? { dueDate: facts.eventDate ?? facts.expectedDueDate } : {}),
        ...(facts.childrenCount ? { childrenCount: Math.min(facts.childrenCount, 5) } : {}),
        ...(extracted.secondParentWeeks !== undefined ? { secondParentParentalWeeks: extracted.secondParentWeeks } : {}),
      }
  }
}

function chunkText(text: string): string[] {
  return text.match(/\S+\s*/g) ?? [text]
}

export interface RulesModelOptions {
  turn: TurnState
  intent: IntentClassification
  /** All user messages of the conversation, oldest first (already scrubbed). */
  userTexts: readonly string[]
  injectionSuspected: boolean
}

export function createRulesModel(options: RulesModelOptions): LanguageModelV4 {
  let callCount = 0

  function plan(call: LanguageModelV4CallOptions): LanguageModelV4Content[] {
    callCount += 1
    const lastRole = call.prompt.at(-1)?.role
    const forced = call.toolChoice?.type === "tool" ? (call.toolChoice.toolName as AssistantToolName) : null
    const toolsAllowed = call.toolChoice?.type !== "none"

    const pending: AssistantToolName[] = forced
      ? [forced]
      : lastRole === "user"
        ? options.intent.requiredTools
        : []

    if (toolsAllowed && pending.length > 0) {
      const calls: LanguageModelV4Content[] = []
      for (const name of pending.filter((tool) => !options.turn.called(tool))) {
        const input = plannedToolInput(name, options.userTexts, options.turn.asOf, options.intent)
        calls.push({
          type: "tool-call",
          toolCallId: `rules-${callCount}-${calls.length + 1}`,
          toolName: name,
          input: JSON.stringify(input),
        })
        // Retrieval runs twice: in knowledge-base vocabulary and in the
        // user's own words. The evidence ledger merges duplicate passages.
        const raw = (options.userTexts.at(-1) ?? "").trim().slice(0, 300)
        if (name === "searchKnowledgeBase" && raw.length >= 3 && raw !== input.query) {
          calls.push({
            type: "tool-call",
            toolCallId: `rules-${callCount}-${calls.length + 1}`,
            toolName: name,
            input: JSON.stringify({ query: raw, limit: 3 }),
          })
        }
      }
      return calls
    }

    return [
      {
        type: "text" as const,
        text: composeAnswer({
          turn: options.turn,
          intent: options.intent,
          question: options.userTexts.at(-1) ?? "",
          injectionSuspected: options.injectionSuspected,
        }),
      },
    ]
  }

  return {
    specificationVersion: "v4",
    provider: "zpr",
    modelId: RULES_MODEL_ID,
    supportedUrls: {},
    async doGenerate(call) {
      const content = plan(call)
      const hasTools = content.some((part) => part.type === "tool-call")
      return {
        content,
        finishReason: { unified: hasTools ? "tool-calls" : "stop", raw: undefined },
        usage: USAGE,
        warnings: [],
      }
    },
    async doStream(call) {
      const content = plan(call)
      const hasTools = content.some((part) => part.type === "tool-call")
      const parts: LanguageModelV4StreamPart[] = [{ type: "stream-start", warnings: [] }]
      for (const part of content) {
        if (part.type === "tool-call") {
          parts.push(part)
        } else if (part.type === "text") {
          parts.push({ type: "text-start", id: "text-1" })
          for (const delta of chunkText(part.text)) {
            parts.push({ type: "text-delta", id: "text-1", delta })
          }
          parts.push({ type: "text-end", id: "text-1" })
        }
      }
      parts.push({
        type: "finish",
        finishReason: { unified: hasTools ? "tool-calls" : "stop", raw: undefined },
        usage: USAGE,
      })
      const stream = new ReadableStream<LanguageModelV4StreamPart>({
        start(controller) {
          for (const part of parts) controller.enqueue(part)
          controller.close()
        },
      })
      return { stream }
    },
  }
}
