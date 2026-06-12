import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "vitest-axe";
import { SetSelector } from "@/components/builder/set-selector";
import type { TcgSet } from "@/lib/tcg/types";

const SETS: TcgSet[] = [
  {
    id: "base1",
    name: "Base",
    series: "Base",
    printedTotal: 102,
    total: 102,
    releaseDate: "1999/01/09",
    symbolUrl: "https://images.pokemontcg.io/base1/symbol.png",
    logoUrl: "",
  },
  {
    id: "sv1",
    name: "Scarlet & Violet",
    series: "Scarlet & Violet",
    printedTotal: 198,
    total: 258,
    releaseDate: "2023/03/31",
    symbolUrl: "https://images.pokemontcg.io/sv1/symbol.png",
    logoUrl: "",
  },
  {
    id: "sv2",
    name: "Paldea Evolved",
    series: "Scarlet & Violet",
    printedTotal: 193,
    total: 279,
    releaseDate: "2023/06/09",
    symbolUrl: "",
    logoUrl: "",
  },
];

describe("SetSelector", () => {
  it("renders sets grouped by series", () => {
    render(<SetSelector sets={SETS} onSelect={vi.fn()} />);
    expect(screen.getByText("Base", { selector: "[cmdk-group-heading]" })).toBeInTheDocument();
    expect(
      screen.getByText("Scarlet & Violet", { selector: "[cmdk-group-heading]" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Paldea Evolved")).toBeInTheDocument();
  });

  it("shows card counts per set", () => {
    render(<SetSelector sets={SETS} onSelect={vi.fn()} />);
    const item = screen.getByText("Paldea Evolved").closest("[cmdk-item]")!;
    expect(within(item as HTMLElement).getByText(/279/)).toBeInTheDocument();
  });

  it("filters as you type", async () => {
    const user = userEvent.setup();
    render(<SetSelector sets={SETS} onSelect={vi.fn()} />);
    await user.type(screen.getByRole("combobox", { name: /search sets/i }), "paldea");
    expect(screen.queryByRole("option", { name: /Base/ })).not.toBeInTheDocument();
    expect(screen.getByRole("option", { name: /Paldea Evolved/ })).toBeInTheDocument();
  });

  it("selects with keyboard (arrows + Enter)", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<SetSelector sets={SETS} onSelect={onSelect} />);
    const input = screen.getByRole("combobox", { name: /search sets/i });
    await user.type(input, "scarlet & violet");
    await user.keyboard("{ArrowDown}{Enter}");
    expect(onSelect).toHaveBeenCalledTimes(1);
    const selected = onSelect.mock.calls[0]![0] as TcgSet;
    expect(["sv1", "sv2"]).toContain(selected.id);
  });

  it("selects by click", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<SetSelector sets={SETS} onSelect={onSelect} />);
    await user.click(screen.getByText("Paldea Evolved"));
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: "sv2" }));
  });

  it("shows MISSINGNO empty state for hopeless searches", async () => {
    const user = userEvent.setup();
    render(<SetSelector sets={SETS} onSelect={vi.fn()} />);
    await user.type(screen.getByRole("combobox", { name: /search sets/i }), "zzzzz");
    expect(screen.getByText(/MISSINGNO/)).toBeInTheDocument();
  });

  it("loading state shows the spinner", () => {
    render(<SetSelector sets={undefined} isLoading onSelect={vi.fn()} />);
    expect(screen.getByRole("status")).toHaveTextContent(/LOADING SETS/);
  });

  it("error state shows an alert with retry", async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    render(<SetSelector sets={undefined} error="The library is down." onRetry={onRetry} onSelect={vi.fn()} />);
    expect(screen.getByRole("alert")).toHaveTextContent("The library is down.");
    await user.click(screen.getByRole("button", { name: "RETRY" }));
    expect(onRetry).toHaveBeenCalled();
  });

  it("axe clean", async () => {
    const { container } = render(<SetSelector sets={SETS} onSelect={vi.fn()} />);
    expect(await axe(container)).toHaveNoViolations();
  });

  describe("sorting", () => {
    it("defaults to newest-first (groups and sets)", () => {
      render(<SetSelector sets={SETS} onSelect={vi.fn()} />);
      const names = screen.getAllByRole("option").map((o) => o.textContent);
      // sv2 (2023/06) → sv1 (2023/03) → base1 (1999)
      expect(names[0]).toContain("Paldea Evolved");
      expect(names[1]).toContain("Scarlet & Violet");
      expect(names[2]).toContain("Base");
    });

    it("OLDEST flips the order", async () => {
      const user = userEvent.setup();
      render(<SetSelector sets={SETS} onSelect={vi.fn()} />);
      await user.click(screen.getByRole("button", { name: "Sort oldest first" }));
      const names = screen.getAllByRole("option").map((o) => o.textContent);
      expect(names[0]).toContain("Base");
      expect(names[2]).toContain("Paldea Evolved");
    });

    it("A–Z sorts groups and sets alphabetically", async () => {
      const user = userEvent.setup();
      render(<SetSelector sets={SETS} onSelect={vi.fn()} />);
      await user.click(screen.getByRole("button", { name: "Sort alphabetically" }));
      const names = screen.getAllByRole("option").map((o) => o.textContent);
      expect(names[0]).toContain("Base");
      expect(names[1]).toContain("Paldea Evolved");
      expect(names[2]).toContain("Scarlet & Violet");
    });

    it("sort buttons expose pressed state", () => {
      render(<SetSelector sets={SETS} onSelect={vi.fn()} />);
      expect(screen.getByRole("button", { name: "Sort newest first" })).toHaveAttribute(
        "aria-pressed",
        "true",
      );
      expect(screen.getByRole("button", { name: "Sort alphabetically" })).toHaveAttribute(
        "aria-pressed",
        "false",
      );
    });
  });
});
