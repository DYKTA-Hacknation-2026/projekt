import { describe, expect, it } from "vitest"

import type { DataScope } from "@zpr/contracts/data-import"
import type { MobywatelPersona } from "@zpr/contracts/mobywatel"

import { fetchSelectedSources } from "./engine"
import { buildInitialCaseData, previewImportData } from "./mapping"
import {
  annaEmploymentScenario,
  findScenarioForPersona,
  kasiaIncompleteScenario,
  marekSelfEmploymentScenario,
} from "./scenarios"
import type { ScenarioContext } from "./mapping"

const NOW = "2026-11-21T09:00:00.000Z"
const ALL_SCOPES: DataScope[] = [
  "INSURANCE_HISTORY",
  "CONTRIBUTION_BASIS",
  "CONTRIBUTION_STATUS",
  "EMPLOYMENT_HISTORY",
  "SICK_LEAVE_HISTORY",
  "CHILD_DATA",
  "BENEFIT_CASES",
]

const PERSONAS: Record<string, MobywatelPersona> = {
  "anna-kowalska": {
    id: "anna-kowalska",
    firstName: "Anna",
    lastName: "Kowalska",
    birthDate: "1994-05-14",
    city: "Warszawa",
    email: "anna.kowalska@example.test",
    description: "Ciąża, jedno dziecko, umowa o pracę.",
    initials: "AK",
  },
  "marek-wisniewski": {
    id: "marek-wisniewski",
    firstName: "Marek",
    lastName: "Wiśniewski",
    birthDate: "1988-07-19",
    city: "Wrocław",
    email: "marek.wisniewski@example.test",
    description: "Działalność gospodarcza.",
    initials: "MW",
  },
  "kasia-nowak": {
    id: "kasia-nowak",
    firstName: "Kasia",
    lastName: "Nowak",
    birthDate: "1997-11-02",
    city: "Kraków",
    email: "kasia.nowak@example.test",
    description: "Umowa zlecenia zakończona przed porodem.",
    initials: "KN",
  },
}

function context(personaId: string, scopes: DataScope[] = ALL_SCOPES): ScenarioContext {
  const persona = PERSONAS[personaId]
  const scenario = findScenarioForPersona(personaId)
  if (!persona || !scenario) throw new Error("Brak scenariusza testowego")
  const results = fetchSelectedSources({ scenario, persona, scopes, now: NOW })
  return { scenario, persona, results, scopes, now: NOW }
}

describe("simulated data sources", () => {
  it("keeps employer, ZUS and benefit basis consistent in the employed scenario", () => {
    const scenario = annaEmploymentScenario
    const zus = scenario.sources.ZUS
    const employer = scenario.sources.EMPLOYER
    const employment = employer.employments[0]
    const period = zus.insurancePeriods[0]
    const basis = zus.benefitBasis

    expect(employment?.payerName).toBe(period?.payerName)
    expect(employment?.startDate).toBe(period?.startDate)
    expect(employment?.grossMonthlyAmountGrosze).toBe(800_000)
    expect(basis?.averageMonthlyBasisGrosze).toBeGreaterThan(0)
    expect(basis?.monthsCount).toBe(12)
    expect(zus.contributionBases).toHaveLength(12)

    const averageGross =
      zus.contributionBases.reduce((sum, row) => sum + row.basisGrosze, 0) /
      zus.contributionBases.length
    expect(basis?.averageMonthlyBasisGrosze).toBe(
      Math.round(averageGross * (1 - 0.1371))
    )

    for (const leave of scenario.sources.EZLA.sickLeaves) {
      expect(leave.startDate >= (period?.startDate ?? "")).toBe(true)
      expect(period?.endDate).toBeNull()
    }
  })

  it("keeps the USC birth date aligned with the PUE family event", () => {
    const scenario = marekSelfEmploymentScenario
    const child = scenario.sources.USC.children[0]
    const event = scenario.sources.USC.familyEvents[0]
    const period = scenario.sources.ZUS.insurancePeriods[0]

    expect(child?.birthDate).toBe(event?.eventDate)
    expect(event?.childIds).toContain(child?.id)
    expect(event?.eventDate && period?.startDate && event.eventDate >= period.startDate).toBe(true)
    expect(scenario.sources.EMPLOYER.payers[0]?.id).toBe(period?.payerId)
  })

  it("fetches all available sources for the employed scenario", () => {
    const ctx = context("anna-kowalska")
    const bySource = new Map(ctx.results.map((result) => [result.source, result]))

    expect(bySource.get("ZUS")?.status).toBe("SUCCESS")
    expect(bySource.get("EMPLOYER")?.status).toBe("SUCCESS")
    expect(bySource.get("EZLA")?.status).toBe("SUCCESS")
    expect(bySource.get("USC")?.status).toBe("EMPTY")
    expect(bySource.get("PUE")?.status).toBe("SUCCESS")
    expect(bySource.get("ZUS")?.provenance.transport).toBe("SIMULATED")

    const initial = buildInitialCaseData(ctx)
    expect(initial.data.employmentType).toBe("EMPLOYMENT")
    expect(initial.data.employerName).toBe("Przykładowy Pracodawca S.A.")
    expect(initial.data.insuranceStartDate).toBe("2024-01-01")
    expect(initial.data.grossMonthlyIncomePln).toBe(8000)
    expect(initial.data.monthlyBasisGrosze).toBe(
      annaEmploymentScenario.sources.ZUS.benefitBasis?.averageMonthlyBasisGrosze
    )
    expect(initial.data.eventType).toBeUndefined()
    expect(initial.fieldSources.firstName?.origin).toBe("MOBYWATEL")
    expect(initial.fieldSources.monthlyBasisGrosze?.origin).toBe("ZUS")
  })

  it("maps imported data into eligibility and the calculator", () => {
    const ctx = context("anna-kowalska")
    const preview = previewImportData(ctx)
    const next = previewImportData(ctx, {
      ...preview.data,
      eventType: "BIRTH",
      eventDate: "2026-10-28",
      expectedDueDate: undefined,
      childrenCount: 1,
      hasZaZyciem: false,
      isPremature: false,
    })

    expect(preview.data.eventType).toBeUndefined()
    expect(preview.validationIssues.map((issue) => issue.code)).toContain(
      "MISSING_EVENTTYPE"
    )
    expect(preview.summary.manualFields.map((field) => field.field)).toContain(
      "childrenCount"
    )

    expect(next.fieldSources.eventType?.origin).toBe("MANUAL")
    expect(next.summary.manualFields.map((field) => field.field)).not.toContain(
      "eventType"
    )
    expect(next.sickLeave.totalDays).toBe(19)
    expect(next.sickLeave.pregnancyRelatedDays).toBe(19)
    expect(
      next.eligibility.determinations
        .find((item) => item.benefit === "SICKNESS_IN_PREGNANCY")
        ?.reasons.map((reason) => reason.ruleId)
    ).toContain("A-15")
    expect(next.calculation.basisGrosze).toBe(next.data.monthlyBasisGrosze)
    expect(next.calculation.normalizedChildrenCount).toBe(1)
    expect(
      next.eligibility.determinations.find(
        (item) => item.benefit === "PATERNITY_BENEFIT"
      )?.status
    ).toBe("NOT_ELIGIBLE")
  })

  it("handles self-employment with voluntary insurance and arrears", () => {
    const ctx = context("marek-wisniewski")
    const preview = previewImportData(ctx)

    expect(
      ctx.results.find((result) => result.source === "EMPLOYER")?.status
    ).toBe("PARTIAL")
    expect(preview.data.employmentType).toBe("SELF_EMPLOYMENT")
    expect(preview.data.coverageMode).toBe("VOLUNTARY")
    expect(preview.data.eventType).toBe("BIRTH")
    expect(preview.data.childrenCount).toBe(1)
    expect(preview.data.eventDate).toBe("2026-08-12")
    expect(preview.data.grossMonthlyIncomePln).toBe(6000)

    const maternity = preview.eligibility.determinations.find(
      (item) => item.benefit === "MATERNITY_ALLOWANCE"
    )
    expect(maternity?.status).toBe("INDETERMINATE")
    expect(maternity?.reasons.map((reason) => reason.ruleId)).toContain("Q-11")

    const parental = preview.eligibility.determinations.find(
      (item) => item.benefit === "PARENTAL_LEAVE_BENEFIT"
    )
    expect(parental?.status).toBe("INDETERMINATE")
    expect(parental?.reasons.map((reason) => reason.ruleId)).toContain("A-09")
  })

  it("surfaces empty and failed sources and the insurance gap", () => {
    const ctx = context("kasia-nowak")
    const bySource = new Map(ctx.results.map((result) => [result.source, result]))
    const preview = previewImportData(ctx)

    expect(bySource.get("ZUS")?.status).toBe("PARTIAL")
    expect(bySource.get("EZLA")?.status).toBe("ERROR")
    expect(bySource.get("EZLA")?.data).toBeNull()
    expect(bySource.get("USC")?.status).toBe("EMPTY")
    expect(bySource.get("PUE")?.status).toBe("EMPTY")
    expect(preview.sickLeave.status).toBe("INDETERMINATE")
    expect(preview.summary.inconsistencies.map((item) => item.code)).toContain(
      "EZLA_UNAVAILABLE"
    )
    expect(preview.summary.manualFields.map((field) => field.field)).toContain(
      "eventType"
    )

    const maternity = preview.eligibility.determinations.find(
      (item) => item.benefit === "MATERNITY_ALLOWANCE"
    )
    expect(maternity?.status).toBe("NOT_ELIGIBLE")
    expect(maternity?.reasons[0]?.text).toContain("ustało 2026-09-30")
  })

  it("respects the consent scope and never fetches excluded sources", () => {
    const ctx = context("anna-kowalska", ["INSURANCE_HISTORY"])
    const initial = buildInitialCaseData(ctx)

    expect(ctx.results).toHaveLength(1)
    expect(ctx.results[0]?.source).toBe("ZUS")
    const zus = ctx.results[0]?.data
    expect(zus?.source).toBe("ZUS")
    if (zus?.source === "ZUS") {
      expect(zus.insurancePeriods.length).toBeGreaterThan(0)
      expect(zus.contributionBases).toHaveLength(0)
      expect(zus.arrears).toBeNull()
      expect(zus.benefitBasis).toBeNull()
    }
    expect(initial.data.monthlyBasisGrosze).toBeUndefined()
    expect(initial.data.employerName).toBe("Przykładowy Pracodawca S.A.")
  })

  it("is deterministic for the same scenario and time", () => {
    const first = previewImportData(context("anna-kowalska"))
    const second = previewImportData(context("anna-kowalska"))

    expect(JSON.stringify(first)).toBe(JSON.stringify(second))
  })

  it("maps Tomasz to the employed household as the second parent", () => {
    const scenario = findScenarioForPersona("tomasz-kowalski")
    expect(scenario?.id).toBe(annaEmploymentScenario.id)
    expect(scenario?.parentRole).toBe("FATHER")
    expect(kasiaIncompleteScenario.personaIds).toContain("kasia-nowak")
  })
})
