import Link from "next/link"
import { ChevronRight, Home } from "lucide-react"

export interface Crumb {
  href?: string
  label: string
}

export function KnowledgeBreadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Ścieżka nawigacji" className="text-sm">
      <ol className="flex flex-wrap items-center gap-1.5 text-muted-foreground">
        <li>
          <Link
            href="/wiedza"
            className="inline-flex items-center gap-1.5 rounded-md px-1 py-0.5 hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
          >
            <Home aria-hidden="true" className="size-3.5" />
            Centrum wiedzy
          </Link>
        </li>
        {items.map((item, index) => (
          <li key={`${item.label}-${index}`} className="flex items-center gap-1.5">
            <ChevronRight aria-hidden="true" className="size-3.5" />
            {item.href ? (
              <Link
                href={item.href}
                className="rounded-md px-1 py-0.5 hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
              >
                {item.label}
              </Link>
            ) : (
              <span aria-current="page" className="px-1 text-foreground">
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}
