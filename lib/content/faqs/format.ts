import { evaluatePresets } from "@/lib/binders";
import type { FaqCardRef } from "@/lib/content/faqs/types";

export function num(n: number): string {
  return n.toLocaleString("en-US");
}

/** Possessive form of a name, avoiding "…s's" for names ending in "s". */
export function possessive(name: string): string {
  return /s$/i.test(name) ? `${name}'` : `${name}'s`;
}

export function money(n: number): string {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

export function cardLabel(card: Pick<FaqCardRef, "name" | "number" | "id">): string {
  return `${card.name} (#${card.number})`;
}

/** A single Markdown bullet linking a card, with rarity and price when present. */
export function cardBullet(card: FaqCardRef): string {
  const rarity = card.rarity ? ` — ${card.rarity}` : "";
  const price = typeof card.marketPrice === "number" ? ` (~${money(card.marketPrice)})` : "";
  return `- [${cardLabel(card)}](/card/${card.id})${rarity}${price}`;
}

/** "A, B and C" — an Oxford-free conjunction list. */
export function joinAnd(items: string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

/** A small Markdown table of pages needed per pocket size for a slot count. */
export function pocketTable(slots: number): string {
  const rows = evaluatePresets(slots).map(
    (p) => `| ${p.pockets}-pocket | ${p.pages} |`,
  );
  return ["| Binder | Pages |", "| --- | --- |", ...rows].join("\n");
}
