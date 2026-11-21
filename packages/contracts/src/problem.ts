import { ZodError } from "zod"

export type ProblemCode =
  | "BAD_REQUEST"
  | "VALIDATION_ERROR"
  | "NOT_FOUND"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "RATE_LIMITED"
  | "PAYLOAD_TOO_LARGE"
  | "UNSUPPORTED_MEDIA_TYPE"
  | "CONFLICT"
  | "CONSENT_REQUIRED"
  | "DOCUMENT_UNREADABLE"
  | "TIMEOUT"
  | "UPSTREAM_ERROR"
  | "INTERNAL_ERROR"

const defaultTitles: Record<ProblemCode, string> = {
  BAD_REQUEST: "Nieprawidłowe żądanie",
  VALIDATION_ERROR: "Dane nie przeszły walidacji",
  NOT_FOUND: "Nie znaleziono zasobu",
  UNAUTHORIZED: "Brak autoryzacji",
  FORBIDDEN: "Brak uprawnień",
  RATE_LIMITED: "Zbyt wiele żądań",
  PAYLOAD_TOO_LARGE: "Plik jest zbyt duży",
  UNSUPPORTED_MEDIA_TYPE: "Nieobsługiwany format",
  CONFLICT: "Konflikt danych",
  CONSENT_REQUIRED: "Wymagana zgoda",
  DOCUMENT_UNREADABLE: "Nie można odczytać dokumentu",
  TIMEOUT: "Przekroczono czas operacji",
  UPSTREAM_ERROR: "Błąd usługi zewnętrznej",
  INTERNAL_ERROR: "Błąd wewnętrzny",
}

export class AppError extends Error {
  readonly status: number
  readonly code: ProblemCode
  readonly detail: string
  readonly extensions?: Record<string, unknown>

  constructor(
    status: number,
    code: ProblemCode,
    detail: string,
    extensions?: Record<string, unknown>
  ) {
    super(detail)
    this.name = "AppError"
    this.status = status
    this.code = code
    this.detail = detail
    this.extensions = extensions
  }
}

function zodIssues(error: ZodError) {
  return error.issues.map((issue) => ({
    path: issue.path.join(".") || "(root)",
    message: issue.message,
    code: issue.code,
  }))
}

export function problemResponse(error: unknown, requestId: string): Response {
  let body: Record<string, unknown>
  let status: number

  if (error instanceof AppError) {
    status = error.status
    body = {
      type: `https://zpr.local/problems/${error.code.toLowerCase()}`,
      title: defaultTitles[error.code],
      status,
      code: error.code,
      detail: error.detail,
      instance: requestId,
      ...error.extensions,
    }
  } else if (error instanceof ZodError) {
    status = 422
    body = {
      type: "https://zpr.local/problems/validation-error",
      title: defaultTitles.VALIDATION_ERROR,
      status,
      code: "VALIDATION_ERROR",
      detail: "Popraw zaznaczone pola i spróbuj ponownie.",
      instance: requestId,
      issues: zodIssues(error),
    }
  } else {
    status = 500
    const message =
      error instanceof Error ? error.message : "Nieznany błąd aplikacji"
    console.error(`[api] ${requestId}`, error)
    body = {
      type: "https://zpr.local/problems/internal-error",
      title: defaultTitles.INTERNAL_ERROR,
      status,
      code: "INTERNAL_ERROR",
      detail:
        process.env.NODE_ENV === "development"
          ? message
          : "Wystąpił nieoczekiwany błąd. Spróbuj ponownie później.",
      instance: requestId,
    }
  }

  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/problem+json; charset=utf-8",
      "cache-control": "no-store",
      "x-request-id": requestId,
    },
  })
}
