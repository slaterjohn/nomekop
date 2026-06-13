import { en, type Dictionary } from "./en";
import { ja } from "./ja";
import { fr } from "./fr";
import { de } from "./de";
import { es } from "./es";
import { it } from "./it";
import { ko } from "./ko";
import { zhTw } from "./zh-tw";
import { zhCn } from "./zh-cn";

const dictionaries: Record<string, Dictionary> = {
  en,
  ja,
  fr,
  de,
  es,
  it,
  ko,
  "zh-tw": zhTw,
  "zh-cn": zhCn,
};

/** The dictionary for a locale; English for anything unknown or untranslated. */
export function getDictionary(locale: string): Dictionary {
  return dictionaries[locale] ?? en;
}

export type { Dictionary };
