import { expect, test } from "@playwright/test"

test.describe("assistant chat", () => {
  // The first request compiles the route in dev mode.
  test.setTimeout(90_000)

  test("streams a grounded answer with a structured card and clickable citations", async ({ page }) => {
    await page.goto("/asystent")
    await page.getByRole("button", { name: "Czy przysługuje mi zasiłek macierzyński?" }).click()

    const answer = page.getByRole("article", { name: "Odpowiedź asystenta" }).last()
    await expect(answer.getByRole("region", { name: "Wstępna ocena uprawnień" })).toBeVisible({ timeout: 30_000 })
    await expect(answer.getByText("Pytanie do ciebie")).toBeVisible({ timeout: 30_000 })

    const citation = answer.getByRole("button", { name: /^Źródło S1: .*Pokaż fragment\.$/ }).first()
    await expect(citation).toBeVisible()
    await citation.click()

    const viewport = page.viewportSize()
    const panel = viewport && viewport.width >= 1280
      ? page.getByRole("complementary", { name: "Źródło odpowiedzi" })
      : page.getByRole("dialog", { name: "Źródło odpowiedzi" })
    await expect(panel.getByText("Obowiązuje")).toBeVisible()
    await expect(panel.getByText("Miejsce")).toBeVisible()
  })

  test("keeps context across turns and offers follow-up questions", async ({ page }) => {
    await page.goto("/asystent")
    const input = page.getByLabel("Twoje pytanie")
    await input.fill("Pracuję na umowie zlecenia i opłacam dobrowolne ubezpieczenie chorobowe.")
    await input.press("Enter")
    await expect(page.getByRole("article", { name: "Odpowiedź asystenta" })).toHaveCount(1, { timeout: 30_000 })
    await expect(page.getByRole("button", { name: "Wyślij" })).toBeVisible({ timeout: 30_000 })

    await input.fill("Czy przysługuje mi zasiłek macierzyński?")
    await input.press("Enter")
    const second = page.getByRole("article", { name: "Odpowiedź asystenta" }).nth(1)
    await expect(second.getByText("Wstępnie tak").first()).toBeVisible({ timeout: 30_000 })
    await expect(page.getByText("Możesz też zapytać")).toBeVisible({ timeout: 30_000 })
  })

  test("removes identifiers and can delete the conversation", async ({ page }) => {
    await page.goto("/asystent")
    const input = page.getByLabel("Twoje pytanie")
    await input.fill("Mój PESEL to 90010112345. Jakie dokumenty muszę złożyć?")
    await input.press("Enter")
    await expect(page.getByText(/Usunąłem z twojej wiadomości: PESEL/)).toBeVisible({ timeout: 30_000 })
    await expect(page.getByRole("region", { name: "Wymagane dokumenty" })).toBeVisible()
    await expect(page.getByRole("button", { name: "Wyślij" })).toBeVisible({ timeout: 30_000 })

    const viewport = page.viewportSize()
    if (!viewport || viewport.width < 1280) {
      await page.getByRole("button", { name: "Historia" }).click()
    }
    const history = page.getByRole("navigation", { name: "Historia rozmów" }).first()
    const remove = history.getByRole("button", { name: /^Usuń rozmowę: Mój PESEL to \[PESEL usunięty\]/ })
    await expect(remove).toBeVisible({ timeout: 10_000 })
    await remove.click()
    await expect(remove).toHaveCount(0)
    await expect(page.getByRole("article")).toHaveCount(0)
  })
})
