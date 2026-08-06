// @vitest-environment node
import { describe, it, expect } from "vitest";
import {
  binderRedirectPath,
  decodeParam,
  encodeSegmentPath,
  isHeaderSafe,
} from "@/lib/url-params";
import {
  DEFAULT_POKEMON_OPTIONS,
  decodePokemonToken,
  encodePokemonToken,
} from "@/lib/pokemon-binder";
import {
  DEFAULT_ILLUSTRATOR_OPTIONS,
  decodeIllustratorToken,
  encodeIllustratorToken,
} from "@/lib/illustrator-binder";

// Characters this app really receives in slugs. Everything above U+00FF is a
// character Node refuses to put in a Location header.
const NON_LATIN1: [label: string, value: string][] = [
  ["curly apostrophe", "farfetch’d"], // Bulbapedia/iOS render Farfetch'd this way
  ["em dash", "hs—unleashed"], // real set names use one (HS—Unleashed)
  ["female sign", "nidoran♀"], // real Pokémon slug
  ["male sign", "nidoran♂"],
  ["combining acute (NFD)", "flabébé"], // macOS form of flabébé
  ["japanese", "ピカチュウ"],
];

describe("decodeParam", () => {
  it("decodes a percent-encoded param", () => {
    expect(decodeParam("nidoran%E2%99%80")).toBe("nidoran♀");
  });

  // generateMetadata receives params ALREADY decoded while the page component
  // receives them raw, so the same helper must survive both forms.
  it.each(["%", "%%", "%E9", "100%-pure", "pika%chu", "%zz"])(
    "returns %j unchanged instead of throwing",
    (value) => {
      expect(() => decodeParam(value)).not.toThrow();
      expect(decodeParam(value)).toBe(value);
    },
  );
});

// macOS and iOS produce decomposed (NFD) text: a keyboard, a Finder filename or
// a copy-paste of `flabébé` from a Mac carries `e` + U+0301, not `é`. Every slug
// in the app's data is composed (NFC) and looked up by exact match, so NFD input
// silently missed and 404'd a page that exists.
describe("decodeParam normalises to NFC", () => {
  const NFD = "flabe\u0301be\u0301";
  const NFC = "flab\u00e9b\u00e9";

  it("composes decomposed input", () => {
    expect(decodeParam(NFD)).toBe(NFC);
  });

  it("composes it out of the percent-encoded form the browser sends", () => {
    expect(decodeParam(encodeURIComponent(NFD))).toBe(NFC);
  });

  it("leaves already-composed input alone", () => {
    expect(decodeParam(NFC)).toBe(NFC);
  });

  // ♀/♂ have no decomposition — normalising must not disturb the slugs that
  // already worked.
  it.each(["nidoran♀", "nidoran♂", "ピカチュウ", "farfetch’d", "pikachu~34an"])(
    "leaves %j unchanged",
    (value) => {
      expect(decodeParam(value)).toBe(value);
    },
  );
});

describe("isHeaderSafe", () => {
  it("accepts Latin-1, which Node allows in a header", () => {
    expect(isHeaderSafe("flabébé")).toBe(true);
  });

  it.each(NON_LATIN1)("rejects %s", (_label, value) => {
    expect(isHeaderSafe(value)).toBe(false);
  });
});

describe("encodeSegmentPath", () => {
  it.each(NON_LATIN1)("produces a header-safe path for %s", (_label, value) => {
    const path = encodeSegmentPath("/pokemon", value);
    expect(isHeaderSafe(path)).toBe(true);
  });

  it("round-trips the segment back through decodeParam", () => {
    const path = encodeSegmentPath("/pokemon", "nidoran♀~34an");
    expect(decodeParam(path.slice("/pokemon/".length))).toBe("nidoran♀~34an");
  });

  it("leaves an already-safe slug readable", () => {
    expect(encodeSegmentPath("/pokemon", "pikachu~34an")).toBe("/pokemon/pikachu~34an");
  });
});

describe("binderRedirectPath", () => {
  // The bug: /pokemon/<non-Latin-1 slug> redirected to an un-encoded path, and
  // Node threw ERR_INVALID_CHAR writing the Location header -> 500.
  it.each(NON_LATIN1)("returns a header-safe Pokémon redirect for %s", (_label, value) => {
    const token = encodePokemonToken(value, DEFAULT_POKEMON_OPTIONS);
    const path = binderRedirectPath("/pokemon", token, decodePokemonToken);
    if (path !== null) expect(isHeaderSafe(path)).toBe(true);
  });

  it.each(NON_LATIN1)("returns a header-safe illustrator redirect for %s", (_label, value) => {
    const token = encodeIllustratorToken(value, DEFAULT_ILLUSTRATOR_OPTIONS);
    const path = binderRedirectPath("/illustrator", token, decodeIllustratorToken);
    if (path !== null) expect(isHeaderSafe(path)).toBe(true);
  });

  it("redirects a slug its decoder accepts", () => {
    const token = encodePokemonToken("Nidoran♀", DEFAULT_POKEMON_OPTIONS);
    expect(binderRedirectPath("/pokemon", token, decodePokemonToken)).toBe(
      "/pokemon/nidoran%E2%99%80~34an",
    );
  });

  // A token the decoder rejects has no reachable URL: redirecting to it lands
  // back on the same route, appends another suffix and redirects again. The slug
  // charset used to reject these three real credits, so they hit that branch;
  // now they decode and redirect ONCE to a working binder. Either way the
  // property under test is the same — the route must terminate.
  it.each([
    ["curly apostrophe", "farfetch’d"],
    ["quotes and comma", '"Big Mama" Tagawa, CR CG gangs'],
    ["slash", "Nobusawa/Mochipuyo"],
    ["question mark", "Imakuni?"],
  ])("redirects %s exactly once, to a target that decodes", (_label, value) => {
    const token = encodeIllustratorToken(value, DEFAULT_ILLUSTRATOR_OPTIONS);
    const path = binderRedirectPath("/illustrator", token, decodeIllustratorToken);
    expect(path).not.toBeNull();
    // One hop only: the target decodes, so the next request renders the binder
    // rather than falling back into the redirect branch a second time.
    const next = decodeParam(path!.slice("/illustrator/".length));
    expect(decodeIllustratorToken(next)).not.toBeNull();
    expect(binderRedirectPath("/illustrator", next, decodeIllustratorToken)).toBe(path);
  });

  // Some slugs still have no URL — the token grammar caps the slug at 40
  // characters, and a name that slugifies past it cannot round-trip. Callers
  // must notFound() on null rather than redirect into a loop.
  it("returns null when the name cannot fit a token at all", () => {
    const token = encodeIllustratorToken("x".repeat(41), DEFAULT_ILLUSTRATOR_OPTIONS);
    expect(binderRedirectPath("/illustrator", token, decodeIllustratorToken)).toBeNull();
  });

  it("never returns a path that would redirect back to itself", () => {
    for (const [, value] of NON_LATIN1) {
      const token = encodePokemonToken(value, DEFAULT_POKEMON_OPTIONS);
      const path = binderRedirectPath("/pokemon", token, decodePokemonToken);
      if (path === null) continue;
      // The target must decode as a token, so the next request renders a binder
      // instead of falling through to the redirect branch again.
      const next = decodeParam(path.slice("/pokemon/".length));
      expect(decodePokemonToken(next)).not.toBeNull();
    }
  });
});
