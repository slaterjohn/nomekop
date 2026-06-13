import { describe, it, expect, afterEach } from "vitest";
import { render, screen, fireEvent, within, cleanup } from "@testing-library/react";
import { axe } from "vitest-axe";
import { SettingsPanel } from "@/components/settings/settings-panel";
import { __resetMotionForTests } from "@/lib/motion";
import { __resetSoundForTests } from "@/lib/sound";

afterEach(() => {
  cleanup();
  __resetMotionForTests();
  __resetSoundForTests();
  document.documentElement.removeAttribute("data-reduce-motion");
  try {
    localStorage.clear();
  } catch {
    // ignore
  }
});

describe("SettingsPanel", () => {
  it("opens from a labelled trigger and shows language, palette, sound and motion controls", async () => {
    render(<SettingsPanel />);
    fireEvent.click(screen.getByRole("button", { name: "Settings" }));

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("Settings")).toBeInTheDocument();
    // The new UI-language selector (defaults to English).
    expect(within(dialog).getByRole("group", { name: "Language" })).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: /English/ })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(within(dialog).getByRole("radiogroup", { name: "Colour palette" })).toBeInTheDocument();
    expect(within(dialog).getByRole("switch", { name: "Sound" })).toBeInTheDocument();
    expect(within(dialog).getByRole("switch", { name: "Reduce animation" })).toBeInTheDocument();
  });

  it("REDUCE ANIMATION toggles the document-level reduce-motion flag", async () => {
    render(<SettingsPanel />);
    fireEvent.click(screen.getByRole("button", { name: "Settings" }));
    const toggle = await screen.findByRole("switch", { name: "Reduce animation" });

    expect(document.documentElement.dataset.reduceMotion).toBeUndefined();
    fireEvent.click(toggle);
    expect(document.documentElement.dataset.reduceMotion).toBe("1");
    expect(toggle).toHaveAttribute("aria-checked", "true");
  });

  it("has no axe violations when open", async () => {
    render(<SettingsPanel />);
    fireEvent.click(screen.getByRole("button", { name: "Settings" }));
    // Scope to the dialog's own content — Base UI renders inert focus-guard
    // sentinels as siblings of the popup that are not part of our markup.
    const dialog = await screen.findByRole("dialog");
    expect(await axe(dialog)).toHaveNoViolations();
  });
});
