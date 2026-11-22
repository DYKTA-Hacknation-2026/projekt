import { expect, test } from "@playwright/test"

test("assistant answers with citations", async ({ page }) => {
  await page.goto("/asystent")
  await page
    .getByLabel("Twoje pytanie")
    .fill("Ile trwa urlop macierzyński przy jednym dziecku?")
  await page.getByRole("button", { name: "Wyślij" }).click()

  await expect(page.getByText("Źródła").last()).toBeVisible({ timeout: 15_000 })
  await expect(page.getByText(/KP art\. 180 § 1/).first()).toBeVisible()
})
