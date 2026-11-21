import type { Intent, IntentClassification } from "./intent"
import type { TurnState } from "./turn"

/**
 * Suggested next questions shown as chips under an answer. They depend on
 * what this turn already covered, so the user is guided to the next step
 * (eligibility → amount → documents → deadlines) instead of repeating it.
 */

const NEXT: { covers: Intent[]; question: string }[] = [
  { covers: ["ELIGIBILITY", "NEXT_STEPS"], question: "Czy przysługuje mi zasiłek macierzyński?" },
  { covers: ["AMOUNT"], question: "Ile może wynieść mój zasiłek?" },
  { covers: ["DOCUMENTS", "SUBMISSION", "NEXT_STEPS"], question: "Jakie dokumenty muszę złożyć?" },
  { covers: ["DEADLINES", "NEXT_STEPS"], question: "Jakie terminy muszę pilnować?" },
  { covers: ["SCENARIOS"], question: "Jak podzielić urlop rodzicielski z drugim rodzicem?" },
  { covers: ["SUBMISSION"], question: "Gdzie mam złożyć wniosek?" },
  { covers: ["RISKS"], question: "Jakie są ryzyka utraty świadczenia?" },
  { covers: ["WORK_DURING_LEAVE"], question: "Czy mogę pracować na pół etatu podczas urlopu?" },
]

export function suggestFollowUps(
  intent: IntentClassification,
  turn: TurnState
): string[] {
  const covered = new Set<Intent>(intent.intents)
  if (turn.called("checkBenefitEligibility")) covered.add("ELIGIBILITY")
  if (turn.called("calculateBenefit")) covered.add("AMOUNT")
  if (turn.called("getRequiredDocuments")) {
    covered.add("DOCUMENTS")
    covered.add("SUBMISSION")
  }
  if (turn.called("getRelevantDeadlines")) covered.add("DEADLINES")
  if (turn.called("compareLeaveScenarios")) covered.add("SCENARIOS")

  if (intent.sensitive) {
    return [
      "Jakie wsparcie istnieje w szczególnej sytuacji rodzinnej?",
      "Jakie dokumenty muszę złożyć?",
    ]
  }

  return NEXT.filter(
    (item) => !item.covers.some((intentName) => covered.has(intentName))
  )
    .map((item) => item.question)
    .slice(0, 3)
}
