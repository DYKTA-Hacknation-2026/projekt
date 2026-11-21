import { beforeEach, describe, expect, it, vi } from "vitest"
import { getEnv } from "@zpr/contracts/env"
import { testRuleParameters } from "@zpr/domain/testing"

const store = vi.hoisted(() => ({ rows: [] as unknown[], saved: null as any }))
vi.mock("@/server/container", () => {
  const repositories = {
    legal: { getRuleParameters: async () => store.rows },
    benefits: {
      saveCalculation: async (data: unknown) => {
        store.saved = data
        return { id: "saved-id" }
      },
    },
  }
  return {
    getRepositories: () => repositories,
    getContainer: () => ({ repositories }),
  }
})
const { GET } = await import("@/app/internal/rule-set/route")
const { runCalculation } = await import("@/server/services/calculations")

beforeEach(() => {
  store.rows = testRuleParameters()
  store.saved = null
})
const request = (authorized = true) =>
  new Request("http://localhost/internal/rule-set", {
    headers: authorized
      ? { authorization: "Bearer " + getEnv().SESSION_SECRET }
      : {},
  })

describe("rules after the API split", () => {
  it("requires service authorization before exposing the active set", async () => {
    expect((await GET(request(false), {})).status).toBe(401)
    const response = await GET(request(), {})
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({
      version: "2026.11-Z1",
      parental: { rate: 0.7 },
    })
  })
  it("returns a 503 problem when effective rule rows are incomplete", async () => {
    store.rows = []
    const response = await GET(request(), {})
    expect(response.status).toBe(503)
    expect(response.headers.get("content-type")).toContain(
      "application/problem+json"
    )
  })
  it("persists the rate version id and result provenance in the API service", async () => {
    const response = await runCalculation({
      save: true,
      input: {
        grossMonthlyIncomeGrosze: 800_000,
        motherEnabled: true,
        fatherEnabled: true,
        mode: "BIRTH",
        specialCase: "STANDARD",
        incomeMode: "SIMPLE",
        childrenCount: 1,
        hasZaZyciem: false,
        paymentOption: "STANDARD_100_70",
        maternityWeeksBeforeBirth: 0,
        secondParentParentalWeeks: 9,
        parentalWorkFraction: 0,
        paternityDays: 14,
      },
    })
    expect(response.calculationId).toBe("saved-id")
    expect(store.saved.ruleVersionId).toBe(
      "01900000-0000-7000-8000-000000001403"
    )
    expect(store.saved.result.ruleSetVersion).toBe("2026.11-Z1")
  })
})
