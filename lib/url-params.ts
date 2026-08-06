// URL-boundary helpers. Every dynamic route reads untrusted, percent-encoded
// text out of the URL and some of them build a new URL back out of it — both
// directions throw on input this app genuinely receives (Pokémon names carry
// ♀/♂, curly apostrophes and combining accents; crawlers send bare `%`).
//
// Two facts about Next drive this module, both established by probing the
// running server rather than from the docs:
//
//  1. Route `params` reach a page/route component still percent-encoded, but
//     reach `generateMetadata` already decoded. `searchParams` are always
//     decoded. So no call site can know whether its value needs decoding, and a
//     raw `decodeURIComponent` throws `URIError` on the already-decoded form
//     whenever it contains a `%`.
//  2. `redirect()` writes its argument verbatim into the `Location` header, and
//     Node's `setHeader` rejects any header value containing a code point above
//     U+00FF with `ERR_INVALID_CHAR`. An un-encoded non-Latin-1 slug in a
//     redirect target therefore throws after the response has started — which
//     surfaces as a 500, not a redirect.

/** Compose text to Unicode NFC — the form every slug in this app's data is
 *  stored in.
 *
 *  macOS and iOS hand applications DECOMPOSED text (NFD): `é` arrives as `e` +
 *  U+0301, two code points that are canonically equivalent to one but compare
 *  unequal. Nothing about that survives an exact string match, so `flabébé`
 *  typed or pasted on a Mac missed a Map keyed on the composed slug and 404'd a
 *  page that exists. Both ends of every entity lookup call this, so agreement is
 *  by construction rather than by luck about which platform sent the request.
 *
 *  NFC only ever composes — it never strips accents — so `flabébé` and `flabebe`
 *  stay different pages, and slugs with no decomposition (♀, ♂, katakana) are
 *  returned untouched. */
export function toNfc(value: string): string {
  return value.normalize("NFC");
}

/** Percent-decode a value that may already be decoded, without ever throwing,
 *  and compose the result to NFC.
 *
 *  Returns the input unchanged when it isn't a valid percent-encoding, so a
 *  malformed URL degrades to "no match" (404) instead of a 500. */
export function decodeParam(value: string): string {
  try {
    return toNfc(decodeURIComponent(value));
  } catch {
    return toNfc(value);
  }
}

/** True when every code point fits in Latin-1 — i.e. Node will accept the
 *  string as an HTTP header value. Anything above U+00FF must be percent-encoded
 *  before it can go in a `Location`. */
export function isHeaderSafe(value: string): boolean {
  for (const ch of value) if (ch.codePointAt(0)! > 0xff) return false;
  return true;
}

/** A `/base/<segment>` path safe to hand to `redirect()`: the segment is
 *  percent-encoded, so the result is a valid URL and a valid header value
 *  whatever Unicode the segment contains. */
export function encodeSegmentPath(base: string, segment: string): string {
  return `${base}/${encodeURIComponent(segment)}`;
}

/** The redirect target for a binder token, or `null` when there isn't one.
 *
 *  A token that its own decoder rejects has no reachable URL: redirecting to it
 *  lands back on the same route, which appends another suffix and redirects
 *  again — an infinite loop. Callers must `notFound()` on `null`. */
export function binderRedirectPath(
  base: string,
  token: string,
  decode: (token: string) => unknown,
): string | null {
  return decode(token) ? encodeSegmentPath(base, token) : null;
}
