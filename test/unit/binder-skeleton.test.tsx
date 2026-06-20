import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { axe } from "vitest-axe";
import { BinderSkeleton } from "@/components/binder-skeleton";

describe("BinderSkeleton", () => {
  it("announces a loading status and marks itself busy", () => {
    const { container } = render(<BinderSkeleton what="every Charizard print" rows={3} cols={4} />);
    expect(container.querySelector("[aria-busy='true']")).not.toBeNull();
    expect(screen.getByRole("status")).toHaveTextContent(/GATHERING EVERY CHARIZARD PRINT/i);
  });

  it("renders a placeholder pocket per cell of the grid", () => {
    const { container } = render(<BinderSkeleton rows={4} cols={4} />);
    const pockets = container.querySelectorAll(".aspect-\\[63\\/88\\]");
    expect(pockets).toHaveLength(16);
  });

  it("shows the binder options and preview frames so it reads as the real page", () => {
    render(<BinderSkeleton rows={3} cols={4} />);
    expect(screen.getByRole("heading", { name: "Binder options" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Preview" })).toBeInTheDocument();
  });

  it("axe clean", async () => {
    const { container } = render(<BinderSkeleton rows={3} cols={4} />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
