import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { axe } from "vitest-axe";
import { GbScreen } from "@/components/gb/gb-screen";

describe("GbScreen", () => {
  it("renders title as a heading and children inside", () => {
    render(
      <GbScreen title="CHOOSE SET">
        <p>content</p>
      </GbScreen>,
    );
    expect(screen.getByRole("heading", { name: "CHOOSE SET" })).toBeInTheDocument();
    expect(screen.getByText("content")).toBeInTheDocument();
  });

  it("renders without a title", () => {
    render(
      <GbScreen>
        <p>bare</p>
      </GbScreen>,
    );
    expect(screen.queryByRole("heading")).not.toBeInTheDocument();
    expect(screen.getByText("bare")).toBeInTheDocument();
  });

  it("texture overlay is aria-hidden", () => {
    const { container } = render(
      <GbScreen>
        <p>x</p>
      </GbScreen>,
    );
    const overlays = container.querySelectorAll('[aria-hidden="true"]');
    expect(overlays.length).toBeGreaterThanOrEqual(1);
  });

  it("axe clean", async () => {
    const { container } = render(
      <GbScreen title="TEST">
        <button>ok</button>
      </GbScreen>,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
