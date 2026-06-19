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

/** A small Markdown table of pages needed per pocket size for a slot count. */
export function pocketTable(slots: number): string {
  const rows = evaluatePresets(slots).map(
    (p) => `| ${p.pockets}-pocket | ${p.pages} |`,
  );
  return ["| Binder | Pages |", "| --- | --- |", ...rows].join("\n");
}
