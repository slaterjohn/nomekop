/** Accessible/alt text for a card pocket: "Charizard · 4/102 · Rare Holo". */
export function cardAlt(
  name: string,
  number: string,
  printedTotal: number,
  rarity?: string,
): string {
  return `${name} · ${number}/${printedTotal}${rarity ? ` · ${rarity}` : ""}`;
}
