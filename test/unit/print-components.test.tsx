import { describe, it, expect, beforeAll } from "vitest";
import { render, screen } from "@testing-library/react";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { PrintBinder } from "@/components/print/print-binder";
import { PrintChecklist } from "@/components/print/print-checklist";
import { PrintPlaceholders } from "@/components/print/print-placeholders";
import { buildBinderLayout, expandOptionsFrom, expandSlots } from "@/lib/layout";
import { DEFAULT_CONFIG, type BinderConfig } from "@/lib/config";
import type { TcgCard, TcgSet } from "@/lib/tcg/types";

let base1Cards: TcgCard[];
const base1Set: TcgSet = {
  id: "base1",
  name: "Base",
  series: "Base",
  printedTotal: 102,
  total: 102,
  releaseDate: "1999/01/09",
  symbolUrl: "https://images.pokemontcg.io/base1/symbol.png",
  logoUrl: "",
};

const config: BinderConfig = { ...DEFAULT_CONFIG, set: "base1" };

beforeAll(async () => {
  base1Cards = JSON.parse(
    await readFile(path.join(process.cwd(), "test", "fixtures", "cards-base1.json"), "utf8"),
  );
});

describe("PrintBinder", () => {
  it("renders one sheet per binder page with headers and footers", () => {
    const layout = buildBinderLayout(base1Cards, base1Set, config);
    const { container } = render(<PrintBinder set={base1Set} layout={layout} config={config} />);
    expect(container.querySelectorAll(".print-sheet")).toHaveLength(9);
    expect(screen.getByText("Page 1/9 · 3×4")).toBeInTheDocument();
    expect(screen.getByText("Page 9/9 · 3×4")).toBeInTheDocument();
  });

  it("labels every card and proxies images", () => {
    const layout = buildBinderLayout(base1Cards.slice(0, 3), base1Set, config);
    const { container } = render(<PrintBinder set={base1Set} layout={layout} config={config} />);
    expect(screen.getByText(/Alakazam · 1 · Rare Holo/)).toBeInTheDocument();
    const img = container.querySelector(".print-slot-image img")!;
    expect(img.getAttribute("src")).toMatch(/^\/api\/img\?src=https%3A%2F%2Fimages\.pokemontcg\.io/);
  });

  it("pads the last sheet with dashed empty pockets", () => {
    const layout = buildBinderLayout(base1Cards.slice(0, 7), base1Set, config);
    const { container } = render(<PrintBinder set={base1Set} layout={layout} config={config} />);
    expect(container.querySelectorAll(".print-slot-empty")).toHaveLength(5);
  });

  it("retro style flips the typography class", () => {
    const layout = buildBinderLayout(base1Cards.slice(0, 3), base1Set, config);
    const { container } = render(
      <PrintBinder set={base1Set} layout={layout} config={{ ...config, style: "retro" }} />,
    );
    expect(container.querySelector(".print-root")!.className).toContain("print-retro");
  });
});

describe("PrintChecklist", () => {
  it("renders one row per pocket in 28-row sheets", () => {
    const slots = expandSlots(base1Cards, expandOptionsFrom(config, base1Set));
    const { container } = render(<PrintChecklist set={base1Set} slots={slots} config={config} />);
    expect(container.querySelectorAll("tbody tr")).toHaveLength(102);
    expect(container.querySelectorAll(".print-sheet")).toHaveLength(Math.ceil(102 / 28));
    expect(container.querySelectorAll(".print-tickbox")).toHaveLength(102);
  });

  it("master mode adds reverse rows with variant labels", () => {
    const sv1Slots = expandSlots(
      base1Cards.map((c) => ({ ...c, variants: { ...c.variants, reverse: true } })),
      expandOptionsFrom({ ...config, mode: "master" }, base1Set),
    );
    const { container } = render(
      <PrintChecklist set={base1Set} slots={sv1Slots} config={{ ...config, mode: "master" }} />,
    );
    expect(container.querySelectorAll("tbody tr")).toHaveLength(204);
    expect(screen.getAllByText("Reverse holo")).toHaveLength(102);
  });
});

describe("PrintPlaceholders", () => {
  it("renders six true-size placeholders per sheet with crop marks", () => {
    const slots = expandSlots(base1Cards, expandOptionsFrom(config, base1Set));
    const { container } = render(<PrintPlaceholders set={base1Set} slots={slots} config={config} />);
    expect(container.querySelectorAll(".print-placeholder")).toHaveLength(102);
    expect(container.querySelectorAll(".print-sheet")).toHaveLength(Math.ceil(102 / 6));
    expect(container.querySelectorAll(".print-crop-tl")).toHaveLength(102);
    expect(screen.getByText("1/102 · Rare Holo")).toBeInTheDocument();
  });
});
