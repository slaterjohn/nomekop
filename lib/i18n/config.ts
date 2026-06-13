import { LANGUAGE_CODES, isLanguage } from "@/lib/tcg/languages";

// The app UI speaks the same nine languages the card data does. The locale is
// stored in a cookie (so server + client render the same language with no flash)
// and mirrored to localStorage; first visit auto-detects from the browser.

export const LOCALES: readonly string[] = LANGUAGE_CODES;
export const DEFAULT_LOCALE = "en";
export const LOCALE_COOKIE = "nomekop_lang";

export function isLocale(value: string | undefined | null): value is string {
  return typeof value === "string" && isLanguage(value);
}

/**
 * Best supported locale for an Accept-Language header, else English. Handles
 * region subtags (fr-CA → fr) and the two Chinese scripts (zh-Hant/TW → zh-tw,
 * other zh → zh-cn).
 */
export function detectLocale(acceptLanguage: string | null | undefined): string {
  if (!acceptLanguage) return DEFAULT_LOCALE;
  const ranked = acceptLanguage
    .split(",")
    .map((part) => {
      const [tag, q] = part.trim().split(";q=");
      return { tag: (tag ?? "").toLowerCase(), q: q ? Number(q) || 0 : 1 };
    })
    .filter((r) => r.tag)
    .sort((a, b) => b.q - a.q);

  for (const { tag } of ranked) {
    if (isLanguage(tag)) return tag;
    const base = tag.split("-")[0]!;
    if (base === "zh") {
      return tag.includes("tw") || tag.includes("hant") || tag.includes("hk") ? "zh-tw" : "zh-cn";
    }
    if (isLanguage(base)) return base;
  }
  return DEFAULT_LOCALE;
}
