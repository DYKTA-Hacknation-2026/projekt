import { z } from "zod"

import { isoDateSchema } from "./common"
import { benefitTags, knowledgeSourceTypes } from "./knowledge"

/**
 * Input schemas of the assistant tools. Every tool argument produced by a
 * language model is validated against these before any service is called.
 * Objects are strict: unknown keys (e.g. a smuggled `userId`) are rejected.
 * No tool accepts SQL, table names, user identifiers or free-form filters.
 */

export const benefitCodeSchema = z.enum([
  "MATERNITY_ALLOWANCE",
  "PARENTAL_LEAVE_BENEFIT",
  "PATERNITY_BENEFIT",
  "SICKNESS_IN_PREGNANCY",
])

const titleEndReasonSchema = z.enum([
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

export const caseFactsSchema = z
  .object({
    parentRole: z.enum(["MOTHER", "FATHER"]).optional(),
    employmentType: z
      .enum(["EMPLOYMENT", "MANDATE", "SELF_EMPLOYMENT", "OTHER", "NONE"])
      .optional()
      .describe(
        "EMPLOYMENT = umowa o pracę, MANDATE = umowa zlecenia, SELF_EMPLOYMENT = działalność/B2B, NONE = brak tytułu"
      ),
    sicknessInsurance: z
      .enum(["COMPULSORY", "VOLUNTARY", "NONE"])
      .optional()
      .describe("Only if the user said it. Employees are COMPULSORY."),
    insuranceStartDate: isoDateSchema.optional(),
    insuranceEndDate: isoDateSchema.optional(),
    insuranceEndReason: titleEndReasonSchema
      .optional()
      .describe("Why the insurance title ended, only if the user said it."),
    otherEmploymentProvided: z
      .boolean()
      .optional()
      .describe(
        "After liquidation/bankruptcy/death of the employer: did they provide other employment? Only if stated."
      ),
    familyEvent: z
      .enum(["PREGNANCY", "BIRTH", "ADOPTION", "FOSTER_CARE"])
      .optional(),
    eventDate: isoDateSchema.optional(),
    expectedDueDate: isoDateSchema.optional(),
    childrenCount: z.number().int().min(1).max(10).optional(),
    hasZaZyciem: z.boolean().optional(),
    stillbirth: z.boolean().optional(),
    childBirthDate: isoDateSchema.optional(),
    courtApplicationDate: isoDateSchema.optional(),
    adoptionFinalDate: isoDateSchema.optional(),
    gestationalWeeksCompleted: z.number().int().min(0).max(45).optional(),
    lowestBirthWeightGrams: z.number().int().min(1).max(10_000).optional(),
    childHospitalWeeks: z.number().int().min(0).max(60).optional(),
    childHospitalDaysDay5To28: z.number().int().min(0).max(24).optional(),
    professionalFosterFamily: z.boolean().optional(),
    contributionArrears: z.boolean().optional(),
    contributionDebtExceedsThreshold: z
      .boolean()
      .optional()
      .describe("Only if ZUS confirmed the arrears exceed 1% of the minimum wage."),
    payerSize: z
      .enum(["OVER_20", "UP_TO_20"])
      .optional()
      .describe("Payer reporting more than 20 insured persons, or up to 20."),
    pregnancySickLeave: z.boolean().optional(),
    sickLeaveDays: z.number().int().min(0).max(400).optional(),
    sickLeaveStart: isoDateSchema.optional(),
    sickLeaveEnd: isoDateSchema.optional(),
    paymentOption: z.enum(["STANDARD_100_70", "FLAT_81_5"]).optional(),
  })
  .strict()
  .describe(
    "Facts stated by the user in this conversation. Leave a field out when it is unknown — never guess."
  )

const paymentOptionSchema = z.enum(["STANDARD_100_70", "FLAT_81_5"])

export const searchKnowledgeBaseInputSchema = z
  .object({
    query: z
      .string()
      .trim()
      .min(3)
      .max(300)
      .describe("Polish search query about the law. No personal data."),
    benefitTags: z.array(z.enum(benefitTags)).max(5).optional(),
    sourceTypes: z.array(z.enum(knowledgeSourceTypes)).max(5).optional(),
    asOf: isoDateSchema
      .optional()
      .describe("Date the provisions must be valid on, e.g. the due date."),
    limit: z.number().int().min(1).max(8).optional(),
  })
  .strict()

export const getUserInsuranceProfileInputSchema = z.object({}).strict()

export const checkBenefitEligibilityInputSchema = z
  .object({
    benefits: z.array(benefitCodeSchema).min(1).max(4).optional(),
    facts: caseFactsSchema.optional(),
  })
  .strict()

export const calculateBenefitInputSchema = z
  .object({
    facts: caseFactsSchema.optional(),
    grossMonthlyIncomePln: z
      .number()
      .min(0)
      .max(1_000_000)
      .optional()
      .describe("Only a value the user stated or the confirmed profile holds."),
    childrenCount: z.number().int().min(1).max(5).optional(),
    hasZaZyciem: z.boolean().optional(),
    paymentOption: paymentOptionSchema.optional(),
    maternityWeeksBeforeBirth: z.number().int().min(0).max(6).optional(),
    secondParentParentalWeeks: z.number().int().min(0).max(9).optional(),
    parentalWorkFraction: z.number().min(0).max(0.5).optional(),
    paternityDays: z.number().int().min(0).max(14).optional(),
  })
  .strict()

export const leaveScenarioInputSchema = z
  .object({
    name: z.string().trim().min(1).max(60),
    paymentOption: paymentOptionSchema.default("STANDARD_100_70"),
    maternityWeeksBeforeBirth: z.number().int().min(0).max(6).default(0),
    secondParentParentalWeeks: z.number().int().min(0).max(9).default(0),
    parentalWorkFraction: z.number().min(0).max(0.5).default(0),
    paternityDays: z.number().int().min(0).max(14).default(14),
  })
  .strict()

export const compareLeaveScenariosInputSchema = z
  .object({
    facts: caseFactsSchema.optional(),
    grossMonthlyIncomePln: z.number().min(0).max(1_000_000).optional(),
    childrenCount: z.number().int().min(1).max(5).optional(),
    hasZaZyciem: z.boolean().optional(),
    dueDate: isoDateSchema.optional(),
    scenarios: z.array(leaveScenarioInputSchema).min(1).max(3),
  })
  .strict()

export const getRequiredDocumentsInputSchema = z
  .object({
    benefit: benefitCodeSchema,
    facts: caseFactsSchema.optional(),
  })
  .strict()

export const deadlineTopicSchema = z.enum([
  "MATERNITY",
  "PARENTAL",
  "PATERNITY",
  "PAYMENT",
  "ADOPTION",
  "WORK_COMBINATION",
])

export const getRelevantDeadlinesInputSchema = z
  .object({
    facts: caseFactsSchema.optional(),
    topics: z.array(deadlineTopicSchema).max(6).optional(),
  })
  .strict()

export const getBenefitTimelineInputSchema = z
  .object({
    dueDate: isoDateSchema.optional(),
    childrenCount: z.number().int().min(1).max(5).optional(),
    hasZaZyciem: z.boolean().optional(),
    maternityWeeksBeforeBirth: z.number().int().min(0).max(6).optional(),
    secondParentParentalWeeks: z.number().int().min(0).max(9).optional(),
    paternityDays: z.number().int().min(0).max(14).optional(),
  })
  .strict()

export type CaseFactsInput = z.infer<typeof caseFactsSchema>
export type SearchKnowledgeBaseInput = z.infer<typeof searchKnowledgeBaseInputSchema>
export type CheckBenefitEligibilityInput = z.infer<typeof checkBenefitEligibilityInputSchema>
export type CalculateBenefitInput = z.infer<typeof calculateBenefitInputSchema>
export type CompareLeaveScenariosInput = z.infer<typeof compareLeaveScenariosInputSchema>
export type GetRequiredDocumentsInput = z.infer<typeof getRequiredDocumentsInputSchema>
export type GetRelevantDeadlinesInput = z.infer<typeof getRelevantDeadlinesInputSchema>
export type GetBenefitTimelineInput = z.infer<typeof getBenefitTimelineInputSchema>
