import { describe, expect, it } from "vitest";
import {
  expandSeed,
  parseSuggest,
  classifyIntent,
  groupSuggestion,
  aggregate,
  buildClusters,
} from "../../scripts/atp-core.mjs";

describe("expandSeed", () => {
  it("includes the bare seed plus appended modifiers", () => {
    const queries = expandSeed("charizard card", { alphabet: false });
    expect(queries).toContain("charizard card"); // bare
    expect(queries).toContain("charizard card how");
    expect(queries).toContain("charizard card for");
    expect(queries).toContain("charizard card vs");
  });

  it("omits the a–z sweep unless alphabet is enabled", () => {
    const without = expandSeed("charizard card", { alphabet: false });
    expect(without).not.toContain("charizard card a");
    const withAlpha = expandSeed("charizard card", { alphabet: true });
    expect(withAlpha).toContain("charizard card a");
    expect(withAlpha).toContain("charizard card z");
  });

  it("never duplicates a query", () => {
    const queries = expandSeed("charizard card", { alphabet: true });
    expect(new Set(queries).size).toBe(queries.length);
  });
});

describe("parseSuggest", () => {
  it("reads the Google/Bing/DDG [query, [suggestions]] shape", () => {
    const json = ["charizard card", ["charizard card value", "charizard card list"]];
    expect(parseSuggest(json)).toEqual(["charizard card value", "charizard card list"]);
  });

  it("tolerates the Google trailing-metadata shape", () => {
    const json = ["q", ["a", "b"], [], { "google:suggestsubtypes": [[512]] }];
    expect(parseSuggest(json)).toEqual(["a", "b"]);
  });

  it("returns [] for junk / empty payloads", () => {
    expect(parseSuggest(null)).toEqual([]);
    expect(parseSuggest({})).toEqual([]);
    expect(parseSuggest(["q"])).toEqual([]);
  });
});

describe("classifyIntent", () => {
  it("tags price/value questions", () => {
    expect(classifyIntent("how much is a charizard card worth")).toBe("value");
    expect(classifyIntent("charizard card price")).toBe("value");
  });

  it("tags count, rarity, list, editions, grading, authenticity", () => {
    expect(classifyIntent("how many charizard cards are there")).toBe("count");
    expect(classifyIntent("rarest charizard card")).toBe("rarity");
    expect(classifyIntent("charizard card list")).toBe("list");
    expect(classifyIntent("charizard card 1st edition")).toBe("editions");
    expect(classifyIntent("charizard card psa 10")).toBe("grading");
    expect(classifyIntent("fake charizard card")).toBe("authenticity");
  });

  it("falls back to general", () => {
    expect(classifyIntent("charizard card art")).toBe("general");
  });
});

describe("groupSuggestion", () => {
  it("buckets by the modifier kind present", () => {
    expect(groupSuggestion("how much is a charizard card")).toBe("question");
    expect(groupSuggestion("charizard card vs blastoise")).toBe("comparison");
    expect(groupSuggestion("charizard card for sale")).toBe("preposition");
    expect(groupSuggestion("charizard card value")).toBe("related");
  });
});

describe("aggregate", () => {
  it("dedupes by text, counts frequency and collects engines + intent + group", () => {
    const raw = [
      { text: "charizard card value", engine: "google" },
      { text: "charizard card value", engine: "bing" },
      { text: "how much is a charizard card worth", engine: "google" },
    ];
    const out = aggregate(raw, "charizard card");
    const value = out.find((s) => s.text === "charizard card value")!;
    expect(value.freq).toBe(2);
    expect(value.engines.sort()).toEqual(["bing", "google"]);
    expect(value.intent).toBe("value");
    expect(value.group).toBe("related");
    const worth = out.find((s) => s.text.startsWith("how much"))!;
    expect(worth.group).toBe("question");
    // sorted by freq desc
    expect(out[0]!.freq).toBeGreaterThanOrEqual(out[out.length - 1]!.freq);
  });

  it("drops the bare-seed echo and blanks", () => {
    const raw = [{ text: "charizard card", engine: "google" }, { text: "", engine: "bing" }];
    expect(aggregate(raw, "charizard card")).toEqual([]);
  });
});

describe("buildClusters", () => {
  it("splits aggregated suggestions into the five AtP buckets", () => {
    const suggestions = [
      { text: "how much is a charizard card", group: "question" },
      { text: "charizard card vs blastoise", group: "comparison" },
      { text: "charizard card for sale", group: "preposition" },
      { text: "charizard card value", group: "related" },
    ];
    const clusters = buildClusters(suggestions);
    expect(clusters.question).toHaveLength(1);
    expect(clusters.comparison).toHaveLength(1);
    expect(clusters.preposition).toHaveLength(1);
    expect(clusters.related).toHaveLength(1);
    expect(clusters.alphabetical).toEqual([]);
  });
});
