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
  ["/wiedza", /Centrum wiedzy/i],
  ["/wiedza/faq", /Najczęściej zadawane pytania/i],
  ["/wiedza/artykuly", /Artykuły i opracowania/i],
  ["/wiedza/kategoria/ciaza-i-porod", /Ciąża i poród/i],
  ["/wiedza/artykul/zasilek-macierzynski", /Zasiłek macierzyński: komu przysługuje/i],
  ["/wiedza/dokumenty", /Dokumenty i formularze/i],
  ["/wiedza/dokumenty/wniosek-zam", /Wniosek o zasiłek macierzyński/i],
  ["/wiedza/przewodniki", /Przewodniki krok po kroku/i],
  ["/wiedza/przewodniki/jak-ubiegac-sie-o-zasilek-macierzynski", /Jak ubiegać się o zasiłek macierzyński/i],
  ["/wiedza/slownik", /Słownik pojęć/i],
  ["/wiedza/slownik/tytul-ubezpieczenia", /Tytuł ubezpieczenia/i],
  ["/wiedza/zrodla", /Źródła i podstawy prawne/i],
  ["/mobywatel", /Logowanie przez mObywatel/i],
  ["/dane", /Uzupełnij dane automatycznie/i],
  ["/admin", /Panel administratora/i],
  ["/admin/wiedza", /Centrum wiedzy/i],
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
