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
// Cloudflare Turnstile (the /report form's optional bot check) loads a script,
// renders in an iframe and calls home — all from this one origin. Listed
// unconditionally (it's a single trusted CAPTCHA domain); it's only ever loaded
// when TURNSTILE_SITE_KEY is configured and the widget is rendered.
const TURNSTILE = "https://challenges.cloudflare.com";

const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""} ${TURNSTILE}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: ${IMG_HOSTS.join(" ")}`,
  "font-src 'self' data:",
  `connect-src 'self'${isDev ? " ws:" : ""} ${TURNSTILE}`,
  "media-src 'self'",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  `frame-src ${TURNSTILE}`,
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
  // HSTS is owned by Cloudflare (its header carries `preload`); the app must not
  // also emit one, or two Strict-Transport-Security headers go out and the HSTS
  // preload-list checker rejects the duplicate.
  { key: "X-DNS-Prefetch-Control", value: "off" },
];

const nextConfig: NextConfig = {
  // Standalone tracing is for the Docker image; `next start` (dev/e2e) rejects it.
  output: process.env.STANDALONE === "1" ? "standalone" : undefined,
  // Don't advertise the stack via X-Powered-By (fingerprinting aids targeted attacks).
  poweredByHeader: false,
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
    return [
      { source: "/(.*)", headers: SECURITY_HEADERS },
      // The service worker must never be cached by the browser, or a new app
      // shell can't roll out — clients would keep re-installing the old worker.
      {
        source: "/sw.js",
        headers: [{ key: "Cache-Control", value: "no-cache, no-store, must-revalidate" }],
      },
    ];
  },
  // /sets is the single set-browsing entry; /build is builder-only and needs a
  // set (/build?set=<id>, which then converts to a /b/<token> URL). A bare
  // /build with no set has nothing to build, so permanently (308 — Google
  // treats it as a 301) redirect it to /sets. The `missing` query condition
  // means /build?set=<id> is left untouched, and /b/<token> is a different
  // route entirely, so share links are unaffected.
  async redirects() {
    return [
      {
        source: "/build",
        missing: [{ type: "query", key: "set" }],
        destination: "/sets",
        permanent: true,
      },
    ];
  },
  // PostHog reverse proxy: analytics traffic is sent same-origin to `/ingest` and
  // proxied to PostHog here. This keeps the strict CSP intact (`connect-src 'self'`
  // — no external host to allow) and means ad-blockers don't drop events. Hosts are
  // EU to match the project's PostHog org; for a US org use us(-assets).i.posthog.com.
  async rewrites() {
    return [
      {
        source: "/ingest/static/:path*",
        destination: "https://eu-assets.i.posthog.com/static/:path*",
      },
      { source: "/ingest/:path*", destination: "https://eu.i.posthog.com/:path*" },
    ];
  },
  // Required by the PostHog proxy: without it Next 308-redirects the trailing-slash
  // ingestion endpoints, interfering with the proxied POSTs. The app's own links and
  // canonicals are all un-slashed, so this is a no-op for normal pages.
  skipTrailingSlashRedirect: true,
};

export default nextConfig;
