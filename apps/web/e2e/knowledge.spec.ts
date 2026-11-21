import { expect, test } from "@playwright/test"

test.describe("Centrum wiedzy", () => {
  test("gość może wyszukać materiał bez logowania", async ({ page }) => {
    await page.goto("/wiedza")

    await page
      .getByRole("searchbox", { name: /Szukaj w Centrum wiedzy/i })
      .fill("zasiłek macierzyński")
    await page.getByRole("button", { name: "Szukaj" }).click()

    await expect(page).toHaveURL(/\/wiedza\/szukaj\?q=/)
    await expect(
      page
        .getByRole("link", {
          name: /Zasiłek macierzyński: komu przysługuje i ile trwa/i,
        })
        .first()
    ).toBeVisible()
    await expect(page.getByText(/Znaleziono \d+/)).toBeVisible()
  })

  test("FAQ filtruje pytania po kategorii", async ({ page }) => {
    await page.goto("/wiedza/faq")

    await page
      .getByRole("navigation", { name: "Filtruj według kategorii" })
      .getByRole("link", { name: "Świadczenia i zasiłki" })
      .click()

    await expect(page).toHaveURL(/kategoria=swiadczenia-i-zasilki/)
    await expect(
      page.getByText("Ile wynosi zasiłek macierzyński?")
    ).toBeVisible()
  })

  test("artykuł pokazuje źródła, podstawę prawną i datę weryfikacji", async ({
    page,
  }) => {
    await page.goto("/wiedza/artykul/zasilek-macierzynski")

    await expect(
      page.getByRole("heading", {
        level: 1,
        name: /Zasiłek macierzyński: komu przysługuje/i,
      })
    ).toBeVisible()
    await expect(
      page.getByRole("heading", { name: "Źródła i podstawa prawna" })
    ).toBeVisible()
    await expect(page.getByText(/Sprawdzone/).first()).toBeVisible()

    const sourceLink = page
      .getByRole("link", { name: /Otwórz źródło/i })
      .first()
    await expect(sourceLink).toBeVisible()
    await expect(sourceLink).toHaveAttribute("href", /zus\.pl|isap\.sejm\.gov\.pl/)
  })

  test("karta dokumentu prowadzi do oficjalnego wzoru", async ({ page }) => {
    await page.goto("/wiedza/dokumenty/wniosek-zam")

    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "Wniosek o zasiłek macierzyński",
      })
    ).toBeVisible()
    await expect(page.getByText(/ZAM zastępuje ZUR i ZAO/i)).toBeVisible()

    const official = page.getByRole("link", {
      name: /Otwórz oficjalny wzór/i,
    })
    await expect(official).toBeVisible()
    await expect(official).toHaveAttribute("href", /zus\.pl/)
  })

  test("wycofany formularz Z-3b jest wyraźnie oznaczony", async ({ page }) => {
    await page.goto("/wiedza/dokumenty/zaswiadczenie-z-3b")

    await expect(
      page.getByText("Nie składaj tego formularza")
    ).toBeVisible()
    await expect(page.getByText("Wycofany", { exact: true })).toBeVisible()
  })

  test("przewodnik pokazuje kroki, dokumenty i terminy", async ({ page }) => {
    await page.goto("/wiedza/przewodniki/jak-ubiegac-sie-o-zasilek-macierzynski")

    const main = page.getByRole("main")
    await expect(
      page.getByRole("heading", { name: "Kolejne kroki" })
    ).toBeVisible()
    await expect(main.getByText("Dokumenty", { exact: true }).first()).toBeVisible()
    await expect(
      main.getByText("Ważne terminy", { exact: true }).first()
    ).toBeVisible()
  })

  test("wyszukiwarka rozumie nazwę formularza", async ({ page }) => {
    await page.goto("/wiedza/szukaj?q=ZAM")

    await expect(page.getByText(/dla frazy „ZAM”/)).toBeVisible()
    await expect(
      page.getByRole("link", { name: /Wniosek o zasiłek macierzyński/i }).first()
    ).toBeVisible()
  })

  test("moduł jest czytelny na telefonie i nie rozpycha strony", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto("/wiedza")

    await expect(
      page.getByRole("heading", { level: 1, name: "Centrum wiedzy" })
    ).toBeVisible()
    await expect(
      page.getByRole("navigation", { name: "Sekcje Centrum wiedzy" })
    ).toBeVisible()

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth
    )
    expect(overflow).toBeLessThanOrEqual(1)
  })

  test("treści publiczne nie wymagają logowania", async ({ page }) => {
    const response = await page.goto("/wiedza/faq")
    expect(response?.status()).toBeLessThan(400)
    await expect(page).toHaveURL(/\/wiedza\/faq/)
  })
})
