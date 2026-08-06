// @vitest-environment node
import { describe, it, expect } from "vitest";
import catalog from "@/lib/content/entities/index.json";
import {
  DEFAULT_ILLUSTRATOR_OPTIONS,
  decodeIllustratorToken,
  encodeIllustratorToken,
} from "@/lib/illustrator-binder";
import {
  DEFAULT_POKEMON_OPTIONS,
  decodePokemonToken,
  encodePokemonToken,
} from "@/lib/pokemon-binder";
import { decodeParam, encodeSegmentPath } from "@/lib/url-params";
import type { EntityCatalog } from "@/lib/content/entities/types";

// Every binder URL is built by the same three steps, so this is the only
// property that matters: name -> token -> URL path -> back to the same token.
// It has to hold for the names the DATA really contains, not a tidy subset —
// artists are credited as `"Big Mama" Tagawa, CR CG gangs`, `Nobusawa/Mochipuyo`
// and `Imakuni?`, and every one of those used to have no reachable URL at all.
//
// The URL step is the interesting one: `/` cannot appear raw in a path segment,
// so the token only survives if the link builder percent-encodes it and the
// decoder accepts the `/` that comes back out.
function roundTrip(base: string, token: string): string {
  const path = encodeSegmentPath(base, token);
  // What Next hands a page component: the segment, still percent-encoded.
  const segment = path.slice(base.length + 1);
  expect(segment, `${token} must survive as ONE path segment`).not.toContain("/");
  return decodeParam(segment);
}

const { artists, pokemon } = catalog as EntityCatalog;

describe("illustrator binder URLs round-trip for every artist in the data", () => {
  it.each(artists.map((a) => [a.name] as const))("%s", (name) => {
    const token = encodeIllustratorToken(name, DEFAULT_ILLUSTRATOR_OPTIONS);
    expect(roundTrip("/illustrator", token)).toBe(token);
    expect(decodeIllustratorToken(token)).not.toBeNull();
  });
});

describe("pokemon binder URLs round-trip for every species in the data", () => {
  it.each(pokemon.map((p) => [p.name] as const))("%s", (name) => {
    const token = encodePokemonToken(name, DEFAULT_POKEMON_OPTIONS);
    expect(roundTrip("/pokemon", token)).toBe(token);
    expect(decodePokemonToken(token)).not.toBeNull();
  });
});

// Card pages link `/pokemon/<card.name>` for every Pokémon-supertype card, and
// card names carry marks the species catalog never does: the delta-species δ,
// the Shining ★ / Prism ◇ suffixes, Unown's bracketed letter, and tag-team `&`.
const REAL_CARD_NAMES = [
  "Charizard δ",
  "Umbreon ★",
  "Arceus ◇",
  "Unown [J]",
  "Moltres & Zapdos & Articuno-GX",
  "_____'s Pikachu",
];

describe("pokemon binder URLs round-trip for real card names", () => {
  it.each(REAL_CARD_NAMES)("%s", (name) => {
    const token = encodePokemonToken(name, DEFAULT_POKEMON_OPTIONS);
    expect(roundTrip("/pokemon", token)).toBe(token);
    expect(decodePokemonToken(token)?.name).toBe(name.toLowerCase().replace(/\s+/g, "-"));
  });
});

// Widening the slug charset must not swallow the delimiter or the option tail:
// those are what tell a binder token apart from a bare entity slug, and a token
// the decoder wrongly accepts would render a binder where an info page belongs.
describe("still rejects what is not a token", () => {
  it.each([
    ["empty", ""],
    ["no slug", "~34n"],
    ["one-character slug", "a~34n"],
    ["rows out of range", "ken-sugimori~99n"],
    ["unknown order char", "ken-sugimori~34z"],
    ["pokemon tail on an illustrator token", "ken-sugimori~34an"],
    ["second delimiter", "ken~sugimori~34n"],
    ["bare slug", "nobusawa/mochipuyo"],
    ["slug over 40 characters", `${"a".repeat(41)}~34n`],
  ])("%s", (_label, token) => {
    expect(decodeIllustratorToken(token)).toBeNull();
  });
});
