"use client"

import Link from "next/link"
import { useEffect } from "react"
import { AlertTriangle, RotateCcw } from "lucide-react"

import { Button } from "@workspace/ui/components/button"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="mx-auto flex min-h-[60svh] w-full max-w-2xl flex-col items-center justify-center gap-4 px-4 py-16 text-center">
      <span className="grid size-12 place-items-center rounded-full bg-destructive/10 text-destructive">
        <AlertTriangle aria-hidden="true" className="size-6" />
      </span>
      <h1 className="text-2xl font-semibold tracking-tight">
        Coś poszło nie tak
      </h1>
      <p className="max-w-md text-sm text-pretty text-muted-foreground">
        Strona nie mogła się wyrenderować. Spróbuj ponownie albo wróć do panelu.
        Jeśli błąd dotyczy bazy, sprawdź instrukcję uruchomienia w README.
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        <Button type="button" onClick={reset}>
          <RotateCcw aria-hidden="true" />
          Spróbuj ponownie
        </Button>
        <Button asChild variant="outline">
          <Link href="/">Strona główna</Link>
        </Button>
      </div>
    </div>
  )
}
