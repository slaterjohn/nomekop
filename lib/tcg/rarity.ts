// Rarity ranking, commonest → rarest. Used to pick "the rarest print" for
// Pokédex defaults and per-set best cards. Unknown rarities land mid-table
// rather than at either extreme.

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
];

const RANK = new Map(ORDER.map((name, i) => [name.toLowerCase(), i + 1]));

const UNKNOWN_RANK = 5; // between Rare Holo and the chase rarities

/** Higher = rarer. */
export function rarityRank(rarity: string | undefined): number {
  if (!rarity) return 0;
  return RANK.get(rarity.toLowerCase()) ?? UNKNOWN_RANK;
}
