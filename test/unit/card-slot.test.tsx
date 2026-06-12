import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { CardSlot } from "@/components/builder/card-slot";
import type { Slot } from "@/lib/layout";
import type { TcgCard } from "@/lib/tcg/types";

const holoCard: TcgCard = {
  id: "base1-4",
  name: "Charizard",
  number: "4",
  rarity: "Rare Holo",
  supertype: "Pokémon",
  imageSmall: "https://images.pokemontcg.io/base1/4.png",
  imageLarge: "",
  variants: { normal: false, reverse: false, holo: true },
};

const pokeballSlot: Slot = {
  kind: "pokeball",
  card: { ...holoCard, id: "pre-1", variants: { normal: true, reverse: true, holo: false, pokeball: true } },
};

describe("CardSlot badges & shimmer", () => {
  it("holo prints get a HOLO badge and a shimmer overlay", () => {
    render(<CardSlot slot={{ kind: "card", card: holoCard }} set={{ printedTotal: 102 }} />);
    expect(screen.getByText("HOLO")).toBeInTheDocument();
    expect(document.querySelector("[data-gb-shimmer]")).not.toBeNull();
    expect(document.querySelector("[data-gb-shimmer]")).toHaveAttribute("aria-hidden", "true");
  });

  it("ball pockets get their badges and shimmer", () => {
    render(<CardSlot slot={pokeballSlot} set={{ printedTotal: 131 }} />);
    expect(screen.getByText("POKÉ")).toBeInTheDocument();
    expect(document.querySelector("[data-gb-shimmer]")).not.toBeNull();
  });

  it("plain normal prints get neither badge nor shimmer", () => {
    const plain: TcgCard = { ...holoCard, variants: { normal: true, reverse: false, holo: false } };
    render(<CardSlot slot={{ kind: "card", card: plain }} set={{ printedTotal: 102 }} />);
    expect(screen.queryByText("HOLO")).not.toBeInTheDocument();
    expect(document.querySelector("[data-gb-shimmer]")).toBeNull();
  });
});
