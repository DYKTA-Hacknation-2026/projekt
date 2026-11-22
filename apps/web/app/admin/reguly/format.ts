import type { RuleFieldMeta } from "@zpr/contracts/rules-admin"

import { formatPln, formatPercent } from "@/lib/format"

/** Read-only summary value for a rule field. */
export function formatRuleValue(field: RuleFieldMeta, value: unknown): string {
  if (value === null || value === undefined) {
    return field.allowNull ? "brak wartości" : "—"
  }
  switch (field.type) {
    case "boolean":
      return value ? "Tak" : "Nie"
    case "percent":
      return typeof value === "number" ? formatPercent(value) : "—"
    case "money":
      return typeof value === "number" ? formatPln(value) : "—"
    case "weeks":
    case "pool": {
      if (!value || typeof value !== "object") return "—"
      const object = value as Record<string, unknown>
      return Object.entries(field.objectLabels ?? {})
        .map(([key, label]) => {
          const entry = object[key]
          const formatted =
            typeof entry === "number" ? formatNumber(entry) : "—"
          return `${label}: ${formatted}${field.unit ? ` ${field.unit}` : ""}`
        })
        .join(" · ")
    }
    default:
      return `${formatNumber(value)}${field.unit ? ` ${field.unit}` : ""}`
  }
}

/** Value for the editable form control (percent as 0–100, money as PLN). */
export function ruleInputValue(field: RuleFieldMeta, value: unknown): string {
  if (typeof value !== "number") return ""
  if (field.type === "percent") {
    return String(Number((value * 100).toFixed(2)))
  }
  if (field.type === "money") {
    return String(Number((value / 100).toFixed(2)))
  }
  return String(value)
}

function formatNumber(value: unknown): string {
  if (typeof value === "number") {
    return new Intl.NumberFormat("pl-PL", {
      maximumFractionDigits: 4,
    }).format(value)
  }
  return String(value)
}
