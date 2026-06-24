import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Shared spy for the SES client's send(), swapped per test.
const sendSpy = vi.fn();
vi.mock("@aws-sdk/client-sesv2", () => ({
  // Classes so the SUT's `new SESv2Client()` / `new SendEmailCommand()` work.
  SESv2Client: class {
    send = sendSpy;
  },
  SendEmailCommand: class {
    input: unknown;
    constructor(input: unknown) {
      this.input = input;
    }
  },
}));

import { isEmailConfigured, sendReportEmail } from "@/lib/email/ses";
import type { ReportInput } from "@/lib/report/schema";

const report: ReportInput = {
  name: "Ash",
  email: "ash@pallet.town",
  era: "Scarlet & Violet",
  set: "Prismatic Evolutions",
  issue: "count",
  message: "Two cards short.",
};

const AWS_KEYS = ["AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY", "AWS_REGION", "SES_FROM"] as const;
const saved: Record<string, string | undefined> = {};

function configure() {
  process.env.AWS_ACCESS_KEY_ID = "AKIA_TEST";
  process.env.AWS_SECRET_ACCESS_KEY = "secret";
  process.env.AWS_REGION = "eu-west-1";
  process.env.SES_FROM = "no-reply@nomekop.app";
}

beforeEach(() => {
  for (const k of AWS_KEYS) {
    saved[k] = process.env[k];
    delete process.env[k];
  }
  sendSpy.mockReset();
});

afterEach(() => {
  for (const k of AWS_KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
});

describe("isEmailConfigured", () => {
  it("is false when any AWS var is missing", () => {
    configure();
    delete process.env.SES_FROM;
    expect(isEmailConfigured()).toBe(false);
  });

  it("is true only when every AWS var is present", () => {
    configure();
    expect(isEmailConfigured()).toBe(true);
  });
});

describe("sendReportEmail", () => {
  it("degrades gracefully (no throw) when SES isn't configured", async () => {
    const result = await sendReportEmail(report);
    expect(result).toEqual({ sent: false, reason: "not-configured" });
    expect(sendSpy).not.toHaveBeenCalled();
  });

  it("sends via SES when configured", async () => {
    configure();
    sendSpy.mockResolvedValueOnce({});
    const result = await sendReportEmail(report);
    expect(result).toEqual({ sent: true });
    expect(sendSpy).toHaveBeenCalledOnce();
  });

  it("reports send-failed (no throw) when SES rejects", async () => {
    configure();
    sendSpy.mockRejectedValueOnce(new Error("throttled"));
    const result = await sendReportEmail(report);
    expect(result).toEqual({ sent: false, reason: "send-failed" });
  });
});
