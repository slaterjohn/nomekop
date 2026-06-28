import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("@/app/report/actions", () => ({ submitReport: vi.fn(async () => ({ status: "sent" })) }));
vi.mock("@/lib/analytics/events", () => ({ capture: vi.fn() }));

import { ReportForm } from "@/components/report/report-form";
import { capture } from "@/lib/analytics/events";

beforeEach(() => vi.mocked(capture).mockClear());

describe("ReportForm — analytics", () => {
  it("captures report_submitted on success with no PII", async () => {
    const user = userEvent.setup();
    render(
      <ReportForm
        eras={["Base"]}
        sets={[{ id: "base1", name: "Base Set", series: "Base" }]}
        initialEra="Base"
        initialSet="base1"
        contactEmail="hi@example.com"
      />,
    );
    // Fill the required fields so native form validation lets it submit.
    await user.type(screen.getByLabelText("Your name"), "Jo");
    await user.type(screen.getByLabelText("Your email"), "jo@example.com");
    const issue = screen.getByLabelText("Issue");
    const issueOptions = within(issue).getAllByRole("option");
    await user.selectOptions(issue, issueOptions[issueOptions.length - 1]!);
    await user.type(screen.getByLabelText("What's wrong?"), "A card is wrong");
    await user.click(screen.getByRole("button", { name: "Send report" }));
    await vi.waitFor(() =>
      expect(vi.mocked(capture)).toHaveBeenCalledWith(
        "report_submitted",
        expect.objectContaining({ era: "Base", set: "base1" }),
      ),
    );
    const call = vi.mocked(capture).mock.calls.find((c) => c[0] === "report_submitted")!;
    const props = call[1] ?? {};
    expect(props).not.toHaveProperty("email");
    expect(props).not.toHaveProperty("name");
    expect(props).not.toHaveProperty("message");
  });
});
