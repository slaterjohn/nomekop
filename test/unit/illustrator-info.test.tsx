import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { axe } from "vitest-axe";
import type { ArtistEntity } from "@/lib/content/entities/types";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/test",
}));

vi.mock("@/lib/server-store", () => ({
  serverStore: {
    getOrCompute: (_k: string, _t: number, compute: () => unknown) => compute(),
    peek: () => undefined,
    set: () => {},
  },
  SqliteStore: class {},
  SETS_TTL_MS: 0,
  CARDS_TTL_MS: 0,
}));

import { IllustratorInfo } from "@/components/illustrator/illustrator-info";

beforeEach(() => {
  vi.stubEnv("TCG_DATA_SOURCE", "fixture");
});

function arita(): ArtistEntity {
  return {
    slug: "mitsuhiro-arita",
    name: "Mitsuhiro Arita",
    cardCount: 728,
    setCount: 130,
    illustrationCount: 12,
    earliestSet: { id: "base1", name: "Base", releaseDate: "1999-01-09" },
    latestSet: { id: "sv1", name: "Scarlet & Violet", releaseDate: "2023-03-31" },
    topPokemon: [
      { slug: "charizard", name: "Charizard", count: 9 },
      { slug: "gyarados", name: "Gyarados", count: 9 },
    ],
    signatureCard: {
      id: "base1-4",
      name: "Charizard",
      number: "4",
      rarity: "Rare Holo",
      marketPrice: 420,
      imageSmall: "https://img/base1-4.png",
    },
  };
}

describe("IllustratorInfo page", () => {
  it("renders heading, stats and a data-backed FAQ", async () => {
    render(await IllustratorInfo({ artist: arita() }));
    expect(screen.getByRole("heading", { level: 1 }).textContent).toMatch(/Mitsuhiro Arita/i);
    expect(screen.getByText("Illustration cards")).toBeInTheDocument();
    expect(screen.getByText(/How many cards has Mitsuhiro Arita illustrated/i)).toBeInTheDocument();
  });

  it("links the binder, illustrations sub-page, top Pokémon and per-set sub-pages", async () => {
    const { container } = render(await IllustratorInfo({ artist: arita() }));
    expect(screen.getByRole("link", { name: /Build a Mitsuhiro Arita binder/i })).toHaveAttribute(
      "href",
      "/illustrator/mitsuhiro-arita~34n",
    );
    expect(container.querySelector('a[href="/illustrator/mitsuhiro-arita/illustrations"]')).not.toBeNull();
    expect(container.querySelector('a[href="/illustrator/mitsuhiro-arita/pokemon/charizard"]')).not.toBeNull();
    // The fixture has Arita in Base, so the per-set sub-page link appears.
    expect(container.querySelector('a[href="/illustrator/mitsuhiro-arita/set/base1"]')).not.toBeNull();
  });

  it("links gallery cards to their card pages", async () => {
    const { container } = render(await IllustratorInfo({ artist: arita() }));
    expect(container.querySelector('a[href="/card/base1-4"]')).not.toBeNull();
  });

  it("has no obvious accessibility violations", async () => {
    const { container } = render(await IllustratorInfo({ artist: arita() }));
    expect(await axe(container)).toHaveNoViolations();
  });
});
