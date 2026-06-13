"use client";

import Image from "next/image";
import { useMemo, useRef, useState, useSyncExternalStore } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { GbScreen } from "@/components/gb/gb-screen";
import { GbButton } from "@/components/gb/gb-button";
import { GbBadge } from "@/components/gb/gb-badge";
import { PixelPokeball } from "@/components/gb/pixel-pokeball";
import { PdfButtons } from "@/components/pdf-buttons";
import { LanguagePicker } from "@/components/binder/language-picker";
import { POCKET_PRESETS } from "@/lib/config";
import {
  buildPokedexEntries,
  encodePokedexToken,
  spriteUrl,
  POKEDEX_STORAGE_PREFIX,
  type PokedexConfig,
  type PokedexEntry,
} from "@/lib/pokedex";
import { languageByCode } from "@/lib/tcg/languages";
import { play } from "@/lib/sound";
import { cn } from "@/lib/utils";
import type { CardWithSet } from "@/lib/tcg/types";

type PokedexViewProps = {
  initialConfig: PokedexConfig;
  cards: CardWithSet[];
};

function storageKey(gen: string): string {
  return `${POKEDEX_STORAGE_PREFIX}:${gen}`;
}

const noopSubscribe = () => () => {};

/** The interactive Pokédex binder: grid, swap dialog, persistence, share URL. */
export function PokedexView({ initialConfig, cards }: PokedexViewProps) {
  // URL picks always win (shared links must reproduce exactly). When the URL
  // carries none but this browser has saved picks, offer an explicit restore.
  const [config, setConfig] = useState<PokedexConfig>(() => initialConfig);
  const [restoreDismissed, setRestoreDismissed] = useState(false);
  const [swapDex, setSwapDex] = useState<number | null>(null);
  const [spread, setSpread] = useState(0);
  // Non-English prints fetched lazily, one Pokémon at a time, as swap dialogs
  // open. (A whole-generation × language union would be far too heavy.)
  const [extraCards, setExtraCards] = useState<CardWithSet[]>([]);
  const [fetchingDex, setFetchingDex] = useState<number | null>(null);
  const fetchedRef = useRef<Set<string>>(new Set());

  // Hydration-safe localStorage read (server snapshot: empty string).
  const storedRaw = useSyncExternalStore(
    noopSubscribe,
    () => {
      try {
        return localStorage.getItem(storageKey(initialConfig.gen)) ?? "";
      } catch {
        return "";
      }
    },
    () => "",
  );
  const storedPicks = useMemo(() => {
    if (!storedRaw) return null;
    try {
      const parsed = JSON.parse(storedRaw) as Partial<PokedexConfig>;
      return parsed.picks && Object.keys(parsed.picks).length > 0 ? parsed.picks : null;
    } catch {
      return null;
    }
  }, [storedRaw]);
  const offerRestore =
    !restoreDismissed &&
    storedPicks !== null &&
    Object.keys(initialConfig.picks).length === 0 &&
    Object.keys(config.picks).length === 0;

  const update = (next: PokedexConfig) => {
    setConfig(next);
    try {
      localStorage.setItem(storageKey(next.gen), JSON.stringify({ picks: next.picks }));
    } catch {
      // best-effort persistence
    }
    window.history.replaceState(null, "", `/pokedex/${encodePokedexToken(next)}`);
  };

  // English (with restored picks) + lazily-fetched non-English prints, deduped
  // by id and filtered to the currently-enabled languages.
  const allCards = useMemo(() => {
    if (extraCards.length === 0) return cards;
    const enabled = new Set(config.langs);
    const byId = new Map<string, CardWithSet>();
    for (const card of cards) byId.set(card.id, card);
    for (const card of extraCards) {
      if (enabled.has(card.lang ?? "en")) byId.set(card.id, card);
    }
    return [...byId.values()];
  }, [cards, extraCards, config.langs]);

  const entries = useMemo(
    () => buildPokedexEntries(config.gen, allCards, config.picks),
    [config.gen, allCards, config.picks],
  );

  // Pull one Pokémon's non-English prints into the binder (idempotent per
  // dex+language set). Runs from event handlers only — never an effect.
  const loadLanguages = async (dex: number, langs: string[]) => {
    const others = langs.filter((l) => l !== "en");
    if (others.length === 0) return;
    const key = `${dex}:${others.join(",")}`;
    if (fetchedRef.current.has(key)) return;
    fetchedRef.current.add(key);
    setFetchingDex(dex);
    try {
      const res = await fetch(`/api/pokedex/prints?dex=${dex}&langs=${others.join(",")}`);
      if (res.ok) {
        const data = (await res.json()) as { cards?: CardWithSet[] };
        const fetched = data.cards ?? [];
        if (fetched.length > 0) {
          setExtraCards((prev) => {
            const seen = new Set(prev.map((c) => c.id));
            return [...prev, ...fetched.filter((c) => !seen.has(c.id))];
          });
        }
      }
    } catch {
      // best-effort; the dialog still shows whatever English prints exist
    } finally {
      setFetchingDex((current) => (current === dex ? null : current));
    }
  };

  const openSwap = (dex: number) => {
    play("confirm");
    setSwapDex(dex);
    void loadLanguages(dex, config.langs);
  };

  // Languages just change which swaps are offered — no re-fetch of the grid, so
  // patch state in place (and refresh the open dialog) rather than navigating.
  const changeLanguages = (langs: string[]) => {
    update({ ...config, langs });
    if (swapDex !== null) void loadLanguages(swapDex, langs);
  };

  const perPage = config.rows * config.cols;
  const pageCount = Math.max(1, Math.ceil(entries.length / perPage));
  const page = Math.min(spread, pageCount - 1);
  const pageEntries = entries.slice(page * perPage, (page + 1) * perPage);

  const withCards = entries.filter((e) => e.chosen).length;
  const customPicks = Object.keys(config.picks).length;
  const multiLang = config.langs.some((l) => l !== "en");
  const swapEntry = swapDex !== null ? entries.find((e) => e.dex === swapDex) : undefined;
  const swapLoading = fetchingDex !== null && fetchingDex === swapDex;
  const matchingPreset = POCKET_PRESETS.find((p) => p.rows === config.rows && p.cols === config.cols);
  const token = encodePokedexToken(config);

  return (
    <div className="flex flex-col gap-6">
      {offerRestore ? (
        <div className="flex flex-wrap items-center gap-3 border-[3px] border-gb-ink bg-gb-accent/40 p-3">
          <p className="font-pixel text-[10px] leading-relaxed">
            FOUND {Object.keys(storedPicks).length} SAVED PICKS FOR THIS POKÉDEX.
          </p>
          <GbButton
            variant="a"
            size="sm"
            onClick={() => {
              play("success");
              update({ ...config, picks: storedPicks });
            }}
          >
            RESTORE
          </GbButton>
          <GbButton
            variant="plain"
            size="sm"
            onClick={() => {
              play("back");
              setRestoreDismissed(true);
            }}
          >
            DISMISS
          </GbButton>
        </div>
      ) : null}
      <GbScreen title="BINDER OPTIONS">
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Binder size">
            {POCKET_PRESETS.map((preset) => (
              <GbButton
                key={preset.label}
                variant={matchingPreset?.label === preset.label ? "a" : "b"}
                size="sm"
                aria-pressed={matchingPreset?.label === preset.label}
                onClick={() => {
                  play("confirm");
                  update({ ...config, rows: preset.rows, cols: preset.cols });
                }}
              >
                {preset.label}
              </GbButton>
            ))}
            {customPicks > 0 ? (
              <GbButton
                variant="plain"
                size="sm"
                onClick={() => {
                  play("back");
                  update({ ...config, picks: {} });
                }}
              >
                RESET PICKS
              </GbButton>
            ) : null}
          </div>
          <LanguagePicker value={config.langs} onChange={changeLanguages} />
          <p aria-live="polite" className="font-pixel text-[10px] leading-relaxed sm:text-xs">
            {entries.length} POKÉMON → {pageCount} PAGES · {withCards}/{entries.length} HAVE CARDS
            {customPicks > 0 ? ` · ${customPicks} CUSTOM PICKS` : ""}
          </p>
          <p className="font-body text-lg leading-snug">
            Pockets default to each Pokémon&apos;s secret card, then its rarest print. Click any
            pocket to swap the card — your picks are saved and live in this page&apos;s URL.
            {multiLang ? " Other languages load as you open a pocket." : ""}
          </p>
        </div>
      </GbScreen>

      <GbScreen title="PREVIEW">
        <div className="mb-3 flex items-center justify-between gap-2">
          <GbButton
            variant="b"
            size="sm"
            aria-label="Previous page"
            disabled={page === 0}
            onClick={() => setSpread(page - 1)}
          >
            ◀
          </GbButton>
          <p aria-live="polite" className="font-pixel text-[10px] sm:text-xs">
            PAGE {page + 1} OF {pageCount}
          </p>
          <GbButton
            variant="b"
            size="sm"
            aria-label="Next page"
            disabled={page === pageCount - 1}
            onClick={() => setSpread(page + 1)}
          >
            ▶
          </GbButton>
        </div>
        <ul
          className="grid list-none gap-1.5 border-[3px] border-gb-ink bg-gb-accent/30 p-1.5"
          style={{ gridTemplateColumns: `repeat(${config.cols}, minmax(0, 1fr))` }}
        >
          {pageEntries.map((entry) => (
            <li key={entry.dex}>
              <PokedexSlot
                entry={entry}
                custom={entry.dex in config.picks}
                onClick={() => {
                  // Openable when there's something to choose — English prints,
                  // or (multi-language on) the chance of non-English ones.
                  if (entry.alternatives.length > 0 || multiLang) {
                    openSwap(entry.dex);
                  } else {
                    play("back");
                  }
                }}
              />
            </li>
          ))}
        </ul>
      </GbScreen>

      <GbScreen title="PRINT & DOWNLOAD">
        <PdfButtons
          buttons={[
            { label: "POKÉDEX PDF", type: "pokedex", token },
            { label: "PLACEHOLDERS PDF", type: "pokedex-placeholders", token },
          ]}
          printHref={`/print/pokedex?t=${encodeURIComponent(token)}`}
          filenameBase={`nomekop-pokedex-${config.gen}`}
        />
      </GbScreen>

      <Dialog open={swapDex !== null} onOpenChange={(open) => !open && setSwapDex(null)}>
        <DialogContent className="max-h-[85vh] gap-0 overflow-y-auto rounded-none border-4 border-gb-ink bg-gb-bg p-0 shadow-[6px_6px_0_0_var(--gb-ink)] sm:max-w-2xl">
          <DialogHeader className="border-b-4 border-gb-ink bg-gb-ink px-4 py-3 text-left">
            <DialogTitle className="font-pixel text-sm uppercase text-gb-bg">
              #{swapDex} — pick a card
            </DialogTitle>
            <DialogDescription className="font-body text-lg text-gb-bg">
              {swapEntry?.alternatives.length ?? 0} prints available · rarest first
              {swapLoading ? " · loading languages…" : ""}
            </DialogDescription>
          </DialogHeader>
          {swapEntry && swapEntry.alternatives.length === 0 && swapLoading ? (
            <p className="px-4 py-6 font-body text-xl leading-tight">Searching other languages…</p>
          ) : null}
          {swapEntry && swapEntry.alternatives.length === 0 && !swapLoading ? (
            <p className="px-4 py-6 font-body text-xl leading-tight">
              No cards found for #{swapDex}
              {multiLang ? " in these languages." : "."}
            </p>
          ) : null}
          <ul className="grid list-none grid-cols-2 gap-2 p-4 sm:grid-cols-3">
            {swapEntry?.alternatives.map((card) => {
              const selected = swapEntry.chosen?.id === card.id;
              const lang = card.lang && card.lang !== "en" ? languageByCode(card.lang) : undefined;
              return (
                <li key={card.id}>
                  <button
                    type="button"
                    aria-pressed={selected}
                    onClick={() => {
                      play("success");
                      const picks = { ...config.picks, [swapEntry.dex]: card.id };
                      update({ ...config, picks });
                      setSwapDex(null);
                    }}
                    className={cn(
                      "block w-full cursor-pointer border-[3px] p-1 text-left",
                      selected ? "border-gb-ink bg-gb-accent" : "border-gb-muted bg-gb-bg",
                    )}
                  >
                    {card.imageSmall ? (
                      <Image
                        src={card.imageSmall}
                        alt={`${card.name} · ${card.setName} · ${card.rarity ?? ""}`}
                        width={245}
                        height={342}
                        unoptimized
                        loading="lazy"
                        className="h-auto w-full"
                      />
                    ) : null}
                    <span className="mt-1 block font-pixel text-[8px] leading-relaxed">
                      {card.setName.toUpperCase()}
                    </span>
                    <span className="block font-body text-base leading-tight">
                      {card.rarity ?? card.supertype}
                      {card.secret ? " · SECRET" : ""}
                      {lang ? ` · ${lang.native}` : ""}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PokedexSlot({
  entry,
  custom,
  onClick,
}: {
  entry: PokedexEntry;
  custom: boolean;
  onClick: () => void;
}) {
  const sprite = spriteUrl(entry.dex);
  const lang =
    entry.chosen?.lang && entry.chosen.lang !== "en" ? languageByCode(entry.chosen.lang) : undefined;
  const label = entry.chosen
    ? `#${entry.dex} ${entry.chosen.name}${lang ? ` (${lang.label})` : ""} — ${entry.alternatives.length} prints, click to swap`
    : `#${entry.dex} — no card available`;
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={cn(
        "relative block aspect-[63/88] w-full cursor-pointer overflow-hidden border-2 text-left",
        entry.chosen ? "border-gb-ink bg-gb-bg" : "border-dashed border-gb-muted bg-gb-bg",
        custom && "shadow-[inset_0_0_0_3px_var(--gb-accent)]",
      )}
    >
      {entry.chosen?.imageSmall ? (
        <Image
          src={entry.chosen.imageSmall}
          alt=""
          width={245}
          height={342}
          unoptimized
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <span className="flex h-full flex-col items-center justify-center gap-1">
          {sprite ? (
            <Image src={sprite} alt="" width={68} height={56} unoptimized loading="lazy" className="image-render-pixel" />
          ) : (
            <PixelPokeball size={28} />
          )}
        </span>
      )}
      <span
        aria-hidden="true"
        className="absolute bottom-0.5 left-0.5 bg-gb-bg/90 px-0.5 font-pixel text-[8px]"
      >
        #{entry.dex}
      </span>
      {lang ? (
        <span
          aria-hidden="true"
          className="absolute bottom-0.5 right-0.5 bg-gb-ink/90 px-0.5 font-pixel text-[8px] text-gb-bg"
        >
          {entry.chosen?.lang?.slice(0, 2).toUpperCase()}
        </span>
      ) : null}
      {custom ? (
        <GbBadge aria-label="Custom pick" className="absolute right-0.5 top-0.5">
          PICK
        </GbBadge>
      ) : null}
    </button>
  );
}
