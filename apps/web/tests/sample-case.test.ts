import { describe, expect, it } from "vitest"

import { mapSampleCaseToCalculatorInput } from "@/lib/sample-case"

describe("ZUS sample case importer", () => {
  it("maps birth facts, known basis and a parental segment with work", () => {
    const mapping = mapSampleCaseToCalculatorInput({
      code: "SC-TEST",
      title: "Testowa sprawa",
      facts: {
        household: {
          parents: [
            {
              id: "P1",
              role: "MOTHER",
              insuranceTitles: [
                {
                  kind: "EMPLOYMENT",
                  startDate: "2024-01-01",
                  sicknessCoverage: { mode: "COMPULSORY" },
                },
              ],
            },
          ],
          familyEvent: {
            kind: "BIRTH",
            date: "2026-08-01",
            children: [{ birthDate: "2026-08-01", stillborn: false }],
          },
        },
        scenario: {
          paymentOption: "STANDARD_100_70",
          segments: [
            {
              parentId: "P1",
              kind: "MATERNITY",
              start: "2026-08-01",
              end: "2026-12-18",
              weeks: 20,
            },
            {
              parentId: "P1",
              kind: "PARENTAL",
              start: "2026-12-19",
              weeks: 32,
              workFraction: 0.5,
            },
          ],
        },
      },
      expected: {
        eligibility: { status: "ELIGIBLE" },
        basis: { monthlyBasisGrosze: 500_000 },
        notes: ["nota"],
      },
    })

    expect(mapping.input.mode).toBe("BIRTH")
    expect(mapping.input.incomeMode).toBe("KNOWN_BASIS")
    expect(mapping.input.knownBasisGrosze).toBe(500_000)
    expect(mapping.input.motherParentalWeeks).toBe(32)
    expect(mapping.input.parentalWorkFraction).toBe(0.5)
    expect(mapping.input.workCombinedWeeks).toBe(32)
    expect(mapping.expected.outcome).toBe("ELIGIBLE")
    expect(mapping.historical).toBe(false)
  })

  it("maps an adoption case with dates and a declared basis", () => {
    const mapping = mapSampleCaseToCalculatorInput({
      code: "SC-TEST-2",
      facts: {
        household: {
          parents: [
            {
              id: "P1",
              role: "CAREGIVER",
              insuranceTitles: [
                {
                  kind: "SELF_EMPLOYMENT",
                  sicknessCoverage: { mode: "VOLUNTARY" },
                  declaredBasisGrosze: 108_000,
                },
              ],
            },
          ],
          familyEvent: {
            kind: "CARE_TAKING",
            arrangement: "ADOPTION_PENDING",
            date: "2026-01-05",
            children: [{ birthDate: "2021-01-05", stillborn: false }],
          },
        },
        scenario: {
          segments: [
            { kind: "MATERNITY_TERMS", parentId: "P1", weeks: 20 },
            { kind: "PARENTAL", parentId: "P1", weeks: 32 },
          ],
        },
      },
    })

    expect(mapping.input.mode).toBe("ADOPTION")
    expect(mapping.input.childAgeYears).toBeGreaterThanOrEqual(4.9)
    expect(mapping.input.employmentType).toBe("BUSINESS")
    expect(mapping.input.motherSicknessInsurance).toBe("VOLUNTARY")
    expect(mapping.input.grossMonthlyIncomeGrosze).toBe(108_000)
    expect(mapping.input.motherParentalWeeks).toBe(32)
    expect(mapping.input.fatherEnabled).toBe(false)
  })

  it("uses the expected basis for a father-only case", () => {
    const mapping = mapSampleCaseToCalculatorInput({
      facts: {
        household: {
          parents: [
            { id: "P1", role: "MOTHER", insuranceTitles: [] },
            {
              id: "P2",
              role: "FATHER",
              insuranceTitles: [{ kind: "EMPLOYMENT", sicknessCoverage: { mode: "COMPULSORY" } }],
            },
          ],
          familyEvent: { kind: "BIRTH", date: "2024-01-10" },
        },
        scenario: {
          segments: [{ parentId: "P2", kind: "PARENTAL", weeks: 32 }],
        },
      },
      expected: { basis: { monthlyBasisGrosze: 368_544.59 } },
    })
    expect(mapping.input.motherEnabled).toBe(false)
    expect(mapping.input.fatherEnabled).toBe(true)
    expect(mapping.input.incomeMode).toBe("KNOWN_BASIS")
    expect(mapping.input.secondParentKnownBasisGrosze).toBe(368_545)
    expect(mapping.input.secondParentParentalWeeks).toBe(32)
  })

  it("reports missing insurance and basis instead of inventing values", () => {
    const mapping = mapSampleCaseToCalculatorInput({
      facts: {
        household: {
          parents: [{ id: "P1", role: "MOTHER", insuranceTitles: [] }],
          familyEvent: { kind: "BIRTH", date: null },
        },
      },
    })

    expect(mapping.input.motherEnabled).toBe(false)
    expect(mapping.missing.join(" ")).toContain("brak tytułu ubezpieczenia")
    expect(mapping.missing.join(" ")).toContain("datę porodu")
  })
})
