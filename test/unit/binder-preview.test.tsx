import { describe, it, expect, beforeAll, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "vitest-axe";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { BinderPreview } from "@/components/builder/binder-preview";
import { buildBinderLayout } from "@/lib/layout";
import { DEFAULT_CONFIG } from "@/lib/config";
import type { TcgCard, TcgSet } from "@/lib/tcg/types";

let sv1Cards: TcgCard[];
const sv1Set: TcgSet = {
  id: "sv1",
  name: "Scarlet & Violet",
  series: "Scarlet & Violet",
  printedTotal: 198,
  total: 258,
  releaseDate: "2023/03/31",
  symbolUrl: "",
  logoUrl: "",
};

beforeAll(async () => {
  sv1Cards = JSON.parse(
    await readFile(path.join(process.cwd(), "test", "fixtures", "cards-sv1.json"), "utf8"),
  );
});

function renderPreview(mode: "standard" | "master" = "standard") {
  const layout = buildBinderLayout(sv1Cards, sv1Set, { ...DEFAULT_CONFIG, mode });
  return {
    layout,
    ...render(<BinderPreview set={sv1Set} layout={layout} />),
  };
}

describe("BinderPreview", () => {
  it("renders only the current spread's cards (perf guard)", () => {
    renderPreview();
    // Spread 1 = page 1 only (9 cards); page 2's first card must not be present.
    expect(screen.getAllByRole("img")).toHaveLength(12);
  });

  it("navigates spreads with buttons and announces the position", async () => {
    const user = userEvent.setup();
    renderPreview();
    expect(screen.getByText(/PAGE 1 OF 22/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Next pages" }));
    expect(screen.getByText(/PAGES 2–3 OF 22/i)).toBeInTheDocument();
    expect(screen.getAllByRole("img")).toHaveLength(24);
    await user.click(screen.getByRole("button", { name: "Previous pages" }));
    expect(screen.getByText(/PAGE 1 OF 22/i)).toBeInTheDocument();
  });

  it("navigates with arrow keys on the binder region", async () => {
    const user = userEvent.setup();
    renderPreview();
    const region = screen.getByRole("group", { name: "Binder pages" });
    region.focus();
    await user.keyboard("{ArrowRight}");
    expect(screen.getByText(/PAGES 2–3 OF 22/i)).toBeInTheDocument();
    await user.keyboard("{ArrowLeft}");
    expect(screen.getByText(/PAGE 1 OF 22/i)).toBeInTheDocument();
  });

  it("clamps navigation at the ends", async () => {
    const user = userEvent.setup();
    renderPreview();
    expect(screen.getByRole("button", { name: "Previous pages" })).toBeDisabled();
    // jump to the last spread
    const region = screen.getByRole("group", { name: "Binder pages" });
    region.focus();
    await user.keyboard("{End}");
    expect(screen.getByText(/PAGE 22 OF 22/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Next pages" })).toBeDisabled();
  });

  it("alt text carries name, number and rarity", () => {
    renderPreview();
    expect(
      screen.getByRole("img", { name: "Pineco · 1/198 · Common" }),
    ).toBeInTheDocument();
  });

  it("master mode marks reverse slots with a REV badge", async () => {
    const user = userEvent.setup();
    renderPreview("master");
    // First spread (page 1) of master sv1 includes reverse slots.
    const badges = screen.getAllByText("REV");
    expect(badges.length).toBeGreaterThan(0);
    expect(badges[0]!).toHaveAttribute("aria-label", "Reverse holo pocket");
    await user.click(screen.getByRole("button", { name: "Next pages" }));
    expect(screen.getAllByText("REV").length).toBeGreaterThan(0);
  });

  it("lazy-loads card images", () => {
    renderPreview();
    const img = screen.getAllByRole("img")[0]!;
    expect(img).toHaveAttribute("loading", "lazy");
  });

  it("falls back to a text tile when an image fails", async () => {
    renderPreview();
    const img = screen.getByRole("img", { name: "Pineco · 1/198 · Common" });
    // fireEvent error
    img.dispatchEvent(new Event("error"));
    expect(await screen.findByText("Pineco")).toBeInTheDocument();
    expect(screen.getByText("#1")).toBeInTheDocument();
  });

  it("empty pockets are decorative", () => {
    const fewCards = sv1Cards.slice(0, 7);
    const layout = buildBinderLayout(fewCards, sv1Set, { ...DEFAULT_CONFIG });
    const { container } = render(<BinderPreview set={sv1Set} layout={layout} />);
    const empties = container.querySelectorAll('[data-gb-empty="true"]');
    expect(empties).toHaveLength(5);
    empties.forEach((e) => expect(e).toHaveAttribute("aria-hidden", "true"));
  });

  it("zero pages shows a friendly message", () => {
    const layout = buildBinderLayout([], sv1Set, { ...DEFAULT_CONFIG });
    render(<BinderPreview set={sv1Set} layout={layout} />);
    expect(screen.getByText(/NO CARDS TO SHOW/i)).toBeInTheDocument();
  });

  it("axe clean", async () => {
    const { container } = renderPreview();
    expect(await axe(container)).toHaveNoViolations();
  });

  describe("card inspection", () => {
    it("slots become labelled buttons when onInspect is provided", async () => {
      const user = userEvent.setup();
      const onInspect = vi.fn();
      const layout = buildBinderLayout(sv1Cards, sv1Set, { ...DEFAULT_CONFIG, mode: "master" });
      render(<BinderPreview set={sv1Set} layout={layout} onInspect={onInspect} />);
      const btn = screen.getByRole("button", { name: "View details: Pineco · 1/198 · Common" });
      expect(btn.className).toMatch(/w-full/);
      await user.click(btn);
      expect(onInspect).toHaveBeenCalledWith(expect.objectContaining({ id: "sv1-1" }), "card");
    });

    it("reverse pockets report their kind", async () => {
      const user = userEvent.setup();
      const onInspect = vi.fn();
      const layout = buildBinderLayout(sv1Cards, sv1Set, { ...DEFAULT_CONFIG, mode: "master" });
      render(<BinderPreview set={sv1Set} layout={layout} onInspect={onInspect} />);
      await user.click(
        screen.getByRole("button", {
          name: "View details: Pineco · 1/198 · Common (Reverse holo)",
        }),
      );
      expect(onInspect).toHaveBeenCalledWith(expect.objectContaining({ id: "sv1-1" }), "reverse");
    });

    it("tick mode wins over inspection", () => {
      const layout = buildBinderLayout(sv1Cards.slice(0, 9), sv1Set, DEFAULT_CONFIG);
      render(
        <BinderPreview
          set={sv1Set}
          layout={layout}
          onInspect={vi.fn()}
          tick={{ isChecked: () => false, toggle: vi.fn() }}
        />,
      );
      expect(screen.getAllByRole("checkbox").length).toBeGreaterThan(0);
      expect(screen.queryByRole("button", { name: /View details/ })).not.toBeInTheDocument();
    });
  });
});
