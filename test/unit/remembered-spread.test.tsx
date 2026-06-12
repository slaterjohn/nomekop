import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useRememberedSpread } from "@/lib/use-remembered-spread";

function Probe({ k }: { k?: string }) {
  const [spread, setSpread] = useRememberedSpread(k);
  return (
    <div>
      <span data-testid="v">{spread}</span>
      <button onClick={() => setSpread(spread + 1)}>next</button>
    </div>
  );
}

beforeEach(() => {
  sessionStorage.clear();
});

describe("useRememberedSpread", () => {
  it("starts at 0 and increments", async () => {
    const user = userEvent.setup();
    render(<Probe k="set:base1" />);
    expect(screen.getByTestId("v")).toHaveTextContent("0");
    await user.click(screen.getByRole("button"));
    await user.click(screen.getByRole("button"));
    expect(screen.getByTestId("v")).toHaveTextContent("2");
    expect(sessionStorage.getItem("bindermon:v1:spread:set:base1")).toBe("2");
  });

  it("restores the remembered spread on remount (the back-button case)", async () => {
    const user = userEvent.setup();
    const { unmount } = render(<Probe k="set:sv1" />);
    await user.click(screen.getByRole("button"));
    await user.click(screen.getByRole("button"));
    await user.click(screen.getByRole("button"));
    unmount();

    render(<Probe k="set:sv1" />);
    expect(screen.getByTestId("v")).toHaveTextContent("3");
  });

  it("keeps separate positions per key", async () => {
    const user = userEvent.setup();
    render(<Probe k="pokemon:pikachu" />);
    await user.click(screen.getByRole("button"));
    expect(sessionStorage.getItem("bindermon:v1:spread:pokemon:pikachu")).toBe("1");
    expect(sessionStorage.getItem("bindermon:v1:spread:set:base1")).toBeNull();
  });

  it("no key = no persistence (still works)", async () => {
    const user = userEvent.setup();
    render(<Probe />);
    await user.click(screen.getByRole("button"));
    expect(screen.getByTestId("v")).toHaveTextContent("1");
    expect(sessionStorage.length).toBe(0);
  });
});
