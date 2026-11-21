import Link from "next/link"
import { Search } from "lucide-react"

import { Button } from "@workspace/ui/components/button"

export default function NotFoundPage() {
  return (
    <div className="mx-auto flex min-h-[60svh] w-full max-w-2xl flex-col items-center justify-center gap-4 px-4 py-16 text-center">
      <span className="grid size-12 place-items-center rounded-full bg-secondary text-primary">
        <Search aria-hidden="true" className="size-6" />
      </span>
      <p className="font-mono text-xs tracking-widest text-muted-foreground">
        404
      </p>
      <h1 className="text-2xl font-semibold tracking-tight">
        Nie znaleźliśmy tej strony
      </h1>
      <p className="max-w-md text-sm text-pretty text-muted-foreground">
        Może adres się zmienił. Wróć do panelu, kalkulatora albo kreatora sprawy.
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        <Button asChild>
          <Link href="/panel">Panel sprawy</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/kalkulator">Kalkulator</Link>
        </Button>
      </div>
    </div>
  )
}
