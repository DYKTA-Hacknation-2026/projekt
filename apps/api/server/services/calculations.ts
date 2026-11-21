import type { CalculationRequest } from "@zpr/contracts/calculator"
import { calculateBenefits } from "@zpr/domain"

import { getContainer } from "@/server/container"

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
  const result = calculateBenefits(request.input)

  let calculationId: string | null = null

  if (request.save) {
    const saved = await repositories.benefits.saveCalculation({
      caseId: request.caseId,
      input: { ...request.input },
      result: JSON.parse(JSON.stringify(result)) as Record<string, unknown>,
      totalAmountGrosze: result.totalGrosze,
      // "NOT_ELIGIBLE" is a valid, fully computed outcome (stored in the result JSON).
      status: result.status === "NOT_ELIGIBLE" ? "OK" : result.status,
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
