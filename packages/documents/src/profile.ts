import type {
  CaseProfile,
  CaseProfileComparison,
  ProfileComparisonRow,
} from "@zpr/contracts/case-profile"
import { COMPARISON_DISCLAIMER } from "@zpr/contracts/case-profile"
import type {
  DocumentFactsMapping,
  DocumentExtraction,
  DocumentPrefill,
} from "@zpr/contracts/documents"
import { REVIEW_CONFIDENCE_THRESHOLD } from "@zpr/contracts/documents"
import type { AssessmentRequest } from "@zpr/contracts/engine"
import { formatGrosze } from "@zpr/domain/engine"

import { mapDocumentFacts } from "./mapping"

type ParentRole = "MOTHER" | "FATHER"

/**
 * Document ↔ case-profile integration.
 *
 * Two separate operations:
 * 1. `applyCaseProfile` fills facts the document does not carry, so the user
 *    does not have to answer the same questions twice. A value read from the
 *    document always wins.
 * 2. `compareDocumentWithProfile` compares only the facts both sides have and
 *    reports matches, gaps, differences and manual-review items. It never
 *    claims that the application is complete or accepted.
 */

const EMPLOYMENT_LABELS: Record<string, string> = {
  EMPLOYMENT: "Umowa o pracę",
  MANDATE: "Umowa zlecenia",
  SELF_EMPLOYMENT: "Działalność gospodarcza / B2B",
  OTHER: "Inna forma lub kilka tytułów",
  NONE: "Brak zatrudnienia i ubezpieczenia",
}

const PAYMENT_LABELS: Record<string, string> = {
  STANDARD_100_70: "100% macierzyński / 70% rodzicielski",
  FLAT_81_5: "81,5% za cały urlop",
}

function parentOf(
  request: AssessmentRequest | null | undefined,
  role: ParentRole
) {
  return request?.parents.find((parent) => parent.role === role)
}

function roleOf(request: AssessmentRequest | null | undefined): ParentRole {
  const role = request?.parents[0]?.role
  return role === "FATHER" ? "FATHER" : "MOTHER"
}

function basisLabel(parent: ReturnType<typeof parentOf>): string | undefined {
  if (!parent) return undefined
  if (parent.basis?.method === "KNOWN_BASIS") {
    return `${formatGrosze(parent.basis.monthlyBasisGrosze)} (podstawa z zaświadczenia)`
  }
  if (parent.basis?.method === "GROSS_MONTHLY") {
    return `${formatGrosze(parent.basis.grossMonthlyGrosze)} (wynagrodzenie brutto)`
  }
  return undefined
}

function prefillBasis(prefill: DocumentPrefill | null): string | undefined {
  if (!prefill) return undefined
  if (prefill.monthlyBasisGrosze) {
    return `${formatGrosze(prefill.monthlyBasisGrosze)} (podstawa z zaświadczenia)`
  }
  if (prefill.grossMonthlyGrosze) {
    return `${formatGrosze(prefill.grossMonthlyGrosze)} (wynagrodzenie brutto)`
  }
  return undefined
}

function addRow(
  target: ProfileComparisonRow[],
  label: string,
  profile: string | undefined,
  document: string | undefined
): "MISSING" | "MATCH" | "DIFF" | null {
  if (!profile) return null
  if (!document) {
    target.push({ label, profile, document: "—" })
    return "MISSING"
  }
  if (profile.trim() === document.trim()) {
    target.push({ label, profile, document })
    return "MATCH"
  }
  target.push({ label, profile, document })
  return "DIFF"
}

export function compareDocumentWithProfile(
  profile: CaseProfile,
  extraction: DocumentExtraction,
  mapping: DocumentFactsMapping = mapDocumentFacts(extraction)
): CaseProfileComparison {
  const profileRequest = profile.request
  const documentRequest = mapping.request
  const role = roleOf(documentRequest)
  const documentParent = parentOf(documentRequest, role)
  const profileParent = parentOf(profileRequest, role)

  const matches: ProfileComparisonRow[] = []
  const missingInDocument: ProfileComparisonRow[] = []
  const mismatches: ProfileComparisonRow[] = []

  const judge = (
    label: string,
    profileValue?: string,
    documentValue?: string
  ) => {
    const result = addRow([], label, profileValue, documentValue)
    if (result === "MATCH") {
      addRow(matches, label, profileValue, documentValue)
    } else if (result === "MISSING") {
      addRow(missingInDocument, label, profileValue, documentValue)
    } else if (result === "DIFF") {
      addRow(mismatches, label, profileValue, documentValue)
    }
  }

  const profileEvent = profileRequest.event
  const documentEvent = documentRequest?.event

  judge("Data porodu", profileEvent.birthDate, documentEvent?.birthDate)
  judge(
    "Przewidywany termin porodu",
    profileEvent.expectedDueDate,
    documentEvent?.expectedDueDate
  )
  judge(
    "Data przyjęcia dziecka",
    profileEvent.careTakingDate,
    documentEvent?.careTakingDate
  )
  judge(
    "Liczba dzieci",
    profileEvent.childrenCount?.toString(),
    documentEvent?.childrenCount?.toString() ??
      (mapping.prefill?.childrenCount !== undefined
        ? String(mapping.prefill.childrenCount)
        : undefined)
  )

  const prefillEmployment =
    mapping.prefill?.employmentType === "EMPLOYEE"
      ? "Umowa o pracę"
      : mapping.prefill?.employmentType === "CONTRACTOR"
        ? "Umowa zlecenia"
        : mapping.prefill?.employmentType === "BUSINESS"
          ? "Działalność gospodarcza / B2B"
          : undefined

  judge(
    "Forma zatrudnienia",
    profileParent?.insurance?.title
      ? EMPLOYMENT_LABELS[profileParent.insurance.title]
      : undefined,
    documentParent?.insurance?.title
      ? EMPLOYMENT_LABELS[documentParent.insurance.title]
      : prefillEmployment
  )

  judge(
    "Podstawa wymiaru",
    basisLabel(profileParent),
    basisLabel(documentParent) ?? prefillBasis(mapping.prefill)
  )

  judge(
    "Wariant wypłaty",
    profileRequest.plan?.paymentOption
      ? PAYMENT_LABELS[profileRequest.plan.paymentOption]
      : undefined,
    documentRequest?.plan?.paymentOption
      ? PAYMENT_LABELS[documentRequest.plan.paymentOption]
      : mapping.prefill?.paymentOption
        ? PAYMENT_LABELS[mapping.prefill.paymentOption]
        : undefined
  )

  judge(
    "Początek ubezpieczenia",
    profileParent?.insurance?.startDate,
    documentParent?.insurance?.startDate
  )

  const manualReview: string[] = []
  for (const field of extraction.fields) {
    if (field.value.trim() === "") continue
    if (field.needsReview || field.confidence < REVIEW_CONFIDENCE_THRESHOLD) {
      manualReview.push(
        `Pole „${field.label}” odczytano z pewnością ${Math.round(field.confidence * 100)}% — sprawdź je ręcznie.`
      )
    }
  }
  for (const finding of extraction.findings) {
    if (finding.severity === "ERROR") {
      manualReview.push(
        finding.legalBasis
          ? `${finding.message} (${finding.legalBasis})`
          : finding.message
      )
    }
  }
  if (extraction.legacyForm) {
    manualReview.push(
      "To formularz wycofany od 24.10.2026. Sprawdź, czy urząd lub płatnik przyjmie aktualny wzór."
    )
  }

  const suggestions: string[] = []
  for (const row of missingInDocument) {
    suggestions.push(`Uzupełnij w dokumencie: ${row.label.toLowerCase()}.`)
  }
  for (const row of mismatches) {
    suggestions.push(
      `Sprawdź rozbieżność w polu „${row.label}”: w sprawie „${row.profile}”, w dokumencie „${row.document}”.`
    )
  }
  if (mismatches.length === 0) {
    suggestions.push(
      "Dane, które można porównać, są zgodne z profilem sprawy. Sprawdź jeszcze pola niewidoczne w porównaniu i wymagane załączniki."
    )
  }
  suggestions.push(
    "Złóż dokument zgodnie z właściwym trybem (pracodawca, płatnik albo ZUS) i zachowaj potwierdzenie złożenia."
  )

  return {
    status: mismatches.length > 0 ? "DIFFERENCES" : "MATCH",
    matches,
    missingInDocument,
    mismatches,
    manualReview: [...new Set(manualReview)],
    suggestions: [...new Set(suggestions)],
    disclaimer: COMPARISON_DISCLAIMER,
  }
}

function withProvidedDocument(
  request: AssessmentRequest,
  extraction: DocumentExtraction
): AssessmentRequest {
  const provided = new Set(request.providedDocuments ?? [])
  provided.add(extraction.detectedForm.toUpperCase())
  return { ...request, providedDocuments: [...provided] }
}

/** Fills facts missing from the document with the case profile (document wins). */
export function applyCaseProfile(
  mapping: DocumentFactsMapping,
  profile: CaseProfile,
  extraction?: DocumentExtraction
): DocumentFactsMapping {
  const profileRequest = profile.request
  const notes = [...mapping.notes]
  const missing = [...mapping.missing]

  if (!mapping.request) {
    const request = extraction
      ? withProvidedDocument(profileRequest, extraction)
      : profileRequest
    return {
      request,
      prefill: mapping.prefill,
      missing: [],
      notes: [
        ...notes,
        "Dokument nie zawiera kompletu danych do analizy — użyto profilu sprawy z kreatora.",
      ],
    }
  }

  const request: AssessmentRequest = {
    ...mapping.request,
    event: { ...mapping.request.event },
    parents: mapping.request.parents.map((parent) => ({
      ...parent,
      insurance: parent.insurance ? { ...parent.insurance } : undefined,
      basis: parent.basis,
    })),
    ...(mapping.request.plan ? { plan: { ...mapping.request.plan } } : {}),
  }

  const filled: string[] = []

  if (
    !request.event.expectedDueDate &&
    profileRequest.event.expectedDueDate &&
    request.event.kind !== "ADOPTION" &&
    request.event.kind !== "FOSTER_CARE"
  ) {
    request.event.expectedDueDate = profileRequest.event.expectedDueDate
    filled.push("przewidywany termin porodu")
  }
  if (
    !request.event.birthDate &&
    request.event.kind === "BIRTH" &&
    profileRequest.event.birthDate
  ) {
    request.event.birthDate = profileRequest.event.birthDate
    filled.push("data porodu")
  }
  if (!request.event.careTakingDate && profileRequest.event.careTakingDate) {
    request.event.careTakingDate = profileRequest.event.careTakingDate
    filled.push("data przyjęcia dziecka")
  }
  if (!request.event.childBirthDate && profileRequest.event.childBirthDate) {
    request.event.childBirthDate = profileRequest.event.childBirthDate
  }
  if (
    !request.event.courtApplicationDate &&
    profileRequest.event.courtApplicationDate
  ) {
    request.event.courtApplicationDate =
      profileRequest.event.courtApplicationDate
  }
  if (
    !request.event.adoptionFinalDate &&
    profileRequest.event.adoptionFinalDate
  ) {
    request.event.adoptionFinalDate = profileRequest.event.adoptionFinalDate
  }
  if (
    request.event.childrenCount === undefined &&
    profileRequest.event.childrenCount !== undefined
  ) {
    request.event.childrenCount = profileRequest.event.childrenCount
    filled.push("liczba dzieci")
  }
  if (
    request.event.zaZyciem === undefined &&
    profileRequest.event.zaZyciem !== undefined
  ) {
    request.event.zaZyciem = profileRequest.event.zaZyciem
  }

  for (const parent of request.parents) {
    const source = parentOf(profileRequest, parent.role)
    if (!source) continue
    if (!parent.basis && source.basis) {
      parent.basis = source.basis
      filled.push(
        `podstawa wymiaru (${parent.role === "MOTHER" ? "matka" : "drugi rodzic"})`
      )
    }
    if (!parent.insurance && source.insurance) {
      parent.insurance = { ...source.insurance }
      filled.push("ubezpieczenie")
      continue
    }
    if (!parent.insurance || !source.insurance) continue
    const target = parent.insurance
    const from = source.insurance
    if (target.title === undefined && from.title !== undefined) {
      target.title = from.title
      filled.push("tytuł ubezpieczenia")
    }
    if (
      target.sicknessInsurance === undefined &&
      from.sicknessInsurance !== undefined
    ) {
      target.sicknessInsurance = from.sicknessInsurance
      filled.push("ubezpieczenie chorobowe")
    }
    if (target.startDate === undefined && from.startDate !== undefined) {
      target.startDate = from.startDate
      filled.push("początek ubezpieczenia")
    }
    if (target.endDate === undefined && from.endDate !== undefined) {
      target.endDate = from.endDate
      filled.push("koniec ubezpieczenia")
    }
    if (target.endReason === undefined && from.endReason !== undefined) {
      target.endReason = from.endReason
    }
    if (target.payerSize === undefined && from.payerSize !== undefined) {
      target.payerSize = from.payerSize
    }
    if (
      target.endedDuringPregnancy === undefined &&
      from.endedDuringPregnancy !== undefined
    ) {
      target.endedDuringPregnancy = from.endedDuringPregnancy
    }
    if (parent.birthYear === undefined && source.birthYear !== undefined) {
      parent.birthYear = source.birthYear
    }
  }

  if (!request.plan) {
    if (profileRequest.plan) {
      request.plan = { ...profileRequest.plan }
      filled.push("plan urlopów")
    }
  } else if (
    !request.plan.paymentOption &&
    profileRequest.plan?.paymentOption
  ) {
    request.plan.paymentOption = profileRequest.plan.paymentOption
    filled.push("wariant wypłaty")
  }

  if (
    extraction &&
    !request.providedDocuments?.includes(extraction.detectedForm.toUpperCase())
  ) {
    request.providedDocuments = [
      ...(request.providedDocuments ?? []),
      extraction.detectedForm.toUpperCase(),
    ]
  }

  const covered = new Set<string>()
  if (
    request.event.expectedDueDate ||
    request.event.birthDate ||
    request.event.careTakingDate
  ) {
    covered.add("eventDate")
  }
  if (request.parents.some((parent) => parent.basis))
    covered.add("monthlyBasisGrosze")
  if (request.parents.some((parent) => parent.insurance?.title))
    covered.add("employmentType")

  const stillMissing = missing.filter((item) => !covered.has(item.semanticKey))
  if (filled.length > 0) {
    notes.push(
      `Uzupełniono z profilu sprawy: ${[...new Set(filled)].join(", ")}. Wartości odczytane z dokumentu mają pierwszeństwo.`
    )
  }

  return {
    request,
    prefill: mapping.prefill,
    missing: stillMissing,
    notes,
  }
}
