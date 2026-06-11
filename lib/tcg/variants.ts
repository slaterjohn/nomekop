import type { Variants } from "@/lib/tcg/types";

type VariantContext = {
  releaseDate: string;
  printedTotal: number;
  number: string;
  rarity: string | undefined;
};

/** Reverse holos entered the TCG with Legendary Collection (2002). */
const FIRST_REVERSE_YEAR = 2002;

const REVERSE_RARITIES = new Set(["Common", "Uncommon", "Rare", "Rare Holo"]);

/**
 * Which physical prints exist for a card. tcgplayer price keys are the best
 * signal; when absent we fall back to an era + rarity + numbering heuristic.
 */
export function deriveVariants(
  prices: Record<string, unknown> | undefined,
  ctx: VariantContext,
): Variants {
  const keys = prices ? Object.keys(prices) : [];
  if (keys.length > 0) {
    return {
      normal: keys.some((k) => k === "normal" || k.startsWith("unlimited") || k.startsWith("1stEdition")),
      reverse: keys.includes("reverseHolofoil"),
      holo: keys.some((k) => k.toLowerCase().includes("holofoil") && k !== "reverseHolofoil"),
    };
  }

  const year = Number.parseInt(ctx.releaseDate.slice(0, 4), 10);
  const m = /^([A-Za-z]*)(\d+)([a-z]*)$/.exec(ctx.number);
  const numericPart = m ? Number.parseInt(m[2]!, 10) : Number.NaN;
  const isPlainMainNumber = m !== null && m[1] === "" && numericPart <= ctx.printedTotal;
  const reverseEra = Number.isFinite(year) && year >= FIRST_REVERSE_YEAR;

  return {
    normal: true,
    reverse: reverseEra && isPlainMainNumber && REVERSE_RARITIES.has(ctx.rarity ?? ""),
    holo: (ctx.rarity ?? "").includes("Holo"),
  };
}
