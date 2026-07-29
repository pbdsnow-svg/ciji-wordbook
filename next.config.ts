import type { NextConfig } from "next";

const isGitHubPages = process.env.GITHUB_PAGES === "true";
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const nextConfig: NextConfig = {
  assetPrefix: isGitHubPages ? basePath : undefined,
  basePath: isGitHubPages ? basePath : undefined,
  images: {
    unoptimized: isGitHubPages,
  },
  output: isGitHubPages ? "export" : undefined,
  poweredByHeader: false,
  reactStrictMode: true,
  trailingSlash: isGitHubPages,
};

export default nextConfig;
