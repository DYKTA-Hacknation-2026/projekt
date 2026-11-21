import { fileURLToPath } from "node:url"

import { defineConfig } from "vitest/config"

const root = fileURLToPath(new URL(".", import.meta.url))
const workspace = fileURLToPath(new URL("../..", import.meta.url))

export default defineConfig({
  resolve: {
    alias: {
      "@": root,
      "@zpr/domain/testing": `${workspace}/packages/domain/src/testing.ts`,
      "@zpr/domain/engine": `${workspace}/packages/domain/src/engine/index.ts`,
      "@zpr/domain": `${workspace}/packages/domain/src/index.ts`,
      "@zpr/db/client": `${workspace}/packages/db/src/client.ts`,
      "@zpr/db/health": `${workspace}/packages/db/src/health.ts`,
      "@zpr/db/repositories": `${workspace}/packages/db/src/repositories/index.ts`,
      "@zpr/db/embeddings": `${workspace}/packages/db/src/embeddings.ts`,
      "@zpr/db/schema": `${workspace}/packages/db/src/schema/index.ts`,
      "@zpr/db": `${workspace}/packages/db/src/index.ts`,
      "@zpr/documents/samples": `${workspace}/packages/documents/src/samples/index.ts`,
      "@zpr/documents/storage": `${workspace}/packages/documents/src/storage/index.ts`,
      "@zpr/documents/pdf": `${workspace}/packages/documents/src/pdf/index.ts`,
      "@zpr/documents": `${workspace}/packages/documents/src/index.ts`,
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    reporters: ["default"],
  },
})
