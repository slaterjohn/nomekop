import { describe, expect, it } from "vitest";
import data from "@/lib/content/entities/data.json";
import index from "@/lib/content/entities/index.json";
import type { EntityCatalog, EntitySnapshot } from "@/lib/content/entities/types";

const snap = data as unknown as EntitySnapshot;
const cat = index as EntityCatalog;
const ARTIST_MIN = snap.thresholds.artistMinCards;

describe("entity snapshot — Pokémon", () => {
  it("has one entity per species with cards", () => {
    expect(snap.pokemon.length).toBe(1020);
  });

  it("every Pokémon has sane stats", () => {
    for (const p of snap.pokemon) {
      expect(p.dex).toBeGreaterThan(0);
      expect(p.slug.length).toBeGreaterThan(0);
      expect(p.cardCount).toBeGreaterThan(0);
      expect(p.setCount).toBeGreaterThan(0);
      expect(p.artistCount).toBeGreaterThanOrEqual(0);
      // SIRs are a subset of illustration rares.
      expect(p.sirCount).toBeLessThanOrEqual(p.illustrationRareCount);
      // The first set never post-dates the latest set.
      expect(p.firstSet.releaseDate <= p.latestSet.releaseDate).toBe(true);
      expect(p.signatureCard?.id).toBeTruthy();
    }
  });
});

describe("entity snapshot — artists", () => {
  it("only includes artists at or above the gating threshold", () => {
    expect(snap.artists.length).toBeGreaterThan(0);
    for (const a of snap.artists) {
      expect(a.cardCount).toBeGreaterThanOrEqual(ARTIST_MIN);
      expect(a.slug.length).toBeGreaterThan(0);
      expect(a.setCount).toBeGreaterThan(0);
      expect(a.topPokemon.length).toBeLessThanOrEqual(10);
      expect(a.earliestSet.releaseDate <= a.latestSet.releaseDate).toBe(true);
      expect(a.signatureCard?.id).toBeTruthy();
    }
  });

  it("artistIndex is the complete set; every gated artist appears with matching count", () => {
    const bySlug = new Map(snap.artistIndex.map((a) => [a.slug, a.cardCount]));
    expect(snap.artistIndex.length).toBeGreaterThanOrEqual(snap.artists.length);
    for (const a of snap.artists) {
      expect(bySlug.get(a.slug)).toBe(a.cardCount);
    }
  });

  it("artistIndex is sorted by card count, descending", () => {
    for (let i = 1; i < snap.artistIndex.length; i++) {
      expect(snap.artistIndex[i - 1]!.cardCount >= snap.artistIndex[i]!.cardCount).toBe(true);
    }
  });
});

describe("entity snapshot — data.json and index.json agree", () => {
  it("same Pokémon set", () => {
    expect(cat.pokemon.length).toBe(snap.pokemon.length);
    const heavy = new Set(snap.pokemon.map((p) => p.slug));
    expect(cat.pokemon.every((p) => heavy.has(p.slug))).toBe(true);
  });

  it("catalog artists cover the gated artists, with the same threshold", () => {
    expect(cat.thresholds.artistMinCards).toBe(ARTIST_MIN);
    const catSlugs = new Set(cat.artists.filter((a) => a.cardCount >= ARTIST_MIN).map((a) => a.slug));
    for (const a of snap.artists) expect(catSlugs.has(a.slug)).toBe(true);
  });

  it("the light catalog carries the fields the browse directories sort on", () => {
    for (const p of cat.pokemon) expect(typeof p.cardCount).toBe("number");
    for (const a of cat.artists) {
      expect(typeof a.cardCount).toBe("number");
      expect(typeof a.setCount).toBe("number");
    }
  });
});
