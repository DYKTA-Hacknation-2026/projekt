import { describe, expect, it } from "vitest"

import { POST as calculate } from "@/app/api/v1/benefits/calculate/route"
import { POST as documents } from "@/app/api/v1/documents/required/route"
import { POST as eligibility } from "@/app/api/v1/eligibility/evaluate/route"
import { GET as rulesets } from "@/app/api/v1/rulesets/route"
import { POST as compare } from "@/app/api/v1/scenarios/compare/route"
import { POST as timeline } from "@/app/api/v1/timeline/route"

let client = 0
function post(handler: (request: Request, context: unknown) => Promise<Response>, body: unknown, raw?: string) {
  client += 1
  const request = new Request("http://localhost/api/v1/test", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": `10.1.${Math.floor(client / 200)}.${client % 200}` },
    body: raw ?? JSON.stringify(body),
  })
  return handler(request, {})
}

const household = {
  asOf: "2027-04-01",
  event: { kind: "BIRTH", birthDate: "2027-03-10", childrenCount: 1 },
  parents: [
    {
      role: "MOTHER",
      insurance: { title: "EMPLOYMENT", startDate: "2024-01-01", payerSize: "OVER_20", workingTimeFraction: "1" },
      basis: { method: "GROSS_MONTHLY", grossMonthlyGrosze: 800_000 },
    },
    {
      role: "FATHER",
      insurance: { title: "EMPLOYMENT", startDate: "2023-01-01", payerSize: "UP_TO_20" },
      basis: { method: "KNOWN_BASIS", monthlyBasisGrosze: 450_000 },
    },
  ],
  plan: { parentalSegments: [{ parent: "MOTHER", weeks: 32 }, { parent: "FATHER", weeks: 9 }] },
}

describe("engine REST endpoints", () => {
  it("POST /benefits/calculate returns the full typed assessment", async () => {
    const response = await post(calculate, household)
    expect(response.status).toBe(200)
    expect(response.headers.get("cache-control")).toBe("no-store")
    expect(response.headers.get("x-request-id")).toBeTruthy()
    const body = await response.json()
    expect(body.kind).toBe("ESTIMATE")
    expect(body.totals).toMatchObject({ totalGrosze: 7_701_066, gross: true, currency: "PLN" })
    for (const key of [
      "eligibility", "applicableBenefits", "breakdown", "totals", "periods", "allocation", "appliedRules", "sources",
      "assumptions", "missingEvidence", "warnings", "nextSteps", "unsupported", "ruleSet", "inputHash", "disclaimer", "timeline", "basis",
    ]) {
      expect(body, key).toHaveProperty(key)
    }
    expect(body.ruleSet.version).toBe("2027.01-Z1")
    expect(body.allocation).toHaveLength(2)
  })

  it("POST /eligibility/evaluate returns determinations without amounts", async () => {
    const body = await (await post(eligibility, household)).json()
    expect(body.eligibility.determinations.length).toBeGreaterThan(0)
    expect(body).not.toHaveProperty("breakdown")
    expect(body.applicableBenefits.find((item: any) => item.benefit === "PATERNITY")).toMatchObject({ parent: "FATHER", status: "ELIGIBLE" })
  })

  it("POST /timeline returns periods and dated deadlines", async () => {
    const body = await (await post(timeline, { ...household, plan: { paymentOption: "FLAT_81_5" } })).json()
    expect(body.periods.length).toBeGreaterThan(0)
    expect(body.timeline.find((entry: any) => entry.id === "deadline-81-5").date).toBe("2027-03-31")
  })

  it("POST /documents/required returns forms and routing", async () => {
    const body = await (await post(documents, household)).json()
    expect(body.documents.map((doc: any) => doc.code)).toEqual(expect.arrayContaining(["WNIOSEK-URLOP-RODZICIELSKI", "Z-3"]))
    expect(body.routing.find((entry: any) => entry.parent === "FATHER").payer).toBe("ZUS")
    expect(body.formsVersion).toContain("ZAM")
  })

  it("POST /scenarios/compare compares plans for the same household", async () => {
    const { plan: _plan, ...base } = household
    const body = await (
      await post(compare, {
        ...base,
        scenarios: [
          { name: "Mama całość", plan: { parentalSegments: [{ parent: "MOTHER", weeks: 32 }], paternity: [] } },
          { name: "Tata 9 tygodni", plan: household.plan },
        ],
      })
    ).json()
    expect(body.outcomes).toHaveLength(2)
    expect(body.outcomes[0].differenceGrosze).toBe(0)
    expect(body.outcomes[1].differenceGrosze).toBeGreaterThan(0)
  })

  it("gives the same inputHash and amounts through every endpoint (one engine)", async () => {
    const [a, b, c, d] = await Promise.all([calculate, eligibility, timeline, documents].map((handler) => post(handler, household).then((r) => r.json())))
    expect(new Set([a.inputHash, b.inputHash, c.inputHash, d.inputHash]).size).toBe(1)
  })

  it("is deterministic: identical requests give identical bodies", async () => {
    const first = await (await post(calculate, household)).text()
    const second = await (await post(calculate, household)).text()
    expect(first).toBe(second)
  })

  it("returns a partial assessment, not an error, for incomplete evidence", async () => {
    const response = await post(calculate, { asOf: "2026-11-21", event: { kind: "PREGNANCY" }, parents: [{ role: "MOTHER" }] })
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.status).toBe("PARTIAL")
    expect(body.totals.totalGrosze).toBeNull()
    expect(body.missingEvidence.map((item: any) => item.key)).toContain("insurance.title")
  })

  it("refuses to assess an event older than the available rule sets", async () => {
    const body = await (
      await post(calculate, {
        ...household,
        event: { kind: "BIRTH", birthDate: "2024-01-10", childrenCount: 1 },
      })
    ).json()
    expect(body.status).toBe("MANUAL_REVIEW")
    expect(body.unsupported.map((item: any) => item.code)).toContain("U-01")
    expect(body.totals.totalGrosze).toBeNull()
    expect(body.manualReviewReasons.join(" ")).toContain("2026-07-01")
  })

  it("returns a manual-review outcome for inconsistent evidence", async () => {
    const body = await (await post(calculate, { ...household, event: { kind: "BIRTH", birthDate: "2027-06-01" } })).json()
    expect(body.status).toBe("MANUAL_REVIEW")
    expect(body.manualReviewReasons.length).toBeGreaterThan(0)
  })
})

describe("engine REST errors (RFC 9457 problem+json)", () => {
  it("rejects unknown fields with 422 and a field list", async () => {
    const response = await post(calculate, { ...household, userId: "x" })
    expect(response.status).toBe(422)
    expect(response.headers.get("content-type")).toContain("application/problem+json")
    const body = await response.json()
    expect(body.code).toBe("VALIDATION_ERROR")
    expect(body.issues.length).toBeGreaterThan(0)
  })

  it("rejects floating-point money with 422", async () => {
    const bad = { ...household, parents: [{ ...household.parents[0], basis: { method: "GROSS_MONTHLY", grossMonthlyGrosze: 8000.55 } }] }
    expect((await post(calculate, bad)).status).toBe(422)
  })

  it("rejects an impossible calendar date that passes the format check", async () => {
    const response = await post(calculate, { ...household, event: { kind: "BIRTH", birthDate: "2027-02-30" } })
    expect(response.status).toBe(422)
    expect((await response.json()).code).toBe("VALIDATION_ERROR")
  })

  it("rejects a malformed body with 400", async () => {
    const response = await post(calculate, undefined, "{not json")
    expect(response.status).toBe(400)
    expect((await response.json()).code).toBe("BAD_REQUEST")
  })

  it("rejects an empty parents list with 422", async () => {
    expect((await post(timeline, { ...household, parents: [] })).status).toBe(422)
  })
})

describe("GET /rulesets", () => {
  it("publishes versions, parameters with verification status, rules with sources, assumptions and unsupported scenarios", async () => {
    const body = await (await rulesets(new Request("http://localhost/api/v1/rulesets"), {})).json()
    expect(body.ruleSets.map((set: any) => set.version)).toEqual(["2026.07-Z1", "2026.10-Z1", "2027.01-Z1"])
    expect(body.ruleSets[2].parameters.rates).toMatchObject({ parental: "0.7", flat: "0.815" })
    expect(body.ruleSets[2].parameters.external.minimumWageGrosze).toBeNull()
    expect(body.rules["LR-130A"].sources.length).toBeGreaterThan(0)
    expect(Object.keys(body.unsupported).length).toBeGreaterThanOrEqual(15)
    expect(Object.keys(body.assumptions).length).toBeGreaterThan(10)
    expect(body.sources.U.citation).toContain("poz. 854")
  })
})
