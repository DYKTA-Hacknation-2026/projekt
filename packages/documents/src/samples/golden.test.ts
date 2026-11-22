import { readFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

import { describe, expect, it } from "vitest"

import { toAssessmentInput } from "@zpr/contracts/engine"
import type { SampleCaseExpected } from "@zpr/contracts/documents"
import { calculateParentalBenefits } from "@zpr/domain/engine"

import { applyFieldUpdates, extractFromPdf } from "../extract"
import { mapDocumentFacts } from "../mapping"
import { loadPrivateSampleCases } from "../storage"
import { SYNTHETIC_SAMPLE_CASES, buildSyntheticSamplePdf } from "./index"

/**
 * Golden harness SC-xx (P6-07, FR-DEMO-03): PDF → extraction → confirmation
 * of every field as read → facts → engine → expected verdict and amount.
 * Synthetic cases always run; private ZUS cases run when the git-ignored
 * manifest exists (`fixtures/private/sample-cases/manifest.json`).
 */

const AS_OF = "2026-11-21"
const ID = "0193a000-0000-7000-8000-0000000000aa"

async function runCase(bytes: Uint8Array, origin: "SAMPLE_CASE") {
  const extraction = await extractFromPdf(bytes, { documentId: ID, asOf: AS_OF, origin })
  const confirmed = applyFieldUpdates(
    extraction,
    extraction.fields.map((field) => ({ key: field.key, value: field.value, confirmed: true })),
    { asOf: AS_OF }
  )
  const mapping = mapDocumentFacts(confirmed, { asOf: AS_OF })
  const assessment = mapping.request ? calculateParentalBenefits(toAssessmentInput(mapping.request, AS_OF)) : null
  return { extraction, confirmed, mapping, assessment }
}

function check(result: Awaited<ReturnType<typeof runCase>>, expected: SampleCaseExpected) {
  const { assessment } = result
  expect(assessment, "facts must map to an engine request").not.toBeNull()
  const determination = assessment!.eligibility.determinations.find((item) => item.benefit === expected.benefit && item.parent === expected.parent)
  expect(determination?.status).toBe(expected.status)
  if (expected.monthlyBasisGrosze !== undefined) {
    expect(assessment!.basis.find((item) => item.parent === expected.parent)?.monthlyBasisGrosze).toBe(expected.monthlyBasisGrosze)
  }
  if (expected.amountGrosze !== undefined) {
    const amount = assessment!.totals.byBenefit.find((item) => item.benefit === expected.benefit && item.parent === expected.parent)?.totalGrosze ?? null
    expect(amount).toBe(expected.amountGrosze)
  }
}

describe("golden sample cases — synthetic", () => {
  for (const sample of SYNTHETIC_SAMPLE_CASES) {
    it(`${sample.code} ${sample.id}`, async () => {
      const result = await runCase(buildSyntheticSamplePdf(sample.id)!, "SAMPLE_CASE")
      expect(result.extraction.detectedForm).toBe(sample.formCode)
      for (const code of sample.expectedFindings) {
        expect(result.extraction.findings.map((finding) => finding.code)).toContain(code)
      }
      if (sample.expected) check(result, sample.expected)
    })
  }
})

const privateDir = process.env.SAMPLE_CASES_DIR ?? path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../../fixtures/private/sample-cases")
const privateCases = await loadPrivateSampleCases(privateDir)

describe.runIf(privateCases.length > 0)("golden sample cases — private ZUS fixtures", () => {
  for (const sample of privateCases) {
    it.runIf(Boolean(sample.expected))(`${sample.code} ${sample.label}`, async () => {
      const result = await runCase(new Uint8Array(await readFile(sample.filePath)), "SAMPLE_CASE")
      check(result, sample.expected!)
    })
  }
})
