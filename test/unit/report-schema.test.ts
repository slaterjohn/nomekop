import { describe, it, expect } from "vitest";
import { parseReport, issueLabel, ISSUE_TYPES } from "@/lib/report/schema";

const valid = {
  name: "Ash Ketchum",
  email: "ash@pallet.town",
  era: "Scarlet & Violet",
  set: "Prismatic Evolutions",
  issue: "count",
  message: "Master count looks 2 cards short.",
};

describe("parseReport", () => {
  it("accepts a complete, valid report and trims whitespace", () => {
    const r = parseReport({ ...valid, name: "  Ash  ", message: "  hi  " });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.name).toBe("Ash");
      expect(r.data.message).toBe("hi");
      expect(r.data.set).toBe("Prismatic Evolutions");
    }
  });

  it("allows an empty (era-wide) set", () => {
    const r = parseReport({ ...valid, set: "" });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.set).toBe("");
  });

  it("rejects a missing name", () => {
    const r = parseReport({ ...valid, name: "" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.name?.[0]).toMatch(/name/i);
  });

  it("rejects a malformed email", () => {
    const r = parseReport({ ...valid, email: "not-an-email" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.email?.[0]).toMatch(/valid email/i);
  });

  it("rejects a missing era", () => {
    const r = parseReport({ ...valid, era: "" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.era?.[0]).toMatch(/era/i);
  });

  it("rejects an unknown issue type", () => {
    const r = parseReport({ ...valid, issue: "spaceship" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.issue?.[0]).toMatch(/issue/i);
  });

  it("rejects an empty message", () => {
    const r = parseReport({ ...valid, message: "   " });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.message?.[0]).toMatch(/describe/i);
  });

  it("rejects an over-long message", () => {
    const r = parseReport({ ...valid, message: "x".repeat(2001) });
    expect(r.ok).toBe(false);
  });

  it("accepts every advertised issue value", () => {
    for (const { value } of ISSUE_TYPES) {
      expect(parseReport({ ...valid, issue: value }).ok, value).toBe(true);
    }
  });
});

describe("issueLabel", () => {
  it("maps a value to its human label", () => {
    expect(issueLabel("count")).toBe("Wrong card count");
    expect(issueLabel("other")).toBe("Something else");
  });
  it("falls back to the raw value for unknowns", () => {
    expect(issueLabel("mystery")).toBe("mystery");
  });
});
