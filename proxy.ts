import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Next 16 renamed `middleware` to `proxy`. This one consolidates the apex domain
// onto the canonical www host: nomekop.app serves the same app as
// www.nomekop.app, which splits PageRank and is a live duplicate-content
// condition. We 308-redirect the apex to www so there is one canonical origin.

/** Canonical host (e.g. "www.nomekop.app") from the configured site URL, and the
 *  apex it should absorb (only when the canonical is a www host — so localhost /
 *  dev, which has no www, never redirects). */
const { canonicalHost, apexHost } = (() => {
  try {
    const host = new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "").host;
    return { canonicalHost: host, apexHost: host.startsWith("www.") ? host.slice(4) : "" };
  } catch {
    return { canonicalHost: "", apexHost: "" };
  }
})();

export function proxy(request: NextRequest): NextResponse {
  const host = request.headers.get("host");
  if (apexHost && host === apexHost) {
    const url = new URL(request.nextUrl.pathname + request.nextUrl.search, `https://${canonicalHost}`);
    return NextResponse.redirect(url, 308);
  }
  return NextResponse.next();
}

export const config = {
  // Skip Next internals and static assets — they're referenced with absolute
  // www URLs already, and redirecting them just adds round-trips.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon-|apple-icon|sw.js).*)"],
};
