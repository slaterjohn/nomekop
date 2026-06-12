import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standalone tracing is for the Docker image; `next start` (dev/e2e) rejects it.
  output: process.env.STANDALONE === "1" ? "standalone" : undefined,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.pokemontcg.io" },
      // Sets released 2026+ host images on scrydex.
      { protocol: "https", hostname: "images.scrydex.com" },
      // Pixel Pokédex icons (PokeAPI sprites repo only).
      { protocol: "https", hostname: "raw.githubusercontent.com", pathname: "/PokeAPI/sprites/**" },
    ],
  },
};

export default nextConfig;
