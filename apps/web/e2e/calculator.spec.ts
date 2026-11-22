import { expect, test } from "@playwright/test"

test("quick calculator runs without legal vocabulary and labels the estimate", async ({
  page,
}) => {
  await page.goto("/kalkulator")

  // Default: pregnancy, one child, both parents, 8 000 zł each.
  await page.getByRole("button", { name: "Dalej" }).click()
  await page.getByRole("button", { name: "Dalej" }).click()
  await page.getByRole("button", { name: "Oblicz świadczenie" }).click()

  await expect(page.getByText("Szacunek łączny")).toBeVisible({
    timeout: 15_000,
  })
  await expect(page.getByText("To szacunek — parametry Q-15/Q-29")).toBeVisible()
  await expect(page.getByText("Analiza kompletna").first()).toBeVisible()
  await expect(page.getByText("81 664,85 zł").first()).toBeVisible()
  await expect(page.getByText("Porównanie wariantów")).toBeVisible({
    timeout: 15_000,
  })
  await page.getByRole("link", { name: /Zapytaj asystenta/ }).click()
  await expect(page).toHaveURL(/\/asystent\?q=/, { timeout: 15_000 })
})

test("advanced mode keeps the detailed basis and Z-3 fields", async ({
  page,
}) => {
  await page.goto("/kalkulator")
  await page
    .getByRole("button", { name: /Zaawansowane wyliczenie/ })
    .click()

  await expect(page.getByText("Tryb zaawansowany")).toBeVisible()
  await expect(
    page.getByRole("radio", { name: /Znana podstawa \(Z-3\/Z-3a\)/ })
  ).toBeVisible()
  await expect(page.getByText("Z-3 i Z-3a to zaświadczenia")).not.toBeVisible()
  await page.getByText("Więcej informacji").first().click()
  await expect(page.getByText("Z-3 i Z-3a to zaświadczenia")).toBeVisible()
})

test("quick mode shows PARTIAL and missing data instead of inventing an amount", async ({
  page,
}) => {
  await page.goto("/kalkulator")
  await page.getByRole("button", { name: "Dalej" }).click()
  await page
    .getByRole("checkbox", { name: "Nie znam dokładnej kwoty" })
    .first()
    .check()
  await page.getByRole("button", { name: "Dalej" }).click()
  await page.getByRole("button", { name: "Oblicz świadczenie" }).click()

  await expect(page.getByText("Analiza częściowa").first()).toBeVisible({
    timeout: 15_000,
  })
  await expect(page.getByText("Nie wyliczono kwoty")).toBeVisible()
  await expect(page.getByText("Czego brakuje")).toBeVisible()
  await expect(
    page.getByText(/Nie podstawiamy wartości zastępczej/).first()
  ).toBeVisible()
})

test("builder data prefill the calculator without retyping", async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.sessionStorage.setItem(
      "zpr:onboarding-prefill",
      JSON.stringify({
        eventType: "PREGNANCY",
        expectedDueDate: "2027-05-01",
        childrenCount: 2,
        hasZaZyciem: false,
        employmentType: "MANDATE",
        coverageMode: "VOLUNTARY",
        grossMonthlyIncomePln: 6500,
      })
    )
  })
  await page.goto("/kalkulator")

  await expect(page.getByText("Dane zostały wstępnie uzupełnione")).toBeVisible()
  await page.getByRole("button", { name: "Dalej" }).click()
  await expect(page.getByLabel("Forma zatrudnienia").first()).toHaveValue(
    "CONTRACTOR"
  )
  await expect(
    page.getByLabel("Przybliżony miesięczny dochód brutto").first()
  ).toHaveValue("6500")
  await page.getByRole("button", { name: "Dalej" }).click()
  await expect(page.getByText(/Mama: umowa zlecenia/)).toBeVisible()
})
