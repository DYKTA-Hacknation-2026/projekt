import { describe, expect, it } from "vitest"

import type { ImportedCaseData } from "@zpr/contracts/data-import"

import { buildTimelineSeed, DEMO_SEED } from "@/lib/plan-seed"

describe("timeline seed from imported household data", () => {
  it("uses the expected due date for a pregnancy", () => {
    const seed = buildTimelineSeed({
      eventType: "PREGNANCY",
      expectedDueDate: "2027-05-10",
      childrenCount: 2,
      hasZaZyciem: true,
      employmentType: "EMPLOYMENT",
    } satisfies ImportedCaseData)
    expect(seed).toMatchObject({
      dueDate: "2027-05-10",
      birthDate: undefined,
      childrenCount: 2,
      hasZaZyciem: true,
      employmentType: "EMPLOYMENT",
      eventType: "PREGNANCY",
      demo: false,
    })
  })

  it("uses the actual birth date and does not keep a guessed due date", () => {
    const seed = buildTimelineSeed({
      eventType: "BIRTH",
      eventDate: "2027-03-07",
      expectedDueDate: "2027-03-10",
      childrenCount: 1,
    } satisfies ImportedCaseData)
    expect(seed.dueDate).toBeUndefined()
    expect(seed.birthDate).toBe("2027-03-07")
  })

  it("falls back to the expected date when the birth date is missing", () => {
    const seed = buildTimelineSeed({
      eventType: "BIRTH",
      expectedDueDate: "2027-03-10",
    } satisfies ImportedCaseData)
    expect(seed.dueDate).toBe("2027-03-10")
    expect(seed.birthDate).toBeUndefined()
  })

  it("leaves both dates empty for adoption and foster care", () => {
    const adoption = buildTimelineSeed({
      eventType: "ADOPTION",
      eventDate: "2027-04-01",
      expectedDueDate: "2027-03-10",
    } satisfies ImportedCaseData)
    expect(adoption.dueDate).toBeUndefined()
    expect(adoption.birthDate).toBeUndefined()
    expect(adoption.eventType).toBe("ADOPTION")
    expect(adoption.demo).toBe(false)
  })

  it("marks a demo seed explicitly", () => {
    expect(DEMO_SEED).toEqual({ demo: true })
  })
})
