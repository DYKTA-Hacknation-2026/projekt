import { expect, test } from "@playwright/test"

test("home page presents the five main paths", async ({ page }) => {
  await page.goto("/")
  const main = page.getByRole("main")

  for (const name of [
    /Sprawdź swoje prawa/,
    /Oblicz świadczenia/,
    /Zaplanuj urlopy/,
    /Przygotuj dokumenty/,
    /Zapytaj asystenta/,
  ]) {
    await expect(main.getByRole("link", { name })).toBeVisible()
  }
})

test("hero primary action opens the analysis wizard", async ({ page }) => {
  test.setTimeout(60_000)
  await page.goto("/")
  await page
    .getByRole("main")
    .getByRole("link", { name: /Rozpocznij analizę/ })
    .first()
    .click()

  await expect(page).toHaveURL(/\/start$/, { timeout: 30_000 })
  await expect(
    page.getByRole("heading", { level: 1, name: /Opisz swoją sytuację/i })
  ).toBeVisible({ timeout: 30_000 })
})

test("home images have descriptive alternative text", async ({ page }) => {
  await page.goto("/")

  await expect(
    page.getByRole("img", {
      name: /Rodzice trzymają nowo narodzone dziecko/i,
    })
  ).toBeVisible()
  await expect(
    page.getByRole("img", { name: /Mama i tata blisko tulą niemowlę/i })
  ).toBeVisible()
})
