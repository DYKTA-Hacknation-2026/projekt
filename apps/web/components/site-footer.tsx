import Link from "next/link"

import { Brand } from "@/components/brand"
import { Separator } from "@workspace/ui/components/separator"
import {
  AI_DISCLOSURE,
  APP_NAME,
  LEGAL_DISCLOSURE,
  SIMULATION_DISCLOSURE,
  footerLinks,
} from "@/messages/pl"

const officialLinks = [
  { href: "https://www.zus.pl/", label: "zus.pl" },
  { href: "https://www.gov.pl/web/rodzina/urlop-rodzicielski", label: "gov.pl — urlop rodzicielski" },
  { href: "https://www.pip.gov.pl/", label: "pip.gov.pl" },
]

export function SiteFooter() {
  return (
    <footer className="mt-20 border-t border-border bg-secondary/40">
      <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr]">
          <div className="space-y-4">
            <Brand />
            <p className="max-w-sm text-sm text-pretty text-muted-foreground">
              {LEGAL_DISCLOSURE}
            </p>
            <p className="max-w-sm text-xs text-pretty text-muted-foreground">
              {SIMULATION_DISCLOSURE}
            </p>
          </div>

          <nav aria-label="Nawigacja w stopce">
            <h2 className="text-xs font-semibold tracking-wide text-foreground uppercase">
              Serwis
            </h2>
            <ul className="mt-3 space-y-2 text-sm">
              {footerLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div>
            <h2 className="text-xs font-semibold tracking-wide text-foreground uppercase">
              Źródła oficjalne
            </h2>
            <ul className="mt-3 space-y-2 text-sm">
              {officialLinks.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noreferrer"
                    className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <Separator className="my-8" />

        <div className="flex flex-col gap-3 text-xs text-muted-foreground sm:flex-row sm:items-start sm:justify-between">
          <p>
            © {new Date().getFullYear()} {APP_NAME}. Projekt hackathonowy.
          </p>
          <p className="max-w-2xl text-pretty">{AI_DISCLOSURE}</p>
        </div>
      </div>
    </footer>
  )
}
