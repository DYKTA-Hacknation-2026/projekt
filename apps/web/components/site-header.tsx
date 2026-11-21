"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"
import { ArrowRight, Menu, Moon, Sun, X } from "lucide-react"
import { useTheme } from "next-themes"

import { Brand } from "@/components/brand"
import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"
import { navItems } from "@/messages/pl"

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function SiteHeader() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const { resolvedTheme, setTheme } = useTheme()

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur-xl">
      <div className="mx-auto flex h-[4.5rem] w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Brand />

        <nav aria-label="Nawigacja główna" className="hidden lg:block">
          <ul className="flex items-center gap-1">
            {navItems.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={
                    isActive(pathname, item.href) ? "page" : undefined
                  }
                  className={cn(
                    "inline-flex h-10 items-center rounded-lg px-3 text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-heading focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
                    isActive(pathname, item.href) &&
                      "bg-accent text-accent-foreground"
                  )}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Zmień motyw jasny lub ciemny"
            title="Zmień motyw jasny lub ciemny"
            onClick={() =>
              setTheme(resolvedTheme === "dark" ? "light" : "dark")
            }
            className="inline-flex size-11 items-center justify-center rounded-lg border border-border bg-background text-foreground transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
          >
            <Moon aria-hidden="true" className="size-5 dark:hidden" />
            <Sun aria-hidden="true" className="hidden size-5 dark:block" />
          </button>
          <Button
            asChild
            className="hidden h-11 px-4 text-sm font-semibold sm:inline-flex"
          >
            <Link href="/start">
              Rozpocznij analizę
              <ArrowRight data-icon="inline-end" aria-hidden="true" />
            </Link>
          </Button>
          <button
            type="button"
            className="inline-flex size-11 items-center justify-center rounded-lg border border-border bg-background text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none lg:hidden"
            aria-expanded={open}
            aria-controls="mobile-nav"
            onClick={() => setOpen((value) => !value)}
          >
            <span className="sr-only">
              {open ? "Zamknij menu nawigacji" : "Otwórz menu nawigacji"}
            </span>
            {open ? (
              <X aria-hidden="true" className="size-5" />
            ) : (
              <Menu aria-hidden="true" className="size-5" />
            )}
          </button>
        </div>
      </div>

      <div
        id="mobile-nav"
        hidden={!open}
        className="border-t border-border bg-background px-4 py-4 lg:hidden"
      >
        <nav aria-label="Nawigacja mobilna">
          <ul className="grid gap-1">
            {navItems.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setOpen(false)}
                  aria-current={
                    isActive(pathname, item.href) ? "page" : undefined
                  }
                  className={cn(
                    "flex min-h-11 items-center rounded-lg px-3 text-sm font-semibold text-muted-foreground hover:bg-muted hover:text-heading focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
                    isActive(pathname, item.href) &&
                      "bg-accent text-accent-foreground"
                  )}
                >
                  {item.label}
                </Link>
              </li>
            ))}
            <li className="pt-2">
              <Button asChild className="h-11 w-full text-sm font-semibold">
                <Link href="/start" onClick={() => setOpen(false)}>
                  Rozpocznij analizę
                  <ArrowRight data-icon="inline-end" aria-hidden="true" />
                </Link>
              </Button>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  )
}
