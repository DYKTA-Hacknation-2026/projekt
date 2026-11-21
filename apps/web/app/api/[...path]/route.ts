import { type NextRequest } from "next/server"

import { AppError, problemResponse } from "@zpr/contracts/problem"

import { apiUrl } from "@/server/api-client"

const requestHeaders = ["accept", "content-type", "cookie", "x-forwarded-for"]
const responseHeaders = [
  "allow",
  "cache-control",
  "content-type",
  "vary",
  "x-request-id",
  "x-vercel-ai-ui-message-stream",
  "x-conversation-id",
  "x-accel-buffering",
]

function copyHeaders(source: Headers, names: string[]): Headers {
  const headers = new Headers()
  for (const name of names) {
    const value = source.get(name)
    if (value !== null) headers.set(name, value)
  }
  return headers
}

async function forward(request: NextRequest): Promise<Response> {
  const { pathname, search } = request.nextUrl
  const init: RequestInit & { duplex: "half" } = {
    method: request.method,
    headers: copyHeaders(request.headers, requestHeaders),
    body: request.body,
    duplex: "half",
    cache: "no-store",
    redirect: "manual",
    signal: request.signal,
  }

  try {
    const url = apiUrl(pathname, search)
    if (!url.pathname.startsWith("/api/"))
      return new Response(null, { status: 404 })

    const upstream = await fetch(url, init)
    const headers = copyHeaders(upstream.headers, responseHeaders)
    for (const cookie of upstream.headers.getSetCookie()) {
      headers.append("set-cookie", cookie)
    }
    return new Response(upstream.body, { status: upstream.status, headers })
  } catch {
    const response = problemResponse(
      new AppError(502, "UPSTREAM_ERROR", "Usługa API jest niedostępna."),
      crypto.randomUUID()
    )
    return request.method === "HEAD"
      ? new Response(null, {
          status: response.status,
          headers: response.headers,
        })
      : response
  }
}

export {
  forward as GET,
  forward as HEAD,
  forward as POST,
  forward as PUT,
  forward as PATCH,
  forward as DELETE,
  forward as OPTIONS,
}
