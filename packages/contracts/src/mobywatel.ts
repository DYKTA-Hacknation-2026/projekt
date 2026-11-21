import { z } from "zod"

/**
 * Simulated mObywatel / login.gov.pl data contract.
 *
 * The real flow is an OIDC authorization-code flow through login.gov.pl:
 * the user authenticates in the mObywatel app (QR code or mobile deep link),
 * sees a consent screen with the requesting institution and the data bundle,
 * and the service receives an authorization code. This demo replaces the
 * provider with a signed, short-lived cookie and synthetic personas.
 */
export const mobywatelPersonaSchema = z.object({
  id: z.string().min(1),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  birthDate: z.string().date(),
  city: z.string().min(1),
  email: z.email(),
  description: z.string().min(1),
  initials: z.string().min(1).max(3),
})

export type MobywatelPersona = z.infer<typeof mobywatelPersonaSchema>

/** Data bundle requested from the simulated identity provider. */
export const MOBYWATEL_SCOPE_KEYS = [
  "firstName",
  "lastName",
  "birthDate",
  "city",
  "email",
] as const

export type MobywatelScopeKey = (typeof MOBYWATEL_SCOPE_KEYS)[number]

export const mobywatelMethodSchema = z.enum(["PIN", "BIOMETRY"])
export type MobywatelMethod = z.infer<typeof mobywatelMethodSchema>

export const mobywatelAuthorizeSchema = z
  .object({
    personaId: z.string().min(1),
    method: mobywatelMethodSchema,
    pin: z
      .string()
      .regex(/^\d{4}$/, "Kod PIN musi mieć 4 cyfry")
      .optional(),
    consent: z.literal(true),
  })
  .superRefine((value, context) => {
    if (value.method === "PIN" && !value.pin) {
      context.addIssue({
        code: "custom",
        path: ["pin"],
        message: "Podaj 4-cyfrowy kod PIN.",
      })
    }
  })

export type MobywatelAuthorizeInput = z.infer<
  typeof mobywatelAuthorizeSchema
>

export interface MobywatelProfile {
  firstName: string
  lastName: string
  birthDate: string
  city: string
  email: string
}
