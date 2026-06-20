import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { axe } from "vitest-axe";
import { BinderShelf } from "@/components/builder/binder-shelf";
import { bindersFor } from "@/lib/binders";

beforeEach(() => {
  vi.unstubAllEnvs();
});

describe("bindersFor", () => {
  it("matches common pocket counts exactly", () => {
    expect(bindersFor(12).exact).toBe(true);
    expect(bindersFor(12).products.every((p) => p.pockets === 12)).toBe(true);
    expect(bindersFor(9).products.length).toBeGreaterThan(0);
  });

  it("suggests the nearest size for custom grids", () => {
    const { exact, products } = bindersFor(10);
    expect(exact).toBe(false);
    expect(products[0]!.pockets).toBe(9);
  });
});

describe("BinderShelf", () => {
  it("lists matching Vault X binders with shop links", () => {
    render(<BinderShelf pockets={12} pages={22} />);
    expect(screen.getByText("Vault X 12-Pocket Exo-Tec Zip Binder")).toBeInTheDocument();
    expect(screen.getByText(/need 22 pages/)).toBeInTheDocument();
    // External shop links (not the internal "compare" link) carry rel=sponsored.
    const shopLinks = screen
      .getAllByRole("link")
      .filter((l) => (l.getAttribute("href") ?? "").startsWith("http"));
    expect(shopLinks.length).toBeGreaterThanOrEqual(4); // 2 products × 2 shops
    shopLinks.forEach((l) => expect(l).toHaveAttribute("rel", expect.stringContaining("sponsored")));
  });

  it("flags non-standard sizes and shows the nearest binder", () => {
    render(<BinderShelf pockets={25} pages={5} />);
    expect(screen.getByText(/No off-the-shelf 25-pocket binder/)).toBeInTheDocument();
    expect(screen.getByText(/16-Pocket/)).toBeInTheDocument();
  });

  it("appends the Amazon affiliate tag when configured", () => {
    vi.stubEnv("NEXT_PUBLIC_AMAZON_TAG", "bindermon-21");
    render(<BinderShelf pockets={9} pages={12} />);
    const amazon = screen.getAllByRole("link", { name: /Amazon/ })[0]!;
    expect(amazon.getAttribute("href")).toContain("tag=bindermon-21");
    expect(screen.getByText(/may earn Nomekop a small commission/)).toBeInTheDocument();
  });

  it("plain links + honest disclosure without affiliate config", () => {
    render(<BinderShelf pockets={9} pages={12} />);
    const amazon = screen.getAllByRole("link", { name: /Amazon/ })[0]!;
    expect(amazon.getAttribute("href")).not.toContain("tag=");
    expect(screen.getByText(/not affiliated with Vault X/)).toBeInTheDocument();
  });

  it("axe clean", async () => {
    const { container } = render(<BinderShelf pockets={12} pages={22} />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
