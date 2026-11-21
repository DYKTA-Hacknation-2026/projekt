import type { AssessmentRequest } from "@zpr/contracts/engine"
import {
  moneyToGrosze,
  normalizeFieldValue,
  type DocumentExtraction,
  type DocumentFactsMapping,
  type DocumentPrefill,
  type ExtractedField,
  type SemanticKey,
} from "@zpr/contracts/documents"

/**
 * Confirmed document fields → engine facts (`AssessmentRequest`) and the
 * calculator prefill. Only fields that are confirmed, valid and carry a
 * `semanticKey` are used; informational fields (an amount of unknown nature)
 * never are.
 *
 * Basis: a payer's "podstawa wymiaru zasiłku" (Z-3/Z-3a, basisKind
 * NET_BASIS) is a KNOWN_BASIS used as-is (U art. 36, 43 — the payer already
 * deducted the contributions). Gross pay (basisKind GROSS) goes to
 * GROSS_MONTHLY and the engine deducts 13,71% itself. Both present → the
 * payer's basis wins and the gross value is reported as not used.
 */

const LABELS: Partial<Record<SemanticKey, string>> = {
  employmentType: "Tytuł ubezpieczenia",
  monthlyBasisGrosze: "Podstawa wymiaru zasiłku albo wynagrodzenie brutto",
  eventDate: "Data porodu albo przewidywany termin porodu",
}

function confirmedValues(fields: readonly ExtractedField[]): Map<SemanticKey, string> {
  const values = new Map<SemanticKey, string>()
  for (const field of fields) {
    if (!field.semanticKey || !field.confirmed) continue
    const normalized = normalizeFieldValue(field, field.value)
    if (!normalized) continue
    if (!values.has(field.semanticKey)) values.set(field.semanticKey, normalized)
  }
  return values
}

const TO_CALCULATOR_EMPLOYMENT = {
  EMPLOYMENT: "EMPLOYEE",
  MANDATE: "CONTRACTOR",
  SELF_EMPLOYMENT: "BUSINESS",
} as const

export function mapDocumentFacts(extraction: Pick<DocumentExtraction, "documentId" | "detectedForm" | "fields">, options: { asOf?: string } = {}): DocumentFactsMapping {
  const values = confirmedValues(extraction.fields)
  const notes: string[] = []
  const missing: DocumentFactsMapping["missing"] = []

  const basisGrosze = values.has("monthlyBasisGrosze") ? moneyToGrosze(values.get("monthlyBasisGrosze")!) : null
  const grossGrosze = values.has("grossMonthlyGrosze") ? moneyToGrosze(values.get("grossMonthlyGrosze")!) : null
  if (basisGrosze && grossGrosze) {
    notes.push("Dokument zawiera podstawę wymiaru i wynagrodzenie brutto — użyto podstawy wymiaru ustalonej przez płatnika.")
  }
  const unresolvedAmount = extraction.fields.find((field) => field.key === "kwotaNiejednoznaczna" && field.value !== "")
  if (unresolvedAmount && !basisGrosze && !grossGrosze) {
    notes.push("Kwota o niejasnym charakterze nie została przeniesiona. Wpisz ją jako podstawę wymiaru albo wynagrodzenie brutto.")
  }

  const title = values.get("employmentType") as keyof typeof TO_CALCULATOR_EMPLOYMENT | undefined
  const birthDate = values.get("eventDate")
  const dueDate = values.get("expectedDueDate")
  const benefit = values.get("benefitKind")
  const role = (values.get("parentRole") as "MOTHER" | "FATHER" | undefined) ?? (benefit === "PATERNITY" ? "FATHER" : "MOTHER")
  if (!values.has("parentRole")) notes.push(role === "FATHER" ? "Przyjęto, że dokument dotyczy ojca dziecka (zasiłek ojcowski)." : "Przyjęto, że dokument dotyczy matki dziecka.")

  if (!title) missing.push({ semanticKey: "employmentType", label: LABELS.employmentType! })
  if (!basisGrosze && !grossGrosze) missing.push({ semanticKey: "monthlyBasisGrosze", label: LABELS.monthlyBasisGrosze! })
  if (!birthDate && !dueDate) missing.push({ semanticKey: "eventDate", label: LABELS.eventDate! })

  const childrenRaw = values.get("childrenCount")
  const childrenCount = childrenRaw ? Math.min(10, Math.max(1, Number(childrenRaw))) : undefined
  const flatRate = values.get("flatRateApplication") === "true"

  let request: AssessmentRequest | null = null
  if (birthDate || dueDate) {
    const payerCount = values.get("payerSize")
    const sickness = values.get("sicknessInsurance") as "COMPULSORY" | "VOLUNTARY" | "NONE" | undefined
    const insurance: NonNullable<AssessmentRequest["parents"][number]["insurance"]> = {}
    if (title) insurance.title = title
    if (title === "EMPLOYMENT") insurance.sicknessInsurance = "COMPULSORY"
    else if (sickness) insurance.sicknessInsurance = sickness
    const start = values.get("insuranceStartDate")
    const end = values.get("insuranceEndDate")
    if (start) insurance.startDate = start
    if (end) {
      insurance.endDate = end
      if (title === "MANDATE") insurance.endReason = "MANDATE_CONTRACT_END"
    }
    if (payerCount) insurance.payerSize = Number(payerCount) > 20 ? "OVER_20" : "UP_TO_20"

    const parent: AssessmentRequest["parents"][number] = { role }
    if (Object.keys(insurance).length > 0) parent.insurance = insurance
    if (basisGrosze) parent.basis = { method: "KNOWN_BASIS", monthlyBasisGrosze: basisGrosze, origin: "PAYER_CERTIFICATE" }
    else if (grossGrosze) parent.basis = { method: "GROSS_MONTHLY", grossMonthlyGrosze: grossGrosze }
    const birthYear = values.get("birthDate")
    if (birthYear) parent.birthYear = Number(birthYear.slice(0, 4))

    const event: AssessmentRequest["event"] = birthDate
      ? { kind: "BIRTH", birthDate, ...(dueDate ? { expectedDueDate: dueDate } : {}) }
      : { kind: "PREGNANCY", expectedDueDate: dueDate }
    if (childrenCount) event.childrenCount = childrenCount

    request = {
      ...(options.asOf ? { asOf: options.asOf } : {}),
      event,
      parents: [parent],
      ...(flatRate ? { plan: { paymentOption: "FLAT_81_5" as const } } : {}),
      providedDocuments: [extraction.detectedForm.toUpperCase()],
    }
  }

  const prefillBase = {
    documentId: extraction.documentId,
    source: "DOCUMENT" as const,
    formCode: extraction.detectedForm,
  }
  const prefill: DocumentPrefill | null =
    basisGrosze || grossGrosze || birthDate || dueDate
      ? {
          ...prefillBase,
          ...(basisGrosze ? { monthlyBasisGrosze: basisGrosze } : grossGrosze ? { grossMonthlyGrosze: grossGrosze } : {}),
          ...(birthDate || dueDate ? { eventDate: birthDate ?? dueDate } : {}),
          ...(title ? { employmentType: TO_CALCULATOR_EMPLOYMENT[title] } : {}),
          ...(childrenCount ? { childrenCount } : {}),
          ...(flatRate ? { paymentOption: "FLAT_81_5" as const } : {}),
        }
      : null

  return { request, prefill, missing, notes }
}
