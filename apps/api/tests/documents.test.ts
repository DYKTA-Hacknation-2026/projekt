import { describe, expect, it } from "vitest"

import {
  analyzeUploadedFile,
  buildSampleAnalysis,
  detectFormFromFilename,
} from "@/server/services/documents"

describe("document form detection", () => {
  it.each([
    ["ZAM_Anna.pdf", "ZAM", false],
    ["Z-3_Tomasz.pdf", "Z-3", false],
    ["Z-3a_Kasia.pdf", "Z-3a", false],
    ["ZUR_legacy.pdf", "ZAM", true],
    ["Z-3B_legacy.pdf", "Z-3", true],
    ["umowa.pdf", "UNKNOWN", false],
  ])("detects %s as %s", (fileName, code, legacy) => {
    expect(detectFormFromFilename(fileName)).toEqual({
      formCode: code,
      legacy,
    })
  })

  it("builds a synthetic ZAM preview with confirmation required", () => {
    const analysis = buildSampleAnalysis("anna-zam")
    expect(analysis.formCode).toBe("ZAM")
    expect(analysis.simulated).toBe(true)
    expect(analysis.requiresConfirmation).toBe(true)
    expect(analysis.fields.some((field) => field.key === "podstawa")).toBe(true)
  })

  it("does not claim OCR for uploaded files", () => {
    const analysis = analyzeUploadedFile({
      fileName: "Z-3_test.pdf",
      size: 2048,
      signature: "%PDF-",
    })

    expect(analysis.formCode).toBe("Z-3")
    expect(analysis.warnings.join(" ")).toContain("Nie wykonuje OCR")
    expect(
      analysis.fields.find((field) => field.key === "podstawa")?.value
    ).toBe("Do uzupełnienia")
  })
})
