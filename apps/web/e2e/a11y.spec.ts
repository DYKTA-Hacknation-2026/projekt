import AxeBuilder from "@axe-core/playwright"
import { expect, test } from "@playwright/test"

for (const path of ["/", "/kalkulator", "/asystent", "/mobywatel"]) {
  test(`has no detectable accessibility violations on ${path}`, async ({
    page,
  }) => {
    await page.goto(path)
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .analyze()

    expect(results.violations).toEqual([])
  })
}
