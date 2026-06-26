import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { axe } from "vitest-axe";
import type { SearchEntry } from "@/lib/search/types";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

// Deterministic index — no network fetch in tests.
const ENTRIES: SearchEntry[] = [
  { type: "pokemon", label: "Charizard", sublabel: "#006", url: "/pokemon/charizard" },
  { type: "pokemon", label: "Pikachu", sublabel: "#025", url: "/pokemon/pikachu" },
  { type: "set", label: "Base Set", url: "/set/base1" },
  { type: "set", label: "Chaos Rising", url: "/set/me4" },
  { type: "artist", label: "Ken Sugimori", url: "/illustrator/ken-sugimori" },
  { type: "faq", label: "How many cards are in Base Set?", url: "/faq/base-set-count" },
];
vi.mock("@/lib/search/use-search-index", () => ({
  useSearchIndex: () => ({ entries: ENTRIES, ready: true }),
}));

import { SiteSearchBox } from "@/components/search/site-search-box";
import { SiteSearchDialog } from "@/components/search/site-search-dialog";

function type(value: string) {
  const input = screen.getByRole("combobox");
  fireEvent.focus(input);
  fireEvent.change(input, { target: { value } });
  return input;
}

beforeEach(() => push.mockClear());

describe("SiteSearchBox", () => {
  it("shows grouped suggestions for the matching types only", () => {
    render(<SiteSearchBox placeholder="Search…" />);
    type("base");
    // Sets + FAQs match "base"; Pokémon do not — so no Pokémon group.
    expect(screen.getByText("Base Set")).toBeInTheDocument();
    expect(screen.getByText("How many cards are in Base Set?")).toBeInTheDocument();
    expect(screen.queryByText("Charizard")).not.toBeInTheDocument();
  });

  it("scopes results to a single section", () => {
    render(<SiteSearchBox scope="pokemon" placeholder="Search Pokémon…" />);
    type("pika");
    expect(screen.getByText("Pikachu")).toBeInTheDocument();
    // A set name must not surface under a Pokémon-scoped search.
    expect(screen.queryByText("Base Set")).not.toBeInTheDocument();
  });

  it("navigates to the picked result", () => {
    render(<SiteSearchBox />);
    type("pika");
    fireEvent.click(screen.getByText("Pikachu"));
    expect(push).toHaveBeenCalledWith("/pokemon/pikachu");
  });

  it("shows a no-matches message rather than an empty dropdown", () => {
    render(<SiteSearchBox scope="set" />);
    type("pikachu"); // no set matches
    expect(screen.getByText(/no matches/i)).toBeInTheDocument();
  });

  it("opens pre-filled from an initial query (Sitelinks ?q landing)", () => {
    render(<SiteSearchBox initialQuery="chariz" />);
    // No focus/typing — the dropdown is already open with the match.
    expect(screen.getByRole("combobox")).toHaveValue("chariz");
    expect(screen.getByText("Charizard")).toBeInTheDocument();
  });

  it("has no obvious accessibility violations", async () => {
    const { container } = render(<SiteSearchBox placeholder="Search…" />);
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe("SiteSearchDialog (⌘K)", () => {
  it("opens from the header trigger and searches the whole site", async () => {
    render(<SiteSearchDialog />);
    fireEvent.click(screen.getByRole("button", { name: /search the site/i }));
    const dialog = await screen.findByRole("dialog");
    const input = within(dialog).getByRole("combobox");
    fireEvent.change(input, { target: { value: "ken" } });
    expect(within(dialog).getByText("Ken Sugimori")).toBeInTheDocument();
    fireEvent.click(within(dialog).getByText("Ken Sugimori"));
    expect(push).toHaveBeenCalledWith("/illustrator/ken-sugimori");
  });

  it("opens on the ⌘K shortcut", async () => {
    render(<SiteSearchDialog />);
    fireEvent.keyDown(window, { key: "k", metaKey: true });
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
  });
});
