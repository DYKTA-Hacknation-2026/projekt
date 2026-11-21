import { latestRuleSet, type RuleSet as EngineRuleSet } from "./engine/rulesets"
import type { RuleSet } from "./rule-set"

/** Overlay the editable database parameters on the engine's detailed legal rules. */
export function calculatorRules(rules?: RuleSet): EngineRuleSet {
  const result = structuredClone(latestRuleSet())
  if (!rules) return result
  result.version = rules.version
  result.effectiveFrom = rules.effectiveFrom
  result.effectiveTo = rules.effectiveTo
  const p = result.parameters
  p.maternity.weeksByChildren = {
    ...rules.maternity.weeksByChildren,
  } as typeof p.maternity.weeksByChildren
  p.maternityTerms.weeksByChildren = { ...p.maternity.weeksByChildren }
  p.maternity.maxPreBirthWeeks = rules.maternity.maxPreBirthWeeks
  p.maternity.motherPersonalWeeks = rules.maternity.motherPersonalWeeks
  p.parental.poolWeeks = { ...rules.parental.poolWeeks }
  p.parental.nonTransferableWeeks = rules.parental.nonTransferableWeeks
  p.parental.maxWorkFraction = String(rules.parental.maxWorkFraction)
  p.parental.maxParts = rules.parental.maxParts
  p.parental.lastYearChildAge = rules.parental.deadlineChildAgeYears
  p.paternity.maxDays = rules.paternity.days
  p.paternity.maxParts = rules.paternity.maxParts
  p.paternity.minPartDays = rules.paternity.minPartDays
  p.paternity.deadlineChildAgeMonths = rules.paternity.deadlineMonths
  p.basis.referenceMonths = rules.basis.referenceMonths
  p.basis.contributionDeduction = String(rules.basis.contributionDeduction)
  p.basis.dailyDivisor = rules.basis.dailyDivisor
  for (const key of [
    "maternity",
    "maternityTerms",
    "supplementary",
    "paternity",
    "preBirth",
    "maternityEquivalent",
  ] as const) {
    p.rates[key] = String(rules.maternity.rate)
  }
  p.rates.parental = String(rules.parental.rate)
  p.rates.otherParentReserved = String(rules.parental.rate)
  p.rates.flat = String(rules.parental.flatRate)
  p.rates.flatApplicationDays = rules.deadlines.flatRateApplicationDays
  p.sickness.waitingDaysCompulsory = rules.coverage.compulsoryDays
  p.sickness.waitingDaysVoluntary = rules.coverage.voluntaryDays
  p.sickness.priorPeriodGapToleranceDays = rules.coverage.gapToleranceDays
  p.sickness.employerPaidDays = rules.coverage.employerPaidDays
  p.sickness.employerPaidDaysAfter50 = rules.coverage.employerPaidDaysAfter50
  p.sickness.maxPeriodDays = rules.sickness.maxPeriodDays
  p.debt.thresholdShareOfMinimumWage = String(
    rules.debt.thresholdShareOfMinWage
  )
  p.debt.expiryMonths = rules.debt.expiryMonths
  p.debt.paymentAfterRepaymentDays = rules.debt.payAfterRepaymentDays
  p.payer.selfPayingAboveInsured = rules.payer.selfPayThreshold
  p.deadlines.preBirthRequestDays = rules.deadlines.maternityPreBirthRequestDays
  p.deadlines.resignationNoticeDays =
    rules.deadlines.maternityResignationNoticeDays
  p.deadlines.parentalNoticeDays = rules.deadlines.parentalRequestNoticeDays
  p.deadlines.workCombinationNoticeDays =
    rules.deadlines.workCombinationNoticeDays
  p.deadlines.paternityNoticeDays = rules.deadlines.paternityRequestNoticeDays
  p.deadlines.maternityTermsRequestDays = rules.deadlines.adoptionRequestDays
  p.deadlines.maternityTermsStartMaxDays = rules.deadlines.adoptionStartMaxDays
  p.deadlines.smallPayerForwardDays = rules.deadlines.employerForwardingDays
  p.deadlines.zusPaymentDays = rules.deadlines.zusPaymentDays
  p.deadlines.claimExpiryMonths = rules.deadlines.limitationMonths
  p.external.parentalBenefitAmountGrosze =
    rules.minimum.parentalBenefitAmountGrosze
  return result
}
