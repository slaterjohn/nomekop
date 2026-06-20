import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "vitest-axe";
import { GbDialogBox } from "@/components/gb/gb-dialog-box";
import { GbSpinner } from "@/components/gb/gb-spinner";
import { GbProgress } from "@/components/gb/gb-progress";

// Mock reduced-motion per test.
const reducedMotion = vi.hoisted(() => ({ value: false }));
vi.mock("@/lib/use-reduced-motion", () => ({
  useReducedMotion: () => reducedMotion.value,
}));

describe("GbDialogBox typewriter", () => {
  beforeEach(() => {
    reducedMotion.value = false;
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("reveals text incrementally", () => {
    render(<GbDialogBox>HELLO TRAINER</GbDialogBox>);
    const animated = document.querySelector('[data-gb-typewriter]')!;
    expect(animated.textContent).toBe("");
    act(() => {
      vi.advanceTimersByTime(18 * 5 + 5);
    });
    expect(animated.textContent!.length).toBeGreaterThanOrEqual(4);
    expect(animated.textContent!.length).toBeLessThan("HELLO TRAINER".length);
    act(() => {
      vi.advanceTimersByTime(18 * 20);
    });
    expect(animated.textContent).toBe("HELLO TRAINER");
  });

  it("full text is always available to AT in a live region", () => {
    render(<GbDialogBox>HELLO TRAINER</GbDialogBox>);
    const live = document.querySelector('[aria-live="polite"]');
    expect(live).not.toBeNull();
    expect(live!.textContent).toBe("HELLO TRAINER");
    const animated = document.querySelector('[data-gb-typewriter]')!;
    expect(animated).toHaveAttribute("aria-hidden", "true");
  });

  it("click skips to full text", () => {
    render(<GbDialogBox>HELLO TRAINER</GbDialogBox>);
    act(() => {
      document.querySelector<HTMLElement>("[data-gb-dialog]")!.click();
    });
    expect(document.querySelector("[data-gb-typewriter]")!.textContent).toBe("HELLO TRAINER");
  });

  it("reduced motion renders instantly", () => {
    reducedMotion.value = true;
    render(<GbDialogBox>HELLO TRAINER</GbDialogBox>);
    expect(document.querySelector("[data-gb-typewriter]")!.textContent).toBe("HELLO TRAINER");
  });

  it("role=alert when tone is error", () => {
    reducedMotion.value = true;
    render(<GbDialogBox tone="error">OH NO</GbDialogBox>);
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("continue indicator ▼ appears when onContinue given and text done", async () => {
    reducedMotion.value = true;
    vi.useRealTimers();
    const user = userEvent.setup();
    const onContinue = vi.fn();
    render(<GbDialogBox onContinue={onContinue}>DONE TEXT</GbDialogBox>);
    const more = document.querySelector('[data-gb-more]');
    expect(more).not.toBeNull();
    expect(more!).toHaveAttribute("aria-hidden", "true");
    await user.click(screen.getByRole("button", { name: "Continue" }));
    expect(onContinue).toHaveBeenCalled();
  });

  it("axe clean", async () => {
    reducedMotion.value = true;
    vi.useRealTimers();
    const { container } = render(<GbDialogBox>SAFE</GbDialogBox>);
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe("GbSpinner", () => {
  it("announces as status with visible label", () => {
    render(<GbSpinner label="GENERATING…" />);
    const status = screen.getByRole("status");
    expect(status).toHaveTextContent("GENERATING…");
  });

  it("defaults to Loading…", () => {
    render(<GbSpinner />);
    expect(screen.getByRole("status")).toHaveTextContent("Loading…");
  });

  it("axe clean", async () => {
    const { container } = render(<GbSpinner />);
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe("GbProgress", () => {
  it("exposes progressbar semantics", () => {
    render(<GbProgress label="COLLECTED" value={3} max={9} />);
    const bar = screen.getByRole("progressbar", { name: "COLLECTED" });
    expect(bar).toHaveAttribute("aria-valuenow", "3");
    expect(bar).toHaveAttribute("aria-valuemin", "0");
    expect(bar).toHaveAttribute("aria-valuemax", "9");
  });

  it("always shows the fraction as text (not colour-only)", () => {
    render(<GbProgress label="COLLECTED" value={3} max={9} />);
    expect(screen.getByText("3/9")).toBeInTheDocument();
  });

  it("handles max=0 without NaN widths", () => {
    render(<GbProgress label="EMPTY" value={0} max={0} />);
    expect(screen.getByRole("progressbar", { name: "EMPTY" })).toBeInTheDocument();
    expect(screen.getByText("0/0")).toBeInTheDocument();
  });

  it("axe clean", async () => {
    const { container } = render(<GbProgress label="HP" value={1} max={2} />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
