// @vitest-environment node
import { describe, it, expect } from "vitest";
import { orderForBinder } from "@/lib/binder-order";
import type { CardWithSet } from "@/lib/tcg/types";

const card = (over: Partial<CardWithSet>): CardWithSet => ({
  id: "x-1",
  name: "Charizard",
  number: "1",
  rarity: "Rare Holo",
  supertype: "Pokémon",
  imageSmall: "",
  imageLarge: "",
  variants: { normal: true, reverse: false, holo: false },
  setId: "x",
  setName: "X",
  setReleaseDate: "2020/01/01",
  setPrintedTotal: 100,
  secret: false,
  ...over,
});

describe("orderForBinder — single language (unchanged behaviour)", () => {
  const cards = [
    card({ id: "b", setReleaseDate: "1999/01/09", number: "4" }),
    card({ id: "a", setReleaseDate: "2023/03/31", number: "1" }),
    card({ id: "c", setReleaseDate: "1999/01/09", number: "2" }),
  ];

  it("sorts by release date then card number, newest first", () => {
    expect(orderForBinder(cards, "new", false).map((c) => c.id)).toEqual(["a", "c", "b"]);
  });

  it("reverses to oldest first", () => {
    expect(orderForBinder(cards, "old", false).map((c) => c.id)).toEqual(["c", "b", "a"]);
  });
});

describe("orderForBinder — multiple languages (cluster the same set)", () => {
  // A Japanese set ships before its English twin, but they share a canonical
  // (English) set id + date, so they must land together — English first.
  const en = card({
    id: "en-151-1",
    lang: "en",
    setId: "sv3pt5",
    setReleaseDate: "2023/09/22",
    canonSetId: "sv3pt5",
    canonDate: "2023/09/22",
    number: "6",
  });
  const ja = card({
    id: "ja-151-1",
    lang: "ja",
    name: "リザードンex",
    setId: "sv2a",
    setReleaseDate: "2023/06/16", // earlier raw date
    canonSetId: "sv3pt5", // …but same canonical English set
    canonDate: "2023/09/22",
    number: "6",
  });
  const olderEn = card({
    id: "en-base-1",
    lang: "en",
    setId: "base1",
    setReleaseDate: "1999/01/09",
    canonSetId: "base1",
    canonDate: "1999/01/09",
    number: "4",
  });

  it("keeps the same set's languages adjacent (English first), not split by raw date", () => {
    const ordered = orderForBinder([ja, olderEn, en], "new", true);
    // Despite the JA card's earlier raw date, it sits beside its English twin.
    expect(ordered.map((c) => c.id)).toEqual(["en-151-1", "ja-151-1", "en-base-1"]);
  });

  it("oldest-first flips set order but keeps each set's languages together", () => {
    const ordered = orderForBinder([en, ja, olderEn], "old", true);
    expect(ordered.map((c) => c.id)).toEqual(["en-base-1", "en-151-1", "ja-151-1"]);
  });
});
