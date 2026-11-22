"use client"

import type { ReactNode } from "react"
import { Info } from "lucide-react"

import { cn } from "@workspace/ui/lib/utils"

export function ChoiceCard({
  name,
  checked,
  onSelect,
  title,
  description,
  hint,
  disabled,
}: {
  name: string
  checked: boolean
  onSelect: () => void
  title: string
  description: string
  hint?: string
  disabled?: boolean
}): ReactNode {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-start gap-2.5 rounded-lg border p-3 text-sm transition-colors focus-within:ring-2 focus-within:ring-ring",
        checked
          ? "border-primary bg-primary/5 ring-1 ring-primary/30"
          : "border-border/70 hover:bg-muted/40",
        disabled && "cursor-not-allowed opacity-60"
      )}
    >
      <input
        type="radio"
        name={name}
        className="mt-0.5 size-4 accent-[var(--primary)]"
        checked={checked}
        disabled={disabled}
        onChange={onSelect}
      />
      <span>
        <span className="font-medium">{title}</span>
        <span className="block text-xs text-pretty text-muted-foreground">
          {description}
        </span>
        {hint && (
          <span className="mt-1 block text-xs text-pretty text-muted-foreground/90">
            {hint}
          </span>
        )}
      </span>
    </label>
  )
}

export function FieldHint({
  children,
  more,
  id,
  className,
}: {
  children: ReactNode
  more?: ReactNode
  id?: string
  className?: string
}): ReactNode {
  return (
    <div id={id} className={cn("space-y-1 text-xs text-pretty", className)}>
      <p className="text-muted-foreground">{children}</p>
      {more && (
        <details className="group">
          <summary className="inline-flex cursor-pointer list-none items-center gap-1 text-xs font-medium text-primary underline-offset-4 hover:underline">
            <Info aria-hidden="true" className="size-3.5" />
            Więcej informacji
          </summary>
          <div className="mt-1 rounded-md border border-border/60 bg-secondary/40 p-2 text-xs text-pretty text-muted-foreground">
            {more}
          </div>
        </details>
      )}
    </div>
  )
}

export function StepHeading({
  step,
  total,
  title,
  lead,
}: {
  step: number
  total: number
  title: string
  lead: string
}): ReactNode {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium tracking-wide text-primary uppercase">
        Krok {step} z {total}
      </p>
      <h2 className="text-xl font-semibold tracking-tight text-balance">
        {title}
      </h2>
      <p className="text-sm text-pretty text-muted-foreground">{lead}</p>
    </div>
  )
}
