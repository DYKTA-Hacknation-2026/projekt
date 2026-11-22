import { expect, test } from "@playwright/test"

test.describe("Plan Rodzicielstwa", () => {
  test("pokazuje tory rodziców, szczegóły i widok tabelaryczny", async ({
    page,
  }) => {
    await page.goto("/os-czasu")

    await expect(
      page.getByRole("heading", {
        level: 1,
        name: /Wasza droga przez rodzicielstwo/i,
      })
    ).toBeVisible()
    await expect(
      page.getByRole("heading", { level: 2, name: "Wizualna oś czasu" })
    ).toBeVisible()
    await expect(page.getByText("Scenariusz demonstracyjny").first()).toBeVisible()
    await expect(page.getByText("Przewidywany poród").first()).toBeVisible()

    await page
      .getByRole("button", { name: /Urlop macierzyński.*10 mar 2027/ })
      .first()
      .click()

    const details = page.getByRole("complementary", {
      name: "Szczegóły wydarzenia",
    })
    await expect(
      details.getByRole("heading", { name: "Urlop macierzyński", exact: true })
    ).toBeVisible()
    await expect(details.getByText("Dokumenty i formalności")).toBeVisible()
    await expect(details.getByText("Podstawa prawna i źródła")).toBeVisible()
    await expect(details.getByText(/LR-123/).first()).toBeVisible()

    await page.getByRole("tab", { name: "Widok tabelaryczny" }).click()
    await expect(page.getByRole("table")).toBeVisible()
    await expect(
      page.getByRole("columnheader", { name: "Data lub okres" })
    ).toBeVisible()
  })

  test("filtry i zmiana założeń przeliczają plan bez przeładowania", async ({
    page,
  }) => {
    await page.goto("/os-czasu")

    await page.getByRole("button", { name: "Edytuj założenia" }).click()
    const dueDate = page.getByLabel("Przewidywany termin porodu", {
      exact: true,
    })
    await dueDate.fill("2027-04-01")
    await expect(page.getByText(/1 kwietnia 2027/).first()).toBeVisible()

    await page.getByLabel("Dziecko już się urodziło").check()
    await page.getByLabel("Rzeczywista data porodu").fill("2027-03-05")
    await expect(page.getByText("5 marca 2027").first()).toBeVisible()
    await expect(page.getByText("Data porodu").first()).toBeVisible()

    await page.getByRole("button", { name: "Tata", exact: true }).click()
    await expect(
      page.getByRole("button", { name: /Urlop ojcowski/ }).first()
    ).toBeVisible()

    await page.getByRole("button", { name: "Wspólne", exact: true }).click()
    await expect(
      page
        .getByRole("button", { name: /(Data porodu|Przewidywany termin porodu)/ })
        .first()
    ).toBeVisible()

    await page
      .getByRole("button", { name: "Formalności", exact: true })
      .click()
    await expect(
      page.getByRole("button", { name: /Złóż dokumenty do zasiłku/ }).first()
    ).toBeVisible()

    await page
      .getByRole("button", { name: "Urlopy i uprawnienia", exact: true })
      .click()
    await expect(
      page.getByText("Brak elementów dla wybranych filtrów")
    ).toBeVisible()
    await page.getByRole("button", { name: "Pokaż wszystko" }).click()
    await expect(
      page.getByText("Brak elementów dla wybranych filtrów")
    ).toHaveCount(0)
  })
})
