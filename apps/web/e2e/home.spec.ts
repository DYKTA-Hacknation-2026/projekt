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

test("leave preview shows dated periods and opens the planner", async ({
  page,
}) => {
  await page.goto("/")
  const preview = page.locator(".leave-preview")
  const detail = preview.locator("#home-plan-detail")
  await expect(detail).toContainText("24 lut 2027")
  await expect(detail).toContainText("13 lip 2027")

  const father = preview.getByRole("button", { name: /Tata: Rodzicielski/ })
  await father.click()
  await expect(father).toHaveAttribute("aria-pressed", "true")
  await expect(detail).toContainText("9 tygodni")
  await expect(detail).toContainText("Tata")
  await expect(
    detail.getByRole("link", { name: "Dopasuj w swoim planie" })
  ).toHaveAttribute("href", "/os-czasu")

  const deadline = preview.getByRole("button", {
    name: /Wniosek o urlop ojcowski/,
  })
  await deadline.focus()
  await page.keyboard.press("Enter")
  await expect(deadline).toHaveAttribute("aria-pressed", "true")
  await expect(detail).toContainText("3 mar 2027")
  await expect(
    detail.getByRole("link", { name: "Sprawdź dokumenty" })
  ).toHaveAttribute("href", "/dokumenty")
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
