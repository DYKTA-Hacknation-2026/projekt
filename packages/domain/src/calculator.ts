/**
 * The public calculator API. Calculation itself lives in `calculator-engine`,
 * which is an adapter over the authoritative deterministic engine.
 *
 * `calculatorToAssessmentInput` and `calculateEngineBenefits` remain exported
 * for existing callers; new code should use `calculateBenefits`.
 */
export { calculateBenefits } from "./calculator-engine"
export {
  calculatorToAssessmentInput,
  calculatorToLeavePlan,
  calculateEngineBenefits,
} from "./engine-calculator"
