import { AppError } from "./problem"

type Bucket = {
  timestamps: number[]
}

type GlobalWithRateLimit = typeof globalThis & {
  __zprRateLimit?: Map<string, Bucket>
}

const globalForRateLimit = globalThis as GlobalWithRateLimit
const buckets: Map<string, Bucket> = (globalForRateLimit.__zprRateLimit ??=
  new Map<string, Bucket>())

export function enforceRateLimit(
  key: string,
  limit: number,
  windowMs = 60_000
): void {
  const now = Date.now()
  const bucket = buckets.get(key) ?? { timestamps: [] }
  bucket.timestamps = bucket.timestamps.filter(
    (timestamp) => now - timestamp < windowMs
  )

  if (bucket.timestamps.length >= limit) {
    buckets.set(key, bucket)
    throw new AppError(
      429,
      "RATE_LIMITED",
      `Limit ${limit} żądań na minutę został przekroczony. Spróbuj za chwilę.`
    )
  }

  bucket.timestamps.push(now)
  buckets.set(key, bucket)
}

export function clientKey(request: Request, scope: string): string {
  const forwarded = request.headers.get("x-forwarded-for")
  const ip = forwarded?.split(",")[0]?.trim() ?? "local"
  return `${scope}:${ip}`
}

/**
 * Assistant limits: per client address and per session, so neither rotating
 * sessions nor sharing an address lets one caller exhaust the model budget.
 */
export function enforceAssistantRateLimit(
  request: Request,
  sid: string,
  env: { RATE_LIMIT_REQUESTS_PER_MINUTE: number }
): void {
  const perMinute = Math.min(env.RATE_LIMIT_REQUESTS_PER_MINUTE, 20)
  enforceRateLimit(clientKey(request, "assistant"), perMinute)
  enforceRateLimit(`assistant-session:${sid}`, Math.max(5, Math.floor(perMinute / 2)))
  enforceRateLimit(`assistant-session-hour:${sid}`, 120, 60 * 60_000)
}
