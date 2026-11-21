import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  transpilePackages: [
    "@workspace/ui",
    "@zpr/domain",
    "@zpr/contracts",
    "@zpr/db",
    "@zpr/rag",
    "@zpr/ai",
  ],
  // PDF extraction is only used by CLI ingestion; keep it out of the bundle.
  serverExternalPackages: ["unpdf"],
}

export default nextConfig
