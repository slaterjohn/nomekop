// @vitest-environment node
import { describe, it, expect } from "vitest";
import { detectLocale, isLocale, DEFAULT_LOCALE, LOCALES } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { en } from "@/lib/i18n/dictionaries/en";

describe("isLocale", () => {
  it("accepts supported locales and rejects others", () => {
    expect(isLocale("en")).toBe(true);
    expect(isLocale("ja")).toBe(true);
    expect(isLocale("zh-tw")).toBe(true);
    expect(isLocale("xx")).toBe(false);
    expect(isLocale(undefined)).toBe(false);
  });
});

describe("detectLocale (Accept-Language)", () => {
  it("falls back to English when absent or unknown", () => {
    expect(detectLocale(null)).toBe(DEFAULT_LOCALE);
    expect(detectLocale("")).toBe(DEFAULT_LOCALE);
    expect(detectLocale("xx-YY,zz;q=0.5")).toBe("en");
  });

  it("matches an exact supported tag", () => {
    expect(detectLocale("ja")).toBe("ja");
    expect(detectLocale("fr-FR,fr;q=0.9")).toBe("fr");
  });

  it("strips region subtags (fr-CA → fr)", () => {
    expect(detectLocale("fr-CA")).toBe("fr");
    expect(detectLocale("de-AT,de;q=0.8")).toBe("de");
  });

  it("maps the two Chinese scripts correctly", () => {
    expect(detectLocale("zh-TW")).toBe("zh-tw");
    expect(detectLocale("zh-Hant")).toBe("zh-tw");
    expect(detectLocale("zh-HK")).toBe("zh-tw");
    expect(detectLocale("zh-CN")).toBe("zh-cn");
    expect(detectLocale("zh")).toBe("zh-cn");
  });

  it("honours quality ranking, highest first", () => {
    // English is q=1 by default here, Japanese explicitly lower.
    expect(detectLocale("en;q=0.3,ja;q=0.9")).toBe("ja");
    expect(detectLocale("de,fr;q=0.9")).toBe("de");
  });
});

describe("dictionaries", () => {
  it("provides a complete dictionary for every supported locale", () => {
    const enKeys = JSON.stringify(Object.keys(en).map((k) => [k, Object.keys((en as Record<string, object>)[k]!)]));
    for (const locale of LOCALES) {
      const dict = getDictionary(locale);
      const keys = JSON.stringify(
        Object.keys(dict).map((k) => [k, Object.keys((dict as Record<string, object>)[k]!)]),
      );
      expect(keys, `locale ${locale} key shape`).toBe(enKeys);
    }
  });

  it("keeps Pokémon/Pokédex untranslated across languages", () => {
    for (const locale of LOCALES) {
      const dict = getDictionary(locale);
      expect(dict.nav.pokemon, locale).toBe("Pokémon");
      expect(dict.nav.pokedex, locale).toBe("Pokédex");
    }
  });

  it("falls back to English for unknown locales", () => {
    expect(getDictionary("xx")).toBe(en);
  });
});
