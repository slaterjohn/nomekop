import { describe, it, expect, vi, beforeAll } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "vitest-axe";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { ConfigPanel } from "@/components/builder/config-panel";
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

describe("ConfigPanel", () => {
  it("steppers patch rows and cols", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <ConfigPanel set={sv1Set} cards={sv1Cards} config={{ ...DEFAULT_CONFIG, set: "sv1" }} onChange={onChange} />,
    );
    await user.click(screen.getByRole("button", { name: "Increase ROWS" }));
    expect(onChange).toHaveBeenCalledWith({ rows: 4 });
    await user.click(screen.getByRole("button", { name: "Decrease COLS" }));
    expect(onChange).toHaveBeenCalledWith({ cols: 2 });
  });

  it("presets set both dimensions and mark the active one", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <ConfigPanel set={sv1Set} cards={sv1Cards} config={{ ...DEFAULT_CONFIG, set: "sv1" }} onChange={onChange} />,
    );
    expect(screen.getByRole("button", { name: "3×3" })).toHaveAttribute("aria-pressed", "true");
    await user.click(screen.getByRole("button", { name: "4×3" }));
    expect(onChange).toHaveBeenCalledWith({ rows: 4, cols: 3 });
  });

  it("collection mode menu patches mode", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <ConfigPanel set={sv1Set} cards={sv1Cards} config={{ ...DEFAULT_CONFIG, set: "sv1" }} onChange={onChange} />,
    );
    await user.click(screen.getByRole("option", { name: /MASTER/ }));
    expect(onChange).toHaveBeenCalledWith({ mode: "master" });
  });

  it("secrets toggle patches secrets", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <ConfigPanel set={sv1Set} cards={sv1Cards} config={{ ...DEFAULT_CONFIG, set: "sv1" }} onChange={onChange} />,
    );
    await user.click(screen.getByRole("switch", { name: "SECRET RARES" }));
    expect(onChange).toHaveBeenCalledWith({ secrets: false });
  });

  it("stats line reflects the layout engine", () => {
    render(
      <ConfigPanel
        set={sv1Set}
        cards={sv1Cards}
        config={{ ...DEFAULT_CONFIG, set: "sv1", mode: "master" }}
        onChange={vi.fn()}
      />,
    );
    const reverseCount = sv1Cards.filter((c) => c.variants.reverse).length;
    const slots = 258 + reverseCount;
    const pages = Math.ceil(slots / 9);
    expect(screen.getByText(`258 CARDS → ${slots} POCKETS → ${pages} PAGES`)).toBeInTheDocument();
  });

  it("axe clean", async () => {
    const { container } = render(
      <ConfigPanel set={sv1Set} cards={sv1Cards} config={{ ...DEFAULT_CONFIG, set: "sv1" }} onChange={vi.fn()} />,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
