import { fileURLToPath } from "node:url"

import { defineConfig } from "vitest/config"

const root = fileURLToPath(new URL(".", import.meta.url))
const workspace = fileURLToPath(new URL("../..", import.meta.url))

export default defineConfig({
  resolve: {
    alias: {
      "@": root,
      "@workspace/ui": `${workspace}/packages/ui/src`,
      "@zpr/domain": `${workspace}/packages/domain/src/index.ts`,
      "@zpr/contracts/env": `${workspace}/packages/contracts/src/env.ts`,
      "@zpr/contracts/onboarding": `${workspace}/packages/contracts/src/onboarding.ts`,
      "@zpr/contracts/calculator": `${workspace}/packages/contracts/src/calculator.ts`,
      "@zpr/contracts/assistant-tools": `${workspace}/packages/contracts/src/assistant-tools.ts`,
      "@zpr/contracts/assistant": `${workspace}/packages/contracts/src/assistant.ts`,
      "@zpr/contracts/knowledge": `${workspace}/packages/contracts/src/knowledge.ts`,
      "@zpr/contracts/mobywatel": `${workspace}/packages/contracts/src/mobywatel.ts`,
      "@zpr/contracts/data-import": `${workspace}/packages/contracts/src/data-import.ts`,
      "@zpr/contracts/common": `${workspace}/packages/contracts/src/common.ts`,
      "@zpr/contracts": `${workspace}/packages/contracts/src/index.ts`,
      "@zpr/data-sources": `${workspace}/packages/data-sources/src/index.ts`,
      "@zpr/db/client": `${workspace}/packages/db/src/client.ts`,
      "@zpr/db/health": `${workspace}/packages/db/src/health.ts`,
      "@zpr/db/repositories": `${workspace}/packages/db/src/repositories/index.ts`,
      "@zpr/db/embeddings": `${workspace}/packages/db/src/embeddings.ts`,
      "@zpr/db/schema": `${workspace}/packages/db/src/schema/index.ts`,
      "@zpr/db": `${workspace}/packages/db/src/index.ts`,
      "@zpr/ai": `${workspace}/packages/ai/src/index.ts`,
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    reporters: ["default"],
  },
})
