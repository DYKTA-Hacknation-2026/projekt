import type { RuleSet } from "@zpr/domain"

import { cookies } from "next/headers"

import { ADMIN_COOKIE } from "@zpr/contracts/admin-token"
import { getEnv } from "@zpr/contracts/env"
import type {
  AdminRuleVersion,
  AdminRulesData,
  SaveRuleVersionInput,
} from "@zpr/contracts/rules-admin"
import type { AdminData, DashboardData } from "@zpr/contracts/views"

export function apiUrl(pathname: string, search = ""): URL {
  const url = new URL(process.env.API_URL ?? "http://127.0.0.1:3001")
  url.pathname = pathname
  url.search = search
  return url
}

async function readView<T>(pathname: string, cookie?: string): Promise<T> {
  const headers = new Headers({
    authorization: "Bearer " + getEnv().SESSION_SECRET,
  })
  if (cookie) headers.set("cookie", cookie)

  const response = await fetch(apiUrl(pathname), { headers, cache: "no-store" })
  if (!response.ok) {
    throw new Error("API request failed (" + response.status + ")")
  }
  return response.json()
}

export function getDashboardData(): Promise<DashboardData> {
  return readView("/internal/dashboard")
}

export async function getAdminData(): Promise<AdminData> {
  const token = (await cookies()).get(ADMIN_COOKIE)?.value
  return readView(
    "/internal/admin",
    token ? ADMIN_COOKIE + "=" + token : undefined
  )
}

export function getActiveRuleSet(): Promise<RuleSet> {
  return readView("/internal/rule-set")
}

export class AdminRulesApiError extends Error {
  readonly fieldErrors?: Record<string, string>

  constructor(message: string, fieldErrors?: Record<string, string>) {
    super(message)
    this.name = "AdminRulesApiError"
    this.fieldErrors = fieldErrors
  }
}

async function adminCookie(): Promise<string | undefined> {
  const token = (await cookies()).get(ADMIN_COOKIE)?.value
  return token ? ADMIN_COOKIE + "=" + token : undefined
}

export async function getAdminRules(): Promise<AdminRulesData> {
  return readView("/internal/admin-rules", await adminCookie())
}

export async function saveAdminRuleVersion(
  input: SaveRuleVersionInput
): Promise<AdminRuleVersion> {
  const headers = new Headers({
    authorization: "Bearer " + getEnv().SESSION_SECRET,
    "content-type": "application/json",
  })
  const cookie = await adminCookie()
  if (cookie) headers.set("cookie", cookie)

  const response = await fetch(apiUrl("/internal/admin-rules"), {
    method: "POST",
    headers,
    body: JSON.stringify(input),
    cache: "no-store",
  })

  if (!response.ok) {
    const problem = (await response.json().catch(() => null)) as {
      detail?: string
      fieldErrors?: Record<string, string>
    } | null
    throw new AdminRulesApiError(
      problem?.detail ?? `API request failed (${response.status})`,
      problem?.fieldErrors
    )
  }

  return response.json()
}

export interface LatestImportForUser {
  sessionId: string
  scenarioId: string
  scenarioLabel: string
  acceptedAt: string | null
  preview: Omit<
    import("@zpr/contracts/data-import").ImportPreview,
    "eligibility"
  > & {
    eligibility: import("@zpr/domain").EligibilityAssessment
  }
}

export async function getLatestImportForUser(): Promise<LatestImportForUser | null> {
  return readView("/internal/data-import", (await cookies()).toString())
}
