import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("@/lib/analytics/events", () => ({ capture: vi.fn() }));
vi.mock("@/lib/music/engine", () => ({ startMusic: vi.fn(), stopMusic: vi.fn() }));
vi.mock("next/navigation", () => ({ usePathname: () => "/" }));

import { Providers } from "@/components/providers";
import { ThemeSwitcher } from "@/components/theme/theme-switcher";
import { MusicToggle } from "@/components/music/music-toggle";
import { capture } from "@/lib/analytics/events";

beforeEach(() => vi.mocked(capture).mockClear());

describe("chrome — analytics", () => {
  it("ThemeSwitcher captures setting_changed (palette) on a swatch click", async () => {
    const user = userEvent.setup();
    render(<ThemeSwitcher />);
    const swatches = screen.getAllByRole("radio");
    await user.click(swatches[1]!);
    expect(vi.mocked(capture)).toHaveBeenCalledWith(
      "setting_changed",
      expect.objectContaining({ setting: "palette" }),
    );
  });

  it("MusicToggle captures music_toggled when started", async () => {
    const user = userEvent.setup();
    render(
      <Providers>
        <MusicToggle />
      </Providers>,
    );
    await user.click(screen.getByRole("button"));
    expect(vi.mocked(capture)).toHaveBeenCalledWith(
      "music_toggled",
      expect.objectContaining({ playing: true }),
    );
  });
});
