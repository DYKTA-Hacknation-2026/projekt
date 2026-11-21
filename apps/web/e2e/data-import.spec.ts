import { expect, test } from "@playwright/test"

// The first request compiles the route in dev mode; keep the flow resilient to
// a cold Turbopack cache when the full suite runs in parallel.
test.setTimeout(90_000)

async function loginAsAnna(page: import("@playwright/test").Page) {
  await page.goto("/mobywatel")
  const providerButton = page.getByRole("button", {
    name: /Aplikacja mObywatel/i,
  })
  await expect(providerButton).toBeEnabled({ timeout: 15_000 })
  await providerButton.click()
  await page.getByRole("button", { name: /Anna Kowalska/i }).click()
  await page.getByRole("button", { name: "Dalej" }).click()
  await page
    .getByRole("checkbox", {
      name: /Wyrażam zgodę na przekazanie powyższych danych/i,
    })
    .check()
  await page.getByRole("button", { name: "Udostępnij dane" }).click()
  await page.getByLabel("Kod PIN").fill("1234")
  await page.getByRole("button", { name: "Potwierdź w aplikacji" }).click()
  await expect(page.getByText("Dane zostały przekazane")).toBeVisible()
  await page.getByRole("button", { name: "Przejdź do kreatora" }).click()
  await expect(page).toHaveURL(/\/start/)
}

test("simulated data import fills the wizard and survives verification", async ({
  page,
}) => {
  await loginAsAnna(page)

  await page.getByRole("link", { name: /Pobierz dane z symulowanych źródeł/i }).click()
  await expect(page).toHaveURL(/\/dane/)

  await expect(
    page.getByRole("heading", {
      level: 1,
      name: /Uzupełnij dane automatycznie/i,
    })
  ).toBeVisible()
  await expect(page.getByText("ZUS — ubezpieczenie i składki")).toBeVisible()
  await expect(page.getByText("USC — dane o dziecku")).toBeVisible()

  await page.getByRole("button", { name: "Pobierz moje dane" }).click()

  await expect(page.getByText(/Krok 3 z 4 · Podsumowanie/)).toBeVisible({
    timeout: 20_000,
  })
  await expect(page.getByText("Dane wymagające ręcznego uzupełnienia")).toBeVisible()

  await page.getByRole("button", { name: "Przejdź do weryfikacji" }).click()
  await expect(page.getByText(/Krok 4 z 4 · Weryfikacja danych/)).toBeVisible()

  await page.getByLabel("Sytuacja", { exact: true }).selectOption("BIRTH")
  await page
    .getByLabel("Liczba dzieci z jednego porodu")
    .selectOption("1")
  await page
    .getByLabel("Data urodzenia / przyjęcia dziecka")
    .fill("2026-10-28")

  await expect(
    page.getByText(/Wstępna analiza uprawnień/i).first()
  ).toBeVisible()

  await page
    .getByRole("button", {
      name: /Zatwierdź dane i przejdź do formularza/i,
    })
    .click()

  await expect(page).toHaveURL(/\/start\?import=accepted/)
  await expect(
    page.getByText("Dane z symulowanych źródeł", { exact: true })
  ).toBeVisible()
  await expect(page.getByLabel("Imię")).toHaveValue("Anna")
  await page.getByRole("button", { name: "Dalej" }).click()
  await page.getByRole("button", { name: "Dalej" }).click()
  await expect(page.getByLabel("Pracodawca / zleceniodawca")).toHaveValue(
    "Przykładowy Pracodawca S.A."
  )
})

test("manual path skips retrieval and keeps the wizard usable", async ({ page }) => {
  await loginAsAnna(page)
  await page.getByRole("link", { name: /Pobierz dane z symulowanych źródeł/i }).click()
  await expect(page.getByText("ZUS — ubezpieczenie i składki")).toBeVisible()
  const skip = page.getByRole("button", { name: "Uzupełnię dane samodzielnie" })
  await expect(skip).toBeEnabled()
  await skip.click()
  await expect(page).toHaveURL(/\/start/)
  await expect(page.getByLabel("Imię")).toHaveValue("Anna")
  await expect(page.getByText(/Zalogowano przez mObywatel/i)).toBeVisible()
})
