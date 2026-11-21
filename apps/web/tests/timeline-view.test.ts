import { describe, expect, it } from "vitest"

import { addDays } from "@zpr/domain"
import { testRuleSet } from "@zpr/domain/testing"

import { buildTimeline } from "@/lib/timeline"
import {
  buildTimelineView,
  daysUntilLabel,
  durationLabel,
  filterTimeline,
  findNearestDate,
  findNextTask,
  formatDateRange,
  getCurrentStage,
} from "@/lib/timeline-view"

const ruleSet = testRuleSet()
const today = "2026-11-21"

function plan() {
  return buildTimeline(
    {
      dueDate: "2027-03-10",
      maternityWeeksBeforeBirth: 2,
      childrenCount: 1,
      secondParentParentalWeeks: 9,
      paternityDays: 14,
      hasZaZyciem: false,
    },
    ruleSet
  )
}

describe("parental plan data", () => {
  it("exposes leave periods as real date ranges with owners", () => {
    const result = plan()
    expect(result.periods.length).toBeGreaterThan(0)
    const maternity = result.periods.find(
      (period) => period.id === "maternity"
    )
    expect(maternity?.owner).toBe("MAMA")
    expect(maternity?.start).toBe("2027-03-10")
    expect(maternity?.end).toBe("2027-07-13")
    expect(maternity?.days).toBe(126)
    expect(maternity?.documents.length).toBeGreaterThan(0)
    expect(maternity?.legalReference).toContain("LR-123")

    const preBirth = result.periods.find((period) => period.id === "maternity-pre")
    expect(preBirth?.start).toBe("2027-02-24")
    expect(preBirth?.end).toBe("2027-03-09")

    const paternity = result.periods.find(
      (period) => period.benefit === "PATERNITY"
    )
    expect(paternity?.owner).toBe("TATA")
    expect(paternity?.start).toBe("2027-03-10")
    expect(paternity?.days).toBe(14)
  })

  it("keeps the other parent's reserved weeks on the father's track", () => {
    const result = plan()
    const fatherParental = result.periods.filter(
      (period) => period.benefit === "PARENTAL" && period.owner === "TATA"
    )
    expect(fatherParental.length).toBeGreaterThan(0)
    const days = fatherParental.reduce((sum, period) => sum + period.days, 0)
    expect(days).toBe(9 * 7)
  })

  it("marks dates as estimated and exposes a legal basis and document list", () => {
    const result = plan()
    expect(result.anchor.kind).toBe("DUE_DATE")
    expect(result.anchor.estimated).toBe(true)
    const deadline = result.milestones.find(
      (milestone) => milestone.id === "application-815"
    )
    expect(deadline?.basis).toBe("STATUTORY")
    expect(deadline?.estimated).toBe(true)
    expect(deadline?.legalReference).toContain("LR-130A")
    expect(deadline?.documents?.length).toBeGreaterThan(0)
    expect(result.missing.length).toBeGreaterThan(0)
  })

  it("uses an actual birth date when one is known", () => {
    const result = buildTimeline(
      {
        dueDate: "2027-03-10",
        birthDate: "2027-03-07",
        maternityWeeksBeforeBirth: 2,
        childrenCount: 1,
        secondParentParentalWeeks: 9,
        paternityDays: 14,
        hasZaZyciem: false,
      },
      ruleSet
    )
    expect(result.anchor.kind).toBe("BIRTH")
    expect(result.anchor.date).toBe("2027-03-07")
    expect(result.anchor.estimated).toBe(false)
    expect(
      result.milestones.find((milestone) => milestone.id === "birth")?.title
    ).toBe("Data porodu")
  })

  it("derives five stages from the plan instead of fixed dates", () => {
    const result = plan()
    expect(result.stages).toHaveLength(5)
    expect(result.stages[0]?.title).toBe("Przygotowania przed narodzinami")
    expect(result.stages[0]?.start).toBe("2027-02-24")
    expect(result.stages[1]?.start).toBe("2027-03-10")
    expect(result.stages[2]?.start).toBe("2027-02-24")
    expect(result.stages[3]?.start).toBe("2027-07-14")
    for (const stage of result.stages) {
      if (stage.start && stage.end) {
        expect(stage.start <= stage.end).toBe(true)
      }
    }
  })
})

describe("plan timeline presentation", () => {
  it("returns the nearest actionable task and the current stage", () => {
    const result = plan()
    const { next } = findNextTask(result, today)
    expect(next?.milestone.id).toBe("maternity-pre-birth-request")
    expect(next?.date).toBe(
      addDays("2027-02-24", -ruleSet.deadlines.maternityPreBirthRequestDays)
    )
    expect(next?.status).toBe("upcoming")

    const nearest = findNearestDate(result, today)
    expect(nearest?.id).toBe("maternity-pre-birth-request")

    const stage = getCurrentStage(result, today)
    expect(stage?.id).toBe("before-birth")
  })

  it("builds one shared scale and separate tracks for both parents", () => {
    const result = plan()
    const view = buildTimelineView(result, "ALL", "ALL", today)
    expect(view.tracks.map((track) => track.owner)).toEqual(["MAMA", "TATA"])
    expect(view.tracks.map((track) => track.rows)).toEqual([1, 1])
    const allBars = view.tracks.flatMap((track) => track.bars)
    expect(allBars.length).toBe(result.periods.length)
    for (const bar of allBars) {
      expect(bar.left).toBeGreaterThanOrEqual(0)
      expect(bar.left + bar.width).toBeLessThanOrEqual(100.0001)
      expect(bar.targetWidth).toBeGreaterThanOrEqual(bar.width)
      expect(bar.targetLeft).toBeGreaterThanOrEqual(0)
      expect(bar.targetLeft + bar.targetWidth).toBeLessThanOrEqual(100.0001)
    }
    expect(view.shared.points.length).toBeGreaterThan(0)
    expect(view.scale.ticks.length).toBeGreaterThan(6)
    expect(view.scale.start <= view.scale.end).toBe(true)
    expect(view.scale.anchorLeft).not.toBeNull()
  })

  it("filters owners and types without touching the source plan", () => {
    const result = plan()
    const mother = filterTimeline(result, "MAMA", "ALL")
    expect(mother.periods.every((period) => period.owner === "MAMA")).toBe(true)
    expect(mother.milestones.every((milestone) => milestone.owner === "MAMA")).toBe(
      true
    )

    const shared = filterTimeline(result, "OBOJE", "ALL")
    expect(shared.periods).toHaveLength(0)
    expect(shared.points.every((point) => point.owner === "OBOJE")).toBe(true)

    const documents = filterTimeline(result, "ALL", "DOCUMENT")
    expect(documents.periods).toHaveLength(0)
    expect(
      documents.milestones.every((milestone) => milestone.category === "DOCUMENT")
    ).toBe(true)

    const motherView = buildTimelineView(result, "MAMA", "ALL", today)
    expect(motherView.sharedTitle).toBe("Mama — terminy")
    expect(motherView.shared.points.every((point) => point.milestone.owner === "MAMA")).toBe(true)

    expect(result.periods.length).toBeGreaterThan(0)
  })

  it("formats Polish dates, ranges and durations", () => {
    expect(formatDateRange("2027-03-10", "2027-07-13")).toMatch(
      /10 mar 2027 – 13 lip 2027/
    )
    expect(formatDateRange(null)).toBe("Termin nieustalony")
    expect(durationLabel(126)).toBe("18 tyg.")
    expect(durationLabel(10)).toBe("1 tyg. 3 dn.")
    expect(daysUntilLabel(0)).toBe("Dziś")
    expect(daysUntilLabel(1)).toBe("Jutro")
    expect(daysUntilLabel(28)).toBe("Za 28 dni")
  })
})
