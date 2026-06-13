import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { axe } from "vitest-axe";
import LegalPage, { metadata } from "@/app/legal/page";

describe("LegalPage", () => {
  it("renders a single h1", async () => {
    render(await LegalPage());
    expect(screen.getByRole("heading", { level: 1, name: /legal & credits/i })).toBeInTheDocument();
  });

  it("states clearly that it is not affiliated, naming Nintendo and The Pokémon Company", async () => {
    render(await LegalPage());
    // "not" sits in a <strong>, so match the paragraph by its tail text node.
    const disclaimer = screen
      .getByText(/affiliated with, endorsed by, or sponsored by/i)
      .closest("p");
    expect(disclaimer).not.toBeNull();
    expect(disclaimer).toHaveTextContent(/not\s+affiliated/i);
    expect(disclaimer).toHaveTextContent(/Nintendo/);
    expect(disclaimer).toHaveTextContent(/The Pokémon Company/);
  });

  it("credits the Pokémon TCG API with a link to pokemontcg.io", async () => {
    render(await LegalPage());
    const link = screen.getByRole("link", { name: /pokémon tcg api/i });
    expect(link).toHaveAttribute("href", "https://pokemontcg.io");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("credits the PokeAPI sprite collection with a link to its GitHub repo", async () => {
    render(await LegalPage());
    const link = screen.getByRole("link", { name: /pokeapi sprite collection/i });
    expect(link).toHaveAttribute("href", "https://github.com/PokeAPI/sprites");
  });

  it("reassures that collection data lives only in the browser's local storage", async () => {
    render(await LegalPage());
    expect(screen.getByText(/local storage/i)).toBeInTheDocument();
    expect(screen.getByText(/no accounts/i)).toBeInTheDocument();
  });

  it("offers a mailto contact link for takedowns", async () => {
    render(await LegalPage());
    expect(screen.getByRole("link", { name: /hello@nomekop\.app/i })).toHaveAttribute(
      "href",
      "mailto:hello@nomekop.app",
    );
  });

  it("declares an indexable, /legal-canonical metadata block", () => {
    expect(metadata.alternates?.canonical).toBe("/legal");
    expect(metadata.robots).toMatchObject({ index: true, follow: true });
    expect(String(metadata.title)).toMatch(/legal & credits/i);
  });

  it("axe clean", async () => {
    const { container } = render(<LegalPage />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
