import data from "@/data/set-links.json";

// Curated localized→English set links — the bridge TCGdex's metadata can't
// provide for Japanese/Korean/Chinese (their set ids, names and card counts all
// diverge from English). Maps a TCGdex localized set id to the English
// (pokemontcg.io) set name. Data + rationale live in data/set-links.json.

const LINKS: Record<string, Record<string, string>> = data.links;

/** The English (pokemontcg.io) set name a localized set corresponds to, if any. */
export function curatedEnglishSetName(lang: string, setId: string): string | undefined {
  return LINKS[lang]?.[setId];
}

/** All curated links for a language (localized set id → English set name). */
export function curatedLinksFor(lang: string): Record<string, string> {
  return LINKS[lang] ?? {};
}
