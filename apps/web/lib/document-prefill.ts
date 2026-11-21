import {
  DOCUMENT_PREFILL_STORAGE_KEY,
  documentPrefillSchema,
  type DocumentPrefill,
} from "@zpr/contracts/documents"

/**
 * Document → calculator handoff through `sessionStorage`. The payer's
 * "podstawa wymiaru" becomes the basis override (used as-is); gross pay goes
 * to the gross-income field, from which the calculator deducts 13,71%.
 * Mixing the two was the bug fixed here: a basis was treated as gross pay.
 */

export interface CalculatorPrefillPatch {
  /** Basis override in grosze; the calculator must not recompute it. */
  monthlyBasisGrosze?: number
  /** Gross monthly pay in PLN as typed into the income field. */
  incomePln?: string
  employmentType?: DocumentPrefill["employmentType"]
  childrenCount?: number
  paymentOption?: DocumentPrefill["paymentOption"]
}

export function serializeDocumentPrefill(prefill: DocumentPrefill): string {
  return JSON.stringify(documentPrefillSchema.parse(prefill))
}

export function parseDocumentPrefill(raw: string | null): CalculatorPrefillPatch | null {
  if (!raw) return null
  let json: unknown
  try {
    json = JSON.parse(raw)
  } catch {
    return null
  }
  const parsed = documentPrefillSchema.safeParse(json)
  if (!parsed.success) return null
  const data = parsed.data
  const patch: CalculatorPrefillPatch = {}
  if (data.monthlyBasisGrosze !== undefined) patch.monthlyBasisGrosze = data.monthlyBasisGrosze
  else if (data.grossMonthlyGrosze !== undefined) patch.incomePln = (data.grossMonthlyGrosze / 100).toFixed(2).replace(/\.00$/, "")
  if (data.employmentType) patch.employmentType = data.employmentType
  if (data.childrenCount) patch.childrenCount = data.childrenCount
  if (data.paymentOption) patch.paymentOption = data.paymentOption
  return patch
}

/** Reads and clears the stored prefill (one-shot). */
export function takeDocumentPrefill(storage: Pick<Storage, "getItem" | "removeItem">): CalculatorPrefillPatch | null {
  let raw: string | null = null
  try {
    raw = storage.getItem(DOCUMENT_PREFILL_STORAGE_KEY)
    storage.removeItem(DOCUMENT_PREFILL_STORAGE_KEY)
  } catch {
    return null
  }
  return parseDocumentPrefill(raw)
}
