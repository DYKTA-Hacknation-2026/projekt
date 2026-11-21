import type { ImportedCaseData } from "@zpr/contracts/data-import"

/**
 * The data the planner needs from a household / import. A missing date stays
 * missing: the planner never substitutes the demo date for imported data.
 */
export interface TimelineSeed {
  dueDate?: string
  birthDate?: string
  childrenCount?: number
  hasZaZyciem?: boolean
  employmentType?: string
  eventType?: string
  scenarioLabel?: string
  demo: boolean
}

export const DEMO_DUE_DATE = "2027-03-10"

export const DEMO_SEED: TimelineSeed = { demo: true }

/**
 * Maps accepted import data to the planner without inventing dates:
 * - a pregnancy uses the expected due date,
 * - a birth uses the actual date when it is known,
 * - adoption / foster care keeps both dates empty and is flagged by eventType.
 */
export function buildTimelineSeed(
  data: ImportedCaseData,
  scenarioLabel?: string
): TimelineSeed {
  const birth = data.eventType === "BIRTH"
  const pregnancyOrBirth =
    data.eventType === undefined ||
    data.eventType === "PREGNANCY" ||
    data.eventType === "BIRTH"
  const dueDate = pregnancyOrBirth
    ? birth
      ? data.eventDate
        ? undefined
        : data.expectedDueDate
      : data.expectedDueDate
    : undefined
  return {
    dueDate,
    birthDate: birth ? data.eventDate : undefined,
    childrenCount: data.childrenCount,
    hasZaZyciem: data.hasZaZyciem,
    employmentType: data.employmentType,
    eventType: data.eventType,
    scenarioLabel,
    demo: false,
  }
}
