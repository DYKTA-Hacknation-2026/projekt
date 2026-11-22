import { mkdirSync, writeFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

import { householdInput } from "@zpr/ai"
import type { CaseFacts } from "@zpr/domain"
import { calculateBenefits } from "@zpr/domain"
import { evaluate, evaluateEligibility } from "@zpr/domain/engine"
import type { Assessment, BenefitType, EligibilityStatus, ParentRole } from "@zpr/domain/engine"

import { mapSampleCaseToCalculatorInput } from "@/lib/sample-case"

import { DEFAULT_CASES_DIR, loadReadyCases, mapCase, type LoadedCase } from "./support/zus-cases"

const DIR = process.env.SAMPLE_CASES_DIR ?? DEFAULT_CASES_DIR
const AS_OF = "2026-11-22"

type Result = "MATCH" | "PARTIAL" | "MISMATCH" | "NO_VERDICT"
type PathName = "formLaw" | "formNow" | "chatLaw" | "chatNow" | "calcNow"

const RANK: Record<Result, number> = { MATCH: 0, PARTIAL: 1, NO_VERDICT: 2, MISMATCH: 3 }

function worst(results: Result[]): Result {
  return results.reduce<Result>((acc, item) => (RANK[item] > RANK[acc] ? item : acc), "MATCH")
}

function statusOf(
  determinations: { parent: ParentRole; benefit: BenefitType; status: EligibilityStatus }[],
  parent: ParentRole,
  benefit: BenefitType
): EligibilityStatus | undefined {
  return determinations.find((entry) => entry.parent === parent && entry.benefit === benefit)?.status
}

function compare(expected: EligibilityStatus, actual: EligibilityStatus | undefined): Result {
  if (!actual) return "NO_VERDICT"
  if (expected === actual) return "MATCH"
  if (expected === "ELIGIBLE" && actual === "CONDITIONAL") return "PARTIAL"
  if (expected === "NOT_ELIGIBLE" && actual === "CONDITIONAL") return "PARTIAL"
  if (expected === "CONDITIONAL" && (actual === "ELIGIBLE" || actual === "CONDITIONAL")) return "PARTIAL"
  if (expected === "ELIGIBLE" && (actual === "NEEDS_INPUT" || actual === "MANUAL_REVIEW")) return "NO_VERDICT"
  if (expected === "NOT_ELIGIBLE" && (actual === "NEEDS_INPUT" || actual === "MANUAL_REVIEW")) return "NO_VERDICT"
  if (expected === "CONDITIONAL" && (actual === "NEEDS_INPUT" || actual === "MANUAL_REVIEW")) return "NO_VERDICT"
  return "MISMATCH"
}

interface Verdict {
  status: string | null
  eligibilityStatus: string | null
  ruleSet: string | null
  determinations: { parent: ParentRole; benefit: BenefitType; status: EligibilityStatus }[]
  missingEvidence: string[]
  totals: number | null
  breakdown: Assessment["breakdown"] | null
  periods: Assessment["periods"] | null
  error: string | null
}

function emptyVerdict(error: string | null = null): Verdict {
  return {
    status: null,
    eligibilityStatus: null,
    ruleSet: null,
    determinations: [],
    missingEvidence: [],
    totals: null,
    breakdown: null,
    periods: null,
    error,
  }
}

function formVerdict(input: Parameters<typeof evaluate>[0]): Verdict {
  try {
    const { assessment } = evaluate(input)
    return {
      status: assessment.status,
      eligibilityStatus: assessment.eligibility.status,
      ruleSet: assessment.ruleSet.version,
      determinations: assessment.eligibility.determinations,
      missingEvidence: assessment.missingEvidence.map((entry) => `${entry.parent ?? ""} ${entry.key}`.trim()),
      totals: assessment.totals.totalGrosze,
      breakdown: assessment.breakdown,
      periods: assessment.periods,
      error: null,
    }
  } catch (error) {
    return emptyVerdict(error instanceof Error ? `${error.name}: ${error.message}` : String(error))
  }
}

function chatVerdict(facts: CaseFacts, pin: boolean): Verdict {
  try {
    const household = householdInput(facts, { asOf: AS_OF })
    const input = pin ? { ...household.input, ruleSetVersion: "2026.10-Z1" } : household.input
    const report = evaluateEligibility(input)
    return {
      status: report.status,
      eligibilityStatus: report.eligibility.status,
      ruleSet: report.ruleSet.version,
      determinations: report.eligibility.determinations,
      missingEvidence: report.missingEvidence.map((entry) => `${entry.parent ?? ""} ${entry.key}`.trim()),
      totals: null,
      breakdown: null,
      periods: null,
      error: null,
    }
  } catch (error) {
    return emptyVerdict(error instanceof Error ? `${error.name}: ${error.message}` : String(error))
  }
}

function calculatorVerdict(raw: Record<string, unknown>): { verdict: Verdict; notes: string[]; missing: string[] } {
  try {
    const mapping = mapSampleCaseToCalculatorInput(raw)
    const result = calculateBenefits(mapping.input)
    return {
      verdict: {
        status: result.status,
        eligibilityStatus: result.analysis.eligibilityStatus,
        ruleSet: result.ruleSetVersion,
        determinations: result.analysis.determinations,
        missingEvidence: result.analysis.missingEvidence.map((entry) => `${entry.parent ?? ""} ${entry.key}`.trim()),
        totals: result.totalGrosze,
        breakdown: null,
        periods: null,
        error: null,
      },
      notes: [...mapping.notes, ...(mapping.missing.length ? [`Brakujące: ${mapping.missing.join("; ")}`] : [])],
      missing: mapping.missing,
    }
  } catch (error) {
    return {
      verdict: emptyVerdict(error instanceof Error ? `${error.name}: ${error.message}` : String(error)),
      notes: [],
      missing: [],
    }
  }
}

interface CheckResult {
  parent: ParentRole
  benefit: BenefitType
  expected: EligibilityStatus
  sourceStatus: string
  results: Record<PathName, Result>
  actual: Record<PathName, EligibilityStatus | null>
}

function verdictsFor(mapped: ReturnType<typeof mapCase>, raw: Record<string, unknown>) {
  const calculator = calculatorVerdict(raw)
  return {
    paths: {
      formLaw: formVerdict(mapped.input),
      formNow: formVerdict(mapped.inputCurrentLaw ?? mapped.input),
      chatLaw: chatVerdict(mapped.chatFacts, false),
      chatNow: chatVerdict(mapped.chatFactsCurrentLaw ?? mapped.chatFacts, true),
      calcNow: calculator.verdict,
    } as Record<PathName, Verdict>,
    calculatorNotes: calculator.notes,
  }
}

function amountFor(verdict: Verdict, benefit: BenefitType, parent: ParentRole): number | null {
  if (!verdict.breakdown) return null
  const lines = verdict.breakdown.filter((line) => line.benefit === benefit && line.parent === parent)
  if (lines.length === 0) return null
  if (lines.some((line) => line.amountGrosze === null)) return null
  return lines.reduce((sum, line) => sum + (line.amountGrosze ?? 0), 0)
}

function periodFor(verdict: Verdict, benefit: BenefitType, parent: ParentRole) {
  const periods = verdict.periods?.filter((period) => period.benefit === benefit && period.parent === parent) ?? []
  if (periods.length === 0) return null
  const start = periods.reduce((min, period) => (period.start < min ? period.start : min), periods[0]!.start)
  const end = periods.reduce((max, period) => (period.end > max ? period.end : max), periods[0]!.end)
  const days = periods.reduce((sum, period) => sum + period.days, 0)
  return { start, end, days }
}

function runCase(loaded: LoadedCase) {
  const mapped = mapCase(loaded.code, loaded.raw)
  const { paths: verdicts, calculatorNotes } = verdictsFor(mapped, loaded.raw)

  const checks: CheckResult[] = mapped.checks.map((check) => {
    const actual = {} as Record<PathName, EligibilityStatus | null>
    const results = {} as Record<PathName, Result>
    for (const path of Object.keys(verdicts) as PathName[]) {
      const status = statusOf(verdicts[path].determinations, check.parent, check.benefit)
      actual[path] = status ?? null
      results[path] = compare(check.status, status)
    }
    return {
      parent: check.parent,
      benefit: check.benefit,
      expected: check.status,
      sourceStatus: check.sourceStatus,
      actual,
      results,
    }
  })

  const amountChecks: string[] = []
  for (const [key, value] of Object.entries(mapped.expectedAmounts ?? {})) {
    const expected = typeof value === "number" ? value : null
    if (expected === null || expected <= 0) continue
    const benefit: BenefitType | null =
      key === "maternityTotalGrosze" ? "MATERNITY" : key === "parentalTotalGrosze" ? "PARENTAL" : null
    if (!benefit) continue
    const actual = amountFor(verdicts.formNow, benefit, "MOTHER") ?? amountFor(verdicts.formNow, benefit, "FATHER")
    amountChecks.push(`${key}: expected ${expected} gr, form-now ${actual ?? "brak"} gr${actual === expected ? " ✓" : " ✗"}`)
  }

  const periodChecks: string[] = []
  for (const check of mapped.periodChecks) {
    const actual = periodFor(verdicts.formNow, check.benefit, check.parent)
    if (!actual) {
      periodChecks.push(`${check.parent}/${check.benefit}: brak okresu w wyniku`)
      continue
    }
    const parts: string[] = []
    if (check.start && actual.start !== check.start) parts.push(`start ${actual.start} ≠ ${check.start}`)
    if (check.end && actual.end !== check.end) parts.push(`end ${actual.end} ≠ ${check.end}`)
    if (check.days !== undefined && actual.days !== check.days) parts.push(`dni ${actual.days} ≠ ${check.days}`)
    if (check.weeks !== undefined && Math.round(actual.days / 7) !== check.weeks) parts.push(`tyg. ${Math.round(actual.days / 7)} ≠ ${check.weeks}`)
    periodChecks.push(
      `${check.parent}/${check.benefit}: ${parts.length === 0 ? "zgodny" : parts.join(", ")} (wynik ${actual.start}–${actual.end}, ${actual.days} dni)`
    )
  }

  const summary = {} as Record<PathName, Result>
  for (const path of Object.keys(verdicts) as PathName[]) {
    summary[path] = worst(checks.map((check) => check.results[path]))
  }

  return {
    code: loaded.code,
    title: loaded.title,
    historical: mapped.historical,
    checks,
    summary,
    verdicts,
    amountChecks,
    periodChecks,
    notes: mapped.notes,
    missing: mapped.missing,
    calculatorNotes,
  }
}

describe("private ZUS sample cases — form and chatbot parity", () => {
  it("runs every READY case and writes a report", () => {
    const cases = loadReadyCases(DIR)
    if (cases.length === 0) {
      console.warn(`No private ZUS cases in ${DIR} — parity report skipped.`)
      return
    }
    const results = cases.map(runCase)
    const summary = Object.fromEntries(
      (Object.keys(results[0]?.summary ?? {}) as PathName[]).map((path) => [path, count(results.map((item) => item.summary[path]))])
    ) as Record<PathName, Record<Result, number>>
    const report = {
      generatedAt: new Date().toISOString(),
      asOf: AS_OF,
      cases: results.length,
      summary,
      results,
    }
    const outDir = join(DIR, "reports")
    mkdirSync(outDir, { recursive: true })
    writeFileSync(join(outDir, "zus-parity.json"), JSON.stringify(report, null, 2), "utf8")
    writeFileSync(join(outDir, "zus-parity.md"), toMarkdown(report), "utf8")
  })

  it("has no contradictory verdicts in the current-law simulation", () => {
    const cases = loadReadyCases(DIR)
    if (cases.length === 0) return
    const results = cases.map(runCase)
    for (const path of ["formNow", "chatNow"] as const) {
      const bad = results.filter((item) => item.summary[path] === "MISMATCH").map((item) => item.code)
      expect(bad, `${path}: contradictory verdicts`).toEqual([])
    }
  })

  it("keeps the no-coverage and contribution-debt refusals", () => {
    const cases = loadReadyCases(DIR)
    if (cases.length === 0) return
    const byCode = new Map(cases.map((item) => [item.code, runCase(item)]))
    for (const code of ["SC-06", "SC-21"]) {
      expect(byCode.get(code)?.checks[0]?.actual.formNow, code).toBe("NOT_ELIGIBLE")
    }
    expect(byCode.get("SC-09")?.checks[0]?.actual.formNow, "SC-09").toBe("NOT_ELIGIBLE")
  })
})

type Report = {
  generatedAt: string
  asOf: string
  cases: number
  summary: Record<PathName, Record<Result, number>>
  results: ReturnType<typeof runCase>[]
}

function count(values: Result[]): Record<Result, number> {
  return values.reduce<Record<Result, number>>(
    (acc, value) => ({ ...acc, [value]: acc[value] + 1 }),
    { MATCH: 0, PARTIAL: 0, NO_VERDICT: 0, MISMATCH: 0 }
  )
}

const PATH_LABEL: Record<PathName, string> = {
  formLaw: "Formularz — prawo z dnia zdarzenia",
  formNow: "Formularz — obecne przepisy (symulacja)",
  chatLaw: "Chatbot — prawo z dnia zdarzenia",
  chatNow: "Chatbot — obecne przepisy (symulacja)",
  calcNow: "Kalkulator — obecne przepisy",
}

function toMarkdown(report: Report): string {
  const lines: string[] = []
  lines.push("# ZUS sample cases — form and chatbot parity", "")
  lines.push(`Generated: ${report.generatedAt} · asOf: ${report.asOf} · cases: ${report.cases}`, "")
  lines.push("## Summary", "")
  lines.push("| Path | MATCH | PARTIAL | NO_VERDICT | MISMATCH |")
  lines.push("|---|---|---|---|---|")
  for (const path of Object.keys(PATH_LABEL) as PathName[]) {
    const item = report.summary[path]
    lines.push(`| ${PATH_LABEL[path]} | ${item.MATCH} | ${item.PARTIAL} | ${item.NO_VERDICT} | ${item.MISMATCH} |`)
  }
  lines.push("", "## Cases", "")
  lines.push("| Case | Expected check | Form law | Form now | Chat law | Chat now | Calc now |")
  lines.push("|---|---|---|---|---|---|---|")
  for (const item of report.results) {
    for (const check of item.checks) {
      lines.push(
        `| ${item.code} | ${check.parent} ${check.benefit} = ${check.sourceStatus} | ${check.actual.formLaw ?? "brak"} (${check.results.formLaw}) | ${check.actual.formNow ?? "brak"} (${check.results.formNow}) | ${check.actual.chatLaw ?? "brak"} (${check.results.chatLaw}) | ${check.actual.chatNow ?? "brak"} (${check.results.chatNow}) | ${check.actual.calcNow ?? "brak"} (${check.results.calcNow}) |`
      )
    }
  }
  lines.push("", "## Case summary", "")
  lines.push("| Case | Historical | Form law | Form now | Chat law | Chat now | Calc now |")
  lines.push("|---|---|---|---|---|---|---|")
  for (const item of report.results) {
    lines.push(
      `| ${item.code} | ${item.historical ? "tak" : "nie"} | ${item.summary.formLaw} | ${item.summary.formNow} | ${item.summary.chatLaw} | ${item.summary.chatNow} | ${item.summary.calcNow} |`
    )
  }
  lines.push("", "## Details", "")
  for (const item of report.results) {
    lines.push(`### ${item.code} — ${item.title}`, "")
    lines.push(`- Historical simulation: ${item.historical ? "tak" : "nie"}`)
    for (const path of Object.keys(PATH_LABEL) as PathName[]) {
      const verdict = item.verdicts[path]
      lines.push(
        `- ${PATH_LABEL[path]}: \`${verdict.status ?? "ERROR"}\` / eligibility \`${verdict.eligibilityStatus ?? "-"}\` / rules \`${verdict.ruleSet ?? "-"}\``
      )
      lines.push(`  - Determinations: ${verdict.determinations.map((entry) => `${entry.parent}/${entry.benefit}: ${entry.status}`).join(" · ") || "brak"}`)
      if (verdict.error) lines.push(`  - Error: ${verdict.error}`)
    }
    if (item.amountChecks.length) lines.push(`- Amounts: ${item.amountChecks.join("; ")}`)
    if (item.periodChecks.length) lines.push(`- Periods: ${item.periodChecks.join("; ")}`)
    if (item.missing.length) lines.push(`- Missing input: ${item.missing.join("; ")}`)
    if (item.calculatorNotes.length) lines.push(`- Calculator importer: ${item.calculatorNotes.join("; ")}`)
    if (item.notes.length) lines.push(`- Notes: ${item.notes.join("; ")}`)
    lines.push("")
  }
  return lines.join("\n")
}
