import { z } from "zod"

import { isoDateSchema } from "./common"

export const employmentTypeSchema = z.enum([
  "EMPLOYMENT",
  "MANDATE",
  "SELF_EMPLOYMENT",
  "OTHER",
])

export const coverageModeSchema = z.enum(["COMPULSORY", "VOLUNTARY"])

export const familyEventTypeSchema = z.enum([
  "PREGNANCY",
  "BIRTH",
  "ADOPTION",
  "FOSTER_CARE",
])

export const onboardingSchema = z.object({
  firstName: z.string().trim().min(2, "Imię jest wymagane").max(80),
  lastName: z.string().trim().min(2, "Nazwisko jest wymagane").max(80),
  email: z.email("Podaj poprawny adres e-mail").max(160),
  birthDate: isoDateSchema.optional(),
  city: z.string().trim().max(120).optional(),

  eventType: familyEventTypeSchema,
  expectedDueDate: isoDateSchema.optional(),
  eventDate: isoDateSchema.optional(),
  childrenCount: z.coerce.number().int().min(1).max(10).default(1),
  hasZaZyciem: z.boolean().default(false),
  isPremature: z.boolean().default(false),

  employmentType: employmentTypeSchema,
  employerName: z.string().trim().max(160).optional(),
  grossMonthlyIncomePln: z.coerce
    .number()
    .min(0, "Wynagrodzenie nie może być ujemne")
    .max(1_000_000),
  insuranceStartDate: isoDateSchema.optional(),
  coverageMode: coverageModeSchema.default("COMPULSORY"),

  consents: z.object({
    healthData: z.boolean(),
    aiAssistant: z.boolean(),
    documentProcessing: z.boolean(),
  }),
})

export type OnboardingInput = z.infer<typeof onboardingSchema>
