import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  distDir: "dist",
  poweredByHeader: false,
  reactStrictMode: true,
};

export default nextConfig;
