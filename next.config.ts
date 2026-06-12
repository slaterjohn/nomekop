import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standalone tracing is for the Docker image; `next start` (dev/e2e) rejects it.
  output: process.env.STANDALONE === "1" ? "standalone" : undefined,
  images: {
    remotePatterns: [{ protocol: "https", hostname: "images.pokemontcg.io" }],
  },
};

export default nextConfig;
