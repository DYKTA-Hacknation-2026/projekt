import type { OnboardingInput } from "@zpr/contracts/onboarding"

import { getContainer } from "@/server/container"
import { applyImportToUser } from "@/server/services/data-import"

export interface OnboardingResult {
  userId: string
  caseId: string
  caseNumber: string
  simulated: true
  importApplied: boolean
  nextSteps: string[]
}

export async function createHousehold(
  input: OnboardingInput,
  options: { ownerKey?: string } = {}
): Promise<OnboardingResult> {
  const { repositories } = getContainer()
  const created = await repositories.households.createFromOnboarding(input)

  let importApplied = false
  if (input.importSessionId && options.ownerKey) {
    try {
      await applyImportToUser({
        sessionId: input.importSessionId,
        ownerKey: options.ownerKey,
        userId: created.userId,
      })
      importApplied = true
    } catch (error) {
      console.warn(
        "[onboarding] Nie udało się podpiąć zaakceptowanych danych importu",
        error
      )
    }
  }

  return {
    ...created,
    simulated: true,
    importApplied,
    nextSteps: [
      ...(importApplied
        ? ["Dane z symulowanych źródeł zostały zapisane w sprawie."]
        : []),
      "Sprawdź uprawnienia w kalkulatorze.",
      "Uzupełnij dokumenty i potwierdź wyodrębnione pola.",
      "Otwórz oś czasu, aby zobaczyć terminy wniosków.",
    ],
  }
}
