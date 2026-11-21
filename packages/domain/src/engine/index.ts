/**
 * @zpr/domain/engine — deterministic ZUS eligibility and parental benefits engine.
 *
 * Pure TypeScript: no I/O, no clock, no randomness, no LLM. Money is exact
 * (BigInt rationals) and rounded once per line; every rate, limit and deadline
 * comes from a versioned rule set that cites the official sources.
 */
export * from "./types"
export {
  evaluate,
  ENGINE_VERSION,
  BENEFIT_LABELS,
  type EvaluationResult,
} from "./evaluate"
export {
  evaluateEligibility,
  calculateParentalBenefits,
  generateBenefitTimeline,
  identifyRequiredDocuments,
  compareBenefitScenarios,
  type EligibilityReport,
  type TimelineReport,
  type DocumentsReport,
  type ScenarioInput,
  type ScenarioOutcome,
  type ScenarioComparisonReport,
} from "./services"
export {
  RULE_SETS,
  EARLIEST_SUPPORTED_DATE,
  latestRuleSet,
  ruleSetByVersion,
  ruleSetFor,
  withExternalParameters,
  type RuleSet,
  type RuleSetParameters,
  type ParameterMeta,
  type ExternalParameterOverride,
} from "./rulesets"
export { RULES, SOURCE_DOCUMENTS, formatSourceRef, type RuleId, type RuleDefinition, type SourceDocument } from "./sources"
export { ASSUMPTIONS, UNSUPPORTED_SCENARIOS, DISCLAIMER, ZUS_CONTACT } from "./context"
export { AssessmentInputError } from "./validation"
export type { EngineDocument, DocumentReport } from "./documents"
export { Ratio, ratio, formatGrosze } from "./decimal"
export { canonicalJson, sha256Hex } from "./hash"
