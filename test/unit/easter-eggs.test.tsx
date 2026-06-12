// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, within, waitFor, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "vitest-axe";
import { EasterEggs, triggerArcade } from "@/components/easter-eggs/easter-eggs";
import { __resetArcadeStoreForTests } from "@/lib/arcade-store";

// Reduced-motion mock — flip per test. SafariDash uses the reduced path to stay
// deterministic (player drives the marker; no rAF sweep).
const reducedMotion = vi.hoisted(() => ({ value: false }));
vi.mock("@/lib/use-reduced-motion", () => ({
  useReducedMotion: () => reducedMotion.value,
}));

// A fixed seed makes every game layout reproducible.
const SEED = 12345;

beforeEach(() => {
  localStorage.clear();
  __resetArcadeStoreForTests();
  reducedMotion.value = false;
});

afterEach(() => {
  cleanup();
});

/** Fire the Konami code as discrete key events on document. */
async function fireKonami(user: ReturnType<typeof userEvent.setup>) {
  await user.keyboard(
    "{ArrowUp}{ArrowUp}{ArrowDown}{ArrowDown}{ArrowLeft}{ArrowRight}{ArrowLeft}{ArrowRight}ba",
  );
}

describe("EasterEggs — discovery", () => {
  it("is hidden initially (no dialog, no reopen button)", () => {
    render(<EasterEggs seed={SEED} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /open secret arcade/i })).not.toBeInTheDocument();
  });

  it("opens the arcade via the Konami code", async () => {
    const user = userEvent.setup();
    render(<EasterEggs seed={SEED} />);
    await fireKonami(user);
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText(/secret arcade/i)).toBeInTheDocument();
  });

  it("opens the arcade by typing MISSINGNO", async () => {
    const user = userEvent.setup();
    render(<EasterEggs seed={SEED} />);
    await user.keyboard("missingno");
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
  });

  it("a non-letter resets the MISSINGNO buffer (no false trigger)", async () => {
    const user = userEvent.setup();
    render(<EasterEggs seed={SEED} />);
    await user.keyboard("missing-no");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("opens via the exported triggerArcade()", async () => {
    render(<EasterEggs seed={SEED} />);
    triggerArcade();
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
  });

  it("announces the unlock to assistive tech", async () => {
    const user = userEvent.setup();
    render(<EasterEggs seed={SEED} />);
    await user.keyboard("missingno");
    // The visible toast plus the sr-only live region both carry the phrase.
    const announced = await screen.findAllByText(/secret arcade unlocked/i);
    expect(announced.length).toBeGreaterThanOrEqual(1);
  });

  it("Escape closes the arcade", async () => {
    const user = userEvent.setup();
    render(<EasterEggs seed={SEED} />);
    await user.keyboard("missingno");
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("shows a persistent reopen button after first discovery", async () => {
    const user = userEvent.setup();
    render(<EasterEggs seed={SEED} />);
    await user.keyboard("missingno");
    await screen.findByRole("dialog");
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    const reopen = screen.getByRole("button", { name: /open secret arcade/i });
    expect(reopen).toBeInTheDocument();
    await user.click(reopen);
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
  });
});

describe("EasterEggs — arcade menu", () => {
  it("lists all three games with best scores", async () => {
    const user = userEvent.setup();
    render(<EasterEggs seed={SEED} />);
    await fireKonami(user);
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByRole("button", { name: /orb flip/i })).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: /safari dash/i })).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: /echo match/i })).toBeInTheDocument();
  });

  it("selecting a game renders it; BACK returns to the menu", async () => {
    const user = userEvent.setup();
    render(<EasterEggs seed={SEED} />);
    await fireKonami(user);
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: /orb flip/i }));
    // Game heading present, menu list gone.
    expect(within(dialog).getByRole("heading", { name: /orb flip/i })).toBeInTheDocument();
    expect(within(dialog).queryByRole("button", { name: /safari dash/i })).not.toBeInTheDocument();
    await user.click(within(dialog).getByRole("button", { name: /back/i }));
    expect(within(dialog).getByRole("button", { name: /safari dash/i })).toBeInTheDocument();
  });

  it("axe clean on the open arcade menu", async () => {
    const user = userEvent.setup();
    render(<EasterEggs seed={SEED} />);
    await fireKonami(user);
    const dialog = await screen.findByRole("dialog");
    expect(await axe(dialog)).toHaveNoViolations();
  });
});

/** Open the arcade and drill into a named game; returns the dialog element. */
async function openGame(user: ReturnType<typeof userEvent.setup>, name: RegExp) {
  await fireKonami(user);
  const dialog = await screen.findByRole("dialog");
  await user.click(within(dialog).getByRole("button", { name }));
  return dialog;
}

describe("Orb Flip", () => {
  it("flipping a safe orb updates the running charge", async () => {
    const user = userEvent.setup();
    render(<EasterEggs seed={SEED} />);
    const dialog = await openGame(user, /orb flip/i);
    // Find a non-bomb cell via its data-kind and flip it.
    const safe = within(dialog)
      .getAllByRole("button")
      .find((b) => b.getAttribute("data-kind")?.startsWith("mult-"));
    expect(safe).toBeTruthy();
    await user.click(safe!);
    expect(safe!).toHaveAttribute("aria-pressed", "true");
    // Status region reflects progress.
    expect(within(dialog).getByTestId("orb-status").textContent).toMatch(/orbs flipped/i);
  });

  it("flipping a core busts the round", async () => {
    const user = userEvent.setup();
    render(<EasterEggs seed={SEED} />);
    const dialog = await openGame(user, /orb flip/i);
    const bomb = within(dialog)
      .getAllByRole("button")
      .find((b) => b.getAttribute("data-kind") === "bomb");
    expect(bomb).toBeTruthy();
    await user.click(bomb!);
    expect(within(dialog).getByTestId("orb-status").textContent).toMatch(/busted/i);
    expect(within(dialog).getByRole("button", { name: /retry/i })).toBeInTheDocument();
  });

  it("axe clean", async () => {
    const user = userEvent.setup();
    render(<EasterEggs seed={SEED} />);
    const dialog = await openGame(user, /orb flip/i);
    expect(await axe(dialog)).toHaveNoViolations();
  });
});

describe("Safari Dash", () => {
  it("Start then a catch in the lit zone raises the combo", async () => {
    reducedMotion.value = true; // deterministic: player drives the marker
    const user = userEvent.setup();
    render(<EasterEggs seed={SEED} />);
    const dialog = await openGame(user, /safari dash/i);
    const action = within(dialog).getByTestId("dash-action");
    action.focus();
    await user.keyboard(" "); // start
    // Align the marker into the lit zone using the data attributes, then catch.
    const track = within(dialog).getByTestId("dash-track");
    const target = Number(track.getAttribute("data-zone-start"));
    let marker = Number(track.getAttribute("data-marker"));
    while (marker < target) {
      await user.keyboard("{ArrowRight}");
      marker = Number(within(dialog).getByTestId("dash-track").getAttribute("data-marker"));
    }
    await user.keyboard(" "); // catch
    expect(Number(within(dialog).getByTestId("dash-combo").textContent)).toBeGreaterThanOrEqual(1);
  });

  it("a miss ends the round", async () => {
    reducedMotion.value = true;
    const user = userEvent.setup();
    render(<EasterEggs seed={SEED} />);
    const dialog = await openGame(user, /safari dash/i);
    const action = within(dialog).getByTestId("dash-action");
    action.focus();
    await user.keyboard(" "); // start
    // Move the marker well outside the zone, then catch → miss.
    const track = within(dialog).getByTestId("dash-track");
    const zoneStart = Number(track.getAttribute("data-zone-start"));
    if (zoneStart > 0) {
      // marker starts at 0, already outside; catch immediately.
    } else {
      // zone touches 0: walk right past the zone end.
      const zoneEnd = Number(track.getAttribute("data-zone-end"));
      let marker = 0;
      while (marker <= zoneEnd) {
        await user.keyboard("{ArrowRight}");
        marker = Number(within(dialog).getByTestId("dash-track").getAttribute("data-marker"));
      }
    }
    await user.keyboard(" "); // catch attempt → miss
    expect(within(dialog).getByTestId("dash-status").textContent).toMatch(/missed/i);
  });
});

describe("Echo Match", () => {
  it("flipping two matching tiles locks them as a pair", async () => {
    const user = userEvent.setup();
    render(<EasterEggs seed={SEED} />);
    const dialog = await openGame(user, /echo match/i);
    // Group face-down tiles by their hidden critter id, pick a known pair.
    const tiles = Array.from(
      dialog.querySelectorAll<HTMLButtonElement>("[data-critter]"),
    );
    const byCritter = new Map<string, HTMLButtonElement[]>();
    for (const t of tiles) {
      const k = t.getAttribute("data-critter")!;
      const arr = byCritter.get(k) ?? [];
      arr.push(t);
      byCritter.set(k, arr);
    }
    const pair = [...byCritter.values()].find((arr) => arr.length >= 2)!;
    await user.click(pair[0]!);
    await user.click(pair[1]!);
    expect(pair[0]!).toHaveAttribute("data-face", "up");
    expect(pair[1]!).toHaveAttribute("data-face", "up");
    expect(within(dialog).getByTestId("echo-status").textContent).toMatch(/pairs 1 of 6/i);
  });

  it("axe clean", async () => {
    const user = userEvent.setup();
    render(<EasterEggs seed={SEED} />);
    const dialog = await openGame(user, /echo match/i);
    expect(await axe(dialog)).toHaveNoViolations();
  });
});
