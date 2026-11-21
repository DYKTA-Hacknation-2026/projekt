import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  transpilePackages: ["@workspace/ui", "@zpr/domain", "@zpr/contracts"],
}

export default nextConfig
