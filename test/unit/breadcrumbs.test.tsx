import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("next/navigation", () => ({ usePathname: () => "/card/me4-1" }));

import { Breadcrumbs } from "@/components/breadcrumbs";
import { pushTrail } from "@/lib/nav-trail";

const parents = [
  { url: "/sets", label: "All sets" },
  { url: "/set/me4", label: "Chaos Rising" },
];

beforeEach(() => sessionStorage.clear());

describe("Breadcrumbs", () => {
  it("shows the logical default ancestry on a direct landing", () => {
    const { container } = render(<Breadcrumbs parents={parents} label="Weedle" />);
    expect(container.querySelector('a[href="/sets"]')?.textContent).toBe("All sets");
    expect(container.querySelector('a[href="/set/me4"]')?.textContent).toBe("Chaos Rising");
    // current page is not a link
    expect(screen.getByText("Weedle").closest("a")).toBeNull();
  });

  it("reflects the actual path the user took when there is a trail", () => {
    // User came from a Pokémon page, not via the set.
    pushTrail("/pokemon/pikachu", "Pikachu");
    const { container } = render(<Breadcrumbs parents={parents} label="Weedle" />);
    expect(container.querySelector('a[href="/pokemon/pikachu"]')?.textContent).toBe("Pikachu");
    // the logical default (All sets) is NOT shown — the real path wins
    expect(container.querySelector('a[href="/sets"]')).toBeNull();
    expect(screen.getByText("Weedle")).toBeInTheDocument();
  });

  it("records the current page in the trail", () => {
    pushTrail("/pokemon/pikachu", "Pikachu");
    render(<Breadcrumbs parents={parents} label="Weedle" />);
    const trail = JSON.parse(sessionStorage.getItem("bindermon:v1:trail")!);
    expect(trail[trail.length - 1]).toEqual({ url: "/card/me4-1", label: "Weedle" });
  });
});
