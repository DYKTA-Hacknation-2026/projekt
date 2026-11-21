import { expect, test } from "@playwright/test"

const darkModeDisabled = process.env.NEXT_PUBLIC_DISABLE_DARK_MODE === "true"

test("theme feature flag overrides a saved dark preference and system theme", async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: "dark" })
  await page.addInitScript(() => localStorage.setItem("theme", "dark"))
  await page.goto("/")
  const html = page.locator("html")
  const toggle = page.getByRole("button", {
    name: "Zmień motyw jasny lub ciemny",
  })

  if (darkModeDisabled) {
    await expect(html).toHaveClass(/light/)
    await expect(toggle).toHaveCount(0)
    await page.keyboard.press("d")
    await expect(html).toHaveClass(/light/)
    await page.reload()
    await expect(html).toHaveClass(/light/)
  } else {
    await expect(html).toHaveClass(/dark/)
    await toggle.click()
    await expect(html).toHaveClass(/light/)
    await page.keyboard.press("d")
    await expect(html).toHaveClass(/dark/)
  }
})
