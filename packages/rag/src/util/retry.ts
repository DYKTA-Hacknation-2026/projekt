export interface RetryOptions {
  /** Total attempts including the first one. */
  attempts: number
  baseDelayMs: number
  maxDelayMs?: number
  /** Return false to fail fast (e.g. on a 400 or a validation error). */
  isRetryable?: (error: unknown) => boolean
  onRetry?: (error: unknown, attempt: number, delayMs: number) => void
  sleep?: (ms: number) => Promise<void>
}

export class NonRetryableError extends Error {
  override readonly name = "NonRetryableError"
}

const defaultSleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms))

/** Exponential backoff with full jitter. */
export async function withRetry<T>(
  operation: (attempt: number) => Promise<T>,
  options: RetryOptions
): Promise<T> {
  const sleep = options.sleep ?? defaultSleep
  const isRetryable =
    options.isRetryable ?? ((error) => !(error instanceof NonRetryableError))
  let lastError: unknown

  for (let attempt = 1; attempt <= options.attempts; attempt += 1) {
    try {
      return await operation(attempt)
    } catch (error) {
      lastError = error
      if (attempt === options.attempts || !isRetryable(error)) throw error
      const cap = Math.min(
        options.maxDelayMs ?? 30_000,
        options.baseDelayMs * 2 ** (attempt - 1)
      )
      const delayMs = Math.round(cap / 2 + Math.random() * (cap / 2))
      options.onRetry?.(error, attempt, delayMs)
      await sleep(delayMs)
    }
  }

  throw lastError
}

export function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  return String(error)
}
