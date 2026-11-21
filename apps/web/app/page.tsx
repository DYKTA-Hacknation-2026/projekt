import { ArrowUpRight, Layers, Palette, Terminal, Zap } from "lucide-react"

import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"

const stack = [
  {
    icon: Zap,
    title: "Next.js 16",
    description: "App Router, React 19, and Turbopack.",
  },
  {
    icon: Terminal,
    title: "TypeScript",
    description: "Strict mode with shared configs for every workspace.",
  },
  {
    icon: Palette,
    title: "Tailwind CSS v4",
    description: "CSS-first theming backed by design tokens.",
  },
  {
    icon: Layers,
    title: "shadcn/ui",
    description: "One component library, shared from packages/ui.",
  },
]

export default function Page() {
  return (
    <main className="mx-auto flex min-h-svh w-full max-w-4xl flex-col justify-center gap-10 px-6 py-16">
      <div className="flex flex-col items-start gap-4">
        <Badge variant="secondary">Monorepo ready</Badge>
        <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
          A Next.js starter with everything wired up.
        </h1>
        <p className="max-w-xl text-muted-foreground">
          TypeScript, Tailwind CSS, and shadcn/ui in a pnpm + Turborepo
          workspace. Add a component once and use it everywhere.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <a href="https://nextjs.org/docs" target="_blank" rel="noreferrer">
              Read the docs
              <ArrowUpRight />
            </a>
          </Button>
          <Button variant="outline" asChild>
            <a
              href="https://ui.shadcn.com/docs/monorepo"
              target="_blank"
              rel="noreferrer"
            >
              shadcn monorepo guide
            </a>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {stack.map(({ icon: Icon, title, description }) => (
          <Card key={title}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Icon className="size-4 text-muted-foreground" />
                {title}
              </CardTitle>
              <CardDescription>{description}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>

      <p className="text-xs text-muted-foreground">
        Press <kbd className="rounded border px-1">d</kbd> to toggle dark mode.
        Components live in <code>packages/ui</code>.
      </p>
    </main>
  )
}
