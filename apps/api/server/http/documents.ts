import { uuidSchema } from "@zpr/contracts/common"
import { MAX_DOCUMENT_BYTES } from "@zpr/contracts/documents"
import { getEnv } from "@zpr/contracts/env"
import { AppError } from "@zpr/contracts/problem"

import { clientKey, enforceRateLimit } from "@/server/http/rate-limit"

/** Shared guards of `/documents/*` and `/sample-cases/*`. */

export type IdContext = { params: Promise<{ id: string }> }

export function enforceDocumentRateLimit(request: Request, sid?: string): void {
  const perMinute = Math.min(getEnv().RATE_LIMIT_REQUESTS_PER_MINUTE, 30)
  enforceRateLimit(clientKey(request, "documents"), perMinute)
  if (sid) enforceRateLimit(`documents-session:${sid}`, perMinute)
}

export async function documentId(context: IdContext): Promise<string> {
  const parsed = uuidSchema.safeParse((await context.params).id)
  if (!parsed.success) throw new AppError(404, "NOT_FOUND", "Nie znaleziono dokumentu.")
  return parsed.data
}

/** Multipart body with an early size check (the form overhead is small). */
export async function readMultipart(request: Request): Promise<FormData> {
  const contentType = request.headers.get("content-type") ?? ""
  if (!contentType.includes("multipart/form-data")) {
    throw new AppError(415, "UNSUPPORTED_MEDIA_TYPE", "Wyślij formularz multipart/form-data z polem „file”.")
  }
  const length = Number(request.headers.get("content-length") ?? "0")
  if (Number.isFinite(length) && length > MAX_DOCUMENT_BYTES + 64 * 1024) {
    throw new AppError(413, "PAYLOAD_TOO_LARGE", "Maksymalny rozmiar pliku to 10 MB.")
  }
  try {
    return await request.formData()
  } catch {
    throw new AppError(400, "BAD_REQUEST", "Nie udało się odczytać formularza. Spróbuj ponownie.")
  }
}
