import Link from "next/link"

import { APP_NAME, APP_SHORT_NAME } from "@/messages/pl"

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link
      href="/"
      className="group flex items-center gap-2.5 rounded-lg focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
    >
      <span
        aria-hidden="true"
        className="grid size-9 place-items-center rounded-full bg-brand-navy text-sm font-semibold tracking-tight text-white"
      >
        {APP_SHORT_NAME}
      </span>
      <span className="sr-only min-[360px]:hidden">{APP_NAME}</span>
      <span className="hidden flex-col leading-tight min-[360px]:flex">
        <span className="text-sm font-semibold tracking-tight">{APP_NAME}</span>
        {!compact && (
          <span className="text-[11px] text-muted-foreground">
            Przewodnik dla rodziców
          </span>
        )}
      </span>
    </Link>
  )
}
