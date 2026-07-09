import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  basePath: process.env.NEXT_PUBLIC_FRONTEND_BASE_PATH ?? "/app",
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
