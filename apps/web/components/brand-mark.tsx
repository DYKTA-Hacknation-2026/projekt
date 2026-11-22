import { cn } from "@workspace/ui/lib/utils"

/**
 * The compass mark: a thin ring, a four-point compass rose and an amber north tip.
 * It inherits `currentColor`, so the caller decides the green and the dark-mode variant.
 */
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      aria-hidden="true"
      focusable="false"
      className={cn("size-9 shrink-0", className)}
    >
      <circle
        cx="24"
        cy="24"
        r="21.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="3.2"
      />
      <path
        d="M24 5.5 28.8 19.2 42.5 24 28.8 28.8 24 42.5 19.2 28.8 5.5 24 19.2 19.2Z"
        fill="currentColor"
      />
      <path d="M24 5.5 28.8 19.2 24 24 19.2 19.2Z" fill="#fab856" />
    </svg>
  )
}
