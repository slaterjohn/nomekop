import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { axe } from "vitest-axe";
import BindersPage from "@/app/binders/page";
import { affiliateUrl, BINDERS } from "@/lib/binders";

beforeEach(() => {
  vi.unstubAllEnvs();
});
afterEach(() => {
  vi.unstubAllEnvs();
});

describe("affiliateUrl", () => {
  const amazonLink = BINDERS.flatMap((b) => b.links).find((l) => l.retailer === "amazon")!;
  const vaultxLink = BINDERS.flatMap((b) => b.links).find((l) => l.retailer === "vaultx")!;

  it("returns a plain URL when no affiliate code is configured", () => {
    expect(affiliateUrl(amazonLink)).toBe(amazonLink.url);
  });

  it("appends each retailer's affiliate code from its env var", () => {
    vi.stubEnv("NEXT_PUBLIC_AMAZON_TAG", "nomekop-21");
    vi.stubEnv("NEXT_PUBLIC_VAULTX_REF", "nomekop");
    expect(affiliateUrl(amazonLink)).toContain("tag=nomekop-21");
    expect(affiliateUrl(vaultxLink)).toContain("ref=nomekop");
  });
});

describe("BindersPage (/binders)", () => {
  it("lists every catalogue binder with at least one shop link", () => {
    render(<BindersPage />);
    for (const binder of BINDERS) {
      expect(screen.getByText(binder.name)).toBeInTheDocument();
    }
    const shopLinks = screen
      .getAllByRole("link")
      .filter((l) => (l.getAttribute("href") ?? "").startsWith("http"));
    expect(shopLinks.length).toBeGreaterThanOrEqual(BINDERS.length);
    shopLinks.forEach((l) => expect(l).toHaveAttribute("rel", expect.stringContaining("sponsored")));
  });

  it("has no axe violations", async () => {
    const { container } = render(<BindersPage />);
    expect(await axe(container)).toHaveNoViolations();
  }, 30_000);
});
