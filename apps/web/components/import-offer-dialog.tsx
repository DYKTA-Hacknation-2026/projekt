"use client"

import { useRouter } from "next/navigation"
import { useEffect, useRef } from "react"
import { ArrowRight, Download, PenLine, ShieldCheck, X } from "lucide-react"

import { mobywatel as copy } from "@/messages/pl"

/**
 * Shown once, right after a simulated mObywatel login, when the user lands on
 * the wizard with `?import-offer=1`. Offers the two ways forward: retrieve
 * data from the simulated institutions or fill the form manually.
 */
export function ImportOfferDialog() {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const primaryActionRef = useRef<HTMLButtonElement>(null)
  const router = useRouter()
  const downloadRef = useRef(false)
  const manualRef = useRef(false)

  useEffect(() => {
    const dialog = dialogRef.current
    if (dialog && !dialog.open) {
      dialog.showModal()
      primaryActionRef.current?.focus()
    }
  }, [])

  function download() {
    downloadRef.current = true
    router.push("/dane")
  }

  function continueManually() {
    manualRef.current = true
    dialogRef.current?.close()
  }

  function handleClose() {
    if (downloadRef.current) return

    // Keep the offer from reopening on refresh or "back" from the wizard.
    window.history.replaceState(null, "", "/start")

    if (manualRef.current) {
      requestAnimationFrame(() => {
        document
          .getElementById("wizard")
          ?.scrollIntoView({ behavior: "smooth", block: "start" })
      })
    }
  }

  const offer = copy.importOffer

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="import-offer-title"
      aria-describedby="import-offer-description"
      onClose={handleClose}
      className="m-auto w-[min(100vw-2rem,36rem)] rounded-xl border border-border bg-card p-0 text-foreground shadow-xl backdrop:bg-black/50"
    >
      <div className="flex items-start justify-between gap-4 border-b border-border/70 px-5 py-4">
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
            <ShieldCheck aria-hidden="true" className="size-5" />
          </span>
          <div>
            <h2 id="import-offer-title" className="text-base font-semibold">
              {offer.title}
            </h2>
            <p
              id="import-offer-description"
              className="mt-1 text-sm text-pretty text-muted-foreground"
            >
              {offer.lead}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => dialogRef.current?.close()}
          className="grid size-9 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
          aria-label={offer.close}
        >
          <X aria-hidden="true" className="size-4" />
        </button>
      </div>

      <div className="space-y-3 px-5 py-4">
        <button
          ref={primaryActionRef}
          type="button"
          onClick={download}
          className="group flex w-full items-start gap-3 rounded-lg border border-primary/40 bg-primary/5 p-4 text-left transition-colors hover:border-primary hover:bg-primary/10 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          <Download
            aria-hidden="true"
            className="mt-0.5 size-5 shrink-0 text-primary"
          />
          <span className="min-w-0 flex-1">
            <span className="flex items-center justify-between gap-2 font-medium">
              {offer.download}
              <ArrowRight
                aria-hidden="true"
                className="size-4 shrink-0 text-primary transition-transform group-hover:translate-x-0.5"
              />
            </span>
            <span className="mt-1 block text-sm text-pretty text-muted-foreground">
              {offer.downloadHint}
            </span>
          </span>
        </button>

        <button
          type="button"
          onClick={continueManually}
          className="group flex w-full items-start gap-3 rounded-lg border border-border/70 p-4 text-left transition-colors hover:border-primary/50 hover:bg-secondary/40 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          <PenLine
            aria-hidden="true"
            className="mt-0.5 size-5 shrink-0 text-muted-foreground"
          />
          <span className="min-w-0 flex-1">
            <span className="flex items-center justify-between gap-2 font-medium">
              {offer.manual}
              <ArrowRight
                aria-hidden="true"
                className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
              />
            </span>
            <span className="mt-1 block text-sm text-pretty text-muted-foreground">
              {offer.manualHint}
            </span>
          </span>
        </button>
      </div>

      <div className="border-t border-border/70 px-5 py-3">
        <p className="text-xs text-pretty text-muted-foreground">{offer.note}</p>
      </div>
    </dialog>
  )
}
