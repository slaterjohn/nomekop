import { evaluatePresets } from "@/lib/binders";
import type { FaqCardRef, FaqSetFacts } from "@/lib/content/faqs/types";

export function num(n: number): string {
  return n.toLocaleString("en-US");
}

/** The special reverse-holo PATTERNS a set carries (Poké Ball / Master Ball /
 *  Energy), present ones only, with their counts and the builder toggle key. */
export function patternList(
  s: FaqSetFacts,
): Array<{ key: "pb" | "mb" | "ep"; label: string; n: number }> {
  return [
    { key: "pb" as const, label: "Poké Ball", n: s.pokeballCount },
    { key: "mb" as const, label: "Master Ball", n: s.masterballCount },
    { key: "ep" as const, label: "Energy", n: s.energyPatternCount },
  ].filter((p) => p.n > 0);
}

/** e.g. "100 Poké Ball and 67 Master Ball pattern cards" — present patterns only. */
export function patternPhrase(s: FaqSetFacts): string {
  return `${joinAnd(patternList(s).map((p) => `${num(p.n)} ${p.label}`))} pattern cards`;
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

/** A linked card thumbnail in Markdown — the image opens the card page. Returns
 *  "" when the card has no scan, so callers can filter cleanly. */
export function cardImageLink(
  card: Pick<FaqCardRef, "id" | "name" | "number" | "imageSmall">,
): string {
  if (!card.imageSmall) return "";
  return `[![${cardLabel(card)}](${card.imageSmall})](/card/${card.id})`;
}

/** A row of linked card thumbnails (one Markdown paragraph). "" when none of the
 *  cards have a scan. Images link to /card/[id] so every visual mention is a
 *  route into the card's own page. */
export function cardGallery(cards: FaqCardRef[], limit = 6): string {
  const thumbs = cards.slice(0, limit).map(cardImageLink).filter(Boolean);
  return thumbs.join(" ");
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
