export type ParsedNumber = {
  prefix: string;
  num: number;
  suffix: string;
};

/**
 * Collector numbers come in flavours: '4', '85a', 'TG01', 'SV001', 'GG12'.
 * Parses into (prefix, numeric, suffix); returns null when no digits exist.
 */
export function parseCardNumber(number: string): ParsedNumber | null {
  const m = /^([A-Za-z]*)(\d+)([a-z]*)$/.exec(number.trim());
  if (!m) return null;
  return { prefix: m[1]!.toUpperCase(), num: Number.parseInt(m[2]!, 10), suffix: m[3]! };
}

/**
 * Binder order: plain numerics first (suffixed numbers directly after their
 * base), then prefixed subsets (TG/GG/SV…) grouped alphabetically. Numbers
 * that don't parse sort last.
 */
export function compareCardNumbers(a: string, b: string): number {
  const pa = parseCardNumber(a);
  const pb = parseCardNumber(b);
  if (pa === null && pb === null) return 0;
  if (pa === null) return 1;
  if (pb === null) return -1;
  if ((pa.prefix === "") !== (pb.prefix === "")) return pa.prefix === "" ? -1 : 1;
  if (pa.prefix !== pb.prefix) return pa.prefix < pb.prefix ? -1 : 1;
  if (pa.num !== pb.num) return pa.num - pb.num;
  if (pa.suffix !== pb.suffix) return pa.suffix < pb.suffix ? -1 : 1;
  return 0;
}

/** Stable sort of anything carrying a collector `number`. */
export function sortCards<T extends { number: string }>(cards: ReadonlyArray<T>): T[] {
  // Array.prototype.sort is stable per spec; map keeps the comparator cheap.
  return [...cards].sort((a, b) => compareCardNumbers(a.number, b.number));
}
