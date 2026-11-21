import { z } from "zod"

import type { CalculatorInput } from "@zpr/domain"

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
  maternityWeeksBeforeBirth: z.coerce.number().int().min(0).max(6).default(0),
  secondParentParentalWeeks: z.coerce.number().int().min(0).max(9).default(0),
  parentalWorkFraction: z.coerce.number().min(0).max(0.5).default(0),
  paternityDays: z.coerce.number().int().min(0).max(14).default(14),
}) satisfies z.ZodType<CalculatorInput>

export const calculationRequestSchema = z.object({
  input: calculatorInputSchema,
  caseId: z.uuid().optional(),
  save: z.boolean().default(true),
})

export type CalculationRequest = z.infer<typeof calculationRequestSchema>
