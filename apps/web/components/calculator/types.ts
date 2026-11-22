import type { CalculatorResult } from "@zpr/domain"
import type { CalculatorComparison } from "@zpr/domain"

export interface CalculationResponseBody {
  calculationId: string | null
  saved: boolean
  engineVersion: string
  simulated?: true
  result: CalculatorResult
  detail?: string
  issues?: Array<{ path: string; message: string }>
}

export interface ComparisonResponseBody {
  engineVersion: string
  simulated: true
  comparison: CalculatorComparison
  detail?: string
  issues?: Array<{ path: string; message: string }>
}
