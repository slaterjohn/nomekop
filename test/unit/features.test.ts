import { afterEach, describe, expect, it, vi } from "vitest";
import { cardLanguagesEnabled } from "@/lib/features";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("cardLanguagesEnabled", () => {
  it("is off by default (unset env)", () => {
    vi.stubEnv("NEXT_PUBLIC_CARD_LANGUAGES", undefined as unknown as string);
    expect(cardLanguagesEnabled()).toBe(false);
  });

  it("is on only for the exact string '1'", () => {
    vi.stubEnv("NEXT_PUBLIC_CARD_LANGUAGES", "1");
    expect(cardLanguagesEnabled()).toBe(true);
  });

  it.each(["0", "", "true", "yes", "on"])("treats %j as off", (value) => {
    vi.stubEnv("NEXT_PUBLIC_CARD_LANGUAGES", value);
    expect(cardLanguagesEnabled()).toBe(false);
  });
});
