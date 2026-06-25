// Rarity ranking, commonest → rarest. Used to pick "the rarest print" for
// Pokédex defaults and per-set best cards. Unknown rarities land mid-table
// rather than at either extreme.
//
// AUTHORITATIVE SOURCE — keep the modern tail in THIS order; do not reshuffle
// from memory. Scarlet & Violet → Mega Evolution hierarchy, per CGC's rarity-
// symbol guide (https://www.cgccards.uk/news/article/12438/pokemon-rarity-symbols/):
//   Double Rare (2 black ★) < Ultra Rare (2 silver ★) < Illustration Rare (1
//   gold ★) < Special Illustration Rare (2 gold ★) < Hyper Rare (3 gold ★) <
//   Mega Attack Rare (pink+green ★ — Ascended Heroes / Jan 2026 only so far) <
//   Mega Hyper Rare (embossed gold, ~1 in 1,260 packs — the rarest in the game).
// pokemontcg.io returns the attack-rare as the raw enum MEGA_ATTACK_RARE, which
// mapCard (lib/tcg/pokemontcgio.ts) normalizes to "Mega Attack Rare".
// scripts/faq-compute.mjs MUST mirror this list verbatim (faqs-compute.test.ts
// fails otherwise).

const ORDER: string[] = [
  "Common",
  "Uncommon",
  "Rare",
  "Rare Holo",
  "Promo",
  "Rare Holo EX",
  "Rare Holo GX",
  "Rare Holo V",
  "Rare Holo VMAX",
  "Rare Holo VSTAR",
  "Double Rare",
  "Rare BREAK",
  "Rare Prime",
  "Rare Prism Star",
  "Rare ACE",
  "ACE SPEC Rare",
  "Rare Ultra",
  "Ultra Rare",
  "Rare Shiny",
  "Shiny Rare",
  "Rare Shiny GX",
  "Shiny Ultra Rare",
  "Radiant Rare",
  "Amazing Rare",
  "Illustration Rare",
  "Trainer Gallery Rare Holo",
  "Rare Secret",
  "Rare Rainbow",
  "Special Illustration Rare",
  "Rare Shining",
  "LEGEND",
  "Hyper Rare",
  // Mega Evolution era (2025+): the gold/textured Mega Hyper Rare is the top
  // chase in every Mega set; the Mega Attack Rare (Ascended Heroes only so far)
  // sits just below it.
  "Mega Attack Rare",
  "Mega Hyper Rare",
];

const RANK = new Map(ORDER.map((name, i) => [name.toLowerCase(), i + 1]));

const UNKNOWN_RANK = 5; // between Rare Holo and the chase rarities

/** Higher = rarer. */
export function rarityRank(rarity: string | undefined): number {
  if (!rarity) return 0;
  return RANK.get(rarity.toLowerCase()) ?? UNKNOWN_RANK;
}

const ILLUSTRATION_RARITIES = new Set(["illustration rare", "special illustration rare"]);

/** Illustration Rare or Special Illustration Rare — the "full art" illustration
 *  cards an artist's /illustrations page collects. */
export function isIllustrationRare(rarity: string | undefined): boolean {
  return rarity !== undefined && ILLUSTRATION_RARITIES.has(rarity.toLowerCase());
}
