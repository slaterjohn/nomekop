import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { CookieToggle } from "@/components/analytics/cookie-toggle";
import { LanguageProvider } from "@/components/i18n/language-provider";
import { en } from "@/lib/i18n/dictionaries/en";

const { ph } = vi.hoisted(() => ({
  ph: {
    get_explicit_consent_status: vi.fn(() => "pending" as string),
    opt_in_capturing: vi.fn(),
    opt_out_capturing: vi.fn(),
    capture: vi.fn(),
  },
}));
vi.mock("posthog-js", () => ({ default: ph }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

function renderToggle() {
  return render(
    <LanguageProvider locale="en" dict={en}>
      <CookieToggle />
    </LanguageProvider>,
  );
}

const sw = () => screen.getByRole("switch", { name: en.settings.cookies });

beforeEach(() => {
  vi.unstubAllEnvs();
  ph.get_explicit_consent_status.mockReturnValue("pending");
  ph.opt_in_capturing.mockClear();
  ph.opt_out_capturing.mockClear();
});

afterEach(() => cleanup());

describe("CookieToggle (settings)", () => {
  it("is OFF while consent is pending", () => {
    renderToggle();
    expect(sw().getAttribute("aria-checked")).toBe("false");
  });

  it("is ON when consent was granted in the banner (pre-set from the same state)", () => {
    ph.get_explicit_consent_status.mockReturnValue("granted");
    renderToggle();
    expect(sw().getAttribute("aria-checked")).toBe("true");
  });

  it("turning it on grants consent", () => {
    renderToggle();
    fireEvent.click(sw());
    expect(ph.opt_in_capturing).toHaveBeenCalledTimes(1);
    expect(ph.opt_out_capturing).not.toHaveBeenCalled();
  });

  it("turning it off denies consent", () => {
    ph.get_explicit_consent_status.mockReturnValue("granted");
    renderToggle();
    fireEvent.click(sw());
    expect(ph.opt_out_capturing).toHaveBeenCalledTimes(1);
    expect(ph.opt_in_capturing).not.toHaveBeenCalled();
  });

  it("renders nothing when analytics is disabled", () => {
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "");
    const { container } = renderToggle();
    expect(container.querySelector("[role='switch']")).toBeNull();
  });
});
