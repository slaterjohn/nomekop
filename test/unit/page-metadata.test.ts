// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { generateMetadata as cardMetadata } from "@/app/card/[cardId]/page";
import { generateMetadata as setMetadata } from "@/app/set/[setId]/page";
import { generateMetadata as collectionMetadata } from "@/app/collection/[setId]/page";
import { metadata as printBinderMetadata } from "@/app/print/binder/page";
import { metadata as printChecklistMetadata } from "@/app/print/checklist/page";
import { metadata as printPlaceholdersMetadata } from "@/app/print/placeholders/page";

// Fixture mode keeps every loader deterministic and offline.
beforeEach(() => {
  vi.stubEnv("TCG_DATA_SOURCE", "fixture");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

const cardProps = (cardId: string) => ({
  params: Promise.resolve({ cardId }),
  searchParams: Promise.resolve({}),
});

describe("card page generateMetadata (/card/[cardId])", () => {
  it("titles and describes base1-4 (Charizard) with number, set, rarity and price", async () => {
    const md = await cardMetadata(cardProps("base1-4"));

    expect(String(md.title)).toContain("Charizard");
    expect(String(md.title)).toContain("4/102");

    expect(md.description).toContain("Base");
    expect(md.description).toContain("Rare Holo");
    // Fixture holofoil market price, formatted $X.XX (normal ?? holofoil ?? reverse).
    expect(md.description).toMatch(/\$\d+\.\d{2}/);
    // Meta-description sized.
    expect(md.description!.length).toBeGreaterThan(100);
  });

  it("sets a relative canonical resolved against metadataBase", async () => {
    const md = await cardMetadata(cardProps("base1-4"));
    expect(md.alternates?.canonical).toBe("/card/base1-4");
  });

  it("declares openGraph/twitter without images — the file convention owns og:image", async () => {
    const md = await cardMetadata(cardProps("base1-4"));

    expect(md.openGraph).toMatchObject({ url: "/card/base1-4" });
    expect(md.openGraph).not.toHaveProperty("images");
    expect(md.openGraph?.title).toBeTruthy();
    expect(md.openGraph?.description).toBeTruthy();

    expect(md.twitter).toMatchObject({ card: "summary_large_image" });
    expect(md.twitter).not.toHaveProperty("images");
  });

  it("throws notFound for malformed card ids", async () => {
    // next/navigation notFound() throws the HTTP fallback error (404 digest).
    await expect(cardMetadata(cardProps("malformed"))).rejects.toThrow(
      /NEXT_HTTP_ERROR_FALLBACK;404/,
    );
  });
});

describe("set page generateMetadata (/set/[setId])", () => {
  it("titles base1 with set name and printed card count, plus canonical", async () => {
    const md = await setMetadata({ params: Promise.resolve({ setId: "base1" }) });

    expect(String(md.title)).toContain("Base");
    expect(String(md.title)).toContain("102");
    expect(md.alternates?.canonical).toBe("/set/base1");
    expect(md.openGraph).toMatchObject({ url: "/set/base1" });
    expect(md.description).toContain("1999");
  });
});

describe("collection page generateMetadata (/collection/[setId])", () => {
  it("is noindex (device-local data) but follows links out", async () => {
    const md = await collectionMetadata({
      params: Promise.resolve({ setId: "base1" }),
      searchParams: Promise.resolve({}),
    });
    expect(md.robots).toMatchObject({ index: false, follow: true });
    // Device-local content has no canonical public URL.
    expect(md.alternates?.canonical).toBeUndefined();
  });
});

describe("print pages metadata (/print/*)", () => {
  it.each([
    ["binder", printBinderMetadata],
    ["checklist", printChecklistMetadata],
    ["placeholders", printPlaceholdersMetadata],
  ])("marks /print/%s noindex,nofollow", (_route, metadata) => {
    expect(metadata.robots).toMatchObject({ index: false, follow: false });
  });
});
