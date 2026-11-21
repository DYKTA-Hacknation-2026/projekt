import { z } from "zod"

export const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Data musi mieć format RRRR-MM-DD")
  .refine((value) => !Number.isNaN(Date.parse(`${value}T00:00:00Z`)), {
    message: "Nieprawidłowa data",
  })

export const uuidSchema = z.uuid("Nieprawidłowy identyfikator UUID")

export const paginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(10),
  offset: z.coerce.number().int().min(0).default(0),
})

export type IsoDate = z.infer<typeof isoDateSchema>
