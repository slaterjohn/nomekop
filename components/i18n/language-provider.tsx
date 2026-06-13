"use client";

import { createContext, useContext } from "react";
import { useRouter } from "next/navigation";
import { LOCALE_COOKIE, DEFAULT_LOCALE } from "@/lib/i18n/config";
import { en, type Dictionary } from "@/lib/i18n/dictionaries/en";

type LanguageValue = {
  locale: string;
  dict: Dictionary;
  setLocale: (locale: string) => void;
};

/** Default to English with a no-op setter so components render safely even
 *  outside a provider (tests, isolated renders). The root layout supplies the
 *  real locale + dictionary, and the router-backed setter. */
const LanguageContext = createContext<LanguageValue>({
  locale: DEFAULT_LOCALE,
  dict: en,
  setLocale: () => {},
});

/** Carries the request locale + its dictionary (resolved on the server) to every
 *  client component. Because both come from the server render, client and server
 *  text always agree — no hydration mismatch, no flash. */
export function LanguageProvider({
  locale,
  dict,
  children,
}: {
  locale: string;
  dict: Dictionary;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const setLocale = (next: string) => {
    document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
    try {
      localStorage.setItem(LOCALE_COOKIE, next);
    } catch {
      // best-effort mirror
    }
    router.refresh(); // re-render the server tree so every string updates at once
  };
  return (
    <LanguageContext.Provider value={{ locale, dict, setLocale }}>
      {children}
    </LanguageContext.Provider>
  );
}

/** The current locale's dictionary, for client components. */
export function useDict(): Dictionary {
  return useContext(LanguageContext).dict;
}

/** The current locale code. */
export function useLocale(): string {
  return useContext(LanguageContext).locale;
}

/** Switch language: persists the choice (cookie for the server, localStorage as a
 *  mirror) and re-renders the server tree. No-op outside a provider. */
export function useSetLocale(): (locale: string) => void {
  return useContext(LanguageContext).setLocale;
}
