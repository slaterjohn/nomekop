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
let preCards: TcgCard[];

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

const preSet: TcgSet = {
  id: "sv8pt5",
  name: "Prismatic Evolutions",
  series: "Scarlet & Violet",
  printedTotal: 131,
  total: 180,
  releaseDate: "2025/01/17",
  symbolUrl: "",
  logoUrl: "",
};

beforeAll(async () => {
  const dir = path.join(process.cwd(), "test", "fixtures");
  sv1Cards = JSON.parse(await readFile(path.join(dir, "cards-sv1.json"), "utf8"));
  preCards = JSON.parse(await readFile(path.join(dir, "cards-sv8pt5.json"), "utf8"));
});

describe("ConfigPanel — binder size", () => {
  it("marks the default 12 PKT preset and hides steppers", () => {
    render(
      <ConfigPanel set={sv1Set} cards={sv1Cards} config={{ ...DEFAULT_CONFIG, set: "sv1" }} onChange={vi.fn()} />,
    );
    expect(screen.getByRole("button", { name: "12 PKT" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.queryByRole("spinbutton", { name: "ROWS" })).not.toBeInTheDocument();
  });

  it("pocket presets patch rows and cols", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <ConfigPanel set={sv1Set} cards={sv1Cards} config={{ ...DEFAULT_CONFIG, set: "sv1" }} onChange={onChange} />,
    );
    await user.click(screen.getByRole("button", { name: "9 PKT" }));
    expect(onChange).toHaveBeenCalledWith({ rows: 3, cols: 3 });
    await user.click(screen.getByRole("button", { name: "16 PKT" }));
    expect(onChange).toHaveBeenCalledWith({ rows: 4, cols: 4 });
  });

  it("CUSTOM reveals the steppers, which patch dimensions", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <ConfigPanel set={sv1Set} cards={sv1Cards} config={{ ...DEFAULT_CONFIG, set: "sv1" }} onChange={onChange} />,
    );
    await user.click(screen.getByRole("button", { name: "CUSTOM" }));
    await user.click(screen.getByRole("button", { name: "Increase ROWS" }));
    expect(onChange).toHaveBeenCalledWith({ rows: 4 });
  });

  it("non-preset dimensions open as custom automatically", () => {
    render(
      <ConfigPanel
        set={sv1Set}
        cards={sv1Cards}
        config={{ ...DEFAULT_CONFIG, set: "sv1", rows: 5, cols: 2 }}
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByRole("spinbutton", { name: "ROWS" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "CUSTOM" })).toHaveAttribute("aria-pressed", "true");
  });
});

describe("ConfigPanel — modes and variants", () => {
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

  it("ordinary sets in master mode: no ball toggles, but placement IS offered (reverse holos)", () => {
    const onChange = vi.fn();
    render(
      <ConfigPanel
        set={sv1Set}
        cards={sv1Cards}
        config={{ ...DEFAULT_CONFIG, set: "sv1", mode: "master" }}
        onChange={onChange}
      />,
    );
    expect(screen.queryByRole("switch", { name: "POKÉ BALL" })).not.toBeInTheDocument();
    expect(screen.getByRole("listbox", { name: "Variant placement" })).toBeInTheDocument();
  });

  it("sets without any parallels hide the mode menu entirely (the set IS complete)", async () => {
    const base1Cards: TcgCard[] = JSON.parse(
      await readFile(path.join(process.cwd(), "test", "fixtures", "cards-base1.json"), "utf8"),
    );
    const base1Set: TcgSet = {
      id: "base1",
      name: "Base",
      series: "Base",
      printedTotal: 102,
      total: 102,
      releaseDate: "1999/01/09",
      symbolUrl: "",
      logoUrl: "",
    };
    render(
      <ConfigPanel
        set={base1Set}
        cards={base1Cards}
        config={{ ...DEFAULT_CONFIG, set: "base1" }}
        onChange={vi.fn()}
      />,
    );
    expect(screen.queryByRole("listbox", { name: "Collection mode" })).not.toBeInTheDocument();
    expect(screen.getByText(/COMPLETE SET — NO PARALLEL PRINTS/)).toBeInTheDocument();
    expect(screen.queryByRole("listbox", { name: "Variant placement" })).not.toBeInTheDocument();
  });

  it("Prismatic Evolutions master mode reveals ball toggles and placement", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <ConfigPanel
        set={preSet}
        cards={preCards}
        config={{ ...DEFAULT_CONFIG, set: "sv8pt5", mode: "master" }}
        onChange={onChange}
      />,
    );
    await user.click(screen.getByRole("switch", { name: "POKÉ BALL" }));
    expect(onChange).toHaveBeenCalledWith({ pb: false });
    await user.click(screen.getByRole("switch", { name: "MASTER BALL" }));
    expect(onChange).toHaveBeenCalledWith({ mb: false });
    await user.click(screen.getByRole("option", { name: /AT END/ }));
    expect(onChange).toHaveBeenCalledWith({ place: "end" });
  });

  it("standard mode hides ball options even for Prismatic Evolutions", () => {
    render(
      <ConfigPanel
        set={preSet}
        cards={preCards}
        config={{ ...DEFAULT_CONFIG, set: "sv8pt5" }}
        onChange={vi.fn()}
      />,
    );
    expect(screen.queryByRole("switch", { name: "POKÉ BALL" })).not.toBeInTheDocument();
  });

  it("stats line reflects the engine (PRE full master set)", () => {
    render(
      <ConfigPanel
        set={preSet}
        cards={preCards}
        config={{ ...DEFAULT_CONFIG, set: "sv8pt5", mode: "master" }}
        onChange={vi.fn()}
      />,
    );
    // 180 cards + 100 reverse + 100 poké + 67 master = 447 pockets / 12 per page
    expect(screen.getByText("180 CARDS → 447 POCKETS → 38 PAGES")).toBeInTheDocument();
  });

  it("axe clean (with variant options open)", async () => {
    const { container } = render(
      <ConfigPanel
        set={preSet}
        cards={preCards}
        config={{ ...DEFAULT_CONFIG, set: "sv8pt5", mode: "master" }}
        onChange={vi.fn()}
      />,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
