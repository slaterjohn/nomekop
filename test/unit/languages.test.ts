import { describe, it, expect } from "vitest";
import {
  LANGUAGES,
  DEFAULT_LANGUAGE,
  isLanguage,
  languageByCode,
  encodeLanguages,
  decodeLanguages,
} from "@/lib/tcg/languages";

describe("languages", () => {
  it("English is first and the default, served by pokemontcg.io", () => {
    expect(DEFAULT_LANGUAGE).toBe("en");
    expect(LANGUAGES[0]!.code).toBe("en");
    expect(LANGUAGES[0]!.source).toBe("pokemontcg");
    for (const l of LANGUAGES.slice(1)) expect(l.source).toBe("tcgdex");
  });

  it("validates + looks up codes", () => {
    expect(isLanguage("ja")).toBe(true);
    expect(isLanguage("xx")).toBe(false);
    expect(languageByCode("ja")?.native).toBe("日本語");
    expect(languageByCode("zh-tw")?.pokeapi).toBe("zh-hant");
  });

  it("encodes/decodes language sets order-stably, always keeping English", () => {
    expect(encodeLanguages(["ja", "en"])).toBe("ej"); // canonical order, en first
    expect(decodeLanguages("ej")).toEqual(["en", "ja"]);
    // round-trip a few
    const round = (codes: string[]) => decodeLanguages(encodeLanguages(codes));
    // canonical order is the LANGUAGES order (en, ja, fr, …), not alphabetical
    expect(round(["en", "ja", "fr"])).toEqual(["en", "ja", "fr"]);
    expect(round(["ko", "zh-tw"])).toEqual(["en", "ko", "zh-tw"]); // en injected
  });

  it("decode ignores unknown chars and an empty token = English only", () => {
    expect(decodeLanguages(undefined)).toEqual(["en"]);
    expect(decodeLanguages("zz?")).toEqual(["en"]);
    expect(decodeLanguages("j")).toEqual(["en", "ja"]);
  });
});
