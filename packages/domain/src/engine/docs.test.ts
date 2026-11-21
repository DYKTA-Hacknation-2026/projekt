import { readFileSync } from "node:fs"

import { describe, expect, it } from "vitest"

import { ASSUMPTIONS, RULES, UNSUPPORTED_SCENARIOS } from "./index"

const doc = readFileSync(new URL("../../../../docs/calculation-engine.md", import.meta.url), "utf8")

describe("docs/calculation-engine.md stays in step with the code", () => {
  it("documents every unsupported legal scenario", () => {
    for (const [code, text] of Object.entries(UNSUPPORTED_SCENARIOS)) {
      expect(doc, code).toContain(`| ${code} |`)
      expect(doc, code).toContain(text.slice(0, 40))
    }
  })

  it("documents every assumption", () => {
    for (const id of Object.keys(ASSUMPTIONS)) expect(doc, id).toContain(`| ${id} |`)
  })

  it("lists every rule of the catalogue", () => {
    for (const id of Object.keys(RULES)) expect(doc, id).toContain(`| ${id} |`)
  })
})
