import { describe, it, expect, beforeEach, beforeAll } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  useChecklist,
  useCollectionMode,
  toggleSlot,
  clearChecklist,
  __resetChecklistStoreForTests,
} from "@/lib/checklist-store";
import { BinderPreview } from "@/components/builder/binder-preview";
import { buildBinderLayout } from "@/lib/layout";
import { DEFAULT_CONFIG } from "@/lib/config";
import { GbProgress } from "@/components/gb/gb-progress";
import type { TcgCard, TcgSet } from "@/lib/tcg/types";

beforeEach(() => {
  localStorage.clear();
  __resetChecklistStoreForTests();
});

describe("collection mode persistence", () => {
  it("defaults off, persists toggles to localStorage", async () => {
    const user = userEvent.setup();
    function Probe() {
      const { enabled, setEnabled } = useCollectionMode();
      return (
        <button onClick={() => setEnabled(!enabled)}>{enabled ? "ON" : "OFF"}</button>
      );
    }
    render(<Probe />);
    expect(screen.getByRole("button")).toHaveTextContent("OFF");
    await user.click(screen.getByRole("button"));
    expect(screen.getByRole("button")).toHaveTextContent("ON");
    expect(localStorage.getItem("bindermon:v1:collection-mode")).toBe("1");
  });

  it("hydrates from a stored value", () => {
    localStorage.setItem("bindermon:v1:collection-mode", "1");
    function Probe() {
      const { enabled } = useCollectionMode();
      return <span>{enabled ? "ON" : "OFF"}</span>;
    }
    render(<Probe />);
    expect(screen.getByText("ON")).toBeInTheDocument();
  });
});

describe("checklist store", () => {
  it("toggles, persists and clears", () => {
    toggleSlot("sv1", "standard", "sv1-1:card");
    toggleSlot("sv1", "standard", "sv1-2:card");
    expect(JSON.parse(localStorage.getItem("bindermon:v1:checklist:sv1:standard")!)).toEqual([
      "sv1-1:card",
      "sv1-2:card",
    ]);
    toggleSlot("sv1", "standard", "sv1-1:card");
    expect(JSON.parse(localStorage.getItem("bindermon:v1:checklist:sv1:standard")!)).toEqual([
      "sv1-2:card",
    ]);
    clearChecklist("sv1", "standard");
    expect(JSON.parse(localStorage.getItem("bindermon:v1:checklist:sv1:standard")!)).toEqual([]);
  });

  it("keys per set and mode", () => {
    toggleSlot("sv1", "standard", "x:card");
    toggleSlot("sv1", "master", "x:card");
    toggleSlot("base1", "standard", "x:card");
    expect(localStorage.getItem("bindermon:v1:checklist:sv1:standard")).not.toBeNull();
    expect(localStorage.getItem("bindermon:v1:checklist:sv1:master")).not.toBeNull();
    expect(localStorage.getItem("bindermon:v1:checklist:base1:standard")).not.toBeNull();
  });

  it("hook reflects toggles reactively", async () => {
    const user = userEvent.setup();
    function Probe() {
      const { count, toggle, isChecked } = useChecklist("sv1", "standard");
      return (
        <div>
          <span data-testid="count">{count}</span>
          <span data-testid="checked">{String(isChecked("a:card"))}</span>
          <button onClick={() => toggle("a:card")}>flip</button>
        </div>
      );
    }
    render(<Probe />);
    expect(screen.getByTestId("count")).toHaveTextContent("0");
    await user.click(screen.getByRole("button", { name: "flip" }));
    expect(screen.getByTestId("count")).toHaveTextContent("1");
    expect(screen.getByTestId("checked")).toHaveTextContent("true");
  });

  it("survives garbage in storage", () => {
    localStorage.setItem("bindermon:v1:checklist:sv1:standard", "{broken");
    function Probe() {
      const { count } = useChecklist("sv1", "standard");
      return <span data-testid="count">{count}</span>;
    }
    render(<Probe />);
    expect(screen.getByTestId("count")).toHaveTextContent("0");
  });
});

describe("BinderPreview tick mode", () => {
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

  function Harness() {
    const layout = buildBinderLayout(sv1Cards.slice(0, 9), sv1Set, DEFAULT_CONFIG);
    const checklist = useChecklist("sv1", "standard");
    return (
      <div>
        <GbProgress label="COLLECTED" value={checklist.count} max={layout.stats.slots} />
        <BinderPreview set={sv1Set} layout={layout} tick={checklist} />
      </div>
    );
  }

  it("slots are checkboxes that toggle and persist", async () => {
    const user = userEvent.setup();
    const { unmount } = render(<Harness />);
    const box = screen.getByRole("checkbox", { name: /Collected: Pineco/ });
    expect(box).toHaveAttribute("aria-checked", "false");
    await user.click(box);
    expect(box).toHaveAttribute("aria-checked", "true");
    expect(screen.getByText("1/9")).toBeInTheDocument();

    unmount();
    render(<Harness />);
    expect(screen.getByRole("checkbox", { name: /Collected: Pineco/ })).toHaveAttribute(
      "aria-checked",
      "true",
    );
  });

  it("tick mark is decorative; state carried by aria-checked", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const box = screen.getByRole("checkbox", { name: /Collected: Pineco/ });
    await user.click(box);
    const tickMark = box.querySelector("[data-gb-tick]");
    expect(tickMark).not.toBeNull();
    expect(tickMark!).toHaveAttribute("aria-hidden", "true");
  });

  it("checkbox buttons fill their grid cell (regression: collapsed to 4px)", () => {
    render(<Harness />);
    const box = screen.getByRole("checkbox", { name: /Collected: Pineco/ });
    expect(box.className).toMatch(/w-full/);
    expect(box.className).toMatch(/block/);
  });

  it("card images carry explicit width/height fallbacks", () => {
    render(<Harness />);
    const img = screen.getByRole("checkbox", { name: /Collected: Pineco/ }).querySelector("img")!;
    expect(img).toHaveAttribute("width");
    expect(img).toHaveAttribute("height");
  });
});
