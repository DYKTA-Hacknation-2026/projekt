import { Info } from "lucide-react"

import Link from "next/link"

export function SimulationBanner() {
  return (
    <div className="bg-secondary">
      <div className="mx-auto flex w-full max-w-[1320px] items-start gap-2.5 px-4 py-2 text-[13px] text-foreground sm:items-center sm:px-6">
        <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0 sm:mt-0" />
        <p className="text-pretty">
          <span className="font-semibold text-heading">Symulacja.</span> Dane i
          integracje są demonstracyjne. To nie jest serwis ZUS.{" "}
          <Link href="/o-projekcie" className="underline underline-offset-2">
            O projekcie
          </Link>
        </p>
      </div>
    </div>
  )
}
