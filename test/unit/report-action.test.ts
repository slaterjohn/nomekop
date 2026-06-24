import { describe, it, expect, vi, beforeEach } from "vitest";
import type { SendResult } from "@/lib/email/ses";

// vi.hoisted so the spy exists before the (hoisted) vi.mock factory runs.
const { sendReportEmail } = vi.hoisted(() => ({
  sendReportEmail: vi.fn<() => Promise<SendResult>>(),
}));
vi.mock("@/lib/email/ses", () => ({ sendReportEmail }));

import { submitReport, type ReportState } from "@/app/report/actions";

const IDLE: ReportState = { status: "idle" };

function form(over: Record<string, string> = {}): FormData {
  const fd = new FormData();
  const base = {
    name: "Ash",
    email: "ash@pallet.town",
    era: "Scarlet & Violet",
    set: "Prismatic Evolutions",
    issue: "count",
    message: "Two cards short.",
  };
  for (const [k, v] of Object.entries({ ...base, ...over })) fd.set(k, v);
  return fd;
}

beforeEach(() => sendReportEmail.mockReset());

describe("submitReport", () => {
  it("returns validation errors without sending when the form is invalid", async () => {
    const state = await submitReport(IDLE, form({ email: "nope" }));
    expect(state.status).toBe("invalid");
    if (state.status === "invalid") expect(state.errors.email?.[0]).toMatch(/valid email/i);
    expect(sendReportEmail).not.toHaveBeenCalled();
  });

  it("returns 'sent' when the email goes out", async () => {
    sendReportEmail.mockResolvedValueOnce({ sent: true });
    const state = await submitReport(IDLE, form());
    expect(state.status).toBe("sent");
    expect(sendReportEmail).toHaveBeenCalledOnce();
  });

  it("returns 'unconfigured' when SES isn't set up", async () => {
    sendReportEmail.mockResolvedValueOnce({ sent: false, reason: "not-configured" });
    const state = await submitReport(IDLE, form());
    expect(state.status).toBe("unconfigured");
  });

  it("returns 'error' when the send fails", async () => {
    sendReportEmail.mockResolvedValueOnce({ sent: false, reason: "send-failed" });
    const state = await submitReport(IDLE, form());
    expect(state.status).toBe("error");
  });

  it("passes the trimmed, validated report to the mailer", async () => {
    sendReportEmail.mockResolvedValueOnce({ sent: true });
    await submitReport(IDLE, form({ name: "  Misty  " }));
    expect(sendReportEmail).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Misty", issue: "count" }),
    );
  });
});
