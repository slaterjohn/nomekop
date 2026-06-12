import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "vitest-axe";
import { CardDetailDialog } from "@/components/builder/card-detail-dialog";
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
      normal: { low: 0.02, mid: 0.08, high: 1.5, market: 0.05 },
      reverseHolofoil: { low: 0.05, mid: 0.18, high: 2, market: 0.12 },
    },
  },
};

describe("CardDetailDialog", () => {
  it("shows the card identity and set context", () => {
    render(<CardDetailDialog card={card} kind="card" set={set} onClose={vi.fn()} />);
    expect(screen.getByRole("dialog", { name: "Pineco" })).toBeInTheDocument();
    expect(screen.getByText(/1\/198/)).toBeInTheDocument();
    expect(screen.getByText(/Common/)).toBeInTheDocument();
    expect(screen.getByText(/Scarlet & Violet/)).toBeInTheDocument();
  });

  it("renders a TCGplayer price row per variant with market value", () => {
    render(<CardDetailDialog card={card} kind="card" set={set} onClose={vi.fn()} />);
    const table = screen.getByRole("table", { name: /TCGplayer prices/i });
    expect(table).toBeInTheDocument();
    expect(screen.getByRole("row", { name: /NORMAL.*\$0\.05/ })).toBeInTheDocument();
    expect(screen.getByRole("row", { name: /REVERSE HOLO.*\$0\.12/ })).toBeInTheDocument();
    expect(screen.getByText(/2026\/06\/12/)).toBeInTheDocument();
  });

  it("marks the clicked pocket's variant row", () => {
    render(<CardDetailDialog card={card} kind="reverse" set={set} onClose={vi.fn()} />);
    const row = screen.getByRole("row", { name: /REVERSE HOLO/ });
    expect(row.textContent).toContain("THIS POCKET");
  });

  it("links out to TCGplayer", () => {
    render(<CardDetailDialog card={card} kind="card" set={set} onClose={vi.fn()} />);
    const link = screen.getByRole("link", { name: /TCGPLAYER/i });
    expect(link).toHaveAttribute("href", "https://prices.pokemontcg.io/tcgplayer/sv1-1");
    expect(link).toHaveAttribute("target", "_blank");
  });

  it("falls back gracefully without price data (2026+ sets)", () => {
    const bare: TcgCard = { ...card, tcgplayer: undefined };
    render(<CardDetailDialog card={bare} kind="card" set={set} onClose={vi.fn()} />);
    expect(screen.getByText(/NO PRICE DATA/i)).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("renders nothing when card is null", () => {
    render(<CardDetailDialog card={null} kind={null} set={set} onClose={vi.fn()} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("close button calls onClose", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<CardDetailDialog card={card} kind="card" set={set} onClose={onClose} />);
    await user.click(screen.getByRole("button", { name: /close/i }));
    expect(onClose).toHaveBeenCalled();
  });

  it("axe clean", async () => {
    render(<CardDetailDialog card={card} kind="card" set={set} onClose={vi.fn()} />);
    // Scan the dialog element (portal) — Base UI's inert focus-guard spans
    // outside it are library internals that axe misreads in jsdom.
    expect(await axe(screen.getByRole("dialog"))).toHaveNoViolations();
  });
});
