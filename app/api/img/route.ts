import { createHash } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse, type NextRequest } from "next/server";

/** Only the official card image CDNs may be proxied (SSRF guard).
 *  pokemontcg.io hosts sets up to 2025; releases from 2026 live on scrydex.
 *  raw.githubusercontent.com is restricted to the PokeAPI sprites repo
 *  (pixel Pokédex icons). */
const ALLOWED_HOSTS = new Set([
  "images.pokemontcg.io",
  "images.scrydex.com",
  // Non-English card images (Japanese, French…) from TCGdex.
  "assets.tcgdex.net",
]);
const ALLOWED_PREFIXES: Array<{ host: string; pathPrefix: string }> = [
  { host: "raw.githubusercontent.com", pathPrefix: "/PokeAPI/sprites/" },
];

function isAllowed(url: URL): boolean {
  if (ALLOWED_HOSTS.has(url.hostname)) return true;
  return ALLOWED_PREFIXES.some(
    (rule) => rule.host === url.hostname && url.pathname.startsWith(rule.pathPrefix),
  );
}

/**
 * Fetch that resolves redirects manually, re-checking every hop against the
 * allow-list. `fetch`'s default `redirect: "follow"` would let an upstream 3xx
 * (or an open redirect on a CDN) bounce the request to an internal address —
 * the initial-URL allow-list check alone does not cover that (SSRF). The known
 * card CDNs serve images directly (200, no redirects), so this is purely a guard.
 */
async function fetchAllowed(start: URL): Promise<Response | null> {
  let current = start;
  for (let hop = 0; hop < 4; hop++) {
    const res = await fetch(current, {
      redirect: "manual",
      signal: AbortSignal.timeout(20_000),
    }).catch(() => null);
    if (!res) return null;
    if (res.status < 300 || res.status >= 400) return res;
    const location = res.headers.get("location");
    if (!location) return null;
    let next: URL;
    try {
      next = new URL(location, current);
    } catch {
      return null;
    }
    if (next.protocol !== "https:" || !isAllowed(next)) return null; // re-validate each hop
    current = next;
  }
  return null; // too many redirects
}

const CACHE_DIR = path.join(process.env.CACHE_DIR ?? path.join(process.cwd(), ".cache"), "img");
const STUB_PATH = path.join(process.cwd(), "public", "card-stub.png");

const IMMUTABLE = "public, max-age=31536000, immutable";

/**
 * Caching image proxy for print/PDF rendering: keeps repeat PDF renders off
 * the CDN and gives tests a hermetic IMG_STUB=1 mode.
 */
export async function GET(request: NextRequest): Promise<Response> {
  const src = request.nextUrl.searchParams.get("src");
  if (!src) {
    return NextResponse.json({ error: "Missing src parameter." }, { status: 400 });
  }

  let url: URL;
  try {
    url = new URL(src);
  } catch {
    return NextResponse.json({ error: "Invalid src URL." }, { status: 400 });
  }
  if (url.protocol !== "https:" || !isAllowed(url)) {
    return NextResponse.json({ error: "Host not allowed." }, { status: 400 });
  }

  if (process.env.IMG_STUB === "1") {
    const stub = await readFile(STUB_PATH);
    return pngResponse(stub);
  }

  const cacheFile = path.join(CACHE_DIR, createHash("sha1").update(url.href).digest("hex"));
  try {
    return pngResponse(await readFile(cacheFile));
  } catch {
    // miss — fetch and fill
  }

  const upstream = await fetchAllowed(url);
  if (!upstream || !upstream.ok) {
    return NextResponse.json({ error: "Image unavailable." }, { status: 502 });
  }
  // Only ever proxy/cache actual images — never let a non-image body (HTML, a
  // script, an error page) be stored and re-served from this origin.
  const contentType = upstream.headers.get("content-type") ?? "";
  if (!contentType.startsWith("image/")) {
    return NextResponse.json({ error: "Image unavailable." }, { status: 502 });
  }
  const bytes = Buffer.from(await upstream.arrayBuffer());
  void (async () => {
    try {
      await mkdir(CACHE_DIR, { recursive: true });
      const tmp = `${cacheFile}.tmp-${process.pid}-${Math.random().toString(36).slice(2)}`;
      await writeFile(tmp, bytes);
      await rename(tmp, cacheFile);
    } catch {
      // cache fill is best-effort
    }
  })();
  return pngResponse(bytes, contentType);
}

function pngResponse(bytes: Buffer, contentType = "image/png"): Response {
  return new Response(new Uint8Array(bytes), {
    headers: { "Content-Type": contentType, "Cache-Control": IMMUTABLE },
  });
}
