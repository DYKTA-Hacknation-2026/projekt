import { getEnv } from "@zpr/contracts/env"

import { AppError } from "@zpr/contracts/problem"
import { clientKey, enforceRateLimit } from "@/server/http/rate-limit"
import { apiRoute, json } from "@/server/http/route"
import {
  SAMPLE_DOCUMENTS,
  analyzeUploadedFile,
  buildSampleAnalysis,
} from "@/server/services/documents"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const MAX_FILE_BYTES = 10 * 1024 * 1024

export const GET = apiRoute(async () => {
  return json({ sampleCases: SAMPLE_DOCUMENTS, maxFileBytes: MAX_FILE_BYTES })
})

export const POST = apiRoute(async (request) => {
  const env = getEnv()
  enforceRateLimit(
    clientKey(request, "documents"),
    Math.min(env.RATE_LIMIT_REQUESTS_PER_MINUTE, 20)
  )

  const contentType = request.headers.get("content-type") ?? ""
  if (!contentType.includes("multipart/form-data")) {
    throw new AppError(
      415,
      "UNSUPPORTED_MEDIA_TYPE",
      "Wyślij formularz multipart/form-data z polem „file” lub „sampleCase”."
    )
  }

  let form: FormData
  try {
    form = await request.formData()
  } catch {
    throw new AppError(
      400,
      "BAD_REQUEST",
      "Nie udało się odczytać formularza. Spróbuj ponownie."
    )
  }

  const sampleCase = form.get("sampleCase")
  if (typeof sampleCase === "string" && sampleCase.length > 0) {
    try {
      return json(buildSampleAnalysis(sampleCase))
    } catch {
      throw new AppError(
        404,
        "NOT_FOUND",
        "Nie znaleziono wybranego przykładu dokumentu."
      )
    }
  }

  const file = form.get("file")
  if (!(file instanceof File)) {
    throw new AppError(
      400,
      "BAD_REQUEST",
      "Brak pliku. Wybierz PDF albo przykład dokumentu."
    )
  }

  if (file.size === 0) {
    throw new AppError(400, "BAD_REQUEST", "Plik jest pusty.")
  }
  if (file.size > MAX_FILE_BYTES) {
    throw new AppError(
      413,
      "PAYLOAD_TOO_LARGE",
      "Maksymalny rozmiar pliku to 10 MB."
    )
  }

  const isPdfName = file.name.toLowerCase().endsWith(".pdf")
  const isPdfMime = file.type === "application/pdf" || file.type === ""
  if (!isPdfName || !isPdfMime) {
    throw new AppError(
      415,
      "UNSUPPORTED_MEDIA_TYPE",
      "Obsługiwane są wyłącznie pliki PDF."
    )
  }

  const bytes = new Uint8Array(await file.arrayBuffer())
  const signature = new TextDecoder("latin1").decode(bytes.slice(0, 5))
  if (signature !== "%PDF-") {
    throw new AppError(
      415,
      "UNSUPPORTED_MEDIA_TYPE",
      "Plik nie ma poprawnej sygnatury PDF."
    )
  }

  return json(
    analyzeUploadedFile({
      fileName: file.name,
      size: file.size,
      signature,
    })
  )
})
