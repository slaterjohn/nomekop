import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { GbLinkButton } from "@/components/gb/gb-button";

describe("GbLinkButton", () => {
  it("renders an anchor with the internal href and GB button classes", () => {
    render(<GbLinkButton href="/sets">Sets</GbLinkButton>);
    const link = screen.getByRole("link", { name: "Sets" });
    // next/link renders an <a>; for internal client-side nav we get the path verbatim.
    expect(link.tagName).toBe("A");
    expect(link).toHaveAttribute("href", "/sets");
    // The GB button skin is preserved on the Link branch.
    expect(link.className).toMatch(/min-h-11/);
    expect(link.className).toMatch(/font-pixel/);
    // Internal links are not given external-link treatment.
    expect(link).not.toHaveAttribute("target");
    expect(link).not.toHaveAttribute("rel");
  });

  it("renders a plain anchor for external href + target=_blank", () => {
    render(
      <GbLinkButton href="https://example.com" target="_blank" rel="noopener">
        Out
      </GbLinkButton>,
    );
    const link = screen.getByRole("link", { name: "Out" });
    expect(link.tagName).toBe("A");
    expect(link).toHaveAttribute("href", "https://example.com");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener");
  });

  it("keeps a plain anchor for protocol-relative (non-internal) hrefs", () => {
    render(<GbLinkButton href="//cdn.example.com/x">Cdn</GbLinkButton>);
    const link = screen.getByRole("link", { name: "Cdn" });
    expect(link).toHaveAttribute("href", "//cdn.example.com/x");
  });

  it("applies className, children, variant and size on the internal Link branch", () => {
    render(
      <GbLinkButton href="/build?set=sv1" variant="b" size="sm" className="custom-class">
        Build
      </GbLinkButton>,
    );
    const link = screen.getByRole("link", { name: "Build" });
    expect(link).toHaveAttribute("href", "/build?set=sv1");
    expect(link).toHaveTextContent("Build");
    expect(link.className).toContain("custom-class");
    // variant="b" → bg-gb-bg fill; size="sm" → the small text token.
    expect(link.className).toMatch(/bg-gb-bg/);
    expect(link.className).toMatch(/text-\[10px\]/);
  });
});
