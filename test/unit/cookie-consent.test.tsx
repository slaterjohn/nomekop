import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { CookieConsent } from "@/components/analytics/cookie-consent";
import { LanguageProvider } from "@/components/i18n/language-provider";
import { en } from "@/lib/i18n/dictionaries/en";

const { ph, nav } = vi.hoisted(() => ({
  ph: {
    get_explicit_consent_status: vi.fn(() => "pending" as string),
    opt_in_capturing: vi.fn(),
    opt_out_capturing: vi.fn(),
    capture: vi.fn(),
  },
  nav: { path: "/" },
}));
vi.mock("posthog-js", () => ({ default: ph }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
  usePathname: () => nav.path,
}));

function renderBanner() {
  return render(
    <LanguageProvider locale="en" dict={en}>
      <CookieConsent />
    </LanguageProvider>,
  );
}

beforeEach(() => {
  nav.path = "/";
  ph.get_explicit_consent_status.mockReturnValue("pending");
  ph.opt_in_capturing.mockClear();
  ph.opt_out_capturing.mockClear();
  ph.capture.mockClear();
});

afterEach(() => cleanup());

describe("CookieConsent", () => {
  it("shows the banner while consent is pending, with the message and labelled region", () => {
    renderBanner();
    const region = screen.getByRole("region", { name: en.consent.label });
    expect(region).not.toBeNull();
    expect(region.textContent).toContain(en.consent.message);
  });

  it("orders the buttons Allow, Deny, Close (tab order follows the DOM)", () => {
    renderBanner();
    const names = screen
      .getAllByRole("button")
      .map((b) => b.getAttribute("aria-label") ?? b.textContent);
    expect(names).toEqual([en.consent.allow, en.consent.deny, en.consent.close]);
  });

  it("Allow opts in and records the current pageview", () => {
    renderBanner();
    fireEvent.click(screen.getByRole("button", { name: en.consent.allow }));
    expect(ph.opt_in_capturing).toHaveBeenCalledTimes(1);
    expect(ph.capture).toHaveBeenCalledWith("$pageview");
    expect(ph.opt_out_capturing).not.toHaveBeenCalled();
  });

  it("Deny opts out", () => {
    renderBanner();
    fireEvent.click(screen.getByRole("button", { name: en.consent.deny }));
    expect(ph.opt_out_capturing).toHaveBeenCalledTimes(1);
    expect(ph.opt_in_capturing).not.toHaveBeenCalled();
  });

  it("Close also opts out (close = deny)", () => {
    renderBanner();
    fireEvent.click(screen.getByRole("button", { name: en.consent.close }));
    expect(ph.opt_out_capturing).toHaveBeenCalledTimes(1);
  });

  it("renders nothing once a decision has been made", () => {
    ph.get_explicit_consent_status.mockReturnValue("granted");
    const { container } = renderBanner();
    expect(container.querySelector("[role='region']")).toBeNull();
  });

  it("does not render on /print routes (kept out of PDF exports)", () => {
    nav.path = "/print/pokemon";
    const { container } = renderBanner();
    expect(container.querySelector("[role='region']")).toBeNull();
  });
});
