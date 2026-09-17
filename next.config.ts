import type { NextConfig } from "next";

const isGitHubPages = process.env.GITHUB_PAGES === "true";
const isSitesStaticExport = process.env.SITES_STATIC_EXPORT === "true";
const isStaticExport = isGitHubPages || isSitesStaticExport;
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const nextConfig: NextConfig = {
  assetPrefix: isGitHubPages ? basePath : undefined,
  basePath: isGitHubPages ? basePath : undefined,
  images: {
    unoptimized: isStaticExport,
  },
  output: isStaticExport ? "export" : undefined,
  poweredByHeader: false,
  reactStrictMode: true,
  trailingSlash: isGitHubPages,
};

export default nextConfig;
