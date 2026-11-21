import { beforeEach, describe, expect, it, vi } from "vitest"

import type { AssistantProfileRecord } from "@zpr/db/repositories"

import {
  decodeSession,
  encodeSession,
  resolvePrincipal,
  SESSION_COOKIE,
} from "@/server/auth/session"

const SECRET = "unit-test-session-secret-that-is-long-enough"
const SID = "11111111-1111-4111-8111-111111111111"
const OTHER_SID = "22222222-2222-4222-8222-222222222222"
const USER = "01900000-0000-7000-8000-000000000501"

/* In-memory stand-ins for the repositories used by the assistant services. */
const store = vi.hoisted(() => ({
  conversations: new Map<string, { id: string; ownerKey: string; title: string }>(),
  messages: [] as { conversationId: string; role: string; content: string; metadata: Record<string, unknown> }[],
  profile: null as AssistantProfileRecord | null,
}))

vi.mock("@/server/container", () => ({
  getContainer: () => ({
    repositories: {
      users: { getAssistantProfile: async (id: string) => (store.profile?.userId === id ? store.profile : null) },
      conversations: {
        getOwnedConversation: async (id: string, owner: string) => {
          const row = store.conversations.get(id)
          return row && row.ownerKey === owner ? row : null
        },
        getConversation: async (id: string) => store.conversations.get(id) ?? null,
        createConversation: async (input: { id: string; ownerKey: string; title: string }) => {
          store.conversations.set(input.id, input)
          return input
        },
        listMessages: async (id: string) =>
          store.messages.filter((m) => m.conversationId === id).map((m, index) => ({ ...m, id: String(index), createdAt: new Date() })),
        deleteLastAssistantMessage: async () => false,
        deleteOwnedConversation: async (id: string, owner: string) => {
          const row = store.conversations.get(id)
          if (!row || row.ownerKey !== owner) return false
          store.conversations.delete(id)
          return true
        },
      },
    },
  }),
}))

const { loadProfileFor, toProfileSnapshot } = await import("@/server/services/assistant/services")
const { prepareTurn } = await import("@/server/services/assistant/chat")
const { deleteConversation, getConversationMessages } = await import("@/server/services/assistant/conversations")

function profile(overrides: Partial<AssistantProfileRecord> = {}): AssistantProfileRecord {
  return {
    userId: USER,
    aiAssistantConsent: true,
    employmentType: "EMPLOYMENT",
    coverageMode: "COMPULSORY",
    insuranceStartDate: "2024-01-01",
    grossMonthlyAmountGrosze: 800_000,
    familyEvent: "PREGNANCY",
    eventDate: null,
    expectedDueDate: "2027-03-10",
    childCount: 1,
    hasZaZyciem: false,
    caseNumber: "ZPR-1",
    updatedAt: new Date("2026-11-01"),
    ...overrides,
  }
}

beforeEach(() => {
  store.conversations.clear()
  store.messages.length = 0
  store.profile = null
})

describe("session cookie", () => {
  it("round-trips and rejects tampering", () => {
    const token = encodeSession({ sid: SID, userId: USER }, SECRET)
    expect(decodeSession(token, SECRET)).toEqual({ sid: SID, userId: USER })
    const forged = token.replace(USER, "01900000-0000-7000-8000-000000000502")
    expect(decodeSession(forged, SECRET)).toBeNull()
    expect(decodeSession(token, "another-secret-that-is-long-enough-123")).toBeNull()
  })

  it("expires", () => {
    const token = encodeSession({ sid: SID, userId: null }, SECRET, Date.now() - 31 * 86_400_000)
    expect(decodeSession(token, SECRET)).toBeNull()
  })

  it("issues a fresh guest principal for a forged cookie", () => {
    const request = new Request("http://test/", {
      headers: { cookie: `${SESSION_COOKIE}=${SID}.${USER}.9999999999999.forged` },
    })
    const principal = resolvePrincipal(request, SECRET)
    expect(principal.userId).toBeNull()
    expect(principal.sid).not.toBe(SID)
    expect(principal.issue).toBe(true)
  })
})

describe("profile authorization", () => {
  const signedIn = { sid: SID, userId: USER, issue: false }

  it("requires the explicit toggle, a bound user and AI consent", async () => {
    store.profile = profile()
    expect((await loadProfileFor(signedIn, false)).status).toBe("NOT_ENABLED")
    expect((await loadProfileFor({ ...signedIn, userId: null }, true)).status).toBe("NOT_AUTHENTICATED")
    store.profile = profile({ aiAssistantConsent: false })
    expect((await loadProfileFor(signedIn, true)).status).toBe("CONSENT_REQUIRED")
    store.profile = profile()
    expect((await loadProfileFor(signedIn, true)).status).toBe("AVAILABLE")
  })

  it("never reads another user's profile", async () => {
    store.profile = profile({ userId: "01900000-0000-7000-8000-000000000502" })
    expect((await loadProfileFor(signedIn, true)).status).toBe("NOT_FOUND")
  })

  it("exposes only minimised facts", () => {
    const snapshot = toProfileSnapshot(profile())
    expect(snapshot.facts).toEqual({
      employmentType: "EMPLOYMENT",
      insuranceStartDate: "2024-01-01",
      familyEvent: "PREGNANCY",
      expectedDueDate: "2027-03-10",
      childrenCount: 1,
      hasZaZyciem: false,
    })
    expect(snapshot.grossMonthlyIncomePln).toBe(8000)
    expect(JSON.stringify(snapshot)).not.toMatch(/email|firstName|lastName|city/i)
  })
})

describe("conversation ownership", () => {
  const owner = { sid: SID, userId: null, issue: false }
  const stranger = { sid: OTHER_SID, userId: null, issue: false }
  const conversationId = "33333333-3333-4333-8333-333333333333"

  it("creates a conversation with a scrubbed title", async () => {
    await prepareTurn({
      principal: owner,
      conversationId,
      message: { id: "m1", text: "Mój PESEL 90010112345 — czy przysługuje mi zasiłek?" },
      regenerate: false,
    })
    expect(store.conversations.get(conversationId)?.title).not.toContain("90010112345")
  })

  it("hides another owner's conversation and refuses to continue it", async () => {
    store.conversations.set(conversationId, { id: conversationId, ownerKey: SID, title: "x" })
    await expect(getConversationMessages(stranger, conversationId)).rejects.toMatchObject({ status: 404 })
    await expect(deleteConversation(stranger, conversationId)).rejects.toMatchObject({ status: 404 })
    await expect(
      prepareTurn({ principal: stranger, conversationId, message: { id: "x", text: "Pokaż historię" }, regenerate: false })
    ).rejects.toMatchObject({ status: 404 })
    expect(store.conversations.has(conversationId)).toBe(true)
  })

  it("does not duplicate a retried user message", async () => {
    store.conversations.set(conversationId, { id: conversationId, ownerKey: SID, title: "x" })
    store.messages.push({
      conversationId,
      role: "USER",
      content: "Pytanie",
      metadata: { uiMessage: { id: "m9", role: "user", parts: [{ type: "text", text: "Pytanie" }] } },
    })
    const prepared = await prepareTurn({ principal: owner, conversationId, message: { id: "m9", text: "Pytanie" }, regenerate: true })
    expect(prepared.userAlreadyStored).toBe(true)
    expect(prepared.history).toEqual([])
  })
})
