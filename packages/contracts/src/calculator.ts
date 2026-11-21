import { z } from "zod"

import type { CalculatorInput } from "@zpr/domain"

const monthlyIncomeSchema = z.object({
  grossGrosze: z.coerce.number().int().min(0).max(100_000_000),
  absenceOver50Percent: z.boolean().optional(),
  supplementedGrosze: z.coerce
    .number()
    .int()
    .min(0)
    .max(100_000_000)
    .optional(),
})

const weeks = (max: number) => z.coerce.number().int().min(0).max(max)

export const calculatorInputSchema = z.object({
  grossMonthlyIncomeGrosze: z.coerce
    .number()
    .int()
    .min(0)
    .max(100_000_000, "Kwota jest zbyt duża"),
  // These are technical sanity limits only. The legal maxima (weeks, days,
  // work fraction) come from the active rule set in the database.
  childrenCount: z.coerce.number().int().min(1).max(20).default(1),
  hasZaZyciem: z.boolean().default(false),
  paymentOption: z
    .enum(["STANDARD_100_70", "FLAT_81_5"])
    .default("STANDARD_100_70"),
  maternityWeeksBeforeBirth: z.coerce.number().int().min(0).max(52).default(0),
  secondParentParentalWeeks: z.coerce.number().int().min(0).max(104).default(0),
  parentalWorkFraction: z.coerce.number().min(0).max(1).default(0),
  paternityDays: z.coerce.number().int().min(0).max(365).default(14),

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

  incomeMode: z.enum(["SIMPLE", "DETAILED"]).default("SIMPLE"),
  monthlyIncomes: z.array(monthlyIncomeSchema).max(12).optional(),
  employmentType: z.enum(["EMPLOYEE", "CONTRACTOR", "BUSINESS"]).optional(),
  employmentFraction: z.coerce.number().min(0.1).max(1).optional(),
}) satisfies z.ZodType<CalculatorInput>

export const calculationRequestSchema = z.object({
  input: calculatorInputSchema,
  caseId: z.uuid().optional(),
  save: z.boolean().default(true),
})

export type CalculationRequest = z.infer<typeof calculationRequestSchema>
