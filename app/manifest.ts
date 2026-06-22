import type { MetadataRoute } from "next";
import { SITE_DESCRIPTION, SITE_NAME } from "@/lib/site";

// Web app manifest. Next serves this at /manifest.webmanifest and auto-injects
// the <link rel="manifest"> into every page's <head>. `display: standalone` is
// what makes an installed copy launch chromeless — like an app rather than a
// browser tab — which also gives it a more durable storage bucket so the
// locally-stored binder collections survive. No notifications by design.
//
// Icons are pre-rendered PNGs in /public (see scripts/generate-pwa-icons.mjs).
// The "any" pair is the full-bleed pixel ball; the maskable one is inset so
// Android's adaptive-icon mask can't clip it.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${SITE_NAME} — Pokémon TCG binder layout maker`,
    short_name: SITE_NAME,
    description: SITE_DESCRIPTION,
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#9bbc0f",
    theme_color: "#9bbc0f",
    lang: "en",
    dir: "ltr",
    categories: ["productivity", "utilities", "games"],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
