import { expect, test } from "@playwright/test"

test("homepage exposes both ways to check a situation", async ({ page }) => {
  await page.goto("/")

  const hero = page.locator("main section").first()

  const form = hero.getByRole("link", { name: /Sprawdź przez formularz/i })
  const chat = hero.getByRole("link", { name: /Sprawdź w rozmowie/i })

  await expect(form).toBeVisible()
  await expect(chat).toBeVisible()
  await expect(form).toHaveAttribute("href", "/start")
  await expect(chat).toHaveAttribute("href", "/asystent")
})

test("leave overview switches between shared and per-parent views", async ({
  page,
}) => {
  await page.goto("/")

  const leaveSection = page
    .locator("section")
    .filter({
      has: page.getByRole("heading", { name: /urlopy układają się/i }),
    })

  await expect(leaveSection.getByRole("tab", { name: "Razem" })).toBeVisible()
  await expect(leaveSection.getByText("Urlop macierzyński mamy")).toBeVisible()
  await expect(
    leaveSection.getByText("Urlop rodzicielski drugiego rodzica")
  ).toBeVisible()

  await leaveSection.getByRole("tab", { name: "Mama" }).click()
  await expect(leaveSection.getByText("Urlop macierzyński mamy")).toBeVisible()
  await expect(
    leaveSection.getByText("Urlop rodzicielski drugiego rodzica")
  ).toHaveCount(0)

  await leaveSection.getByRole("tab", { name: "Drugi rodzic" }).click()
  await expect(leaveSection.getByText("Urlop macierzyński mamy")).toHaveCount(0)
  await expect(
    leaveSection.getByText("Urlop rodzicielski drugiego rodzica")
  ).toBeVisible()
})

test("homepage does not scroll horizontally on a narrow screen", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto("/")

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth
  )
  expect(overflow).toBeLessThanOrEqual(1)
})
