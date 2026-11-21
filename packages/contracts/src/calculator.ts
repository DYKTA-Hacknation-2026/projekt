import { z } from "zod"

import type { CalculatorInput } from "@zpr/domain"

const monthlyIncomeSchema = z.object({
  grossGrosze: z.coerce.number().int().min(0).max(100_000_000),
  absenceOver50Percent: z.boolean().optional(),
  supplementedGrosze: z.coerce.number().int().min(0).max(100_000_000).optional(),
})

const weeks = (max: number) => z.coerce.number().int().min(0).max(max)

export const calculatorInputSchema = z.object({
  grossMonthlyIncomeGrosze: z.coerce
    .number()
    .int()
    .min(0)
    .max(100_000_000, "Kwota jest zbyt duża"),
  childrenCount: z.coerce.number().int().min(1).max(5).default(1),
  hasZaZyciem: z.boolean().default(false),
  paymentOption: z
    .enum(["STANDARD_100_70", "FLAT_81_5"])
    .default("STANDARD_100_70"),
  birthDate: z.iso.date().optional(),
  flatRateApplicationDate: z.iso.date().optional(),
  fatherMaternityTakeoverReason: z
    .enum([
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
    .optional(),
  courtApplicationDate: z.iso.date().optional(),
  adoptionFinalDate: z.iso.date().optional(),
  previouslyUsedMaternityTermsWeeks: weeks(37).optional(),
  previouslyUsedParentalWeeks: weeks(67).optional(),
  asOf: z.iso.date().optional(),
  maternityWeeksBeforeBirth: weeks(6).default(0),
  secondParentParentalWeeks: weeks(67).default(0),
  parentalWorkFraction: z.coerce.number().min(0).max(0.5).default(0),
  paternityDays: z.coerce.number().int().min(0).max(14).default(14),

  mode: z.enum(["BIRTH", "ADOPTION", "FOSTER_CARE"]).default("BIRTH"),
  childAgeYears: z.coerce.number().min(0).max(30).optional(),
  childBirthDate: z.iso.date().optional(),
  placementDate: z.iso.date().optional(),
  isDeferredSchooling: z.boolean().optional(),
  isProfessionalFosterFamily: z.boolean().optional(),

  secondParentMonthlyIncomeGrosze: z.coerce
    .number()
    .int()
    .min(0)
    .max(100_000_000)
    .optional(),
  motherParentalWeeks: weeks(67).optional(),
  fatherMaternityTakeoverWeeks: weeks(23).optional(),

  childHospitalWeeks: weeks(60).optional(),
  childHospitalDaysDay5To28: weeks(24).optional(),
  birthWeekOfPregnancy: z.coerce.number().int().min(20).max(44).optional(),
  birthWeightGrams: z.coerce.number().int().min(300).max(6000).optional(),
  specialCase: z
    .enum([
      "STANDARD",
      "STILLBIRTH",
      "CHILD_DEATH_BEFORE_8W",
      "CHILD_DEATH_AFTER_8W",
    ])
    .default("STANDARD"),
  childDeathDay: z.coerce.number().int().min(0).max(3650).optional(),

  workCombinedWeeks: weeks(67).optional(),
  combineWorkInExtension: z.boolean().optional(),

  incomeMode: z.enum(["SIMPLE", "DETAILED", "KNOWN_BASIS"]).default("SIMPLE"),
  monthlyIncomes: z.array(monthlyIncomeSchema).max(12).optional(),
  employmentType: z.enum(["EMPLOYEE", "CONTRACTOR", "BUSINESS"]).optional(),
  knownBasisGrosze: z.coerce.number().int().min(0).max(100_000_000).optional(),
  secondParentKnownBasisGrosze: z.coerce.number().int().min(0).max(100_000_000).optional(),
  employmentFraction: z.coerce.number().min(0.1).max(1).optional(),

  motherEnabled: z.boolean().default(true),
  fatherEnabled: z.boolean().default(true),
  motherEmploymentType: z.enum(["EMPLOYEE", "CONTRACTOR", "BUSINESS"]).optional(),
  fatherEmploymentType: z.enum(["EMPLOYEE", "CONTRACTOR", "BUSINESS"]).optional(),
  motherSicknessInsurance: z.enum(["COMPULSORY", "VOLUNTARY", "NONE"]).optional(),
  fatherSicknessInsurance: z.enum(["COMPULSORY", "VOLUNTARY", "NONE"]).optional(),
  motherInsuranceStartDate: z.iso.date().optional(),
  fatherInsuranceStartDate: z.iso.date().optional(),
  motherInsuranceEndDate: z.iso.date().optional(),
  fatherInsuranceEndDate: z.iso.date().optional(),
  motherPayerSize: z.enum(["OVER_20", "UP_TO_20"]).optional(),
  fatherPayerSize: z.enum(["OVER_20", "UP_TO_20"]).optional(),
  motherContributionDebt: z.boolean().optional(),
  fatherContributionDebt: z.boolean().optional(),
}) satisfies z.ZodType<CalculatorInput>

export const calculationRequestSchema = z.object({
  input: calculatorInputSchema,
  caseId: z.uuid().optional(),
  save: z.boolean().default(true),
})

export type CalculationRequest = z.infer<typeof calculationRequestSchema>
