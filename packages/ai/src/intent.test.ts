import { describe, expect, it } from "vitest"

import { classifyIntent } from "./intent"

/**
 * Tool selection for the supported interactions. The policy forces these
 * tools whatever the language model does, so this table is the contract.
 */
const CASES: { question: string; tools: string[]; forbidden?: string[] }[] = [
  {
    question: "Czy przysługuje mi zasiłek macierzyński?",
    tools: ["searchKnowledgeBase", "checkBenefitEligibility"],
    forbidden: ["calculateBenefit"],
  },
  {
    question: "Jestem na B2B i jestem w ciąży. Co powinnam zrobić?",
    tools: ["searchKnowledgeBase", "checkBenefitEligibility", "getRequiredDocuments", "getRelevantDeadlines"],
  },
  { question: "Jak długo mogę pobierać zasiłek?", tools: ["searchKnowledgeBase"], forbidden: ["calculateBenefit"] },
  { question: "Czy tata może przejąć część urlopu?", tools: ["searchKnowledgeBase", "compareLeaveScenarios"] },
  { question: "Jak podzielić urlop rodzicielski?", tools: ["searchKnowledgeBase", "compareLeaveScenarios"] },
  { question: "Czy mogę pracować na pół etatu podczas urlopu?", tools: ["searchKnowledgeBase"] },
  { question: "Jakie dokumenty muszę złożyć?", tools: ["searchKnowledgeBase", "getRequiredDocuments"] },
  { question: "Gdzie mam wysłać formularz?", tools: ["searchKnowledgeBase", "getRequiredDocuments"] },
  { question: "Jakie są ryzyka utraty świadczenia?", tools: ["searchKnowledgeBase", "checkBenefitEligibility"] },
  { question: "Jakie wsparcie istnieje w szczególnej sytuacji rodzinnej?", tools: ["searchKnowledgeBase"] },
  { question: "Ile wyniesie mój zasiłek przy 8000 zł brutto?", tools: ["searchKnowledgeBase", "calculateBenefit"] },
  { question: "Do kiedy muszę złożyć wniosek o 81,5%?", tools: ["getRelevantDeadlines", "compareLeaveScenarios"] },
  { question: "Kiedy kończy się mój urlop, jeśli termin porodu to 10 marca 2027?", tools: ["getBenefitTimeline"] },
]

describe("classifyIntent → required tools", () => {
  for (const testCase of CASES) {
    it(testCase.question, () => {
      const result = classifyIntent(testCase.question)
      for (const tool of testCase.tools) expect(result.requiredTools).toContain(tool)
      for (const tool of testCase.forbidden ?? []) expect(result.requiredTools).not.toContain(tool)
      expect(result.legal).toBe(true)
    })
  }

  it("always retrieves before a legal answer", () => {
    for (const testCase of CASES) {
      expect(classifyIntent(testCase.question).requiredTools[0]).toBe("searchKnowledgeBase")
    }
  })

  it("marks loss situations as sensitive", () => {
    expect(classifyIntent("Urodziłam martwe dziecko. Co mi przysługuje?").sensitive).toBe(true)
    expect(classifyIntent("Jakie dokumenty muszę złożyć?").sensitive).toBe(false)
  })

  it("does not force tools for out-of-scope questions", () => {
    const result = classifyIntent("Jaki jest przepis na sernik?")
    expect(result.outOfScope).toBe(true)
    expect(result.requiredTools).toEqual([])
  })
})
