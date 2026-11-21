"use client"

import { AlertTriangle, Bot, EyeOff, Info, ListChecks, User } from "lucide-react"

import type { AssistantUIMessage } from "@zpr/ai/types"
import type { EvidenceSource, GroundingReport } from "@zpr/contracts/assistant"
import { Alert, AlertDescription, AlertTitle } from "@workspace/ui/components/alert"
import { cn } from "@workspace/ui/lib/utils"

import { RichText } from "./rich-text"
import { SearchSummary, ToolCard, toolNameOf, type ToolPart } from "./tool-cards"

const REDACTION_LABELS: Record<string, string> = {
  PESEL: "PESEL",
  IBAN: "numer konta",
  ID_DOCUMENT: "numer dokumentu",
  EMAIL: "adres e-mail",
  PHONE: "numer telefonu",
}

function isToolPart(part: AssistantUIMessage["parts"][number]): part is AssistantUIMessage["parts"][number] & ToolPart {
  return part.type.startsWith("tool-") || part.type === "dynamic-tool"
}

function dataPart<T>(message: AssistantUIMessage, type: string): T | undefined {
  const part = message.parts.find((item) => item.type === type)
  return part && "data" in part ? (part.data as T) : undefined
}

/** Sources of a message: the final evidence part, or search outputs while streaming. */
export function messageSources(message: AssistantUIMessage): EvidenceSource[] {
  const evidence = dataPart<{ sources: EvidenceSource[] }>(message, "data-evidence")
  if (evidence) return evidence.sources
  const byRef = new Map<string, EvidenceSource>()
  for (const part of message.parts) {
    if (isToolPart(part) && toolNameOf(part) === "searchKnowledgeBase" && part.state === "output-available") {
      for (const source of (part.output as { sources?: EvidenceSource[] }).sources ?? []) byRef.set(source.ref, source)
    }
  }
  return [...byRef.values()]
}

function GroundingNotice({ report }: { report: GroundingReport }) {
  if (report.status === "OK") return null
  return (
    <Alert variant="warning" className="text-xs">
      <AlertTriangle aria-hidden="true" />
      <AlertTitle>Część odpowiedzi nie ma potwierdzenia w źródłach</AlertTitle>
      <AlertDescription>
        <ul className="list-disc pl-4">
          {report.notes.map((note) => <li key={note}>{note}</li>)}
        </ul>
        Traktuj te fragmenty ostrożnie i sprawdź je w kalkulatorze lub w ZUS.
      </AlertDescription>
    </Alert>
  )
}

export function ChatMessage({
  message,
  isLast,
  busy,
  onCite,
  onFollowUp,
}: {
  message: AssistantUIMessage
  isLast: boolean
  busy: boolean
  onCite: (messageId: string, ref: string) => void
  onFollowUp: (question: string) => void
}) {
  const isUser = message.role === "user"
  const sources = isUser ? [] : messageSources(message)
  const handlers = { sources, onCite: (ref: string) => onCite(message.id, ref) }

  const searchParts = message.parts.filter((part): part is AssistantUIMessage["parts"][number] & ToolPart => isToolPart(part) && toolNameOf(part) === "searchKnowledgeBase")
  const grounding = dataPart<GroundingReport>(message, "data-grounding")
  const followUps = dataPart<{ questions: string[] }>(message, "data-followups")?.questions ?? []
  const redactions = message.metadata?.redactions ?? []
  const text = message.parts.filter((part) => part.type === "text").map((part) => (part as { text: string }).text).join("")

  return (
    <article
      className={cn("flex gap-3", isUser && "flex-row-reverse")}
      aria-label={isUser ? "Twoja wiadomość" : "Odpowiedź asystenta"}
    >
      <span
        aria-hidden="true"
        className={cn(
          "mt-0.5 grid size-8 shrink-0 place-items-center rounded-full",
          isUser ? "bg-secondary text-secondary-foreground" : "bg-primary text-primary-foreground"
        )}
      >
        {isUser ? <User className="size-4" /> : <Bot className="size-4" />}
      </span>

      <div className={cn("min-w-0 space-y-3", isUser ? "max-w-[85%]" : "w-full max-w-[44rem]")}>
        {isUser ? (
          <div className="rounded-2xl rounded-tr-sm border border-border bg-secondary px-3.5 py-2.5 text-sm whitespace-pre-line text-secondary-foreground">
            {text}
          </div>
        ) : (
          <>
            {redactions.length > 0 && (
              <p className="flex items-start gap-2 rounded-lg bg-info/10 px-3 py-2 text-xs">
                <EyeOff aria-hidden="true" className="mt-0.5 size-3.5 shrink-0 text-info" />
                Usunąłem z twojej wiadomości: {redactions.map((r) => REDACTION_LABELS[r.kind] ?? r.kind).join(", ")}. Te dane nie są potrzebne i nie zostały zapisane ani wysłane do modelu.
              </p>
            )}
            <SearchSummary parts={searchParts} />
            {message.parts.map((part, index) => {
              if (isToolPart(part) && toolNameOf(part) !== "searchKnowledgeBase") {
                return <ToolCard key={part.toolCallId ?? index} part={part} />
              }
              return null
            })}
            {text && (
              <div className="rounded-2xl rounded-tl-sm border border-border/70 bg-card px-4 py-3">
                <RichText text={text} handlers={handlers} />
              </div>
            )}
            {message.metadata?.aborted && (
              <p className="flex items-center gap-2 text-xs text-muted-foreground">
                <Info aria-hidden="true" className="size-3.5" />
                Odpowiedź przerwana. Możesz zadać pytanie ponownie.
              </p>
            )}
            {grounding && <GroundingNotice report={grounding} />}
            {sources.length > 0 && !busy && (
              <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                <span>Źródła:</span>
                {sources.map((source) => (
                  <button
                    key={source.ref}
                    type="button"
                    onClick={() => onCite(message.id, source.ref)}
                    className="rounded-md border border-border/70 px-2 py-1 hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                    aria-label={`Źródło ${source.ref}: ${source.documentTitle}`}
                  >
                    <span className="font-mono text-primary">{source.ref}</span>{" "}
                    <span className="hidden sm:inline">{source.legalReference ?? source.documentTitle}</span>
                  </button>
                ))}
              </div>
            )}
            {isLast && !busy && followUps.length > 0 && (
              <div className="space-y-1.5">
                <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <ListChecks aria-hidden="true" className="size-3.5" />
                  Możesz też zapytać
                </p>
                <div className="flex flex-wrap gap-2">
                  {followUps.map((question) => (
                    <button
                      key={question}
                      type="button"
                      onClick={() => onFollowUp(question)}
                      className="min-h-9 rounded-full border border-primary/30 bg-primary/5 px-3 py-1.5 text-left text-xs text-foreground transition-colors hover:bg-primary/15 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                    >
                      {question}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </article>
  )
}
