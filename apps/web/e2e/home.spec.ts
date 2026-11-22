import { expect, test } from "@playwright/test"

test("hero exposes both ways to check a situation", async ({ page }) => {
  await page.goto("/")

  const hero = page.locator("main section").first()
  const form = hero.getByRole("link", { name: /Sprawdź przez formularz/i })
  const chat = hero.getByRole("link", { name: /Sprawdź w rozmowie/i })

  await expect(form).toBeVisible()
  await expect(chat).toBeVisible()
  await expect(form).toHaveAttribute("href", "/start")
  await expect(chat).toHaveAttribute("href", "/asystent")
})

test("method section repeats the two equivalent paths", async ({ page }) => {
  await page.goto("/")

  const methods = page.locator("#sposob")
  await expect(
    methods.getByRole("heading", { name: /Wybierz sposób/i })
  ).toBeVisible()
  await expect(
    methods.getByRole("link", { name: /Sprawdź przez formularz/i })
  ).toHaveAttribute("href", "/start")
  await expect(
    methods.getByRole("link", { name: /Sprawdź w rozmowie/i })
  ).toHaveAttribute("href", "/asystent")
})

test("remaining tools lead to real features", async ({ page }) => {
  await page.goto("/")

  const tools = page.locator("#mozliwosci")
  for (const [href, name] of [
    ["/kalkulator", /Oblicz wysokość świadczeń/i],
    ["/os-czasu", /Zaplanuj urlopy rodzicielskie/i],
    ["/dokumenty", /Sprawdź i przygotuj dokumenty/i],
  ] as const) {
    const link = tools.getByRole("link", { name })
    await expect(link).toBeVisible()
    await expect(link).toHaveAttribute("href", href)
  }
})

test("leave preview switches between the parents without changing the example", async ({
  page,
}) => {
  await page.goto("/")
  const preview = page.locator(".leave-preview")

  await expect(preview.locator(".is-muted")).toHaveCount(0)

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

  const first = page.locator(".home-faq details").first()
  await expect(first).toHaveAttribute("open", "")
  await expect(first).toContainText("Nie. To projekt demonstracyjny.")
})

test("homepage shows the stock photos with descriptive alternatives", async ({
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
