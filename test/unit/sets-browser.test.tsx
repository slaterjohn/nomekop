import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("@/lib/analytics/events", () => ({ capture: vi.fn() }));

import { SetsBrowser, type SetsGroup, type SetsBrowserLabels } from "@/components/sets/sets-browser";
import { capture } from "@/lib/analytics/events";

const LABELS: SetsBrowserLabels = {
  masterCards: "{count} cards",
  expandSection: "Expand {series}",
  collapseSection: "Collapse {series}",
  setCount: "{count} sets",
  viewInfo: "View",
  createLayout: "Build",
  modalClose: "Close",
  seriesLabel: "Series",
  releasedLabel: "Released",
  countsLabel: "Counts",
  printedTotalLine: "{printed} printed / {total} total",
  masterSetLabel: "Master set",
  accuracyDisclaimer: "",
  accuracyReportCta: "",
};

const GROUPS: SetsGroup[] = [
  {
    series: "Base",
    verified: true,
    sets: [
      {
        id: "base1",
        name: "Base Set",
        series: "Base",
        releaseDate: "1999/01/09",
        printedTotal: 102,
        total: 102,
        masterCount: 102,
        symbolUrl: "",
        logoUrl: "",
      },
    ],
  },
];

beforeEach(() => vi.mocked(capture).mockClear());

describe("SetsBrowser — analytics", () => {
  it("captures set_opened when a set tile opens the modal", async () => {
    const user = userEvent.setup();
    render(<SetsBrowser groups={GROUPS} labels={LABELS} />);
    await user.click(screen.getByText("BASE SET"));
    expect(vi.mocked(capture)).toHaveBeenCalledWith(
      "set_opened",
      expect.objectContaining({ set: "base1", series: "Base", source: "sets_browser" }),
    );
  });

  it("captures series_toggled when a series header is collapsed", async () => {
    const user = userEvent.setup();
    render(<SetsBrowser groups={GROUPS} labels={LABELS} />);
    // First group is open by default → its header label is the collapse one.
    await user.click(screen.getByRole("button", { name: "Collapse Base" }));
    expect(vi.mocked(capture)).toHaveBeenCalledWith(
      "series_toggled",
      expect.objectContaining({ series: "Base", expanded: false }),
    );
  });
});
