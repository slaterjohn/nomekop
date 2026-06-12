"use client";

import Image from "next/image";
import { useMemo, useState, useSyncExternalStore } from "react";
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
import { POCKET_PRESETS } from "@/lib/config";
import {
  buildPokedexEntries,
  encodePokedexToken,
  spriteUrl,
  POKEDEX_STORAGE_PREFIX,
  type PokedexConfig,
  type PokedexEntry,
} from "@/lib/pokedex";
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

  const entries = useMemo(
    () => buildPokedexEntries(config.gen, cards, config.picks),
    [config.gen, cards, config.picks],
  );
  const perPage = config.rows * config.cols;
  const pageCount = Math.max(1, Math.ceil(entries.length / perPage));
  const page = Math.min(spread, pageCount - 1);
  const pageEntries = entries.slice(page * perPage, (page + 1) * perPage);

  const withCards = entries.filter((e) => e.chosen).length;
  const customPicks = Object.keys(config.picks).length;
  const swapEntry = swapDex !== null ? entries.find((e) => e.dex === swapDex) : undefined;
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
          <p aria-live="polite" className="font-pixel text-[10px] leading-relaxed sm:text-xs">
            {entries.length} POKÉMON → {pageCount} PAGES · {withCards}/{entries.length} HAVE CARDS
            {customPicks > 0 ? ` · ${customPicks} CUSTOM PICKS` : ""}
          </p>
          <p className="font-body text-lg leading-snug">
            Pockets default to each Pokémon&apos;s secret card, then its rarest print. Click any
            pocket to swap the card — your picks are saved and live in this page&apos;s URL.
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
                  if (entry.alternatives.length > 0) {
                    play("confirm");
                    setSwapDex(entry.dex);
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
        <p className="mt-2 font-body text-base leading-snug">
          Placeholder sheets use matching pixel icons (#1–898; later Pokémon get a Poké Ball
          tile).
        </p>
      </GbScreen>

      <Dialog open={swapDex !== null} onOpenChange={(open) => !open && setSwapDex(null)}>
        <DialogContent className="max-h-[85vh] gap-0 overflow-y-auto rounded-none border-4 border-gb-ink bg-gb-bg p-0 shadow-[6px_6px_0_0_var(--gb-ink)] sm:max-w-2xl">
          <DialogHeader className="border-b-4 border-gb-ink bg-gb-ink px-4 py-3 text-left">
            <DialogTitle className="font-pixel text-sm uppercase text-gb-bg">
              #{swapDex} — pick a card
            </DialogTitle>
            <DialogDescription className="font-body text-lg text-gb-bg">
              {swapEntry?.alternatives.length ?? 0} prints available · rarest first
            </DialogDescription>
          </DialogHeader>
          <ul className="grid list-none grid-cols-2 gap-2 p-4 sm:grid-cols-3">
            {swapEntry?.alternatives.map((card) => {
              const selected = swapEntry.chosen?.id === card.id;
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
  const label = entry.chosen
    ? `#${entry.dex} ${entry.chosen.name} — ${entry.alternatives.length} prints, click to swap`
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
      {custom ? (
        <GbBadge aria-label="Custom pick" className="absolute right-0.5 top-0.5">
          PICK
        </GbBadge>
      ) : null}
    </button>
  );
}
