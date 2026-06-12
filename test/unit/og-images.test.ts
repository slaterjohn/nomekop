// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as homeImage from "@/app/opengraph-image";
import * as twitterImage from "@/app/twitter-image";
import * as cardImage from "@/app/card/[cardId]/opengraph-image";
import * as setImage from "@/app/set/[setId]/opengraph-image";

// ImageResponse can't render under jsdom, but satori + resvg run fine in
// plain node — so these tests render for real. They stay offline-safe by
// only rendering trees without external <img> URLs: ImageResponse starts
// rendering eagerly on construction, so a layout containing a card-scan URL
// would hit the network (images.pokemontcg.io) the moment it's constructed.
// Per the brief, the dynamic routes therefore go through their fallback /
// text-only paths instead of e.g. card "base1-4" with its hosted scan.

beforeEach(() => {
  vi.stubEnv("TCG_DATA_SOURCE", "fixture");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

async function expectPngResponse(res: Response): Promise<void> {
  expect(res).toBeInstanceOf(Response);
  expect(res.status).toBe(200);
  expect(res.headers.get("content-type")).toBe("image/png");
  const bytes = new Uint8Array(await res.arrayBuffer());
  expect(bytes.length).toBeGreaterThan(PNG_MAGIC.length);
  expect(Array.from(bytes.slice(0, PNG_MAGIC.length))).toEqual(PNG_MAGIC);
  // IHDR width/height (bytes 16-23, big-endian) must match the size export.
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  expect(view.getUint32(16)).toBe(1200);
  expect(view.getUint32(20)).toBe(630);
}

describe("og image config exports", () => {
  const modules = {
    "app/opengraph-image": homeImage,
    "app/twitter-image": twitterImage,
    "app/card/[cardId]/opengraph-image": cardImage,
    "app/set/[setId]/opengraph-image": setImage,
  };

  for (const [name, mod] of Object.entries(modules)) {
    it(`${name} exports 1200x630, image/png and non-empty alt text`, () => {
      expect(mod.size).toEqual({ width: 1200, height: 630 });
      expect(mod.contentType).toBe("image/png");
      expect(typeof mod.alt).toBe("string");
      expect(mod.alt.length).toBeGreaterThan(0);
    });
  }

  it("home alt names the site", () => {
    expect(homeImage.alt).toBe("Nomekop — Pokemon TCG binder layout maker");
  });
});

describe("home opengraph-image", () => {
  it("renders a PNG Response", async () => {
    const res = await homeImage.default();
    await expectPngResponse(res);
  });
});

describe("twitter-image", () => {
  it("single-sources renderer and config from the home opengraph-image", () => {
    expect(twitterImage.default).toBe(homeImage.default);
    expect(twitterImage.alt).toBe(homeImage.alt);
    expect(twitterImage.size).toBe(homeImage.size);
    expect(twitterImage.contentType).toBe(homeImage.contentType);
  });
});

describe("card opengraph-image", () => {
  it("returns a PNG Response via the fallback for an unknown card id", async () => {
    // "zz-1" parses (setId "zz") but has no fixture data — must not throw.
    const res = await cardImage.default({ params: Promise.resolve({ cardId: "zz-1" }) });
    await expectPngResponse(res);
  });

  it("returns a PNG Response for a malformed card id without a set prefix", async () => {
    const res = await cardImage.default({ params: Promise.resolve({ cardId: "bogus" }) });
    await expectPngResponse(res);
  });
});

describe("set opengraph-image", () => {
  it("renders real set facts text-only when card data is unavailable", async () => {
    // base2 (Jungle) exists in the sets fixture but has no cards-base2.json,
    // so the scan fan drops out and no external image URLs enter the tree.
    const res = await setImage.default({ params: Promise.resolve({ setId: "base2" }) });
    await expectPngResponse(res);
  });

  it("returns a PNG Response via the fallback for an unknown set id", async () => {
    const res = await setImage.default({ params: Promise.resolve({ setId: "zz" }) });
    await expectPngResponse(res);
  });
});
