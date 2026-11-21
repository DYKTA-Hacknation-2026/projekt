import { expect, test } from "@playwright/test"

test("calculator returns a deterministic, labelled result", async ({ page }) => {
  await page.goto("/kalkulator")
  await page.getByLabel("Miesięczny dochód brutto (zł)").fill("8000")
  await page.getByRole("button", { name: "Oblicz świadczenie" }).click()

  await expect(page.getByText("Szacunek łączny")).toBeVisible()
  await expect(page.getByText("Wynik niezweryfikowany")).toBeVisible()
  await expect(page.getByText("Dlaczego tak?")).toBeVisible()
  await expect(page.getByText("81 664,81 zł").first()).toBeVisible()
})
