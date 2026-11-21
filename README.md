# projekt

A Next.js monorepo with TypeScript, Tailwind CSS v4, and shadcn/ui, powered by
pnpm workspaces and Turborepo.

## Stack

- **Next.js 16** (App Router, React 19, Turbopack)
- **TypeScript** in strict mode, with shared tsconfig presets
- **Tailwind CSS v4** with CSS-first theming
- **shadcn/ui** components shared from `packages/ui`
- **Turborepo** for task orchestration and caching

## Structure

```
projekt/
├── apps/
│   └── web/                  # Next.js app (App Router)
├── packages/
│   ├── ui/                   # shadcn/ui components, hooks, and styles
│   ├── eslint-config/        # shared ESLint configuration
│   └── typescript-config/    # shared tsconfig presets
├── turbo.json
└── pnpm-workspace.yaml
```

## Getting started

Requires Node.js 20.9+ and pnpm (enabled through Corepack).

```bash
corepack enable pnpm
pnpm install
pnpm dev
```

The app runs at [http://localhost:3000](http://localhost:3000).

## Scripts

| Command                 | Description                          |
| ----------------------- | ------------------------------------ |
| `pnpm dev`              | Start every app in watch mode        |
| `pnpm build`            | Build every workspace                |
| `pnpm lint`             | Lint every workspace                 |
| `pnpm typecheck`        | Type-check every workspace           |
| `pnpm format`           | Format every workspace with Prettier |
| `pnpm --filter web dev` | Start only the web app               |

## Adding shadcn/ui components

Run the shadcn CLI from the app directory. The CLI detects the monorepo and
installs shared components into `packages/ui`.

```bash
pnpm dlx shadcn@latest add card -c apps/web
```

Then import from the workspace package:

```tsx
import { Card } from "@workspace/ui/components/card"
```

Global styles and design tokens live in
`packages/ui/src/styles/globals.css`, and both `components.json` files use the
same style, base color, and icon library.

## Adding another app

Create a new workspace under `apps/` (for example with `create-next-app`),
add `"@workspace/ui": "workspace:*"` to its dependencies, and extend
`@workspace/typescript-config/nextjs.json` in its `tsconfig.json`. Turborepo
picks it up automatically.
