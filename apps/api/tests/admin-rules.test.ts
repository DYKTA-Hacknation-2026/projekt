import { beforeEach, describe, expect, it, vi } from "vitest"
import { getEnv } from "@zpr/contracts/env"
import { testRuleParameters } from "@zpr/domain/testing"

const store = vi.hoisted(() => ({
  rows: [] as any[],
  created: null as any,
}))

vi.mock("@/server/container", () => {
  const repositories = {
    legal: {
      listRuleVersionsDetailed: async () => store.rows,
      getRuleParameters: async () => store.rows,
      createRuleVersion: async (input: any) => {
        store.created = input
        return {
          id: "new-version",
          ruleId: input.ruleId,
          code: "LR-130",
          title: "Stawki zasiłku macierzyńskiego",
          description: "",
          category: "AMOUNTS",
          legalReference: "U art. 30a",
          version: input.version,
          effectiveFrom: input.effectiveFrom,
          effectiveTo: null,
          verificationStatus: input.verificationStatus,
          parameters: input.parameters,
          sourceUrl: input.sourceUrl,
          notes: input.notes,
          createdAt: new Date("2026-11-22T00:00:00Z"),
        }
      },
    },
  }
  return {
    getRepositories: () => repositories,
    getContainer: () => ({ repositories }),
  }
})

const { GET, POST } = await import("@/app/internal/admin-rules/route")
const { saveAdminRuleVersion } = await import("@/server/services/admin-rules")

const TITLES: Record<string, string> = {
  "LR-123": "Wymiar urlopu macierzyńskiego",
  "LR-127": "Pula urlopu rodzicielskiego",
  "LR-130": "Stawki zasiłku macierzyńskiego",
  "LR-112": "Podstawa wymiaru zasiłku",
  "LR-133": "Urlop ojcowski",
  "LR-100": "Okres wyczekiwania",
  "LR-132": "Minimalna kwota zasiłku",
  "LR-134": "Terminy wniosków",
  "LR-101": "Zaległości składkowe",
  "LR-102": "Płatnik wypłacający zasiłek",
}

function futureDate(days = 30): string {
  const date = new Date(`${new Date().toISOString().slice(0, 10)}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

function request(authorized = true): Request {
  return new Request("http://localhost/internal/admin-rules", {
    headers: authorized
      ? { authorization: "Bearer " + getEnv().SESSION_SECRET }
      : {},
  })
}

beforeEach(() => {
  store.created = null
  store.rows = testRuleParameters().map((row) => ({
    ...row,
    ruleId: row.code,
    title: TITLES[row.code] ?? row.code,
    description: "",
    category: "TEST",
    legalReference: "KP art. 1",
    sourceUrl: null,
    notes: null,
    createdAt: new Date("2026-11-01T00:00:00Z"),
  }))
})

describe("admin rule versions", () => {
  it("guards the internal endpoint with the service token", async () => {
    expect((await GET(request(false), {})).status).toBe(401)
    const response = await GET(request(), {})
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.rules).toHaveLength(10)
    expect(body.rules[0]).toMatchObject({
      code: "LR-100",
      current: { version: "2026.11-Z1" },
    })
  })

  it("appends a version, keeps untouched keys and closes the previous one", async () => {
    const effectiveFrom = futureDate()
    const response = await POST(
      new Request("http://localhost/internal/admin-rules", {
        method: "POST",
        headers: {
          authorization: "Bearer " + getEnv().SESSION_SECRET,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          ruleId: "LR-130",
          effectiveFrom,
          verificationStatus: "PROPOSED",
          parameters: { maternity: 1, parental: 0.75, flat81_5: 0.815 },
          notes: "Nowelizacja testowa",
        }),
      }),
      {}
    )

    expect(response.status).toBe(201)
    expect(store.created).toMatchObject({
      ruleId: "LR-130",
      effectiveFrom,
      verificationStatus: "PROPOSED",
      parameters: { maternity: 1, parental: 0.75, flat81_5: 0.815 },
    })
    expect(store.created.closePreviousTo).not.toBeNull()
    expect(store.created.version).toMatch(/^\d{4}\.\d{2}-Z1$/)
    expect(store.created.notes).toContain("Nowelizacja testowa")
  })

  it("rejects a value outside the allowed range with a field error", async () => {
    await expect(
      saveAdminRuleVersion({
        ruleId: "LR-130",
        effectiveFrom: futureDate(),
        verificationStatus: "PROPOSED",
        parameters: { maternity: 1, parental: 1.5, flat81_5: 0.815 },
      })
    ).rejects.toMatchObject({
      status: 422,
      extensions: { fieldErrors: { parental: expect.any(String) } },
    })
  })

  it("rejects a version that would start in the past", async () => {
    await expect(
      saveAdminRuleVersion({
        ruleId: "LR-130",
        effectiveFrom: "2026-01-01",
        verificationStatus: "PROPOSED",
        parameters: { maternity: 1, parental: 0.75, flat81_5: 0.815 },
      })
    ).rejects.toMatchObject({ status: 400 })
  })

  it("requires a source for a verified version", async () => {
    await expect(
      saveAdminRuleVersion({
        ruleId: "LR-130",
        effectiveFrom: futureDate(),
        verificationStatus: "VERIFIED",
        parameters: { maternity: 1, parental: 0.75, flat81_5: 0.815 },
      })
    ).rejects.toMatchObject({ status: 400 })
  })
})
