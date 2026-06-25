// Pure matching logic for the artist backfill (scripts/backfill-artists.mjs),
// split out so it can be unit-tested without any network/cache I/O. Matches
// TCGdex cards to pokemontcg.io cards by collector number, since the two
// sources share numbering but format it differently ("001" vs "1").

/** Canonical form of a collector number: lowercased letter prefix + the integer
 *  value of its digits + lowercased suffix. "001"→"1", "SV001"→"sv1",
 *  "TG01"→"tg1", "191"→"191". Numbers with no digits fall back to the trimmed
 *  lowercase string. */
export function normalizeCardNumber(n) {
  const s = String(n).trim();
  const m = s.match(/^([^\d]*)(\d+)([^\d]*)$/);
  if (!m) return s.toLowerCase();
  const [, prefix, digits, suffix] = m;
  return `${prefix.toLowerCase()}${Number.parseInt(digits, 10)}${suffix.toLowerCase()}`;
}

/** Build cardId → illustrator overrides by matching pokemontcg.io cards to
 *  TCGdex cards on normalised collector number. TCGdex cards without an
 *  illustrator (e.g. basic Energy) contribute nothing, so their counterparts
 *  land in `unmatched`. */
export function matchArtistsByNumber(ptcgCards, tcgdexCards) {
  const byNumber = new Map();
  for (const t of tcgdexCards) {
    if (!t.illustrator || !String(t.illustrator).trim()) continue;
    byNumber.set(normalizeCardNumber(t.localId), t.illustrator);
  }
  const overrides = {};
  const unmatched = [];
  for (const c of ptcgCards) {
    const credit = byNumber.get(normalizeCardNumber(c.number));
    if (credit) overrides[c.id] = credit;
    else unmatched.push(c.id);
  }
  return { overrides, unmatched };
}
