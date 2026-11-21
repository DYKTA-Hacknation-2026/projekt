import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  transpilePackages: ["@zpr/domain", "@zpr/contracts", "@zpr/db"],
}

export default nextConfig
