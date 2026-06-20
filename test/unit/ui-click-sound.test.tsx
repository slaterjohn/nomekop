import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, cleanup, fireEvent } from "@testing-library/react";
import { UiClickSound } from "@/components/sound/ui-click-sound";

// Hoisted so the vi.mock factory can close over it; `enabled` is flipped per test.
const soundState = vi.hoisted(() => ({ enabled: true }));
const playMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/sound", () => ({
  play: playMock,
  useSoundEnabled: () => ({ enabled: soundState.enabled, setEnabled: vi.fn() }),
}));

beforeEach(() => {
  soundState.enabled = true;
  playMock.mockClear();
});

afterEach(() => {
  cleanup();
});

describe("UiClickSound", () => {
  it("plays 'move' once when a plain button is clicked", () => {
    render(
      <>
        <UiClickSound />
        <button type="button">Press</button>
      </>,
    );
    fireEvent.click(document.querySelector("button")!);
    expect(playMock).toHaveBeenCalledTimes(1);
    expect(playMock).toHaveBeenCalledWith("move");
  });

  it("plays 'move' when an anchor with href is clicked", () => {
    render(
      <>
        <UiClickSound />
        <a href="/sets">Sets</a>
      </>,
    );
    fireEvent.click(document.querySelector("a")!);
    expect(playMock).toHaveBeenCalledTimes(1);
    expect(playMock).toHaveBeenCalledWith("move");
  });

  it("does NOT play for clicks inside a [data-no-click-sound] subtree", () => {
    render(
      <>
        <UiClickSound />
        <div data-no-click-sound>
          <button type="button">Quiet</button>
        </div>
      </>,
    );
    fireEvent.click(document.querySelector("button")!);
    expect(playMock).not.toHaveBeenCalled();
  });

  it("does NOT play for a disabled button", () => {
    render(
      <>
        <UiClickSound />
        <button type="button" disabled>
          Nope
        </button>
      </>,
    );
    fireEvent.click(document.querySelector("button")!);
    expect(playMock).not.toHaveBeenCalled();
  });

  it("does NOT play for an aria-disabled element", () => {
    render(
      <>
        <UiClickSound />
        <button type="button" aria-disabled="true">
          Nope
        </button>
      </>,
    );
    fireEvent.click(document.querySelector("button")!);
    expect(playMock).not.toHaveBeenCalled();
  });

  it("does NOT play when sound is disabled", () => {
    soundState.enabled = false;
    render(
      <>
        <UiClickSound />
        <button type="button">Press</button>
      </>,
    );
    fireEvent.click(document.querySelector("button")!);
    expect(playMock).not.toHaveBeenCalled();
  });

  it("does NOT play for a non-interactive element with no clickable ancestor", () => {
    render(
      <>
        <UiClickSound />
        <span data-testid="plain">just text</span>
      </>,
    );
    fireEvent.click(document.querySelector('[data-testid="plain"]')!);
    expect(playMock).not.toHaveBeenCalled();
  });
});
