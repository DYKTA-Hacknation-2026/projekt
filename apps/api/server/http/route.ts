import { AppError, problemResponse } from "@zpr/contracts/problem"

type Parser<T> = { parse: (input: unknown) => T }

type RouteHandler<Context = unknown> = (
  request: Request,
  context: Context
) => Promise<Response>

export function apiRoute<Context = unknown>(
  handler: RouteHandler<Context>
): RouteHandler<Context> {
  return async (request, context) => {
    const requestId = crypto.randomUUID()

    try {
      const response = await handler(request, context)
      response.headers.set("x-request-id", requestId)
      return response
    } catch (error) {
      return problemResponse(error, requestId)
    }
  }
}

export async function readJson<T>(
  request: Request,
  schema: Parser<T>
): Promise<T> {
  let payload: unknown

  try {
    payload = await request.json()
  } catch {
    throw new AppError(
      400,
      "BAD_REQUEST",
      "Treść żądania musi być poprawnym JSON-em."
    )
  }

  return schema.parse(payload)
}

export function json<T>(data: T, init?: ResponseInit): Response {
  const headers = new Headers(init?.headers)
  headers.set("cache-control", "no-store")
  return Response.json(data, { ...init, headers })
}

export function parseSearchParams<T>(request: Request, schema: Parser<T>): T {
  const url = new URL(request.url)
  return schema.parse(Object.fromEntries(url.searchParams.entries()))
}
