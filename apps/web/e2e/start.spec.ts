import { expect, test, type Page } from "@playwright/test"
import AxeBuilder from "@axe-core/playwright"

/**
 * The `/start` pipeline: situation → adaptive questions → deterministic
 * results → optional save → document analysis with the same profile.
 * Engine calls run against the real API; no legal logic is asserted here beyond
 * the labels the engine returns.
 */

const NETWORK = { timeout: 45_000 }

async function chooseScenario(page: Page, name: RegExp) {
  await page.getByRole("radio", { name }).check()
  await page.getByRole("button", { name: "Dalej" }).click()
}

async function familyForPregnancy(page: Page, dueDate = "2027-03-10") {
  await page.getByLabel("Przewidywany termin porodu").fill(dueDate)
  await page.getByRole("radio", { name: /Nie, licz tylko mnie/i }).check()
  await page.getByRole("button", { name: "Dalej" }).click()
}

async function workAsEmployee(page: Page, income = "8000") {
  await page.getByRole("radio", { name: /Umowa o pracę/i }).check()
  await page
    .getByLabel("Ile wynosi Twoje miesięczne wynagrodzenie brutto?")
    .fill(income)
  await page.getByRole("button", { name: "Dalej" }).click()
}

async function choosePayment(page: Page) {
  await page
    .getByRole("radio", { name: /100% za macierzyński, 70% za rodzicielski/i })
    .check()
  await page.getByRole("button", { name: "Dalej" }).click()
}

async function waitForResults(page: Page) {
  await expect(page.getByTestId("situation-results")).toBeVisible(NETWORK)
  await expect(
    page.getByRole("heading", { name: "Podsumowanie Twojej sytuacji" })
  ).toBeVisible()
  await expect(
    page.getByRole("heading", { name: "Możliwe uprawnienia" })
  ).toBeVisible()
  await expect(
    page.getByRole("heading", { name: "Szacunkowe kwoty" })
  ).toBeVisible()
  await expect(
    page.getByRole("heading", { name: "Plan działania i terminy" })
  ).toBeVisible()
  await expect(
    page.getByRole("heading", { name: "Brakujące informacje" })
  ).toBeVisible()
}

async function expectNoSaveRequired(page: Page) {
  await expect(
    page.getByRole("button", { name: "Zapisz sprawę" })
  ).toBeVisible()
  await expect(page.getByText(/Numer sprawy:/)).toHaveCount(0)
}

test("explains the goal before the wizard and lets a pregnant user analyse without an account", async ({
  page,
}) => {
  let onboardingCalls = 0
  page.on("request", (request) => {
    if (request.url().includes("/api/v1/onboarding")) onboardingCalls += 1
  })
  await page.goto("/start")
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: /Sprawdź swoje uprawnienia i przygotuj się do formalności/i,
    })
  ).toBeVisible()
  await expect(page.getByText("Co otrzymasz na końcu")).toBeVisible()
  await expect(
    page.getByText(/Analiza informacyjna, nie decyzja ZUS/i)
  ).toBeVisible()
  await expect(
    page.getByText(/Możesz przejść cały proces bez zapisywania sprawy/i)
  ).toBeVisible()

  await chooseScenario(page, /Oczekuję narodzin dziecka/i)
  await familyForPregnancy(page)
  await workAsEmployee(page)
  await choosePayment(page)
  await waitForResults(page)
  await expectNoSaveRequired(page)
  expect(onboardingCalls).toBe(0)
  await expect(
    page.getByRole("link", { name: "Sprawdź mój wniosek" })
  ).toBeVisible()
  await expect(page.getByText(/Silnik .* zestaw reguł/i)).toBeVisible()
  await expect(page.getByText(/To nie jest decyzja ZUS/i).first()).toBeVisible()
})

test("adapts the path for a birth and shows a manual-review status for inconsistent data", async ({
  page,
}) => {
  await page.goto("/start")
  await chooseScenario(page, /Dziecko już się urodziło/i)
  await expect(page.getByLabel("Data urodzenia dziecka")).toBeVisible()
  await expect(page.getByLabel("Przewidywany termin porodu")).toHaveCount(0)
  await page.getByLabel("Data urodzenia dziecka").fill("2099-01-01")
  await page.getByRole("radio", { name: /Nie, licz tylko mnie/i }).check()
  await page.getByRole("button", { name: "Dalej" }).click()
  await workAsEmployee(page)
  await choosePayment(page)
  await waitForResults(page)
  await expect(
    page.getByText("Wymaga ręcznej weryfikacji").first()
  ).toBeVisible()
  await expect(
    page.getByText(/Ręczna weryfikacja|Wymaga ręcznej weryfikacji/i).first()
  ).toBeVisible()
})

test("supports a mandate contract without assuming sickness insurance", async ({
  page,
}) => {
  await page.goto("/start")
  await chooseScenario(page, /Oczekuję narodzin dziecka/i)
  await familyForPregnancy(page)
  await page.getByRole("radio", { name: /Umowa zlecenia/i }).check()
  await page
    .getByRole("radio", { name: /Nie mam ubezpieczenia chorobowego/i })
    .check()
  await page
    .getByLabel("Ile wynosi Twoje miesięczne wynagrodzenie brutto?")
    .fill("6000")
  await page.getByRole("button", { name: "Dalej" }).click()
  await choosePayment(page)
  await waitForResults(page)
  await expect(page.getByText("Umowa zlecenia").first()).toBeVisible()
  await expect(
    page.getByText("Brak podstaw do potwierdzenia").first()
  ).toBeVisible()
})

test("shows concrete missing information instead of a pretend amount", async ({
  page,
}) => {
  await page.goto("/start")
  await chooseScenario(page, /Oczekuję narodzin dziecka/i)
  await familyForPregnancy(page)
  await page.getByRole("radio", { name: /Umowa o pracę/i }).check()
  await page.getByRole("button", { name: "Dalej" }).click()
  await choosePayment(page)
  await waitForResults(page)
  await expect(page.getByText("Wynik częściowy").first()).toBeVisible()
  await expect(page.getByText("Kwota nieustalona").first()).toBeVisible()
  await expect(
    page.getByText(/Brakuje podstawy wymiaru/i).first()
  ).toBeVisible()
})

test("keeps answers when going back and re-runs the analysis after a change", async ({
  page,
}) => {
  await page.goto("/start")
  await chooseScenario(page, /Oczekuję narodzin dziecka/i)
  await familyForPregnancy(page)
  await workAsEmployee(page)
  await choosePayment(page)
  await waitForResults(page)

  await page.getByRole("button", { name: "Zmień odpowiedzi" }).click()
  await page.getByRole("radio", { name: /Oczekuję narodzin dziecka/i }).check()
  await page.getByRole("button", { name: "Dalej" }).click()
  await expect(page.getByLabel("Przewidywany termin porodu")).toHaveValue(
    "2027-03-10"
  )
  await page.getByLabel("Przewidywany termin porodu").fill("2027-04-10")
  await page.getByRole("button", { name: "Dalej" }).click()
  await page.getByRole("button", { name: "Dalej" }).click()
  await page.getByRole("button", { name: "Dalej" }).click()
  await waitForResults(page)
  await expect(
    page.getByText(/2027-04-10|10 kwietnia 2027/i).first()
  ).toBeVisible()
})

test("uses the case profile in document analysis instead of asking again", async ({
  page,
}) => {
  await page.goto("/start")
  await chooseScenario(page, /Oczekuję narodzin dziecka/i)
  await familyForPregnancy(page)
  await workAsEmployee(page)
  await choosePayment(page)
  await waitForResults(page)

  await page.getByRole("link", { name: "Sprawdź mój wniosek" }).click()
  await expect(page).toHaveURL(/\/dokumenty\?from=start/)
  await expect(page.getByTestId("case-profile-banner")).toBeVisible()
  await expect(page.getByText(/Oczekiwanie narodzin dziecka/i)).toBeVisible()
})

test("lets a user check an application as the entry point", async ({
  page,
}) => {
  await page.goto("/start")
  await chooseScenario(page, /Chcę sprawdzić konkretny wniosek/i)
  await page.getByLabel("Przewidywany termin porodu").fill("2027-03-10")
  await page.getByRole("radio", { name: /Nie, licz tylko mnie/i }).check()
  await page.getByRole("button", { name: "Dalej" }).click()
  await workAsEmployee(page)
  await page.getByRole("button", { name: "Dalej" }).click()
  await waitForResults(page)
  await page.getByRole("link", { name: "Sprawdź mój wniosek" }).click()
  await expect(page).toHaveURL(/\/dokumenty\?from=start/)
})

test("results screen has no serious or critical accessibility violations", async ({
  page,
}) => {
  await page.goto("/start")
  await chooseScenario(page, /Oczekuję narodzin dziecka/i)
  await familyForPregnancy(page)
  await workAsEmployee(page)
  await choosePayment(page)
  await waitForResults(page)

  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze()
  expect(
    results.violations
      .filter(
        (violation) =>
          violation.impact === "serious" || violation.impact === "critical"
      )
      .map((violation) => ({
        id: violation.id,
        nodes: violation.nodes.map(
          (node) => `${node.target.join(" ")}: ${node.failureSummary ?? ""}`
        ),
      }))
  ).toEqual([])
})

test("supports someone who is only planning and clearly marks missing facts", async ({
  page,
}) => {
  await page.goto("/start")
  await chooseScenario(page, /Planuję rodzicielstwo/i)
  await expect(page.getByLabel("Przewidywany termin porodu")).toBeVisible()
  await page.getByRole("radio", { name: /Nie, licz tylko mnie/i }).check()
  await page.getByRole("button", { name: "Dalej" }).click()
  await workAsEmployee(page)
  await choosePayment(page)
  await waitForResults(page)
  await expect(page.getByText("Wynik częściowy").first()).toBeVisible()
  await expect(
    page.getByText(/Kiedy urodzi się dziecko|termin porodu/i).first()
  ).toBeVisible()
})

test("supports a user who is already on maternity leave", async ({ page }) => {
  await page.goto("/start")
  await chooseScenario(page, /Korzystam już z urlopu lub świadczenia/i)
  await page.getByRole("radio", { name: /Urlop macierzyński/i }).check()
  await page.getByLabel("Data urodzenia dziecka").fill("2026-10-01")
  await page.getByRole("radio", { name: /Nie, licz tylko mnie/i }).check()
  await page.getByRole("button", { name: "Dalej" }).click()
  await workAsEmployee(page)
  await page
    .getByLabel("Od kiedy korzystasz z urlopu lub świadczenia?")
    .fill("2026-10-01")
  await page
    .getByRole("radio", { name: /100% za macierzyński, 70% za rodzicielski/i })
    .check()
  await page.getByRole("button", { name: "Dalej" }).click()
  await waitForResults(page)
  await expect(page.getByText("Obecny urlop").first()).toBeVisible()
  await expect(page.getByText("Urlop macierzyński").first()).toBeVisible()
})

test("planner starts from the analysed situation instead of the demo date", async ({
  page,
}) => {
  await page.goto("/start")
  await chooseScenario(page, /Oczekuję narodzin dziecka/i)
  await familyForPregnancy(page, "2027-05-20")
  await workAsEmployee(page)
  await choosePayment(page)
  await waitForResults(page)

  await page.getByRole("link", { name: /Dopracuj plan urlopów/i }).click()
  await expect(page).toHaveURL(/\/os-czasu/)
  await expect(page.getByText("20 maja 2027").first()).toBeVisible()
  await expect(
    page.getByText(/Dane wstępne z Twojej sprawy w kreatorze sytuacji/i)
  ).toBeVisible()
})

test("saves the case only on request and reuses its number", async ({
  page,
}) => {
  await page.goto("/start")
  await chooseScenario(page, /Oczekuję narodzin dziecka/i)
  await familyForPregnancy(page)
  await workAsEmployee(page)
  await choosePayment(page)
  await waitForResults(page)

  await page.getByLabel("Imię", { exact: true }).last().fill("Anna")
  await page.getByLabel("Nazwisko", { exact: true }).last().fill("Kowalska")
  await page
    .getByLabel("Adres e-mail", { exact: true })
    .last()
    .fill("anna.start@example.test")
  await page.getByRole("button", { name: "Zapisz sprawę" }).click()
  await expect(page.getByText("Sprawa zapisana")).toBeVisible(NETWORK)
  await expect(page.getByText(/Numer sprawy:/)).toBeVisible()
  await expect(
    page.getByRole("link", { name: "Otwórz panel sprawy" })
  ).toBeVisible()
})
