import { z } from "zod"

import type { engine } from "@zpr/domain"

import { isoDateSchema } from "./common"

/**
 * Request schemas of the deterministic engine endpoints
 * (`/api/v1/eligibility/evaluate`, `/benefits/calculate`, `/scenarios/compare`,
 * `/timeline`, `/documents/required`) and of the engine-backed assistant tools.
 *
 * Money is integer grosze. Fractions (work time) are decimal strings such as
 * "0.5" — numbers are accepted and converted from their shortest decimal form,
 * never used as binary floating-point values in calculations.
 */

const grosze = z.number().int().min(0).max(10_000_000_000)
const positiveGrosze = z.number().int().min(1).max(10_000_000_000)
const monthKey = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Miesiąc musi mieć format RRRR-MM")

/** Work fraction 0–0.5 (KP art. 182¹e). Upper bound enforced by the engine with an explanation. */
export const fractionSchema = z
  .union([z.string().trim().regex(/^(0(\.\d{1,4})?|1(\.0{1,4})?)$|^\d\/\d{1,2}$/, "Ułamek jako tekst, np. \"0.5\" lub \"1/2\""), z.number().min(0).max(1)])
  .transform((value) => (typeof value === "number" ? value.toString() : value))

export const parentRoleSchema = z.enum(["MOTHER", "FATHER"])

export const insuranceSchema = z
  .object({
    title: z.enum(["EMPLOYMENT", "MANDATE", "SELF_EMPLOYMENT", "OTHER", "NONE"]).optional()
      .describe("EMPLOYMENT = umowa o pracę, MANDATE = umowa zlecenia, SELF_EMPLOYMENT = działalność, NONE = brak tytułu"),
    sicknessInsurance: z.enum(["COMPULSORY", "VOLUNTARY", "NONE"]).optional(),
    startDate: isoDateSchema.optional(),
    previousInsuranceStartDate: isoDateSchema.optional(),
    previousInsuranceEndDate: isoDateSchema.optional(),
    previousGapReason: z.enum(["UNPAID_LEAVE", "CHILDCARE_LEAVE", "MILITARY_SERVICE"]).optional(),
    dayOneException: z.enum(["GRADUATE_WITHIN_90_DAYS", "COMMUTING_ACCIDENT", "TEN_YEARS_COMPULSORY", "MP_OR_SENATOR", "CUSTOMS_OFFICER"]).optional(),
    endDate: isoDateSchema.optional(),
    endReason: z
      .enum([
        "EMPLOYER_DEATH",
        "EMPLOYER_BANKRUPTCY",
        "EMPLOYER_LIQUIDATION",
        "UNLAWFUL_TERMINATION_FINAL_JUDGMENT",
        "FIXED_TERM_CONTRACT_END",
        "TERMINATION_BY_EMPLOYER",
        "RESIGNATION_OR_AGREEMENT",
        "MANDATE_CONTRACT_END",
        "BUSINESS_CLOSED",
        "VOLUNTARY_INSURANCE_WITHDRAWN",
        "OTHER",
      ])
      .optional(),
    endedDuringPregnancy: z.boolean().optional(),
    otherEmploymentProvided: z.boolean().optional(),
    fixedTermContract: z
      .object({
        longerThanOneMonth: z.boolean().optional(),
        wouldEndAfterThirdMonthOfPregnancy: z.boolean().optional(),
        replacementContract: z.boolean().optional(),
      })
      .strict()
      .optional(),
    onChildcareLeave: z.boolean().optional(),
    payerSize: z.enum(["OVER_20", "UP_TO_20"]).optional(),
    workingTimeFraction: fractionSchema.optional(),
    contributionDebt: z
      .object({
        exists: z.boolean(),
        amountGrosze: grosze.optional(),
        exceedsThreshold: z.boolean().optional(),
        repaidOn: isoDateSchema.optional(),
      })
      .strict()
      .optional(),
  })
  .strict()

export const basisSchema = z.discriminatedUnion("method", [
  z.object({ method: z.literal("KNOWN_BASIS"), monthlyBasisGrosze: positiveGrosze, origin: z.enum(["PAYER_CERTIFICATE", "PREVIOUS_BENEFIT", "USER"]).optional() }).strict(),
  z.object({ method: z.literal("GROSS_MONTHLY"), grossMonthlyGrosze: positiveGrosze }).strict(),
  z
    .object({
      method: z.literal("MONTHLY_HISTORY"),
      months: z
        .array(
          z
            .object({
              month: monthKey,
              grossGrosze: grosze,
              workedAtLeastHalf: z.boolean().optional(),
              supplementedGrossGrosze: grosze.optional(),
            })
            .strict()
        )
        .min(1)
        .max(24),
    })
    .strict(),
  z
    .object({
      method: z.literal("DECLARED_SHORT_INSURANCE"),
      months: z.array(z.object({ month: monthKey, declaredBasisGrosze: grosze, lowestBasisGrosze: grosze }).strict()).min(1).max(12),
    })
    .strict(),
])

const periodSchema = z.object({ start: isoDateSchema, end: isoDateSchema.optional() }).strict()

export const parentSchema = z
  .object({
    role: parentRoleSchema,
    insurance: insuranceSchema.optional(),
    basis: basisSchema.optional(),
    birthYear: z.number().int().min(1900).max(2100).optional(),
    incapacityForIndependentExistence: z.boolean().optional(),
    hospitalization: periodSchema.optional(),
    deathDate: isoDateSchema.optional(),
    abandonedChildOn: isoDateSchema.optional(),
    tookEmploymentAtLeastHalfTimeOn: isoDateSchema.optional(),
    contributionBasisRaisedDuringPregnancy: z.boolean().optional(),
    titleStartedDuringPregnancy: z.boolean().optional(),
  })
  .strict()

export const familyEventSchema = z
  .object({
    kind: z.enum(["PREGNANCY", "BIRTH", "ADOPTION", "FOSTER_CARE"]),
    expectedDueDate: isoDateSchema.optional(),
    birthDate: isoDateSchema.optional(),
    careTakingDate: isoDateSchema.optional(),
    courtApplicationDate: isoDateSchema.optional(),
    adoptionFinalDate: isoDateSchema.optional(),
    childBirthDate: isoDateSchema.optional(),
    childrenCount: z.number().int().min(1).max(10).optional(),
    zaZyciem: z.boolean().optional(),
    schoolDeferred: z.boolean().optional(),
    professionalFosterFamily: z.boolean().optional(),
    previouslyUsedMaternityTermsWeeks: z.number().int().min(0).max(37).optional(),
    previouslyUsedParentalWeeks: z.number().int().min(0).max(67).optional(),
    stillbirth: z.boolean().optional(),
    childDeaths: z.array(z.object({ date: isoDateSchema }).strict()).max(10).optional(),
    gestationalWeeksCompleted: z.number().int().min(0).max(45).optional(),
    lowestBirthWeightGrams: z.number().int().min(1).max(10_000).optional(),
    childHospitalStays: z
      .array(z.object({ child: z.number().int().min(0).max(9).optional(), start: isoDateSchema, end: isoDateSchema }).strict())
      .max(30)
      .optional(),
    childPlacedInCareOn: isoDateSchema.optional(),
  })
  .strict()

export const takeoverReasonSchema = z.enum([
  "MOTHER_RESIGNS_AFTER_14_WEEKS",
  "MOTHER_INCAPACITY",
  "MOTHER_HOSPITALIZED",
  "MOTHER_DIED",
  "MOTHER_ABANDONED_CHILD",
  "UNINSURED_MOTHER_DIED",
  "UNINSURED_MOTHER_ABANDONED_CHILD",
  "UNINSURED_MOTHER_INCAPACITY",
  "UNINSURED_MOTHER_EMPLOYED",
])

export const leavePlanSchema = z
  .object({
    paymentOption: z.enum(["STANDARD_100_70", "FLAT_81_5"]).optional(),
    flatRateApplicationDate: isoDateSchema.optional(),
    maternityWeeksBeforeBirth: z.number().int().min(0).max(6).optional(),
    maternityStartDate: isoDateSchema.optional(),
    maternityTakeover: z
      .object({ reason: takeoverReasonSchema, motherWeeksAfterBirth: z.number().int().min(0).max(37).optional(), fromDate: isoDateSchema.optional() })
      .strict()
      .optional(),
    supplementaryParent: parentRoleSchema.optional(),
    parentalSegments: z
      .array(
        z
          .object({
            parent: parentRoleSchema,
            weeks: z.number().int().min(0).max(67),
            days: z.number().int().min(0).max(6).optional(),
            startDate: isoDateSchema.optional(),
            workFraction: fractionSchema.optional(),
            extensionWorkFraction: fractionSchema.optional(),
          })
          .strict()
      )
      .max(10)
      .optional(),
    paternity: z.array(z.object({ startDate: isoDateSchema.optional(), days: z.number().int().min(1).max(14) }).strict()).max(4).optional(),
  })
  .strict()

export const sickLeaveSchema = z
  .object({
    start: isoDateSchema,
    end: isoDateSchema,
    pregnancyCode: z.boolean().optional(),
    employerPaidDaysUsedThisYear: z.number().int().min(0).max(366).optional(),
    priorDaysInBenefitPeriod: z.number().int().min(0).max(400).optional(),
  })
  .strict()

export const externalParametersSchema = z
  .object({
    minimumWageGrosze: positiveGrosze.optional(),
    parentalBenefitAmountGrosze: positiveGrosze.optional(),
    averageWageGrosze: positiveGrosze.optional(),
    sourceNote: z.string().trim().min(5).max(300).describe("Official source of the values, e.g. the Dz.U. citation."),
  })
  .strict()

export const assessmentInputSchema = z
  .object({
    asOf: isoDateSchema.optional().describe("Evaluation date; defaults to today (Europe/Warsaw)."),
    ruleSetVersion: z.string().trim().max(40).optional(),
    event: familyEventSchema,
    parents: z
      .array(parentSchema)
      .min(1)
      .max(2)
      .refine((parents) => new Set(parents.map((parent) => parent.role)).size === parents.length, "Każda rola rodzica może wystąpić tylko raz."),
    plan: leavePlanSchema.optional(),
    sickLeave: sickLeaveSchema.optional(),
    externalParameters: externalParametersSchema.optional(),
    providedDocuments: z.array(z.string().trim().min(1).max(60)).max(60).optional(),
  })
  .strict()

export const scenarioComparisonSchema = z
  .object({
    asOf: isoDateSchema.optional(),
    ruleSetVersion: z.string().trim().max(40).optional(),
    event: familyEventSchema,
    parents: assessmentInputSchema.shape.parents,
    sickLeave: sickLeaveSchema.optional(),
    externalParameters: externalParametersSchema.optional(),
    scenarios: z.array(z.object({ name: z.string().trim().min(1).max(80), plan: leavePlanSchema }).strict()).min(1).max(5),
  })
  .strict()

export type AssessmentRequest = z.infer<typeof assessmentInputSchema>
export type ScenarioComparisonRequest = z.infer<typeof scenarioComparisonSchema>

/** Converts a validated request into engine input, filling `asOf`. */
export function toAssessmentInput(request: AssessmentRequest, today: string): engine.AssessmentInput {
  return { ...request, asOf: request.asOf ?? today }
}
