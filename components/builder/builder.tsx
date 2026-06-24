"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { GbScreen } from "@/components/gb/gb-screen";
import { GbDialogBox } from "@/components/gb/gb-dialog-box";
import { GbButton } from "@/components/gb/gb-button";
import { useDict } from "@/components/i18n/language-provider";
import { GbSpinner } from "@/components/gb/gb-spinner";
import { GbProgress } from "@/components/gb/gb-progress";
import { GbToggle } from "@/components/gb/gb-toggle";
import { GbWipe } from "@/components/gb/gb-wipe";
import { ConfigPanel } from "@/components/builder/config-panel";
import { BinderPreview } from "@/components/builder/binder-preview";
import { ActionBar } from "@/components/builder/action-bar";
import { BinderShelf } from "@/components/builder/binder-shelf";
import { AccuracyDisclaimer } from "@/components/accuracy-disclaimer";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { GbLinkButton } from "@/components/gb/gb-button";
import { useCards, useSets } from "@/lib/hooks";
import { useBinderConfig } from "@/lib/use-binder-config";
import { useChecklist, useCollectionMode, clearChecklist } from "@/lib/checklist-store";
import { saveSetConfig } from "@/lib/config-store";
import { buildBinderLayout } from "@/lib/layout";
import { isSeriesVerified } from "@/lib/tcg/era-coverage";
import { toCollectionCsv } from "@/lib/csv";
import { play } from "@/lib/sound";
import { cn } from "@/lib/utils";
import type { TcgSet } from "@/lib/tcg/types";

type BuilderProps = {
  initialSets?: TcgSet[];
};

/** Collection progress bar that pulses when a card flies in. */
function CollectionBar({ count, max }: { count: number; max: number }) {
  const prev = useRef(count);
  const [pulsing, setPulsing] = useState(false);
  useEffect(() => {
    if (count > prev.current) {
      setPulsing(true);
      const t = setTimeout(() => setPulsing(false), 320);
      prev.current = count;
      return () => clearTimeout(t);
    }
    prev.current = count;
  }, [count]);
  return (
    <div
      data-gb-collection-bar
      className={cn("min-w-0 flex-1", pulsing && "motion-safe:animate-gb-pulse")}
    >
      <GbProgress label="Collected" value={count} max={max} />
    </div>
  );
}

/** The whole flow: choose set → configure → preview/collect → print → binder. */
export function Builder({ initialSets }: BuilderProps) {
  const dict = useDict();
  const { config, update } = useBinderConfig();
  const sets = useSets(initialSets);
  const cards = useCards(config.set || undefined);
  const collectionMode = useCollectionMode();
  const checklist = useChecklist(config.set || undefined, config.mode);
  const [confirmClear, setConfirmClear] = useState(false);
  const router = useRouter();

  const selectedSet = (sets.data ?? []).find((s) => s.id === config.set);
  const layout =
    selectedSet && cards.data ? buildBinderLayout(cards.data, selectedSet, config) : undefined;

  // Remember this set's layout choices for next time.
  useEffect(() => {
    if (config.set) saveSetConfig(config);
  }, [config]);

  const downloadCsv = () => {
    if (!layout || !selectedSet) return;
    const slots = layout.pages.flatMap((p) => p.slots);
    const csv = toCollectionCsv(slots, checklist.collected);
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `nomekop-${selectedSet.id}-${config.mode}-collection.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    play("success");
  };

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-6">
      <h1 className="sr-only">
        {selectedSet ? `${selectedSet.name} binder builder` : "Pokémon TCG binder builder"}
      </h1>
      <GbScreen title={selectedSet ? `Set: ${selectedSet.name}` : "Set binder"}>
        {selectedSet ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="font-body text-xl">
              {selectedSet.series} · {selectedSet.printedTotal} printed / {selectedSet.total} total
            </p>
            {/* Browsing sets lives at /sets — the single set-browsing entry. */}
            <GbButton
              variant="b"
              size="sm"
              data-no-click-sound
              onClick={() => {
                play("back");
                router.push("/sets");
              }}
            >
              ◀ Change set
            </GbButton>
          </div>
        ) : sets.isPending ? (
          <div className="flex justify-center py-8">
            <GbSpinner label="Loading set…" />
          </div>
        ) : (
          // A set id was supplied but isn't in the library (unknown/typo). Bare
          // /build is redirected to /sets server-side, so this only catches a
          // bad set id — point the player back to the set browser.
          <div className="flex flex-col gap-3">
            <GbDialogBox>Wild MissingNo. appeared! That set isn&apos;t in the library.</GbDialogBox>
            <GbButton
              variant="a"
              data-no-click-sound
              onClick={() => {
                play("confirm");
                router.push("/sets");
              }}
            >
              Browse sets ▶
            </GbButton>
          </div>
        )}
      </GbScreen>

      {selectedSet && !isSeriesVerified(selectedSet.series) ? (
        <AccuracyDisclaimer
          body={dict.accuracy.disclaimer}
          reportCta={dict.accuracy.reportCta}
          era={selectedSet.series}
          setId={selectedSet.id}
        />
      ) : null}

      {selectedSet && cards.isPending ? (
        <div className="flex justify-center py-8">
          <GbSpinner label={`Loading ${selectedSet.name}…`} />
        </div>
      ) : null}

      {selectedSet && cards.isError ? (
        <div className="space-y-3">
          <GbDialogBox tone="error">{cards.error.message}</GbDialogBox>
          <GbButton variant="a" onClick={() => void cards.refetch()}>
            Retry
          </GbButton>
        </div>
      ) : null}

      {selectedSet && cards.data && cards.data.length === 0 ? (
        <GbDialogBox>
          Wild MissingNo. appeared! This set has no cards in the library. Try another set.
        </GbDialogBox>
      ) : null}

      {selectedSet && layout && layout.stats.cards > 0 ? (
        <>
          <GbWipe>
            <GbScreen title={dict.builder.configure}>
              <ConfigPanel set={selectedSet} cards={cards.data!} config={config} onChange={update} />
            </GbScreen>
          </GbWipe>

          <GbWipe>
            <GbScreen title={dict.binder.preview}>
              <div className="mb-4 flex flex-col gap-3">
                <GbToggle
                  label="Collection mode"
                  checked={collectionMode.enabled}
                  onChange={(on) => collectionMode.setEnabled(on)}
                />
                {collectionMode.enabled ? (
                  <div className="flex flex-col gap-2">
                    <CollectionBar count={checklist.count} max={layout.stats.slots} />
                    <div className="flex flex-wrap items-center gap-2">
                      <GbLinkButton
                        variant="b"
                        size="sm"
                        href={`/collection/${config.set}${config.mode === "master" ? "?mode=master" : ""}`}
                      >
                        View collection
                      </GbLinkButton>
                      <GbButton variant="b" size="sm" data-no-click-sound onClick={downloadCsv}>
                        CSV
                      </GbButton>
                      {checklist.count > 0 ? (
                        <GbButton variant="plain" size="sm" onClick={() => setConfirmClear(true)}>
                          Clear
                        </GbButton>
                      ) : null}
                    </div>
                  </div>
                ) : null}
              </div>
              <BinderPreview
                set={selectedSet}
                layout={layout}
                rememberKey={`set:${config.set}`}
                tick={collectionMode.enabled ? checklist : undefined}
                onInspect={(card, kind) => {
                  play("confirm");
                  router.push(`/card/${card.id}${kind !== "card" ? `?variant=${kind}` : ""}`);
                }}
              />
            </GbScreen>
          </GbWipe>

          <GbWipe>
            <GbScreen title={dict.binder.printDownload}>
              <ActionBar config={config} onStyleChange={(style) => update({ style })} />
            </GbScreen>
          </GbWipe>

          <GbWipe>
            <GbScreen title={dict.builder.findBinder}>
              <BinderShelf pockets={layout.stats.slotsPerPage} pages={layout.stats.pages} />
            </GbScreen>
          </GbWipe>
        </>
      ) : null}

      <Dialog open={confirmClear} onOpenChange={(open) => !open && setConfirmClear(false)}>
        <DialogContent className="rounded-none border-4 border-gb-ink bg-gb-bg p-0 shadow-[6px_6px_0_0_var(--gb-ink)]">
          <DialogHeader className="border-b-4 border-gb-ink bg-gb-ink px-4 py-3 text-left">
            <DialogTitle className="font-pixel text-sm uppercase text-gb-bg">Clear collection?</DialogTitle>
            <DialogDescription className="font-body text-lg text-gb-bg">
              This removes all {checklist.count} collected pockets for {selectedSet?.name} (
              {config.mode}). It can&apos;t be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-row justify-end gap-2 p-4">
            <GbButton variant="b" onClick={() => setConfirmClear(false)}>
              Cancel
            </GbButton>
            <GbButton
              variant="a"
              data-no-click-sound
              onClick={() => {
                play("back");
                clearChecklist(config.set, config.mode);
                setConfirmClear(false);
              }}
            >
              Clear all
            </GbButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
