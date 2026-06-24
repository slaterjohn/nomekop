import type { SlotKind } from "@/lib/layout/expand";

/** Human label for a pocket's print variant. */
export function slotKindLabel(kind: SlotKind): string {
  switch (kind) {
    case "reverse":
      return "Reverse holo";
    case "pokeball":
      return "Poké Ball";
    case "masterball":
      return "Master Ball";
    case "energy":
      return "Energy";
    default:
      return "Normal";
  }
}

/** Short badge text shown on pockets (normal pockets get none). */
export function slotBadge(kind: SlotKind): string | null {
  switch (kind) {
    case "reverse":
      return "REV";
    case "pokeball":
      return "POKÉ";
    case "masterball":
      return "MASTER";
    case "energy":
      return "ENERGY";
    default:
      return null;
  }
}

/** Accessible suffix for labels: "… (Reverse holo)". */
export function slotKindSuffix(kind: SlotKind): string {
  return kind === "card" ? "" : ` (${slotKindLabel(kind)})`;
}
