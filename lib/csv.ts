import type { Slot } from "@/lib/layout/expand";
import { slotKindLabel } from "@/lib/variant-labels";

function field(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

/** One row per pocket: number, name, rarity, variant, collected (yes/no). */
export function toCollectionCsv(slots: ReadonlyArray<Slot>, collected: ReadonlySet<string>): string {
  const lines = ["number,name,rarity,variant,collected"];
  for (const slot of slots) {
    if (slot.kind === "empty") continue;
    const { card } = slot;
    lines.push(
      [
        field(card.number),
        field(card.name),
        field(card.rarity ?? ""),
        field(slotKindLabel(slot.kind)),
        collected.has(`${card.id}:${slot.kind}`) ? "yes" : "no",
      ].join(","),
    );
  }
  return lines.join("\n") + "\n";
}
