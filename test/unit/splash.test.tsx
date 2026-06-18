import { describe, it, expect, afterEach, vi } from "vitest";
import { render, fireEvent, act, cleanup } from "@testing-library/react";
import { SplashScreen } from "@/components/splash/splash-screen";
import { en } from "@/lib/i18n/dictionaries/en";
import { __resetMotionForTests } from "@/lib/motion";
import { __resetSoundForTests } from "@/lib/sound";
import { __resetMusicForTests } from "@/lib/music/store";

// The splash reads the path to stay off /print/* routes; control it per-test.
const { nav } = vi.hoisted(() => ({ nav: { path: "/" } }));
vi.mock("next/navigation", () => ({ usePathname: () => nav.path }));

afterEach(() => {
  cleanup();
  __resetMotionForTests();
  __resetSoundForTests();
  __resetMusicForTests();
  nav.path = "/";
  vi.useRealTimers();
  try {
    localStorage.clear();
  } catch {
    // ignore
  }
});

function overlay(): HTMLElement | null {
  return document.querySelector("[data-splash]");
}

describe("SplashScreen", () => {
  it("shows the NOMEKOP wordmark overlay on a fresh load", () => {
    render(<SplashScreen />);
    const el = overlay();
    expect(el).not.toBeNull();
    expect(el).toHaveAttribute("data-splash", "in");
    // Letters are individual spans; the concatenated text still spells it out.
    expect(el!.textContent).toContain("NOMEKOP");
    expect(el!.textContent).toContain(en.home.tagline);
    expect(el!.textContent).toContain(en.audio.splashSkip);
  });

  it("auto-hides after the hold", () => {
    vi.useFakeTimers();
    render(<SplashScreen />);
    expect(overlay()).toHaveAttribute("data-splash", "in");
    act(() => {
      vi.advanceTimersByTime(2700);
    });
    expect(overlay()).toHaveAttribute("data-splash", "out");
  });

  it("dismisses on click", () => {
    render(<SplashScreen />);
    fireEvent.click(overlay()!);
    expect(overlay()).toHaveAttribute("data-splash", "out");
  });

  it("keeps a JS-independent CSS auto-dismiss so a blocked/un-hydrated bundle can't trap users", () => {
    // The overlay is SSR'd and its JS dismiss paths (timer/click/key) only attach
    // on hydration. If the client bundle never loads — a firewall-blocked chunk,
    // offline, a hydration crash — this pure-CSS animation is the only thing that
    // clears the overlay so the page underneath becomes usable. It must be present
    // while the splash is shown.
    render(<SplashScreen />);
    expect(overlay()!.className).toContain("animate-gb-splash-out");
  });

  it("drops the CSS auto-dismiss and becomes non-interactive once dismissed", () => {
    render(<SplashScreen />);
    fireEvent.click(overlay()!);
    const el = overlay()!;
    // The CSS fallback is removed so it can't fight the JS opacity transition…
    expect(el.className).not.toContain("animate-gb-splash-out");
    // …and the overlay stops capturing clicks and fades out.
    expect(el.className).toContain("pointer-events-none");
    expect(el.className).toContain("opacity-0");
  });

  it("renders nothing when disabled (e2e/tests)", () => {
    const { container } = render(<SplashScreen disabled />);
    expect(container.firstChild).toBeNull();
    expect(overlay()).toBeNull();
  });

  it("never renders on print routes (Puppeteer PDF capture)", () => {
    nav.path = "/print/pokemon";
    const { container } = render(<SplashScreen />);
    expect(container.firstChild).toBeNull();
    expect(overlay()).toBeNull();
  });
});
