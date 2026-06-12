import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { axe } from "vitest-axe";
import { CardDetailBody } from "@/components/builder/card-detail-body";
import type { TcgCard, TcgSet } from "@/lib/tcg/types";

const set: TcgSet = {
  id: "sv1",
  name: "Scarlet & Violet",
  series: "Scarlet & Violet",
  printedTotal: 198,
  total: 258,
  releaseDate: "2023/03/31",
  symbolUrl: "",
  logoUrl: "",
};

const card: TcgCard = {
  id: "sv1-1",
  name: "Pineco",
  number: "1",
  rarity: "Common",
  supertype: "Pokémon",
  imageSmall: "https://images.pokemontcg.io/sv1/1.png",
  imageLarge: "https://images.pokemontcg.io/sv1/1_hires.png",
  variants: { normal: true, reverse: true, holo: false },
  tcgplayer: {
    url: "https://prices.pokemontcg.io/tcgplayer/sv1-1",
    updatedAt: "2026/06/12",
    prices: {
      normal: { low: 0.02, mid: 0.08, high: 999.99, market: 0.05 },
      reverseHolofoil: { low: 0.05, mid: 0.18, high: 1000, market: 0.12 },
    },
  },
};

describe("CardDetailBody", () => {
  it("renders prices per variant with market value — no junk High column", () => {
    render(<CardDetailBody card={card} set={set} kind="card" />);
    const table = screen.getByRole("table", { name: /TCGplayer prices/i });
    expect(table).toBeInTheDocument();
    expect(screen.getByRole("row", { name: /NORMAL.*\$0\.05/ })).toBeInTheDocument();
    expect(screen.getByRole("row", { name: /REVERSE HOLO.*\$0\.12/ })).toBeInTheDocument();
    // 999/1000 'high' listings are seller noise — the column is gone.
    expect(screen.queryByRole("columnheader", { name: /High/i })).not.toBeInTheDocument();
    expect(screen.queryByText("$999.99")).not.toBeInTheDocument();
  });

  it("marks the pocket variant the visitor came from", () => {
    render(<CardDetailBody card={card} set={set} kind="reverse" />);
    expect(screen.getByRole("row", { name: /REVERSE HOLO/ }).textContent).toContain("THIS POCKET");
  });

  it("ball pockets mark no price row (no key exists) but show their badge", () => {
    const ballCard: TcgCard = {
      ...card,
      variants: { ...card.variants, pokeball: true, masterball: true },
    };
    render(<CardDetailBody card={ballCard} set={set} kind="pokeball" />);
    expect(screen.getByText("POKÉ BALL")).toBeInTheDocument();
    expect(screen.queryByText("THIS POCKET")).not.toBeInTheDocument();
  });

  it("links out to TCGplayer", () => {
    render(<CardDetailBody card={card} set={set} kind="card" />);
    const link = screen.getByRole("link", { name: /TCGPLAYER/i });
    expect(link).toHaveAttribute("href", "https://prices.pokemontcg.io/tcgplayer/sv1-1");
  });

  it("falls back gracefully without price data", () => {
    render(<CardDetailBody card={{ ...card, tcgplayer: undefined }} set={set} kind="card" />);
    expect(screen.getByText(/NO PRICE DATA/i)).toBeInTheDocument();
  });

  it("axe clean", async () => {
    const { container } = render(<CardDetailBody card={card} set={set} kind="card" />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
