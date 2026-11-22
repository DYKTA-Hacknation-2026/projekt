import { describe, expect, it } from "vitest"

import { detectForm, matchFormCode } from "./detect"

const page = (text: string, number = 1) => ({ page: number, text })

describe("form codes as whole tokens", () => {
  it.each([
    ["Z-3b", "Z-3b"],
    ["Z-3B", "Z-3b"],
    ["Z 3b", "Z-3b"],
    ["Z-3a", "Z-3a"],
    ["Z3A", "Z-3a"],
    ["Z-3", "Z-3"],
    ["ZAS-53", "ZAS-53"],
    ["ZAS 12", "ZAS-12"],
    ["ZAM", "ZAM"],
    ["ZUR", "ZUR"],
    ["ZAO", "ZAO"],
    ["POŚWIADCZENIE", "POSWIADCZENIE"],
  ])("%s → %s", (text, code) => {
    expect(matchFormCode(text)).toBe(code)
  })

  it.each(["ZAMOWIENIE", "zamówienie nr 7", "ZAMEK", "Z-35", "PROZAO", "ZURICH", "Z-3C2"])("%s is not a form code", (text) => {
    expect(matchFormCode(text)).toBeNull()
  })

  it("Z-3b and Z-3a are never counted as Z-3", () => {
    expect(detectForm({ pages: [page("ZAŚWIADCZENIE PŁATNIKA SKŁADEK\nZ-3b")], fields: [] }).form).toBe("Z-3b")
    expect(detectForm({ pages: [page("Z-3a\nZAŚWIADCZENIE PŁATNIKA SKŁADEK")], fields: [] }).form).toBe("Z-3a")
  })
})

describe("detectForm evidence order", () => {
  it("prefers the AcroForm form-code field over everything else", () => {
    const result = detectForm({
      pages: [page("Dokument")],
      fields: [{ name: "topmostSubform[0].Page1[0].kod_formularza[0]", value: "Z-3" }],
      fileName: "ZAM.pdf",
    })
    expect(result).toMatchObject({ form: "Z-3", legacy: false, fromFileNameOnly: false })
    expect(result.confidence).toBeGreaterThan(0.9)
  })

  it("uses the first-page heading; codes mentioned in the body do not win", () => {
    const result = detectForm({
      pages: [page("ZAM\nWNIOSEK O ZASIŁEK MACIERZYŃSKI\n\n\nDo wniosku dołącz Z-3 albo Z-3a od płatnika.")],
      fields: [],
    })
    expect(result.form).toBe("ZAM")
  })

  it("reports forms opening later pages as attachments", () => {
    const result = detectForm({ pages: [page("ZAM\nWNIOSEK"), page("Z-3\nZAŚWIADCZENIE PŁATNIKA SKŁADEK", 2)], fields: [] })
    expect(result.form).toBe("ZAM")
    expect(result.attachments).toEqual(["Z-3"])
  })

  it("content beats the file name", () => {
    expect(detectForm({ pages: [page("Z-3a\nzaświadczenie")], fields: [], fileName: "ZAM_wniosek.pdf" }).form).toBe("Z-3a")
  })

  it("uses the file name only as a last-resort, low-confidence hint", () => {
    const result = detectForm({ pages: [page("skan bez treści")], fields: [], fileName: "Z-3_Tomasz.pdf" })
    expect(result).toMatchObject({ form: "Z-3", fromFileNameOnly: true })
    expect(result.confidence).toBeLessThan(0.5)
  })

  it("does not detect ZAM in ZAMOWIENIE.pdf", () => {
    expect(detectForm({ pages: [page("Faktura")], fields: [], fileName: "ZAMOWIENIE.pdf" }).form).toBe("UNKNOWN")
    expect(detectForm({ pages: [page("ZAMÓWIENIE NR 12/2026\nFaktura")], fields: [] }).form).toBe("UNKNOWN")
  })

  it.each([
    ["ZUR\nWNIOSEK O ZASIŁEK", "ZUR"],
    ["ZAO\nWNIOSEK O ZASIŁEK OJCOWSKI", "ZAO"],
    ["ZAŚWIADCZENIE PŁATNIKA SKŁADEK Z-3b", "Z-3b"],
  ])("marks withdrawn form %s as legacy", (text, code) => {
    expect(detectForm({ pages: [page(text)], fields: [] })).toMatchObject({ form: code, legacy: true })
  })

  it.each([
    ["ZAS-53\nWNIOSEK O ZASIŁEK CHOROBOWY", "ZAS-53"],
    ["ZAS-12\nWNIOSEK", "ZAS-12"],
    ["ZAŚWIADCZENIE LEKARSKIE O PRZEWIDYWANEJ DACIE PORODU", "POSWIADCZENIE"],
  ])("detects %s", (text, code) => {
    expect(detectForm({ pages: [page(text)], fields: [] })).toMatchObject({ form: code, legacy: false })
  })
})
