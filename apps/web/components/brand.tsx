import Link from "next/link"

import { BrandMark } from "@/components/brand-mark"
import { APP_NAME } from "@/messages/pl"

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link
      href="/"
      className="group flex items-center gap-2.5 rounded-lg focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
    >
      <BrandMark className="size-10 text-primary" />
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
