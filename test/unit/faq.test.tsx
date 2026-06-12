import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "vitest-axe";
import { FaqSection } from "@/components/faq-section";
import { APP_INTRO, FAQ_ENTRIES } from "@/lib/faq";

describe("FAQ data", () => {
  it("has at least 6 entries, each with a question and a substantive answer", () => {
    expect(FAQ_ENTRIES.length).toBeGreaterThanOrEqual(6);
    for (const entry of FAQ_ENTRIES) {
      expect(entry.question.trim().length).toBeGreaterThan(0);
      expect(entry.answer.trim().length).toBeGreaterThanOrEqual(80);
    }
  });

  it("exports a non-trivial intro paragraph", () => {
    expect(APP_INTRO.trim().length).toBeGreaterThanOrEqual(80);
  });
});

describe("FaqSection", () => {
  it("renders the section heading, intro and every question", () => {
    render(<FaqSection />);
    expect(screen.getByRole("heading", { name: "HOW NOMEKOP WORKS" })).toBeInTheDocument();
    expect(screen.getByText(APP_INTRO)).toBeInTheDocument();
    for (const entry of FAQ_ENTRIES) {
      expect(screen.getByText(entry.question)).toBeInTheDocument();
    }
  });

  it("opens only the first entry by default", () => {
    render(<FaqSection />);
    const first = screen.getByText(FAQ_ENTRIES[0]!.question).closest("details");
    const second = screen.getByText(FAQ_ENTRIES[1]!.question).closest("details");
    expect(first).toHaveAttribute("open");
    expect(second).not.toHaveAttribute("open");
    expect(screen.getByText(FAQ_ENTRIES[0]!.answer)).toBeVisible();
    expect(screen.getByText(FAQ_ENTRIES[1]!.answer)).not.toBeVisible();
  });

  it("clicking a summary toggles its answer open", async () => {
    const user = userEvent.setup();
    render(<FaqSection />);
    const entry = FAQ_ENTRIES[1]!;
    const summary = screen.getByText(entry.question);
    const details = summary.closest("details");

    expect(details).not.toHaveAttribute("open");
    await user.click(summary);
    expect(details).toHaveAttribute("open");
    expect(screen.getByText(entry.answer)).toBeVisible();

    await user.click(summary);
    expect(details).not.toHaveAttribute("open");
    expect(screen.getByText(entry.answer)).not.toBeVisible();
  });

  it("links to the sets index", () => {
    render(<FaqSection />);
    expect(screen.getByRole("link", { name: /browse all sets/i })).toHaveAttribute(
      "href",
      "/sets",
    );
  });

  it("axe clean", async () => {
    const { container } = render(<FaqSection />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
