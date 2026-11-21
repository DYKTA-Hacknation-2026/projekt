import { cookies } from "next/headers"

import { getEnv } from "@zpr/contracts/env"

import {
  findMobywatelPersona,
  toMobywatelProfile,
} from "@/server/sim/mobywatel"

import { MOBYWATEL_COOKIE, verifyMobywatelToken } from "./mobywatel-token"

export interface MobywatelSession {
  personaId: string
  issuedAt: number
  expiresAt: number
  profile: ReturnType<typeof toMobywatelProfile>
  persona: NonNullable<ReturnType<typeof findMobywatelPersona>>
}

export async function getMobywatelSession(): Promise<MobywatelSession | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(MOBYWATEL_COOKIE)?.value
  const payload = verifyMobywatelToken(token, getEnv().SESSION_SECRET)
  if (!payload) return null

  const persona = findMobywatelPersona(payload.personaId)
  if (!persona) return null

  return {
    personaId: persona.id,
    issuedAt: payload.issuedAt,
    expiresAt: payload.expiresAt,
    persona,
    profile: toMobywatelProfile(persona),
  }
}
