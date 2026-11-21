import type { OnboardingInput } from "@zpr/contracts/onboarding"

import { getContainer } from "@/server/container"

export interface OnboardingResult {
  userId: string
  caseId: string
  caseNumber: string
  simulated: true
  nextSteps: string[]
}

export async function createHousehold(
  input: OnboardingInput
): Promise<OnboardingResult> {
  const { repositories } = getContainer()
  const created = await repositories.households.createFromOnboarding(input)

  return {
    ...created,
    simulated: true,
    nextSteps: [
      "Sprawdź uprawnienia w kalkulatorze.",
      "Uzupełnij dokumenty i potwierdź wyodrębnione pola.",
      "Otwórz oś czasu, aby zobaczyć terminy wniosków.",
    ],
  }
}
