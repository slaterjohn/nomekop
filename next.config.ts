import type { NextConfig } from "next";

// Card images are same-origin in the browser (served via /api/img or the
// /_next/image optimiser), but list the upstream CDNs too so any direct <img>
// to them still loads.
const IMG_HOSTS = [
  "https://images.pokemontcg.io",
  "https://images.scrydex.com",
  "https://assets.tcgdex.net",
  "https://raw.githubusercontent.com",
];

const isDev = process.env.NODE_ENV !== "production";

/**
 * Content-Security-Policy. We use the "without nonces" approach (script/style
 * 'unsafe-inline') deliberately: the app is unauthenticated with no
 * user-generated HTML (articles are static; JSON-LD escapes `<`), and a
 * nonce-based CSP would force every page to render dynamically — disabling the
 * static generation + CDN caching this SEO-first app relies on. The policy still
 * blocks clickjacking (frame-ancestors), plugin/base/form hijacking, and pins
 * every resource type to known origins. `upgrade-insecure-requests` is omitted
 * on purpose so the http-served dev/e2e server (127.0.0.1:3170) isn't broken.
 */
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: ${IMG_HOSTS.join(" ")}`,
  "font-src 'self' data:",
  `connect-src 'self'${isDev ? " ws:" : ""}`,
  "media-src 'self'",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "frame-src 'none'",
].join("; ");

const SECURITY_HEADERS = [
  { key: "Content-Security-Policy", value: csp },
  // Belt-and-braces clickjacking guard for pre-CSP-3 browsers.
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // The app uses none of these capabilities; deny them outright. (autoplay is
  // intentionally left at its default so the background soundtrack still works.)
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=(), interest-cohort=()",
  },
  // Ignored by browsers over plain http (dev/e2e), enforced over https (prod).
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  { key: "X-DNS-Prefetch-Control", value: "off" },
];

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
      // Non-English card images (Japanese, French…) from TCGdex.
      { protocol: "https", hostname: "assets.tcgdex.net" },
    ],
  },
  async headers() {
    return [{ source: "/(.*)", headers: SECURITY_HEADERS }];
  },
};

export default nextConfig;
