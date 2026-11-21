"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { cn } from "@workspace/ui/lib/utils"

const links = [
  { href: "/wiedza", label: "Przegląd" },
  { href: "/wiedza/faq", label: "FAQ" },
  { href: "/wiedza/artykuly", label: "Artykuły" },
  { href: "/wiedza/dokumenty", label: "Dokumenty" },
  { href: "/wiedza/przewodniki", label: "Przewodniki" },
  { href: "/wiedza/slownik", label: "Słownik" },
  { href: "/wiedza/zrodla", label: "Źródła" },
]

export function KnowledgeSubnav() {
  const pathname = usePathname()

  return (
    <nav
      aria-label="Sekcje Centrum wiedzy"
      className="border-b border-border/70 bg-background/70"
    >
      <div className="mx-auto w-full max-w-6xl overflow-x-auto px-4 sm:px-6">
        <ul className="flex min-w-max items-center gap-1 py-2">
          {links.map((link) => {
            const active =
              link.href === "/wiedza"
                ? pathname === "/wiedza"
                : pathname === link.href ||
                  pathname.startsWith(`${link.href}/`) ||
                  (link.href === "/wiedza/artykuly" &&
                    (pathname.startsWith("/wiedza/kategoria/") ||
                      pathname.startsWith("/wiedza/artykul/")))
            return (
              <li key={link.href}>
                <Link
                  href={link.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "inline-flex h-9 items-center rounded-lg px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
                    active && "bg-secondary text-foreground shadow-sm"
                  )}
                >
                  {link.label}
                </Link>
              </li>
            )
          })}
        </ul>
      </div>
    </nav>
  )
}
