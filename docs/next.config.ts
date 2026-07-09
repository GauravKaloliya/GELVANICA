import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  basePath: process.env.NEXT_PUBLIC_DOCS_BASE_PATH ?? "/api/v1/docs",
  images: {
    unoptimized: true,
  },
};

export default nextConfig;