import { Info } from "lucide-react"

import { SIMULATION_DISCLOSURE } from "@/messages/pl"

export function SimulationBanner() {
  return (
    <div className="border-b border-warning/40 bg-warning/15">
      <div className="mx-auto flex w-full max-w-6xl items-start gap-2.5 px-4 py-2 text-xs text-warning-foreground sm:items-center sm:px-6">
        <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0 sm:mt-0" />
        <p className="text-pretty">
          <span className="font-semibold uppercase tracking-wide">Symulacja.</span>{" "}
          {SIMULATION_DISCLOSURE}
        </p>
      </div>
    </div>
  )
}
