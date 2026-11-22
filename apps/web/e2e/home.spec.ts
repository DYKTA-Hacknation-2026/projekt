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
    .getByRole("link", { name: /Sprawdź swoje świadczenia/ })
    .first()
    .click()

  await expect(page).toHaveURL(/\/start$/, { timeout: 30_000 })
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: /Sprawdź swoje uprawnienia i przygotuj się do formalności/i,
    })
  ).toBeVisible({ timeout: 30_000 })
})

test("home shows four real stock photographs with descriptive alternatives", async ({
  page,
}) => {
  await page.goto("/")
  for (const name of [
    /Rodzice trzymają nowo narodzone dziecko/,
    /Przyszli rodzice układają dłonie/,
    /Mała dłoń dziecka/,
    /Rodzice przytulają niemowlę/,
  ]) {
    await expect(page.getByRole("img", { name })).toBeVisible()
  }
})

test("leave preview switches between the parents without changing the example", async ({
  page,
}) => {
  await page.goto("/")
  const preview = page.locator(".leave-preview")
  await preview
    .getByRole("button", { name: "Drugi rodzic", exact: true })
    .click()
  await expect(
    preview.getByRole("button", { name: "Drugi rodzic", exact: true })
  ).toHaveAttribute("aria-pressed", "true")
  await expect(preview.locator(".leave-preview__explanation")).toContainText(
    "drugi rodzic wykorzystuje"
  )
  await expect(preview.locator(".is-muted")).toHaveCount(2)
  await preview.getByRole("button", { name: "Mama", exact: true }).click()
  await expect(preview.locator(".is-muted")).toHaveCount(1)
  await preview.getByRole("button", { name: "Razem", exact: true }).click()
  await expect(preview.locator(".is-muted")).toHaveCount(0)
  await expect(
    preview.getByRole("link", { name: "Otwórz planer urlopów" })
  ).toHaveAttribute("href", "/os-czasu")
})

test("FAQ explains the demo and opens with the keyboard", async ({ page }) => {
  await page.goto("/")
  const question = page.getByText("Czy to oficjalny serwis ZUS?", {
    exact: true,
  })
  await question.focus()
  await page.keyboard.press("Enter")
  await expect(page.locator(".home-faq details").first()).toHaveAttribute(
    "open",
    ""
  )
  await expect(page.locator(".home-faq details").first()).toContainText(
    "Nie. To projekt demonstracyjny."
  )
})

test("hero follows scrolling and returns to a static state for reduced motion", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" })
  await page.goto("/")
  const image = page.locator(".home-hero__photo img")
  await expect
    .poll(() => image.evaluate((element) => element.style.transform))
    .not.toBe("")
  const before = await image.evaluate(
    (element) => getComputedStyle(element).transform
  )
  await page.evaluate(() => window.scrollTo({ top: 500, behavior: "instant" }))
  await expect
    .poll(() =>
      image.evaluate((element) => getComputedStyle(element).transform)
    )
    .not.toBe(before)

  await page.emulateMedia({ reducedMotion: "reduce" })
  await expect
    .poll(() =>
      image.evaluate((element) => getComputedStyle(element).transform)
    )
    .toBe("none")
  await expect(page.locator("html")).toHaveCSS("scroll-behavior", "auto")
  await page.locator("#questions-title").scrollIntoViewIfNeeded()
  await expect(page.locator("#questions-title")).toBeVisible()
  await expect(page.locator("#questions-title")).toHaveCSS("opacity", "1")
})
