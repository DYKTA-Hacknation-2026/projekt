import {
  CASE_PROFILE_STORAGE_KEY,
  SITUATION_ANSWERS_STORAGE_KEY,
  caseProfileSchema,
  type CaseProfile,
} from "@zpr/contracts/case-profile"
import {
  ANSWER_KEYS,
  emptySituationAnswers,
  type SituationAnswers,
} from "@zpr/domain"

/**
 * Browser storage for the questionnaire and the case profile. The profile is
 * the bridge to `/dokumenty`: the document analysis compares its facts with the
 * document instead of asking the same questions again.
 */

type WritableStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">

export function readSituationAnswers(
  storage: Pick<Storage, "getItem">
): SituationAnswers | null {
  try {
    const raw = storage.getItem(SITUATION_ANSWERS_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Record<string, unknown>
    if (!parsed || typeof parsed !== "object") return null
    const answers = emptySituationAnswers()
    for (const key of ANSWER_KEYS) {
      const value = parsed[key]
      if (typeof value === "string") answers[key] = value
    }
    return answers
  } catch {
    return null
  }
}

export function writeSituationAnswers(
  storage: Pick<Storage, "setItem">,
  answers: SituationAnswers
): void {
  try {
    storage.setItem(SITUATION_ANSWERS_STORAGE_KEY, JSON.stringify(answers))
  } catch {
    // Storage can be unavailable (private mode); the wizard still works in memory.
  }
}

export function readCaseProfile(
  storage: Pick<Storage, "getItem">
): CaseProfile | null {
  try {
    const raw = storage.getItem(CASE_PROFILE_STORAGE_KEY)
    if (!raw) return null
    const parsed = caseProfileSchema.safeParse(JSON.parse(raw))
    return parsed.success ? parsed.data : null
  } catch {
    return null
  }
}

export function writeCaseProfile(
  storage: Pick<Storage, "setItem">,
  profile: CaseProfile
): void {
  try {
    storage.setItem(CASE_PROFILE_STORAGE_KEY, JSON.stringify(profile))
  } catch {
    // The next step still works; only the comparison is skipped.
  }
}

export function clearSituationProfile(storage: WritableStorage): void {
  try {
    storage.removeItem(SITUATION_ANSWERS_STORAGE_KEY)
    storage.removeItem(CASE_PROFILE_STORAGE_KEY)
  } catch {
    // Ignore an unavailable storage.
  }
}
