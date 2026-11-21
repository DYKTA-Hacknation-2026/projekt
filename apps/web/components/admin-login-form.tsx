"use client"

import { useRouter } from "next/navigation"
import { useState, type FormEvent } from "react"
import { AlertTriangle, Loader2, LockKeyhole } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@workspace/ui/components/alert"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"

export function AdminLoginForm({ next }: { next?: string }) {
  const router = useRouter()
  const [email, setEmail] = useState("admin@zpr.local")
  const [password, setPassword] = useState("")
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPending(true)
    setError(null)

    try {
      const response = await fetch("/api/v1/admin/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
      })
      const data = (await response.json()) as {
        detail?: string
        redirect?: string
      }

      if (!response.ok) {
        throw new Error(data.detail ?? "Nie udało się zalogować.")
      }

      const target =
        next && next.startsWith("/admin") ? next : (data.redirect ?? "/admin")
      router.push(target)
      router.refresh()
    } catch (loginError) {
      setError(
        loginError instanceof Error
          ? loginError.message
          : "Wystąpił nieoczekiwany błąd."
      )
    } finally {
      setPending(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="admin-email">E-mail administratora</Label>
        <Input
          id="admin-email"
          type="email"
          autoComplete="username"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="admin-password">Hasło</Label>
        <Input
          id="admin-password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
      </div>

      <div aria-live="polite">
        {error && (
          <Alert variant="destructive">
            <AlertTriangle aria-hidden="true" />
            <AlertTitle>Odmowa dostępu</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </div>

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? (
          <Loader2 aria-hidden="true" className="animate-spin" />
        ) : (
          <LockKeyhole aria-hidden="true" />
        )}
        {pending ? "Weryfikuję…" : "Zaloguj się"}
      </Button>
    </form>
  )
}
