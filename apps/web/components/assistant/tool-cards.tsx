"use client"

import Link from "next/link"
import type { ReactNode } from "react"
import {
  AlertTriangle,
  Calculator,
  CalendarClock,
  CheckCircle2,
  CircleHelp,
  FileText,
  GitCompareArrows,
  Loader2,
  Route,
  Search,
  UserRound,
  XCircle,
} from "lucide-react"

import { Badge } from "@workspace/ui/components/badge"
import { cn } from "@workspace/ui/lib/utils"

/**
 * Structured cards rendered from deterministic tool results — the numbers
 * come from the calculation engine, never from the model's text.
 */

export interface ToolPart {
  type: string
  toolName?: string
  toolCallId: string
  state: "input-streaming" | "input-available" | "output-available" | "output-error" | string
  input?: unknown
  output?: unknown
  errorText?: string
}

export const TOOL_LABELS: Record<string, string> = {
  searchKnowledgeBase: "Wyszukiwanie w bazie wiedzy",
  getUserInsuranceProfile: "Dane z profilu",
  checkBenefitEligibility: "Wstępna ocena uprawnień",
  calculateBenefit: "Kalkulator zasiłku",
  compareLeaveScenarios: "Porównanie wariantów",
  getRequiredDocuments: "Wymagane dokumenty",
  getRelevantDeadlines: "Terminy",
  getBenefitTimeline: "Oś czasu urlopów",
}

const PENDING_LABELS: Record<string, string> = {
  searchKnowledgeBase: "Szukam w źródłach…",
  getUserInsuranceProfile: "Sprawdzam dane z kreatora…",
  checkBenefitEligibility: "Sprawdzam reguły uprawnień…",
  calculateBenefit: "Liczę w kalkulatorze…",
  compareLeaveScenarios: "Porównuję warianty…",
  getRequiredDocuments: "Zbieram listę dokumentów…",
  getRelevantDeadlines: "Wyliczam terminy…",
  getBenefitTimeline: "Układam oś czasu…",
}

export function toolNameOf(part: ToolPart): string {
  return part.toolName ?? part.type.replace(/^tool-/, "")
}

function CardShell({
  icon,
  title,
  badge,
  children,
  footer,
}: {
  icon: ReactNode
  title: string
  badge?: ReactNode
  children: ReactNode
  footer?: ReactNode
}) {
  return (
    <section className="rounded-xl border border-border/80 bg-background/60 text-sm" aria-label={title}>
      <header className="flex flex-wrap items-center gap-2 border-b border-border/70 px-3.5 py-2.5">
        <span aria-hidden="true" className="text-primary">{icon}</span>
        <h3 className="font-medium">{title}</h3>
        {badge && <span className="ml-auto">{badge}</span>}
      </header>
      <div className="space-y-2.5 px-3.5 py-3">{children}</div>
      {footer && <footer className="border-t border-border/70 px-3.5 py-2 text-xs text-muted-foreground">{footer}</footer>}
    </section>
  )
}

function MissingNote({ items }: { items?: { question: string }[] }) {
  if (!items?.length) return null
  return (
    <p className="flex items-start gap-2 rounded-lg bg-info/10 px-3 py-2 text-xs">
      <CircleHelp aria-hidden="true" className="mt-0.5 size-3.5 shrink-0 text-info" />
      <span>Brakuje informacji: {items[0]!.question}</span>
    </p>
  )
}

const STATUS: Record<string, { label: string; variant: "success" | "destructive" | "warning" | "info"; icon: ReactNode }> = {
  ELIGIBLE: { label: "Wstępnie tak", variant: "success", icon: <CheckCircle2 aria-hidden="true" /> },
  NOT_ELIGIBLE: { label: "Wstępnie nie", variant: "destructive", icon: <XCircle aria-hidden="true" /> },
  INDETERMINATE: { label: "Nie da się ocenić", variant: "warning", icon: <AlertTriangle aria-hidden="true" /> },
  NEEDS_INPUT: { label: "Potrzebne dane", variant: "info", icon: <CircleHelp aria-hidden="true" /> },
}

interface Determination {
  benefit: string
  label: string
  status: string
  reasons: { text: string; legalBasis: string }[]
  caveats: string[]
  legalBasis: string[]
  missingFacts: { question: string }[]
}

function EligibilityCard({ output }: { output: { assessment: { determinations: Determination[]; disclaimer: string }; conflicts?: { key: string }[] } }) {
  return (
    <CardShell
      icon={<CheckCircle2 className="size-4" />}
      title={TOOL_LABELS.checkBenefitEligibility!}
      badge={<Badge variant="outline">Moduł reguł</Badge>}
      footer={output.assessment.disclaimer}
    >
      <ul className="space-y-2.5">
        {output.assessment.determinations.map((item) => {
          const status = STATUS[item.status] ?? STATUS.INDETERMINATE!
          return (
            <li key={item.benefit} className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{item.label}</span>
                <Badge variant={status.variant}>{status.icon}{status.label}</Badge>
              </div>
              {item.reasons[0] && <p className="text-muted-foreground">{item.reasons[0].text}</p>}
              {item.legalBasis.length > 0 && (
                <p className="font-mono text-[11px] text-muted-foreground">Podstawa: {item.legalBasis.join("; ")}</p>
              )}
              <MissingNote items={item.missingFacts} />
            </li>
          )
        })}
      </ul>
      {output.conflicts && output.conflicts.length > 0 && (
        <p className="rounded-lg bg-warning/15 px-3 py-2 text-xs">
          Dane z rozmowy różnią się od profilu ({output.conflicts.map((c) => c.key).join(", ")}). Użyto danych z rozmowy.
        </p>
      )}
    </CardShell>
  )
}

interface CalcLine { label: string; weeks: number; days: number; ratePercent: number; amountFormatted: string; legalReference: string }

function CalculationCard({ output }: { output: { status: string; missing?: { question: string }[]; lines?: CalcLine[]; totalFormatted?: string; basisFormatted?: string; grossMonthlyIncomePln?: number; incomeSource?: string; warnings?: string[]; disclaimer?: string } }) {
  if (output.status !== "OK" || !output.lines) {
    return (
      <CardShell icon={<Calculator className="size-4" />} title={TOOL_LABELS.calculateBenefit!}>
        <MissingNote items={output.missing} />
        <Link href="/kalkulator" className="inline-flex text-xs font-medium text-primary underline-offset-4 hover:underline">
          Otwórz kalkulator i wpisz dane samodzielnie
        </Link>
      </CardShell>
    )
  }
  return (
    <CardShell
      icon={<Calculator className="size-4" />}
      title={TOOL_LABELS.calculateBenefit!}
      badge={<Badge variant="warning">Szacunek, niezweryfikowany</Badge>}
      footer={output.disclaimer}
    >
      <p className="text-xs text-muted-foreground">
        Wynagrodzenie brutto {output.grossMonthlyIncomePln?.toLocaleString("pl-PL")} zł ({output.incomeSource === "PROFILE" ? "z profilu" : "z rozmowy"}) · podstawa wymiaru {output.basisFormatted}
      </p>
      <div className="-mx-1 overflow-x-auto">
        <table className="w-full min-w-[22rem] text-left text-xs">
          <caption className="sr-only">Wyliczenie zasiłku w podziale na okresy</caption>
          <thead className="text-muted-foreground">
            <tr>
              <th scope="col" className="px-1 py-1 font-medium">Okres</th>
              <th scope="col" className="px-1 py-1 font-medium">Długość</th>
              <th scope="col" className="px-1 py-1 font-medium">Stawka</th>
              <th scope="col" className="px-1 py-1 text-right font-medium">Kwota brutto</th>
            </tr>
          </thead>
          <tbody>
            {output.lines.map((line) => (
              <tr key={line.label} className="border-t border-border/60">
                <th scope="row" className="px-1 py-1.5 font-normal">{line.label}</th>
                <td className="px-1 py-1.5 tabular-nums">{line.weeks > 0 ? `${line.weeks} tyg.` : `${line.days} dni`}</td>
                <td className="px-1 py-1.5 tabular-nums">{line.ratePercent}%</td>
                <td className="px-1 py-1.5 text-right tabular-nums">{line.amountFormatted}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-border">
              <th scope="row" colSpan={3} className="px-1 py-1.5 font-medium">Łącznie</th>
              <td className="px-1 py-1.5 text-right font-semibold tabular-nums">{output.totalFormatted}</td>
            </tr>
          </tfoot>
        </table>
      </div>
      <Link href="/kalkulator" className="inline-flex text-xs font-medium text-primary underline-offset-4 hover:underline">
        Sprawdź i zapisz w kalkulatorze
      </Link>
    </CardShell>
  )
}

interface Outcome { name: string; maternityWeeks: number; motherParentalWeeks: number; secondParentWeeks: number; paternityDays: number; extensionWeeks: number; totalFormatted: string | null; differenceFormatted: string | null; motherLeaveEnd: string | null }

function ComparisonCard({ output }: { output: { outcomes: Outcome[]; amountsAvailable: boolean; missing?: { question: string }[]; notes: string[] } }) {
  return (
    <CardShell
      icon={<GitCompareArrows className="size-4" />}
      title={TOOL_LABELS.compareLeaveScenarios!}
      badge={<Badge variant="warning">Symulacja</Badge>}
      footer={output.notes[0]}
    >
      <div className="-mx-1 overflow-x-auto">
        <table className="w-full min-w-[26rem] text-left text-xs">
          <caption className="sr-only">Porównanie wariantów podziału urlopu</caption>
          <thead className="text-muted-foreground">
            <tr>
              <th scope="col" className="px-1 py-1 font-medium">Wariant</th>
              <th scope="col" className="px-1 py-1 font-medium">Macierz.</th>
              <th scope="col" className="px-1 py-1 font-medium">Rodzic. mamy</th>
              <th scope="col" className="px-1 py-1 font-medium">Drugi rodzic</th>
              <th scope="col" className="px-1 py-1 font-medium">Ojcowski</th>
              {output.amountsAvailable && <th scope="col" className="px-1 py-1 text-right font-medium">Łącznie</th>}
            </tr>
          </thead>
          <tbody>
            {output.outcomes.map((outcome) => (
              <tr key={outcome.name} className="border-t border-border/60">
                <th scope="row" className="px-1 py-1.5 font-normal">{outcome.name}</th>
                <td className="px-1 py-1.5 tabular-nums">{outcome.maternityWeeks} tyg.</td>
                <td className="px-1 py-1.5 tabular-nums">{outcome.motherParentalWeeks} tyg.</td>
                <td className="px-1 py-1.5 tabular-nums">{outcome.secondParentWeeks} tyg.</td>
                <td className="px-1 py-1.5 tabular-nums">{outcome.paternityDays} dni</td>
                {output.amountsAvailable && <td className="px-1 py-1.5 text-right tabular-nums">{outcome.totalFormatted}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <MissingNote items={output.missing} />
      <Link href="/os-czasu" className="inline-flex text-xs font-medium text-primary underline-offset-4 hover:underline">
        Zaplanuj w osi czasu
      </Link>
    </CardShell>
  )
}

const PREPARED: Record<string, string> = { YOU: "Ty", EMPLOYER: "Pracodawca", PAYER: "Płatnik", DOCTOR: "Lekarz", CIVIL_REGISTRY: "USC" }
const SUBMIT: Record<string, string> = { EMPLOYER: "do pracodawcy", ZUS: "do ZUS", EMPLOYER_OR_ZUS: "pracodawca lub ZUS" }

function DocumentsCard({ output }: { output: { documents: { code: string; name: string; preparedBy: string; submitTo: string; when: string; legalBasis: string; caveat?: string }[]; routing: { explanation: string; channels: string[]; legalBasis: string }; missingFacts: { question: string }[] } }) {
  return (
    <CardShell icon={<FileText className="size-4" />} title={TOOL_LABELS.getRequiredDocuments!} footer="Wzory formularzy: zus.pl → „Wzory formularzy” → „Zasiłki”.">
      <ul className="space-y-2">
        {output.documents.map((document) => (
          <li key={document.code + document.name} className="rounded-lg border border-border/60 px-3 py-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="font-mono">{document.code}</Badge>
              <span className="font-medium">{document.name}</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {PREPARED[document.preparedBy]} · {SUBMIT[document.submitTo]} · {document.when}
            </p>
            {document.caveat && <p className="mt-1 text-xs text-warning-foreground">{document.caveat}</p>}
          </li>
        ))}
      </ul>
      <div className="flex gap-2 rounded-lg bg-muted/70 px-3 py-2">
        <Route aria-hidden="true" className="mt-0.5 size-3.5 shrink-0 text-primary" />
        <div className="space-y-1 text-xs">
          <p>{output.routing.explanation}</p>
          <ul className="list-disc pl-4 text-muted-foreground">
            {output.routing.channels.map((channel) => <li key={channel}>{channel}</li>)}
          </ul>
          <p className="font-mono text-[11px] text-muted-foreground">Podstawa: {output.routing.legalBasis}</p>
        </div>
      </div>
      <MissingNote items={output.missingFacts} />
    </CardShell>
  )
}

function DeadlinesCard({ output }: { output: { deadlines: { id: string; title: string; rule: string; dateFormatted: string | null; legalBasis: string; owner: string }[]; caveats: string[]; missingFacts: { question: string }[] } }) {
  return (
    <CardShell icon={<CalendarClock className="size-4" />} title={TOOL_LABELS.getRelevantDeadlines!} footer={output.caveats[0]}>
      <ol className="space-y-2">
        {output.deadlines.map((deadline) => (
          <li key={deadline.id} className="grid grid-cols-[auto_1fr] gap-x-3">
            <span className={cn("mt-1 size-2 rounded-full", deadline.dateFormatted ? "bg-primary" : "bg-border")} aria-hidden="true" />
            <div>
              <p className="font-medium">
                {deadline.title}
                {deadline.dateFormatted && <span className="ml-2 text-primary tabular-nums">{deadline.dateFormatted}</span>}
              </p>
              <p className="text-xs text-muted-foreground">{deadline.rule} <span className="font-mono">({deadline.legalBasis})</span></p>
            </div>
          </li>
        ))}
      </ol>
      <MissingNote items={output.missingFacts} />
    </CardShell>
  )
}

function TimelineCard({ output }: { output: { status: string; missing?: { question: string }[]; milestones?: { id: string; title: string; dateFormatted: string; endDateFormatted: string | null; owner: string; legalReference: string }[] } }) {
  return (
    <CardShell icon={<CalendarClock className="size-4" />} title={TOOL_LABELS.getBenefitTimeline!} badge={<Badge variant="warning">Plan orientacyjny</Badge>}>
      {output.milestones ? (
        <ol className="relative space-y-2 border-l border-border pl-4">
          {output.milestones.map((milestone) => (
            <li key={milestone.id}>
              <p className="text-xs text-muted-foreground tabular-nums">
                {milestone.dateFormatted}{milestone.endDateFormatted ? ` – ${milestone.endDateFormatted}` : ""} · {milestone.owner}
              </p>
              <p>{milestone.title}</p>
            </li>
          ))}
        </ol>
      ) : (
        <MissingNote items={output.missing} />
      )}
      <Link href="/os-czasu" className="inline-flex text-xs font-medium text-primary underline-offset-4 hover:underline">
        Otwórz pełną oś czasu
      </Link>
    </CardShell>
  )
}

const FACT_LABEL: Record<string, string> = {
  employmentType: "Tytuł ubezpieczenia",
  sicknessInsurance: "Ubezpieczenie chorobowe",
  insuranceStartDate: "Ubezpieczenie od",
  familyEvent: "Zdarzenie",
  eventDate: "Data zdarzenia",
  expectedDueDate: "Termin porodu",
  childrenCount: "Liczba dzieci",
  hasZaZyciem: "„Za życiem”",
}

function ProfileCard({ output }: { output: { status: string; message: string; profile: { facts: Record<string, unknown>; grossMonthlyIncomePln: number | null } | null } }) {
  return (
    <CardShell icon={<UserRound className="size-4" />} title={TOOL_LABELS.getUserInsuranceProfile!} badge={<Badge variant="warning">Dane syntetyczne</Badge>}>
      {output.profile ? (
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
          {Object.entries(output.profile.facts).map(([key, value]) => (
            <div key={key} className="contents">
              <dt className="text-muted-foreground">{FACT_LABEL[key] ?? key}</dt>
              <dd>{String(value)}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="text-xs text-muted-foreground">{output.message}</p>
      )}
    </CardShell>
  )
}

/** One compact line for all searches of a message. */
export function SearchSummary({ parts }: { parts: ToolPart[] }) {
  if (parts.length === 0) return null
  const pending = parts.some((part) => part.state === "input-streaming" || part.state === "input-available")
  const count = new Set(
    parts.flatMap((part) => ((part.output as { sources?: { chunkId: string }[] } | undefined)?.sources ?? []).map((source) => source.chunkId))
  ).size
  return (
    <p className="flex items-center gap-2 text-xs text-muted-foreground" aria-live="off">
      {pending ? <Loader2 aria-hidden="true" className="size-3.5 animate-spin" /> : <Search aria-hidden="true" className="size-3.5" />}
      {pending
        ? PENDING_LABELS.searchKnowledgeBase
        : count > 0
          ? `Przeszukano bazę wiedzy — ${count} ${count === 1 ? "fragment" : count < 5 ? "fragmenty" : "fragmentów"} jako dowody`
          : "Przeszukano bazę wiedzy — brak pasujących fragmentów"}
    </p>
  )
}

export function ToolCard({ part }: { part: ToolPart }) {
  const name = toolNameOf(part)
  if (part.state === "input-streaming" || part.state === "input-available") {
    return (
      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <Loader2 aria-hidden="true" className="size-3.5 animate-spin" />
        {PENDING_LABELS[name] ?? "Pracuję…"}
      </p>
    )
  }
  const output = part.output as { status?: string; message?: string } | undefined
  if (part.state === "output-error" || output?.status === "ERROR" || output?.status === "INVALID_INPUT") {
    return (
      <p className="flex items-center gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-xs">
        <AlertTriangle aria-hidden="true" className="size-3.5 text-destructive" />
        {TOOL_LABELS[name] ?? name}: nie udało się wykonać ({part.state === "output-error" ? "nieprawidłowe argumenty" : output?.message ?? "błąd usługi"}). Wynik nie został użyty.
      </p>
    )
  }
  if (!output) return null
  switch (name) {
    case "checkBenefitEligibility":
      return <EligibilityCard output={output as Parameters<typeof EligibilityCard>[0]["output"]} />
    case "calculateBenefit":
      return <CalculationCard output={output as Parameters<typeof CalculationCard>[0]["output"]} />
    case "compareLeaveScenarios":
      return <ComparisonCard output={output as Parameters<typeof ComparisonCard>[0]["output"]} />
    case "getRequiredDocuments":
      return <DocumentsCard output={output as Parameters<typeof DocumentsCard>[0]["output"]} />
    case "getRelevantDeadlines":
      return <DeadlinesCard output={output as Parameters<typeof DeadlinesCard>[0]["output"]} />
    case "getBenefitTimeline":
      return <TimelineCard output={output as Parameters<typeof TimelineCard>[0]["output"]} />
    case "getUserInsuranceProfile":
      return <ProfileCard output={output as Parameters<typeof ProfileCard>[0]["output"]} />
    default:
      return null
  }
}
