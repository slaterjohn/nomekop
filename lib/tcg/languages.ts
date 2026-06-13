// Languages the binders can mix. English comes from pokemontcg.io (and keeps
// TCGplayer prices); every other language comes from TCGdex (no prices). Limited
// to the languages PokéAPI also localises Pokémon names for, so cross-language
// Pokémon/Pokédex matching is reliable — these are also the major print languages.

export type Language = {
  /** Canonical code — matches TCGdex's path segment (en, ja, fr…). */
  code: string;
  /** English label for menus. */
  label: string;
  /** Native label (日本語, Français…). */
  native: string;
  /** PokéAPI language code for localized Pokémon names (when it differs). */
  pokeapi: string;
  /** English is served by pokemontcg.io with prices; the rest by TCGdex. */
  source: "pokemontcg" | "tcgdex";
};

export const LANGUAGES: readonly Language[] = [
  { code: "en", label: "English", native: "English", pokeapi: "en", source: "pokemontcg" },
  { code: "ja", label: "Japanese", native: "日本語", pokeapi: "ja", source: "tcgdex" },
  { code: "fr", label: "French", native: "Français", pokeapi: "fr", source: "tcgdex" },
  { code: "de", label: "German", native: "Deutsch", pokeapi: "de", source: "tcgdex" },
  { code: "es", label: "Spanish", native: "Español", pokeapi: "es", source: "tcgdex" },
  { code: "it", label: "Italian", native: "Italiano", pokeapi: "it", source: "tcgdex" },
  { code: "ko", label: "Korean", native: "한국어", pokeapi: "ko", source: "tcgdex" },
  { code: "zh-tw", label: "Chinese (Trad.)", native: "繁體中文", pokeapi: "zh-hant", source: "tcgdex" },
  { code: "zh-cn", label: "Chinese (Simpl.)", native: "简体中文", pokeapi: "zh-hans", source: "tcgdex" },
] as const;

export const DEFAULT_LANGUAGE = "en";

/** Codes in a stable order — the order languages appear in the picker + tokens. */
export const LANGUAGE_CODES: readonly string[] = LANGUAGES.map((l) => l.code);

export function isLanguage(code: string): boolean {
  return LANGUAGES.some((l) => l.code === code);
}

export function languageByCode(code: string): Language | undefined {
  return LANGUAGES.find((l) => l.code === code);
}

/**
 * Selector label: the native name plus its English exonym for non-English
 * languages — e.g. "日本語 (Japanese)" — so the script is recognisable AND
 * nameable. English just reads "English".
 */
export function languageLabel(code: string): string {
  const lang = languageByCode(code);
  if (!lang) return code;
  return lang.code === "en" ? lang.label : `${lang.native} (${lang.label})`;
}

/** Short token char per language for compact binder URLs (e.g. e=en, j=ja). */
export const LANGUAGE_TOKEN_CHARS: Record<string, string> = {
  en: "e",
  ja: "j",
  fr: "f",
  de: "g",
  es: "s",
  it: "i",
  ko: "k",
  "zh-tw": "t",
  "zh-cn": "c",
};

const CODE_BY_TOKEN_CHAR: Record<string, string> = Object.fromEntries(
  Object.entries(LANGUAGE_TOKEN_CHARS).map(([code, ch]) => [ch, code]),
);

/** Encode a set of language codes to a compact, order-stable token segment. */
export function encodeLanguages(codes: readonly string[]): string {
  return LANGUAGE_CODES.filter((c) => codes.includes(c))
    .map((c) => LANGUAGE_TOKEN_CHARS[c])
    .join("");
}

/** Decode a language token segment back to codes; always includes English. */
export function decodeLanguages(token: string | undefined): string[] {
  const codes = new Set<string>([DEFAULT_LANGUAGE]);
  for (const ch of token ?? "") {
    const code = CODE_BY_TOKEN_CHAR[ch];
    if (code) codes.add(code);
  }
  return LANGUAGE_CODES.filter((c) => codes.has(c));
}
