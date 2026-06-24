import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { axe } from "vitest-axe";
import AccessibilityPage, { metadata } from "@/app/accessibility/page";

describe("AccessibilityPage", () => {
  it("renders a single Accessibility h1", () => {
    render(<AccessibilityPage />);
    expect(
      screen.getByRole("heading", { level: 1, name: /accessibility/i }),
    ).toBeInTheDocument();
  });

  it("names the standard it aims for (WCAG 2.2 AA)", () => {
    render(<AccessibilityPage />);
    expect(screen.getByText(/WCAG 2\.2/i)).toBeInTheDocument();
  });

  it("offers both the report form and a mailto as ways to flag problems", () => {
    render(<AccessibilityPage />);
    expect(screen.getByRole("link", { name: /report a problem/i })).toHaveAttribute(
      "href",
      "/report",
    );
    expect(screen.getByRole("link", { name: /hello@nomekop\.app/i })).toHaveAttribute(
      "href",
      "mailto:hello@nomekop.app",
    );
  });

  it("is indexable and /accessibility-canonical", () => {
    expect(metadata.alternates?.canonical).toBe("/accessibility");
    expect(metadata.robots).toMatchObject({ index: true, follow: true });
  });

  it("axe clean", async () => {
    const { container } = render(<AccessibilityPage />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
