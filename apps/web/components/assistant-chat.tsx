"use client"

import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport } from "ai"
import Link from "next/link"
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react"
import {
  AlertTriangle,
  Bot,
  History,
  Loader2,
  MessageSquarePlus,
  RotateCcw,
  Send,
  ShieldCheck,
  Sparkles,
  Square,
  Trash2,
  X,
} from "lucide-react"

import type { AssistantUIMessage } from "@zpr/ai/types"
import type { EvidenceSource } from "@zpr/contracts/assistant"
import { Alert, AlertDescription, AlertTitle } from "@workspace/ui/components/alert"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Textarea } from "@workspace/ui/components/textarea"
import { cn } from "@workspace/ui/lib/utils"

import { ChatMessage, messageSources } from "./assistant/chat-message"
import { SourceDetail, SourceList } from "./assistant/source-panel"

const SUGGESTIONS: { group: string; questions: string[] }[] = [
  {
    group: "Uprawnienia",
    questions: [
      "Czy przysługuje mi zasiłek macierzyński?",
      "Jestem na B2B i jestem w ciąży. Co powinnam zrobić?",
      "Jakie są ryzyka utraty świadczenia?",
    ],
  },
  {
    group: "Urlopy i plan",
    questions: [
      "Jak długo mogę pobierać zasiłek?",
      "Czy tata może przejąć część urlopu?",
      "Jak podzielić urlop rodzicielski?",
      "Czy mogę pracować na pół etatu podczas urlopu?",
    ],
  },
  {
    group: "Formalności",
    questions: [
      "Jakie dokumenty muszę złożyć?",
      "Gdzie mam wysłać formularz?",
      "Jakie wsparcie istnieje w szczególnej sytuacji rodzinnej?",
    ],
  },
]

interface ConversationItem {
  id: string
  title: string
  updatedAt: string
  messageCount: number
}

interface SessionInfo {
  profile: { status: string; available: boolean }
  mode: "llm" | "rules"
  model: string
}

const PROFILE_HINTS: Record<string, string> = {
  NOT_AUTHENTICATED: "Najpierw wypełnij kreator, aby asystent mógł korzystać z twoich danych.",
  CONSENT_REQUIRED: "W kreatorze nie wyrażono zgody na korzystanie z danych przez asystenta AI.",
  NOT_FOUND: "Nie znaleziono profilu dla tej sesji.",
  AVAILABLE: "Asystent użyje potwierdzonych danych z kreatora (dane syntetyczne). Nie może ich zmieniać.",
}

function errorMessage(error: Error | undefined): string {
  if (!error) return ""
  try {
    const parsed = JSON.parse(error.message) as { detail?: string }
    if (parsed.detail) return parsed.detail
  } catch {
    // not JSON
  }
  return error.message && error.message.length < 300
    ? error.message
    : "Asystent nie może teraz odpowiedzieć. Spróbuj ponownie."
}

function relativeTime(iso: string): string {
  const date = new Date(iso)
  return new Intl.DateTimeFormat("pl-PL", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(date)
}

export function AssistantChat() {
  const [chat, setChat] = useState<{ id: string; messages: AssistantUIMessage[] }>(() => ({
    id: crypto.randomUUID(),
    messages: [],
  }))
  const [input, setInput] = useState("")
  const [useProfile, setUseProfile] = useState(false)
  const useProfileRef = useRef(useProfile)
  useProfileRef.current = useProfile
  const [session, setSession] = useState<SessionInfo | null>(null)
  const [conversations, setConversations] = useState<ConversationItem[]>([])
  const [historyOpen, setHistoryOpen] = useState(false)
  const [confirmClear, setConfirmClear] = useState(false)
  const [historyError, setHistoryError] = useState<string | null>(null)
  const [selection, setSelection] = useState<{ messageId: string; ref: string } | null>(null)
  const [announcement, setAnnouncement] = useState("")
  const dialogRef = useRef<HTMLDialogElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const endRef = useRef<HTMLDivElement>(null)

  const transport = useMemo(
    () =>
      new DefaultChatTransport<AssistantUIMessage>({
        api: "/api/v1/assistant/chat",
        credentials: "same-origin",
        // Only the newest user message is sent; history lives on the server.
        prepareSendMessagesRequest: ({ id, messages, trigger }) => {
          const last = [...messages].reverse().find((message) => message.role === "user")
          const text = last?.parts
            .map((part) => (part.type === "text" ? part.text : ""))
            .join("")
            .trim()
          return {
            body: {
              id,
              trigger,
              message: { id: last?.id, role: "user", parts: [{ type: "text", text }] },
              options: { useProfile: useProfileRef.current },
            },
          }
        },
      }),
    []
  )

  const refreshConversations = useCallback(async () => {
    try {
      const response = await fetch("/api/v1/assistant/conversations", { cache: "no-store" })
      if (!response.ok) throw new Error()
      const data = (await response.json()) as { conversations: ConversationItem[] }
      setConversations(data.conversations)
      setHistoryError(null)
    } catch {
      setHistoryError("Nie udało się wczytać historii rozmów.")
    }
  }, [])

  const { messages, sendMessage, status, error, stop, regenerate, clearError } = useChat<AssistantUIMessage>({
    id: chat.id,
    messages: chat.messages,
    transport,
    throttle: 40,
    onFinish: () => {
      setAnnouncement("Odpowiedź asystenta jest gotowa.")
      void refreshConversations()
    },
    onError: () => setAnnouncement("Wystąpił błąd. Możesz spróbować ponownie."),
  })

  const busy = status === "submitted" || status === "streaming"

  useEffect(() => {
    void refreshConversations()
    fetch("/api/v1/assistant/session", { cache: "no-store" })
      .then((response) => (response.ok ? (response.json() as Promise<SessionInfo>) : null))
      .then((data) => data && setSession(data))
      .catch(() => undefined)
  }, [refreshConversations])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" })
  }, [messages.length, status])

  const send = useCallback(
    (text: string) => {
      const trimmed = text.trim()
      if (trimmed.length < 2 || busy) return
      clearError()
      setSelection(null)
      setAnnouncement("Asystent analizuje pytanie i przeszukuje źródła.")
      void sendMessage({ text: trimmed })
      setInput("")
      textareaRef.current?.focus()
    },
    [busy, clearError, sendMessage]
  )

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    send(input)
  }

  function newConversation() {
    if (busy) stop()
    setChat({ id: crypto.randomUUID(), messages: [] })
    setSelection(null)
    setHistoryOpen(false)
    textareaRef.current?.focus()
  }

  async function openConversation(id: string) {
    if (busy) stop()
    try {
      const response = await fetch(`/api/v1/assistant/conversations/${id}`, { cache: "no-store" })
      if (!response.ok) throw new Error()
      const data = (await response.json()) as { id: string; messages: AssistantUIMessage[] }
      setChat({ id: data.id, messages: data.messages })
      setSelection(null)
      setHistoryOpen(false)
    } catch {
      setHistoryError("Nie udało się otworzyć rozmowy.")
    }
  }

  async function removeConversation(id: string) {
    const response = await fetch(`/api/v1/assistant/conversations/${id}`, { method: "DELETE" })
    if (response.ok || response.status === 404) {
      if (id === chat.id) newConversation()
      setAnnouncement("Rozmowa została usunięta.")
      void refreshConversations()
    }
  }

  async function removeAll() {
    const response = await fetch("/api/v1/assistant/conversations", { method: "DELETE" })
    setConfirmClear(false)
    if (response.ok) {
      newConversation()
      setAnnouncement("Cała historia rozmów została usunięta.")
      void refreshConversations()
    }
  }

  const selectedSources: EvidenceSource[] = useMemo(() => {
    if (!selection) return []
    const message = messages.find((item) => item.id === selection.messageId)
    return message ? messageSources(message) : []
  }, [messages, selection])
  const selectedSource = selectedSources.find((source) => source.ref === selection?.ref) ?? null

  function cite(messageId: string, ref: string) {
    setSelection({ messageId, ref })
    if (typeof window !== "undefined" && !window.matchMedia("(min-width: 1280px)").matches) {
      dialogRef.current?.showModal()
    }
  }

  const profileStatus = session?.profile.status ?? "NOT_AUTHENTICATED"
  const lastAssistantIndex = messages.map((m) => m.role).lastIndexOf("assistant")

  const historyPanel = (
    <nav aria-label="Historia rozmów" className="space-y-3">
      <Button type="button" onClick={newConversation} className="w-full" variant="outline">
        <MessageSquarePlus aria-hidden="true" />
        Nowa rozmowa
      </Button>
      {historyError && <p className="text-xs text-destructive">{historyError}</p>}
      {conversations.length === 0 ? (
        <p className="text-xs text-muted-foreground">Nie masz jeszcze zapisanych rozmów.</p>
      ) : (
        <ul className="space-y-1">
          {conversations.map((conversation) => (
            <li key={conversation.id} className="group flex items-center gap-1">
              <button
                type="button"
                onClick={() => void openConversation(conversation.id)}
                aria-current={conversation.id === chat.id ? "page" : undefined}
                className={cn(
                  "min-w-0 flex-1 rounded-lg px-2.5 py-2 text-left text-xs transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
                  conversation.id === chat.id ? "bg-primary/10 text-foreground" : "hover:bg-muted"
                )}
              >
                <span className="block truncate font-medium">{conversation.title}</span>
                <span className="block text-muted-foreground">{relativeTime(conversation.updatedAt)}</span>
              </button>
              <button
                type="button"
                onClick={() => void removeConversation(conversation.id)}
                className="grid size-8 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                aria-label={`Usuń rozmowę: ${conversation.title}`}
              >
                <Trash2 aria-hidden="true" className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
      {conversations.length > 0 &&
        (confirmClear ? (
          <div className="space-y-2 rounded-lg border border-destructive/30 bg-destructive/5 p-2.5 text-xs" role="group" aria-label="Potwierdź usunięcie historii">
            <p>Usunąć wszystkie rozmowy wraz ze źródłami i wynikami narzędzi? Tego nie można cofnąć.</p>
            <div className="flex gap-2">
              <Button type="button" size="sm" variant="destructive" onClick={() => void removeAll()}>Usuń wszystko</Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => setConfirmClear(false)}>Anuluj</Button>
            </div>
          </div>
        ) : (
          <button type="button" onClick={() => setConfirmClear(true)} className="text-xs text-muted-foreground underline-offset-4 hover:text-destructive hover:underline">
            Usuń całą historię
          </button>
        ))}
    </nav>
  )

  return (
    <div className="grid gap-4 xl:grid-cols-[15rem_minmax(0,1fr)_20rem] xl:items-start">
      {/* History: sidebar on wide screens, disclosure on small ones */}
      <aside className="hidden xl:sticky xl:top-20 xl:block">{historyPanel}</aside>

      <section className="flex min-h-[70vh] flex-col overflow-hidden rounded-2xl border border-border/80 bg-card shadow-xs" aria-label="Rozmowa z asystentem">
        <header className="flex flex-wrap items-center gap-2 border-b border-border/70 px-4 py-3">
          <Bot aria-hidden="true" className="size-4 text-primary" />
          <h2 className="font-heading text-lg font-semibold">Asystent zasiłkowy</h2>
          <Badge variant="warning">Symulacja</Badge>
          {session && (
            <Badge variant="outline" title={session.model}>
              {session.mode === "llm" ? "Model językowy + reguły" : "Tryb offline: reguły"}
            </Badge>
          )}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="ml-auto xl:hidden"
            aria-expanded={historyOpen}
            aria-controls="assistant-history-mobile"
            onClick={() => setHistoryOpen((open) => !open)}
          >
            <History aria-hidden="true" />
            Historia
          </Button>
        </header>

        {historyOpen && (
          <div id="assistant-history-mobile" className="border-b border-border/70 bg-muted/40 p-4 xl:hidden">
            {historyPanel}
          </div>
        )}

        <div
          role="log"
          aria-label="Wiadomości"
          aria-live="off"
          aria-busy={busy}
          className="flex-1 space-y-5 overflow-y-auto px-3 py-5 sm:px-5"
        >
          {messages.length === 0 && (
            <div className="space-y-5">
              <div className="space-y-2">
                <p className="font-heading text-xl font-semibold text-balance">W czym mogę pomóc?</p>
                <p className="max-w-prose text-sm text-pretty text-muted-foreground">
                  Wyjaśnię zasady zasiłku macierzyńskiego, urlopów i formalności. Każdą informację prawną opieram na
                  źródłach z bazy wiedzy, a kwoty i terminy biorę wyłącznie z modułu obliczeń. Nie jestem pracownikiem
                  ZUS, a moja ocena nie jest decyzją.
                </p>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                {SUGGESTIONS.map((group) => (
                  <div key={group.group} className="space-y-2">
                    <p className="flex items-center gap-1.5 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                      <Sparkles aria-hidden="true" className="size-3" />
                      {group.group}
                    </p>
                    <ul className="space-y-1.5">
                      {group.questions.map((question) => (
                        <li key={question}>
                          <button
                            type="button"
                            onClick={() => send(question)}
                            disabled={busy}
                            className="min-h-11 w-full rounded-lg border border-border/70 px-3 py-2 text-left text-sm text-pretty transition-colors hover:border-primary/40 hover:bg-primary/5 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none disabled:opacity-50"
                          >
                            {question}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}

          {messages.map((message, index) => (
            <ChatMessage
              key={message.id}
              message={message}
              isLast={index === lastAssistantIndex}
              busy={busy && index === messages.length - 1}
              onCite={cite}
              onFollowUp={send}
            />
          ))}

          {status === "submitted" && (
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <span aria-hidden="true" className="grid size-8 place-items-center rounded-full bg-primary text-primary-foreground">
                <Bot className="size-4" />
              </span>
              <Loader2 aria-hidden="true" className="size-4 animate-spin" />
              Analizuję pytanie…
            </div>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertTriangle aria-hidden="true" />
              <AlertTitle>Nie udało się uzyskać odpowiedzi</AlertTitle>
              <AlertDescription className="space-y-2">
                <p>{errorMessage(error)}</p>
                <Button type="button" size="sm" variant="outline" onClick={() => { clearError(); void regenerate() }}>
                  <RotateCcw aria-hidden="true" />
                  Spróbuj ponownie
                </Button>
              </AlertDescription>
            </Alert>
          )}
          <div ref={endRef} />
        </div>

        <form onSubmit={onSubmit} className="space-y-3 border-t border-border/70 bg-background/60 px-3 py-3 sm:px-5">
          <label htmlFor="assistant-message" className="sr-only">Twoje pytanie</label>
          <Textarea
            id="assistant-message"
            ref={textareaRef}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Np. Jestem na zleceniu od dwóch miesięcy. Czy dostanę zasiłek?"
            rows={2}
            maxLength={4000}
            aria-describedby="assistant-input-help"
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                event.preventDefault()
                send(input)
              }
            }}
          />
          <div className="flex flex-wrap items-center gap-3">
            <label className={cn("flex items-center gap-2 text-xs", !session?.profile.available && "text-muted-foreground")}>
              <input
                type="checkbox"
                className="size-4 accent-[var(--primary)]"
                checked={useProfile}
                disabled={!session?.profile.available}
                onChange={(event) => setUseProfile(event.target.checked)}
                aria-describedby="assistant-profile-help"
              />
              Użyj moich danych z kreatora
            </label>
            <p id="assistant-input-help" className="hidden text-xs text-muted-foreground sm:block">
              Enter wysyła, Shift+Enter — nowa linia. Nie podawaj PESEL ani danych medycznych.
            </p>
            <div className="ml-auto flex gap-2">
              {busy ? (
                <Button type="button" variant="outline" onClick={() => stop()}>
                  <Square aria-hidden="true" />
                  Zatrzymaj
                </Button>
              ) : (
                <Button type="submit" disabled={input.trim().length < 2}>
                  <Send aria-hidden="true" />
                  Wyślij
                </Button>
              )}
            </div>
          </div>
          <p id="assistant-profile-help" className="flex items-start gap-1.5 text-xs text-muted-foreground">
            <ShieldCheck aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
            <span>
              {PROFILE_HINTS[profileStatus] ?? PROFILE_HINTS.NOT_AUTHENTICATED}{" "}
              {profileStatus === "NOT_AUTHENTICATED" && (
                <Link href="/start" className="text-primary underline underline-offset-4">Przejdź do kreatora</Link>
              )}
            </span>
          </p>
        </form>
        <p className="sr-only" role="status" aria-live="polite">{announcement}</p>
      </section>

      {/* Citation panel: sticky on wide screens, dialog on smaller ones */}
      <aside className="hidden space-y-4 xl:sticky xl:top-20 xl:block" aria-label="Źródło odpowiedzi">
        {selectedSource ? (
          <div className="space-y-4 rounded-2xl border border-border/80 bg-card p-4">
            <SourceDetail source={selectedSource} />
            {selectedSources.length > 1 && (
              <SourceList sources={selectedSources} selected={selection?.ref ?? null} onSelect={(ref) => setSelection((current) => current && { ...current, ref })} />
            )}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-border p-4 text-xs text-muted-foreground">
            Kliknij oznaczenie źródła (np. <span className="font-mono text-primary">S1</span>) w odpowiedzi, aby zobaczyć
            fragment, miejsce w dokumencie i okres obowiązywania.
          </div>
        )}
        <Alert variant="info" className="text-xs">
          <Bot aria-hidden="true" />
          <AlertTitle>Asystent AI — nie urzędnik</AlertTitle>
          <AlertDescription>
            Informacje mają charakter ogólny. O prawie do zasiłku decyduje ZUS lub płatnik składek. Dane i integracje w tej
            aplikacji są symulowane.
          </AlertDescription>
        </Alert>
      </aside>

      <dialog
        ref={dialogRef}
        aria-label="Źródło odpowiedzi"
        className="m-auto w-[min(100vw-2rem,32rem)] rounded-2xl border border-border bg-card p-0 text-foreground backdrop:bg-black/40"
        onClose={() => textareaRef.current?.focus({ preventScroll: true })}
      >
        <div className="flex items-center justify-between border-b border-border/70 px-4 py-2.5">
          <p className="text-sm font-medium">Źródło</p>
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            className="grid size-9 place-items-center rounded-md hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
            aria-label="Zamknij"
          >
            <X aria-hidden="true" className="size-4" />
          </button>
        </div>
        <div className="max-h-[70vh] space-y-4 overflow-y-auto p-4">
          {selectedSource && <SourceDetail source={selectedSource} />}
          {selectedSources.length > 1 && (
            <SourceList sources={selectedSources} selected={selection?.ref ?? null} onSelect={(ref) => setSelection((current) => current && { ...current, ref })} />
          )}
        </div>
      </dialog>
    </div>
  )
}
