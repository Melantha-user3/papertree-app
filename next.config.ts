import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  turbopack: {
    root: process.cwd(),
    resolveAlias: {
      canvas: "./lib/shims/canvas-stub.js",
    },
  },
  webpack: (config) => {
    config.resolve ??= {};
    config.resolve.fallback = {
      ...config.resolve.fallback,
      canvas: false,
    };
    return config;
  },
};

export default nextConfig;
