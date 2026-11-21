import type { TurnState } from "./turn"
import type { AssistantToolName } from "./types"

export type PolicyDecision =
  | { kind: "force"; toolName: AssistantToolName }
  | { kind: "auto" }
  | { kind: "answer" }

export const MAX_FORCED_ATTEMPTS = 2

/**
 * Tool-selection policy. Each step, the first required tool that has not run
 * yet is forced (`toolChoice: { type: "tool" }`), so the language model cannot
 * skip retrieval or a deterministic service. The last step forbids tools, so
 * the turn always ends with an answer.
 */
export function decideStep(input: {
  stepNumber: number
  maxSteps: number
  required: readonly AssistantToolName[]
  turn: TurnState
  /** How many times each tool was already forced this turn. */
  attempts: Map<AssistantToolName, number>
}): PolicyDecision {
  if (input.stepNumber >= input.maxSteps - 1) return { kind: "answer" }
  // A call rejected by schema validation never reaches `execute`; after two
  // forced attempts the model answers with what it has instead of looping.
  const pending = input.required.find(
    (name) =>
      !input.turn.called(name) &&
      (input.attempts.get(name) ?? 0) < MAX_FORCED_ATTEMPTS
  )
  if (pending) {
    input.attempts.set(pending, (input.attempts.get(pending) ?? 0) + 1)
    return { kind: "force", toolName: pending }
  }
  return { kind: "auto" }
}
