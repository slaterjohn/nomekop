import "server-only";
import { cookies, headers } from "next/headers";
import { DEFAULT_LOCALE, LOCALE_COOKIE, detectLocale, isLocale } from "@/lib/i18n/config";
import { getDictionary, type Dictionary } from "@/lib/i18n/dictionaries";

/** The request's locale: the saved cookie, else the browser's Accept-Language,
 *  else English. Falls back to English if called outside a request scope. */
export async function getLocale(): Promise<string> {
  try {
    const cookieStore = await cookies();
    const saved = cookieStore.get(LOCALE_COOKIE)?.value;
    if (isLocale(saved)) return saved;
    const headerStore = await headers();
    return detectLocale(headerStore.get("accept-language")) ?? DEFAULT_LOCALE;
  } catch {
    return DEFAULT_LOCALE;
  }
}

/** The dictionary for the request's locale. */
export async function getServerDictionary(): Promise<{ locale: string; dict: Dictionary }> {
  const locale = await getLocale();
  return { locale, dict: getDictionary(locale) };
}
