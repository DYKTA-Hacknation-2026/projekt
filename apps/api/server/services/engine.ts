import { warsawToday } from "@zpr/ai"
import {
  scenarioComparisonSchema,
  toAssessmentInput,
  type AssessmentRequest,
} from "@zpr/contracts/engine"
import {
  AssessmentInputError,
  calculateParentalBenefits,
  compareBenefitScenarios,
  evaluateEligibility,
  generateBenefitTimeline,
  identifyRequiredDocuments,
} from "@zpr/domain/engine"
import type { z } from "zod"

import { AppError } from "@zpr/contracts/problem"

/**
 * Application services for the deterministic engine endpoints. The engine is
 * pure; this layer only supplies "today" (Europe/Warsaw) and maps structural
 * input errors to HTTP 422. Nothing is persisted.
 */

function run<T>(body: () => T): T {
  try {
    return body()
  } catch (error) {
    if (error instanceof AssessmentInputError) {
      throw new AppError(422, "VALIDATION_ERROR", "Dane wejściowe są niespójne.", { issues: error.issues.map((message) => ({ path: "(root)", message })) })
    }
    if (error instanceof RangeError || error instanceof TypeError) {
      throw new AppError(422, "VALIDATION_ERROR", error.message)
    }
    throw error
  }
}

const input = (request: AssessmentRequest) => toAssessmentInput(request, warsawToday())

export const engineService = {
  eligibility: (request: AssessmentRequest) => run(() => evaluateEligibility(input(request))),
  calculate: (request: AssessmentRequest) => run(() => calculateParentalBenefits(input(request))),
  timeline: (request: AssessmentRequest) => run(() => generateBenefitTimeline(input(request))),
  documents: (request: AssessmentRequest) => run(() => identifyRequiredDocuments(input(request))),
  compare: (request: z.infer<typeof scenarioComparisonSchema>) =>
    run(() => {
      const { scenarios, ...base } = request
      return compareBenefitScenarios({ ...base, asOf: base.asOf ?? warsawToday() }, scenarios)
    }),
}
