import type { NextConfig } from "next";

// @ts-expect-error next-pwa has CommonJS-ish types
import withPWAInit from "next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
});

const nextConfig: NextConfig = {
  transpilePackages: ["@fulltech/shared", "@fulltech/crypto"],
  experimental: {
    // Keep App Router stable behavior
  },
  async rewrites() {
    const target = (process.env.API_PROXY_TARGET || "http://localhost:4000").replace(/\/$/, "");
    return [{ source: "/api/:path*", destination: `${target}/:path*` }];
  },
};

export default withPWA(nextConfig);
