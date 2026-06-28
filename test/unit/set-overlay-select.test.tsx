import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/lib/analytics/events", () => ({ capture: vi.fn() }));

import { SetOverlaySelect } from "@/components/sets/set-overlay-select";
import { capture } from "@/lib/analytics/events";

beforeEach(() => vi.mocked(capture).mockClear());

describe("SetOverlaySelect — analytics", () => {
  it("captures set_overlay_language_changed when the overlay language changes", async () => {
    const user = userEvent.setup();
    render(<SetOverlaySelect value="en" label="Show in language" />);
    await user.selectOptions(screen.getByRole("combobox", { name: "Show in language" }), "ja");
    expect(vi.mocked(capture)).toHaveBeenCalledWith("set_overlay_language_changed", { lang: "ja" });
  });
});
