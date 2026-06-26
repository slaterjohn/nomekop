"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import { useSearchIndex } from "@/lib/search/use-search-index";
import { runSearch } from "@/lib/search/search";
import { SearchResults } from "@/components/search/search-results";
import type { SearchType } from "@/lib/search/types";

/** Inline search: an input with a dropdown of grouped suggestions. `scope`
 *  restricts to one section (Pokémon / sets / artists); omit for global.
 *  `initialQuery` pre-fills and opens the dropdown — used so the Sitelinks
 *  Searchbox (`?q=…`) lands on a populated search. */
export function SiteSearchBox({
  scope,
  placeholder,
  initialQuery = "",
}: {
  scope?: SearchType;
  placeholder?: string;
  initialQuery?: string;
}) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const [open, setOpen] = useState(initialQuery.trim().length > 0);
  const { entries } = useSearchIndex(open || query.length > 0);
  const groups = runSearch(query, entries, { scope });
  const show = open && query.trim().length > 0;

  const go = (url: string) => {
    setOpen(false);
    setQuery("");
    router.push(url);
  };

  return (
    <Command shouldFilter={false} loop label="Search" className="relative w-full">
      <Command.Input
        value={query}
        onValueChange={setQuery}
        onFocus={() => setOpen(true)}
        onBlur={() => window.setTimeout(() => setOpen(false), 150)}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            setOpen(false);
            (e.target as HTMLInputElement).blur();
          }
        }}
        placeholder={placeholder ?? "Search…"}
        className="w-full border-[3px] border-gb-ink bg-gb-bg px-3 py-2 font-body text-xl text-gb-ink placeholder:text-gb-ink/60"
      />
      {/* Always rendered (merely `hidden` when closed) so the input's
          aria-controls always resolves to a real element. */}
      <Command.List
        hidden={!show}
        className="absolute left-0 right-0 top-full z-30 mt-1 max-h-80 overflow-y-auto border-[3px] border-gb-ink bg-gb-bg shadow-[4px_4px_0_0_var(--gb-ink)]"
      >
        {show ? <SearchResults groups={groups} onSelect={go} /> : null}
      </Command.List>
    </Command>
  );
}
