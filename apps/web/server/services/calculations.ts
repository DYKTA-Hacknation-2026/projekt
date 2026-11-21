import type { CalculationRequest } from "@zpr/contracts/calculator"
import { calculateBenefits, RULE_CODES } from "@zpr/domain"

import { getContainer } from "@/server/container"
import { getActiveRuleSet } from "@/server/services/rule-set"

export interface CalculationResponse {
  calculationId: string | null
  saved: boolean
  engineVersion: string
  simulated: true
  result: ReturnType<typeof calculateBenefits>
}

const ENGINE_VERSION = "0.1.0-scaffold"

export async function runCalculation(
  request: CalculationRequest
): Promise<CalculationResponse> {
  const { repositories } = getContainer()
  const ruleSet = await getActiveRuleSet()
  const result = calculateBenefits(request.input, ruleSet)

  let calculationId: string | null = null

  if (request.save) {
    const saved = await repositories.benefits.saveCalculation({
      caseId: request.caseId,
      ruleVersionId: ruleSet.versionIds[RULE_CODES.rates],
      input: { ...request.input },
      result: JSON.parse(JSON.stringify(result)) as Record<string, unknown>,
      totalAmountGrosze: result.totalGrosze,
      status: result.status,
      engineVersion: ENGINE_VERSION,
    })
    calculationId = saved.id
  }

  return {
    calculationId,
    saved: request.save,
    engineVersion: ENGINE_VERSION,
    simulated: true,
    result,
  }
}
