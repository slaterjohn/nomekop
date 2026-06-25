import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { axe } from "vitest-axe";
import type { PokemonEntity } from "@/lib/content/entities/types";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn(), replace: vi.fn() }),
}));

// Fixture mode + stubbed store: the gallery's dex lookup reads the committed
// fixtures (base1 has Pikachu #58, dex 25), never the SQLite cache.
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

import { PokemonInfo } from "@/components/pokemon/pokemon-info";

beforeEach(() => {
  vi.stubEnv("TCG_DATA_SOURCE", "fixture");
});

function pikachu(): PokemonEntity {
  return {
    dex: 25,
    slug: "pikachu",
    name: "Pikachu",
    cardCount: 177,
    sirCount: 3,
    illustrationRareCount: 4,
    artistCount: 69,
    setCount: 88,
    firstSet: { id: "base1", name: "Base", releaseDate: "1999-01-09" },
    latestSet: { id: "sv1", name: "Scarlet & Violet", releaseDate: "2023-03-31" },
    rarities: { Common: 50 },
    signatureCard: {
      id: "base1-58",
      name: "Pikachu",
      number: "58",
      rarity: "Common",
      marketPrice: 312.5,
      imageSmall: "https://img/base1-58.png",
    },
  };
}

describe("PokemonInfo page", () => {
  it("renders the heading, headline stats and a data-backed FAQ", async () => {
    render(await PokemonInfo({ entity: pikachu() }));
    expect(screen.getByRole("heading", { level: 1 }).textContent).toMatch(/Pikachu/i);
    expect(screen.getByText("Cards")).toBeInTheDocument();
    expect(screen.getByText(/How many Pikachu cards are there/i)).toBeInTheDocument();
    // The value question leads (real market price rendered).
    expect(screen.getByText(/312/)).toBeInTheDocument();
  });

  it("links to the binder builder with the default token", async () => {
    render(await PokemonInfo({ entity: pikachu() }));
    const cta = screen.getByRole("link", { name: /Build a Pikachu binder/i });
    expect(cta).toHaveAttribute("href", "/pokemon/pikachu~34an");
  });

  it("links the first set and the card gallery to their own pages", async () => {
    const { container } = render(await PokemonInfo({ entity: pikachu() }));
    expect(container.querySelector('a[href="/set/base1"]')).not.toBeNull();
    // Gallery: Pikachu #58 from the base1 fixture links to its card page.
    expect(container.querySelector('a[href="/card/base1-58"]')).not.toBeNull();
  });

  it("has no obvious accessibility violations", async () => {
    const { container } = render(await PokemonInfo({ entity: pikachu() }));
    expect(await axe(container)).toHaveNoViolations();
  });
});
