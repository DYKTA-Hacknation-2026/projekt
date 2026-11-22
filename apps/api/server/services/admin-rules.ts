import { AppError } from "@zpr/contracts/problem"
import {
  RULE_EDITOR_META,
  RuleParameterError,
  normalizeRuleParameters,
  saveRuleVersionSchema,
  type AdminRuleGroup,
  type AdminRuleVersion,
  type AdminRulesData,
  type SaveRuleVersionInput,
} from "@zpr/contracts/rules-admin"
import type { LegalRuleVersionDetail } from "@zpr/db/repositories"
import { RuleSetError, buildRuleSet } from "@zpr/domain"

import { getRepositories } from "@/server/container"
import { warsawToday } from "@/server/services/rule-set"

function addDays(date: string, days: number): string {
  const time = Date.parse(`${date}T00:00:00Z`) + days * 86_400_000
  return new Date(time).toISOString().slice(0, 10)
}

function nextVersionLabel(date: string, used: readonly string[]): string {
  const base = date.slice(0, 7).replace("-", ".")
  const labels = new Set(used)
  let suffix = 1
  while (labels.has(`${base}-Z${suffix}`)) suffix += 1
  return `${base}-Z${suffix}`
}

function toAdminVersion(row: LegalRuleVersionDetail): AdminRuleVersion {
  return { ...row, createdAt: row.createdAt.toISOString() }
}

/**
 * Every rule with its full version history, so the panel can show what is in
 * force today and what already waits for a future date.
 */
export async function getAdminRules(
  asOf: string = warsawToday()
): Promise<AdminRulesData> {
  const rows = await getRepositories().legal.listRuleVersionsDetailed()
  const grouped = new Map<string, LegalRuleVersionDetail[]>()

  for (const row of rows) {
    const list = grouped.get(row.ruleId)
    if (list) list.push(row)
    else grouped.set(row.ruleId, [row])
  }

  const rules: AdminRuleGroup[] = []

  for (const versions of grouped.values()) {
    const newest = versions[0]
    if (!newest) continue

    const current =
      versions.find(
        (row) =>
          row.effectiveFrom <= asOf &&
          (!row.effectiveTo || row.effectiveTo >= asOf)
      ) ?? null

    const nextEffectiveFromRaw = addDays(newest.effectiveFrom, 1)
    // A new version may start today at the earliest, never in the past.
    const nextEffectiveFrom =
      nextEffectiveFromRaw > asOf ? nextEffectiveFromRaw : asOf

    rules.push({
      ruleId: newest.ruleId,
      code: newest.code,
      title: newest.title,
      description: newest.description,
      category: newest.category,
      legalReference: newest.legalReference,
      current: current ? toAdminVersion(current) : null,
      versions: versions.map(toAdminVersion),
      nextEffectiveFrom,
      suggestedVersion: nextVersionLabel(
        nextEffectiveFrom,
        versions.map((row) => row.version)
      ),
    })
  }

  rules.sort((a, b) => a.code.localeCompare(b.code))
  return { asOf, rules }
}

function requireHttpUrl(value: string | undefined): string | null {
  if (!value) return null
  try {
    const url = new URL(value)
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      throw new Error("unsupported protocol")
    }
    return url.toString()
  } catch {
    throw new AppError(
      400,
      "BAD_REQUEST",
      "Adres źródła musi być poprawnym adresem http(s)."
    )
  }
}

/**
 * Appends a new, immutable version of a single rule (AD-02). The previous
 * version is closed the day before, and the candidate parameter set is run
 * through the same `buildRuleSet` the calculator uses before anything is
 * written, so an editor cannot publish an internally inconsistent rule set.
 */
export async function saveAdminRuleVersion(
  raw: unknown
): Promise<AdminRuleVersion> {
  const input: SaveRuleVersionInput = saveRuleVersionSchema.parse(raw)
  const today = warsawToday()

  if (input.effectiveFrom < today) {
    throw new AppError(
      400,
      "BAD_REQUEST",
      `Nowa wersja może obowiązywać najwcześniej od dziś (${today}).`
    )
  }

  const data = await getAdminRules(today)
  const group = data.rules.find((rule) => rule.ruleId === input.ruleId)

  if (!group) {
    throw new AppError(404, "NOT_FOUND", "Nie znaleziono reguły.")
  }
  if (!RULE_EDITOR_META[group.code]) {
    throw new AppError(
      400,
      "BAD_REQUEST",
      `Reguła ${group.code} nie ma jeszcze edytora w panelu.`
    )
  }

  const latest = group.versions[0]
  if (!latest) {
    throw new AppError(409, "CONFLICT", "Reguła nie ma żadnej wersji.")
  }
  if (input.effectiveFrom <= latest.effectiveFrom) {
    throw new AppError(
      409,
      "CONFLICT",
      `Data musi być późniejsza niż początek ostatniej wersji (${latest.effectiveFrom}).`
    )
  }
  if (latest.effectiveTo && input.effectiveFrom <= latest.effectiveTo) {
    throw new AppError(
      409,
      "CONFLICT",
      `Data koliduje z zamkniętą wersją obowiązującą do ${latest.effectiveTo}.`
    )
  }

  const sourceUrl = requireHttpUrl(input.sourceUrl?.trim() || undefined)
  if (input.verificationStatus === "VERIFIED" && !sourceUrl) {
    throw new AppError(
      400,
      "BAD_REQUEST",
      "Oznaczenie „zweryfikowana” wymaga adresu źródła."
    )
  }

  let normalized: Record<string, unknown>
  try {
    normalized = normalizeRuleParameters(group.code, input.parameters)
  } catch (error) {
    if (error instanceof RuleParameterError) {
      throw new AppError(
        422,
        "VALIDATION_ERROR",
        "Popraw zaznaczone parametry reguły.",
        { fieldErrors: error.fieldErrors }
      )
    }
    throw error
  }

  const parameters = { ...latest.parameters, ...normalized }
  const effectiveRows = await getRepositories().legal.getRuleParameters(
    input.effectiveFrom
  )

  const candidate = {
    id: "pending",
    code: group.code,
    version: "pending",
    effectiveFrom: input.effectiveFrom,
    effectiveTo: null,
    verificationStatus: input.verificationStatus,
    parameters,
  }

  const rows = effectiveRows.some((row) => row.code === group.code)
    ? effectiveRows.map((row) => (row.code === group.code ? candidate : row))
    : [...effectiveRows, candidate]

  try {
    buildRuleSet(rows)
  } catch (error) {
    if (error instanceof RuleSetError) {
      throw new AppError(
        422,
        "VALIDATION_ERROR",
        `Zestaw reguł byłby niespójny: ${error.message}`,
        {
          missingRules: error.missingCodes,
          invalidParameters: error.invalidKeys,
        }
      )
    }
    throw error
  }

  const version = nextVersionLabel(
    input.effectiveFrom,
    group.versions.map((row) => row.version)
  )
  const noteParts = [
    "Zmiana z panelu administratora.",
    input.notes?.trim() || null,
  ].filter((part): part is string => Boolean(part))

  const created = await getRepositories().legal.createRuleVersion({
    ruleId: group.ruleId,
    version,
    effectiveFrom: input.effectiveFrom,
    parameters,
    verificationStatus: input.verificationStatus,
    sourceUrl,
    notes: noteParts.join(" "),
    closePreviousTo: addDays(input.effectiveFrom, -1),
  })

  return toAdminVersion(created)
}
