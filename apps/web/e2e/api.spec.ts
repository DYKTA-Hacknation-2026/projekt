import { randomUUID } from "node:crypto"

import { expect, test } from "@playwright/test"

// Synthetic test PDF writer (no ZUS documents in the repository).
import { formPage, writePdf } from "../../../packages/documents/src/pdf/writer"

test("forwards health, OpenAPI, and knowledge search", async ({ request }) => {
  for (const path of ["/api/health", "/api/v1/health"]) {
    const response = await request.get(path)
    expect(response.status()).toBe(200)
    expect(response.headers()["x-request-id"]).toBeTruthy()
    expect(await response.json()).toMatchObject({ status: "ok" })
  }

  const spec = await request.get("/api/v1/openapi.json")
  expect(spec.status()).toBe(200)
  expect(await spec.json()).toHaveProperty("paths")

  const search = await request.get("/api/v1/knowledge/search", {
    params: { q: "zasiłek macierzyński", limit: 1 },
  })
  expect(search.status()).toBe(200)
  expect(await search.json()).toMatchObject({ count: 1, simulated: true })

  const options = await request.fetch("/api/v1/knowledge/search", {
    method: "OPTIONS",
  })
  expect(options.status()).toBe(204)
  expect(options.headers()["allow"]).toContain("GET")
})

test("persists onboarding and calculations through the public API", async ({
  request,
}) => {
  const onboarding = await request.post("/api/v1/onboarding", {
    data: {
      firstName: "Test",
      lastName: "Integracyjny",
      email: randomUUID() + "@example.test",
      eventType: "PREGNANCY",
      employmentType: "EMPLOYMENT",
      grossMonthlyIncomePln: 8000,
      consents: {
        healthData: false,
        aiAssistant: false,
        documentProcessing: false,
      },
    },
  })
  expect(onboarding.status()).toBe(201)
  const { caseId } = await onboarding.json()
  expect(caseId).toEqual(expect.any(String))

  const calculation = await request.post("/api/v1/calculations", {
    data: { caseId, input: { grossMonthlyIncomeGrosze: 800000 } },
  })
  expect(calculation.status()).toBe(201)
  const saved = await calculation.json()
  expect(saved).toMatchObject({
    calculationId: expect.any(String),
    saved: true,
  })

  const recent = await request.get("/api/v1/calculations?limit=20")
  expect(recent.status()).toBe(200)
  expect((await recent.json()).calculations).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ id: saved.calculationId, caseId }),
    ])
  )

  const invalid = await request.post("/api/v1/calculations", { data: {} })
  expect(invalid.status()).toBe(422)
  expect(invalid.headers()["content-type"]).toContain(
    "application/problem+json"
  )
  expect(await invalid.json()).toMatchObject({
    code: "VALIDATION_ERROR",
    instance: invalid.headers()["x-request-id"],
  })
})

test("forwards sample and uploaded PDF multipart requests", async ({
  request,
}) => {
  const pdf = Buffer.from(
    writePdf({ pages: [formPage(["Z-3", "ZAŚWIADCZENIE PŁATNIKA SKŁADEK — DOKUMENT TESTOWY"], [["Podstawa wymiaru zasiłku", "6000,00"]])] })
  )

  // Deprecated one-step alias, kept during the UI migration.
  const path = "/api/v1/documents/analyze"
  const samples = await request.get(path)
  expect(samples.status()).toBe(200)
  expect(await samples.json()).toMatchObject({ maxFileBytes: 10 * 1024 * 1024 })

  const sample = await request.post(path, {
    multipart: { sampleCase: "anna-zam" },
  })
  expect(sample.status()).toBe(200)
  expect(await sample.json()).toMatchObject({
    formCode: "ZAM",
    simulated: true,
    extraction: { detectedForm: "ZAM", requiresConfirmation: true },
  })

  const file = { name: "example.pdf", mimeType: "application/pdf", buffer: pdf }
  const withoutConsent = await request.post(path, { multipart: { file } })
  expect(withoutConsent.status()).toBe(403)

  const upload = await request.post(path, {
    multipart: { file, consent: "DOCUMENT_PROCESSING" },
  })
  expect(upload.status()).toBe(200)
  expect(await upload.json()).toMatchObject({
    formCode: "Z-3",
    requiresConfirmation: true,
  })

  // New endpoints through the web proxy: upload, extract, preview, delete.
  const created = await request.post("/api/v1/documents", {
    multipart: { file, consent: "DOCUMENT_PROCESSING" },
  })
  expect(created.status()).toBe(201)
  const { documentId } = await created.json()
  const extracted = await request.post(`/api/v1/documents/${documentId}/extract`, { data: {} })
  expect(extracted.status()).toBe(200)
  expect(await extracted.json()).toMatchObject({ detectedForm: "Z-3" })
  const preview = await request.get(`/api/v1/documents/${documentId}/file`)
  expect(preview.status()).toBe(200)
  expect(preview.headers()["content-type"]).toBe("application/pdf")
  expect(preview.headers()["x-content-type-options"]).toBe("nosniff")
  expect((await request.delete(`/api/v1/documents/${documentId}`)).status()).toBe(204)
  expect((await request.get(`/api/v1/documents/${documentId}`)).status()).toBe(404)

  const notPdf = await request.post("/api/v1/documents", {
    multipart: { file: { name: "x.pdf", mimeType: "application/pdf", buffer: Buffer.from("MZ") }, consent: "DOCUMENT_PROCESSING" },
  })
  expect(notPdf.status()).toBe(415)
})

test("forwards admin session cookies and keeps internal reads private", async ({
  request,
}) => {
  const login = await request.post("/api/v1/admin/login", {
    data: {
      email: process.env.ADMIN_EMAIL ?? "admin@zpr.local",
      password: process.env.ADMIN_DEMO_PASSWORD ?? "demo-admin",
    },
  })
  expect(login.status()).toBe(200)
  expect(login.headers()["set-cookie"]).toMatch(
    /zpr_admin=.+; Path=\/; HttpOnly/
  )
  const admin = await request.get("/admin", { maxRedirects: 0 })
  expect(admin.status()).toBe(200)
  expect(await admin.text()).toContain("Wersje reguł prawnych")

  const logout = await request.post("/api/v1/admin/logout")
  expect(logout.status()).toBe(200)
  expect(logout.headers()["set-cookie"]).toContain("Max-Age=0")

  for (const view of ["dashboard", "admin"]) {
    const response = await request.get("/api/internal/" + view)
    expect(response.status()).toBe(404)
  }
})

test("renders seeded dashboard data from the API", async ({ page }) => {
  await page.goto("/panel")
  await expect(page.getByText("Sprawy demonstracyjne")).toBeVisible()
  await expect(page.getByText("zpr-hash-1024")).toBeVisible()
})
