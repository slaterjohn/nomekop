import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, act } from "@testing-library/react";
import { ColorSchemeController } from "@/components/theme/color-scheme-controller";
import { __resetColorSchemeForTests, COLOR_SCHEME_STORAGE_KEY } from "@/lib/color-scheme";

type ChangeHandler = (e: MediaQueryListEvent) => void;

/**
 * Install a matchMedia mock that reports the OS as `dark` (or light) and lets a
 * test fire a live "change" so we can exercise the system-follow path. The
 * pre-paint script runs before React, so we also seed html[data-color-scheme]
 * with the OS-resolved value to mirror a real load: an explicit light/dark pref
 * must override that seed.
 */
function mockMatchMedia(osDark: boolean) {
  const handlers = new Set<ChangeHandler>();
  const mql = {
    matches: osDark,
    media: "(prefers-color-scheme: dark)",
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: (_: string, h: ChangeHandler) => handlers.add(h),
    removeEventListener: (_: string, h: ChangeHandler) => handlers.delete(h),
    dispatchEvent: () => false,
  } as unknown as MediaQueryList;
  window.matchMedia = vi.fn().mockReturnValue(mql);
  return {
    setOsDark(next: boolean) {
      (mql as { matches: boolean }).matches = next;
      handlers.forEach((h) => h({ matches: next } as MediaQueryListEvent));
    },
  };
}

describe("ColorSchemeController", () => {
  const originalMatchMedia = window.matchMedia;

  beforeEach(() => {
    localStorage.clear();
    delete document.documentElement.dataset.colorScheme;
    __resetColorSchemeForTests();
  });

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
  });

  it("applies an explicit light pref even when the OS is dark", () => {
    localStorage.setItem(COLOR_SCHEME_STORAGE_KEY, "light");
    mockMatchMedia(true);
    // Pre-paint would have seeded the attribute from the OS for a brief render.
    document.documentElement.dataset.colorScheme = "dark";

    render(<ColorSchemeController />);

    expect(document.documentElement.dataset.colorScheme).toBe("light");
  });

  it("applies an explicit dark pref even when the OS is light", () => {
    localStorage.setItem(COLOR_SCHEME_STORAGE_KEY, "dark");
    mockMatchMedia(false);
    document.documentElement.dataset.colorScheme = "light";

    render(<ColorSchemeController />);

    expect(document.documentElement.dataset.colorScheme).toBe("dark");
  });

  it("follows the OS when the pref is system", () => {
    localStorage.setItem(COLOR_SCHEME_STORAGE_KEY, "system");
    const mql = mockMatchMedia(true);

    render(<ColorSchemeController />);
    expect(document.documentElement.dataset.colorScheme).toBe("dark");

    act(() => mql.setOsDark(false));
    expect(document.documentElement.dataset.colorScheme).toBe("light");

    act(() => mql.setOsDark(true));
    expect(document.documentElement.dataset.colorScheme).toBe("dark");
  });
});
