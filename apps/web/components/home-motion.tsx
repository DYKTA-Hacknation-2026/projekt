"use client"

import { useEffect, useRef, type ReactNode } from "react"
import { animate, inView, scroll } from "framer-motion"

export function HomeMotion({ children }: { children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = root.current
    if (!container) return

    const preference = window.matchMedia("(prefers-reduced-motion: reduce)")
    let dispose = () => {}

    function setup() {
      dispose()
      if (preference.matches || !container) return

      const animations: ReturnType<typeof animate>[] = []
      const elements = Array.from(
        container.querySelectorAll<HTMLElement>("[data-reveal]")
      )
      // Keep the server-rendered content visible until it actually enters view.
      const stopReveals = elements.map((element) =>
        inView(
          element,
          () => {
            const kind = element.dataset.reveal
            const siblings = Array.from(
              element.parentElement?.children ?? []
            ).filter((child) => child.getAttribute("data-reveal") === "item")
            const delay =
              kind === "item"
                ? Math.min(siblings.indexOf(element), 3) * 0.07
                : 0
            animations.push(
              animate(
                element,
                kind === "photo"
                  ? { opacity: [0.75, 1], scale: [0.97, 1] }
                  : {
                      opacity: [0.65, 1],
                      y: [kind === "heading" ? 24 : 16, 0],
                    },
                {
                  duration: kind === "photo" ? 0.9 : 0.7,
                  delay,
                  ease: [0.16, 1, 0.3, 1],
                }
              )
            )
          },
          { margin: "0px 0px -6% 0px" }
        )
      )

      const hero = container.querySelector<HTMLElement>(".home-hero")
      const image = hero?.querySelector<HTMLImageElement>(
        ".home-hero__photo img"
      )
      let stopScroll = () => {}
      if (hero && image) {
        const drift = animate(
          image,
          { scale: [1, 1.08], y: ["0%", "3%"] },
          { ease: "linear" }
        )
        animations.push(drift)
        stopScroll = scroll(drift, {
          target: hero,
          offset: ["start start", "end start"],
        })
      }

      dispose = () => {
        stopReveals.forEach((stop) => stop())
        stopScroll()
        animations.forEach((animation) => animation.cancel())
        // Also restore the static composition when reduced motion changes live.
        for (const element of [...elements, ...(image ? [image] : [])]) {
          element.style.removeProperty("transform")
          element.style.removeProperty("opacity")
        }
      }
    }

    setup()
    preference.addEventListener("change", setup)
    return () => {
      preference.removeEventListener("change", setup)
      dispose()
    }
  }, [])

  return (
    <div ref={root} className="home">
      {children}
    </div>
  )
}
