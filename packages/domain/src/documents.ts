import type { BenefitCode } from "./eligibility"
import type { MissingFact } from "./case-facts"

/**
 * Document checklist **types** shared by the assistant's rendering
 * (`@zpr/ai` rules model). The single implementation of required documents,
 * routing and deadlines is the engine: `identifyRequiredDocuments` in
 * `./engine/documents.ts` (R1316 § 2–33, R322, forms by rule set version).
 *
 * @deprecated The former simplified `requiredDocuments()` / `paymentRouting()`
 * duplicated the engine and were removed. Use `engine.identifyRequiredDocuments`.
 */

export type SubmissionChannel = "EMPLOYER" | "ZUS" | "EMPLOYER_OR_ZUS"

export interface RequiredDocument {
  code: string
  name: string
  /** Who fills in or issues the document. */
  preparedBy: "YOU" | "EMPLOYER" | "PAYER" | "DOCTOR" | "CIVIL_REGISTRY"
  submitTo: SubmissionChannel
  when: string
  legalBasis: string
  caveat?: string
}

export interface PaymentRouting {
  payer: "EMPLOYER" | "ZUS" | "UNKNOWN"
  explanation: string
  channels: string[]
  legalBasis: string
}

export interface DocumentChecklist {
  benefit: BenefitCode
  routing: PaymentRouting
  documents: RequiredDocument[]
  missingFacts: MissingFact[]
  caveats: string[]
}
