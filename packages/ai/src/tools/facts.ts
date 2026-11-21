import type { CaseFactsInput } from "@zpr/contracts/assistant-tools"
import type { CaseFacts } from "@zpr/domain"

import type { TurnState } from "../turn"
import type { AssistantServices, ProfileAccess } from "../types"

export type FactSource = "CONVERSATION" | "PROFILE"

export interface ResolvedFacts {
  facts: CaseFacts
  sources: Partial<Record<keyof CaseFacts, FactSource>>
  /** Fields where the conversation contradicts the confirmed profile. */
  conflicts: { key: keyof CaseFacts; profile: unknown; conversation: unknown }[]
  profileStatus: ProfileAccess["status"]
  grossMonthlyIncomePln: number | null
}

export const PROFILE_STATUS_MESSAGES: Record<ProfileAccess["status"], string> = {
  AVAILABLE: "Użyto potwierdzonych danych z profilu użytkownika.",
  NOT_ENABLED:
    "Użytkownik nie włączył w tej rozmowie korzystania z danych profilu. Nie proś o dostęp więcej niż raz; pracuj na faktach z rozmowy.",
  NOT_AUTHENTICATED:
    "Brak profilu w tej sesji (tryb gościa). Pracuj na faktach z rozmowy.",
  CONSENT_REQUIRED:
    "Użytkownik nie wyraził zgody na korzystanie z danych przez asystenta AI. Nie używaj profilu.",
  NOT_FOUND: "Nie znaleziono potwierdzonego profilu dla tej sesji.",
}

/**
 * Merges facts stated in the conversation with the confirmed profile (only
 * when the profile is available to this principal). Conversation facts win,
 * because they are newer — but every contradiction is reported so the
 * assistant can ask which one is right.
 */
export async function resolveFacts(
  stated: CaseFactsInput | undefined,
  services: AssistantServices,
  turn: TurnState
): Promise<ResolvedFacts> {
  const access = await turn.loadProfileOnce(() => services.loadProfile())
  const profileFacts: CaseFacts =
    access.status === "AVAILABLE" ? access.profile.facts : {}
  const conversation: CaseFacts = { ...(stated ?? {}) }

  const facts: CaseFacts = { ...profileFacts }
  const sources: ResolvedFacts["sources"] = {}
  for (const key of Object.keys(profileFacts) as (keyof CaseFacts)[]) {
    if (profileFacts[key] !== undefined) sources[key] = "PROFILE"
  }

  const conflicts: ResolvedFacts["conflicts"] = []
  for (const key of Object.keys(conversation) as (keyof CaseFacts)[]) {
    const value = conversation[key]
    if (value === undefined) continue
    const fromProfile = profileFacts[key]
    if (fromProfile !== undefined && fromProfile !== value) {
      conflicts.push({ key, profile: fromProfile, conversation: value })
    }
    ;(facts as Record<string, unknown>)[key] = value
    sources[key] = "CONVERSATION"
  }

  return {
    facts,
    sources,
    conflicts,
    profileStatus: access.status,
    grossMonthlyIncomePln:
      access.status === "AVAILABLE" ? access.profile.grossMonthlyIncomePln : null,
  }
}
