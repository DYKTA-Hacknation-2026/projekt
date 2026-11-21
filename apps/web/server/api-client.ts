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
  if (cookie) headers.set("cookie", ADMIN_COOKIE + "=" + cookie)

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
  return readView("/internal/admin", token)
}

export function getActiveRuleSet(): Promise<RuleSet> {
  return readView("/internal/rule-set")
}
