import { describe, expect, it } from "vitest"

import { evaluate } from "../engine/evaluate"
import { QUESTIONS, questionsForStep, validateStep } from "./questions"
import { emptySituationAnswers, type SituationAnswers } from "./types"
import { toSituationAssessmentRequest } from "./mapping"
import { situationSummary } from "./summary"

function answers(patch: Partial<SituationAnswers> = {}): SituationAnswers {
  return { ...emptySituationAnswers(), ...patch }
}

function ids(
  step: Parameters<typeof questionsForStep>[0],
  value: SituationAnswers
) {
  return questionsForStep(step, value).map((question) => question.id)
}

const baseWork = {
  fatherIncluded: "NO" as const,
  motherEmployment: "EMPLOYMENT" as const,
  motherIncome: "8000",
}

describe("situation questionnaire", () => {
  it("keeps the due date optional when someone is only planning", () => {
    const value = answers({ scenario: "PLANNING", ...baseWork })
    expect(validateStep("family", value)).toEqual([])
    const request = toSituationAssessmentRequest(value)
    expect(request.event).toMatchObject({ kind: "PREGNANCY" })
    expect(request.event.expectedDueDate).toBeUndefined()
  })

  it("asks a pregnant user for the due date, not for a birth date", () => {
    const value = answers({ scenario: "PREGNANCY", ...baseWork })
    const family = ids("family", value)
    expect(family).toContain("dueDate")
    expect(family).toContain("hasZaZyciem")
    expect(family).not.toContain("birthDate")
    expect(family).not.toContain("premature")

    const issues = validateStep("family", value)
    expect(issues.map((issue) => issue.questionId)).toContain("dueDate")
  })

  it("rejects a date that does not exist", () => {
    const value = answers({
      scenario: "PREGNANCY",
      dueDate: "2027-02-31",
      ...baseWork,
    })
    expect(
      validateStep("family", value).map((issue) => issue.questionId)
    ).toContain("dueDate")
  })

  it("asks after birth about the actual date and prematurity, not the due date", () => {
    const value = answers({
      scenario: "BIRTH",
      birthDate: "2026-10-01",
      ...baseWork,
    })
    const family = ids("family", value)
    expect(family).toContain("birthDate")
    expect(family).toContain("premature")
    expect(family).not.toContain("dueDate")
    expect(validateStep("family", value)).toEqual([])
  })

  it("shows leave questions only to a user already on leave", () => {
    const onLeave = answers({
      scenario: "ON_LEAVE",
      birthDate: "2026-10-01",
      leaveKind: "MATERNITY",
      leaveStartDate: "2026-10-01",
      ...baseWork,
    })
    expect(ids("family", onLeave)).toContain("leaveKind")
    expect(ids("additional", onLeave)).toContain("leaveStartDate")

    const expecting = answers({
      scenario: "PREGNANCY",
      dueDate: "2027-03-10",
      ...baseWork,
    })
    expect(ids("family", expecting)).not.toContain("leaveKind")
    expect(ids("additional", expecting)).not.toContain("leaveStartDate")
  })

  it("does not ask about sickness insurance for an employment contract", () => {
    const employee = answers({
      scenario: "PREGNANCY",
      dueDate: "2027-03-10",
      motherEmployment: "EMPLOYMENT",
    })
    expect(ids("work", employee)).not.toContain("motherSickness")
    expect(ids("work", employee)).toContain("motherWorkingTimeFraction")

    const mandate = answers({
      ...employee,
      motherEmployment: "MANDATE",
    })
    expect(ids("work", mandate)).toContain("motherSickness")
    expect(
      validateStep("work", mandate).map((issue) => issue.questionId)
    ).toContain("motherSickness")
  })

  it("maps different employment forms without assuming an employment contract", () => {
    const mandate = toSituationAssessmentRequest(
      answers({
        scenario: "PREGNANCY",
        dueDate: "2027-03-10",
        motherEmployment: "MANDATE",
        motherSickness: "VOLUNTARY",
        motherIncome: "6000",
        fatherIncluded: "NO",
      })
    )
    expect(mandate.parents[0]?.insurance).toMatchObject({
      title: "MANDATE",
      sicknessInsurance: "VOLUNTARY",
    })
    expect(mandate.parents[0]?.basis).toEqual({
      method: "GROSS_MONTHLY",
      grossMonthlyGrosze: 600_000,
    })

    const none = toSituationAssessmentRequest(
      answers({
        scenario: "PREGNANCY",
        dueDate: "2027-03-10",
        motherEmployment: "NONE",
        fatherIncluded: "NO",
      })
    )
    expect(none.parents[0]?.insurance).toEqual({
      title: "NONE",
      sicknessInsurance: "NONE",
    })
    expect(none.parents[0]?.basis).toBeUndefined()
  })

  it("reports a partial result when the basis is missing instead of inventing an amount", () => {
    const request = toSituationAssessmentRequest(
      answers({
        scenario: "BIRTH",
        birthDate: "2026-10-01",
        motherEmployment: "EMPLOYMENT",
        fatherIncluded: "NO",
      })
    )
    const result = evaluate({ ...request, asOf: "2026-11-21" }).assessment
    expect(result.status).toBe("PARTIAL")
    expect(result.totals.amountStatus).not.toBe("CALCULATED")
    expect(result.missingEvidence.length).toBeGreaterThan(0)
    expect(result.totals.totalGrosze).toBeNull()
  })

  it("asks for manual review when the birth date is in the future", () => {
    const request = toSituationAssessmentRequest(
      answers({
        scenario: "BIRTH",
        birthDate: "2027-03-10",
        motherIncome: "8000",
        motherEmployment: "EMPLOYMENT",
        fatherIncluded: "NO",
      })
    )
    const result = evaluate({ ...request, asOf: "2026-11-21" }).assessment
    expect(result.status).toBe("MANUAL_REVIEW")
    expect(result.manualReviewReasons.length).toBeGreaterThan(0)
  })

  it("handles adoption and foster care from the care-taking date", () => {
    const adoption = toSituationAssessmentRequest(
      answers({
        scenario: "CARE",
        careKind: "ADOPTION",
        careTakingDate: "2026-09-01",
        childBirthDate: "2025-01-01",
        motherEmployment: "EMPLOYMENT",
        motherIncome: "8000",
        fatherIncluded: "NO",
      })
    )
    expect(adoption.event).toMatchObject({
      kind: "ADOPTION",
      careTakingDate: "2026-09-01",
      childBirthDate: "2025-01-01",
    })
    const result = evaluate({ ...adoption, asOf: "2026-11-22" }).assessment
    expect(result.anchor.kind).toBe("CARE_TAKING")
    expect(["COMPLETE", "PARTIAL", "MANUAL_REVIEW"]).toContain(result.status)
  })

  it("subtracts parental weeks already used when the user is on parental leave", () => {
    const request = toSituationAssessmentRequest(
      answers({
        scenario: "ON_LEAVE",
        birthDate: "2026-02-01",
        leaveKind: "PARENTAL",
        leaveStartDate: "2026-06-01",
        parentalWeeksUsed: "10",
        childrenCount: "1",
        motherEmployment: "EMPLOYMENT",
        motherIncome: "8000",
        fatherIncluded: "NO",
      })
    )
    // 41-week pool, 9 reserved for the second parent, 10 used → 22 weeks left.
    expect(request.plan?.parentalSegments?.[0]).toMatchObject({
      parent: "MOTHER",
      weeks: 22,
      startDate: "2026-06-01",
    })
  })

  it("maps the user's role and the other parent separately", () => {
    const value = answers({
      scenario: "BIRTH",
      birthDate: "2026-10-01",
      userRole: "FATHER",
      fatherIncluded: "YES",
      motherEmployment: "EMPLOYMENT",
      motherIncome: "8000",
      fatherEmployment: "MANDATE",
      fatherSickness: "VOLUNTARY",
      fatherIncome: "7000",
    })
    const request = toSituationAssessmentRequest(value)
    expect(request.parents.map((parent) => parent.role)).toEqual([
      "FATHER",
      "MOTHER",
    ])
    expect(request.parents[0]?.insurance).toMatchObject({ title: "EMPLOYMENT" })
    expect(request.parents[1]?.insurance).toMatchObject({
      title: "MANDATE",
      sicknessInsurance: "VOLUNTARY",
    })
    expect(ids("additional", value)).toContain("fatherPaternity")
  })

  it("ignores answers that belong to a different scenario", () => {
    const switchedToBirth = toSituationAssessmentRequest(
      answers({
        scenario: "BIRTH",
        birthDate: "2026-10-01",
        dueDate: "2027-03-10",
        ...baseWork,
      })
    )
    expect(switchedToBirth.event).toMatchObject({
      kind: "BIRTH",
      birthDate: "2026-10-01",
    })
    expect(switchedToBirth.event.expectedDueDate).toBeUndefined()

    const switchedToPregnancy = toSituationAssessmentRequest(
      answers({
        scenario: "PREGNANCY",
        birthDate: "2026-10-01",
        dueDate: "2027-03-10",
        ...baseWork,
      })
    )
    expect(switchedToPregnancy.event).toMatchObject({
      kind: "PREGNANCY",
      expectedDueDate: "2027-03-10",
    })
    expect(switchedToPregnancy.event.birthDate).toBeUndefined()
  })

  it("does not ask for a second parent's data when the user opts out", () => {
    const value = answers({
      scenario: "PREGNANCY",
      dueDate: "2027-03-10",
      ...baseWork,
    })
    expect(ids("work", value)).not.toContain("fatherEmployment")
    expect(toSituationAssessmentRequest(value).parents).toHaveLength(1)
  })

  it("every answer has a question and every substantive question names an engine fact", () => {
    const questionIds = new Set(QUESTIONS.map((question) => question.id))
    for (const key of Object.keys(emptySituationAnswers())) {
      expect(questionIds.has(key as never)).toBe(true)
    }
    for (const question of QUESTIONS) {
      expect(question.why.length).toBeGreaterThan(10)
      if (question.id !== "motherEmployerName") {
        expect(question.engineField).not.toBe("—")
      }
    }
    const text = QUESTIONS.map(
      (question) => `${question.label} ${question.help ?? ""}`
    ).join(" ")
    expect(text).not.toMatch(/PESEL|numer konta/i)
  })

  it("changes the engine event when the Za życiem answer changes", () => {
    const base = answers({
      scenario: "BIRTH",
      birthDate: "2026-10-01",
      ...baseWork,
    })
    expect(toSituationAssessmentRequest(base).event.zaZyciem).toBeUndefined()
    expect(
      toSituationAssessmentRequest({ ...base, hasZaZyciem: "YES" }).event
        .zaZyciem
    ).toBe(true)
  })

  it("builds a human-readable summary for the results screen", () => {
    const summary = situationSummary(
      answers({
        scenario: "PREGNANCY",
        dueDate: "2027-03-10",
        childrenCount: "2",
        motherEmployment: "MANDATE",
        motherSickness: "VOLUNTARY",
        motherIncome: "6000",
        fatherIncluded: "NO",
      })
    )
    expect(summary).toEqual(
      expect.arrayContaining([
        { label: "Sytuacja", value: "Oczekiwanie narodzin dziecka" },
        { label: "Termin porodu", value: "2027-03-10" },
        { label: "Liczba dzieci", value: "2" },
        { label: "Forma zatrudnienia", value: "Umowa zlecenia" },
      ])
    )
  })
})
