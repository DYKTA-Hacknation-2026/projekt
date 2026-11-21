"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import {
  RULE_EDITOR_META,
  type RuleFieldMeta,
} from "@zpr/contracts/rules-admin"

import { getAdminSession } from "@/server/auth/admin-session"
import { AdminRulesApiError, saveAdminRuleVersion } from "@/server/api-client"

function failed(message: string): never {
  redirect(`/admin/reguly?blad=${encodeURIComponent(message)}`)
}

function parseNumber(raw: string): number {
  const normalized = raw.trim().replace(/\s/g, "").replace(",", ".")
  return normalized === "" ? Number.NaN : Number(normalized)
}

function parseField(field: RuleFieldMeta, formData: FormData): unknown {
  if (field.type === "boolean") {
    return formData.get(`param.${field.key}`) === "on"
  }

  if (field.type === "weeks" || field.type === "pool") {
    const object: Record<string, number> = {}
    for (const key of Object.keys(field.objectLabels ?? {})) {
      object[key] = parseNumber(
        String(formData.get(`param.${field.key}.${key}`) ?? "")
      )
    }
    return object
  }

  const raw = String(formData.get(`param.${field.key}`) ?? "")
  if (field.type === "money") {
    if (raw.trim() === "") return null
    return Math.round(parseNumber(raw) * 100)
  }

  const value = parseNumber(raw)
  return field.type === "percent" ? value / 100 : value
}

export async function saveRuleAction(formData: FormData) {
  const session = await getAdminSession()
  if (session.gateEnabled && !session.authenticated) {
    throw new Error("Brak uprawnień administratora.")
  }

  const ruleId = String(formData.get("ruleId") ?? "").trim()
  const code = String(formData.get("code") ?? "").trim()
  const effectiveFrom = String(formData.get("effectiveFrom") ?? "").trim()
  const verificationStatus = String(
    formData.get("verificationStatus") ?? "PROPOSED"
  ) as "VERIFIED" | "PROPOSED" | "UNVERIFIED"
  const sourceUrl = String(formData.get("sourceUrl") ?? "").trim()
  const notes = String(formData.get("notes") ?? "").trim()

  const meta = RULE_EDITOR_META[code]
  if (!ruleId || !meta) failed("Nieprawidłowa reguła.")

  const parameters: Record<string, unknown> = {}
  for (const field of meta.fields) {
    parameters[field.key] = parseField(field, formData)
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(effectiveFrom)) {
    failed("Wybierz poprawną datę wejścia w życie.")
  }

  let saved: Awaited<ReturnType<typeof saveAdminRuleVersion>>
  try {
    saved = await saveAdminRuleVersion({
      ruleId,
      effectiveFrom,
      verificationStatus,
      sourceUrl: sourceUrl || undefined,
      notes: notes || undefined,
      parameters,
    })
  } catch (error) {
    failed(
      error instanceof AdminRulesApiError
        ? error.message
        : "Nie udało się zapisać nowej wersji. Spróbuj ponownie."
    )
  }

  revalidatePath("/admin/reguly")
  revalidatePath("/admin")
  revalidatePath("/kalkulator")
  revalidatePath("/os-czasu")

  redirect(
    `/admin/reguly?zapisano=${encodeURIComponent(code)}&wersja=${encodeURIComponent(saved.version)}`
  )
}
