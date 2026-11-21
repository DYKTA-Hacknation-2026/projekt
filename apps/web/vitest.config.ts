import { fileURLToPath } from "node:url"

import { defineConfig } from "vitest/config"

const root = fileURLToPath(new URL(".", import.meta.url))
const workspace = fileURLToPath(new URL("../..", import.meta.url))

export default defineConfig({
  resolve: {
    alias: {
      "@": root,
      "@workspace/ui": `${workspace}/packages/ui/src`,
      "@zpr/domain/testing": `${workspace}/packages/domain/src/testing.ts`,
      "@zpr/domain/engine": `${workspace}/packages/domain/src/engine/index.ts`,
      "@zpr/domain": `${workspace}/packages/domain/src/index.ts`,
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    reporters: ["default"],
  },
})
