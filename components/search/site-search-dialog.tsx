"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useSearchIndex } from "@/lib/search/use-search-index";
import { runSearch } from "@/lib/search/search";
import { SearchResults } from "@/components/search/search-results";
import { capture } from "@/lib/analytics/events";
import type { SearchEntry } from "@/lib/search/types";

/** Global ⌘K search: a header trigger + a focus-trapped dialog that searches
 *  every section, grouped. Mounted once in the layout, so ⌘K works everywhere. */
export function SiteSearchDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const { entries } = useSearchIndex(open);
  const groups = runSearch(query, entries, {});

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Fire search_opened once per open transition (header button or ⌘K).
  const wasOpen = useRef(false);
  useEffect(() => {
    if (open && !wasOpen.current) capture("search_opened", { surface: "dialog", scope: "global" });
    wasOpen.current = open;
  }, [open]);

  // Debounced search_performed — intent, not keystrokes.
  useEffect(() => {
    const q = query.trim();
    if (!q) return;
    const id = window.setTimeout(() => {
      capture("search_performed", {
        query: q,
        query_length: q.length,
        scope: "global",
        surface: "dialog",
        result_count: groups.reduce((n, g) => n + g.items.length, 0),
      });
    }, 400);
    return () => window.clearTimeout(id);
  }, [query, groups]);

  const go = (url: string, item: SearchEntry, position: number) => {
    capture("search_result_selected", {
      query: query.trim(),
      result_type: item.type,
      scope: "global",
      surface: "dialog",
      position,
    });
    setOpen(false);
    setQuery("");
    router.push(url);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Search the site"
        className="inline-flex items-center gap-2 border-[3px] border-gb-ink bg-gb-bg px-2 py-1.5 font-pixel text-[10px] uppercase text-gb-ink/80"
      >
        <svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor" shapeRendering="crispEdges" aria-hidden="true">
          <path d="M4 4h12v2H4zm0 0v12h2V4zm12 0v8h2V4zM4 16h8v2H4zm10 0h2v2h-2zm2 2h2v2h-2zm2 2h2v2h-2z" />
        </svg>
        <span className="hidden sm:inline">Search</span>
        <kbd className="hidden border border-gb-ink/40 px-1 sm:inline">⌘K</kbd>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          showCloseButton={false}
          className="top-[12%] w-full max-w-xl translate-y-0 gap-0 overflow-hidden border-[3px] border-gb-ink bg-gb-bg p-0 shadow-[6px_6px_0_0_var(--gb-ink)]"
        >
          <DialogTitle className="sr-only">Search</DialogTitle>
          <Command shouldFilter={false} loop label="Search" className="flex flex-col">
            {/* A command palette must focus its input on open — that is the
                point of ⌘K. Autofocus here aids accessibility (keyboard users
                land in the search field) rather than harming it. */}
            {/* eslint-disable jsx-a11y/no-autofocus */}
            <Command.Input
              autoFocus
              value={query}
              onValueChange={setQuery}
              placeholder="Search Pokémon, sets, artists, FAQs…"
              className="w-full border-b-[3px] border-gb-ink bg-gb-bg px-4 py-3 font-body text-xl text-gb-ink placeholder:text-gb-ink/60"
            />
            {/* eslint-enable jsx-a11y/no-autofocus */}
            <Command.List className="max-h-[60vh] overflow-y-auto">
              {query.trim() ? (
                <SearchResults groups={groups} onSelect={go} />
              ) : (
                <p className="px-4 py-5 font-body text-base text-gb-ink/60">
                  Type to search across the whole site.
                </p>
              )}
            </Command.List>
          </Command>
        </DialogContent>
      </Dialog>
    </>
  );
}
