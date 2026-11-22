import type { EvidenceSource } from "@zpr/contracts/assistant"
import type {
  DeadlineReport,
  Determination,
  DocumentChecklist,
  EligibilityAssessment,
} from "@zpr/domain"

import type { IntentClassification } from "../intent"
import { locator, type TurnState } from "../turn"

/**
 * Composes the offline answer from this turn's tool outputs and retrieved
 * passages only. Every number in the text is copied from a tool result or a
 * quoted passage, so the grounding guard passes by construction.
 */

const STATUS_LABELS: Record<Determination["status"], string> = {
  ELIGIBLE: "wstępnie tak",
  NOT_ELIGIBLE: "wstępnie nie",
  INDETERMINATE: "nie da się tego jednoznacznie ocenić",
  NEEDS_INPUT: "potrzebuję więcej informacji",
}

const PREPARED_BY: Record<string, string> = {
  YOU: "składasz ty",
  EMPLOYER: "wystawia pracodawca",
  PAYER: "wystawia płatnik składek",
  DOCTOR: "wystawia lekarz",
  CIVIL_REGISTRY: "z urzędu stanu cywilnego",
  OTHER_PARENT: "składa drugi rodzic",
  HOSPITAL: "wystawia szpital",
  COURT: "wydaje sąd",
  ZUS: "wydaje ZUS",
}

function stems(text: string): string[] {
  return (text.toLowerCase().match(/[a-ząćęłńóśźż]{4,}/g) ?? []).map((word) =>
    word.slice(0, 5)
  )
}

/** Picks the passage sentences that best match the question. */
export function bestExcerpt(content: string, question: string, maxLength = 320): string {
  const clean = content
    .replace(/<!--.*?-->/g, " ")
    .replace(/^#+\s.*$/gm, " ")
    // Markdown tables: drop separator rows, turn cells into "a — b — c".
    .replace(/^\s*\|?\s*:?-{3,}.*$/gm, " ")
    .replace(/^\s*\|(.*)\|\s*$/gm, (_, row: string) => `${row.split("|").map((cell) => cell.trim()).filter(Boolean).join(" — ")}.`)
    .replace(/\s+/g, " ")
    .trim()
  // Split on sentence ends followed by a capital letter, then glue short
  // fragments ("Art. 180 § 1.") to the following sentence.
  const raw = clean.split(/(?<=[.!?])\s+(?=[A-ZĄĆĘŁŃÓŚŹŻ„])/)
  const sentences: string[] = []
  for (const piece of raw) {
    const previous = sentences.at(-1)
    if (previous !== undefined && previous.length < 40) {
      sentences[sentences.length - 1] = `${previous} ${piece}`
    } else {
      sentences.push(piece)
    }
  }
  const wanted = new Set(stems(question))
  const scored = sentences.map((sentence, index) => ({
    sentence,
    index,
    score: stems(sentence).filter((stem) => wanted.has(stem)).length,
  }))
  const ranked = [...scored].sort((a, b) => b.score - a.score || a.index - b.index)
  const picked: typeof scored = []
  let length = 0
  for (const candidate of ranked) {
    if (picked.length >= 2) break
    if (length + candidate.sentence.length > maxLength && picked.length > 0) continue
    picked.push(candidate)
    length += candidate.sentence.length
  }
  const text = picked
    .sort((a, b) => a.index - b.index)
    .map((item) => item.sentence)
    .join(" ")
    // Dangling enumeration markers ("… 2." / "§ 2.") from the next provision.
    .replace(/\s+(§\s*)?\d+[a-z¹²³⁴⁵⁶⁷⁸⁹⁰]*\.?$/u, "")
    .replace(/^(\d+\.|§\s*\d+\.)\s+/, "")
  return text.length > maxLength ? `${text.slice(0, maxLength - 1).trimEnd()}…` : text
}

type Output<T> = T & { status: string }

interface CalcOutput {
  status: string
  missing?: { question: string }[]
  maternityWeeks?: number
  motherParentalWeeks?: number
  secondParentWeeks?: number
  paternityDays?: number
  lines?: { label: string; weeks: number; days: number; ratePercent: number; amountFormatted: string }[]
  totalFormatted?: string
  grossMonthlyIncomePln?: number
  incomeSource?: string
}

interface CompareOutput {
  status: string
  amountsAvailable?: boolean
  missing?: { question: string }[]
  outcomes?: {
    name: string
    maternityWeeks: number
    motherParentalWeeks: number
    secondParentWeeks: number
    paternityDays: number
    totalFormatted: string | null
    motherLeaveEnd: string | null
  }[]
  notes?: string[]
}

interface TimelineOutput {
  status: string
  missing?: { question: string }[]
  milestones?: { title: string; dateFormatted: string; endDateFormatted: string | null }[]
}

interface ProfileOutput {
  status: string
  message: string
  profile: { facts: Record<string, unknown>; caseNumber: string | null } | null
}

const FACT_LABELS: Record<string, (value: unknown) => string | null> = {
  employmentType: (value) =>
    ({
      EMPLOYMENT: "umowa o pracę",
      MANDATE: "umowa zlecenia",
      SELF_EMPLOYMENT: "własna działalność",
      OTHER: "inny tytuł",
      NONE: "brak tytułu ubezpieczenia",
    })[String(value)] ?? null,
  sicknessInsurance: (value) =>
    ({
      COMPULSORY: "ubezpieczenie chorobowe obowiązkowe",
      VOLUNTARY: "dobrowolne ubezpieczenie chorobowe",
      NONE: "bez ubezpieczenia chorobowego",
    })[String(value)] ?? null,
  familyEvent: (value) =>
    ({
      PREGNANCY: "ciąża",
      BIRTH: "dziecko już urodzone",
      ADOPTION: "adopcja",
      FOSTER_CARE: "rodzina zastępcza",
    })[String(value)] ?? null,
  expectedDueDate: (value) => `przewidywany termin porodu ${String(value)}`,
  eventDate: (value) => `data porodu/przyjęcia ${String(value)}`,
  childrenCount: (value) => `liczba dzieci: ${String(value)}`,
}

function factSummary(facts: Record<string, unknown>): string {
  return Object.entries(facts)
    .map(([key, value]) => FACT_LABELS[key]?.(value) ?? null)
    .filter(Boolean)
    .join(", ")
}

function eligibilitySection(assessment: EligibilityAssessment & { periodUnsupported?: { code: string; text: string } | null }, factsUsed: Record<string, unknown>): string[] {
  if (assessment.periodUnsupported) {
    return [
      "**Nie mogę ocenić tej sprawy**",
      "Nie mamy przepisów obowiązujących w dniu tego zdarzenia. Aplikacja ma dane prawne dopiero od 1.07.2026, więc nie oceniam tej sprawy według ówczesnego prawa. To nie jest decyzja ZUS, przyznanie ani odmowa świadczenia. Sprawdź uprawnienia bezpośrednio w ZUS.",
    ]
  }
  const lines = ["**Wstępna ocena (nie jest to decyzja ZUS)**"]
  const summary = factSummary(factsUsed)
  if (summary) lines.push(`Na podstawie tego, co wiem: ${summary}.`)
  for (const item of assessment.determinations) {
    const reason = item.reasons[0]?.text
    lines.push(
      `- **${item.label}**: ${STATUS_LABELS[item.status]}.${reason ? ` ${reason}` : ""}${item.legalBasis.length ? ` (${item.legalBasis.join("; ")})` : ""}`
    )
  }
  const caveats = [...new Set(assessment.determinations.flatMap((item) => item.caveats))].slice(0, 3)
  for (const caveat of caveats) lines.push(`- Zastrzeżenie: ${caveat}`)
  return lines
}

function calculationSection(output: CalcOutput): string[] {
  if (output.status !== "OK" || !output.lines) return []
  const lines = ["**Szacunek z kalkulatora**"]
  lines.push(
    `Przyjęte wynagrodzenie brutto: ${output.grossMonthlyIncomePln} zł miesięcznie (${output.incomeSource === "PROFILE" ? "z profilu" : "z rozmowy"}).`
  )
  for (const line of output.lines) {
    const period = line.weeks > 0 ? `${line.weeks} tyg.` : `${line.days} dni`
    lines.push(`- ${line.label}: ${period}, ${line.ratePercent}% podstawy — ${line.amountFormatted}`)
  }
  if (output.totalFormatted) lines.push(`- Łącznie: **${output.totalFormatted}** brutto`)
  lines.push("Kwoty są szacunkiem demonstracyjnym — parametry minimalnej kwoty i zaokrągleń czekają na zatwierdzenie.")
  return lines
}

function comparisonSection(output: CompareOutput): string[] {
  if (!output.outcomes?.length) return []
  const lines = ["**Porównanie wariantów podziału urlopu**"]
  for (const outcome of output.outcomes) {
    const amount = outcome.totalFormatted ? `, łącznie ${outcome.totalFormatted} brutto` : ""
    const end = outcome.motherLeaveEnd ? `, urlop mamy do ${outcome.motherLeaveEnd}` : ""
    lines.push(
      `- **${outcome.name}**: macierzyński ${outcome.maternityWeeks} tyg., rodzicielski mamy ${outcome.motherParentalWeeks} tyg., drugiego rodzica ${outcome.secondParentWeeks} tyg., ojcowski ${outcome.paternityDays} dni${end}${amount}.`
    )
  }
  for (const note of output.notes ?? []) lines.push(`- ${note}`)
  return lines
}

function documentsSection(output: Output<DocumentChecklist>): string[] {
  const lines = ["**Dokumenty**"]
  for (const document of output.documents) {
    lines.push(
      `- ${document.name} — ${PREPARED_BY[document.preparedBy] ?? ""}. ${document.when}${document.caveat ? ` Uwaga: ${document.caveat}` : ""}`
    )
  }
  lines.push("", "**Gdzie złożyć**", output.routing.explanation)
  for (const channel of output.routing.channels) lines.push(`- ${channel}`)
  return lines
}

type DeadlineOutput = Omit<DeadlineReport, "deadlines"> & {
  status: string
  deadlines: { title: string; rule: string; dateFormatted: string | null; legalBasis: string }[]
}

function deadlinesSection(output: DeadlineOutput): string[] {
  const lines = ["**Terminy**"]
  for (const deadline of output.deadlines.slice(0, 7)) {
    lines.push(
      `- ${deadline.title}: ${deadline.dateFormatted ? `**${deadline.dateFormatted}** — ` : ""}${deadline.rule} (${deadline.legalBasis})`
    )
  }
  for (const caveat of output.caveats) lines.push(`- ${caveat}`)
  return lines
}

function timelineSection(output: TimelineOutput): string[] {
  if (output.status !== "OK" || !output.milestones) return []
  const lines = ["**Plan urlopów (oś czasu)**"]
  for (const milestone of output.milestones.slice(0, 8)) {
    lines.push(
      `- ${milestone.dateFormatted}${milestone.endDateFormatted ? ` – ${milestone.endDateFormatted}` : ""}: ${milestone.title}`
    )
  }
  return lines
}

/** Orders passages by overlap with the question, then by retrieval relevance. */
function rankForQuestion(sources: EvidenceSource[], turn: TurnState, question: string): EvidenceSource[] {
  const wanted = new Set(stems(question))
  const score = (source: EvidenceSource) => {
    const text = `${source.headingPath ?? ""} ${turn.entry(source.ref)?.content ?? ""}`
    const overlap = new Set(stems(text).filter((stem) => wanted.has(stem))).size
    return overlap + source.relevance
  }
  return [...sources].sort((a, b) => score(b) - score(a))
}

function evidenceSection(sources: EvidenceSource[], turn: TurnState, question: string): string[] {
  const lines = ["**Co mówią źródła**"]
  for (const source of rankForQuestion(sources, turn, question).slice(0, 3)) {
    if (source.citationOnly) {
      lines.push(`- Zob. ${source.documentTitle}, ${locator(source)} [${source.ref}] (materiał tylko do cytowania).`)
      continue
    }
    const content = turn.entry(source.ref)?.content ?? source.quote ?? ""
    lines.push(`- „${bestExcerpt(content, question)}” [${source.ref}] — ${locator(source)}`)
  }
  return lines
}

export function composeAnswer(input: {
  turn: TurnState
  intent: IntentClassification
  question: string
  injectionSuspected: boolean
}): string {
  const { turn, intent, question } = input
  const sections: string[][] = []
  const questions: string[] = []

  if (intent.sensitive) {
    sections.push([
      "Bardzo mi przykro, że przez to przechodzisz. Krótko wyjaśnię, co wynika z przepisów — możesz wrócić do tego w swoim tempie.",
    ])
  }
  if (input.injectionSuspected) {
    sections.push([
      "Nie mogę zmieniać zasad, na których działam, ani potwierdzać uprawnień bez sprawdzenia w regułach i źródłach. Poniżej jest to, co faktycznie z nich wynika.",
    ])
  }

  if (intent.outOfScope && turn.toolCalls.length === 0) {
    return [
      "Pomagam w sprawach zasiłków i urlopów związanych z rodzicielstwem (ZUS): zasiłek macierzyński, urlop macierzyński, rodzicielski i ojcowski, L4 w ciąży, dokumenty i terminy.",
      "To pytanie wykracza poza ten zakres, więc nie chcę udzielać na nie odpowiedzi. Zapytaj mnie np. „Czy przysługuje mi zasiłek macierzyński?” albo „Jakie dokumenty muszę złożyć?”.",
    ].join("\n\n")
  }

  const [profile] = turn.outputsOf<ProfileOutput>("getUserInsuranceProfile")
  if (profile) {
    sections.push(
      profile.status === "AVAILABLE" && profile.profile
        ? [`**Twoje dane z kreatora (dane demonstracyjne)**`, factSummary(profile.profile.facts) || "Profil nie zawiera jeszcze danych o ubezpieczeniu."]
        : [profile.message]
    )
  }

  const [eligibility] = turn.outputsOf<{ status: string; assessment: EligibilityAssessment; factsUsed: Record<string, unknown>; conflicts: { key: string }[] }>("checkBenefitEligibility")
  if (eligibility?.assessment) {
    sections.push(eligibilitySection(eligibility.assessment, eligibility.factsUsed))
    if (eligibility.conflicts.length > 0) {
      sections.push([`W rozmowie podano inne dane niż w profilu (${eligibility.conflicts.map((conflict) => conflict.key).join(", ")}). Użyłem danych z rozmowy.`])
    }
    if (eligibility.assessment.nextQuestion) questions.push(eligibility.assessment.nextQuestion.question)
  }

  const [calculation] = turn.outputsOf<CalcOutput>("calculateBenefit")
  if (calculation) {
    sections.push(calculationSection(calculation))
    for (const missing of calculation.missing ?? []) questions.push(missing.question)
  }

  const [comparison] = turn.outputsOf<CompareOutput>("compareLeaveScenarios")
  if (comparison) {
    sections.push(comparisonSection(comparison))
    for (const missing of comparison.missing ?? []) questions.push(missing.question)
  }

  const [documents] = turn.outputsOf<Output<DocumentChecklist>>("getRequiredDocuments")
  if (documents?.documents) {
    sections.push(documentsSection(documents))
    for (const missing of documents.missingFacts) questions.push(missing.question)
  }

  const [deadlines] = turn.outputsOf<DeadlineOutput>("getRelevantDeadlines")
  if (deadlines?.deadlines) {
    sections.push(deadlinesSection(deadlines))
    for (const missing of deadlines.missingFacts) questions.push(missing.question)
  }

  const [timeline] = turn.outputsOf<TimelineOutput>("getBenefitTimeline")
  if (timeline) {
    sections.push(timelineSection(timeline))
    for (const missing of timeline.missing ?? []) questions.push(missing.question)
  }

  const sources = turn.sources()
  if (sources.length > 0) {
    sections.push(evidenceSection(sources, turn, question))
  } else if (intent.legal) {
    const failed = turn.toolCalls.some((call) => call.toolName === "searchKnowledgeBase" && call.status === "FAILED")
    sections.push([
      failed
        ? "Nie udało mi się teraz połączyć z bazą wiedzy, więc nie podam podstawy prawnej z pamięci. Spróbuj ponownie za chwilę."
        : "Nie znalazłem w bazie wiedzy fragmentu, który wiarygodnie odpowiada na to pytanie, więc nie będę zgadywać. Sprawdź informacje na zus.pl, w portalu eZUS albo zapytaj na infolinii ZUS.",
    ])
  }

  const meaningful = sections.filter((section) => section.length > 0)
  if (meaningful.length === 0) {
    meaningful.push([
      "Nie mam wystarczających informacji, aby odpowiedzieć na to pytanie na podstawie źródeł.",
    ])
  }

  const followUp = questions.find(Boolean)
  const parts = meaningful.map((section) => section.join("\n"))
  if (followUp) parts.push(`**Pytanie do ciebie:** ${followUp}`)
  parts.push(
    "_To informacja na podstawie źródeł i reguł, nie decyzja ZUS. Dane i wyliczenia w tej aplikacji są demonstracyjne._"
  )
  return parts.join("\n\n")
}
