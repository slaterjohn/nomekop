import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useTheme, __resetThemeStoreForTests } from "@/components/theme/theme-provider";
import { THEME_STORAGE_KEY } from "@/lib/themes";

function Probe() {
  const { theme, setTheme } = useTheme();
  return (
    <div>
      <span data-testid="current">{theme}</span>
      <button onClick={() => setTheme("pocket")}>go pocket</button>
    </div>
  );
}

describe("useTheme", () => {
  beforeEach(() => {
    localStorage.clear();
    delete document.documentElement.dataset.theme;
    __resetThemeStoreForTests();
  });

  it("defaults to dmg", () => {
    render(<Probe />);
    expect(screen.getByTestId("current")).toHaveTextContent("dmg");
  });

  it("setTheme updates html[data-theme] and persists", async () => {
    const user = userEvent.setup();
    render(<Probe />);
    await user.click(screen.getByRole("button", { name: "go pocket" }));
    expect(screen.getByTestId("current")).toHaveTextContent("pocket");
    expect(document.documentElement.dataset.theme).toBe("pocket");
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("pocket");
  });

  it("hydrates from a stored theme", () => {
    localStorage.setItem(THEME_STORAGE_KEY, "cerulean");
    render(<Probe />);
    expect(screen.getByTestId("current")).toHaveTextContent("cerulean");
  });

  it("ignores garbage in storage", () => {
    localStorage.setItem(THEME_STORAGE_KEY, "neon-zubat");
    render(<Probe />);
    expect(screen.getByTestId("current")).toHaveTextContent("dmg");
  });
});
