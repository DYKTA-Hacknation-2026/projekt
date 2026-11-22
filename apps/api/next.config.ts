import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  transpilePackages: [
    "@zpr/data-sources",
    "@zpr/domain",
    "@zpr/contracts",
    "@zpr/db",
    "@zpr/rag",
    "@zpr/ai",
    "@zpr/documents",
  ],
  serverExternalPackages: ["unpdf"],
}

export default nextConfig
