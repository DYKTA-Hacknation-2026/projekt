import { Info } from "lucide-react"

import { SIMULATION_DISCLOSURE } from "@/messages/pl"

export function SimulationBanner() {
  return (
    <div className="border-b border-white/10 bg-brand-navy">
      <div className="mx-auto flex w-full max-w-6xl items-start gap-2.5 px-4 py-2 text-xs text-white sm:items-center sm:px-6">
        <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0 sm:mt-0" />
        <p className="text-pretty">
          <span className="font-semibold tracking-wide text-brand-amber uppercase">
            Symulacja.
          </span>{" "}
          {SIMULATION_DISCLOSURE}
        </p>
      </div>
    </div>
  )
}
