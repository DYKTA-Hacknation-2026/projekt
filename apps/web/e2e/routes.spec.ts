import { expect, test } from "@playwright/test"

const routes = [
  ["/", /Sprawdź, co ci przysługuje/i],
  ["/panel", /Panel sprawy/i],
  ["/start", /Opisz swoją sytuację/i],
  ["/kalkulator", /Kalkulator zasiłków/i],
  ["/asystent", /Asystent zasiłkowy/i],
  ["/dokumenty", /Analiza dokumentów/i],
  ["/os-czasu", /Oś czasu/i],
  ["/o-projekcie", /Co jest prawdziwe/i],
  ["/mobywatel", /Logowanie przez mObywatel/i],
  ["/dane", /Uzupełnij dane automatycznie/i],
  ["/admin", /Panel administratora/i],
  ["/admin/login", /Dostęp do konfiguracji/i],
] as const

for (const [path, heading] of routes) {
  test(`renders ${path}`, async ({ page }) => {
    const response = await page.goto(path)
    expect(response?.status()).toBeLessThan(500)
    await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible()
    await expect(page.locator("html")).toHaveAttribute("lang", "pl")
  })
}
