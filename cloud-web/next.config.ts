import type { NextConfig } from "next";
import bundleAnalyzer from "@next/bundle-analyzer";

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

const nextConfig: NextConfig = {
  output: "standalone",
  basePath: process.env.NEXT_PUBLIC_CLOUD_WEB_BASE_PATH ?? "/app",
  assetPrefix: process.env.NEXT_PUBLIC_CLOUD_WEB_BASE_PATH ?? "/app",
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "api.dicebear.com",
      },
    ],
    minimumCacheTTL: 60 * 60 * 24 * 30,
  },
  async redirects() {
    return [
      {
        source: "/",
        destination: "/app",
        basePath: false,
        permanent: true,
      },
    ];
  },
  poweredByHeader: false,
  reactStrictMode: true,
  compress: true,
  productionBrowserSourceMaps: false,
};

export default withBundleAnalyzer(nextConfig);
