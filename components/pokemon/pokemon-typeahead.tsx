"use client";

import { useId, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { GbButton } from "@/components/gb/gb-button";
import { DEFAULT_POKEMON_OPTIONS, encodePokemonToken } from "@/lib/pokemon-binder";
import { fuzzyMatchPokemon } from "@/lib/pokemon-search";
import { play } from "@/lib/sound";
import { useDict } from "@/components/i18n/language-provider";
import { cn } from "@/lib/utils";

const NAME_RE = /^[a-z0-9.'\-:♀♂é ]{2,40}$/i;

/**
 * Fuzzy type-ahead for the Pokémon binder search. As you type, it suggests
 * matching species (accent/typo-tolerant) in an ARIA combobox listbox; picking
 * one — or submitting a valid free-text name — navigates to that binder.
 */
export function PokemonTypeahead() {
  const dict = useDict();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [error, setError] = useState<string | null>(null);
  const listId = useId();
  const errorId = useId();
  const optionId = (i: number) => `${listId}-opt-${i}`;
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const matches = useMemo(() => fuzzyMatchPokemon(query, 8), [query]);
  const showList = open && query.trim().length > 0 && matches.length > 0;

  function go(name: string) {
    setError(null);
    play("confirm");
    setOpen(false);
    router.push(`/pokemon/${encodePokemonToken(name, DEFAULT_POKEMON_OPTIONS)}`);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    // A highlighted suggestion wins; otherwise the best match; otherwise the
    // free-text name (validated, so a brand-new/odd name still works).
    if (active >= 0 && matches[active]) return go(matches[active].name);
    if (matches[0]) return go(matches[0].name);
    const trimmed = query.trim();
    if (!NAME_RE.test(trimmed)) {
      setError("Enter 2–40 letters, numbers or . ' - : to search.");
      play("back");
      return;
    }
    go(trimmed);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown" && showList) {
      e.preventDefault();
      setActive((i) => (i + 1) % matches.length);
    } else if (e.key === "ArrowUp" && showList) {
      e.preventDefault();
      setActive((i) => (i <= 0 ? matches.length - 1 : i - 1));
    } else if (e.key === "Escape") {
      setOpen(false);
      setActive(-1);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-wrap items-end gap-2" role="search">
      <div className="relative flex min-w-56 flex-1 flex-col gap-1">
        <label htmlFor={`${listId}-input`} className="font-pixel text-[10px] uppercase">
          {dict.pokemonLanding.nameLabel}
        </label>
        <input
          id={`${listId}-input`}
          type="text"
          role="combobox"
          autoComplete="off"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={active >= 0 && showList ? optionId(active) : undefined}
          aria-invalid={!!error}
          aria-describedby={error ? errorId : undefined}
          value={query}
          placeholder={dict.pokemonLanding.placeholder}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            setActive(-1);
            setError(null);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => {
            // Delay so an option click lands before the list closes.
            blurTimer.current = setTimeout(() => setOpen(false), 120);
          }}
          onKeyDown={onKeyDown}
          className="border-[3px] border-gb-ink bg-gb-bg px-3 py-2 font-body text-xl placeholder:text-gb-ink/60"
        />

        {showList ? (
          <ul
            id={listId}
            role="listbox"
            aria-label="Pokémon suggestions"
            className="absolute left-0 right-0 top-full z-20 m-0 mt-1 max-h-72 list-none overflow-y-auto border-[3px] border-gb-ink bg-gb-bg p-0 shadow-[4px_4px_0_0_var(--gb-ink)]"
          >
            {matches.map((p, i) => (
              <li
                key={p.dex}
                id={optionId(i)}
                role="option"
                aria-selected={i === active}
                onMouseDown={(e) => {
                  // Pick before the input's blur closes the list.
                  e.preventDefault();
                  if (blurTimer.current) clearTimeout(blurTimer.current);
                  go(p.name);
                }}
                onMouseEnter={() => setActive(i)}
                className={cn(
                  "flex cursor-pointer items-center justify-between gap-2 px-3 py-2 font-body text-lg leading-tight",
                  i === active ? "bg-gb-accent text-gb-ink" : "text-gb-ink",
                )}
              >
                <span>{p.name}</span>
                <span aria-hidden="true" className="font-pixel text-[9px] text-gb-ink/60">
                  #{String(p.dex).padStart(4, "0")}
                </span>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <GbButton type="submit" variant="a" data-no-click-sound>
        {dict.pokemonLanding.build}
      </GbButton>

      {error ? (
        <p id={errorId} role="alert" className="w-full font-body text-lg">
          {error}
        </p>
      ) : null}
    </form>
  );
}
