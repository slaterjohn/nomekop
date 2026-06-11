import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { axe } from "vitest-axe";

function Hello() {
  return (
    <main>
      <h1>hi</h1>
    </main>
  );
}

describe("test infrastructure", () => {
  it("renders with RTL and jest-dom matchers", () => {
    render(<Hello />);
    expect(screen.getByRole("heading", { name: "hi" })).toBeInTheDocument();
  });

  it("axe runs clean on a trivial component", async () => {
    const { container } = render(<Hello />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
