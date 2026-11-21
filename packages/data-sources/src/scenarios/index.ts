import type { DataImportScenario } from "../types"
import { annaEmploymentScenario } from "./anna-employment"
import { kasiaIncompleteScenario } from "./kasia-incomplete"
import { marekSelfEmploymentScenario } from "./marek-self-employment"

const SCENARIOS: readonly DataImportScenario[] = [
  annaEmploymentScenario,
  marekSelfEmploymentScenario,
  kasiaIncompleteScenario,
]

/** Data scenario that belongs to the selected simulated identity. */
export function findScenarioForPersona(
  personaId: string
): DataImportScenario | null {
  const scenario = SCENARIOS.find((item) =>
    item.personaIds.includes(personaId)
  )
  if (!scenario) return null

  // Tomasz uses the employed household as the second parent. Personal data is
  // always taken from the mObywatel persona, so only the role changes.
  if (personaId === "tomasz-kowalski") {
    return { ...scenario, parentRole: "FATHER" }
  }
  return scenario
}

export function findScenarioById(
  scenarioId: string
): DataImportScenario | null {
  return SCENARIOS.find((scenario) => scenario.id === scenarioId) ?? null
}

export function listScenarios(): DataImportScenario[] {
  return [...SCENARIOS]
}

export { annaEmploymentScenario, kasiaIncompleteScenario, marekSelfEmploymentScenario }
