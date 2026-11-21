"use client"

import { useState, type FormEvent } from "react"
import {
  AlertTriangle,
  Bot,
  ExternalLink,
  Loader2,
  MessagesSquare,
  Send,
  Sparkles,
  User,
} from "lucide-react"

import { AI_DISCLOSURE } from "@zpr/contracts"
import type { AssistantCitation } from "@zpr/contracts/assistant"
import { Alert, AlertDescription, AlertTitle } from "@workspace/ui/components/alert"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { Textarea } from "@workspace/ui/components/textarea"
import { cn } from "@workspace/ui/lib/utils"

interface ChatMessage {
  id: string
  role: "USER" | "ASSISTANT"
  content: string
  citations?: AssistantCitation[]
}

const suggestions = [
  "Ile trwa urlop macierzyński przy jednym dziecku?",
  "Jestem na zleceniu od 2 miesięcy. Czy dostanę L4 płatne?",
  "Ile tygodni macierzyńskiego przy trojaczkach?",
  "Mąż chce wziąć część urlopu rodzicielskiego. Jak to podzielić?",
]

const welcome: ChatMessage = {
  id: "welcome",
  role: "ASSISTANT",
  content:
    "Dzień dobry. Odpowiadam na podstawie zaindeksowanych źródeł: Kodeksu pracy, ustawy zasiłkowej i poradnika ZUS. Wskażę fragment i podstawę prawną. Nie wyliczam kwot — od tego jest kalkulator.",
}

type Reply = {
  conversationId: string
  messageId: string
  content: string
  citations: AssistantCitation[]
  simulated: true
  aiDisclosure: string
  detail?: string
}

export function AssistantChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([welcome])
  const [conversationId, setConversationId] = useState<string | undefined>()
  const [input, setInput] = useState("")
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function send(message: string) {
    const trimmed = message.trim()
    if (trimmed.length < 2 || pending) return

    setError(null)
    setPending(true)
    setInput("")
    setMessages((current) => [
      ...current,
      { id: crypto.randomUUID(), role: "USER", content: trimmed },
    ])

    try {
      const response = await fetch("/api/v1/assistant/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: trimmed, conversationId }),
      })
      const data = (await response.json()) as Reply

      if (!response.ok) {
        throw new Error(data.detail ?? "Asystent nie może teraz odpowiedzieć.")
      }

      setConversationId(data.conversationId)
      setMessages((current) => [
        ...current,
        {
          id: data.messageId,
          role: "ASSISTANT",
          content: data.content,
          citations: data.citations,
        },
      ])
    } catch (sendError) {
      setError(
        sendError instanceof Error
          ? sendError.message
          : "Wystąpił nieoczekiwany błąd."
      )
    } finally {
      setPending(false)
    }
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void send(input)
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.5fr_0.9fr] lg:items-start">
      <Card className="overflow-hidden">
        <CardHeader className="border-b border-border/70">
          <CardTitle className="flex items-center gap-2">
            <MessagesSquare aria-hidden="true" className="size-4 text-primary" />
            Rozmowa z asystentem
          </CardTitle>
          <CardDescription>
            Każda odpowiedź przechowuje cytaty i wywołanie narzędzia
            wyszukiwania. Historia jest widoczna w bazie demo.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4 p-4">
          <div
            role="log"
            aria-live="polite"
            aria-relevant="additions"
            className="max-h-[28rem] space-y-4 overflow-y-auto pr-1"
          >
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "flex gap-3",
                  message.role === "USER" && "flex-row-reverse"
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "grid size-8 shrink-0 place-items-center rounded-full",
                    message.role === "USER"
                      ? "bg-secondary text-secondary-foreground"
                      : "bg-primary text-primary-foreground"
                  )}
                >
                  {message.role === "USER" ? (
                    <User className="size-4" />
                  ) : (
                    <Bot className="size-4" />
                  )}
                </span>
                <div
                  className={cn(
                    "max-w-[85%] rounded-xl border px-3.5 py-2.5 text-sm",
                    message.role === "USER"
                      ? "border-border bg-secondary text-secondary-foreground"
                      : "border-border/70 bg-card"
                  )}
                >
                  <p className="text-pretty whitespace-pre-line">
                    {message.content}
                  </p>

                  {message.citations && message.citations.length > 0 && (
                    <div className="mt-3 space-y-2 border-t border-border/70 pt-2.5">
                      <p className="text-xs font-medium text-muted-foreground">
                        Źródła
                      </p>
                      <ul className="space-y-2">
                        {message.citations.map((citation, index) => (
                          <li
                            key={citation.chunkId}
                            className="rounded-lg bg-muted/60 p-2.5 text-xs"
                          >
                            <div className="flex flex-wrap items-center gap-1.5">
                              <Badge variant="outline" className="font-mono text-[10px]">
                                S{index + 1}
                              </Badge>
                              <span className="font-medium">
                                {citation.sourceTitle}
                              </span>
                            </div>
                            {citation.legalReference && (
                              <p className="mt-0.5 text-muted-foreground">
                                {citation.legalReference}
                              </p>
                            )}
                            <details className="mt-1">
                              <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                                Pokaż cytat
                              </summary>
                              <blockquote className="mt-1 border-l-2 border-border pl-2 text-pretty text-muted-foreground">
                                {citation.quote}
                              </blockquote>
                            </details>
                            {citation.sourceUrl && (
                              <a
                                href={citation.sourceUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="mt-1 inline-flex items-center gap-1 text-primary underline-offset-4 hover:underline"
                              >
                                Otwórz źródło
                                <ExternalLink aria-hidden="true" className="size-3" />
                              </a>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {pending && (
              <div className="flex gap-3">
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground">
                  <Bot aria-hidden="true" className="size-4" />
                </span>
                <div className="flex items-center gap-2 rounded-xl border border-border/70 bg-card px-3.5 py-2.5 text-sm text-muted-foreground">
                  <Loader2 aria-hidden="true" className="size-3.5 animate-spin" />
                  Szukam w źródłach…
                </div>
              </div>
            )}
          </div>

          <form onSubmit={onSubmit} className="space-y-3 border-t border-border/70 pt-4">
            <label htmlFor="assistant-message" className="sr-only">
              Twoje pytanie
            </label>
            <Textarea
              id="assistant-message"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Np. Czy urlop ojcowski przysługuje na zleceniu?"
              rows={3}
              maxLength={4000}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault()
                  void send(input)
                }
              }}
            />
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-muted-foreground">
                Enter wysyła, Shift+Enter dodaje nową linię.
              </p>
              <Button type="submit" disabled={pending || input.trim().length < 2}>
                {pending ? (
                  <Loader2 aria-hidden="true" className="animate-spin" />
                ) : (
                  <Send aria-hidden="true" />
                )}
                Wyślij
              </Button>
            </div>
            <div aria-live="polite">
              {error && (
                <Alert variant="destructive">
                  <AlertTriangle aria-hidden="true" />
                  <AlertTitle>Błąd asystenta</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles aria-hidden="true" className="size-4 text-primary" />
              Spróbuj zapytać
            </CardTitle>
            <CardDescription>
              Przykłady z dokumentacji scenariuszy. Kliknięcie wysyła pytanie.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {suggestions.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => void send(suggestion)}
                disabled={pending}
                className="w-full rounded-lg border border-border/70 px-3 py-2 text-left text-sm text-pretty transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none disabled:opacity-50"
              >
                {suggestion}
              </button>
            ))}
          </CardContent>
        </Card>

        <Alert variant="info">
          <Bot aria-hidden="true" />
          <AlertTitle>Ujawnienie AI</AlertTitle>
          <AlertDescription>{AI_DISCLOSURE}</AlertDescription>
        </Alert>

        <Alert variant="warning">
          <AlertTriangle aria-hidden="true" />
          <AlertTitle>Asystent nie zna twojej sprawy</AlertTitle>
          <AlertDescription>
            Odpowiada na podstawie ogólnych źródeł. Nie widzi twoich danych z
            kreatora, dopóki nie dodasz ich świadomie w przyszłej wersji.
          </AlertDescription>
        </Alert>
      </div>
    </div>
  )
}
