import { describe, it, expect } from "vitest";
import { expandSlots, type Slot } from "@/lib/layout/expand";
import type { TcgCard } from "@/lib/tcg/types";

function card(number: string, opts: Partial<TcgCard> = {}): TcgCard {
  return {
    id: `x-${number}`,
    name: `Card ${number}`,
    number,
    rarity: "Common",
    supertype: "Pokémon",
    imageSmall: "",
    imageLarge: "",
    variants: { normal: true, reverse: false, holo: false },
    ...opts,
  };
}

const ballCard = (number: string, supertype = "Pokémon") =>
  card(number, {
    supertype,
    variants: { normal: true, reverse: true, holo: false, pokeball: true, masterball: supertype === "Pokémon" },
  });

const sig = (slots: Slot[]) => slots.map((s) => (s.kind === "empty" ? "·" : `${s.kind}:${s.card.number}`));

describe("expandSlots — ball-pattern master sets", () => {
  const cards = [ballCard("1"), ballCard("2", "Trainer"), card("3")];

  it("master + interleave: card, reverse, poké, master adjacent per card", () => {
    const slots = expandSlots(cards, {
      mode: "master",
      includeSecrets: true,
      includePokeball: true,
      includeMasterball: true,
      includeEnergy: true,
      placement: "interleave",
      printedTotal: 102,
    });
    expect(sig(slots)).toEqual([
      "card:1",
      "reverse:1",
      "pokeball:1",
      "masterball:1",
      "card:2",
      "reverse:2",
      "pokeball:2",
      "card:3",
    ]);
  });

  it("master + end placement groups ALL variant runs after the main set (reverses included)", () => {
    const slots = expandSlots(cards, {
      mode: "master",
      includeSecrets: true,
      includePokeball: true,
      includeMasterball: true,
      includeEnergy: true,
      placement: "end",
      printedTotal: 102,
    });
    expect(sig(slots)).toEqual([
      "card:1",
      "card:2",
      "card:3",
      "reverse:1",
      "reverse:2",
      "pokeball:1",
      "pokeball:2",
      "masterball:1",
    ]);
  });

  it("reverse-only master set honours end placement", () => {
    const reverseOnly = [
      card("1", { variants: { normal: true, reverse: true, holo: false } }),
      card("2", { variants: { normal: true, reverse: true, holo: false } }),
    ];
    const slots = expandSlots(reverseOnly, {
      mode: "master",
      includeSecrets: true,
      includePokeball: true,
      includeMasterball: true,
      includeEnergy: true,
      placement: "end",
      printedTotal: 102,
    });
    expect(sig(slots)).toEqual(["card:1", "card:2", "reverse:1", "reverse:2"]);
  });

  it("ball toggles exclude their runs independently", () => {
    const slots = expandSlots(cards, {
      mode: "master",
      includeSecrets: true,
      includePokeball: false,
      includeMasterball: true,
      includeEnergy: true,
      placement: "interleave",
      printedTotal: 102,
    });
    expect(sig(slots)).toEqual(["card:1", "reverse:1", "masterball:1", "card:2", "reverse:2", "card:3"]);
  });

  it("standard mode ignores ball variants entirely", () => {
    const slots = expandSlots(cards, {
      mode: "standard",
      includeSecrets: true,
      includePokeball: true,
      includeMasterball: true,
      includeEnergy: true,
      placement: "interleave",
      printedTotal: 102,
    });
    expect(sig(slots)).toEqual(["card:1", "card:2", "card:3"]);
  });

  it("cards without ball flags are unaffected in master mode", () => {
    const slots = expandSlots([card("9", { variants: { normal: true, reverse: true, holo: false } })], {
      mode: "master",
      includeSecrets: true,
      includePokeball: true,
      includeMasterball: true,
      includeEnergy: true,
      placement: "interleave",
      printedTotal: 102,
    });
    expect(sig(slots)).toEqual(["card:9", "reverse:9"]);
  });
});

describe("expandSlots — Energy-pattern master sets (Mega era)", () => {
  // Ascended Heroes shape: non-ex Pokémon carry Poké Ball + Energy patterns and
  // NO plain reverse; Trainers carry a plain reverse only.
  const pokemon = card("1", {
    supertype: "Pokémon",
    variants: { normal: true, reverse: false, holo: false, pokeball: true, energy: true },
  });
  const trainer = card("2", {
    supertype: "Trainer",
    variants: { normal: true, reverse: true, holo: false },
  });
  const cards = [pokemon, trainer];

  it("interleave: Poké Ball + Energy sit beside each Pokémon; Trainer keeps its reverse", () => {
    const slots = expandSlots(cards, {
      mode: "master",
      includeSecrets: true,
      includePokeball: true,
      includeMasterball: true,
      includeEnergy: true,
      placement: "interleave",
      printedTotal: 295,
    });
    expect(sig(slots)).toEqual(["card:1", "pokeball:1", "energy:1", "card:2", "reverse:2"]);
  });

  it("end placement groups the Energy run after Poké Ball and reverse runs", () => {
    const slots = expandSlots(cards, {
      mode: "master",
      includeSecrets: true,
      includePokeball: true,
      includeMasterball: true,
      includeEnergy: true,
      placement: "end",
      printedTotal: 295,
    });
    expect(sig(slots)).toEqual(["card:1", "card:2", "reverse:2", "pokeball:1", "energy:1"]);
  });

  it("the Energy toggle excludes only its run", () => {
    const slots = expandSlots(cards, {
      mode: "master",
      includeSecrets: true,
      includePokeball: true,
      includeMasterball: true,
      includeEnergy: false,
      placement: "interleave",
      printedTotal: 295,
    });
    expect(sig(slots)).toEqual(["card:1", "pokeball:1", "card:2", "reverse:2"]);
  });
});
