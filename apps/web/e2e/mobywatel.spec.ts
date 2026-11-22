import { expect, test } from "@playwright/test"

test("simulated mObywatel login prefills the onboarding wizard", async ({
  page,
  context,
}) => {
  await page.goto("/mobywatel")

  await expect(
    page.getByRole("heading", { level: 1, name: /Logowanie przez mObywatel/i })
  ).toBeVisible()
  await expect(page.getByText("To jest symulacja")).toBeVisible()

  const providerButton = page.getByRole("button", {
    name: /Aplikacja mObywatel/i,
  })
  await expect(providerButton).toBeEnabled({ timeout: 15_000 })
  await providerButton.click()

  await page.getByRole("button", { name: /Anna Kowalska/ }).click()
  await page.getByRole("button", { name: "Dalej" }).click()

  await page
    .getByRole("checkbox", {
      name: /Wyrażam zgodę na przekazanie powyższych danych/i,
    })
    .check()
  await page.getByRole("button", { name: "Udostępnij dane" }).click()

  await page.getByLabel("Kod PIN").fill("1234")
  await page.getByRole("button", { name: "Potwierdź w aplikacji" }).click()

  await expect(page.getByText("Dane zostały przekazane")).toBeVisible()

  const cookies = await context.cookies()
  const session = cookies.find((cookie) => cookie.name === "zpr_mobywatel")
  expect(session?.httpOnly).toBe(true)

  await page.getByRole("button", { name: "Przejdź do kreatora" }).click()
  await expect(page).toHaveURL(/\/start\?import-offer=1$/)

  const offer = page.getByRole("dialog")
  await expect(
    offer.getByRole("heading", { name: /Chcesz pobrać dane z innych ośrodków/i })
  ).toBeVisible()
  await offer
    .getByRole("button", { name: /Wypełnię formularz samodzielnie/i })
    .click()
  await expect(page).toHaveURL(/\/start$/)

  await expect(page.getByLabel("Imię")).toHaveValue("Anna")
  await expect(page.getByLabel("Nazwisko")).toHaveValue("Kowalska")
  await expect(page.getByLabel("Adres e-mail")).toHaveValue(
    "anna.kowalska@example.test"
  )
  await expect(page.getByText(/Zalogowano przez mObywatel/i)).toBeVisible()
})
