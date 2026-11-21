import { FACT_QUESTIONS, type BenefitCode, type CaseFacts, type FactKey, type MissingFact } from "@zpr/domain"
import {
  RULES,
  ratio,
  type Assessment,
  type AssessmentInput,
  type BenefitType,
  type Determination as EngineDetermination,
  type DocumentsReport,
  type EligibilityReport,
  type EligibilityStatus,
  type LeavePlanInput,
  type MissingEvidence,
  type ParentInput,
} from "@zpr/domain/engine"


/**
 * Maps the conversational case facts (one parent's view) onto the engine
 * input, and the engine output back onto the shapes the tool cards and the
 * offline composer render. No rule lives here — only translation.
 */

export function plnToExactGrosze(pln: number): number {
  return Number(ratio(pln.toString()).mul(100).round("HALF_UP"))
}

export interface HouseholdOptions {
  asOf: string
  grossMonthlyIncomePln?: number | null
  plan?: LeavePlanInput
  /** Add the other parent with the same income and title (simplified what-if, disclosed). */
  secondParentLikeFirst?: boolean
  /** Use "employee" when the title is unknown (what-if estimate, disclosed). */
  assumeEmployeeIfUnknown?: boolean
  /** Due date used only when the user gave none; amounts do not depend on the calendar date (disclosed). */
  nominalDueDate?: string
}

export interface HouseholdInput {
  input: AssessmentInput
  assumptions: string[]
  role: "MOTHER" | "FATHER"
  /** False when the user did not say which parent is asking (the role defaults to mother). */
  roleKnown: boolean
}

export function householdInput(facts: CaseFacts, options: HouseholdOptions): HouseholdInput {
  const assumptions: string[] = []
  const role = facts.parentRole ?? "MOTHER"
  let title = facts.employmentType
  if (!title && options.assumeEmployeeIfUnknown) {
    title = "EMPLOYMENT"
    assumptions.push("Nie podano tytułu ubezpieczenia — szacunek liczony jak dla umowy o pracę.")
  }
  const basis: ParentInput["basis"] =
    options.grossMonthlyIncomePln && options.grossMonthlyIncomePln > 0
      ? { method: "GROSS_MONTHLY", grossMonthlyGrosze: plnToExactGrosze(options.grossMonthlyIncomePln) }
      : undefined
  const insurance: ParentInput["insurance"] = {
    title,
    sicknessInsurance: facts.sicknessInsurance,
    startDate: facts.insuranceStartDate,
    payerSize: facts.payerSize,
    contributionDebt: facts.contributionArrears === undefined ? undefined : { exists: facts.contributionArrears },
  }
  const asker: ParentInput = { role, insurance, basis }
  const parents: ParentInput[] = [asker]
  if (options.secondParentLikeFirst) {
    parents.push({ role: role === "MOTHER" ? "FATHER" : "MOTHER", insurance: { title: title ?? "EMPLOYMENT" }, basis })
    assumptions.push("Dla drugiego rodzica przyjęto ten sam tytuł ubezpieczenia i ten sam dochód (uproszczenie).")
  }
  const kind = facts.familyEvent ?? (facts.eventDate ? "BIRTH" : "PREGNANCY")
  const adoption = kind === "ADOPTION" || kind === "FOSTER_CARE"
  const nominalDate =
    !adoption && !facts.expectedDueDate && !facts.eventDate ? options.nominalDueDate : undefined
  if (nominalDate) {
    assumptions.push(
      `Nie podano daty porodu — okresy liczono od umownej daty ${nominalDate}. Kwoty nie zależą od daty kalendarzowej, ale terminy i okresy są orientacyjne.`
    )
  }
  return {
    role,
    roleKnown: facts.parentRole !== undefined,
    assumptions,
    input: {
      asOf: options.asOf,
      event: {
        kind,
        expectedDueDate: facts.expectedDueDate ?? nominalDate,
        birthDate: kind === "BIRTH" ? facts.eventDate : undefined,
        careTakingDate: adoption ? facts.eventDate : undefined,
        childrenCount: facts.childrenCount,
        zaZyciem: facts.hasZaZyciem,
        professionalFosterFamily: facts.professionalFosterFamily,
      },
      parents,
      plan: options.plan,
    },
  }
}

/* ------------------------------------------------------------------ views */

const LEGACY_BENEFITS: Record<BenefitCode, BenefitType[]> = {
  MATERNITY_ALLOWANCE: ["MATERNITY", "MATERNITY_TERMS", "MATERNITY_EQUIVALENT", "SUPPLEMENTARY_MATERNITY", "STILLBIRTH_FUNERAL_ALLOWANCE"],
  PARENTAL_LEAVE_BENEFIT: ["PARENTAL"],
  PATERNITY_BENEFIT: ["PATERNITY"],
  SICKNESS_IN_PREGNANCY: ["SICKNESS_IN_PREGNANCY", "EMPLOYER_SICK_PAY", "REHABILITATION"],
}

const ENGINE_TO_FACT: Record<string, FactKey> = {
  "insurance.title": "employmentType",
  "insurance.sicknessInsurance": "sicknessInsurance",
  "insurance.startDate": "insuranceStartDate",
  "insurance.contributionDebt": "contributionArrears",
  "insurance.payerSize": "payerSize",
  "event.expectedDueDate": "expectedDueDate",
  "event.birthDate": "eventDate",
  "event.careTakingDate": "eventDate",
}

function toMissingFact(key: string, fallback?: MissingEvidence): MissingFact {
  const factKey = ENGINE_TO_FACT[key]
  const known = factKey ? (FACT_QUESTIONS as Partial<Record<FactKey, MissingFact>>)[factKey] : undefined
  if (known) return known
  return {
    key: (factKey ?? key) as FactKey,
    question: fallback?.question ?? key,
    reason: fallback?.why ?? "",
  }
}

const STATUS_VIEW: Record<EligibilityStatus, "ELIGIBLE" | "NOT_ELIGIBLE" | "INDETERMINATE" | "NEEDS_INPUT"> = {
  ELIGIBLE: "ELIGIBLE",
  CONDITIONAL: "ELIGIBLE",
  NOT_ELIGIBLE: "NOT_ELIGIBLE",
  NEEDS_INPUT: "NEEDS_INPUT",
  MANUAL_REVIEW: "INDETERMINATE",
}

function citation(ruleId: string): string {
  const rule = (RULES as Record<string, { sources: { code: string; locator: string }[] }>)[ruleId]
  return rule ? rule.sources.map((source) => `${source.code} ${source.locator}`).join("; ") : ruleId
}

export interface DeterminationView {
  benefit: BenefitCode
  engineBenefit: BenefitType
  parent: "MOTHER" | "FATHER"
  label: string
  status: "ELIGIBLE" | "NOT_ELIGIBLE" | "INDETERMINATE" | "NEEDS_INPUT"
  engineStatus: EligibilityStatus
  reasons: { ruleId: string; text: string; legalBasis: string }[]
  missingFacts: MissingFact[]
  caveats: string[]
  legalBasis: string[]
  payer: EngineDetermination["payer"]
}

export interface EligibilityView {
  kind: "PRELIMINARY_GUIDANCE"
  asOf: string
  determinations: DeterminationView[]
  nextQuestion: MissingFact | null
  disclaimer: string
}

/** The engine report in the shape of the eligibility card (one row per legacy benefit code and parent). */
export function eligibilityView(
  report: EligibilityReport,
  role: "MOTHER" | "FATHER",
  benefits: readonly BenefitCode[] | undefined,
  roleKnown = true
): EligibilityView {
  const wanted = benefits?.length ? benefits : (Object.keys(LEGACY_BENEFITS) as BenefitCode[])
  const missingByKey = new Map(report.missingEvidence.map((item) => [`${item.parent ?? "-"}:${item.key}`, item]))
  const determinations: DeterminationView[] = []
  for (const code of wanted) {
    const matches = report.eligibility.determinations.filter((d) => LEGACY_BENEFITS[code].includes(d.benefit))
    if (code === "PATERNITY_BENEFIT" && !roleKnown) {
      // Never guess which parent is asking.
      determinations.push({
        benefit: code,
        engineBenefit: "PATERNITY",
        parent: role,
        label: "Zasiłek macierzyński za urlop ojcowski",
        status: "NEEDS_INPUT",
        engineStatus: "NEEDS_INPUT",
        reasons: [],
        missingFacts: [FACT_QUESTIONS.parentRole],
        caveats: [],
        legalBasis: [citation("LR-133")],
        payer: "UNKNOWN",
      })
      continue
    }
    if (code === "PATERNITY_BENEFIT" && role === "MOTHER" && matches.length === 0) {
      determinations.push({
        benefit: code,
        engineBenefit: "PATERNITY",
        parent: "MOTHER",
        label: "Zasiłek macierzyński za urlop ojcowski",
        status: "NOT_ELIGIBLE",
        engineStatus: "NOT_ELIGIBLE",
        reasons: [{ ruleId: "LR-133", text: "Urlop ojcowski i zasiłek za jego okres przysługują ojcu dziecka.", legalBasis: citation("LR-133") }],
        missingFacts: [],
        caveats: [],
        legalBasis: [citation("LR-133")],
        payer: "NONE",
      })
      continue
    }
    for (const d of matches) {
      const missingFacts = d.missingEvidence.map((key) => toMissingFact(key, missingByKey.get(`${d.parent}:${key}`) ?? missingByKey.get(`-:${key}`)))
      if (missingFacts.length === 0) {
        for (const item of report.missingEvidence) {
          if ((item.parent === undefined || item.parent === d.parent) && item.affects.includes(d.benefit)) {
            missingFacts.push(toMissingFact(item.key, item))
          }
        }
      }
      determinations.push({
        benefit: code,
        engineBenefit: d.benefit,
        parent: d.parent,
        label: d.parent === role || d.benefit === "PATERNITY" ? d.label : `${d.label} — drugi rodzic`,
        status: STATUS_VIEW[d.status],
        engineStatus: d.status,
        reasons: d.reasons.map((reason) => ({ ruleId: reason.ruleId, text: reason.text, legalBasis: citation(reason.ruleId) })),
        missingFacts,
        caveats: d.conditions,
        legalBasis: [...new Set(d.reasons.map((reason) => citation(reason.ruleId)))],
        payer: d.payer,
      })
    }
  }
  const nextQuestion =
    determinations.find((d) => d.status === "NEEDS_INPUT")?.missingFacts[0] ??
    determinations.flatMap((d) => d.missingFacts)[0] ??
    (report.missingEvidence[0] ? toMissingFact(report.missingEvidence[0].key, report.missingEvidence[0]) : null)
  return { kind: "PRELIMINARY_GUIDANCE", asOf: report.asOf, determinations, nextQuestion, disclaimer: report.disclaimer }
}

const CHANNELS = {
  ZUS: ["portal eZUS (PUE ZUS) — najwygodniej elektronicznie", "dowolna placówka ZUS (osobiście lub pocztą)"],
  EMPLOYER: ["dział kadr lub płac pracodawcy (zleceniodawcy)"],
  UNKNOWN: ["pracodawca (zleceniodawca)", "portal eZUS (PUE ZUS)"],
} as const

export function documentsView(report: DocumentsReport, role: "MOTHER" | "FATHER", benefit: BenefitCode) {
  const engineBenefits = LEGACY_BENEFITS[benefit]
  const documents = report.documents
    .filter((doc) => doc.benefits.some((b) => engineBenefits.includes(b)) && (doc.parent === role || doc.parent === "BOTH"))
    .map((doc) => ({
      code: doc.code,
      name: doc.name,
      preparedBy: doc.preparedBy,
      submitTo: doc.submitTo,
      when: doc.when,
      dueDate: doc.dueDate ?? null,
      legalBasis: doc.legalBasis,
      caveat: doc.note,
    }))
  const route = report.routing.find((entry) => entry.parent === role)
  const payer = route?.payer === "EMPLOYER" || route?.payer === "ZUS" ? route.payer : "UNKNOWN"
  return {
    benefit,
    formsVersion: report.formsVersion,
    routing: {
      payer,
      explanation: route?.explanation ?? "Zasiłek wypłaca płatnik zgłaszający ponad 20 ubezpieczonych; w przeciwnym razie ZUS.",
      channels: [...CHANNELS[payer]],
      legalBasis: "U art. 61 ust. 1–2; P s. 23",
    },
    documents,
    missingFacts: report.missingEvidence
      .filter((item) => item.parent === undefined || item.parent === role)
      .slice(0, 3)
      .map((item) => toMissingFact(item.key, item)),
    caveats: report.notes,
  }
}

export function engineMeta(report: Pick<Assessment, "status" | "ruleSet" | "appliedRules" | "assumptions" | "warnings" | "unsupported" | "inputHash" | "engineVersion">) {
  return {
    assessmentStatus: report.status,
    ruleSetVersion: report.ruleSet.version,
    engineVersion: report.engineVersion,
    inputHash: report.inputHash,
    appliedRules: report.appliedRules.map((rule) => ({ ruleId: rule.ruleId, sources: rule.sources })),
    assumptions: report.assumptions,
    warnings: report.warnings.map((warning) => warning.text),
    unsupported: report.unsupported.map((item) => item.text),
  }
}
