import type { RuleSet } from "@zpr/domain"

import { cookies } from "next/headers"

import { ADMIN_COOKIE } from "@zpr/contracts/admin-token"
import { getEnv } from "@zpr/contracts/env"
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
