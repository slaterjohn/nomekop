import { evaluatePresets, recommendPreset } from "@/lib/binders";
import type { FaqCardRef } from "@/lib/content/faqs/types";

export function num(n: number): string {
  return n.toLocaleString("en-US");
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

/** Plain-English recommendation sentence for a slot count. */
export function recommendSentence(slots: number, label: string): string {
  const r = recommendPreset(slots);
  return (
    `For ${label} you'll want a **${r.pockets}-pocket binder**: that's ${r.pages} ` +
    `pages${r.binders > 1 ? ` across ${r.binders} binders` : ""}.`
  );
}
