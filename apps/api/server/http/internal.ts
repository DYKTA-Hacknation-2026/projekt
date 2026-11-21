import { timingSafeEqual } from "node:crypto"

import { getEnv } from "@zpr/contracts/env"
import { AppError } from "@zpr/contracts/problem"

export function requireWebService(request: Request): void {
  const actual = Buffer.from(request.headers.get("authorization") ?? "")
  const expected = Buffer.from("Bearer " + getEnv().SESSION_SECRET)
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
    throw new AppError(401, "UNAUTHORIZED", "Wymagana autoryzacja usługi.")
  }
}
