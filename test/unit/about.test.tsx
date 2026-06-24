import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { axe } from "vitest-axe";
import AboutPage, { metadata } from "@/app/about/page";

describe("AboutPage", () => {
  it("renders a single About h1", () => {
    render(<AboutPage />);
    expect(screen.getByRole("heading", { level: 1, name: /about/i })).toBeInTheDocument();
  });

  it("names the maker and where he's based (E-E-A-T signal)", () => {
    render(<AboutPage />);
    expect(screen.getByText(/I'm John/i)).toBeInTheDocument();
    expect(screen.getByText(/Preston/i)).toBeInTheDocument();
  });

  it("offers a contact mailto and links to legal", () => {
    render(<AboutPage />);
    expect(screen.getByRole("link", { name: /hello@nomekop\.app/i })).toHaveAttribute(
      "href",
      "mailto:hello@nomekop.app",
    );
    expect(screen.getAllByRole("link", { name: /legal & credits/i })[0]).toHaveAttribute(
      "href",
      "/legal",
    );
  });

  it("is indexable and /about-canonical", () => {
    expect(metadata.alternates?.canonical).toBe("/about");
    expect(metadata.robots).toMatchObject({ index: true, follow: true });
  });

  it("axe clean", async () => {
    const { container } = render(<AboutPage />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
