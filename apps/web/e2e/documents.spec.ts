import AxeBuilder from "@axe-core/playwright"
import { expect, test, type Page } from "@playwright/test"

// Synthetic PDFs are generated here — no ZUS document is stored in the repository.
import { formPage, writePdf } from "../../../packages/documents/src/pdf/writer"

/**
 * S-00 jury fast path on /dokumenty: sample case or upload → extraction →
 * confirmation → engine result → checklist → calculator prefill.
 */

// First requests compile the API routes in `next dev`; allow for that.
const NETWORK = { timeout: 30_000 }
test.describe.configure({ timeout: 90_000 })

async function loadSample(page: Page, id: string) {
  await page.goto("/dokumenty")
  await page.locator(`[data-sample="${id}"]`).click()
  await expect(page.getByTestId("detected-form")).toBeVisible(NETWORK)
}

async function confirmAndCompute(page: Page) {
  await page.getByRole("button", { name: "Potwierdź wszystkie wypełnione pola" }).click()
  const apply = page.getByRole("button", { name: "Potwierdź i oblicz" })
  await expect(apply).toBeEnabled()
  await apply.click()
  await expect(page.getByTestId("document-assessment")).toBeVisible(NETWORK)
  await expect(apply).toBeEnabled()
}

const syntheticZ3 = () =>
  Buffer.from(
    writePdf({
      pages: [
        formPage(["ZAŚWIADCZENIE PŁATNIKA SKŁADEK Z-3", "DOKUMENT TESTOWY — dane fikcyjne"], [
          ["Imię", "Jan"],
          ["Nazwisko", "Testowy"],
          ["Wnioskodawca", "ojciec dziecka"],
          ["Rodzaj zasiłku", "zasiłek za urlop ojcowski"],
          ["Początek ubezpieczenia chorobowego", "01.03.2023"],
          ["Podstawa wymiaru zasiłku", "6 000,00 zł"],
          ["Data porodu", "10.11.2026"],
        ]),
      ],
    })
  )

test("anna-zam: confirm → verdict, basis from gross pay, ✓ badge, checklist → calculator", async ({ page }) => {
  await loadSample(page, "anna-zam")
  await expect(page.getByTestId("detected-form")).toContainText("ZAM")
  await expect(page.locator("#field-wynagrodzenieBrutto")).toHaveValue("8000.00")
  await confirmAndCompute(page)

  await expect(page.getByTestId("basis-MOTHER")).toHaveText(/6903,20\s*zł/)
  await expect(page.getByTestId("sample-comparison")).toContainText("✓")
  await expect(page.getByTestId("document-checklist")).toContainText("Z-3")

  await page.getByRole("link", { name: "Otwórz kalkulator z tymi danymi" }).click()
  await expect(page).toHaveURL(/\/kalkulator/, NETWORK)
  await expect(page.getByText("Dane z potwierdzonego dokumentu")).toBeVisible()
  await expect(page.getByLabel("Miesięczny dochód brutto (zł)")).toHaveValue("8000")
  await page.getByRole("button", { name: "Oblicz świadczenie" }).click()
  await expect(page.getByText(/6903,20\s*zł/).first()).toBeVisible(NETWORK)
})

test("tomasz-z3 (AcroForm): the payer's basis reaches the calculator unchanged", async ({ page }) => {
  await loadSample(page, "tomasz-z3")
  await confirmAndCompute(page)
  await expect(page.getByTestId("basis-FATHER")).toHaveText(/6000,00\s*zł/)

  await page.getByRole("link", { name: "Otwórz kalkulator z tymi danymi" }).click()
  await expect(page.getByTestId("imported-basis")).toContainText(/6000,00\s*zł/)
  await expect(page.getByLabel("Użyj podstawy wymiaru z potwierdzonego dokumentu")).toBeChecked()
  await page.getByRole("button", { name: "Oblicz świadczenie" }).click()
  // 6000 zł, not 6000 × (1 − 13,71%) = 5177,40 zł.
  await expect(page.getByText("Szacunek łączny")).toBeVisible(NETWORK)
  await expect(page.getByText(/5177,40\s*zł/)).toHaveCount(0)
})

test("upload of a synthetic Z-3 PDF → extraction → confirmation → result", async ({ page }) => {
  await page.goto("/dokumenty")
  await page.getByLabel("Plik PDF").setInputFiles({ name: "skan_dokumentu.pdf", mimeType: "application/pdf", buffer: syntheticZ3() })
  await page.getByRole("button", { name: "Analizuj dokument" }).click()
  await expect(page.getByText("Zaznacz zgodę na przetwarzanie dokumentu.")).toBeVisible()

  await page.getByLabel("Zgadzam się na przetwarzanie dokumentu w celu odczytu pól").check()
  await page.getByRole("button", { name: "Analizuj dokument" }).click()
  await expect(page.getByTestId("detected-form")).toContainText("Z-3", NETWORK)
  await expect(page.locator('[data-field="podstawa"]')).toContainText("tekst dokumentu")
  await expect(page.locator('object[type="application/pdf"]')).toHaveAttribute("data", /\/api\/v1\/documents\/[0-9a-f-]+\/file#page=1/)
  await confirmAndCompute(page)
  await expect(page.getByTestId("basis-FATHER")).toHaveText(/6000,00\s*zł/)
  await expect(page.locator('[data-benefit="PATERNITY"]')).toContainText(/2800,00\s*zł/)

  await page.getByRole("button", { name: "Usuń dokument" }).click()
  await expect(page.getByTestId("detected-form")).toHaveCount(0)
})

test("rejects a file without the PDF signature", async ({ page }) => {
  await page.goto("/dokumenty")
  await page.getByLabel("Plik PDF").setInputFiles({ name: "Z-3.pdf", mimeType: "application/pdf", buffer: Buffer.from("MZ\x90\x00 to nie jest PDF") })
  await page.getByLabel("Zgadzam się na przetwarzanie dokumentu w celu odczytu pól").check()
  await page.getByRole("button", { name: "Analizuj dokument" }).click()
  await expect(page.getByText(/sygnatury PDF/)).toBeVisible(NETWORK)
})

test("a withdrawn form (ZUR) shows the LR-05 warning", async ({ page }) => {
  await loadSample(page, "ewa-zur")
  await expect(page.getByText("Formularz wycofany").first()).toBeVisible()
  await expect(page.getByTestId("legacy-form-alert")).toContainText("ZAM")
})

test("a placeholder basis cannot be applied", async ({ page }) => {
  await loadSample(page, "kasia-z3a")
  await page.getByRole("button", { name: "Potwierdź wszystkie wypełnione pola" }).click()
  await page.locator("#field-podstawa").fill("Do uzupełnienia")
  await expect(page.getByRole("button", { name: "Potwierdź i oblicz" })).toBeDisabled()
  await expect(page.getByTestId("apply-blockers")).toContainText("popraw format")
})

test("/dokumenty has no serious or critical accessibility violations, also with results", async ({ page }) => {
  const scan = async () => {
    // Scan the resting state: a hovered button has its own (design-system) colours.
    await page.mouse.move(0, 0)
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).exclude("object").analyze()
    return results.violations
      .filter((violation) => violation.impact === "serious" || violation.impact === "critical")
      .map((violation) => ({ id: violation.id, nodes: violation.nodes.map((node) => `${node.target.join(" ")}: ${node.failureSummary ?? ""}`) }))
  }
  await page.goto("/dokumenty")
  await expect(page.locator("[data-sample]").first()).toBeVisible(NETWORK)
  expect(await scan()).toEqual([])
  await page.locator('[data-sample="tomasz-z3"]').click()
  await confirmAndCompute(page)
  expect(await scan()).toEqual([])
})
