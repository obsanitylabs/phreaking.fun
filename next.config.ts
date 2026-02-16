import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    formats: ["image/webp"],
    minimumCacheTTL: 60,
    dangerouslyAllowSVG: true,
    contentDispositionType: "inline",
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    unoptimized: false,
  },
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === "production",
  },
  poweredByHeader: false,
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: false,
  },
  logging: {
    fetches: {
      fullUrl: process.env.NODE_ENV === "development",
    },
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
      };
    }
    return config;
  },
};

export default nextConfig;
