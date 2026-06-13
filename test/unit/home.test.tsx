import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { axe } from "vitest-axe";
import { HomeTiles } from "@/components/home/home-tiles";
import { SiteFooter } from "@/components/site-footer";

describe("HomeTiles", () => {
  it("links to all four binder types with a CTA each", () => {
    render(<HomeTiles />);
    const expected: Array<[string, string]> = [
      ["/build", "BUILD A SET ▶"],
      ["/pokemon", "PICK A POKÉMON ▶"],
      ["/pokedex", "CHOOSE A REGION ▶"],
      ["/illustrator", "FIND AN ARTIST ▶"],
    ];
    for (const [href, cta] of expected) {
      const link = screen.getByRole("link", { name: new RegExp(cta.replace(/[▶]/g, "")) });
      expect(link).toHaveAttribute("href", href);
      expect(within(link).getByText(cta)).toBeInTheDocument();
    }
  });

  it("axe clean", async () => {
    const { container } = render(<HomeTiles />);
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe("SiteFooter", () => {
  it("carries the legal link and the not-affiliated notice", () => {
    render(<SiteFooter />);
    expect(screen.getByRole("link", { name: /Legal & credits/i })).toHaveAttribute("href", "/legal");
    expect(screen.getByText(/Not affiliated with Nintendo/i)).toBeInTheDocument();
  });

  it("links every section", () => {
    render(<SiteFooter />);
    for (const href of ["/build", "/pokemon", "/pokedex", "/illustrator", "/sets", "/legal"]) {
      expect(screen.getByRole("navigation", { name: "Footer" }).querySelector(`a[href="${href}"]`)).not.toBeNull();
    }
  });

  it("axe clean", async () => {
    const { container } = render(<SiteFooter />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
